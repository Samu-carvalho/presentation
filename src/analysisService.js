import fs from "node:fs";
import path from "node:path";
import { chatCompletions } from "./openaiClient.js";
import { toolDefs, runToolByName } from "./analysisTools.js";
import { saveResultMarkdown } from "./resultStore.js";
import { logRoutine } from "./logger.js";
import { toBusinessLabels } from "./businessLabels.js";

function loadPromptByName(promptName) {
  const clean = String(promptName || "").trim();
  if (!clean) {
    throw new Error("prompt obrigatorio");
  }

  const file = clean.endsWith(".md") ? clean : `${clean}.md`;
  const p = path.resolve("prompts", file);
  if (!fs.existsSync(p)) {
    throw new Error(`prompt nao encontrado: ${file}`);
  }
  return {
    file,
    content: fs.readFileSync(p, "utf8")
  };
}

function nowDateTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function safePreview(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= 40 ? text : `${text.slice(0, 40)}...`;
}

function buildSystemMessage(promptContent, idAutorizacao) {
  return [
    "Voce e um auditor especialista em autorizacoes medicas e odontologicas.",
    "Objetivo: executar uma analise completa e rastreavel buscando todos os dados disponiveis.",
    "Regras de coleta:",
    "1) Busque todos os dados necessarios antes de concluir.",
    "2) Sempre cite claramente quais dados fundamentam cada conclusao.",
    "3) Se nao encontrar algum dado, explicite a lacuna e seu impacto para a analise.",
    "4) Nao invente informacoes.",
    "5) Sempre inclua: resumo executivo, dados coletados, analise, conclusao e recomendacoes.",
    "",
    "REGRAS CRITICAS DE LINGUAGEM DO RESULTADO FINAL:",
    "- O resultado e lido por analistas de autorizacoes, NAO por tecnicos.",
    "- NUNCA mencione: nomes de funcoes, tools, APIs, banco de dados, erros de conexao, socket, HTTP, JSON, queries ou qualquer termo tecnico.",
    "- NUNCA escreva nomes tecnicos de campo (por exemplo: ds_Observacao, dh_AlteracaoData). Sempre use o rotulo de negocio compreensivel para o analista.",
    "- Se uma informacao nao estiver disponivel, diga apenas 'informacao nao localizada nos sistemas' ou 'dado nao disponivel'.",
    "- Quando buscar dados, refira-se como 'consultei os registros de ...' ou 'verifiquei o historico de ...'.",
    "- Escreva em linguagem de negocio, clara e objetiva para um analista de autorizacoes medicas.",
    "- Gere resposta final em Markdown estruturado.",
    "",
    `Autorizacao alvo: ${idAutorizacao}`,
    "Prompt de analise a seguir:",
    promptContent
  ].join("\n");
}

export async function analisarAutorizacao({ idAutorizacao, prompt }) {
  const id = Number(idAutorizacao);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("idAutorizacao invalido");
  }

  const promptLoaded = loadPromptByName(prompt);
  logRoutine("Analisar", "Inicio da analise", {
    idAutorizacao: id,
    prompt: promptLoaded.file
  });

  const messages = [
    {
      role: "system",
      content: buildSystemMessage(promptLoaded.content, id)
    },
    {
      role: "user",
      content: `Analise a autorizacao ${id} conforme o prompt carregado.`
    }
  ];

  let steps = 0;
  let finalMessage = "";

  while (steps < 12) {
    steps += 1;

    const ai = await chatCompletions({ messages, tools: toolDefs });
    if (!ai.ok) {
      const errorMsg = typeof ai.error === "string" ? ai.error : JSON.stringify(ai.error);
      logRoutine("Analisar", "Falha ao chamar Azure OpenAI", {
        idAutorizacao: id,
        status: ai.status,
        error: errorMsg.slice(0, 200)
      });
      throw new Error(`Azure OpenAI ${ai.status}: ${errorMsg.slice(0, 300)}`);
    }

    const msg = ai.message;
    const toolCalls = msg?.tool_calls ?? [];

    if (!toolCalls.length) {
      finalMessage = String(msg?.content ?? "").trim();
      break;
    }

    // So insere no historico quando ha tool_calls efetivos
    const assistantTurn = { role: "assistant", content: msg?.content ?? "", tool_calls: toolCalls };
    messages.push(assistantTurn);

    for (const call of toolCalls) {
      const toolName = call?.function?.name;
      let args = {};
      try {
        args = JSON.parse(call?.function?.arguments ?? "{}");
      } catch {
        args = {};
      }

      logRoutine("Tool", "Executando tool", {
        idAutorizacao: id,
        toolName,
        args: safePreview(args)
      });

      const toolResult = await runToolByName(toolName, args);

      logRoutine("Tool", "Tool executada", {
        idAutorizacao: id,
        toolName,
        ok: toolResult.ok,
        total: toolResult.total ?? 0,
        error: toolResult.error ?? null
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult)
      });
    }
  }

  if (!finalMessage) {
    finalMessage = "Nao foi possivel concluir a analise dentro do limite de interacoes.";
  }

  finalMessage = toBusinessLabels(finalMessage);

  const markdown = [
    `# Analise da Autorizacao ${id}`,
    "",
    `- Data de processamento: ${nowDateTime()}`,
    `- Prompt aplicado: ${promptLoaded.file}`,
    "",
    "## Resultado da Analise",
    "",
    finalMessage,
    "",
    "## Rastreabilidade",
    "",
    `Analise executada em ${nowDateTime()} com base nas seguintes fontes de informacao: dados gerais da autorizacao, historico de fluxo, procedimentos autorizados, prestadores, pendencias, chamados, protocolos, ocorrencias e registros de contact center.`,
    ""
  ].join("\n");

  const resultPath = saveResultMarkdown(id, markdown);
  logRoutine("Analisar", "Analise concluida", {
    idAutorizacao: id,
    resultPath: path.basename(resultPath)
  });

  return {
    idAutorizacao: id,
    prompt: promptLoaded.file,
    markdown,
    resultPath,
    steps
  };
}
