const { CloudClient } = require("chromadb");

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

let collection;

// Initialize ChromaDB
async function initializeVectorStore() {
  collection = await client.getOrCreateCollection({
    name: "pdf_chunks",
  });

  console.log(" Chroma Cloud Connected");
}

// Get collection
function getCollection() {
  if (!collection) {
    throw new Error("ChromaDB collection is not initialized");
  }

  return collection;
}

// Add chunks to ChromaDB
async function addChunks(chunks, embeddings, filename) {
  const collection = getCollection();

  const ids = chunks.map((_, index) => `${filename}-${index}`);

  const metadatas = chunks.map((_, index) => ({
    filename,
    chunkIndex: index,
  }));

  await collection.add({
    ids,
    documents: chunks,
    embeddings,
    metadatas,
  });

  console.log(` Stored ${chunks.length} chunks in ChromaDB`);
}

// 🔥 NEW: Search relevant chunks
async function searchSimilarChunks(queryEmbedding, topK = 5) {
  const collection = getCollection();

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  console.log(" ChromaDB search completed");

  return results;
}

module.exports = {
  initializeVectorStore,
  getCollection,
  addChunks,
  searchSimilarChunks,
};
