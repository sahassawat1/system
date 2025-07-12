// backend-nodejs/routes/ocrRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const ocrController = require('../controllers/ocrController');

/**
 * @swagger
 * tags:
 *   name: OCR
 *   description: OCR (Optical Character Recognition) endpoints for document processing
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|tiff|tif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});



/**
 * @swagger
 * /api/ocr:
 *   post:
 *     summary: Submit OCR job
 *     tags: [OCR]
 *     description: Upload a document for OCR processing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to process (PDF, JPG, PNG, TIFF)
 *     responses:
 *       200:
 *         description: OCR job submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Job ID
 *                       example: "job_1705123456789_abc123def"
 *                     filename:
 *                       type: string
 *                       description: Original filename
 *                       example: "document.pdf"
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *                       example: "pending"
 *                     progress:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                       example: 0
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: No file uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to submit OCR job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Submit OCR job (protected route)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user.uid;
    
    // Create OCR job
    const job = {
      id: jobId,
      userId: userId,
      filename: req.file.originalname,
      filepath: req.file.path,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      userEmail: req.user.email
    };
    
    ocrJobs.set(jobId, job);
    
    // Simulate OCR processing
    setTimeout(() => {
      job.status = 'processing';
      job.progress = 25;
    }, 1000);
    
    setTimeout(() => {
      job.progress = 50;
    }, 2000);
    
    setTimeout(() => {
      job.progress = 75;
    }, 3000);
    
    setTimeout(() => {
      job.status = 'completed';
      job.progress = 100;
      job.result = `OCR result for ${req.file.originalname}\n\nThis is a simulated OCR result. In a real implementation, this would contain the extracted text from the document.`;
      job.completedAt = new Date().toISOString();
    }, 4000);
    
    res.json({
      success: true,
      job: {
        id: job.id,
        filename: job.filename,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    console.error('OCR job submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit OCR job' 
    });
  }
}); 

/**
 * @swagger
 * /api/ocr/status/{jobId}:
 *   get:
 *     summary: Get OCR job status
 *     tags: [OCR]
 *     description: Retrieve the status and progress of an OCR job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID to check status
 *         example: "job_1705123456789_abc123def"
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   $ref: '#/components/schemas/OCRJob'
 *       403:
 *         description: Access denied - Job belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to get job status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get OCR job status (protected route)
router.get('/status/:jobId', authMiddleware, (req, res) => {
  try {
    const { jobId } = req.params;
    const job = ocrJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    // Check if user owns this job or is admin
    if (job.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({
      success: true,
      job: {
        id: job.id,
        filename: job.filename,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get job status' 
    });
  }
}); 

/**
 * @swagger
 * /api/ocr/history:
 *   get:
 *     summary: Get OCR history
 *     tags: [OCR]
 *     description: Retrieve completed OCR jobs history for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OCR history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Job ID
 *                       filename:
 *                         type: string
 *                         description: Original filename
 *                       status:
 *                         type: string
 *                         enum: [completed, failed]
 *                       result:
 *                         type: string
 *                         description: OCR result text
 *                       error:
 *                         type: string
 *                         description: Error message if failed
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                       userEmail:
 *                         type: string
 *                         description: User email (admin only)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to get history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get OCR history (protected route)
router.get('/history', authMiddleware, ocrController.getHistory); 
router.get('/history/:id', authMiddleware, ocrController.getHistoryItem); 








module.exports = router;