const openai = require('../config/openai.config');
const fs = require('fs');
const path = require('path');

class AIService {
  static getSystemMessage() {
    return `You are an expert art instructor and critic specializing in digital art, sketches, paintings, and realism. 

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
  }

  static getAnalysisPrompt(analysisType = 'general') {
    const prompts = {
      general: "Provide a comprehensive analysis of this artwork. Cover technical execution, composition, color usage, style, and give specific suggestions for improvement. Be encouraging but constructive.",
      technique: "Focus specifically on the technical execution of this artwork. Analyze brushwork, line quality, rendering techniques, and provide specific technical suggestions for improvement.",
      composition: "Analyze the composition of this artwork. Evaluate balance, focal points, visual flow, use of space, and suggest specific compositional improvements.",
      color: "Focus on the color usage in this artwork. Evaluate color harmony, contrast, temperature, mood, and suggest specific improvements in color theory application.",
      style: "Analyze the artistic style and provide guidance on developing and refining this particular style. Suggest artists to study and techniques to practice."
    };

    return prompts[analysisType] || prompts.general;
  }

  static validateArtStyle(style) {
    const validStyles = [
      // Traditional Styles
      'oil painting', 'watercolor', 'acrylic', 'pastel', 'charcoal', 'pencil', 'ink',
      // Digital Styles
      'digital art', 'digital painting', 'concept art', 'illustration', 'pixel art',
      // Art Movements
      'impressionism', 'expressionism', 'realism', 'surrealism', 'abstract', 'minimalism',
      'pop art', 'contemporary', 'modern',
      // Techniques
      'sketch', 'drawing', 'portrait', 'landscape', 'still life', 'figure drawing',
      // Mixed and Other
      'mixed media', 'experimental', 'traditional', 'stylized'
    ];

    // Convert to lowercase for comparison
    const normalizedStyle = style.toLowerCase();
    
    // Check for exact matches
    if (validStyles.includes(normalizedStyle)) {
      return normalizedStyle;
    }

    // Check for partial matches
    for (const validStyle of validStyles) {
      if (normalizedStyle.includes(validStyle)) {
        return validStyle;
      }
    }

    // Check for compound styles (e.g., "digital landscape")
    const styleWords = normalizedStyle.split(' ');
    for (const word of styleWords) {
      if (validStyles.includes(word)) {
        return word;
      }
    }

    return 'mixed media'; // Default fallback
  }

  static extractArtStyleFromText(text) {
    // Enhanced pattern matching for style identification
    const stylePatterns = [
      // Direct identification patterns
      /(appears to be|identified as|style is|primarily|mainly) ([^,.]+)/i,
      /this (is|looks like|seems to be) (?:a|an) ([^,.]+)/i,
      /the (artwork|piece|work) (?:is|uses|employs) ([^,.]+)/i,
      
      // Medium-focused patterns
      /(?:created|executed|done) (?:in|with|using) ([^,.]+)/i,
      /(?:a|an) ([^,.]+) (?:piece|artwork|drawing|painting)/i,
      
      // Style-specific patterns
      /(?:follows|exemplifies|represents) the ([^,.]+) style/i,
      /characteristics of ([^,.]+) art/i,
      
      // Technical approach patterns
      /technique(?:s)? (?:typical of|associated with) ([^,.]+)/i,
      /approach(?:es)? commonly found in ([^,.]+)/i
    ];

    // Try each pattern until we find a match
    for (const pattern of stylePatterns) {
      const match = text.match(pattern);
      if (match) {
        // The style will be in the last capture group
        const extractedStyle = match[match.length - 1].trim();
        return this.validateArtStyle(extractedStyle);
      }
    }

    // Fallback: Look for known style keywords
    const fallbackKeywords = text.toLowerCase().match(/digital|traditional|painting|drawing|sketch|art|illustration|concept|realistic|abstract/g);
    if (fallbackKeywords && fallbackKeywords.length > 0) {
      return this.validateArtStyle(fallbackKeywords[0]);
    }

    return 'mixed media';
  }

  static async analyzeImage(imageUrl, analysisType = 'general') {
    try {
      console.log('Starting image analysis:', {
        imageUrl,
        analysisType,
        hasOpenAIConfig: !!openai.apiKey
      });

      if (!openai.apiKey) {
        throw new Error('OpenAI API key is not configured properly');
      }

      // Extract the file path from the URL
      const fileName = imageUrl.split('/uploads/').pop();
      const filePath = path.join(__dirname, '../../temp/uploads', fileName);

      // Read the image file and convert to base64
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getSystemMessage()
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: this.getAnalysisPrompt(analysisType)
              },
              {
                type: "image_url",
                image_url: `data:image/jpeg;base64,${base64Image}`
              },
            ],
          },
        ],
        max_tokens: 3000,
      });

      console.log('Successfully received OpenAI response');
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error in analyzeImage:', {
        message: error.message,
        code: error.code,
        type: error.type,
        stack: error.stack
      });

      if (error.response) {
        console.error('OpenAI API Error:', {
          status: error.response.status,
          data: error.response.data
        });
      }

      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  static async generateLearningResources(artStyle, focusAreas) {
    try {
      // Validate art style before generating resources
      const validatedStyle = this.validateArtStyle(artStyle);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert art educator specializing in providing detailed, practical learning resources. Focus on specific, actionable recommendations including YouTube tutorials, books, online courses, and exercises."
          },
          {
            role: "user",
            content: `Please provide detailed learning resources for ${validatedStyle} focusing on: ${focusAreas.join(', ')}. Include:
1. Specific YouTube channels and videos (with descriptions)
2. Book recommendations (with brief reviews)
3. Online courses or workshops
4. Practice exercises and techniques
5. Notable artists to study in this style/technique`
          }
        ],
        max_tokens: 2000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating resources:', error);
      throw new Error('Failed to generate learning resources');
    }
  }

  static parseAIFeedback(feedback) {
    const sections = {
      technical: /Technical Assessment[:\s]+(.*?)(?=\*\*|$)/is,
      composition: /Compositional Analysis[:\s]+(.*?)(?=\*\*|$)/is,
      color: /Color Theory[:\s]+(.*?)(?=\*\*|$)/is,
      style: /Style & Context[:\s]+(.*?)(?=\*\*|$)/is,
      improvements: /Specific Improvements[:\s]+(.*?)(?=\*\*|$)/is,
      resources: /Learning Resources[:\s]+(.*?)(?=\*\*|$)/is
    };

    const parsed = {};
    
    // Extract each section
    for (const [key, regex] of Object.entries(sections)) {
      const match = feedback.match(regex);
      parsed[key] = match ? match[1].trim() : '';
    }

    // Extract improvements as an array
    const improvementsList = parsed.improvements
      .split(/\d+\./)
      .filter(item => item.trim())
      .map(item => item.trim());

    // Extract and validate art style using enhanced methods
    const artStyle = this.extractArtStyleFromText(parsed.style);

    return {
      analysis: feedback,
      style: artStyle,
      technicalAssessment: parsed.technical,
      composition: parsed.composition,
      colorTheory: parsed.color,
      styleAndContext: parsed.style,
      improvements: improvementsList,
      learningResources: parsed.resources
    };
  }
}

module.exports = AIService; 