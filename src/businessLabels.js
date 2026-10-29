const FIELD_LABELS = {
  id_Autorizacao: "Identificador da autorizacao",
  id_AutorizacaoDetalhe: "Identificador do detalhe da autorizacao",
  id_AutorizacaoOcorrencia: "Identificador da ocorrencia da autorizacao",
  id_AutorizacaoDetalheOcorrencia: "Identificador do detalhe da ocorrencia",
  id_Ocorrencia: "Identificador da ocorrencia",
  id_Beneficiario: "Identificador do beneficiario",
  id_Prestador: "Identificador do prestador",
  id_Status: "Status",
  id_Documento: "Identificador do documento",
  id_Atendimento: "Identificador do atendimento",
  id_chamado: "Identificador do chamado",
  id_chamado_origem: "Identificador do chamado de origem",
  id_Protocolo: "Identificador do protocolo",
  id_TipoServico: "Tipo de servico",
  id_AutorizacaoTipo: "Tipo de autorizacao",
  data_solicitacao: "Data da solicitacao",
  data_prevista: "Data prevista",
  data_liberacao: "Data de liberacao",
  data_alta: "Data de alta",
  data_realizacao: "Data de realizacao",
  dt_Solicitacao: "Data da solicitacao",
  dt_Prevista: "Data prevista",
  dt_Realizacao: "Data de realizacao",
  dt_nascimento: "Data de nascimento",
  dh_Entrada: "Data de entrada",
  dh_InicioFluxo: "Data de inicio do fluxo",
  dh_InicioFluxoDetalhe: "Data de inicio do fluxo do detalhe",
  dh_inicio_fluxo: "Data de inicio do fluxo",
  dh_fim_fluxo: "Data de fim do fluxo",
  dh_AlteracaoData: "Data de alteracao do registro",
  dh_atende_inicio: "Data de inicio do atendimento",
  dh_encerramento: "Data de encerramento",
  ds_Status: "Descricao do status",
  ds_AutorizacaoTipo: "Descricao do tipo de autorizacao",
  ds_TipoServico: "Descricao do tipo de servico",
  ds_Beneficiario: "Nome do beneficiario",
  ds_Prestador: "Nome do prestador",
  ds_PrestadorSolicitante: "Prestador solicitante",
  ds_PrestadorExecutante: "Prestador executante",
  ds_PrestadorLocal: "Prestador do local de atendimento",
  ds_Ocorrencia_AutorizacaoDetalhe: "Detalhe da ocorrencia",
  ds_Observacao: "Observacoes da ocorrencia",
  ds_assunto: "Assunto do chamado",
  ds_Servico: "Descricao do servico",
  ds_honorario: "Descricao do honorario",
  ds_Credencial: "Numero da credencial",
  cd_Titulo: "Grupo familiar do associado",
  cd_titulo: "Grupo familiar do associado",
  sq_Beneficiario: "Sequencial do beneficiario",
  sq_beneficiario: "Sequencial do beneficiario",
  cd_Plano: "Codigo do plano",
  tp_pendencia: "Tipo de pendencia",
  tp_Auditoria: "Tipo de auditoria",
  tp_auditoria: "Tipo de auditoria",
  nm_AlteracaoLogin: "Usuario que alterou o registro",
  nr_ProtocoloANS: "Numero do protocolo ANS",
  nr_Guia: "Numero da guia",
  vl_Autorizacao: "Valor da autorizacao",
  vl_Copagamento: "Valor do copagamento",
  vl_Franquia: "Valor da franquia"
};

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toBusinessLabels(rawText) {
  let text = String(rawText || "");

  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    const pattern = new RegExp(`\\b${escapeRegex(field)}\\b`, "gi");
    text = text.replace(pattern, label);
  }

  // Camada extra para reduzir residuos tecnicos no resultado final.
  text = text
    .replace(/\btool(s)?\b/gi, "fonte de dados")
    .replace(/\bapi(s)?\b/gi, "sistema")
    .replace(/\bdatabase\b|\bbanco de dados\b/gi, "sistema")
    .replace(/\bquery\b|\bqueries\b/gi, "consulta")
    .replace(/\bsocket hang up\b/gi, "falha de comunicacao entre sistemas");

  return text;
}
