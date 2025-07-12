// backend-nodejs/controllers/userController.js
// bcryptjs และ jsonwebtoken ไม่จำเป็นต้องใช้ใน Controller นี้แล้ว ถ้า Auth ผ่าน Firebase ทั้งหมด
const { sql } = require('../db');
const admin = require('../config/firebaseAdmin');

// @route   GET /api/auth/user
// @desc    Get authenticated user data (from local DB, linked by Firebase UID)
// @access  Private (requires Firebase ID token)
const getAuthUser = async (req, res) => {
    try {
        // User info is already available from auth middleware
        const { uid, email, role, id, username } = req.user;
        
        // You can add additional user data from your database here
        // For now, we'll return the basic user info
        const userProfile = {
            uid,
            email,
            role,
            id,
            username,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        res.json({
            success: true,
            user: userProfile
        });
    } catch (error) {
        console.error('Get auth user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        // Check if current user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Get all users from database
        const request = new sql.Request();
        const result = await request.query(`
            SELECT id, firebase_uid, email, username, role, created_at, last_login_at, disabled
            FROM Users
            ORDER BY created_at DESC
        `);
        
        const users = result.recordset.map(user => ({
            uid: user.firebase_uid,
            email: user.email,
            displayName: user.username,
            role: user.role || 'user',
            createdAt: user.created_at,
            lastSignIn: user.last_login_at,
            disabled: user.disabled
        }));

        res.json({
            success: true,
            users,
            total: users.length
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
};

// Get user by UID (admin only)
const getUserByUid = async (req, res) => {
    try {
        const { uid } = req.params;
        
        // Check if current user is admin or requesting their own profile
        if (req.user.role !== 'admin' && req.user.uid !== uid) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get user from database
        const request = new sql.Request();
        const result = await request.input('firebaseUid', sql.NVarChar, uid)
                                   .query(`
                                     SELECT id, firebase_uid, email, username, role, created_at, last_login_at
                                     FROM Users 
                                     WHERE firebase_uid = @firebaseUid
                                   `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = result.recordset[0];
        const userData = {
            uid: user.firebase_uid,
            email: user.email,
            displayName: user.username,
            role: user.role || 'user',
            createdAt: user.created_at,
            lastSignIn: user.last_login_at
        };

        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        console.error('Get user by UID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user'
        });
    }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
    try {
        const { uid } = req.params;
        const { role } = req.body;
        
        // Check if current user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Validate role
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be "user" or "admin"'
            });
        }

        // Update role in database
        const request = new sql.Request();
        await request.input('firebaseUid', sql.NVarChar, uid)
                     .input('newRole', sql.NVarChar, role)
                     .query('UPDATE Users SET role = @newRole WHERE firebase_uid = @firebaseUid');
        
        res.json({
            success: true,
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
};

// Disable/Enable user (admin only)
const toggleUserStatus = async (req, res) => {
    try {
        const { uid } = req.params;
        const { disabled } = req.body;
        
        // Check if current user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Prevent admin from disabling themselves
        if (req.user.uid === uid) {
            return res.status(400).json({
                success: false,
                message: 'Cannot disable your own account'
            });
        }

        // Update user disabled status in database
        const request = new sql.Request();
        await request.input('firebaseUid', sql.NVarChar, uid)
                     .input('disabled', sql.Bit, disabled ? 1 : 0)
                     .query('UPDATE Users SET disabled = @disabled WHERE firebase_uid = @firebaseUid');
        
        res.json({
            success: true,
            message: `User ${disabled ? 'disabled' : 'enabled'} successfully`
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;
        
        // Check if current user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Prevent admin from deleting themselves
        if (req.user.uid === uid) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Delete user from database
        const request = new sql.Request();
        await request.input('firebaseUid', sql.NVarChar, uid)
                     .query('DELETE FROM Users WHERE firebase_uid = @firebaseUid');
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

// Get user statistics (admin only)
const getUserStats = async (req, res) => {
    try {
        // Check if current user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Get user statistics from database
        const request = new sql.Request();
        const result = await request.query(`
            SELECT 
                COUNT(*) as totalUsers,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as adminUsers,
                SUM(CASE WHEN disabled = 1 THEN 1 ELSE 0 END) as disabledUsers,
                SUM(CASE WHEN disabled = 0 THEN 1 ELSE 0 END) as activeUsers
            FROM Users
        `);
        
        const stats = {
            totalUsers: result.recordset[0].totalUsers,
            activeUsers: result.recordset[0].activeUsers,
            disabledUsers: result.recordset[0].disabledUsers,
            adminUsers: result.recordset[0].adminUsers
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user statistics'
        });
    }
};

module.exports = {
    getAuthUser,
    getAllUsers,
    getUserByUid,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getUserStats
};

