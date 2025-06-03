const axios = require("axios");
const fs = require("fs");

exports.processImage = async (imagePathOrUrl) => {
  // Example using OpenAI's API
  const imageData = fs.existsSync(imagePathOrUrl)
    ? fs.readFileSync(imagePathOrUrl, { encoding: "base64" })
    : imagePathOrUrl; // If it's a URL

  const prompt =
    "Analyze this image. What kind of art is it? What advice would you give to improve it? Recommend some resources.";

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imagePathOrUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
};
