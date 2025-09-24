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
    
    // Validate and adjust coordinates to fit within image bounds
    const left = Math.max(0, Math.min(Math.round(faceData.x), imageWidth - 1));
    const top = Math.max(0, Math.min(Math.round(faceData.y), imageHeight - 1));
    const width = Math.min(Math.round(faceData.width), imageWidth - left);
    const height = Math.min(Math.round(faceData.height), imageHeight - top);
    
    console.log('Adjusted coordinates:', { left, top, width, height });
    
    // Validate that we have valid dimensions
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid crop dimensions: width=${width}, height=${height}`);
    }

    // Perform face cropping using Sharp
    const croppedImage = await sharp(filePath)
      .extract({
        left,
        top,
        width,
        height
      })
      .png()
      .toBuffer();

    // Create circular mask for background removal
    const radius = Math.round(width / 2);
    const maskSvg = `
      <svg width="${width}" height="${height}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
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
