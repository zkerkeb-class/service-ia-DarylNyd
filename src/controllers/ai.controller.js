const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { extractSuggestions, extractLearningResources } = require('../utils/analysis.utils');

// Simple file logging function
const logToFile = (message) => {
    const logPath = path.join(__dirname, '../../debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

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

        // Save image to permanent storage FIRST
        const imageFileName = `${Date.now()}-${req.file.originalname}`;
        const uploadsDir = path.join(__dirname, '../../temp/uploads');
        const imagePath = path.join(uploadsDir, imageFileName);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Copy file to permanent location FIRST
        try {
            fs.copyFileSync(req.file.path, imagePath);
        } catch (copyError) {
            console.error('Error copying file:', copyError);
            throw new Error(`Failed to save image: ${copyError.message}`);
        }
        
        // Now clean up the temporary uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        // Process image from the PERMANENT file path (not the temp one)
        const processedImage = await processImage(imagePath);
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

        const analysis = response.choices[0].message.content;
        const suggestions = extractSuggestions(analysis);
        const learningResources = extractLearningResources(analysis, analysisType);

        // Create analysis data object
        const analysisData = {
            filename: req.file.originalname,
            analysis_type: analysisType,
            analysis: analysis,
            suggestions: suggestions,
            learning_resources: learningResources,
            model_used: "gpt-4o",
            file_size: req.file.size,
            content_type: req.file.mimetype,
            user_id: req.user ? req.user._id : null
        };

        // Save to BDD service for better integration
        const artworkData = {
            userId: req.user ? req.user._id : null, // Use null instead of 'anonymous' for unauthenticated users
            title: req.body.title || 'Untitled Artwork',
            description: req.body.description || '',
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${imageFileName}`,
            analysisType: analysisType,
            filename: req.file.originalname,
            fileSize: req.file.size,
            contentType: req.file.mimetype,
            metadata: {
                size: req.body.size || 'Unknown',
                medium: req.body.medium || 'Digital',
                style: req.body.style || 'Unknown'
            }
        };

        const analysisResults = {
            technicalQuality: analysis,
            strengths: '',
            areasForImprovement: '',
            suggestions: suggestions,
            composition: '',
            colorTheory: '',
            styleContext: '',
            learningResources: learningResources
        };

        // Save to BDD service (only if user is authenticated)
        const ArtworkService = require('../services/artworkService');
        let result = { artworkId: null, analysisId: null };
        
        logToFile('=== AI Controller Debug ===');
        logToFile(`- req.user: ${JSON.stringify(req.user)}`);
        logToFile(`- req.user._id: ${req.user?._id}`);
        logToFile(`- req.headers.authorization present: ${!!req.headers.authorization}`);
        
        if (req.user && req.user._id) {
            logToFile('- User is authenticated, attempting to save to BDD service');
            try {
                result = await ArtworkService.saveAnalysis(artworkData, analysisResults);
                logToFile('- Analysis saved to BDD service successfully');
                logToFile(`- Result: ${JSON.stringify(result)}`);
            } catch (saveError) {
                logToFile(`Error saving to BDD service: ${saveError.message}`);
                logToFile(`- Error details: ${saveError.message}`);
                // Don't throw error, just log it and continue with temporary analysis
                logToFile('- Continuing with temporary analysis (no database save)');
            }
        } else {
            logToFile('- No authenticated user, creating temporary analysis');
            logToFile(`- req.user: ${JSON.stringify(req.user)}`);
            logToFile(`- req.user._id: ${req.user?._id}`);
        }

        res.json({
            id: result.analysisId || `temp-${Date.now()}`, // Use temp ID if no database save
            artworkId: result.artworkId || `temp-artwork-${Date.now()}`,
            analysisId: result.analysisId || `temp-analysis-${Date.now()}`,
            filename: analysisData.filename,
            analysis_type: analysisData.analysis_type,
            analysis: analysisData.analysis,
            suggestions: analysisData.suggestions,
            learning_resources: analysisData.learning_resources,
            timestamp: new Date(),
            model_used: analysisData.model_used,
            imageUrl: artworkData.imageUrl,
            isTemporary: !result.analysisId // Flag to indicate if this is a temporary analysis
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

module.exports = {
    analyzeArtwork
}; 