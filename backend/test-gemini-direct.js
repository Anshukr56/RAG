const axios = require("axios");

const apiKey = "AIzaSyD5pEbp-GI7jpkD8vsNNkCEVSV77NPJ9wQ";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

axios
  .post(url, {
    contents: [
      {
        parts: [
          {
            text: "Say hello",
          },
        ],
      },
    ],
  })
  .then((res) => {
    console.log("✅ Success!");
    console.log("Response:", res.data);
  })
  .catch((err) => {
    console.log("❌ Error");
    console.log("Status:", err.response?.status);
    console.log("Data:", err.response?.data);
  });
