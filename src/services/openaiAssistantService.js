const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeArtWithAssistant({
  imageUrl = null,
  textPrompt = "",
  language = "en",
}) {
  try {
    const thread = await client.beta.threads.create();

    // Compose the instruction
    let fullPrompt = `You are an AI art assistant. Analyze this ${
      imageUrl ? "image" : "prompt"
    }. Detect the type of artwork (sketch, painting, 3D, digital illustration, etc.). Give structured JSON output with: artworkType, strengths, weaknesses, 2–3 improvement tips, and at least 1 YouTube or book reference. Reply in language: ${language} (ISO 639-1).`;

    // If user added a text prompt, include it
    if (textPrompt && textPrompt.trim() !== "") {
      fullPrompt += ` User says: "${textPrompt}". Use this as context for your analysis.`;
    }

    const content = [{ type: "text", text: fullPrompt }];

    if (imageUrl) {
      content.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    // Send the message to the thread
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content,
    });

    // Start the assistant run
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Wait until the run completes
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== "completed") {
      await new Promise((res) => setTimeout(res, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);

      if (runStatus.status === "failed") {
        throw new Error(
          "Assistant run failed: " + JSON.stringify(runStatus.last_error)
        );
      }
    }

    // Retrieve the message
    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant"
    );

    if (!assistantMessage) {
      throw new Error("No assistant message found");
    }

    return {
      message: assistantMessage.content[0].text.value,
      tokens: runStatus.usage?.total_tokens,
      threadId: thread.id,
      runId: run.id,
    };
  } catch (err) {
    console.error("Error in analyzeArtWithAssistant:", err);
    throw err;
  }
}

module.exports = {
  analyzeArtWithAssistant,
};
