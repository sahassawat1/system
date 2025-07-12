// backend-nodejs/config/multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the 'uploads' directory exists (optional, if you want to save files temporarily)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memoryStorage to get file buffer directly for Gemini API
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        // Define allowed MIME types for image and PDF
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'), false); // Reject the file
        }
    }
});

module.exports = upload;