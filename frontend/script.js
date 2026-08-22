const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
  ? "http://localhost:5000" 
  : "https://rag-2-xofd.onrender.com";
console.log("Using API_URL:", API_URL);
console.log("PAGE LOADED:", new Date().toLocaleTimeString());
const uploadBox = document.getElementById("uploadBox");
const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const fileList = document.getElementById("file-list");
const chatBox = document.getElementById("chat-box");
const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");

console.log("uploadBox:", uploadBox);
console.log("fileInput:", fileInput);
console.log("fileList:", fileList);

let uploadedFiles = [];

// Upload Box Click

uploadBox.addEventListener("click", () => {
  console.log(" Upload box clicked");
  fileInput.click();
});

// Upload PDF

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];

  console.log(" File selected:", file);

  if (!file) return;

  // Check PDF
  if (file.type !== "application/pdf") {
    status.innerText = " Please select a PDF file.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  status.innerText = "Uploading...";

  try {
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    console.log("HTTP status:", res.status);

    const data = await res.json();

    console.log("Response from server:", data);

    // Upload Successful

    if (res.ok) {
      console.log("Upload successful");

      status.innerText = "Upload Successful";

      // Store file name
      uploadedFiles.push(file.name);

      // Create file element
      const div = document.createElement("div");

      div.className = "file-item";
      div.textContent = ` ${file.name}`;

      // Add file to Uploaded Files
      fileList.appendChild(div);
      console.log(" FILE IS IN DOM");
      console.log("FILE LIST:", fileList.innerHTML);

      console.log(" File added to frontend:", file.name);

      // Show message in chat
      addMessage("bot", ` ${file.name} uploaded successfully.`);
    } else {
      console.log(" Upload failed:", data);

      status.innerText = "❌ " + (data.error || "Upload failed");
    }
  } catch (err) {
    console.error(" Upload error:", err);

    status.innerText = " Upload failed. Check backend.";
  }

  // Clear input
  fileInput.value = "";
});

// Ask Question

async function askQuestion() {
  const question = questionInput.value.trim();

  if (!question) return;

  // Check PDF uploaded
  if (uploadedFiles.length === 0) {
    addMessage("bot", " Please upload a PDF first.");

    return;
  }

  // Show user question
  addMessage("user", question);

  // Clear input
  questionInput.value = "";

  try {
    const res = await fetch(`${API_URL}/api/question`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question: question,
      }),
    });

    const data = await res.json();

    console.log("Question response:", data);

    if (res.ok && data.success) {
      addMessage("bot", data.answer);
    } else {
      addMessage("bot", "❌ " + (data.error || "Something went wrong"));
    }
  } catch (err) {
    console.error("Question error:", err);

    addMessage("bot", "Could not connect to backend.");
  }
}

// Send Button

sendBtn.addEventListener("click", askQuestion);

// Enter Key

questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    askQuestion();
  }
});

// Add Chat Messages

function addMessage(type, text) {
  const div = document.createElement("div");

  div.className = `message ${type}`;

  div.innerText = text;

  chatBox.appendChild(div);

  // Scroll chat to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}
