import fs from "node:fs";
import path from "node:path";

const RESULTS_DIR = path.resolve("results");

function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

export function getResultPath(idAutorizacao) {
  ensureResultsDir();
  return path.join(RESULTS_DIR, `${idAutorizacao}.md`);
}

export function saveResultMarkdown(idAutorizacao, markdown) {
  const p = getResultPath(idAutorizacao);
  fs.writeFileSync(p, markdown, "utf8");
  return p;
}

export function readResultMarkdown(idAutorizacao) {
  const p = getResultPath(idAutorizacao);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

export function resultExists(idAutorizacao) {
  const p = getResultPath(idAutorizacao);
  return fs.existsSync(p);
}
