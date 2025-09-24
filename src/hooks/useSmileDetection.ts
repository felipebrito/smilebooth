import { useState, useEffect } from 'react';

interface Detection {
  boundingBox: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
  score: number;
}

interface UseSmileDetectionReturn {
  isSmiling: boolean;
  smileConfidence: number;
  smileThreshold: number;
  setSmileThreshold: (threshold: number) => void;
}

export const useSmileDetection = (
  detections: Detection[],
  videoRef: React.RefObject<HTMLVideoElement>
): UseSmileDetectionReturn => {
  const [isSmiling, setIsSmiling] = useState(false);
  const [smileConfidence, setSmileConfidence] = useState(0);
  const [smileThreshold, setSmileThreshold] = useState(0.7);

  useEffect(() => {
    if (detections.length === 0 || !videoRef.current) {
      setIsSmiling(false);
      setSmileConfidence(0);
      return;
    }

    // For now, we'll use a simple heuristic based on face detection score
    // In a real implementation, you would use a more sophisticated smile detection model
    const bestDetection = detections.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    // Simple smile detection based on face score and bounding box aspect ratio
    const aspectRatio = bestDetection.boundingBox.width / bestDetection.boundingBox.height;
    const smileScore = bestDetection.score * (aspectRatio > 0.8 ? 1.2 : 1.0); // Boost score for wider faces
    
    setSmileConfidence(smileScore);
    setIsSmiling(smileScore >= smileThreshold);
  }, [detections, smileThreshold, videoRef]);

  return {
    isSmiling,
    smileConfidence,
    smileThreshold,
    setSmileThreshold
  };
};
