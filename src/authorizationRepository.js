import { queryRows } from "./db.js";
import { logRoutine } from "./logger.js";

const TOP_LIMIT = Number(process.env.MSSQL_TOP_LIMIT ?? 1000);

function topClause() {
  return Number.isFinite(TOP_LIMIT) && TOP_LIMIT > 0 ? `TOP (${TOP_LIMIT})` : "";
}

function ensureId(idAutorizacao) {
  const num = Number(idAutorizacao);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error("idAutorizacao invalido");
  }
  return num;
}

function ensureTituloId(cdTitulo) {
  const num = Number(cdTitulo);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error("cdTitulo invalido");
  }
  return num;
}

function sanitizeTable(tableName) {
  return String(tableName).replace(/[^a-zA-Z0-9_.]/g, "");
}

async function findByAuthorization(tableName, idAutorizacao) {
  const id = ensureId(idAutorizacao);
  const safeTable = sanitizeTable(tableName);
  const q = `SELECT ${topClause()} * FROM ${safeTable} WHERE id_Autorizacao = @idAutorizacao`;
  return queryRows(q, { idAutorizacao: id });
}

async function findByChamado(tableName, idChamado) {
  const id = Number(idChamado);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("idChamado invalido");
  }
  const safeTable = sanitizeTable(tableName);
  const q = `SELECT ${topClause()} * FROM ${safeTable} WHERE id_Chamado = @idChamado`;
  return queryRows(q, { idChamado: id });
}

export async function getAutorizacao(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_Autorizacao", idAutorizacao);
}

export async function getAutorizacaoDetalheFluxo(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_AutorizacaoDetalheFluxo", idAutorizacao);
}

export async function getProcedimentosAutorizados(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_ProcedimentosAutorizados", idAutorizacao);
}

export async function getAutorizacaoChamadoProtocoloDocumento(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_AutorizacaoChamadoProtocoloDocumento", idAutorizacao);
}

export async function getAutorizacaoChamadoConvocacao(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_Autorizacao_Chamado_Convocacao", idAutorizacao);
}

export async function getAutorizacaoPendencia(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_Autorizacao_Pendencia", idAutorizacao);
}

export async function getAutorizacaoDetalhePendencia(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_AutorizacaoDetalhe_Pendencia", idAutorizacao);
}

export async function getAutorizacaoPrestador(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_Autorizacao_Prestador", idAutorizacao);
}

export async function getAutorizacaoOcorrenciaDetalhe(idAutorizacao) {
  return findByAuthorization("Autorizacao..vw_AutorizacaoOcorrencia_Detalhe", idAutorizacao);
}

export async function getContactCenterReport(idChamado) {
  return findByChamado("ContactCenter..vw_cc_report", idChamado);
}

export async function getContactCenterReportObs(idChamado) {
  return findByChamado("ContactCenter..vw_cc_report_obs", idChamado);
}

// Novas APIs para análise de consumo e cobertura

export async function getCustoConsumido(cdTitulo, idBeneficiario = null) {
  const titulo = ensureTituloId(cdTitulo);
  const safeTable = sanitizeTable("DW_Omint..vw_F_Custo");
  
  let q = `SELECT ${topClause()} * FROM ${safeTable} WHERE ID_Titulo = @cdTitulo`;
  const params = { cdTitulo: titulo };
  
  if (idBeneficiario) {
    const benef = Number(idBeneficiario);
    if (Number.isInteger(benef) && benef > 0) {
      q += ` AND ID_Beneficiario = @idBeneficiario`;
      params.idBeneficiario = benef;
    }
  }
  
  return queryRows(q, params);
}

export async function getBenePlanoRede(cdTitulo, idBeneficiario = null) {
  const titulo = ensureTituloId(cdTitulo);
  const safeTable = sanitizeTable("ContratoCliente..vwBenePlanoRede");
  
  let q = `SELECT ${topClause()} * FROM ${safeTable} WHERE cd_titulo = @cdTitulo`;
  const params = { cdTitulo: titulo };
  
  if (idBeneficiario) {
    const benef = Number(idBeneficiario);
    if (Number.isInteger(benef) && benef > 0) {
      q += ` AND sq_beneficiario = @idBeneficiario`;
      params.idBeneficiario = benef;
    }
  }
  
  return queryRows(q, params);
}

// APIs para análise de beneficiário

export async function getBeneficiarioInfo(idBeneficiario) {
  const id = Number(idBeneficiario);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("idBeneficiario invalido");
  }
  
  const safeTable = sanitizeTable("Autorizacao..vw_Autorizacao");
  const q = `SELECT TOP (1) id_Beneficiario, cd_titulo, sq_beneficiario, ds_beneficiario, dt_nascimento, cd_sexo FROM ${safeTable} WHERE id_Beneficiario = @idBeneficiario`;
  const rows = await queryRows(q, { idBeneficiario: id });
  return rows[0] ?? null;
}

export async function getAutorizacoesBeneficiario(cdTitulo, idBeneficiario) {
  const titulo = ensureTituloId(cdTitulo);
  const benef = Number(idBeneficiario);
  if (!Number.isInteger(benef) || benef <= 0) {
    throw new Error("idBeneficiario invalido");
  }
  
  const safeTable = sanitizeTable("Autorizacao..vw_Autorizacao");
  const q = `
    SELECT ${topClause()} * FROM ${safeTable}
    WHERE cd_titulo = @cdTitulo AND id_Beneficiario = @idBeneficiario
    ORDER BY data_solicitacao DESC
  `;
  return queryRows(q, { cdTitulo: titulo, idBeneficiario: benef });
}
