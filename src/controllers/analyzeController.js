const {
  analyzeArtWithAssistant,
} = require("../services/openaiAssistantService");

exports.analyzeController = async (req, res) => {
  try {
    const { imageUrl, textPrompt, language = "en" } = req.body;

    if (!imageUrl && (!textPrompt || textPrompt.trim() === "")) {
      return res
        .status(400)
        .json({ error: "Please provide an imageUrl, textPrompt, or both." });
    }

    const result = await analyzeArtWithAssistant({
      imageUrl,
      textPrompt,
      language,
    });

    res.json(result);
  } catch (err) {
    console.error("AI service error:", err.message);
    res.status(500).json({ error: "AI analysis failed." });
  }
};
