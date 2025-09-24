import { useRef, useEffect, useState, useCallback } from 'react'
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
  const [capturedImages, setCapturedImages] = useState<any[]>([])
  const [showGallery, setShowGallery] = useState(false)
  const [lastCaptureTime, setLastCaptureTime] = useState(0)
  const [timeUntilNextCapture, setTimeUntilNextCapture] = useState(0)

  const { detections, error: detectionError, isSmiling, smileThreshold, setSmileThreshold } = useFaceDetection(videoRef)

  // Capture function
  const handleCapture = useCallback(async () => {
    console.log('🎬 Starting capture process...')
    console.log('📹 Video ref:', !!videoRef.current)
    console.log('🖼️ Canvas ref:', !!captureCanvasRef.current)
    console.log('📊 Detections:', detections.length)
    
    setIsCapturing(true)
    
    if (!videoRef.current || !captureCanvasRef.current) {
      console.error('❌ Video or canvas ref not available')
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
      console.log('📤 Preparing upload...')
      const formData = new FormData()
      formData.append('image', file)
      console.log('📁 File added to FormData:', file.name, file.size, 'bytes')
      
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
        console.log('👤 Face coordinates added:', faceData)
      } else {
        console.log('⚠️ No face detections available for coordinates')
      }
      
      console.log('🚀 Sending POST request to /api/captures...')
      const response = await fetch('http://localhost:3002/api/captures', {
        method: 'POST',
        body: formData
      })
      
      console.log('📡 Response received:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Image uploaded successfully:', result)
        setLastCapture(new Date().toLocaleTimeString())
        
        // Add to gallery
        const newImage = {
          id: result.data.id,
          filename: result.data.filename,
          timestamp: result.data.timestamp,
          faceProcessed: result.data.faceProcessed,
          imageUrl: `http://localhost:3002/captures/${result.data.filename}`
        }
        setCapturedImages(prev => [newImage, ...prev])
        console.log('🖼️ Image added to gallery:', newImage)
      } else {
        const errorText = await response.text()
        console.error('❌ Upload failed:', response.status, response.statusText, errorText)
      }
    } catch (error) {
      console.error('💥 Error uploading image:', error)
    } finally {
      console.log('🏁 Capture process finished')
      setIsCapturing(false)
    }
  }, [detections])

  // Update countdown timer
  useEffect(() => {
    if (lastCaptureTime > 0) {
      const interval = setInterval(() => {
        const timeLeft = Math.max(0, Math.ceil((3000 - (Date.now() - lastCaptureTime)) / 1000))
        setTimeUntilNextCapture(timeLeft)
        
        // Clear interval when countdown reaches 0
        if (timeLeft === 0) {
          clearInterval(interval)
        }
      }, 100)
      
      return () => clearInterval(interval)
    } else {
      setTimeUntilNextCapture(0)
    }
  }, [lastCaptureTime])

  // Load existing captures on component mount
  useEffect(() => {
    const loadCaptures = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/captures?limit=50');
        if (response.ok) {
          const result = await response.json();
          const images = result.data.map((capture: any) => ({
            id: capture.id,
            filename: capture.original_path,
            timestamp: capture.timestamp,
            faceProcessed: capture.face_coordinates ? true : false,
            imageUrl: `http://localhost:3002/captures/${capture.original_path}`
          }));
          setCapturedImages(images);
        }
      } catch (error) {
        console.error('Error loading captures:', error);
      }
    };
    
    loadCaptures();
  }, []);

  // Auto-capture when smiling (with debounce)
  useEffect(() => {
    if (isSmiling && !isCapturing) {
      const now = Date.now()
      const timeSinceLastCapture = now - lastCaptureTime
      
      // Only capture if at least 3 seconds have passed since last capture
      if (timeSinceLastCapture > 3000) {
        console.log('😊 Smile detected! Auto-capturing...')
        setLastCaptureTime(now)
        handleCapture()
      } else {
        console.log('😊 Smile detected but too soon since last capture, skipping...')
      }
    }
  }, [isSmiling, isCapturing, lastCaptureTime, handleCapture])

  // Handle spacebar capture
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault() // Prevent default spacebar behavior
        console.log('⌨️ Spacebar pressed - capturing image...')
        console.log('📊 Current state:', { isCapturing, isStreaming, detections: detections.length })
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
          {lastCaptureTime > 0 && timeUntilNextCapture > 0 && (
            <div className="mt-1 text-xs text-blue-600">
              Next auto-capture in: {Math.max(0, timeUntilNextCapture)}s
            </div>
          )}
        </div>
        
        <div className="text-center text-xs text-gray-400 bg-blue-50 p-2 rounded">
          <span className="font-medium">🔗 API Endpoints:</span><br/>
          <code className="text-blue-600">GET /api/captures</code> - List images<br/>
          <code className="text-blue-600">POST /api/captures</code> - Upload image<br/>
          <code className="text-blue-600">GET /captures/&#123;filename&#125;</code> - View image
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showGallery ? 'Hide Gallery' : 'Show Gallery'} ({capturedImages.length})
          </button>
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
      
      {/* Gallery */}
      {showGallery && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
            Your captured smiles will appear here
          </h3>
          
          {capturedImages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📸</div>
              <p>No images captured yet. Smile or press space to capture!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {capturedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.imageUrl}
                    alt={`Capture ${image.id}`}
                    className="w-full h-32 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      console.error('Error loading image:', image.imageUrl)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                      <div className="text-xs">
                        {new Date(image.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs mt-1">
                        {image.faceProcessed ? '✅ Processed' : '⏳ Processing'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WebcamView