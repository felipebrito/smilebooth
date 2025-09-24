import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database/initialize';
import { db } from './database/connection';
import { processCapture, FaceData } from './services/imageProcessor';

const app = express();
const PORT = process.env.PORT || 3002;

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from captures directory
app.use('/captures', express.static(path.join(__dirname, '../captures')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// List captures endpoint
app.get('/api/captures', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for date filtering
    let whereClause = '';
    let params: any[] = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE timestamp BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else if (startDate) {
      whereClause = 'WHERE timestamp >= ?';
      params = [startDate];
    } else if (endDate) {
      whereClause = 'WHERE timestamp <= ?';
      params = [endDate];
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM captures ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const totalItems = countResult.total;
    
    // Get captures with pagination
    const capturesQuery = `
      SELECT * FROM captures 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const captures = await db.all(capturesQuery, [...params, limit, offset]);
    
    const totalPages = Math.ceil(totalItems / limit);
    
    res.json({
      data: captures,
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching captures:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch captures'
    });
  }
});

// Image upload endpoint
app.post('/api/captures', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided',
        message: 'Please provide an image file in the "image" field'
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
      });
    }

      // Check if image is already processed (PNG with transparency)
      let processedImagePath = req.file.filename;
      const isAlreadyProcessed = req.file.mimetype === 'image/png';
      
      if (isAlreadyProcessed) {
        console.log('✅ Image already processed with background removal (PNG)');
        // Move to captures directory directly
        const capturesDir = path.join(__dirname, '../captures');
        if (!fs.existsSync(capturesDir)) {
          fs.mkdirSync(capturesDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newFilename = `smile_${timestamp}.png`;
        const newPath = path.join(capturesDir, newFilename);
        
        await fs.promises.rename(req.file.path, newPath);
        processedImagePath = newFilename;
        console.log('📁 Moved processed image to captures directory:', newFilename);
      } else {
        // Process image if it's not already processed
        let faceData: FaceData | null = null;
        if (req.body.faceCoordinates) {
          try {
            faceData = JSON.parse(req.body.faceCoordinates);
          } catch (error) {
            console.warn('Invalid face coordinates format:', error);
          }
        }

        if (faceData) {
          const processResult = await processCapture(req.file.path, faceData);
          if (processResult.success && processResult.finalPath) {
            processedImagePath = processResult.finalPath;
          } else {
            console.warn('Image processing failed:', processResult.error);
          }
        }
      }

    // Insert record into database
    const result = await db.run(
      `INSERT INTO captures (id, timestamp, original_path, face_coordinates, confidence, is_auto_capture, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString(), // id
        new Date().toISOString(), // timestamp
        processedImagePath, // original_path (now processed image path)
        faceData ? JSON.stringify(faceData) : null, // face_coordinates
        faceData?.confidence || null, // confidence
        0, // is_auto_capture (manual for now)
        JSON.stringify({ 
          originalName: req.file.originalname, 
          size: req.file.size,
          mimetype: req.file.mimetype,
          processed: faceData ? true : false
        }) // metadata
      ]
    );

      // Clean up temporary file if image was processed and moved
      if (isAlreadyProcessed || (processedImagePath !== req.file.filename)) {
        try {
          await fs.promises.unlink(req.file.path);
          console.log('🗑️ Temporary file cleaned up:', req.file.path);
        } catch (error) {
          console.warn('⚠️ Failed to clean up temporary file:', error);
        }
      }

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        filename: processedImagePath,
        originalName: req.file.originalname,
        size: req.file.size,
        timestamp: new Date().toISOString(),
        faceProcessed: faceData ? true : false
      },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to upload image. Please try again.'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
