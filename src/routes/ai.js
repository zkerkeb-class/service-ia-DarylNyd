const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyzeImage } = require('../services/openaiService');
const ArtworkService = require('../services/artworkService');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const analysisType = req.body.analysis_type || 'general';
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // Get AI analysis
        const analysisResults = await analyzeImage(req.file.path, analysisType);

        // Prepare artwork data
        const artworkData = {
            userId: req.body.userId || 'anonymous',
            title: req.body.title || 'Untitled Artwork',
            imageUrl: imageUrl,
            description: req.body.description || '',
            analysisType: analysisType
        };

        // Save analysis results to database
        const artworkId = await ArtworkService.saveAnalysis(artworkData, analysisResults);

        // Get previous analyses for this artwork
        const previousAnalyses = await ArtworkService.getPreviousAnalyses(artworkId);

        // Return combined response
        res.json({
            ...analysisResults,
            artworkId,
            previousAnalyses,
            imageUrl
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            message: 'Failed to analyze image',
            error: error.message
        });
    }
});

// Get previous analyses for an artwork
router.get('/artwork/:artworkId/analyses', async (req, res) => {
    try {
        const analyses = await ArtworkService.getPreviousAnalyses(req.params.artworkId);
        res.json(analyses);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch analyses',
            error: error.message
        });
    }
});

// Get all artworks for a user
router.get('/user/:userId/artworks', async (req, res) => {
    try {
        const artworks = await ArtworkService.getUserArtworks(req.params.userId);
        res.json(artworks);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch user artworks',
            error: error.message
        });
    }
});

module.exports = router; 