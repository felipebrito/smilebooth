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
    
      // Create tighter crop focused on the person (like the reference image)
      const cropSize = Math.max(faceData.width, faceData.height) * 1.1; // 10% padding for tighter crop
      const centerX = faceData.x + faceData.width / 2;
      const centerY = faceData.y + faceData.height / 2;
      
      // Calculate crop area centered on face
      const cropX = Math.max(0, centerX - cropSize / 2);
      const cropY = Math.max(0, centerY - cropSize / 2);
      const finalCropSize = Math.min(cropSize, Math.min(imageWidth - cropX, imageHeight - cropY));
      
      console.log('Tighter person crop:', { cropX, cropY, finalCropSize });
      
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

      // Create elliptical mask that better fits a face (wider than tall)
      const maskSvg = `
        <svg width="400" height="400">
          <ellipse cx="200" cy="200" rx="180" ry="160" fill="white"/>
        </svg>
      `;

      const maskBuffer = Buffer.from(maskSvg);

      // Apply elliptical mask to remove background (more precise than circular)
      const finalImage = await sharp(croppedImage)
        .composite([{
          input: maskBuffer,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();

      // Additional processing to ensure clean background removal
      await sharp(finalImage)
        .png({
          quality: 100,
          compressionLevel: 0,
          adaptiveFiltering: false,
          force: true
        })
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
