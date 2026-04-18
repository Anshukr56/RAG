const fs = require("fs");
const envContent = fs.readFileSync(".env", "utf8");
const lines = envContent.split("\n");
lines.forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});
console.log("✅ Manually loaded .env file");
console.log("API KEY:", process.env.GEMINI_API_KEY);

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const { askGemini } = require("./geminiUtils");
const { extractTextFromPDF } = require("./pdfUtils");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 🚀 Store uploaded PDF texts in memory
let uploadedDocuments = {};

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"), false);
    }
  },
});

// Upload API
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const extractedData = await extractTextFromPDF(filePath);

    // 🚀 Store the extracted text
    uploadedDocuments[req.file.filename] = extractedData.text;
    console.log(
      `📄 Stored: ${req.file.filename} (${extractedData.pages} pages)`,
    );

    res.json({
      success: true,
      message: "File uploaded successfully",
      filename: req.file.filename,
      pages: extractedData.pages,
      textLength: extractedData.text.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "RAG Backend Running ✅" });
});

// Question API with RAG
app.post("/api/question", async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim() === "") {
    return res.status(400).json({ error: "Invalid question" });
  }

  try {
    // 🚀 Get all stored document texts
    const documentTexts = Object.values(uploadedDocuments).join("\n\n---\n\n");

    // 🚀 Create RAG prompt with document context
    let ragQuestion = question;
    if (documentTexts) {
      ragQuestion = `
You are a PDF assistant.

Use ONLY the document content below to answer clearly.

DOCUMENT:
${documentTexts}

QUESTION:
${question}
`;
    }

    const answer = await askGemini(ragQuestion);

    res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
