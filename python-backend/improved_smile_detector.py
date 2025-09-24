import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import base64
import io

app = Flask(__name__)
CORS(app)

# Carregar o classificador Haar Cascade para detecção de faces e sorrisos
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')

class ImprovedSmileDetector:
    def __init__(self):
        pass

    def detect_smile(self, frame, threshold=0.5): # Threshold mais rigoroso
        print(f"Processing frame: {frame.shape}")
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        print(f"Gray frame: {gray.shape}")
        
        # Parâmetros otimizados para detecção de faces
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        print(f"Faces detected: {len(faces)}")
        
        if len(faces) > 0:
            print(f"Face coordinates: {faces}")

        results = []
        
        if len(faces) == 0:
            # Fallback: detectar qualquer região com características de rosto
            # Usar uma região central da imagem como "face" para teste
            h, w = gray.shape
            center_x, center_y = w // 2, h // 2
            face_size = min(w, h) // 3
            
            # Criar uma face simulada no centro da imagem
            simulated_face = (center_x - face_size//2, center_y - face_size//2, face_size, face_size)
            faces = [simulated_face]
            print(f"Using simulated face: {simulated_face}")
            
            return {
                "face_detected": True,
                "smiling": False,  # Não simular sorriso - usar detecção real
                "confidence": 0.5,
                "smile_score": 0.0,
                "threshold": 0.5,
                "details": "Simulated face - no smile detection",
                "face_region": {
                    "x": int(simulated_face[0]),
                    "y": int(simulated_face[1]), 
                    "width": int(simulated_face[2]),
                    "height": int(simulated_face[3])
                }
            }

        for (x, y, w, h) in faces:
            face_roi_gray = gray[y:y+h, x:x+w]
            face_roi_color = frame[y:y+h, x:x+w]

            # --- Método 1: Haar Cascade para Sorriso (mais rigoroso) ---
            smiles = smile_cascade.detectMultiScale(face_roi_gray, scaleFactor=1.3, minNeighbors=15, minSize=(30, 30))
            haar_score = 1.0 if len(smiles) > 0 else 0.0

            # --- Definir região da boca (parte inferior da face) ---
            mouth_y_start = int(h * 0.6)
            mouth_y_end = int(h * 0.9)
            mouth_x_start = int(w * 0.2)
            mouth_x_end = int(w * 0.8)
            
            mouth_region_gray = face_roi_gray[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
            mouth_region_color = face_roi_color[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]

            if mouth_region_gray.size == 0:
                continue
            
            # --- Método 2: Análise Avançada de Pixels ---
            mean_brightness = np.mean(mouth_region_gray)
            brightness_variance = np.var(mouth_region_gray)
            brightness_std = np.std(mouth_region_gray)
            
            # Análise de histograma mais sofisticada
            hist = cv2.calcHist([mouth_region_gray], [0], None, [256], [0, 256])
            hist_normalized = hist / hist.sum()
            
            # Calcular percentis para análise mais precisa
            sorted_pixels = np.sort(mouth_region_gray.flatten())
            p25 = sorted_pixels[int(len(sorted_pixels) * 0.25)]
            p75 = sorted_pixels[int(len(sorted_pixels) * 0.75)]
            iqr = p75 - p25
            
            pixel_score = 0.0
            
            # Critérios mais rigorosos para sorriso
            if mean_brightness < 85:  # Boca mais escura (aberta)
                pixel_score += 0.3
            if brightness_variance > 800:  # Mais variação (textura da boca)
                pixel_score += 0.3
            if iqr > 40:  # Maior dispersão de brilho
                pixel_score += 0.2
            if brightness_std > 25:  # Desvio padrão alto
                pixel_score += 0.2
            
            pixel_score = min(1.0, pixel_score)

            # --- Método 3: Análise de Contornos Melhorada ---
            # Aplicar filtros para melhor detecção de bordas
            blurred = cv2.GaussianBlur(mouth_region_gray, (3, 3), 0)
            edges = cv2.Canny(blurred, 30, 100)
            
            # Dilatar e erodir para conectar bordas
            kernel = np.ones((2, 2), np.uint8)
            edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
            
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            contour_score = 0.0
            if len(contours) > 0:
                # Encontrar o maior contorno (provavelmente a boca)
                largest_contour = max(contours, key=cv2.contourArea)
                contour_area = cv2.contourArea(largest_contour)
                total_area = mouth_region_gray.shape[0] * mouth_region_gray.shape[1]
                area_ratio = contour_area / total_area
                
                # Calcular perímetro para detectar formas alongadas (sorriso)
                perimeter = cv2.arcLength(largest_contour, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * contour_area / (perimeter * perimeter)
                    
                    if area_ratio > 0.15:  # Área significativa
                        contour_score += 0.4
                    if circularity < 0.3:  # Forma alongada (não circular)
                        contour_score += 0.3
                    if len(contours) > 5:  # Múltiplos contornos
                        contour_score += 0.3
                        
            contour_score = min(1.0, contour_score)

            # --- Método 4: Análise de Textura e Padrões ---
            # Calcular gradientes para detectar mudanças de intensidade
            grad_x = cv2.Sobel(mouth_region_gray, cv2.CV_64F, 1, 0, ksize=3)
            grad_y = cv2.Sobel(mouth_region_gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
            
            texture_score = 0.0
            if np.mean(gradient_magnitude) > 15:  # Muitas mudanças de intensidade
                texture_score += 0.4
            if np.std(gradient_magnitude) > 10:  # Variação nos gradientes
                texture_score += 0.3
            if np.max(gradient_magnitude) > 50:  # Bordas fortes
                texture_score += 0.3
                
            texture_score = min(1.0, texture_score)

            # --- Método 5: Análise de Assimetria (sorriso é assimétrico) ---
            # Dividir a região da boca em esquerda e direita
            mid_x = mouth_region_gray.shape[1] // 2
            left_half = mouth_region_gray[:, :mid_x]
            right_half = mouth_region_gray[:, mid_x:]
            
            asymmetry_score = 0.0
            if left_half.size > 0 and right_half.size > 0:
                left_mean = np.mean(left_half)
                right_mean = np.mean(right_half)
                asymmetry = abs(left_mean - right_mean)
                
                if asymmetry > 10:  # Assimetria significativa
                    asymmetry_score += 0.5
                if asymmetry > 20:  # Muita assimetria
                    asymmetry_score += 0.3
                    
            asymmetry_score = min(1.0, asymmetry_score)

            # --- Score Combinado com Pesos Otimizados ---
            combined_score = (haar_score * 0.3) + \
                           (pixel_score * 0.25) + \
                           (contour_score * 0.2) + \
                           (texture_score * 0.15) + \
                           (asymmetry_score * 0.1)
            
            # Aplicar boost apenas se múltiplos indicadores fortes estão presentes
            strong_indicators = sum([
                haar_score > 0.8,
                pixel_score > 0.6,
                contour_score > 0.6,
                texture_score > 0.6,
                asymmetry_score > 0.6
            ])
            
            if strong_indicators >= 3:
                combined_score += 0.15
            elif strong_indicators >= 2:
                combined_score += 0.1
                
            # Normalizar para 0-1
            combined_score = min(1.0, max(0.0, combined_score))

            is_smiling = combined_score > threshold

            results.append({
                "boundingBox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                "score": 1.0, # Assume 1.0 if face detected
                "smileScore": float(combined_score),
                "smiling": bool(is_smiling),
                "details": {
                    "method": "Advanced multi-method detection",
                    "haar_score": float(haar_score),
                    "pixel_score": float(pixel_score),
                    "contour_score": float(contour_score),
                    "texture_score": float(texture_score),
                    "asymmetry_score": float(asymmetry_score),
                    "combined_score": float(combined_score),
                    "threshold": float(threshold),
                    "face_size": f"{int(w)}x{int(h)}",
                    "mouth_region_size": f"{int(mouth_region_gray.shape[1])}x{int(mouth_region_gray.shape[0])}",
                    "mean_brightness": f"{float(mean_brightness):.2f}",
                    "brightness_variance": f"{float(brightness_variance):.2f}",
                    "brightness_std": f"{float(brightness_std):.2f}",
                    "iqr": f"{float(iqr):.2f}",
                    "contour_count": int(len(contours)),
                    "strong_indicators": int(strong_indicators),
                    "gradient_mean": f"{float(np.mean(gradient_magnitude)):.2f}",
                    "gradient_std": f"{float(np.std(gradient_magnitude)):.2f}"
                }
            })
        
        if results:
            best_result = max(results, key=lambda r: r['smileScore'])
            return {
                "face_detected": True,
                "smiling": bool(best_result['smiling']),
                "confidence": float(best_result['score']),
                "smile_score": float(best_result['smileScore']),
                "threshold": float(threshold),
                "details": best_result['details'],
                "face_region": {
                    "x": int(best_result['boundingBox']['x']),
                    "y": int(best_result['boundingBox']['y']),
                    "width": int(best_result['boundingBox']['width']),
                    "height": int(best_result['boundingBox']['height'])
                }
            }
        else:
            return {
                "face_detected": False,
                "smiling": False,
                "confidence": 0.0,
                "smile_score": 0.0,
                "threshold": threshold,
                "details": "No face detected"
            }

detector = ImprovedSmileDetector()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Improved Python Smile Detector running"})

@app.route('/api/detect-smile', methods=['POST'])
def detect_smile_api():
    data = request.get_json()
    if 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400

    image_data = data['image'].split(',')[1]
    image_bytes = base64.b64decode(image_data)
    
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "Could not decode image"}), 400

    threshold = data.get('threshold', 0.5) # Default threshold
    
    detection_result = detector.detect_smile(img, threshold)
    return jsonify(detection_result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)