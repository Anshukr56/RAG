const axios = require("axios");

async function askGemini(question) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("DEBUG - API Key length:", apiKey?.length);
    console.log("DEBUG - API Key starts with:", apiKey?.substring(0, 10));

    if (!apiKey) {
      throw new Error("API key not found in environment");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            {
              text: question,
            },
          ],
        },
      ],
    });

    const text = response.data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error(
      "Gemini Error Details:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Gemini API error: ${error.response?.data?.error?.message || error.message}`,
    );
  }
}

module.exports = { askGemini };
