import { useRef, useEffect, useState } from 'react'
import { useFaceDetection } from '../hooks/usePythonSmileDetection'
import FaceOverlay from './FaceOverlay'

const WebcamView = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [isCapturing, setIsCapturing] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)

  const { detections, error: detectionError, isSmiling, smileThreshold, setSmileThreshold } = useFaceDetection(videoRef)

  // Capture function
  const handleCapture = async () => {
    console.log('Starting capture process...')
    setIsCapturing(true)
    
    if (!videoRef.current || !captureCanvasRef.current) {
      console.error('Video or canvas ref not available')
      setIsCapturing(false)
      return
    }

    const video = videoRef.current
    const canvas = captureCanvasRef.current
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Get 2D context and draw video frame
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    console.log('Frame captured to canvas')
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/jpeg', 0.8)
    })
    
    // Create File object
    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
    console.log('File created:', { name: file.name, size: file.size, type: file.type })
    
    // Upload file to backend
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      // Add face coordinates if available
      if (detections.length > 0) {
        const faceData = {
          x: detections[0].boundingBox.xCenter * video.videoWidth - (detections[0].boundingBox.width * video.videoWidth / 2),
          y: detections[0].boundingBox.yCenter * video.videoHeight - (detections[0].boundingBox.height * video.videoHeight / 2),
          width: detections[0].boundingBox.width * video.videoWidth,
          height: detections[0].boundingBox.height * video.videoHeight,
          confidence: detections[0].score
        }
        formData.append('faceCoordinates', JSON.stringify(faceData))
      }
      
      const response = await fetch('http://localhost:3002/api/captures', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Image uploaded successfully:', result)
        setLastCapture(new Date().toLocaleTimeString())
      } else {
        console.error('Upload failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle spacebar capture
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault() // Prevent default spacebar behavior
        console.log('Spacebar pressed - capturing image...')
        handleCapture()
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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
        
        {/* Hidden canvas for capture */}
        <canvas 
          ref={captureCanvasRef} 
          style={{ display: 'none' }} 
        />
        
        {isStreaming && (
          <div className="absolute top-2 right-2 space-y-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${isSmiling ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
            
            {isCapturing && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-yellow-500 text-white">
                <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
                <span>Capturing...</span>
              </div>
            )}
            
            {lastCapture && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-green-600 text-white">
                <span>📸</span>
                <span>Captured at {lastCapture}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detection info */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Faces detected: {detections.length}</span>
          <span>Smiling: {isSmiling ? 'Yes' : 'No'}</span>
        </div>
        
        <div className="text-center text-sm text-gray-500 bg-gray-50 p-2 rounded">
          <span className="font-medium">💡 Tip:</span> Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Space</kbd> to capture a photo
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