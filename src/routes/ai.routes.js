const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
    analyzeArtwork,
    getAnalysis,
    getRecentAnalyses,
    deleteAnalysis
} = require('../controllers/ai.controller');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../temp/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Double-check directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Add timestamp and random string to prevent filename collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Routes
router.post('/analyze', upload.single('image'), analyzeArtwork);
router.get('/analysis/:id', getAnalysis);
router.get('/analyses', getRecentAnalyses);
router.delete('/analysis/:id', deleteAnalysis);

module.exports = router; 