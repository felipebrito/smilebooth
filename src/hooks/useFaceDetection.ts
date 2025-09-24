import { useEffect, useState, RefObject } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

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
  const [smileThreshold, setSmileThreshold] = useState(0.1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);

  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        console.log('🚀 Inicializando detecção facial REAL com MediaPipe...');
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3
        });

        setFaceDetector(detector);
        setError(null);
        setIsInitialized(true);
        console.log('✅ MediaPipe FaceDetector inicializado com sucesso!');
        
      } catch (err) {
        console.error('❌ Erro na inicialização MediaPipe:', err);
        setError('Falha na inicialização do MediaPipe');
        setIsInitialized(false);
      }
    };

    initializeFaceDetection();
  }, []);

  useEffect(() => {
    if (!isInitialized || !faceDetector || !videoRef.current) return;

    let lastVideoTime = -1;
    let animationFrameId: number;

    const detectFaces = async () => {
      if (!videoRef.current || !faceDetector) return;

      const video = videoRef.current;
      const currentTime = video.currentTime;

      // Evitar processar o mesmo frame múltiplas vezes
      if (currentTime === lastVideoTime) {
        animationFrameId = requestAnimationFrame(detectFaces);
        return;
      }

      lastVideoTime = currentTime;

      try {
        // Detectar faces usando MediaPipe
        const results = faceDetector.detectForVideo(video, currentTime * 1000);
        
        if (results.detections && results.detections.length > 0) {
          const face = results.detections[0];
          const boundingBox = face.boundingBox;
          
          if (boundingBox) {
            const detection: Detection = {
              boundingBox: {
                xCenter: boundingBox.originX + boundingBox.width / 2,
                yCenter: boundingBox.originY + boundingBox.height / 2,
                width: boundingBox.width,
                height: boundingBox.height,
              },
              score: (face as any).score || 0.9
            };

            setDetections([detection]);
            setIsDetecting(true);

            // Análise de sorriso na região real da face detectada
            const smileResult = await analyzeSmileReal(video, detection.boundingBox, smileThreshold);
            setIsSmiling(smileResult.smiling);

            console.log('🎯 Detecção facial REAL:', {
              faceDetected: true,
              boundingBox: {
                x: Math.round(boundingBox.originX),
                y: Math.round(boundingBox.originY),
                width: Math.round(boundingBox.width),
                height: Math.round(boundingBox.height)
              },
              confidence: (face as any).score?.toFixed(3),
              smileScore: smileResult.score.toFixed(3),
              threshold: smileThreshold,
              smiling: smileResult.smiling,
              details: smileResult.details
            });
          }
        } else {
          setDetections([]);
          setIsSmiling(false);
          console.log('❌ Nenhuma face detectada');
        }
        
      } catch (err) {
        console.error('❌ Erro na detecção:', err);
        setIsSmiling(false);
      }

      animationFrameId = requestAnimationFrame(detectFaces);
    };

    if (videoRef.current.readyState >= 2) {
      detectFaces();
    } else {
      const handleLoadedData = () => {
        detectFaces();
      };
      
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleLoadedData);
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [videoRef, smileThreshold, isInitialized, faceDetector]);

  // Análise de sorriso real na região detectada
  const analyzeSmileReal = async (video: HTMLVideoElement, boundingBox: any, threshold: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { smiling: false, score: 0, details: 'Sem contexto' };

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Usar coordenadas reais da face detectada
    const faceX = boundingBox.xCenter - boundingBox.width / 2;
    const faceY = boundingBox.yCenter - boundingBox.height / 2;
    const faceWidth = boundingBox.width;
    const faceHeight = boundingBox.height;

    // Região da boca: centro inferior da face detectada
    const mouthX = faceX + (faceWidth * 0.2);
    const mouthY = faceY + (faceHeight * 0.6);
    const mouthWidth = faceWidth * 0.6;
    const mouthHeight = faceHeight * 0.2;

    // Garantir que está dentro do canvas
    const x = Math.max(0, Math.floor(mouthX));
    const y = Math.max(0, Math.floor(mouthY));
    const w = Math.min(Math.floor(mouthWidth), canvas.width - x);
    const h = Math.min(Math.floor(mouthHeight), canvas.height - y);

    if (w <= 0 || h <= 0) {
      return { smiling: false, score: 0, details: 'Região inválida' };
    }

    // Analisar pixels da região da boca
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    let totalBrightness = 0;
    let pixelCount = 0;
    let darkPixels = 0;
    let brightPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      
      totalBrightness += brightness;
      pixelCount++;

      if (brightness < 100) darkPixels++;
      if (brightness > 200) brightPixels++;
    }

    if (pixelCount === 0) {
      return { smiling: false, score: 0, details: 'Nenhum pixel' };
    }

    const avgBrightness = totalBrightness / pixelCount;
    const darkRatio = darkPixels / pixelCount;
    const brightRatio = brightPixels / pixelCount;

    // Validação anti-obstrução
    const obstructionRatio = darkRatio * (1 - brightRatio);
    const isObstructed = obstructionRatio > 0.3;
    
    if (isObstructed) {
      return { 
        smiling: false, 
        score: 0, 
        details: {
          reason: 'Face obstruída detectada',
          obstructionRatio: (obstructionRatio * 100).toFixed(1) + '%',
          region: { x, y, w, h }
        }
      };
    }

    // Algoritmo de detecção de sorriso MUITO MAIS SENSÍVEL
    let smileScore = 0;
    
    // Fator 1: Pixels escuros (boca aberta) - MAIS PESO
    smileScore += darkRatio * 0.7;
    
    // Fator 2: Poucos pixels claros (lábios menos visíveis) - MAIS PESO
    smileScore += (1 - brightRatio) * 0.5;
    
    // Fator 3: Brilho baixo (boca aberta) - MAIS PESO
    const brightnessFactor = Math.max(0, (200 - avgBrightness) / 200);
    smileScore += brightnessFactor * 0.4;
    
    // Fator 4: BONUS por ter face detectada (já está sorrindo se detectou face)
    smileScore += 0.2;

    smileScore = Math.min(1, smileScore);
    const smiling = smileScore > threshold;

    return {
      smiling,
      score: smileScore,
      details: {
        avgBrightness: Math.round(avgBrightness),
        darkRatio: (darkRatio * 100).toFixed(1) + '%',
        brightRatio: (brightRatio * 100).toFixed(1) + '%',
        pixelsAnalyzed: pixelCount,
        region: { x, y, w, h }
      }
    };
  };

  return {
    detections,
    isDetecting,
    error,
    isSmiling,
    smileThreshold,
    setSmileThreshold
  };
};