// backend-nodejs/routes/authRoutes.js
const express = require('express');
const admin = require('../config/firebaseAdmin');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify Firebase ID token
 *     tags: [Authentication]
 *     description: Verify Firebase ID token and create/retrieve user profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase ID token
 *                 example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Token is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Verify Firebase token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('Token verification request received');
    console.log('Token length:', token ? token.length : 'No token');
    
    if (!token) {
      console.log('No token provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }

    console.log('Verifying Firebase ID token...');
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Firebase token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email
    });
    
    // Check if user exists in database and get role
    const { sql } = require('../db');
    const request = new sql.Request();
    
    console.log('Checking user in database...');
    let userInDb = await request.input('firebaseUid', sql.NVarChar, decodedToken.uid)
                                .query('SELECT id, firebase_uid, email, username, role FROM Users WHERE firebase_uid = @firebaseUid');

    if (userInDb.recordset.length === 0) {
      // If user doesn't exist in local DB, create a new entry
      console.log(`New user detected: ${decodedToken.email} (Firebase UID: ${decodedToken.uid}). Creating local profile.`);
      const insertResult = await request.input('newFirebaseUid', sql.NVarChar, decodedToken.uid)
                                      .input('newEmail', sql.NVarChar, decodedToken.email)
                                      .input('newUsername', sql.NVarChar, decodedToken.email.split('@')[0])
                                      .input('newRole', sql.NVarChar, 'user') // Default role
                                      .query(`INSERT INTO Users (firebase_uid, email, username, role)
                                              OUTPUT INSERTED.id, INSERTED.firebase_uid, INSERTED.email, INSERTED.username, INSERTED.role
                                              VALUES (@newFirebaseUid, @newEmail, @newUsername, @newRole)`);
      
      userInDb = insertResult;
      console.log('New user created in database');
    } else {
      console.log('User found in database');
    }
    
    const role = userInDb.recordset[0].role || 'user';
    
    console.log('User verification completed:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: role,
      dbId: userInDb.recordset[0].id
    });
    
    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: role,
        id: userInDb.recordset[0].id,
        username: userInDb.recordset[0].username
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     description: Retrieve current user profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get current user info (protected route)
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * @swagger
 * /api/auth/set-role:
 *   post:
 *     summary: Set user role (Admin only)
 *     tags: [Authentication]
 *     description: Update user role - requires admin privileges
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - role
 *             properties:
 *               uid:
 *                 type: string
 *                 description: Firebase UID of the user
 *                 example: "user123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: New role for the user
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User role updated successfully"
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update user role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Set user role (admin only)
router.post('/set-role', authMiddleware, async (req, res) => {
  try {
    const { uid, role } = req.body;
    
    // Check if current user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    // Update role in database
    const { sql } = require('../db');
    const request = new sql.Request();
    await request.input('firebaseUid', sql.NVarChar, uid)
                 .input('newRole', sql.NVarChar, role)
                 .query('UPDATE Users SET role = @newRole WHERE firebase_uid = @firebaseUid');
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Set role error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user role' 
    });
  }
});

// User management routes (admin only)
router.get('/user', authMiddleware, userController.getAuthUser);
router.get('/users', authMiddleware, userController.getAllUsers);
router.get('/users/stats', authMiddleware, userController.getUserStats);
router.get('/users/:uid', authMiddleware, userController.getUserByUid);
router.put('/users/:uid/role', authMiddleware, userController.updateUserRole);
router.put('/users/:uid/status', authMiddleware, userController.toggleUserStatus);
router.delete('/users/:uid', authMiddleware, userController.deleteUser);

module.exports = router;