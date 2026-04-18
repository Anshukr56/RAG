const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const chatBox = document.getElementById("chat-box");
const fileListDiv = document.getElementById("file-list");

let uploadedFiles = [];

/* Upload PDF */
fileInput.addEventListener("change", async () => {
  const files = fileInput.files;

  if (files.length === 0) return;

  for (let file of files) {
    if (file.type !== "application/pdf") {
      status.innerText = "❌ Only PDF files allowed";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    status.innerText = "⏳ Uploading...";

    try {
      const res = await fetch("https://rag-1-ccfm.onrender.com/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        uploadedFiles.push(file.name);
        status.innerText = "✅ Upload successful";
        updateFileList();

        addMessage("bot", `📄 Uploaded: ${file.name}`);
      } else {
        status.innerText = "❌ Upload failed";
      }
    } catch (err) {
      status.innerText = "❌ Error: " + err.message;
    }
  }
});

/* Update File List */
function updateFileList() {
  fileListDiv.innerHTML = "";
  uploadedFiles.forEach((fileName) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `📄 ${fileName}`;
    fileListDiv.appendChild(fileItem);
  });
}

/* Add Message */
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.innerText = text;

  chatBox.appendChild(msg);

  // ✅ Smooth auto-scroll
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });

  return msg; // 👈 return element (used for loading)
}

/* Ask Question */
async function askQuestion() {
  const input = document.getElementById("question");
  const question = input.value.trim();

  if (!question) return;

  if (uploadedFiles.length === 0) {
    addMessage("bot", "⚠️ Please upload a PDF first");
    return;
  }

  // Show user message
  addMessage("user", question);
  input.value = "";

  // ✅ Show loading message
  const loadingMsg = addMessage("bot", "⏳ Thinking...");

  try {
    const res = await fetch("https://rag-1-ccfm.onrender.com/api/question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: question }),
    });

    const data = await res.json();

    // Remove loading message
    loadingMsg.remove();

    if (data.success) {
      addMessage("bot", data.answer);
    } else {
      addMessage("bot", "❌ Error: " + data.error);
    }
  } catch (err) {
    loadingMsg.remove();
    addMessage("bot", "❌ Error: " + err.message);
  }
}

/* Enter key to send */
document.getElementById("question").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // ✅ prevents newline
    askQuestion();
  }
});
