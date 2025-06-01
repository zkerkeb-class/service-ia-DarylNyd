const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

exports.analyzeWithOpenAI = async (image) => {
  let image_url = image;

  // If it's a local file, you'll need to upload it somewhere or encode it
  if (fs.existsSync(image)) {
    // Option 1: Upload to Cloudinary or another image host
    // Option 2: Use base64 (only works in some tools — not with GPT-4 Vision)

    throw new Error(
      "Local image processing requires upload. Please use an image URL for now."
    );
  }

  const prompt = `
You are an AI artist advisor. Given the image, determine:

1. The type of artwork (e.g., pencil sketch, digital painting, watercolor, etc.)
2. Identify the strong and weak points.
3. Give 1–3 improvement tips.
4. Recommend 1–2 resources (YouTube videos, books, courses) to help.

Be concise but helpful.
`;

  const headers = {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const payload = {
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: image_url },
          },
        ],
      },
    ],
    max_tokens: 700,
  };

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    payload,
    { headers }
  );

  return {
    message: response.data.choices[0].message.content,
  };
};
