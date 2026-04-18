require("dotenv").config();
console.log("API KEY Loaded:", process.env.GEMINI_API_KEY ? "Yes" : "No");

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const { askGemini } = require("./geminiUtils");
const { extractTextFromPDF } = require("./pdfUtils");

const app = express();

/* Middleware */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());

/* Create uploads folder if missing */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("📁 uploads folder created");
}

/* Store uploaded PDF texts in memory */
let uploadedDocuments = {};

/* Multer config */
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

/* Health check */
app.get("/", (req, res) => {
  res.json({ message: "RAG Backend Running ✅" });
});

/* Upload API */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const filePath = req.file.path;
    const extractedData = await extractTextFromPDF(filePath);

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
    console.error("Upload Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* Question API */
app.post("/api/question", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Invalid question",
      });
    }

    const documentTexts = Object.values(uploadedDocuments).join("\n\n---\n\n");

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
    console.error("Question Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
