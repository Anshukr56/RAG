const fs = require("fs");
const pdfParse = require("pdf-parse");

async function extractTextFromPDF(filePath) {
  try {
    console.log(`📄 Extracting from: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      text: data.text,
      pages: data.numpages,
      filename: filePath,
    };
  } catch (error) {
    console.error("PDF Error:", error.message);

    return {
      text: "",
      pages: 0,
      filename: filePath,
    };
  }
}

module.exports = { extractTextFromPDF };
