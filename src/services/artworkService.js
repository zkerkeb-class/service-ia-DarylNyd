const axios = require('axios');

const DB_SERVICE_URL = 'http://localhost:5001/api';

class ArtworkService {
    // Store analysis results in the database
    static async saveAnalysis(artworkData, analysisResults) {
        try {
            // First, create or update the artwork
            const artworkPayload = {
                userId: artworkData.userId || 'anonymous', // You'll want to implement proper user management
                title: artworkData.title || 'Untitled Artwork',
                imageUrl: artworkData.imageUrl,
                description: artworkData.description || '',
            };

            // Create artwork if it doesn't exist
            const artworkResponse = await axios.post(`${DB_SERVICE_URL}/artworks`, artworkPayload);
            const artworkId = artworkResponse.data._id;

            // Add the analysis to the artwork
            const analysisPayload = {
                analysis: {
                    type: artworkData.analysisType || 'general',
                    results: {
                        technicalQuality: analysisResults.technicalAssessment,
                        strengths: analysisResults.strengths,
                        areasForImprovement: analysisResults.improvements,
                        suggestions: analysisResults.suggestions,
                        composition: analysisResults.composition,
                        colorTheory: analysisResults.colorTheory,
                        styleContext: analysisResults.styleAndContext
                    },
                    learningResources: analysisResults.learning_resources
                }
            };

            // Update the artwork with the new analysis
            await axios.patch(`${DB_SERVICE_URL}/artworks/${artworkId}/analysis`, analysisPayload);

            return artworkId;
        } catch (error) {
            console.error('Error saving analysis:', error);
            throw new Error('Failed to save analysis results');
        }
    }

    // Fetch previous analyses for an artwork
    static async getPreviousAnalyses(artworkId) {
        try {
            const response = await axios.get(`${DB_SERVICE_URL}/artworks/${artworkId}`);
            return response.data.analyses;
        } catch (error) {
            console.error('Error fetching previous analyses:', error);
            return [];
        }
    }

    // Get all artworks for a user
    static async getUserArtworks(userId) {
        try {
            const response = await axios.get(`${DB_SERVICE_URL}/artworks/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user artworks:', error);
            return [];
        }
    }
}

module.exports = ArtworkService; 