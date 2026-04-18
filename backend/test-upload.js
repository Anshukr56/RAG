const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");

const filePath = "C:/Users/anshu/Downloads/test_document.pdf";

const form = new FormData();
form.append("file", fs.createReadStream(filePath));

axios
  .post("http://localhost:5000/api/upload", form, {
    headers: form.getHeaders(),
  })
  .then((res) => console.log("Success:", res.data))
  .catch((err) => {
    console.log("Error Message:", err.message);
    console.log("Full Error:", err);
  });
