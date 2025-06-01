/**
 * Extract actionable suggestions from the analysis text
 * @param {string} analysisText - The full analysis text
 * @returns {string[]} Array of suggestions
 */
function extractSuggestions(analysisText) {
    const suggestions = [];
    const lines = analysisText.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && 
            /suggest|recommend|try|consider|improve|practice/i.test(trimmedLine) &&
            !trimmedLine.startsWith('#')) {
            suggestions.push(trimmedLine.replace(/^[-*•]/, '').trim());
        }
    }

    // If no specific suggestions found, extract key improvement points
    if (suggestions.length === 0) {
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && 
                /improvement|better|enhance/i.test(trimmedLine)) {
                suggestions.push(trimmedLine.replace(/^[-*•]/, '').trim());
            }
        }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Extract learning resources based on analysis type and content
 * @param {string} analysisText - The full analysis text
 * @param {string} analysisType - Type of analysis performed
 * @returns {Object[]} Array of learning resources
 */
function extractLearningResources(analysisText, analysisType) {
    const baseResources = {
        general: [
            {
                type: "youtube",
                title: "Fundamental Art Skills Every Artist Should Know",
                url: "https://www.youtube.com/results?search_query=fundamental+art+skills+beginner",
                description: "Learn basic drawing, composition, and color theory fundamentals",
                difficulty: "beginner"
            },
            {
                type: "book",
                title: "Drawing on the Right Side of the Brain by Betty Edwards",
                description: "Classic guide to developing drawing skills and artistic perception",
                difficulty: "beginner"
            }
        ],
        technique: [
            {
                type: "youtube",
                title: "Digital Art Brush Techniques",
                url: "https://www.youtube.com/results?search_query=digital+art+brush+techniques",
                description: "Master different brush strokes and digital painting techniques",
                difficulty: "intermediate"
            }
        ],
        composition: [
            {
                type: "youtube",
                title: "Art Composition Rules and Guidelines",
                url: "https://www.youtube.com/results?search_query=art+composition+rule+of+thirds",
                description: "Understanding visual balance, focal points, and composition principles",
                difficulty: "intermediate"
            }
        ],
        color: [
            {
                type: "youtube",
                title: "Color Theory for Artists",
                url: "https://www.youtube.com/results?search_query=color+theory+artists+tutorial",
                description: "Learn color harmony, temperature, and mixing techniques",
                difficulty: "beginner"
            }
        ]
    };

    let resources = [];

    // Add type-specific resources
    if (baseResources[analysisType]) {
        resources = [...baseResources[analysisType]];
    }

    // Add general resources if needed
    if (resources.length < 3 && analysisType !== 'general') {
        resources = [...resources, ...baseResources.general];
    }

    // Add specific technique resources based on analysis content
    const analysisLower = analysisText.toLowerCase();

    if (/shading|shadow|light/i.test(analysisLower)) {
        resources.push({
            type: "youtube",
            title: "Light and Shadow in Art",
            url: "https://www.youtube.com/results?search_query=art+light+shadow+tutorial",
            description: "Master lighting techniques and shadow rendering",
            difficulty: "intermediate"
        });
    }

    if (/perspective|depth|dimension/i.test(analysisLower)) {
        resources.push({
            type: "tutorial",
            title: "Perspective Drawing Tutorial",
            url: "https://www.drawabox.com/",
            description: "Learn one-point, two-point, and three-point perspective",
            difficulty: "intermediate"
        });
    }

    if (/proportion|anatomy|figure/i.test(analysisLower)) {
        resources.push({
            type: "youtube",
            title: "Figure Drawing and Anatomy",
            url: "https://www.youtube.com/results?search_query=figure+drawing+anatomy+tutorial",
            description: "Study human anatomy and proportional drawing",
            difficulty: "advanced"
        });
    }

    return resources.slice(0, 4); // Return top 4 learning resources
}

module.exports = {
    extractSuggestions,
    extractLearningResources
}; 