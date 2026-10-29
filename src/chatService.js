// src/chatService.js
import { chatCompletions } from './openaiClient.js';
import { toolDefs, runToolByName } from './analysisTools.js';
import { searchRAG } from './ragService.js';
import { logRoutine } from './logger.js';

// Tool de RAG (documentação interna)
const ragTool = {
  type: 'function',
  function: {
    name: 'BuscarDocumentacao',
    description: 'Busca na documentação interna (cobertura de planos, regras de negócio) para responder perguntas sobre políticas, procedimentos e coberturas.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A pergunta ou termos de busca' }
      },
      required: ['query']
    }
  }
};

const allTools = [...toolDefs, ragTool];

async function handleRagTool(args) {
  const results = await searchRAG(args.query, 3);
  if (results.length === 0) {
    return { ok: true, rows: [], total: 0, message: 'Nenhum documento encontrado.' };
  }
  return { ok: true, rows: results, total: results.length };
}

export async function chatCompletionsWithTools({ messages }) {
  const systemMessage = {
    role: 'system',
    content: `Você é o assistente virtual Córtex Omint, especializado em autorizações médicas, análise de beneficiários e informações sobre planos de saúde.
    Regras:
    1. Se o usuário pedir para analisar uma autorização ou beneficiário, use a tool correspondente e depois forneça um link ou instruções (ex: "Acesse /analisar ou /analisar-beneficiario com os dados").
    2. Se perguntar sobre cobertura de plano, use BuscarBenePlanoRede se tiver cdTitulo e idBeneficiario, ou use BuscarDocumentacao para informações gerais.
    3. Se a pergunta for sobre regras ou políticas, use BuscarDocumentacao.
    4. Se não souber ou não encontrar, responda educadamente: "Desculpe, não tenho essa informação. Posso ajudar com autorizações, beneficiários ou cobertura de planos."
    5. Mantenha tom profissional e amigável.
    6. Sempre que possível, ofereça links para as funcionalidades: /analisar, /analisar-beneficiario.
    `
  };

  const messagesWithSystem = [systemMessage, ...messages];

  // Primeira chamada
  const response = await chatCompletions({ messages: messagesWithSystem, tools: allTools });
  if (!response.ok) {
    throw new Error(`Erro na LLM: ${response.error}`);
  }

  const assistantMessage = response.message;
  const toolCalls = assistantMessage.tool_calls || [];

  if (toolCalls.length === 0) {
    return { reply: assistantMessage.content, toolCalls: [] };
  }

  // Processar tool calls
  const toolResults = [];
  for (const call of toolCalls) {
    const toolName = call.function.name;
    const args = JSON.parse(call.function.arguments || '{}');
    let result;
    if (toolName === 'BuscarDocumentacao') {
      result = await handleRagTool(args);
    } else {
      result = await runToolByName(toolName, args);
    }
    toolResults.push({
      tool_call_id: call.id,
      role: 'tool',
      content: JSON.stringify(result)
    });
  }

  // Segunda chamada com resultados das tools
  const updatedMessages = [...messagesWithSystem, assistantMessage, ...toolResults];
  const finalResponse = await chatCompletions({ messages: updatedMessages, tools: allTools });
  if (!finalResponse.ok) {
    throw new Error(`Erro na LLM após tools: ${finalResponse.error}`);
  }

  return {
    reply: finalResponse.message.content,
    toolCalls: toolCalls.map(tc => ({ name: tc.function.name, args: JSON.parse(tc.function.arguments || '{}') }))
  };
}