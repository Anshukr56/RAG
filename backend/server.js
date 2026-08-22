const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("API KEY Loaded:", process.env.GEMINI_API_KEY ? "Yes" : "No");

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { extractTextFromPDF } = require("./utils/pdfUtils");
const { askGemini } = require("./utils/geminiUtils");
const { chunkText } = require("./services/chunkService");

// Added searchSimilarChunks
const {
  initializeVectorStore,
  addChunks,
  searchSimilarChunks,
} = require("./services/vectorStore");

const { generateEmbedding } = require("./services/embeddingService");

const app = express();

// Middleware

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());

// Create uploads folder if missing

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("uploads folder created");
}

// Store uploaded PDF texts in memory

let uploadedDocuments = {};

// Multer configuration

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

// Health Check

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Upload PDF API

app.post("/api/upload", upload.single("file"), async (req, res) => {
  console.log("Upload API Hit");

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const filePath = req.file.path;

    console.log("Extracting from:", filePath);

    // 1. Extract text from PDF
    const extractedData = await extractTextFromPDF(filePath);

    // 2. Split text into chunks

    const chunks = chunkText(extractedData.text);

    console.log(`Created ${chunks.length} chunks`);

    // 3. Generate embeddings

    console.log("Generating embeddings...");

    const embeddings = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);

      embeddings.push(embedding);
    }

    console.log("Embeddings generated successfully!");

    // 4. Store chunks + embeddings in

    await addChunks(chunks, embeddings, req.file.filename);

    console.log("\n======================================");
    console.log(" PDF Uploaded Successfully");
    console.log("======================================");

    console.log("Filename      :", req.file.filename);
    console.log("Pages         :", extractedData.pages);
    console.log("Text Length   :", extractedData.text.length);
    console.log("Total Chunks  :", chunks.length);

    // Temporary local storage

    uploadedDocuments[req.file.filename] = {
      text: extractedData.text,
      chunks,
      pages: extractedData.pages,
    };

    // Response

    res.json({
      success: true,
      message: "File uploaded successfully",
      filename: req.file.filename,
      pages: extractedData.pages,
      textLength: extractedData.text.length,
      totalChunks: chunks.length,
    });
  } catch (error) {
    console.error("Upload Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/question", async (req, res) => {
  console.log("\n Question API Called");

  try {
    const { question, filename } = req.body;
    console.log("Filtering by filename:", filename || "(none — searching all)");

    // Validate question

    if (!question || question.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Invalid question",
      });
    }

    console.log("Question:", question);

    // Convert question into embedding

    console.log(" Generating question embedding...");

    const questionEmbedding = await generateEmbedding(question);

    console.log("Question embedding generated");

    // Search ChromaDB

    console.log("Searching ChromaDB...");

    const results = await searchSimilarChunks(questionEmbedding, 5, filename || null);

    // Extract relevant chunks

    const documents = results.documents?.[0] || [];

    console.log(`Retrieved ${documents.length} relevant chunks`);

    // No relevant chunks found

    if (documents.length === 0) {
      return res.json({
        success: true,
        answer:
          "I couldn't find relevant information in the uploaded document.",
      });
    }

    // Create context

    const context = documents.join("\n\n---\n\n");

    console.log("Relevant context created");

    // Create RAG prompt

    const ragQuestion = `
You are a helpful PDF question-answering assistant.

Your job is to answer the user's question using the information provided in the CONTEXT below.

CONTEXT:
${context}

QUESTION:
${question}

RULES:
1. Use ONLY the information provided in the CONTEXT.
2. Do NOT use outside knowledge or invent facts.
3. If the user asks for a summary, overview, or what the PDF/document is about, summarize the information present in the CONTEXT.
4. If the answer is not present and cannot be inferred from the CONTEXT, say exactly:
"I couldn't find that information in the uploaded document."
5. Give a clear, helpful, and concise answer.
`;

    // Send retrieved context to Gemini

    console.log(" Sending relevant context to Gemini...");

    const answer = await askGemini(ragQuestion);

    console.log(" Answer generated");

    // Send response to frontend

    res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(" Question Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// Start Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeVectorStore();

    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
  }
}

startServer();
