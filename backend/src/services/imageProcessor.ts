import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export interface FaceData {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface ProcessCaptureResult {
  success: boolean;
  finalPath?: string;
  error?: string;
}

/**
 * Process uploaded image to crop face and remove background
 * @param filePath - Path to the uploaded image file
 * @param faceData - Face coordinates and dimensions
 * @returns Promise with processing result
 */
export async function processCapture(filePath: string, faceData: FaceData): Promise<ProcessCaptureResult> {
  try {
    console.log('Processing capture:', { filePath, faceData });
    
    // Validate face data
    if (!faceData || !faceData.x || !faceData.y || !faceData.width || !faceData.height) {
      throw new Error('Invalid face data: missing required coordinates');
    }

    // Create captures directory if it doesn't exist
    const capturesDir = path.join(__dirname, '../../captures');
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }

    // Generate output filename with timestamp in YYYYMMDD_HHMMSS format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const outputFilename = `smile_${timestamp}.png`;
    const outputPath = path.join(capturesDir, outputFilename);

    // Get image metadata first to validate coordinates
    const imageMetadata = await sharp(filePath).metadata();
    const imageWidth = imageMetadata.width || 0;
    const imageHeight = imageMetadata.height || 0;
    
    console.log('Image dimensions:', { width: imageWidth, height: imageHeight });
    console.log('Face coordinates:', faceData);
    
      // Create consistent square crop (like the reference image)
      const cropSize = Math.max(faceData.width, faceData.height) * 1.2; // 20% padding around face
      const centerX = faceData.x + faceData.width / 2;
      const centerY = faceData.y + faceData.height / 2;
      
      // Calculate crop area centered on face
      const cropX = Math.max(0, centerX - cropSize / 2);
      const cropY = Math.max(0, centerY - cropSize / 2);
      const finalCropSize = Math.min(cropSize, Math.min(imageWidth - cropX, imageHeight - cropY));
      
      console.log('Consistent square crop:', { cropX, cropY, finalCropSize });
      
      // Validate that we have valid dimensions
      if (finalCropSize <= 0) {
        throw new Error(`Invalid crop dimensions: size=${finalCropSize}`);
      }

      // Perform square face cropping using Sharp
      const croppedImage = await sharp(filePath)
        .extract({
          left: Math.round(cropX),
          top: Math.round(cropY),
          width: Math.round(finalCropSize),
          height: Math.round(finalCropSize)
        })
        .resize(400, 400) // Standardize to 400x400 square
        .png()
        .toBuffer();

      // Create circular mask for background removal
      const radius = 200; // Half of 400x400
      const maskSvg = `
        <svg width="400" height="400">
          <circle cx="200" cy="200" r="200" fill="white"/>
        </svg>
      `;

      const maskBuffer = Buffer.from(maskSvg);

      // Apply circular mask to remove background
      await sharp(croppedImage)
        .composite([{
          input: maskBuffer,
          blend: 'dest-in'
        }])
        .png()
        .toFile(outputPath);

    console.log('Face cropping completed:', outputPath);
    
    return {
      success: true,
      finalPath: outputFilename // Return relative path for database storage
    };
  } catch (error) {
    console.error('Error processing capture:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
