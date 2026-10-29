import fs from "node:fs";
import path from "node:path";
import { chatCompletions } from "./openaiClient.js";
import { toolDefs, runToolByName } from "./analysisTools.js";
import { saveResultMarkdown } from "./resultStore.js";
import { logRoutine } from "./logger.js";
import { toBusinessLabels } from "./businessLabels.js";
import { getBeneficiarioInfo, getAutorizacoesBeneficiario } from "./authorizationRepository.js";

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

function buildSystemMessage(promptContent, idBeneficiario, beneficiarioInfo) {
  const nomeBenef = beneficiarioInfo?.ds_beneficiario ?? "Desconhecido";
  const cdTitulo = beneficiarioInfo?.cd_titulo ?? "?";
  
  return [
    "Voce e um auditor especialista em autorizacoes medicas e odontologicas com foco em analise de perfil de consumo e deteccao de fraudes.",
    "Objetivo: executar uma analise completa do associado buscando todos os dados disponiveis de cobertura, consumo historico e autorizacoes.",
    "Regras de coleta:",
    "1) Busque dados de cobertura (planos e redes), historico de consumo (prestacoes), e autorizacoes do associado.",
    "2) Sempre cite claramente quais dados fundamentam cada conclusao.",
    "3) Se nao encontrar algum dado, explicite a lacuna e seu impacto para a analise.",
    "4) Nao invente informacoes.",
    "5) Sempre inclua: resumo executivo, perfil do associado, dados de cobertura, consumo historico, autorizacoes recentes, analise e conclusao.",
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
    `Beneficiario alvo: ${nomeBenef} (ID: ${idBeneficiario}, Grupo Familiar: ${cdTitulo})`,
    "Prompt de analise a seguir:",
    promptContent
  ].join("\n");
}

export async function analisarBeneficiario({ idBeneficiario, prompt }) {
  const id = Number(idBeneficiario);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("idBeneficiario invalido");
  }

  // Buscar info do beneficiario para extrair cd_titulo
  const benefInfo = await getBeneficiarioInfo(id);
  if (!benefInfo) {
    throw new Error(`Beneficiario ${id} nao encontrado`);
  }

  const cdTitulo = benefInfo.cd_titulo;

  const promptLoaded = loadPromptByName(prompt);
  logRoutine("AnalisarBenef", "Inicio da analise de beneficiario", {
    idBeneficiario: id,
    cdTitulo,
    prompt: promptLoaded.file
  });

  const messages = [
    {
      role: "system",
      content: buildSystemMessage(promptLoaded.content, id, benefInfo)
    },
    {
      role: "user",
      content: `Analise o associado ${benefInfo.ds_beneficiario} (ID ${id}) conforme o prompt carregado. Use as ferramentas de cobertura, consumo historico e autorizacoes.`
    }
  ];

  let steps = 0;
  let finalMessage = "";

  while (steps < 12) {
    steps += 1;

    const ai = await chatCompletions({ messages, tools: toolDefs });
    if (!ai.ok) {
      const errorMsg = typeof ai.error === "string" ? ai.error : JSON.stringify(ai.error);
      logRoutine("AnalisarBenef", "Falha ao chamar Azure OpenAI", {
        idBeneficiario: id,
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

      // Injetar cdTitulo e idBeneficiario se forem tools que precisam
      if (toolName === "BuscarCustoConsumido" || toolName === "BuscarBenePlanoRede") {
        args.cdTitulo = cdTitulo;
        args.idBeneficiario = id;
      }

      logRoutine("Tool", "Executando tool (beneficiario)", {
        idBeneficiario: id,
        toolName,
        args: safePreview(args)
      });

      const toolResult = await runToolByName(toolName, args);

      logRoutine("Tool", "Tool executada (beneficiario)", {
        idBeneficiario: id,
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

  // Salvar resultado com id de beneficiario (usar ID prefixado para nao conflitar com autorizacoes)
  const resultId = `B${id}`;
  const markdown = [
    `# Analise do Associado ${benefInfo.ds_beneficiario}`,
    "",
    `- ID do Beneficiario: ${id}`,
    `- Grupo Familiar: ${cdTitulo}`,
    `- Data de nascimento: ${benefInfo.dt_nascimento ?? "N/A"}`,
    `- Sexo: ${benefInfo.cd_sexo ?? "N/A"}`,
    `- Data de processamento: ${nowDateTime()}`,
    `- Prompt aplicado: ${promptLoaded.file}`,
    "",
    "## Resultado da Analise",
    "",
    finalMessage,
    "",
    "## Rastreabilidade",
    "",
    `Analise executada em ${nowDateTime()} com base nas seguintes fontes de informacao: dados do beneficiario, cobertura e redes de prestadores, historico de prestacoes medicas consumidas, e autorizacoes vinculadas.`,
    ""
  ].join("\n");

  const resultPath = saveResultMarkdown(resultId, markdown);
  logRoutine("AnalisarBenef", "Analise de beneficiario concluida", {
    idBeneficiario: id,
    resultPath: path.basename(resultPath)
  });

  return {
    idBeneficiario: id,
    resultId,
    prompt: promptLoaded.file,
    markdown,
    resultPath,
    steps
  };
}
