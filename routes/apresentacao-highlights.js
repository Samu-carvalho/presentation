// routes/apresentacao-highlights.js  (ESM — o projeto usa "type": "module")
//
// Endpoints:
//   GET    /api/apresentacao/highlights?cdEmpresa=&dataInicial=&dataFinal=
//   PUT    /api/apresentacao/highlights            (salva o conjunto editado)
//   POST   /api/apresentacao/highlights/gerar      (gera frases com Azure OpenAI)
//
// Variáveis de ambiente:
//   AZURE_OPENAI_ENDPOINT        https://<recurso>.openai.azure.com
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_DEPLOYMENT
//   AZURE_OPENAI_API_VERSION     (opcional, padrão 2025-01-01-preview)
//   AZURE_OPENAI_MAX_TOKENS      (opcional, padrão 4000)
//   AZURE_OPENAI_REASONING_EFFORT(opcional, padrão low)
//   AZURE_OPENAI_TIMEOUT_MS      (opcional, padrão 60000)
//   HTTPS_PROXY / HTTP_PROXY     (opcional — o fetch nativo do Node ignora essas
//                                 variáveis; aqui elas são honradas via undici.
//                                 Requer `npm i undici`.)
//   NODE_EXTRA_CA_CERTS          (se o proxy faz inspeção TLS: caminho do .pem da CA)

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const router = express.Router();

const DIR = path.join(process.cwd(), 'data', 'highlights');
const LIMITE_CARACTERES = 140;

/* ============================================================
   Persistência
   ============================================================ */

const FORMATO_EMPRESA = /^[0-9A-Za-z_-]{1,32}$/;
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function chaveArquivo({ cdEmpresa, dataInicial, dataFinal }) {
  if (!cdEmpresa) throw new Error('cdEmpresa é obrigatório');
  if (!FORMATO_EMPRESA.test(String(cdEmpresa))) throw new Error('cdEmpresa inválido');
  [dataInicial, dataFinal].forEach((d) => {
    if (d && !FORMATO_DATA.test(String(d))) throw new Error('data inválida (use AAAA-MM-DD)');
  });
  return [cdEmpresa, dataInicial || 'sem-inicio', dataFinal || 'sem-fim'].join('_') + '.json';
}

async function lerHighlights(params) {
  // Highlights e textos não são mantidos salvos em disco (gerados/mantidos na sessão atual)
  return null;
}

async function gravarHighlights(params, corpo) {
  const registro = {
    cdEmpresa: params.cdEmpresa,
    periodo: { dataInicial: params.dataInicial, dataFinal: params.dataFinal },
    atualizadoEm: new Date().toISOString(),
    highlights: {}, // Highlights não são mantidos salvos em disco (gerados a cada carregamento)
    textos: {}, // Textos e comentários não são gravados no PC para sempre (mantidos na sessão)
  };
  return registro;
}

/* ============================================================
   Azure OpenAI
   ============================================================ */

function configAzure() {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').trim().replace(/\/+$/, '');
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
  const faltando = [
    !endpoint && 'AZURE_OPENAI_ENDPOINT',
    !apiKey && 'AZURE_OPENAI_API_KEY',
    !deployment && 'AZURE_OPENAI_DEPLOYMENT',
  ].filter(Boolean);
  if (faltando.length) throw new Error('Variáveis de ambiente ausentes: ' + faltando.join(', '));
  if (!/^https:\/\/[^/\s]+$/i.test(endpoint)) {
    throw new Error(`AZURE_OPENAI_ENDPOINT inválido ("${endpoint}"). Esperado: https://<recurso>.openai.azure.com`);
  }
  return {
    url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    apiKey,
    deployment,
    timeoutMs: Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 60000),
  };
}

/**
 * O fetch nativo do Node não lê HTTP(S)_PROXY. Se a variável existir,
 * roteia a chamada por um ProxyAgent do undici (dependência opcional).
 */
let dispatcherPromise = null;
function obterDispatcher() {
  if (dispatcherPromise) return dispatcherPromise;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  dispatcherPromise = (async () => {
    if (!proxy) return undefined;
    try {
      const { ProxyAgent } = await import('undici');
      console.log(`[Highlights] usando proxy ${proxy.replace(/\/\/[^@]+@/, '//***@')}`);
      return new ProxyAgent(proxy);
    } catch {
      console.warn('[Highlights] HTTPS_PROXY definido, mas o pacote "undici" não está instalado (npm i undici). Chamando sem proxy.');
      return undefined;
    }
  })();
  return dispatcherPromise;
}

