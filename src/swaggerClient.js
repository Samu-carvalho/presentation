// src/swaggerClient.js
import fs from 'fs';
import httpntlm from 'httpntlm';
import { MOCK_DADOS } from './mockDados.js';

// ===== CONFIGURAÇÕES =====
const BASE_URL = process.env.SWAGGER_BASE_URL || 'https://belarus.omint.com.br/sinistralidade/api';
const API_TOKEN = process.env.SWAGGER_API_TOKEN;
const CHAVE_URL_LOGIN = process.env.SWAGGER_CHAVE_URL_LOGIN;

// Credenciais AD para NTLM
const AD_DOMINIO = process.env.AD_DOMINIO || 'OMINT';
const AD_USUARIO = process.env.AD_USUARIO;
const AD_SENHA = process.env.AD_SENHA;

let cachedToken = null;
let tokenExpiry = 0;

// ===== OBTENÇÃO DE TOKEN VIA NTLM =====
async function obterTokenViaNTLM() {
  if (!AD_USUARIO || !AD_SENHA) {
    throw new Error('Credenciais AD não configuradas. Defina AD_USUARIO e AD_SENHA no .env');
  }

  const mvcUrl = 'https://berna.omint.com.br/sinistralidade/mvc/home/RetornarToken';
  const urlRetorno = 'https://belarus.omint.com.br/sinistralidade/api/api/sistema/versao';
  const fullUrl = `${mvcUrl}?url=${encodeURIComponent(urlRetorno)}`;

  return new Promise((resolve, reject) => {
    httpntlm.get({
      url: fullUrl,
      username: AD_USUARIO,
      password: AD_SENHA,
      domain: AD_DOMINIO,
      followRedirect: false,
    }, (err, res) => {
      if (err) return reject(err);

      // res.headers['set-cookie'] pode ser string ou array
      let setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'];
      if (!setCookie) {
        return reject(new Error('Set-Cookie header não encontrado.'));
      }
      // Se for array, junta em uma string
      if (Array.isArray(setCookie)) {
        setCookie = setCookie.join('; ');
      }
      // Extrai o token do cookie
      const match = setCookie.match(/tokenSinistralidade=([^;]+)/);
      if (match) {
        resolve(match[1]);
      } else {
        reject(new Error('Token não encontrado no cookie.'));
      }
    });
  });
}

// ===== OBTENÇÃO DE TOKEN VIA CHAVE_URL_LOGIN (fallback) =====
async function fetchTokenFromLogin() {
  if (!CHAVE_URL_LOGIN) return null;
  const url = `${BASE_URL}/token`;
  const body = new URLSearchParams({ grant_type: 'password', ChaveURLLogin: CHAVE_URL_LOGIN });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Swagger] Falha ao obter token (${response.status}): ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (!data.access_token) {
      console.error('[Swagger] Resposta sem access_token:', data);
      return null;
    }
    const expiresIn = data.expires_in || 3600;
    return { token: data.access_token, expiresOn: Date.now() + expiresIn * 1000 };
  } catch (err) {
    console.error('[Swagger] Erro ao chamar /token:', err.message);
    return null;
  }
}

// ===== OBTÉM TOKEN VÁLIDO (COM CACHE E PRIORIDADES) =====
async function getValidToken() {
  // Se o token em cache ainda é válido
  if (cachedToken && tokenExpiry > Date.now() + 30000) return cachedToken;

  // 1. PRIORIDADE: NTLM (se credenciais AD estiverem configuradas)
  if (AD_USUARIO && AD_SENHA) {
    try {
      const token = await obterTokenViaNTLM();
      cachedToken = token;
      tokenExpiry = Date.now() + 3600 * 1000; // 1h estimada (o token real pode durar mais)
      console.log('[Swagger] Token obtido via NTLM com sucesso.');
      return token;
    } catch (err) {
      console.error('[Swagger] Falha ao obter token via NTLM:', err.message);
      // Continua para os fallbacks
    }
  }

  // 2. Token fixo do .env (fallback)
  if (API_TOKEN) {
    cachedToken = API_TOKEN;
    tokenExpiry = Date.now() + 3600 * 1000;
    console.log('[Swagger] Usando token da variável de ambiente (fallback).');
    return cachedToken;
  }

  // 3. ChaveURLLogin (último recurso)
  const tokenData = await fetchTokenFromLogin();
  if (tokenData) {
    cachedToken = tokenData.token;
    tokenExpiry = tokenData.expiresOn;
    console.log('[Swagger] Token obtido via ChaveURLLogin.');
    return cachedToken;
  }

  throw new Error('Não foi possível obter token. Configure AD_USUARIO/AD_SENHA, SWAGGER_API_TOKEN ou SWAGGER_CHAVE_URL_LOGIN.');
}

