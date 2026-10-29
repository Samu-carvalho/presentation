// src/ragService.js
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from '@xenova/transformers';
import { logRoutine } from './logger.js';

let embedder = null;
let documents = [];
let index = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

function loadDocuments(docsDir = 'docs/rag') {
  const dir = path.resolve(docsDir);
  if (!fs.existsSync(dir)) {
    logRoutine('RAG', 'Diretório de documentos não encontrado', { dir });
    return [];
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  const docs = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 0);
    for (const chunk of chunks) {
      docs.push({ source: file, content: chunk.trim() });
    }
  }
  logRoutine('RAG', `Carregados ${docs.length} chunks de ${files.length} arquivos`);
  return docs;
}

async function buildIndex() {
  documents = loadDocuments();
  if (documents.length === 0) return [];
  const embedderInstance = await getEmbedder();
  const embeddings = await Promise.all(documents.map(doc => embedderInstance(doc.content, { pooling: 'mean', normalize: true })));
  return documents.map((doc, i) => ({
    doc,
    embedding: embeddings[i].data
  }));
}

async function getIndex() {
  if (!index) {
    index = await buildIndex();
  }
  return index;
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function searchRAG(query, topK = 3) {
  const idx = await getIndex();
  if (!idx || idx.length === 0) return [];
  const embedder = await getEmbedder();
  const queryEmb = await embedder(query, { pooling: 'mean', normalize: true });
  const results = idx.map(item => ({
    ...item.doc,
    score: cosineSimilarity(queryEmb.data, item.embedding)
  }));
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}