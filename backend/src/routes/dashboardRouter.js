const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard and analytics endpoints
 */

router.get('/summary/:id', authMiddleware, dashboardController.getDashboardSummary);
router.get('/history/:id', authMiddleware, dashboardController.getHistoryItem);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     description: Retrieve system statistics and metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to get statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get dashboard statistics (protected route)
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
    // Mock dashboard statistics
    const stats = {
      totalJobs: 1250,
      completedJobs: 1180,
      failedJobs: 70,
      successRate: 94.4,
      averageProcessingTime: 2.3,
      totalUsers: isAdmin ? 45 : undefined,
      activeUsers: isAdmin ? 23 : undefined,
      revenue: isAdmin ? 12500 : undefined,
      systemUptime: 99.8,
      cpuUsage: 45.2,
      memoryUsage: 62.1,
      storageUsage: 78.5
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get statistics' 
    });
  }
});

/**
 * @swagger
 * /api/dashboard/users:
 *   get:
 *     summary: Get recent users (Admin only)
 *     tags: [Dashboard]
 *     description: Retrieve list of recent users - requires admin privileges
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: User ID
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: User email
 *                       role:
 *                         type: string
 *                         enum: [user, admin]
 *                         description: User role
 *                       status:
 *                         type: string
 *                         enum: [active, inactive]
 *                         description: User status
 *                       lastLogin:
 *                         type: string
 *                         format: date-time
 *                         description: Last login timestamp
 *                       totalJobs:
 *                         type: integer
 *                         description: Total number of jobs
 *                       joinDate:
 *                         type: string
 *                         format: date-time
 *                         description: User registration date
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to get users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get recent users (admin only)
router.get('/users', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    // Mock recent users data
    const users = [
      {
        id: 1,
        email: 'user1@example.com',
        role: 'user',
        status: 'active',
        lastLogin: '2024-01-15T10:30:00Z',
        totalJobs: 25,
        joinDate: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        email: 'user2@example.com',
        role: 'user',
        status: 'active',
        lastLogin: '2024-01-14T15:45:00Z',
        totalJobs: 18,
        joinDate: '2024-01-05T00:00:00Z'
      },
      {
        id: 3,
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        lastLogin: '2024-01-15T09:15:00Z',
        totalJobs: 150,
        joinDate: '2023-12-01T00:00:00Z'
      }
    ];
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get users' 
    });
  }
});

// Get system alerts (admin only)
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    // Mock system alerts
    const alerts = [
      {
        id: 1,
        type: 'warning',
        title: 'High CPU Usage',
        message: 'CPU usage is above 80%',
        timestamp: '2024-01-15T10:00:00Z',
        resolved: false
      },
      {
        id: 2,
        type: 'info',
        title: 'System Update',
        message: 'New OCR engine version available',
        timestamp: '2024-01-15T09:30:00Z',
        resolved: true
      },
      {
        id: 3,
        type: 'error',
        title: 'Storage Warning',
        message: 'Storage usage is at 85%',
        timestamp: '2024-01-15T08:15:00Z',
        resolved: false
      }
    ];
    
    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get alerts' 
    });
  }
});

// Get job monitor (admin only)
router.get('/jobs', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    // Mock job monitor data
    const jobs = [
      {
        id: 'job_1',
        filename: 'document1.pdf',
        user: 'user1@example.com',
        status: 'processing',
        progress: 65,
        startTime: '2024-01-15T10:00:00Z',
        estimatedCompletion: '2024-01-15T10:05:00Z'
      },
      {
        id: 'job_2',
        filename: 'image1.jpg',
        user: 'user2@example.com',
        status: 'pending',
        progress: 0,
        startTime: '2024-01-15T10:02:00Z',
        estimatedCompletion: '2024-01-15T10:07:00Z'
      },
      {
        id: 'job_3',
        filename: 'document2.pdf',
        user: 'user3@example.com',
        status: 'completed',
        progress: 100,
        startTime: '2024-01-15T09:55:00Z',
        completedTime: '2024-01-15T10:00:00Z'
      }
    ];
    
    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get jobs' 
    });
  }
});

module.exports = router;