const { CloudClient } = require("chromadb");

let client;
let collection;

// Initialize ChromaDB
async function initializeVectorStore() {
  if (!client) {
    client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });
  }

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

// Search relevant chunks — optionally filtered by filename
async function searchSimilarChunks(queryEmbedding, topK = 5, filename = null) {
  const collection = getCollection();

  const queryParams = {
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  };

  // Filter results to only the specified PDF's chunks
  if (filename) {
    queryParams.where = { filename: { $eq: filename } };
    console.log(` Filtering ChromaDB search to filename: ${filename}`);
  }

  const results = await collection.query(queryParams);

  console.log(" ChromaDB search completed");

  return results;
}

module.exports = {
  initializeVectorStore,
  getCollection,
  addChunks,
  searchSimilarChunks,
};
