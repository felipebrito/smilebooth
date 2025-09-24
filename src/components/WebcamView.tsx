import { useRef, useEffect, useState } from 'react'
import { useFaceDetection } from '../hooks/usePythonSmileDetection'
import FaceOverlay from './FaceOverlay'

const WebcamView = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })

  const { detections, error: detectionError, isSmiling, smileThreshold, setSmileThreshold } = useFaceDetection(videoRef)

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsStreaming(true)
          setError(null)
          // Set video dimensions once stream is loaded
          videoRef.current.onloadedmetadata = () => {
            setVideoDimensions({
              width: videoRef.current?.videoWidth || 640,
              height: videoRef.current?.videoHeight || 480,
            })
          }
        }
      } catch (err) {
        console.error('Error accessing webcam:', err)
        setError('Unable to access webcam. Please check permissions.')
        setIsStreaming(false)
      }
    }

    startWebcam()

    // Cleanup function
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-700">Live Camera Feed</h2>
      </div>
      
      <div className="relative">
        {error || detectionError ? (
          <div className="flex items-center justify-center h-64 bg-gray-100">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-2">📷</div>
              <p className="text-red-600 font-medium">{error || detectionError}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            {isStreaming && (
              <FaceOverlay 
                detections={detections} 
                videoWidth={videoDimensions.width} 
                videoHeight={videoDimensions.height} 
                isSmiling={isSmiling}
              />
            )}
          </>
        )}
        
        {isStreaming && (
          <div className="absolute top-2 right-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${isSmiling ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        )}
      </div>

      {/* Detection info */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Faces detected: {detections.length}</span>
          <span>Smiling: {isSmiling ? 'Yes' : 'No'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-24">Smile threshold:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={smileThreshold}
            onChange={(e) => setSmileThreshold(parseFloat(e.target.value))}
            className="flex-grow accent-blue-500"
          />
          <span className="text-sm text-gray-600 w-10 text-right">{(smileThreshold * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

export default WebcamView