import { useEffect, useState, RefObject } from 'react';

interface Detection {
  boundingBox: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
  score: number;
}

interface UseFaceDetectionReturn {
  detections: Detection[];
  isDetecting: boolean;
  error: string | null;
  isSmiling: boolean;
  smileThreshold: number;
  setSmileThreshold: (threshold: number) => void;
}

export const useFaceDetection = (videoRef: RefObject<HTMLVideoElement>): UseFaceDetectionReturn => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSmiling, setIsSmiling] = useState(false);
  const [smileThreshold, setSmileThreshold] = useState(0.6);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeDetection = async () => {
      try {
        console.log('🐍 Inicializando detecção Python...');
        
        // Testar conexão com servidor Python
        const response = await fetch('http://localhost:5000/api/health');
        if (!response.ok) {
          throw new Error('Servidor Python não está respondendo');
        }
        
        const data = await response.json();
        console.log('✅ Servidor Python conectado:', data.message);
        
        setError(null);
        setIsInitialized(true);
        
      } catch (err) {
        console.error('❌ Erro na conexão Python:', err);
        setError('Servidor Python não disponível. Execute: cd python-backend && source venv/bin/activate && python simple_smile_detector.py');
        setIsInitialized(false);
      }
    };

    initializeDetection();
  }, []);

  useEffect(() => {
    if (!isInitialized || !videoRef.current) return;

    const detectFaces = async () => {
      if (!videoRef.current) return;

      try {
        // Capturar frame do vídeo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        // Converter para base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Enviar para servidor Python
        const response = await fetch('http://localhost:5000/api/detect-smile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData })
        });

        if (!response.ok) {
          throw new Error('Erro na requisição para servidor Python');
        }

        const result = await response.json();

        if (result.face_detected) {
          // Simular bounding box baseado na região da face detectada
          const faceRegion = result.face_region;
          const detection: Detection = {
            boundingBox: {
              xCenter: (faceRegion.x + faceRegion.width / 2) / videoRef.current.videoWidth,
              yCenter: (faceRegion.y + faceRegion.height / 2) / videoRef.current.videoHeight,
              width: faceRegion.width / videoRef.current.videoWidth,
              height: faceRegion.height / videoRef.current.videoHeight,
            },
            score: result.confidence
          };

          setDetections([detection]);
          setIsDetecting(true);
          setIsSmiling(result.smiling);

          console.log('🐍 Detecção Python:', {
            faceDetected: result.face_detected,
            smiling: result.smiling,
            confidence: result.confidence,
            smileScore: result.smile_score,
            threshold: smileThreshold,
            details: result.details
          });
        } else {
          setDetections([]);
          setIsSmiling(false);
          console.log('❌ Nenhuma face detectada pelo Python');
        }
        
      } catch (err) {
        console.error('❌ Erro na detecção Python:', err);
        setIsSmiling(false);
      }
    };

    if (videoRef.current.readyState >= 2) {
      const interval = setInterval(detectFaces, 500); // A cada 500ms
      return () => clearInterval(interval);
    } else {
      const handleLoadedData = () => {
        const interval = setInterval(detectFaces, 500);
        return () => clearInterval(interval);
      };
      
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleLoadedData);
        }
      };
    }
  }, [videoRef, smileThreshold, isInitialized]);

  return {
    detections,
    isDetecting,
    error,
    isSmiling,
    smileThreshold,
    setSmileThreshold
  };
};
