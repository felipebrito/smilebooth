import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

class SimpleSmileDetector:
    def __init__(self):
        # Carregar classificador Haar para detecção de faces
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        print("✅ Simple Smile Detector inicializado com sucesso!")

    def detect_smile_simple(self, image):
        """Detecção de sorriso simples mas eficaz usando OpenCV"""
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
            
            # Analisar sorriso na região da face
            smile_score = self.analyze_smile_in_face(face_roi)
            
            return {
                "face_detected": True,
                "smiling": smile_score > 0.3,  # Threshold mais baixo
                "confidence": smile_score,
                "smile_score": smile_score,
                "face_region": {
                    "x": int(x),
                    "y": int(y),
                    "width": int(w),
                    "height": int(h)
                },
                "details": {
                    "method": "OpenCV + Análise de pixels",
                    "face_size": f"{w}x{h}",
                    "threshold": 0.3
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

    def analyze_smile_in_face(self, face_roi):
        """Analisa sorriso na região da face usando análise de pixels"""
        h, w = face_roi.shape
        
        # Definir região da boca (parte inferior da face)
        mouth_y_start = int(h * 0.6)  # 60% da altura da face
        mouth_y_end = int(h * 0.9)    # 90% da altura da face
        mouth_x_start = int(w * 0.2)  # 20% da largura da face
        mouth_x_end = int(w * 0.8)    # 80% da largura da face
        
        # Extrair região da boca
        mouth_region = face_roi[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
        
        if mouth_region.size == 0:
            return 0.0
        
        # Aplicar filtros para realçar características da boca
        # 1. Blur para suavizar
        blurred = cv2.GaussianBlur(mouth_region, (5, 5), 0)
        
        # 2. Detecção de bordas
        edges = cv2.Canny(blurred, 50, 150)
        
        # 3. Análise de contornos
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Calcular score de sorriso MAIS RIGOROSO
        smile_score = 0.0
        
        # Fator 1: Número de contornos (boca aberta = mais contornos) - MAIS RIGOROSO
        contour_count = len(contours)
        if contour_count > 8:  # Aumentado de 3 para 8
            smile_score += 0.2  # Reduzido de 0.3 para 0.2
        
        # Fator 2: Área total dos contornos - MAIS RIGOROSO
        total_area = sum(cv2.contourArea(c) for c in contours)
        area_ratio = total_area / (mouth_region.shape[0] * mouth_region.shape[1])
        if area_ratio > 0.2:  # Aumentado de 0.1 para 0.2 (20% da região)
            smile_score += 0.2  # Reduzido de 0.3 para 0.2
        
        # Fator 3: Análise de brilho (boca aberta = mais escura) - MAIS RIGOROSO
        mean_brightness = np.mean(mouth_region)
        if mean_brightness < 80:  # Reduzido de 100 para 80 (mais escuro)
            smile_score += 0.2
        
        # Fator 4: Variância de brilho (boca aberta = mais variação) - MAIS RIGOROSO
        brightness_variance = np.var(mouth_region)
        if brightness_variance > 800:  # Aumentado de 500 para 800
            smile_score += 0.2
        
        # Fator 5: NOVO - Verificar se há variação suficiente (boca fechada = pouca variação)
        if brightness_variance < 300:  # Pouca variação = boca fechada
            smile_score *= 0.3  # Reduzir drasticamente se boca fechada
        
        # Fator 6: NOVO - Verificar brilho médio (boca fechada = mais clara)
        if mean_brightness > 120:  # Muito claro = boca fechada
            smile_score *= 0.2  # Reduzir drasticamente se muito claro
        
        # Fator 7: NOVO - Verificar proporção de contornos (muitos contornos pequenos = boca fechada)
        if contour_count > 0:
            avg_contour_area = total_area / contour_count
            if avg_contour_area < 50:  # Contornos muito pequenos = boca fechada
                smile_score *= 0.4  # Reduzir se contornos muito pequenos
        
        return min(1.0, smile_score)

# Inicializar detector
detector = SimpleSmileDetector()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Python Simple Smile Detector running"})

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
        result = detector.detect_smile_simple(image)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando Python Simple Smile Detector...")
    print("📊 Health check: http://localhost:5000/api/health")
    print("🎯 Detect smile: http://localhost:5000/api/detect-smile")
    app.run(host='0.0.0.0', port=5000, debug=True)