/** Explica um "fetch failed" com a causa real (DNS, conexão, TLS, timeout). */
function descreverFalhaDeRede(err, url) {
  const host = (() => { try { return new URL(url).host; } catch { return url; } })();
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    return `Tempo esgotado ao chamar ${host}. Verifique proxy/firewall de saída.`;
  }
  const c = err.cause || {};
  const codigo = c.code || c.name || '';
  const dicas = {
    ENOTFOUND: 'DNS não resolveu o host — confira AZURE_OPENAI_ENDPOINT e se há acesso à internet (proxy?).',
    EAI_AGAIN: 'Falha temporária de DNS — provável ausência de saída direta; configure HTTPS_PROXY.',
    ECONNREFUSED: 'Conexão recusada — a rede exige proxy de saída (HTTPS_PROXY) ou o host está errado.',
    ETIMEDOUT: 'Sem resposta do host — firewall/proxy bloqueando a saída.',
    ECONNRESET: 'Conexão derrubada no meio — inspeção TLS ou proxy instável.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Certificado não confiável — defina NODE_EXTRA_CA_CERTS com a CA corporativa.',
    SELF_SIGNED_CERT_IN_CHAIN: 'Certificado autoassinado na cadeia (proxy TLS) — defina NODE_EXTRA_CA_CERTS.',
    CERT_HAS_EXPIRED: 'Certificado expirado na cadeia.',
    ERR_INVALID_URL: 'URL inválida — confira AZURE_OPENAI_ENDPOINT/DEPLOYMENT/API_VERSION.',
  };
  const dica = dicas[codigo] || '';
  return `Não foi possível conectar a ${host}${codigo ? ` [${codigo}]` : ''}${c.message ? `: ${c.message}` : ''}. ${dica}`.trim();
}

/**
 * gpt-5-mini aceita max_completion_tokens (não max_tokens) e não aceita
 * temperature customizada. Algumas api-versions não conhecem
 * reasoning_effort / response_format — tentamos variações em ordem
 * decrescente de recursos até uma passar.
 */
function variacoesDeCorpo(messages) {
  const base = { messages };
  const teto = Number(process.env.AZURE_OPENAI_MAX_TOKENS || 8000);
  const esforco = process.env.AZURE_OPENAI_REASONING_EFFORT || 'low';
  return [
    { ...base, max_completion_tokens: teto, response_format: { type: 'json_object' }, reasoning_effort: esforco },
    { ...base, max_completion_tokens: teto, response_format: { type: 'json_object' } },
    { ...base, max_completion_tokens: teto },
    { ...base, max_tokens: teto },
  ];
}

async function chamarAzure(messages) {
  const { url, apiKey, deployment, timeoutMs } = configAzure();
  const dispatcher = await obterDispatcher();
  let ultimoErro = null;

  for (const corpo of variacoesDeCorpo(messages)) {
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(timeoutMs),
        ...(dispatcher ? { dispatcher } : {}),
      });
    } catch (err) {
      // "fetch failed" genérico → explica a causa real e para (não adianta tentar outro corpo)
      const detalhe = descreverFalhaDeRede(err, url);
      console.error('[Highlights] falha de rede:', detalhe, err.cause || '');
      throw new Error(detalhe);
    }

    const texto = await resp.text();

    if (resp.ok) {
      const json = JSON.parse(texto);
      const conteudo = json.choices?.[0]?.message?.content?.trim();
      const motivo = json.choices?.[0]?.finish_reason;
      if (!conteudo) {
        throw new Error(
          motivo === 'length'
            ? 'O modelo consumiu o limite de tokens antes de responder. Aumente AZURE_OPENAI_MAX_TOKENS.'
            : 'Azure OpenAI devolveu uma resposta vazia.'
        );
      }
      console.log(`[Highlights] ${deployment} respondeu (${json.usage?.total_tokens ?? '?'} tokens)`);
      return conteudo;
    }

    ultimoErro = `HTTP ${resp.status}: ${texto.slice(0, 400)}`;
    if (resp.status === 401 || resp.status === 403) ultimoErro += ' — confira AZURE_OPENAI_API_KEY.';
    if (resp.status === 404) ultimoErro += ' — confira AZURE_OPENAI_DEPLOYMENT e AZURE_OPENAI_API_VERSION.';
    // 400 costuma ser parâmetro não suportado → tenta a próxima variação
    if (resp.status !== 400) break;
    console.warn('[Highlights] parâmetro rejeitado, tentando corpo mais simples.');
  }

  throw new Error('Falha na chamada ao Azure OpenAI — ' + ultimoErro);
}

function truncarFraseSuave(str, limite = LIMITE_CARACTERES) {
  const s = String(str || '').trim();
  if (s.length <= limite) return s;

  const maxTexto = limite - 3;
  const sub = s.slice(0, maxTexto + 1);
  const ultimoEspaco = sub.lastIndexOf(' ');

  let cortado = (ultimoEspaco > 0 ? sub.slice(0, ultimoEspaco) : s.slice(0, maxTexto))
    .trimEnd()
    .replace(/[,;:\-\s]+$/, '');

  if (!/[.!?]$/.test(cortado)) {
    cortado += '...';
  }
  return cortado;
}