// ===== REQUISIÇÃO À API =====
async function fetchFromSwagger(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;
  const isPublic = endpoint.includes('/sistema/versao');
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Node.js/22',
    ...options.headers,
  };

  if (!isPublic) {
    const token = await getValidToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[Swagger] Chamando: ${url}`);
  console.log(`[Swagger] Headers: Authorization=${headers.Authorization ? '***' : 'none'}`);

  try {
    const response = await fetch(url, { ...options, headers });

    console.log(`[Swagger] Status: ${response.status} ${response.statusText}`);
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'authorization') {
        console.log(`[Swagger] Header: ${key}: ${value}`);
      }
    }

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Não foi possível ler o corpo do erro.';
      }
      console.error(`[Swagger] Corpo do erro (${response.status}):`, errorBody);
      throw new Error(`Erro ${response.status} em ${endpoint}: ${errorBody.substring(0, 500)}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await response.json();
      console.log('[Swagger] Resposta JSON completa:', JSON.stringify(body, null, 2));

      if (process.env.DEBUG_SWAGGER === 'true') {
        fs.appendFileSync('saida.json', JSON.stringify(body, null, 2) + '\n');
      }
      
    } else {
      body = await response.text();
      console.log(`[Swagger] Resposta não-JSON (primeiros 200 caracteres):`, body.substring(0, 200));
    }

    if (contentType.includes('application/json')) {
      return body;
    } else {
      return { _raw: body, _contentType: contentType };
    }
  } catch (err) {
    console.error(`[Swagger] Exceção em ${endpoint} (${url}):`, err.message);
    throw err;
  }
}

// ===== ENDPOINTS =====
export async function getVersao() {
  return fetchFromSwagger('/api/sistema/versao');
}

export async function getEmpresas() {
  return fetchFromSwagger('/api/empresa/dados-empresa');
}

/**
 * Normaliza datas de consulta para cobrir meses civis completos (do dia 01 ao último dia do mês).
 * Evita divergências na procedure da Omint onde Despesa é por competência cheia e Receita/Vidas filtram por dt_Movimento.
 */
