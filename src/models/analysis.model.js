const mongoose = require('mongoose');

const learningResourceSchema = new mongoose.Schema({
    type: { type: String, required: true }, // "youtube", "book", "tutorial", "technique"
    title: { type: String, required: true },
    url: String,
    description: { type: String, required: true },
    difficulty: { type: String, required: true } // "beginner", "intermediate", "advanced"
});

const analysisSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    analysis_type: { type: String, default: 'general' },
    analysis: { type: String, required: true },
    suggestions: [String],
    learning_resources: [learningResourceSchema],
    timestamp: { type: Date, default: Date.now },
    model_used: String,
    file_size: Number,
    content_type: String,
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Analysis', analysisSchema); 