function extrairJson(texto) {
  if (!texto) throw new Error('Resposta vazia do modelo.');

  const limpar = (t) => {
    let s = String(t || '').trim();
    // Remove blocos de markdown
    s = s.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    // Isola entre a primeira chave e a última
    const ini = s.indexOf('{');
    const fim = s.lastIndexOf('}');
    if (ini >= 0 && fim > ini) s = s.slice(ini, fim + 1);

    // Remove comentários multi-linha e de linha única
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');
    s = s.replace(/(^|[^:\\])\/\/[^\r\n]*/g, '$1');

    // Remove vírgulas sobressalentes antes de } ou ]
    s = s.replace(/,\s*([\}\]])/g, '$1');
    s = s.replace(/,\s*([\}\]])/g, '$1');

    return s.trim();
  };

  // 1ª tentativa direta
  try {
    return JSON.parse(texto);
  } catch {}

  // 2ª tentativa com sanitização
  const sanitizado = limpar(texto);
  try {
    return JSON.parse(sanitizado);
  } catch (err) {
    console.error('[Highlights] Erro ao interpretar JSON da IA:', err.message, '\nTexto sanitizado:\n', sanitizado);
    throw new Error('Não foi possível interpretar a resposta do modelo como JSON.');
  }
}

/* ============================================================
   Prompt
   ============================================================ */

const SISTEMA = `Você é um analista sênior da Omint que escreve highlights para slides de uma apresentação comercial de um plano de saúde empresarial, no Brasil.

Para cada slide recebido, escreva UMA frase curta em português do Brasil que um corretor leria em voz alta ao apresentar aquele slide.

Regras:
- Máximo de ${LIMITE_CARACTERES} caracteres por frase.
- Use apenas os números presentes nos dados do slide. Nunca invente, arredonde para outro valor, nem projete tendências que os dados não mostram.
- Diga o que o número significa, não o que o slide contém. Nada de "este slide mostra", "o gráfico apresenta", "podemos observar".
- Se todos os valores forem zero ou "Sem Dados", escreva que não houve movimentação no período — não force um insight.
- Sem emoji, sem jargão de consultoria, sem superlativo vazio.
- Quando houver comparação (rede x livre escolha, empresa x benchmark, mês a mês), a frase deve apontar o lado que chama atenção.

Responda somente com JSON no formato:
{"highlights": {"<id do slide>": "<frase>"}}`;

function montarPromptUsuario({ contexto, slides, promptPersonalizado }) {
  const corpo = JSON.stringify(
    {
      empresa: contexto?.empresa || null,
      periodo: contexto?.periodo || null,
      slides: (slides || []).map((s) => ({
        id: s.id,
        titulo: s.titulo,
        secao: s.eyebrow || null,
        dados: s.dados || null,
      })),
    },
    null,
    1
  );
  const extra = String(promptPersonalizado || '').trim().slice(0, 1000);
  return extra ? `Orientação adicional do apresentador (respeite as regras acima):\n${extra}\n\nDados:\n${corpo}` : corpo;
}

/* ============================================================
   Rotas
   ============================================================ */

const corpoGrande = express.json({ limit: '4mb' });

router.get('/api/apresentacao/highlights', async (req, res) => {
  try {
    const registro = await lerHighlights(req.query);
    // Highlights não são mantidos entre cargas: sempre iniciam vazios para geração dinâmica
    res.json({
      ok: true,
      registro: {
        highlights: {},
        textos: registro?.textos || {},
      },
      novo: !registro,
    });
  } catch (err) {
    console.error('[Highlights] erro ao ler:', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.put('/api/apresentacao/highlights', corpoGrande, async (req, res) => {
  try {
    const { cdEmpresa, dataInicial, dataFinal, textos } = req.body || {};
    // Não persiste highlights no arquivo para evitar reuso/cache de sessões anteriores
    const registro = await gravarHighlights({ cdEmpresa, dataInicial, dataFinal }, { highlights: {}, textos });
    const countTxt = Object.keys(registro.textos || {}).length;
    console.log(`[Highlights] salvos ${countTxt} textos de ${cdEmpresa}`);
    res.json({ ok: true, registro });
  } catch (err) {
    console.error('[Highlights] erro ao salvar:', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/api/apresentacao/highlights/gerar', corpoGrande, async (req, res) => {
  const { contexto, slides, promptPersonalizado } = req.body || {};
  if (!Array.isArray(slides) || !slides.length) {
    return res.status(400).json({ ok: false, error: 'Nenhum slide enviado para geração.' });
  }

  try {
    console.log(`[Highlights] gerando ${slides.length} highlight(s)…`);
    const bruto = await chamarAzure([
      { role: 'system', content: SISTEMA },
      { role: 'user', content: montarPromptUsuario({ contexto, slides, promptPersonalizado }) },
    ]);

    const parsed = extrairJson(bruto);
    const recebidos = parsed.highlights || parsed;
    const highlights = {};

    slides.forEach((s) => {
      const frase = recebidos[s.id];
      if (typeof frase === 'string' && frase.trim()) {
        highlights[s.id] = {
          texto: truncarFraseSuave(frase),
          origem: 'ia',
          exibir: true,
          atualizadoEm: new Date().toISOString(),
        };
      }
    });

    const semResposta = slides.filter((s) => !highlights[s.id]).map((s) => s.id);
    if (semResposta.length) console.warn('[Highlights] sem frase para:', semResposta.join(', '));

    res.json({ ok: true, highlights, semResposta });
  } catch (err) {
    console.error('[Highlights] erro ao gerar:', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

export default router;