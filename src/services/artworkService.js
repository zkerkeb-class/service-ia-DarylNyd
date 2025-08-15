const axios = require('axios');

const BDD_SERVICE_URL = process.env.BDD_SERVICE_URL || 'http://localhost:5001/api';

const axiosInstance = axios.create({
    baseURL: BDD_SERVICE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

class ArtworkService {
    // Save analysis results to BDD service
    static async saveAnalysis(artworkData, analysisResults) {
        try {
            let artworkId = null;

            // Create artwork in BDD service
            if (artworkData.userId) {
                const artworkResponse = await axiosInstance.post('/artworks', {
                    userId: artworkData.userId,
                    title: artworkData.title,
                    description: artworkData.description,
                    imageUrl: artworkData.imageUrl,
                    metadata: {
                        size: artworkData.metadata?.size || 'Unknown',
                        medium: artworkData.metadata?.medium || 'Digital',
                        style: artworkData.metadata?.style || 'Unknown'
                    }
                });

                artworkId = artworkResponse.data._id;
            } else {
                // No userId provided, skip database save
                return { artworkId: null, analysisId: null };
            }

            // Create separate analysis record
            const analysisData = {
                artworkId: artworkId,
                userId: artworkData.userId,
                filename: artworkData.filename || 'unknown',
                analysisType: artworkData.analysisType,
                modelUsed: 'gpt-4o',
                fileSize: artworkData.fileSize,
                contentType: artworkData.contentType,
                imageUrl: artworkData.imageUrl,
                analysis: analysisResults.technicalQuality,
                suggestions: analysisResults.suggestions || [],
                learningResources: analysisResults.learningResources || [],
                results: {
                    technicalQuality: analysisResults.technicalQuality || '',
                    strengths: analysisResults.strengths || '',
                    areasForImprovement: analysisResults.areasForImprovement || '',
                    composition: analysisResults.composition || '',
                    colorTheory: analysisResults.colorTheory || '',
                    styleContext: analysisResults.styleContext || ''
                }
            };

            const analysisResponse = await axiosInstance.post('/analyses', analysisData);
            const analysisId = analysisResponse.data._id;

            return {
                artworkId: artworkId,
                analysisId: analysisId
            };
        } catch (error) {
            console.error('Error saving analysis to BDD service:', error);
            if (error.response) {
                console.error('BDD Service response:', error.response.data);
                throw new Error(`Failed to save analysis: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Failed to save analysis: ${error.message}`);
        }
    }

    // Get previous analyses for an artwork
    static async getPreviousAnalyses(artworkId) {
        try {
            const response = await axiosInstance.get(`/analyses/artwork/${artworkId}`);
            return response.data.analyses || [];
        } catch (error) {
            console.error('Error fetching previous analyses:', error);
            return [];
        }
    }

    // Get all artworks for a user
    static async getUserArtworks(userId) {
        try {
            const response = await axiosInstance.get(`/artworks/user/${userId}`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching user artworks:', error);
            return [];
        }
    }

    // Get analysis by ID
    static async getAnalysis(analysisId) {
        try {
            const response = await axiosInstance.get(`/analyses/${analysisId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching analysis:', error);
            throw new Error('Analysis not found');
        }
    }

    // Get recent analyses for a user
    static async getRecentAnalyses(userId, limit = 10) {
        try {
            const response = await axiosInstance.get(`/analyses/user/${userId}?limit=${limit}`);
            return response.data.analyses || [];
        } catch (error) {
            console.error('Error fetching recent analyses:', error);
            return [];
        }
    }
}

module.exports = ArtworkService; 