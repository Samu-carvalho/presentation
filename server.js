import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import 'dotenv/config';
import { logger, logRoutine, listLogFiles, readLogFile } from "./src/logger.js";
import { analisarAutorizacao } from "./src/analysisService.js";
import { analisarBeneficiario } from "./src/beneficiarioAnalysisService.js";
import { readResultMarkdown } from "./src/resultStore.js";
import { closePool } from "./src/db.js";

import { getDadosApresentacao } from './src/swaggerClient.js';
import { chatCompletionsWithTools } from './src/chatService.js';
import highlightsRouter from './routes/apresentacao-highlights.js';
import apresentacaoPublicacaoRouter from './routes/apresentacao-publicacao.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable("x-powered-by");

// 2. ROTA RAIZ (antes do static)
app.get("/", (_req, res) => {
  return res.redirect("/apresentacao-comercial");
});

// em decks grandes. Um único parser para toda a aplicação.
app.use(express.json({ limit: "2mb" }));

// Antes do logger: assets estáticos (js, css, json de config) não poluem o log.
app.use(express.static(path.join(__dirname, "public")));

app.use((req, _res, next) => {
  logRoutine("HTTP", "Request", {
    method: req.method,
    url: req.originalUrl,
    body: resumirCorpo(req.body)
  });
  next();
});

/** Evita despejar payloads grandes (highlights, chat, digest de slides) no log. */
function resumirCorpo(body) {
  if (!body || typeof body !== "object") return body ?? null;
  const texto = JSON.stringify(body);
  if (texto.length <= 1000) return body;
  return { _resumo: `${texto.length} bytes`, _chaves: Object.keys(body) };
}

app.get("/health", (_req, res) => {
  return res.json({ ok: true });
});

/* ============================================================
   Análises
   ============================================================ */

app.post("/api/analisar", async (req, res) => {
  try {
    const { idAutorizacao, prompt } = req.body ?? {};

    if (!idAutorizacao) {
      return res.status(400).json({ ok: false, error: "idAutorizacao obrigatorio" });
    }
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, error: "prompt obrigatorio" });
    }

    const result = await analisarAutorizacao({ idAutorizacao, prompt });

    return res.json({
      ok: true,
      idAutorizacao: result.idAutorizacao,
      prompt: result.prompt,
      steps: result.steps,
      resultPath: path.basename(result.resultPath),
      viewUrl: `/resultado/${result.idAutorizacao}`
    });
  } catch (err) {
    logRoutine("Analisar", "Erro na API analisar", {
      error: err?.message ?? "internal_error"
    });
    return res.status(500).json({ ok: false, error: err?.message ?? "Erro interno" });
  }
});

app.post("/api/analisar-beneficiario", async (req, res) => {
  try {
    const { idBeneficiario, prompt } = req.body ?? {};

    if (!idBeneficiario) {
      return res.status(400).json({ ok: false, error: "idBeneficiario obrigatorio" });
    }
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, error: "prompt obrigatorio" });
    }

    const result = await analisarBeneficiario({ idBeneficiario, prompt });

    return res.json({
      ok: true,
      idBeneficiario: result.idBeneficiario,
      resultId: result.resultId,
      prompt: result.prompt,
      steps: result.steps,
      resultPath: path.basename(result.resultPath),
      viewUrl: `/resultado-beneficiario/${result.resultId}`
    });
  } catch (err) {
    logRoutine("AnalisarBenef", "Erro na API analisar-beneficiario", {
      error: err?.message ?? "internal_error"
    });
    return res.status(500).json({ ok: false, error: err?.message ?? "Erro interno" });
  }
});


app.get("/analisar", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "analisar.html"));
});

app.get("/analisar-beneficiario", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "analisar-beneficiario.html"));
});

app.get("/resultado/:idAutorizacao", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "resultado.html"));
});

app.get("/resultado-beneficiario/:resultId", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "resultado.html"));
});

app.get("/api/resultado/:idAutorizacao", (req, res) => {
  const param = req.params.idAutorizacao;

  // Suporta ambos: id de autorizacao (numero) e resultId de beneficiario (B + numero)
  const id = param.startsWith("B") ? param : Number(param);

  if (typeof id === "number" && (!Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ ok: false, error: "id invalido" });
  }
  if (typeof id === "string" && (id.length < 2 || !id.startsWith("B"))) {
    return res.status(400).json({ ok: false, error: "resultId invalido" });
  }

  const markdown = readResultMarkdown(id);
  if (!markdown) {
    return res.status(404).json({ ok: false, error: "resultado nao encontrado" });
  }

  const html = marked.parse(markdown);
  return res.json({ ok: true, id, markdown, html });
});

/* ============================================================
   Logs
   ============================================================ */

app.get("/logs", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "logs.html"));
});

app.get("/api/logs", (_req, res) => {
  return res.json({ ok: true, files: listLogFiles() });
});

app.get("/api/logs/:file", (req, res) => {
  try {
    const content = readLogFile(req.params.file);
    if (content === null) {
      return res.status(404).json({ ok: false, error: "arquivo nao encontrado" });
    }
    return res.json({ ok: true, content });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err?.message ?? "arquivo invalido" });
  }
});

/* ============================================================
   Apresentação comercial
   ============================================================ */

app.get('/apresentacao-comercial', (_req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'apresentacao-comercial.html'));
});

app.get('/api/apresentacao/dados', async (req, res) => {
  try {
    const { cdEmpresa, dataInicial, dataFinal, mock } = req.query;
    if (!cdEmpresa || !dataInicial || !dataFinal) {
      return res.status(400).json({ ok: false, error: 'Parâmetros obrigatórios: cdEmpresa, dataInicial, dataFinal' });
    }
    const forcarMock = mock === 'true' || mock === '1';
    const dados = await getDadosApresentacao(cdEmpresa, dataInicial, dataFinal, forcarMock);
    return res.json({ ok: true, dados });
  } catch (err) {
    logRoutine("Apresentacao", "Erro ao buscar dados", { error: err?.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET/PUT /api/apresentacao/highlights e POST /api/apresentacao/highlights/gerar
app.use(highlightsRouter);

app.use(apresentacaoPublicacaoRouter);

/* ============================================================
   Chat conversacional
   ============================================================ */

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body ?? {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: 'messages é obrigatório' });
    }
    // Limita o histórico para evitar estouro de contexto
    const trimmed = messages.slice(-20);
    const result = await chatCompletionsWithTools({ messages: trimmed });
    return res.json({ ok: true, reply: result.reply, toolCalls: result.toolCalls });
  } catch (err) {
    logRoutine("Chat", "Erro no chat", { error: err?.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============================================================
   404 e erros — sempre JSON em /api, para o front nunca receber HTML
   ============================================================ */

app.use("/api", (_req, res) => {
  return res.status(404).json({ ok: false, error: "rota nao encontrada" });
});

app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logRoutine("HTTP", "Erro nao tratado", {
    url: req.originalUrl,
    status,
    error: err?.message ?? "internal_error"
  });
  if (res.headersSent) return;
  if (req.originalUrl.startsWith("/api")) {
    return res.status(status).json({ ok: false, error: err?.message ?? "Erro interno" });
  }
  return res.status(status).send("Erro interno");
});

/* ============================================================
   Boot e encerramento
   ============================================================ */

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  logger.info("Server started", {
    routine: "Server",
    detail: "Aplicacao iniciada",
    important: { url: `http://localhost:${port}` }
  });
});

async function encerrar(sinal) {
  logRoutine("Server", "Encerrando", { sinal });
  server.close();
  await closePool().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));