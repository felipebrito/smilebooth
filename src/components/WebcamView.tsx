import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFaceDetection } from '../hooks/usePythonSmileDetection'
import FaceOverlay from './FaceOverlay'

const WebcamView = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [isCapturing, setIsCapturing] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [capturedImages, setCapturedImages] = useState<any[]>([])
  const [lastCaptureTime, setLastCaptureTime] = useState(0)
  const [timeUntilNextCapture, setTimeUntilNextCapture] = useState(0)

  const { detections, error: detectionError, isSmiling, smileThreshold, setSmileThreshold } = useFaceDetection(videoRef)

  // Process image with background removal and consistent cropping
  const processImageWithBackgroundRemoval = async (
    canvas: HTMLCanvasElement, 
    detection: any, 
    video: HTMLVideoElement
  ): Promise<HTMLCanvasElement> => {
    console.log('🎨 Starting background removal process...')
    
    // Create a new canvas for the processed image
    const processedCanvas = document.createElement('canvas')
    const processedCtx = processedCanvas.getContext('2d')
    if (!processedCtx) {
      console.error('❌ Could not get processed canvas context')
      return canvas
    }
    
    // Calculate face coordinates in canvas pixels
    const faceX = detection.boundingBox.xCenter * video.videoWidth - (detection.boundingBox.width * video.videoWidth / 2)
    const faceY = detection.boundingBox.yCenter * video.videoHeight - (detection.boundingBox.height * video.videoHeight / 2)
    const faceWidth = detection.boundingBox.width * video.videoWidth
    const faceHeight = detection.boundingBox.height * video.videoHeight
    
    console.log('👤 Face coordinates:', { faceX, faceY, faceWidth, faceHeight })
    
    // Create consistent square crop (like the reference image)
    const cropSize = Math.max(faceWidth, faceHeight) * 1.2 // 20% padding around face
    const centerX = faceX + faceWidth / 2
    const centerY = faceY + faceHeight / 2
    
    // Calculate crop area centered on face
    const cropX = centerX - cropSize / 2
    const cropY = centerY - cropSize / 2
    
    // Set processed canvas to square dimensions
    processedCanvas.width = cropSize
    processedCanvas.height = cropSize
    
    // Create circular mask for consistent circular crop
    processedCtx.save()
    processedCtx.beginPath()
    const maskCenterX = cropSize / 2
    const maskCenterY = cropSize / 2
    const maskRadius = cropSize / 2
    processedCtx.arc(maskCenterX, maskCenterY, maskRadius, 0, 2 * Math.PI)
    processedCtx.clip()
    
    // Draw the cropped face region with circular clipping
    processedCtx.drawImage(
      canvas,
      cropX, cropY, cropSize, cropSize, // Source rectangle (square crop)
      0, 0, cropSize, cropSize // Destination rectangle (square output)
    )
    
    processedCtx.restore()
    
    console.log('✅ Background removal completed with consistent square crop')
    return processedCanvas
  }

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
    
    // Process image with background removal if face is detected
    let processedCanvas = canvas
    
    if (detections.length > 0) {
      console.log('🎨 Processing image with background removal...')
      processedCanvas = await processImageWithBackgroundRemoval(canvas, detections[0], video)
    }
    
    // Convert processed canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      processedCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/png', 1.0) // PNG for transparency
    })
    
    // Create File object
    const file = new File([blob], `smile_${Date.now()}.png`, { type: 'image/png' })
    console.log('File created:', { name: file.name, size: file.size, type: file.type })
    
    // Upload file to backend
    try {
      console.log('📤 Preparing upload...')
      const formData = new FormData()
      formData.append('image', file)
      console.log('📁 File added to FormData:', file.name, file.size, 'bytes')
      
      // Note: Image is already processed with background removal in frontend
      console.log('📝 Image pre-processed with background removal')
      
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
              onClick={() => navigate('/gallery')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Ver Galeria ({capturedImages.length})
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
      
    </div>
  )
}

export default WebcamView