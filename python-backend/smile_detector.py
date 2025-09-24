import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

class ImprovedSmileDetector:
    def __init__(self):
        # Carregar classificador Haar para detecção de faces
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        
        # Carregar classificador Haar para detecção de sorriso
        self.smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
        
        print("✅ Improved Smile Detector inicializado!")

    def detect_smile_improved(self, image):
        """Detecção de sorriso MELHORADA usando múltiplas técnicas"""
        try:
            # Converter para escala de cinza
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detectar faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                return {
                    "face_detected": False,
                    "smiling": False,
                    "confidence": 0.0,
                    "reason": "Nenhuma face detectada"
                }
            
            # Usar a primeira face detectada
            (x, y, w, h) = faces[0]
            
            # Extrair região da face
            face_roi = gray[y:y+h, x:x+w]
            
            # MÉTODO 1: Detecção de sorriso com Haar Cascade
            smile_score_1 = self.detect_smile_haar(face_roi)
            
            # MÉTODO 2: Análise de pixels da boca
            smile_score_2 = self.analyze_mouth_pixels(face_roi)
            
            # MÉTODO 3: Análise de contornos
            smile_score_3 = self.analyze_mouth_contours(face_roi)
            
            # MÉTODO 4: Análise de brilho e variação
            smile_score_4 = self.analyze_mouth_brightness(face_roi)
            
            # Combinar scores com pesos
            combined_score = (
                smile_score_1 * 0.3 +  # Haar Cascade
                smile_score_2 * 0.3 +  # Análise de pixels
                smile_score_3 * 0.2 +  # Contornos
                smile_score_4 * 0.2    # Brilho
            )
            
            return {
                "face_detected": True,
                "smiling": combined_score > 0.4,  # Threshold mais baixo
                "confidence": combined_score,
                "smile_score": combined_score,
                "face_region": {
                    "x": int(x),
                    "y": int(y),
                    "width": int(w),
                    "height": int(h)
                },
                "details": {
                    "method": "Multi-method detection (Haar + Pixels + Contours + Brightness)",
                    "haar_score": smile_score_1,
                    "pixel_score": smile_score_2,
                    "contour_score": smile_score_3,
                    "brightness_score": smile_score_4,
                    "combined_score": combined_score,
                    "threshold": 0.4
                }
            }
            
        except Exception as e:
            print(f"❌ Erro na detecção: {e}")
            return {
                "face_detected": False,
                "smiling": False,
                "confidence": 0.0,
                "error": str(e)
            }

    def detect_smile_haar(self, face_roi):
        """Detecção de sorriso usando Haar Cascade"""
        try:
            smiles = self.smile_cascade.detectMultiScale(
                face_roi,
                scaleFactor=1.8,
                minNeighbors=20,
                minSize=(25, 25)
            )
            
            if len(smiles) > 0:
                return 0.8  # Alto score se detectou sorriso
            else:
                return 0.2  # Baixo score se não detectou
        except:
            return 0.0

    def analyze_mouth_pixels(self, face_roi):
        """Análise de pixels da região da boca"""
        h, w = face_roi.shape
        
        # Definir região da boca (parte inferior da face)
        mouth_y_start = int(h * 0.6)
        mouth_y_end = int(h * 0.9)
        mouth_x_start = int(w * 0.2)
        mouth_x_end = int(w * 0.8)
        
        # Extrair região da boca
        mouth_region = face_roi[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
        
        if mouth_region.size == 0:
            return 0.0
        
        # Análise de brilho
        mean_brightness = np.mean(mouth_region)
        brightness_variance = np.var(mouth_region)
        
        # Análise de bordas
        edges = cv2.Canny(mouth_region, 50, 150)
        edge_density = np.sum(edges > 0) / mouth_region.size
        
        # Calcular score baseado em múltiplos fatores
        score = 0.0
        
        # Fator 1: Brilho (boca aberta = mais escura)
        if mean_brightness < 100:
            score += 0.3
        
        # Fator 2: Variação (boca aberta = mais variação)
        if brightness_variance > 500:
            score += 0.3
        
        # Fator 3: Bordas (boca aberta = mais bordas)
        if edge_density > 0.1:
            score += 0.4
        
        return min(1.0, score)

    def analyze_mouth_contours(self, face_roi):
        """Análise de contornos da região da boca"""
        h, w = face_roi.shape
        
        # Definir região da boca
        mouth_y_start = int(h * 0.6)
        mouth_y_end = int(h * 0.9)
        mouth_x_start = int(w * 0.2)
        mouth_x_end = int(w * 0.8)
        
        mouth_region = face_roi[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
        
        if mouth_region.size == 0:
            return 0.0
        
        # Aplicar blur e detecção de bordas
        blurred = cv2.GaussianBlur(mouth_region, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        # Encontrar contornos
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Calcular score baseado em contornos
        score = 0.0
        
        # Fator 1: Número de contornos
        if len(contours) > 3:
            score += 0.3
        
        # Fator 2: Área total dos contornos
        total_area = sum(cv2.contourArea(c) for c in contours)
        area_ratio = total_area / (mouth_region.shape[0] * mouth_region.shape[1])
        if area_ratio > 0.1:
            score += 0.4
        
        # Fator 3: Contornos grandes
        large_contours = [c for c in contours if cv2.contourArea(c) > 50]
        if len(large_contours) > 0:
            score += 0.3
        
        return min(1.0, score)

    def analyze_mouth_brightness(self, face_roi):
        """Análise de brilho da região da boca"""
        h, w = face_roi.shape
        
        # Definir região da boca
        mouth_y_start = int(h * 0.6)
        mouth_y_end = int(h * 0.9)
        mouth_x_start = int(w * 0.2)
        mouth_x_end = int(w * 0.8)
        
        mouth_region = face_roi[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
        
        if mouth_region.size == 0:
            return 0.0
        
        # Análise de brilho
        mean_brightness = np.mean(mouth_region)
        brightness_variance = np.var(mouth_region)
        
        # Análise de histograma
        hist = cv2.calcHist([mouth_region], [0], None, [256], [0, 256])
        
        # Calcular score
        score = 0.0
        
        # Fator 1: Brilho médio (boca aberta = mais escura)
        if mean_brightness < 120:
            score += 0.4
        
        # Fator 2: Variação (boca aberta = mais variação)
        if brightness_variance > 300:
            score += 0.3
        
        # Fator 3: Distribuição de brilho
        dark_pixels = np.sum(mouth_region < 100)
        total_pixels = mouth_region.size
        dark_ratio = dark_pixels / total_pixels
        
        if dark_ratio > 0.3:  # 30% de pixels escuros
            score += 0.3
        
        return min(1.0, score)

# Inicializar detector
detector = ImprovedSmileDetector()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Improved Python Smile Detector running"})

@app.route('/api/detect-smile', methods=['POST'])
def detect_smile():
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Decodificar imagem base64
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Detectar sorriso
        result = detector.detect_smile_improved(image)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando Improved Python Smile Detector...")
    print("📊 Health check: http://localhost:5000/api/health")
    print("🎯 Detect smile: http://localhost:5000/api/detect-smile")
    app.run(host='0.0.0.0', port=5000, debug=True)
