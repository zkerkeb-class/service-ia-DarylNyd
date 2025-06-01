const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Analysis = require('../models/analysis.model');
const { extractSuggestions, extractLearningResources } = require('../utils/analysis.utils');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_MESSAGE = `You are an expert art instructor and critic specializing in digital art, sketches, paintings, and realism. 

Analyze the artwork and provide comprehensive feedback including:

1. **Technical Assessment**: Evaluate brushwork, line quality, rendering, shading, and technical execution
2. **Compositional Analysis**: Assess balance, focal points, visual flow, rule of thirds, and overall arrangement
3. **Color Theory**: Evaluate color harmony, contrast, saturation, temperature, and mood
4. **Style & Context**: Identify artistic style, influences, and historical context
5. **Specific Improvements**: Provide 3-5 actionable suggestions for improvement
6. **Learning Resources**: Mention specific techniques, exercises, or study areas

Be constructive, encouraging, and specific. Focus on helping the artist grow while acknowledging their strengths.
For digital art: Consider brush choices, layer usage, digital techniques
For sketches: Focus on line confidence, proportion, shading techniques
For paintings: Evaluate color mixing, brush techniques, medium usage
For realism: Assess accuracy, detail work, light and shadow`;

const ANALYSIS_PROMPTS = {
    general: "Provide a comprehensive analysis of this artwork. Cover technical execution, composition, color usage, style, and give specific suggestions for improvement. Be encouraging but constructive.",
    technique: "Focus specifically on the technical execution of this artwork. Analyze brushwork, line quality, rendering techniques, and provide specific technical suggestions for improvement.",
    composition: "Analyze the composition of this artwork. Evaluate balance, focal points, visual flow, use of space, and suggest specific compositional improvements.",
    color: "Focus on the color usage in this artwork. Evaluate color harmony, contrast, temperature, mood, and suggest specific improvements in color theory application.",
    style: "Analyze the artistic style and provide guidance on developing and refining this particular style. Suggest artists to study and techniques to practice."
};

/**
 * Process and resize image for analysis
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function processImage(filePath) {
    try {
        // Read the file from disk
        const imageBuffer = fs.readFileSync(filePath);
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        // Only resize if image is larger than 1024x1024
        if (metadata.width > 1024 || metadata.height > 1024) {
            return await image
                .resize(1024, 1024, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 85 })
                .toBuffer();
        }

        // Convert to JPEG if not already
        if (metadata.format !== 'jpeg') {
            return await image
                .jpeg({ quality: 85 })
                .toBuffer();
        }

        return imageBuffer;
    } catch (error) {
        console.error('Image processing error:', error);
        throw new Error('Failed to process image');
    }
}

/**
 * Analyze artwork using OpenAI's vision model
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function analyzeArtwork(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ 
                error: 'Invalid file type. Supported formats: JPEG, PNG, GIF, WebP, BMP' 
            });
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            return res.status(400).json({ error: 'File size must be less than 10MB' });
        }

        const analysisType = req.body.analysis_type || 'general';
        if (!ANALYSIS_PROMPTS[analysisType]) {
            return res.status(400).json({ error: 'Invalid analysis type' });
        }

        // Process image from the saved file path
        const processedImage = await processImage(req.file.path);
        const base64Image = processedImage.toString('base64');

        // Get analysis from OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_MESSAGE
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: ANALYSIS_PROMPTS[analysisType]
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 3000
        });

        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
        });

        const analysis = response.choices[0].message.content;
        const suggestions = extractSuggestions(analysis);
        const learningResources = extractLearningResources(analysis, analysisType);

        // Create analysis document
        const analysisDoc = new Analysis({
            filename: req.file.originalname,
            analysis_type: analysisType,
            analysis: analysis,
            suggestions: suggestions,
            learning_resources: learningResources,
            model_used: "gpt-4o",
            file_size: req.file.size,
            content_type: req.file.mimetype,
            user_id: req.user ? req.user._id : null
        });

        await analysisDoc.save();

        res.json({
            id: analysisDoc._id,
            filename: analysisDoc.filename,
            analysis_type: analysisDoc.analysis_type,
            analysis: analysisDoc.analysis,
            suggestions: analysisDoc.suggestions,
            learning_resources: analysisDoc.learning_resources,
            timestamp: analysisDoc.timestamp,
            model_used: analysisDoc.model_used
        });

    } catch (error) {
        // Clean up the uploaded file in case of error
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        console.error('Analysis error:', error);
        res.status(500).json({ 
            error: `Failed to analyze image: ${error.message}` 
        });
    }
}

/**
 * Get analysis by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAnalysis(req, res) {
    try {
        const analysis = await Analysis.findById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ 
            error: `Failed to fetch analysis: ${error.message}` 
        });
    }
}

/**
 * Get recent analyses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRecentAnalyses(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const analyses = await Analysis.find()
            .sort({ timestamp: -1 })
            .limit(limit);
        res.json(analyses);
    } catch (error) {
        res.status(500).json({ 
            error: `Failed to fetch analyses: ${error.message}` 
        });
    }
}

/**
 * Delete analysis by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteAnalysis(req, res) {
    try {
        const analysis = await Analysis.findById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        // Check if user owns the analysis
        if (req.user && analysis.user_id && analysis.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this analysis' });
        }

        await analysis.deleteOne();
        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            error: `Failed to delete analysis: ${error.message}` 
        });
    }
}

module.exports = {
    analyzeArtwork,
    getAnalysis,
    getRecentAnalyses,
    deleteAnalysis
}; 