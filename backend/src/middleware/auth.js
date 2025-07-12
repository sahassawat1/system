// backend-nodejs/middleware/auth.js
const admin = require('../config/firebaseAdmin'); // Import Firebase Admin SDK
const { sql } = require('../db'); // Import DB connection

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Check if user exists in database and get role
        const request = new sql.Request();
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
        }
        
        // Add user info to request
        req.user = {
            uid: decodedToken.uid,
            firebase_uid: decodedToken.uid, // Add this for compatibility
            email: decodedToken.email,
            role: userInDb.recordset[0].role || 'user', // Get role from database
            id: userInDb.recordset[0].id,
            username: userInDb.recordset[0].username
        };
        
        // Optionally update last_login_at
        await request.input('updateUserId', sql.Int, req.user.id)
                     .query('UPDATE Users SET last_login_at = GETDATE() WHERE id = @updateUserId');

        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

module.exports = authMiddleware;