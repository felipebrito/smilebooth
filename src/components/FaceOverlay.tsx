import { useRef, useEffect } from 'react';

interface Detection {
  boundingBox: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
  score: number;
}

interface FaceOverlayProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
  isSmiling?: boolean;
}

const FaceOverlay = ({ detections, videoWidth, videoHeight, isSmiling = false }: FaceOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size to match video
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw bounding boxes for each detection
    detections.forEach((detection) => {
      const { boundingBox, score } = detection;
      
      // Convert normalized coordinates to pixel coordinates
      const x = (boundingBox.xCenter - boundingBox.width / 2) * videoWidth;
      const y = (boundingBox.yCenter - boundingBox.height / 2) * videoHeight;
      const width = boundingBox.width * videoWidth;
      const height = boundingBox.height * videoHeight;

      // Set drawing style based on smile detection
      ctx.strokeStyle = isSmiling ? '#10b981' : '#3b82f6'; // Green for smiling, blue for normal
      ctx.lineWidth = 3;
      ctx.setLineDash([]);

      // Draw bounding box
      ctx.strokeRect(x, y, width, height);

      // Draw score text
      ctx.fillStyle = isSmiling ? '#10b981' : '#3b82f6';
      ctx.font = '16px Arial';
      ctx.fillText(
        `Face: ${(score * 100).toFixed(1)}%`,
        x,
        y - 10
      );

      // Draw smile indicator
      if (isSmiling) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('😊', x + width - 30, y + 20);
      }
    });
  }, [detections, videoWidth, videoHeight, isSmiling]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }}
    />
  );
};

export default FaceOverlay;