export function normalizarDatasCompetencia(dataInicial, dataFinal) {
  let dtIni = String(dataInicial || '').trim();
  let dtFim = String(dataFinal || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dtIni)) {
    const [anoIni, mesIni] = dtIni.split('-');
    dtIni = `${anoIni}-${mesIni}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dtFim)) {
    const [anoFim, mesFim] = dtFim.split('-');
    const ultimoDia = new Date(Number(anoFim), Number(mesFim), 0).getDate();
    dtFim = `${anoFim}-${mesFim}-${String(ultimoDia).padStart(2, '0')}`;
  }

  return { dataInicial: dtIni, dataFinal: dtFim };
}

export async function getRelatorioCabecalho(cdEmpresa, dataInicial, dataFinal, empresaOuGrupo = 2) {
  const norm = normalizarDatasCompetencia(dataInicial, dataFinal);
  const params = new URLSearchParams({
    cdEmpresa: String(cdEmpresa).trim(),
    empresaOuGrupo: String(empresaOuGrupo),
    dataInicial: norm.dataInicial,
    dataFinal: norm.dataFinal,
  });
  return fetchFromSwagger(`/api/relatorio/RelatorioCabecalho?${params.toString()}`);
}

export async function getMatrizAcesso() {
  return fetchFromSwagger('/api/matrizacesso/matriz-completa');
}

export async function getConfiguracoes() {
  return fetchFromSwagger('/api/Configuracao');
}

export async function getVisualizacoesUsuario() {
  return fetchFromSwagger('/api/usuario/visualizados');
}

export async function getDataLimite() {
  return fetchFromSwagger('/api/relatorio/data-limite');
}

export async function getRangeReajuste(mesAniversario) {
  return fetchFromSwagger(`/api/relatorio/RangeReajuste?mesAniversario=${mesAniversario}`);
}

// ===== RELATÓRIOS CONSOLIDADOS =====
export async function getRelatorio(idRelatorio, codigoEmpresa, dataInicial, dataFinal, empresaGrupo = null) {
  const norm = normalizarDatasCompetencia(dataInicial, dataFinal);
  const params = new URLSearchParams({
    idRelatorio: String(idRelatorio),
    codigoEmpresa: String(codigoEmpresa).trim(),
    dataInicial: norm.dataInicial,
    dataFinal: norm.dataFinal,
  });
  if (empresaGrupo !== null && empresaGrupo !== undefined) {
    params.append('empresaGrupo', String(empresaGrupo));
  }
  return fetchFromSwagger(`/api/Relatorio?${params.toString()}`);
}

export async function getTodosRelatorios(codigoEmpresa, dataInicial, dataFinal, ids = null, empresaGrupo = null) {
  const idsRelatorio = ids || Array.from({ length: 22 }, (_, i) => i + 1);
  const batchSize = 5;
  const resultados = [];
  for (let i = 0; i < idsRelatorio.length; i += batchSize) {
    const batch = idsRelatorio.slice(i, i + batchSize);
    const promises = batch.map(id =>
      getRelatorio(id, codigoEmpresa, dataInicial, dataFinal, empresaGrupo)
        .then(data => ({ id, data, ok: true }))
        .catch(err => ({ id, error: err.message, ok: false }))
    );
    const batchResults = await Promise.all(promises);
    resultados.push(...batchResults);
    if (i + batchSize < idsRelatorio.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return resultados;
}

// ===== FUNÇÃO PRINCIPAL – TENTA API REAL, FALLBACK PARA MOCK =====
// No topo, já temos import { MOCK_DADOS } from './mockDados.js';

export async function getDadosApresentacao(cdEmpresa, dataInicial, dataFinal, forcarMock = false) {
  if (forcarMock || process.env.FORCAR_MOCK === 'true') {
    console.log('[Apresentação] Forçando uso de mock para cdEmpresa=' + cdEmpresa);
    return _usarMock(cdEmpresa, dataInicial, dataFinal);
  }
  console.log(`[Apresentação] Buscando dados para cdEmpresa=${cdEmpresa}, dataInicial=${dataInicial}, dataFinal=${dataFinal}`);

  try {
    const resultado = await _buscarDadosReais(cdEmpresa, dataInicial, dataFinal);

    // Verifica se há dados reais (considerando qualquer formato)
    const temDados = resultado.relatorio && (resultado.relatorio.EmpresaMae || resultado.relatorio.DtInicial || (Array.isArray(resultado.relatorio.Dados) && resultado.relatorio.Dados.length > 0));

    // Verifica se há pelo menos um relatório com dados (independente de ok)
    // Verifica se há pelo menos um relatório com dados (independente de ok)
    const temRelatorioComDados = resultado.relatorios && resultado.relatorios.some(r => {
      const dados = r.data;
      if (!dados) return false;
      // Caso 1: objeto com Dados (ex: { Ordem:1, Dados:[...] })
      if (dados.Dados && Array.isArray(dados.Dados) && dados.Dados.length > 0) return true;
      // Caso 2: objeto com value (ex: { value: [...], Count: ... })
      if (dados.value && Array.isArray(dados.value) && dados.value.length > 0) return true;
      // Caso 3: array direto (ex: [{...}])
      if (Array.isArray(dados) && dados.length > 0) return true;
      return false;
    });

    if (temDados && temRelatorioComDados) {
      console.log('[Apresentação] Dados obtidos da API com sucesso.');
      resultado._modoFallback = false;
      resultado._origemDados = 'api';
      return resultado;
    }

    console.warn('[Apresentação] API retornou dados insuficientes. Usando mock como fallback.');
    return _usarMock(cdEmpresa, dataInicial, dataFinal);
  } catch (err) {
    console.error('[Apresentação] Erro na API, usando mock:', err.message);
    return _usarMock(cdEmpresa, dataInicial, dataFinal);
  }
}

// ===== FUNÇÃO AUXILIAR PARA USAR O MOCK =====
function _usarMock(cdEmpresa, dataInicial, dataFinal) {
  const mock = JSON.parse(JSON.stringify(MOCK_DADOS));
  if (cdEmpresa) {
    const normCd = (v) => String(v || '').trim().replace(/^0+/, '');
    const empresaEncontrada = mock.empresas.find(e => normCd(e.Cod_Empresa) === normCd(cdEmpresa));
    if (empresaEncontrada && empresaEncontrada.Razao !== 'TODAS') {
      mock.relatorio.EmpresaMae = empresaEncontrada.Razao;
    }
    mock._meta = { cdEmpresa };
  }
  if (dataInicial) mock.relatorio.DtInicial = dataInicial;
  if (dataFinal) mock.relatorio.DtFinal = dataFinal;

  mock._modoFallback = true;
  mock._origemDados = 'mock';

  if (MOCK_DADOS.inativos) {
    const norm = (v) => String(v || '').trim().replace(/^0+/, '');
    // Se a consulta foi diretamente na empresa de inativos, não gera duplicidade
    if (cdEmpresa && norm(cdEmpresa) === '56020-INAT') {
      mock.inativos = null;
    } else {
      mock.inativos = JSON.parse(JSON.stringify(MOCK_DADOS.inativos));
    }
  }

  console.log('[Apresentação] Mock carregado para:', mock.relatorio.EmpresaMae, mock.inativos ? '(com inativos)' : '(sem inativos)');
  return mock;
}

// ===== INATIVOS (LEI 9.656/98 ART. 30/31) =====
export function localizarEmpresasInativas(empresas, cdEmpresa) {
  if (!Array.isArray(empresas) || !empresas.length || !cdEmpresa) return [];
  const norm = (v) => String(v || '').trim().replace(/^0+/, '');
  const cdBuscado = norm(cdEmpresa);

  let empresaAlvo = empresas.find((e) => norm(e.Cod_Empresa) === cdBuscado);
  if (!empresaAlvo) {
    empresaAlvo = empresas.find((e) => String(e.Nr_Coletivo || '') === cdBuscado);
  }
  if (!empresaAlvo) return [];

  // Se a própria empresa consultada for de inativos, não gera duplicidade
  if (/inativ/i.test(empresaAlvo.Razao || '')) return [];

  const coletivoAlvo = empresaAlvo.Nr_Coletivo || (empresaAlvo.Razao === 'TODAS' ? Number(empresaAlvo.Cod_Empresa) : null);
  const empresaMaeAlvo = String(empresaAlvo.EmpresaMae || empresaAlvo.Razao || '').trim().toLowerCase();

  const filtradas = empresas.filter((e) => {
    const cd = norm(e.Cod_Empresa);
    if (cd === cdBuscado) return false;
    if (!/inativ/i.test(e.Razao || '')) return false;

    const mesmoColetivo = coletivoAlvo && e.Nr_Coletivo === coletivoAlvo;
    const mesmaMae = empresaMaeAlvo && String(e.EmpresaMae || '').trim().toLowerCase() === empresaMaeAlvo;

    return mesmoColetivo || mesmaMae;
  });

  // Deduplica por código de empresa
  const unicos = new Map();
  filtradas.forEach((e) => {
    const cd = norm(e.Cod_Empresa);
    if (!unicos.has(cd)) unicos.set(cd, e);
  });
  return Array.from(unicos.values());
}

export async function buscarRelatoriosInativos(empresasInativas, dataInicial, dataFinal) {
  const empresaGrupoInativos = process.env.SWAGGER_EMPRESA_GRUPO_INATIVOS !== undefined
    ? Number(process.env.SWAGGER_EMPRESA_GRUPO_INATIVOS)
    : 1;

  const resultados = [];
  for (const emp of empresasInativas) {
    let res = null;
    let ok = false;
    let err = null;
    try {
      res = await getRelatorio(1, emp.Cod_Empresa, dataInicial, dataFinal, empresaGrupoInativos);
      const itens = Array.isArray(res) ? res : res?.Dados || [];
      if (itens.length > 0) ok = true;
    } catch (e) { err = e; }

    // Fallback: se com empresaGrupo=1 não retornou dados, tenta empresaGrupo=2
    if (!ok) {
      try {
        const altGrupo = empresaGrupoInativos === 1 ? 2 : 1;
        const resAlt = await getRelatorio(1, emp.Cod_Empresa, dataInicial, dataFinal, altGrupo);
        const itensAlt = Array.isArray(resAlt) ? resAlt : resAlt?.Dados || [];
        if (itensAlt.length > 0) {
          res = resAlt;
          ok = true;
        }
      } catch (_) {}
    }

    if (ok) {
      resultados.push({
        empresa: emp,
        idRelatorio: 1,
        data: res,
        ok: true
      });
    } else {
      console.warn(`[Apresentação] Falha ao buscar R1 para inativo ${emp.Cod_Empresa} (${emp.Razao}):`, err?.message || 'Sem dados');
      resultados.push({
        empresa: emp,
        idRelatorio: 1,
        data: res,
        error: err?.message || 'Sem dados',
        ok: false
      });
    }
  }
  return resultados;
}

// ===== FUNÇÃO PARA BUSCAR DADOS REAIS DA API =====
async function _buscarDadosReais(cdEmpresa, dataInicial, dataFinal) {
  console.log(`[Apresentação] Iniciando busca real com cdEmpresa=${cdEmpresa}, dataInicial=${dataInicial}, dataFinal=${dataFinal}`);
  const empresaGrupo = 2;
  try {
    const versao = await getVersao();
    console.log('[Apresentação] Versão da API obtida:', versao);
  } catch (err) {
    console.warn('[Apresentação] Não foi possível obter versão:', err.message);
  }

  let empresas = [];
  let relatorio = { Dados: [] };
  let matriz = [];
  let configs = [];
  let visu = [];
  let relatorios = [];

  try {
    console.log('[Apresentação] Buscando empresas...');
    empresas = await getEmpresas();
    console.log(`[Apresentação] Empresas obtidas: ${Array.isArray(empresas) ? empresas.length : 'não é array'}`);
  } catch (err) {
    console.error('[Apresentação] Erro em empresas:', err.message);
  }

  try {
    console.log('[Apresentação] Buscando relatório cabeçalho...');
    relatorio = await getRelatorioCabecalho(cdEmpresa, dataInicial, dataFinal, empresaGrupo);
    console.log(`[Apresentação] Relatório obtido:`, relatorio);
  } catch (err) {
    console.error('[Apresentação] Erro em relatório:', err.message);
    relatorio = { Dados: [] };
  }

  try {
    console.log('[Apresentação] Buscando matriz de acesso...');
    matriz = await getMatrizAcesso();
    console.log(`[Apresentação] Matriz obtida: ${Array.isArray(matriz) ? matriz.length : 'não é array'}`);
  } catch (err) {
    console.error('[Apresentação] Erro em matriz:', err.message);
    matriz = [];
  }

  try {
    console.log('[Apresentação] Buscando configurações...');
    configs = await getConfiguracoes();
    console.log(`[Apresentação] Configurações obtidas: ${Array.isArray(configs) ? configs.length : 'não é array'}`);
  } catch (err) {
    console.error('[Apresentação] Erro em configurações:', err.message);
    configs = [];
  }

  try {
    console.log('[Apresentação] Buscando visualizações de usuário...');
    visu = await getVisualizacoesUsuario();
    console.log(`[Apresentação] Visualizações obtidas: ${Array.isArray(visu) ? visu.length : 'não é array'}`);
  } catch (err) {
    console.error('[Apresentação] Erro em visualizações:', err.message);
    visu = [];
  }

  // Se não foi possível obter nem a lista de empresas nem o cabeçalho desta empresa,
  // a empresa não existe na API ou não há autorização. Abortamos para acionar o fallback imediatamente
  // sem ter que esperar o timeout de 36 relatórios.
  if (empresas.length === 0 && (!relatorio || (!relatorio.EmpresaMae && (!relatorio.Dados || relatorio.Dados.length === 0)))) {
    console.warn('[Apresentação] Falha em empresas e cabeçalho na API real. Acionando fallback sem aguardar todos os relatórios.');
    throw new Error('Falha de comunicação ou dados não encontrados na API Swagger.');
  }

  console.log('[Apresentação] Buscando todos os relatórios...');
  try {
    relatorios = await getTodosRelatorios(cdEmpresa, dataInicial, dataFinal, null, empresaGrupo);
    console.log(`[Apresentação] Relatórios obtidos: ${relatorios.length}`);
  } catch (err) {
    console.error('[Apresentação] Erro ao buscar relatórios:', err.message);
    relatorios = [];
  }

  let inativos = null;
  try {
    const empresasInativas = localizarEmpresasInativas(empresas, cdEmpresa);
    if (empresasInativas.length > 0) {
      console.log(`[Apresentação] Encontradas ${empresasInativas.length} empresa(s) inativa(s) no coletivo:`, empresasInativas.map((e) => e.Razao));
      const relsInat = await buscarRelatoriosInativos(empresasInativas, dataInicial, dataFinal);
      inativos = {
        empresas: empresasInativas,
        relatorios: relsInat
      };
    }
  } catch (err) {
    console.warn('[Apresentação] Falha ao processar inativos (prosseguindo sem inativos):', err.message);
  }

  return { empresas, relatorio, matriz, configs, visu, relatorios, inativos };
}