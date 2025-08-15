const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeArtwork } = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Simple file logging function
const logToFile = (message) => {
    const logPath = path.join(__dirname, '../../debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../temp/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'temp/uploads/');
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const randomId = Math.floor(Math.random() * 1000000000);
            const extension = path.extname(file.originalname);
            cb(null, `${timestamp}-${randomId}${extension}`);
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Simple file upload endpoint
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Invalid file type. Supported formats: JPEG, PNG, GIF, WebP, BMP' 
            });
        }

        // Save image to permanent storage
        const imageFileName = `${Date.now()}-${req.file.originalname}`;
        const imagePath = path.join(uploadDir, imageFileName);

        try {
            fs.copyFileSync(req.file.path, imagePath);
            fs.unlinkSync(req.file.path); // Clean up temp file
        } catch (copyError) {
            console.error('Error copying file:', copyError);
            throw new Error(`Failed to save image: ${copyError.message}`);
        }

        res.json({
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${imageFileName}`
        });
    } catch (error) {
        // Clean up the uploaded file in case of error
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            error: `Failed to upload image: ${error.message}` 
        });
    }
});

// Apply auth middleware to the analyze route
router.post('/analyze', authMiddleware, upload.single('image'), analyzeArtwork);

module.exports = router; 