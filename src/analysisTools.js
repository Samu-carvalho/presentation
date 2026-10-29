import {
  getAutorizacao,
  getAutorizacaoDetalheFluxo,
  getProcedimentosAutorizados,
  getAutorizacaoChamadoProtocoloDocumento,
  getAutorizacaoChamadoConvocacao,
  getAutorizacaoPendencia,
  getAutorizacaoDetalhePendencia,
  getAutorizacaoPrestador,
  getAutorizacaoOcorrenciaDetalhe,
  getContactCenterReport,
  getContactCenterReportObs,
  getCustoConsumido,
  getBenePlanoRede
} from "./authorizationRepository.js";
import { logRoutine } from "./logger.js";

export const toolDefs = [
  {
    type: "function",
    function: {
      name: "BuscarAutorizacao",
      description: "Busca dados gerais da autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoDetalheFluxo",
      description: "Busca historico de fluxo da autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarProcedimentosAutorizados",
      description: "Busca procedimentos autorizados vinculados a autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoChamadoProtocoloDocumento",
      description: "Busca protocolos e documentos associados a autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoChamadoConvocacao",
      description: "Busca chamados e convocacoes relacionados a autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoPendencia",
      description: "Busca pendencias gerais da autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoDetalhePendencia",
      description: "Busca pendencias por detalhe da autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoPrestador",
      description: "Busca prestadores relacionados a autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarAutorizacaoOcorrenciaDetalhe",
      description: "Busca ocorrencias com detalhe escrito e observacoes da autorizacao.",
      parameters: {
        type: "object",
        properties: {
          idAutorizacao: { type: "integer" }
        },
        required: ["idAutorizacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarContactCenterReport",
      description: "Busca relatorio ContactCenter por idChamado.",
      parameters: {
        type: "object",
        properties: {
          idChamado: { type: "integer" }
        },
        required: ["idChamado"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarContactCenterReportObs",
      description: "Busca observacoes ContactCenter por idChamado.",
      parameters: {
        type: "object",
        properties: {
          idChamado: { type: "integer" }
        },
        required: ["idChamado"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarCustoConsumido",
      description: "Busca historico de prestacoes medicas consumidas pelo associado para analise de perfil e fraude.",
      parameters: {
        type: "object",
        properties: {
          cdTitulo: { type: "integer", description: "Identificador do grupo familiar (obrigatorio)" },
          idBeneficiario: { type: "integer", description: "Identificador do beneficiario (opcional)" }
        },
        required: ["cdTitulo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarBenePlanoRede",
      description: "Busca cobertura de plano e redes de prestadores do associado.",
      parameters: {
        type: "object",
        properties: {
          cdTitulo: { type: "integer", description: "Identificador do grupo familiar (obrigatorio)" },
          idBeneficiario: { type: "integer", description: "Identificador do beneficiario (opcional)" }
        },
        required: ["cdTitulo"]
      }
    }
  }
];

const handlers = {
  BuscarAutorizacao: ({ idAutorizacao }) => getAutorizacao(idAutorizacao),
  BuscarAutorizacaoDetalheFluxo: ({ idAutorizacao }) => getAutorizacaoDetalheFluxo(idAutorizacao),
  BuscarProcedimentosAutorizados: ({ idAutorizacao }) => getProcedimentosAutorizados(idAutorizacao),
  BuscarAutorizacaoChamadoProtocoloDocumento: ({ idAutorizacao }) => getAutorizacaoChamadoProtocoloDocumento(idAutorizacao),
  BuscarAutorizacaoChamadoConvocacao: ({ idAutorizacao }) => getAutorizacaoChamadoConvocacao(idAutorizacao),
  BuscarAutorizacaoPendencia: ({ idAutorizacao }) => getAutorizacaoPendencia(idAutorizacao),
  BuscarAutorizacaoDetalhePendencia: ({ idAutorizacao }) => getAutorizacaoDetalhePendencia(idAutorizacao),
  BuscarAutorizacaoPrestador: ({ idAutorizacao }) => getAutorizacaoPrestador(idAutorizacao),
  BuscarAutorizacaoOcorrenciaDetalhe: ({ idAutorizacao }) => getAutorizacaoOcorrenciaDetalhe(idAutorizacao),
  BuscarContactCenterReport: ({ idChamado }) => getContactCenterReport(idChamado),
  BuscarContactCenterReportObs: ({ idChamado }) => getContactCenterReportObs(idChamado),
  BuscarCustoConsumido: ({ cdTitulo, idBeneficiario }) => getCustoConsumido(cdTitulo, idBeneficiario),
  BuscarBenePlanoRede: ({ cdTitulo, idBeneficiario }) => getBenePlanoRede(cdTitulo, idBeneficiario)
};

// Limite por campo de texto. Campos de observacao/descricao longa: 2000 chars.
// Demais strings: 500 chars. Garante que o payload enviado ao modelo seja razoavel.
const MAX_TEXT_CHARS = Number(process.env.TOOL_MAX_TEXT_CHARS ?? 2000);
const MAX_SHORT_CHARS = 500;

const TEXT_FIELDS = new Set([
  "ds_observacao", "ds_ocorrencia_autorizacaodetalhe", "ds_assunto",
  "ds_beneficiario", "ds_prestador", "ds_servico", "ds_honorario",
  "ds_statusprestador", "ds_tipoprestador", "ds_status"
]);

function truncateRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string") {
      const limit = TEXT_FIELDS.has(k.toLowerCase()) ? MAX_TEXT_CHARS : MAX_SHORT_CHARS;
      out[k] = v.length > limit ? v.slice(0, limit) + "…" : v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function compactRows(rows) {
  if (!Array.isArray(rows)) return [];
  const maxRows = Number(process.env.TOOL_MAX_ROWS_TO_MODEL ?? 20);
  return rows.slice(0, maxRows).map(truncateRow);
}

export async function runToolByName(toolName, args = {}) {
  const fn = handlers[toolName];
  if (!fn) {
    const errMsg = `tool_not_found:${toolName}`;
    logRoutine("AnalysisTool", `Ferramenta não encontrada: ${toolName}`, { toolName, available: Object.keys(handlers).length });
    return { ok: false, error: errMsg };
  }

  const startTime = Date.now();
  const argsStr = JSON.stringify(args).slice(0, 100);
  
  try {
    logRoutine("AnalysisTool", `Iniciando ferramenta: ${toolName}`, { toolName, args: argsStr });
    
    const rows = await fn(args);
    const elapsed = Date.now() - startTime;
    const rowCount = rows?.length ?? 0;
    const maxRows = Number(process.env.TOOL_MAX_ROWS_TO_MODEL ?? 20);
    
    let warning = null;
    if (rowCount > maxRows) {
      warning = `total_${rowCount}_max_${maxRows}`;
    }
    
    logRoutine("AnalysisTool", `Ferramenta finalizada: ${toolName}`, {
      toolName,
      rowCount,
      elapsed: `${elapsed}ms`,
      warning
    });
    
    return {
      ok: true,
      total: rowCount,
      rows: compactRows(rows),
      warning,
      executionTimeMs: elapsed
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errMsg = err?.message ?? String(err);
    const errStack = err?.stack ?? "";
    
    logRoutine("AnalysisTool", `ERRO na ferramenta: ${toolName}`, {
      toolName,
      error: errMsg,
      stack: errStack.slice(0, 200),
      elapsed: `${elapsed}ms`
    });
    
    return {
      ok: false,
      error: errMsg,
      executionTimeMs: elapsed,
      _fullError: errStack
    };
  }
}
