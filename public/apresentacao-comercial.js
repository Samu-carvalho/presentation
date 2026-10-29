/* ============================================================
   Omint · Apresentação Comercial — engine

   Camadas (de baixo para cima):
   1. Utilitários        números, formatos, períodos (MAR/26…)
   2. Dados              relatórios, filtros, assinaturas, pivot,
                         ordenação, agregação
   3. Componentes (UI)   cardKpi, badgeStatus, barraProgresso,
                         barraComparativa, funnel, tabelaExecutiva,
                         graficoLinha/Barras/Colunas, destaques…
                         → devolvem HTML; o mesmo HTML alimenta o
                         slide na tela e o palco do PDF.
   4. Renderizadores     um por tipo de bloco do config:
                         capa, secao, ficha, kpi, tabela, grafico,
                         resumoExecutivo, resultadoFinanceiro,
                         funnel, comparativo, diagnostico
   5. App                montagem, navegação, carga, PDF, API pública

   Contrato preservado com apresentacao-highlights.js:
   window.Apresentacao.{hooks, slides, dados, config, parametros,
   irPara, indiceAtual, redesenhar, remontar, formatar,
   getPromptPersonalizado}; slides com {id, titulo, eyebrow, html,
   className, vazio, dados, aceitaHighlight}.
   ============================================================ */
'use strict';

const CONFIG_URL = '/apresentacao-config.json';

let CONFIG = null;
let DADOS = null;
let SLIDES = [];
let atual = 0;

/* Modo da página: "edicao" (time comercial interno) ou "leitura" (portal da empresa).
   Definido em <body data-modo="leitura">. Em leitura não há edição nem drawer. */
const MODO = document.body.dataset.modo === 'leitura' ? 'leitura' : 'edicao';
const LEITURA = MODO === 'leitura';
const PARAMS_URL = new URLSearchParams(window.location.search);
let PARAMS_TOKEN = null;   // { cdEmpresa, dataInicial, dataFinal } resolvidos a partir de ?token=

let TEXTOS = {};           // textos livres por slide (bloco "texto"), persistidos junto aos highlights
let HL_SALVOS = {};        // highlights salvos — usados na barra quando o drawer não está carregado

const $ = (id) => document.getElementById(id);
const slidesContainer = $('slidesContainer');
const prevBtn = $('prevSlide');
const nextBtn = $('nextSlide');
const indicator = $('slideIndicator');
const downloadBtn = $('downloadPDF');
const carregarBtn = $('carregarDados');
const progressBar = $('progress-bar');
const cdEmpresaInput = $('cdEmpresa');
const dataInicialInput = $('dataInicial');
const dataFinalInput = $('dataFinal');
const ocultarVaziosChk = $('ocultarVazios');

/* ============================================================
   1. Utilitários
   ============================================================ */

const esc = (v) => {
  let s = String(v ?? '');
  s = s.replace(/\bpmpm\b/gi, 'mensal per capita');
  s = s.replace(/\bbenefici?(?:[aá\uFFFD]|&aacute;|&#225;)?ri[ao]s\b/gi, (m) =>
    m[0] === m[0].toUpperCase() ? 'Associados' : 'associados'
  );
  s = s.replace(/\bbenefici?(?:[aá\uFFFD]|&aacute;|&#225;)?ri[ao]\b/gi, (m) =>
    m[0] === m[0].toUpperCase() ? 'Associado' : 'associado'
  );
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

const SEM_DADOS = /^\s*sem\s*(dados?|informa)/i;

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || SEM_DADOS.test(s)) return null;

  // Detecta notação contábil negativa entre parênteses: (1.500,00), (R$ 1.500,00), (50,00%) etc.
  const strLimpa = s.replace(/[R$\s%]/g, '');
  const ehNegativoContabil = /^\(.*\)$/.test(strLimpa) || /^\s*\(.+\)\s*$/.test(s);
  s = strLimpa;

  const hasComma = s.includes(',');
  const dotCount = (s.match(/\./g) || []).length;

  if (hasComma) {
    if (dotCount > 0) {
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastComma > lastDot) {
        // Formato pt-BR: 1.250.000,50 -> remove pontos de milhar, vírgula vira ponto
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato en-US: 1,250,000.50 -> remove vírgulas de milhar
        s = s.replace(/,/g, '');
      }
    } else {
      // Apenas vírgula decimal: 1250,50 ou 12,5 -> vírgula vira ponto
      s = s.replace(',', '.');
    }
  } else if (dotCount > 1) {
    // Múltiplos pontos sem vírgula: 1.250.000 -> separadores de milhar pt-BR
    s = s.replace(/\./g, '');
  }

  const n = parseFloat(s.replace(/[^\d.\-]/g, ''));
  if (Number.isFinite(n)) {
    return ehNegativoContabil && n > 0 ? -n : n;
  }
  return null;
}

const brl = (n, dec = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const PREPOSICOES_NOME = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'por', 'para', 'com', 'no', 'na', 'nos', 'nas', 'ao', 'aos']);
const SIGLAS_PRESERVADAS = new Set([
  'sa', 's/a', 's.a', 's.a.', 'ltda', 'me', 'epp', 'eireli', 'cdb', 'dasa', 'hcor', 'ps', 'uti',
  'aacd', 'igesp', 'incor', 'icesp', 'fleury', 'delboni', 'lavoisier', 'salomao', 'sp', 'rj', 'mg',
  'df', 'pr', 'rs', 'ba', 'pe', 'ce', 'go', 'sc', 'es', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'
]);

function formatarNomeProprio(str) {
  if (!str) return '';
  const limpo = String(str).trim();
  if (!limpo || /^[*—-]+$/.test(limpo)) return limpo;

  return limpo
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, idx) => {
      const semPont = palavra.replace(/[.,;()\[\]"']/g, '');
      if (SIGLAS_PRESERVADAS.has(semPont) || SIGLAS_PRESERVADAS.has(palavra)) {
        return palavra.toUpperCase();
      }
      if (idx > 0 && PREPOSICOES_NOME.has(palavra)) {
        return palavra;
      }
      return palavra.replace(/(^|[-'’/(["])(\p{Ll})/gu, (match, sep, letra) => {
        return sep + letra.toUpperCase();
      });
    })
    .join(' ');
}

const FORMATOS = {
  texto: (v) => {
    if (v === null || v === undefined || v === '') return '—';
    const s = String(v).trim();
    if (s.toUpperCase() === 'DEPENDENTE') return 'Dependente';
    if (s.toUpperCase() === 'TITULAR') return 'Titular';
    return formatarRotulo(s);
  },
  nome: (v) => (v === null || v === undefined || v === '' ? '—' : formatarNomeProprio(v)),
  prestador: (v) => (v === null || v === undefined || v === '' ? '—' : formatarNomeProprio(v)),
  ranking: (v) => {
    const n = num(v);
    if (n === null) return (v === null || v === undefined || v === '') ? '—' : String(v).trim();
    return Math.round(n) + 'º';
  },
  vinculo: (v) => {
    if (v === null || v === undefined || v === '') return '—';
    const s = String(v).trim().toLowerCase();
    if (s.startsWith('dep')) return 'Dependente';
    if (s.startsWith('tit')) return 'Titular';
    return String(v).trim();
  },
  inteiro: (v) => (num(v) === null ? '—' : Math.round(num(v)).toLocaleString('pt-BR')),
  inteiroSinal: (v) => (num(v) === null ? '—' : (num(v) > 0 ? '+' : '') + Math.round(num(v)).toLocaleString('pt-BR')),
  decimal: (v) => (num(v) === null ? '—' : brl(num(v), 2)),
  decimal1: (v) => (num(v) === null ? '—' : brl(num(v), 1)),
  moeda: (v) => (num(v) === null ? '—' : 'R$ ' + brl(num(v), 2)),
  moedaInteira: (v) => (num(v) === null ? '—' : 'R$ ' + Math.round(num(v)).toLocaleString('pt-BR')),
  mil: (v) => (num(v) === null ? '—' : brl(num(v) / 1000, 1)),
  milhares: (v) => (num(v) === null ? '—' : brl(num(v) / 1000, 1)),
  moedaCurta: (v) => {
    const n = num(v);
    if (n === null) return '—';
    const a = Math.abs(n);
    if (a >= 1e6) return 'R$ ' + brl(n / 1e6, 1) + 'M';
    if (a >= 1e3) return 'R$ ' + brl(n / 1e3, 1) + 'K';
    return 'R$ ' + brl(n, 2);
  },
  percentual: (v) => (num(v) === null ? '—' : brl(num(v), 1) + '%'),
  percentual2: (v) => (num(v) === null ? '—' : brl(num(v), 2) + '%'),
  percentualInteiro: (v) => (num(v) === null ? '—' : Math.round(num(v)) + '%'),
  percentualSinal: (v) => (num(v) === null ? '—' : (num(v) > 0 ? '+' : '') + brl(num(v), 1) + '%'),
  pontos: (v) => (num(v) === null ? '—' : (num(v) > 0 ? '+' : '') + brl(num(v), 1) + ' p.p.'),
  variacao: (v) => (num(v) === null ? '—' : (num(v) > 0 ? '+' : '') + brl(num(v), 1) + '%'),
  data: (v) => {
    if (!v) return '—';
    const d = String(v).split('T')[0];
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  },
  booleano: (v) => (v === true ? 'Sim' : v === false ? 'Não' : '—'),
};
const FORMATOS_NUMERICOS = new Set(['inteiro', 'inteiroSinal', 'decimal', 'decimal1', 'mil', 'milhares', 'moeda', 'moedaCurta', 'moedaInteira', 'percentual', 'percentual2', 'percentualInteiro', 'pontos', 'variacao']);

function formatar(valor, formato = 'texto', escala) {
  if (escala && num(valor) !== null) {
    const n = num(valor);
    const strV = String(valor ?? '');
    if (formato.startsWith('percentual') && (escala === 100 || escala === 1)) {
      if (strV.includes('%') || Math.abs(n) > 1.0) {
        valor = n;
      } else {
        valor = n * escala;
      }
    } else {
      valor = n * escala;
    }
  }
  return (FORMATOS[formato] || FORMATOS.texto)(valor);
}

function pathGet(obj, path) {
  return String(path).split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function interpolar(template, ctx, fallback) {
  let matchedAny = false;
  const res = String(template).replace(/\{([^}|]+)(?:\|([a-zA-Z0-9]+))?\}/g, (_, path, fmt) => {
    const v = pathGet(ctx, path.trim());
    if (v !== null && v !== undefined && v !== '' && v !== '—' && v !== '-') {
      matchedAny = true;
    }
    return fmt ? formatar(v, fmt) : typeof v === 'string' ? v : formatar(v, 'texto');
  });
  if (!matchedAny && fallback !== undefined) return fallback;
  return res;
}

const rotuloCurto = (s, n = 28) => {
  const t = String(s ?? '').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/** Normaliza rótulos exibidos em tabelas, gráficos e cards substituindo menções a copay por coparticipação */
const formatarRotulo = (s) => {
  if (!s) return '';
  return String(s)
    .replace(/\bInt\.Cirurgica\b/gi, 'Int. Cirúrgica')
    .replace(/\bInt\.Cl[íi]nica\b/gi, 'Int. Clínica')
    .replace(/Despesa\s*\(liquida\s*de\s*copay\)/gi, 'Despesa líquida')
    .replace(/Despesa\s*\(liquida\s*de\s*coparticipa[çc][ãa]o\)/gi, 'Despesa líquida')
    .replace(/Despesa\s*\(l[íi]quida\s*de\s*coparticipa[çc][ãa]o\)/gi, 'Despesa líquida')
    .replace(/Impacto\s*copay\s*no\s*custo/gi, 'Impacto de coparticipação')
    .replace(/Impacto\s*copay/gi, 'Impacto de coparticipação')
    .replace(/\bcopay\b/gi, 'coparticipação')
    .replace(/\bCusto\s*PMPM\b/gi, 'Despesa por vida (mês)')
    .replace(/\bPMPM\b/g, 'Despesa por vida (mês)')
    .replace(/\bCusto\s*m[eé]dio\b/gi, 'Despesa média')
    .replace(/\bCusto\s*total\b/gi, 'Despesa total')
    .replace(/\bCusto\s*por\s*vida\b/gi, 'Despesa por vida')
    .replace(/\bCusto\s*acumulado\b/gi, 'Despesa acumulada')
    .replace(/\bCusto\s*estimado\b/gi, 'Despesa estimada')
    .replace(/\bCusto\s*unit[aá]rio\b/gi, 'Despesa unitária')
    .replace(/\bCusto\s*l[ií]quido\b/gi, 'Despesa líquida')
    .replace(/\bCusto\s*anterior\b/gi, 'Despesa anterior')
    .replace(/\bCusto\s*assistencial\b/gi, 'Despesa assistencial')
    .replace(/\bCusto\s*bruto\b/gi, 'Despesa bruta')
    .replace(/\bDo\s*custo\b/gi, 'Da despesa')
    .replace(/\bNo\s*custo\b/gi, 'Na despesa')
    .replace(/\bAo\s*custo\b/gi, 'À despesa')
    .replace(/\bCusto\b/g, 'Despesa')
    .replace(/\bcusto\b/g, 'despesa')
    .replace(/Δ\s*/g, 'Variação ')
    .replace(/Δ/g, 'Variação ')
    .replace(/^Total\s*\((?:Sexo|Gênero|Genero)\)$/i, 'Total por gênero')
    .replace(/\bTotal\s*\(Sexo\)/gi, 'Total por gênero');
};

/** estado visual a partir de um alerta { acima | abaixo | atencao | invertido } */
function estadoPorAlerta(n, alerta) {
  if (!alerta || n === null || n === undefined) return 'neutro';
  let e = 'neutro';
  if (alerta.acima != null) e = n > alerta.acima ? 'negativo' : 'positivo';
  if (alerta.abaixo != null) e = n < alerta.abaixo ? 'negativo' : e === 'neutro' ? 'positivo' : e;
  if (alerta.atencao != null && e === 'positivo' && n > alerta.atencao) e = 'alerta';
  if (alerta.invertido) e = e === 'negativo' ? 'positivo' : e === 'positivo' ? 'negativo' : e;
  return e;
}

/* ---------- períodos ---------- */

const MESES = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
const SIGLAS_MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const RE_PERIODO = /^\s*(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[\/\-\s]?(\d{2}|\d{4})\s*$/i;

function extrairAnoMes(str) {
  if (!str) return null;
  const s = String(str).trim();
  const mIso = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s);
  if (mIso) return { ano: Number(mIso[1]), mes: Number(mIso[2]) };
  const mBr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (mBr) return { ano: Number(mBr[3]), mes: Number(mBr[2]) };
  const d = new Date(s);
  if (!isNaN(d.getTime())) return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
  return null;
}

function gerarMesesPeriodo(dtIniStr, dtFimStr) {
  const pIni = extrairAnoMes(dtIniStr);
  const pFim = extrairAnoMes(dtFimStr);
  if (!pIni || !pFim) return [];

  const meses = [];
  let a = pIni.ano;
  let m = pIni.mes;
  while (a < pFim.ano || (a === pFim.ano && m <= pFim.mes)) {
    const sigla = SIGLAS_MESES[m - 1];
    const ano2 = String(a).slice(-2);
    meses.push(`${sigla}/${ano2}`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return meses;
}

function chavePeriodo(v) {
  const m = RE_PERIODO.exec(String(v ?? ''));
  if (!m) return null;
  let ano = Number(m[2]);
  if (ano < 100) ano += 2000;
  return ano * 100 + MESES[m[1].toUpperCase()];
}

function ehListaPeriodos(valores) {
  const n = valores.filter((v) => chavePeriodo(v) !== null).length;
  return n > 0 && n >= Math.ceil(valores.length / 2);
}

function ordenarPorPeriodo(lista, pegar = (x) => x) {
  const idx = lista.map((item, i) => ({ item, i, k: chavePeriodo(pegar(item)) }));
  const periodos = idx.filter((x) => x.k !== null).sort((a, b) => a.k - b.k || a.i - b.i);
  const resto = idx.filter((x) => x.k === null);
  return [...periodos, ...resto].map((x) => x.item);
}

/* ============================================================
   2. Dados
   ============================================================ */

const CACHE_ITENS = new Map();
const CACHE_ASSINATURA = new Map();
function limparCaches() { CACHE_ITENS.clear(); CACHE_ASSINATURA.clear(); }

function registroRelatorio(id) {
  return (DADOS?.relatorios || []).find((r) => Number(r.id) === Number(id));
}

function nomeRelatorio(id) {
  const daMatriz = (DADOS?.matriz || []).find((m) => Number(m.cd_MatrizAcesso) === Number(id));
  return daMatriz?.ds_Relatorio || CONFIG?.relatorios?.[String(id)] || `Relatório ${id}`;
}

/** Achata [{Ordem, Tipo, Dados:[{Grupo,Coluna,Linha,Valor}]}] em uma lista plana */
function itensDoRelatorio(id) {
  const chave = Number(id);
  if (CACHE_ITENS.has(chave)) return CACHE_ITENS.get(chave);
  const reg = registroRelatorio(id);
  if (!reg || reg.ok === false) return [];
  const payload = reg.data ?? reg.dados ?? reg;
  const blocos = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const trim = (v) => (typeof v === 'string' ? v.trim() : v ?? null);
  const out = [];
  blocos.forEach((b, i) => {
    const linhas = Array.isArray(b) ? b : b?.Dados || b?.dados || [];
    linhas.forEach((d) =>
      out.push({
        Grupo: trim(d.Grupo), Coluna: trim(d.Coluna), Linha: trim(d.Linha), Valor: trim(d.Valor),
        Ordem: b?.Ordem ?? i + 1, Tipo: b?.Tipo ?? null,
        __relatorio: chave, __relatorioNome: nomeRelatorio(id),
      })
    );
  });
  CACHE_ITENS.set(chave, out);
  if (out.some((d) => igual(d.Linha, 'VidasFaixa'))) {
    const ajustado = normalizarVidasFaixaConsolidada(out);
    CACHE_ITENS.set(chave, ajustado);
    return ajustado;
  }
  return out;
}

/**
 * O relatório de vidas por faixa etária (faixaVidas) é consolidado: quem tem Medicina e Odonto é contado
 * duas vezes (total = TotalGeral de VIDAS do R1). Reescala os valores para a base de vidas de Medicina,
 * a mesma usada nos KPIs de vidas, preservando a distribuição entre faixas, sexo e titularidade.
 */
function normalizarVidasFaixaConsolidada(itens) {
  const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
  const r1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
  const r1Ord1 = r1.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const baseR1 = r1Ord1.length ? r1Ord1 : r1;
  const vidasR1 = (filtro) => num(baseR1.find((d) => filtro(d) && /^vidas$/i.test(d.Linha || ''))?.Valor);
  const vidasMed = vidasR1((d) => (igualGrupo(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && igual(d.Coluna, 'Total'));
  const vidasOdo = vidasR1((d) => (igualGrupo(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && igual(d.Coluna, 'Total'));
  const vidasTotGeral = vidasR1((d) => igual(d.Coluna, 'TotalGeral')) ?? ((vidasMed || 0) + (vidasOdo || 0));
  if (!(vidasMed > 0) || !(vidasOdo > 0)) return itens;

  const ehTotal = (d) => igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL');
  const vidasFaixa = itens.filter((d) => igual(d.Linha, 'VidasFaixa'));
  const totalFaixa = num(vidasFaixa.find(ehTotal)?.Valor) ??
    vidasFaixa.filter((d) => !ehTotal(d)).reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
  const tolerancia = Math.max(2, vidasTotGeral * 0.01);
  if (!(totalFaixa > 0) || Math.abs(totalFaixa - vidasTotGeral) > tolerancia || totalFaixa <= vidasMed) return itens;

  const fator = vidasMed / totalFaixa;
  const novos = new Map(); // item original -> novo valor

  // Por Linha/Ordem: arredonda pelo maior resto para que as faixas somem exatamente o total reescalado
  const grupos = new Map();
  itens.forEach((d) => {
    if (igual(d.Linha, 'Perc_Faixa') || num(d.Valor) === null) return;
    const k = `${d.Linha}|${d.Ordem ?? ''}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(d);
  });
  grupos.forEach((lista) => {
    const celulas = lista.filter((d) => !ehTotal(d));
    const totalItem = lista.find(ehTotal);
    const somaOrig = num(totalItem?.Valor) ?? celulas.reduce((acc, d) => acc + num(d.Valor), 0);
    const alvo = Math.round(somaOrig * fator);
    const brutos = celulas.map((d) => num(d.Valor) * fator);
    const base = brutos.map(Math.floor);
    let resto = alvo - base.reduce((a, b) => a + b, 0);
    brutos
      .map((v, i) => ({ i, frac: v - base[i] }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => { if (resto > 0) { base[i] += 1; resto -= 1; } });
    celulas.forEach((d, i) => novos.set(d, base[i]));
    if (totalItem) novos.set(totalItem, alvo);
  });

  // Perc_Faixa recalculado a partir das vidas reescaladas
  const vidasPorCol = new Map();
  vidasFaixa.forEach((d) => { if (novos.has(d)) vidasPorCol.set(`${d.Coluna}|${d.Ordem ?? ''}`, novos.get(d)); });
  const totalPorOrdem = new Map();
  vidasFaixa.filter(ehTotal).forEach((d) => totalPorOrdem.set(d.Ordem ?? '', novos.get(d)));

  return itens.map((d) => {
    if (novos.has(d)) return { ...d, Valor: String(novos.get(d)) };
    if (igual(d.Linha, 'Perc_Faixa')) {
      const v = vidasPorCol.get(`${d.Coluna}|${d.Ordem ?? ''}`);
      const tot = totalPorOrdem.get(d.Ordem ?? '');
      if (v != null && tot > 0) return { ...d, Valor: String(ehTotal(d) ? 100 : (v / tot) * 100) };
    }
    return d;
  });
}

function statusRelatorio(id) {
  const reg = registroRelatorio(id);
  if (!reg) return { estado: 'ausente', registros: 0 };
  if (reg.ok === false) return { estado: 'erro', registros: 0, msg: reg.error || reg.erro || 'falha na chamada' };
  const n = itensDoRelatorio(id).length;
  return { estado: n ? 'ok' : 'vazio', registros: n };
}

/* ---------- filtro ---------- */

const normTexto = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const igual = (a, b) => {
  if (a === b) return true;
  const sa = normTexto(a);
  const sb = normTexto(b);
  if (sa === sb) return true;
  const ka = chavePeriodo(a);
  const kb = chavePeriodo(b);
  if (ka !== null && kb !== null) return ka === kb;
  return false;
};
const contem = (a, lista) => lista.some((t) => normTexto(a).includes(normTexto(t)));

const MAPA_SINONIMOS_GRUPO = {
  'm': 'medicina',
  'medicina': 'medicina',
  'o': 'odontologia',
  'odonto': 'odontologia',
  'odontologia': 'odontologia',
};
const normalizarGrupo = (g) => MAPA_SINONIMOS_GRUPO[String(g ?? '').trim().toLowerCase()] || String(g ?? '').trim().toLowerCase();
const igualGrupo = (a, b) => normalizarGrupo(a) === normalizarGrupo(b);

function aplicarFiltro(itens, f) {
  if (!f) return itens;

  let reLinha = null;
  if (f.linhaRegex) {
    try {
      reLinha = new RegExp(f.linhaRegex, 'i');
    } catch (err) {
      console.warn('[Apresentação] Regex inválida em linhaRegex:', f.linhaRegex, err.message);
    }
  }

  let reColuna = null;
  if (f.colunaRegex) {
    try {
      reColuna = new RegExp(f.colunaRegex, 'i');
    } catch (err) {
      console.warn('[Apresentação] Regex inválida em colunaRegex:', f.colunaRegex, err.message);
    }
  }

  let out = itens.filter((d) => {
    if (f.ordem != null && Number(d.Ordem) !== Number(f.ordem)) return false;
    if (f.tipo != null && Number(d.Tipo) !== Number(f.tipo)) return false;
    if (f.grupoEm && !f.grupoEm.some((x) => igualGrupo(d.Grupo, x))) return false;
    if (f.linhaEm && !f.linhaEm.some((x) => igual(d.Linha, x))) return false;
    if (f.colunaEm && !f.colunaEm.some((x) => igual(d.Coluna, x))) return false;
    if (f.grupoForaDe && f.grupoForaDe.some((x) => igualGrupo(d.Grupo, x))) return false;
    if (f.linhaForaDe && f.linhaForaDe.some((x) => igual(d.Linha, x))) return false;
    if (f.colunaForaDe && f.colunaForaDe.some((x) => igual(d.Coluna, x))) return false;
    if (f.linhaContem && !contem(d.Linha, f.linhaContem)) return false;
    if (f.colunaContem && !contem(d.Coluna, f.colunaContem)) return false;
    if (reLinha && !reLinha.test(d.Linha ?? '')) return false;
    if (reColuna && !reColuna.test(d.Coluna ?? '')) return false;
    if (f.excluirSemDados && [d.Linha, d.Coluna, d.Valor].some((x) => SEM_DADOS.test(String(x ?? '')))) return false;
    if (f.campoDiferente && igual(d[f.campoDiferente.campo], f.campoDiferente.valor)) return false;
    if (f.valorNaoZero && (num(d.Valor) === null || num(d.Valor) === 0)) return false;
    if (f.somentePeriodos && chavePeriodo(d.Coluna) === null) return false;
    return true;
  });
  if (f.distinto) {
    const vistos = new Set();
    out = out.filter((d) => {
      const k = [d.Ordem, d.Grupo, d.Coluna, d.Linha, d.Valor].join('|');
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }
  return out;
}

/* ---------- identificação do relatório (id fixo ou assinatura) ---------- */

function assinaturaDe(fonte) {
  const a = fonte?.assinatura;
  if (!a) return null;
  if (typeof a === 'string') {
    const def = CONFIG?.assinaturas?.[a];
    if (!def) console.warn('[Apresentação] assinatura não definida:', a);
    return def || null;
  }
  return a;
}

function detectarRelatorios(assinatura) {
  const chave = JSON.stringify(assinatura);
  if (CACHE_ASSINATURA.has(chave)) return CACHE_ASSINATURA.get(chave);
  const ids = (DADOS?.relatorios || [])
    .map((r) => Number(r.id))
    .filter((id) => aplicarFiltro(itensDoRelatorio(id), assinatura).length > 0)
    .sort((a, b) => a - b);
  CACHE_ASSINATURA.set(chave, ids);
  return ids;
}

function idsDaFonte(fonte) {
  if (!fonte) return [];
  if (Array.isArray(fonte.relatorios)) return fonte.relatorios.map(Number);
  if (fonte.relatorio != null) return [Number(fonte.relatorio)];
  const ass = assinaturaDe(fonte);
  if (!ass) return [];
  const ids = detectarRelatorios(ass);
  if (fonte.todos) return ids;
  const i = fonte.indice ?? 0;
  return ids[i] != null ? [ids[i]] : [];
}

/* ---------- pivot / valores / ordenação / agregação ---------- */

function pivotar(itens, eixoKey = 'Coluna', serieKey = 'Linha') {
  const mapa = new Map();
  let series = [];
  itens.forEach((d) => {
    const eixo = d[eixoKey] ?? '—';
    const serie = d[serieKey] ?? 'Valor';
    if (!mapa.has(eixo)) mapa.set(eixo, { __eixo: eixo, __itens: [] });
    const linha = mapa.get(eixo);
    if (linha[serie] === undefined || linha[serie] === null || linha[serie] === '') {
      linha[serie] = d.Valor;
    }
    linha.__itens.push(d);
    if (!series.includes(serie)) series.push(serie);
  });
  let linhas = [...mapa.values()];
  if (ehListaPeriodos(series)) series = ordenarPorPeriodo(series);
  if (ehListaPeriodos(linhas.map((l) => l.__eixo))) linhas = ordenarPorPeriodo(linhas, (l) => l.__eixo);
  return { linhas, series };
}

function valorDe(linha, de) {
  for (const c of Array.isArray(de) ? de : [de]) {
    if (linha[c] !== undefined && linha[c] !== null && linha[c] !== '') return linha[c];
    const chave = Object.keys(linha).find((k) => igual(k, c));
    if (chave && linha[chave] !== null && linha[chave] !== '') return linha[chave];
  }
  return null;
}

let _cacheResumoFinanceiro = null;
let _cacheResumoFinanceiroRef = null;

/** Invalida cache de dados financeiros quando a fonte é recarregada */
function invalidarCacheFinanceiro() {
  _cacheResumoFinanceiro = null;
  _cacheResumoFinanceiroRef = null;
}

/** Consolida dados de receita, despesa e coparticipação do contrato (Relatório 10 - financeiroMensal) com cache por referência */
function resumoFinanceiroContrato() {
  if (_cacheResumoFinanceiro && _cacheResumoFinanceiroRef === DADOS) {
    return _cacheResumoFinanceiro;
  }
  const ids = idsDaFonte({ assinatura: 'financeiroMensal' });
  if (!ids.length) return null;
  const itensTodos = ids.flatMap((id) => itensDoRelatorio(id));
  if (!itensTodos.length) return null;

  // Filtra itens do período atual (Ordem 1) para não contaminar com dados do ano anterior (Ordem 2)
  const itensOrdem1 = itensTodos.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const itens = itensOrdem1.length ? itensOrdem1 : itensTodos;

  const itensTotal = itens.filter((d) => igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total'));
  const somaOuTotal = (linhaNome) => {
    const dTot = itensTotal.find((d) => igual(d.Linha, linhaNome));
    if (dTot && num(dTot.Valor) !== null) return num(dTot.Valor);
    const porMes = itens.filter(
      (d) => igual(d.Linha, linhaNome) && !igual(d.Coluna, 'TOTAL') && !igual(d.Coluna, 'Total')
    );
    if (porMes.length) return porMes.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
    return null;
  };

  const receita = somaOuTotal('Receita');
  const despesa = somaOuTotal('Despesa (líquida de coparticipação)') ??
                  somaOuTotal('Despesa (liquida de Coparticipacao)') ??
                  somaOuTotal('Despesa (liquida de Copay)') ??
                  somaOuTotal('Despesa');
  const coparticipacao = somaOuTotal('Coparticipação') ?? somaOuTotal('Coparticipacao') ?? 0;

  let impactoCoparticipacao = null;
  const dImpacto = itensTotal.find((d) =>
    igual(d.Linha, 'Impacto de Coparticipação') ||
    igual(d.Linha, 'Impacto Coparticipacao') ||
    igual(d.Linha, 'Impacto Copay no Custo')
  );
  if (dImpacto && num(dImpacto.Valor) !== null) {
    let valImp = num(dImpacto.Valor);
    if (valImp > 0 && valImp <= 1.0 && !String(dImpacto.Valor).includes('%')) valImp *= 100;
    impactoCoparticipacao = valImp;
  } else if (coparticipacao !== null && despesa !== null && (despesa + coparticipacao) > 0) {
    impactoCoparticipacao = (coparticipacao / (despesa + coparticipacao)) * 100;
  }

  let sinTotal = null;
  if (receita && despesa !== null) {
    sinTotal = ((despesa + coparticipacao) / receita) * 100;
  }

  const res = {
    receita,
    despesa,
    copay: coparticipacao,
    coparticipacao,
    impactoCopay: impactoCoparticipacao,
    impactoCoparticipacao,
    sinTotal,
  };

  _cacheResumoFinanceiroRef = DADOS;
  _cacheResumoFinanceiro = res;
  return res;
}

/**
 * Calcula o Custo por vida (mês) = Despesa líquida acumulada do período ÷ Soma de vidas mês a mês no período.
 * @param {'medicina'|'odontologia'|'M'|'O'} grupoAlvo
 */
function custoPorVidaMes(grupoAlvo = 'medicina') {
  const ehOdo = /odo|^o$/i.test(String(grupoAlvo || '').trim());
  const gruposFiltro = ehOdo ? ['Odontologia', 'O', 'Odonto'] : ['Medicina', 'M'];

  // 1. Despesa líquida acumulada do período
  let despesaTotal = resolverFonteEscalar({
    assinatura: 'financeiroConsolidado',
    filtro: {
      grupoEm: gruposFiltro,
      colunaEm: ['TOTAL', 'Total'],
      linhaEm: [
        'DESPESA',
        'Despesa',
        'Despesa (líquida de coparticipação)',
        'Despesa (liquida de Coparticipacao)',
        'Despesa (liquida de Copay)',
      ],
    },
    agregacao: 'primeiro',
  });

  if ((despesaTotal === null || despesaTotal <= 0) && !ehOdo) {
    const resFin = resumoFinanceiroContrato();
    if (resFin?.despesa > 0) despesaTotal = resFin.despesa;
  }

  // 2. Soma de vidas mês a mês a partir de vidasMensal (Ordem 1)
  let somaVidasMes = 0;
  const idsVidas = idsDaFonte({ assinatura: 'vidasMensal', todos: true });
  const itensVidasBrutos = idsVidas.flatMap((id) => itensDoRelatorio(id));
  const itensVidasOrd1 = itensVidasBrutos.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const baseVidas = itensVidasOrd1.length ? itensVidasOrd1 : itensVidasBrutos;

  const itensGrupo = baseVidas.filter((d) =>
    ehOdo
      ? (d.Grupo && gruposFiltro.some((g) => igualGrupo(d.Grupo, g)))
      : (d.Grupo == null || gruposFiltro.some((g) => igualGrupo(d.Grupo, g)))
  );

  const meses = [...new Set(itensGrupo.map((d) => d.Coluna))].filter((c) => chavePeriodo(c) !== null);

  if (meses.length > 0) {
    meses.forEach((m) => {
      const rowTot = itensGrupo.find((d) => /^(total)$/i.test(String(d.Linha || '').trim()) && igual(d.Coluna, m));
      if (rowTot && num(rowTot.Valor) !== null) {
        somaVidasMes += num(rowTot.Valor);
      } else {
        const somaPlanos = itensGrupo
          .filter((d) => !/^(total|acumulado)$/i.test(String(d.Linha || '').trim()) && igual(d.Coluna, m))
          .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
        somaVidasMes += somaPlanos;
      }
    });
  }

  // Fallback: caso somaVidasMes não exista em vidasMensal, usa Total de Vidas * qtdMeses
  if (somaVidasMes <= 0) {
    const vidasCons = resolverFonteEscalar({
      assinatura: 'financeiroConsolidado',
      filtro: { grupoEm: gruposFiltro, colunaEm: ['TOTAL', 'Total'], linhaEm: ['VIDAS', 'Vidas'] },
      agregacao: 'primeiro',
    });
    if (vidasCons && vidasCons > 0) {
      const params = parametros();
      const mesesEsperados = gerarMesesPeriodo(params.dataInicial || DADOS?.relatorio?.DtInicial, params.dataFinal || DADOS?.relatorio?.DtFinal);
      const nMeses = mesesEsperados.length || 12;
      somaVidasMes = vidasCons * nMeses;
    }
  }

  if (despesaTotal !== null && despesaTotal > 0 && somaVidasMes > 0) {
    return despesaTotal / somaVidasMes;
  }
  return null;
}

/** Limiar mínimo (centavos) para considerar coparticipação ativa */
const LIMIAR_COPARTICIPACAO = 0.005;

/** Verifica se o contrato possui coparticipação ativa no período atual */
function contratoTemCoparticipacao() {
  const resumo = resumoFinanceiroContrato();
  return Boolean(resumo?.copay != null && Math.abs(resumo.copay) > LIMIAR_COPARTICIPACAO);
}

/** Resolve legenda dinâmica (desativada: legendas foram substituídas globalmente por caixa de observação da consultora) */
function resolverLegendaBloco(bloco, temCopay = contratoTemCoparticipacao()) {
  return null;
}

/** Estrutura padronizada de seções e itens para slides de eventos (evento-benchmark, evento-mensal, mix-le-rc) */
const ESTRUTURA_SECOES_EVENTO = [
  {
    titulo: 'Total Despesas Hospitalares',
    classeSecao: 'linha-hospitalar',
    classeTitulo: 'linha-secao-evento linha-total-hospitalar',
    chaveTotal: 'total hospitalar',
    matchTotal: (k) => k.includes('total hospitalar') || k.includes('total despesas hospitalares'),
    itens: [
      {
        nome: 'Internação cirúrgica',
        classeLinha: 'linha-hospitalar',
        match: (k) => k.includes('cirurg'),
      },
      {
        nome: 'Internação clínica',
        classeLinha: 'linha-hospitalar',
        match: (k) => k.includes('clinic'),
      },
      {
        nome: 'Maternidade',
        classeLinha: 'linha-hospitalar',
        match: (k) => k.includes('maternidade'),
      },
      {
        nome: 'Oncologia',
        classeLinha: 'linha-hospitalar',
        match: (k) => k.includes('onco'),
      },
    ],
  },
  {
    titulo: 'Total Despesas Ambulatoriais',
    classeSecao: 'linha-ambulatorial',
    classeTitulo: 'linha-secao-evento linha-total-ambulatorial',
    chaveTotal: 'total ambulatorial',
    matchTotal: (k) => k.includes('total ambulatorial') || k.includes('total despesas ambulatoriais'),
    itens: [
      {
        nome: 'Consultas',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k === 'consultas',
      },
      {
        nome: 'Exames',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k === 'exames',
      },
      {
        nome: 'Consultas de Emergência',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k.includes('emerg') || k.includes('urgenc') || k.includes('pronto socorro'),
      },
      {
        nome: 'Atendimento ambulatorial',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k.includes('outros atend') || k.includes('atendimento amb') || (k.includes('ambulatorial') && !k.includes('total')),
      },
      {
        nome: 'Home care',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k.includes('home care') || k.includes('domiciliar'),
      },
      {
        nome: 'Terapias seriadas',
        classeLinha: 'linha-ambulatorial',
        match: (k) => k.includes('terapia'),
      },
    ],
  },
];

const ITEM_ODONTOLOGIA_EVENTO = {
  nome: 'Despesas odontológicas',
  classeLinha: 'linha-odontologia',
  match: (k) => k.includes('odonto'),
};

const ITEM_TOTAL_GERAL_EVENTO = {
  nome: 'Total Geral',
  classeLinha: 'linha-total',
  isDestaque: true,
  match: (k) => k.includes('total geral'),
};

/** Resolve o valor de uma célula de tabela, permitindo campos calculados (impacto de coparticipação e sinistralidade total) */
function resolverValorColuna(l, c, linhas, bloco) {
  let bruto = valorDe(l, c.de);
  if (bruto !== null && bruto !== undefined && bruto !== '') {
    if (c.formato?.startsWith('percentual')) {
      const n = num(bruto);
      if (/coparticip|copay/i.test(c.rotulo) || c.calculo === 'impactoCoparticipacao') {
        const strBruto = String(bruto ?? '');
        const jaEhPercentual = strBruto.includes('%');
        const desp = num(valorDe(l, ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)']));
        if (!jaEhPercentual && n !== null && desp !== null && (desp + n) > 0) {
          return (n / (desp + n)) * 100;
        }
      }
    }
    return bruto;
  }

  const rotuloNorm = String(c.rotulo || '').toLowerCase();
  const ehCustoAnterior =
    c.calculo === 'custoAnterior' ||
    c.calculo === 'despesaAnterior' ||
    ((rotuloNorm.includes('custo') || rotuloNorm.includes('despesa')) && (rotuloNorm.includes('anterior') || rotuloNorm.includes('ano 1') || rotuloNorm.includes('ant')));
  if (ehCustoAnterior) {
    return l.DespesaAnt ?? l.CustoAnt ?? l['Ano 1'] ?? l.CustoAnoAnterior ?? l._vAnt ?? null;
  }

  if (c.calculo === 'percentualCustoAnterior' || c.calculo === 'percentualDespesaAnterior') {
    return l.PercTotalAnt ?? l.PercTotalAnoAnterior ?? null;
  }

  const ehCustoEvento =
    c.calculo === 'custoEvento' ||
    c.calculo === 'despesaEvento' ||
    (!ehCustoAnterior && (rotuloNorm.includes('custo') || rotuloNorm.includes('despesa')) && !rotuloNorm.includes('%') && (bloco?.id === 'mix-le-rc' || bloco?.fonte?.assinatura === 'mixLeRc'));

  if (ehCustoEvento) {
    const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const eixoNorm = norm(l.__eixo);
    const todosItensMatcher = [
      ...ESTRUTURA_SECOES_EVENTO.flatMap((s) => [
        { nome: s.titulo, match: s.matchTotal },
        ...s.itens,
      ]),
      ITEM_ODONTOLOGIA_EVENTO,
      ITEM_TOTAL_GERAL_EVENTO,
    ];
    const itemMatcher = todosItensMatcher.find((it) => it.nome === l.__eixo || it.match(normTexto(l.__eixo)));

    // 1. Tenta buscar em Relatório 15 (eventoBenchmark)
    const ids15 = idsDaFonte({ assinatura: 'eventoBenchmark' });
    if (ids15.length) {
      const itens15 = ids15.flatMap((id) => itensDoRelatorio(id));
      const match15 = itens15.find((d) => (
        igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')
      ) && (
        norm(d.Linha) === eixoNorm || (itemMatcher && itemMatcher.match(normTexto(d.Linha)))
      ));
      if (match15 && num(match15.Valor) !== null) return num(match15.Valor);
    }

    // 2. Tenta buscar em Relatório 14 (eventoMensal)
    const ids14 = idsDaFonte({ assinatura: 'eventoMensal' });
    if (ids14.length) {
      const itens14 = ids14.flatMap((id) => itensDoRelatorio(id));
      const match14 = itens14.find((d) => (
        igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')
      ) && (
        norm(d.Linha) === eixoNorm || (itemMatcher && itemMatcher.match(normTexto(d.Linha)))
      ));
      if (match14 && num(match14.Valor) !== null) return num(match14.Valor);
      const porMes14 = itens14.filter((d) => (
        chavePeriodo(d.Coluna) !== null &&
        (norm(d.Linha) === eixoNorm || (itemMatcher && itemMatcher.match(normTexto(d.Linha))))
      ));
      if (porMes14.length) {
        const soma14 = porMes14.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
        if (soma14 > 0) return soma14;
      }
    }

    // 3. Fallback: calcula a partir da despesa total do contrato e PercTotal
    const perc = num(l.PercTotal);
    const resumoFin = resumoFinanceiroContrato();
    if (perc !== null && resumoFin?.despesa) {
      const fator = (perc > 0 && perc <= 1.0 && !String(l.PercTotal).includes('%')) ? perc : perc / 100;
      return resumoFin.despesa * fator;
    }
    return null;
  }

  const ehVarCusto =
    c.calculo === 'varCusto' ||
    c.calculo === 'varDespesa' ||
    ((rotuloNorm.includes('custo') || rotuloNorm.includes('despesa')) && (rotuloNorm.includes('var') || rotuloNorm.includes('δ') || rotuloNorm.includes('dif') || rotuloNorm.includes('Δ')));
  if (ehVarCusto && (l.VarDespesa !== undefined || l.VarCusto !== undefined)) {
    return l.VarDespesa ?? l.VarCusto;
  }

  const ehVarRC =
    c.calculo === 'varRC' ||
    (rotuloNorm.includes('rede') && (rotuloNorm.includes('var') || rotuloNorm.includes('utiliz') || rotuloNorm.includes('δ') || rotuloNorm.includes('p.p.') || rotuloNorm.includes('Δ')));
  if (ehVarRC && l.VarRC !== undefined && l.VarRC !== null) {
    return l.VarRC;
  }

  const ehDespesaBruta =
    c.calculo === 'despesaBruta' ||
    (rotuloNorm.includes('despesa') && rotuloNorm.includes('bruta'));
  const ehImpactoCopay =
    c.calculo === 'impactoCoparticipacao' ||
    (rotuloNorm.includes('impacto') && (rotuloNorm.includes('copar') || rotuloNorm.includes('copay')));
  const ehSinistralidadeTotal =
    c.calculo === 'sinistralidadeTotal' ||
    ((rotuloNorm.includes('sinistr') || rotuloNorm.includes('total') || rotuloNorm.includes('brut')) &&
      (rotuloNorm.includes('total de sinistr') || rotuloNorm.includes('sinistralidade total') || rotuloNorm.includes('sinistralidade bruta') || rotuloNorm.includes('brut')));

  if (!ehDespesaBruta && !ehImpactoCopay && !ehSinistralidadeTotal) {
    return null;
  }

  const recLinha = num(valorDe(l, ['RECEITA', 'Receita']));
  const despLinha = num(valorDe(l, ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)']));
  const copayLinha = num(valorDe(l, ['COPARTICIPACAO', 'COPARTICIPAÇÃO', 'Coparticipação', 'Coparticipacao', 'Copay']));
  const ehLinhaTotal = /^(total|totais|total\s*geral)\b/i.test(String(l.__eixo ?? '').trim());

  if (ehDespesaBruta) {
    if (despLinha !== null || copayLinha !== null) {
      return (despLinha || 0) + (copayLinha || 0);
    }
    return null;
  }

  if (!ehLinhaTotal && recLinha === 0 && (despLinha === 0 || despLinha === null)) {
    return 0;
  }

  const resumoFin = resumoFinanceiroContrato();

  if (ehImpactoCopay) {
    if (copayLinha !== null && despLinha !== null && (despLinha + copayLinha) > 0) {
      return (copayLinha / (despLinha + copayLinha)) * 100;
    }
    if (resumoFin?.impactoCopay != null) {
      if (ehLinhaTotal) return resumoFin.impactoCopay;
      if (despLinha !== null && despLinha > 0 && resumoFin.despesa > 0) {
        return resumoFin.impactoCopay;
      }
    }
    if (resumoFin && (resumoFin.copay === 0 || resumoFin.copay === null)) {
      return 0;
    }
    return null;
  }

  if (ehSinistralidadeTotal) {
    if (copayLinha !== null && despLinha !== null && recLinha) {
      return ((despLinha + copayLinha) / recLinha) * 100;
    }
    if (ehLinhaTotal) {
      if (resumoFin?.sinTotal != null) return resumoFin.sinTotal;
      if (recLinha && despLinha !== null) {
        const copayTotal = resumoFin?.copay || 0;
        return ((despLinha + copayTotal) / recLinha) * 100;
      }
    }
    if (recLinha && despLinha !== null) {
      if (resumoFin?.copay && resumoFin.despesa > 0) {
        const copayAlocado = resumoFin.copay * (despLinha / resumoFin.despesa);
        return ((despLinha + copayAlocado) / recLinha) * 100;
      }
      return (despLinha / recLinha) * 100;
    }
    return null;
  }

  return null;
}

const RE_TOTAIS_PADRAO = '^(total|totais|total\\s*geral|totalgeral|m[eé]dia|acumulado|%\\s*total)\\b';

/** meses → cronológico; senão decrescente pela coluna indicada/primeira numérica; totais ao fim */
function ordenarLinhas(linhas, colunas, bloco) {
  if (bloco.ordenar === false || !linhas.length) return linhas;
  const cfg = bloco.ordenar && typeof bloco.ordenar === 'object' ? bloco.ordenar : {};
  const eixos = linhas.map((l) => l.__eixo);
  let out;
  if (!cfg.por && eixos.every((e) => e !== undefined) && ehListaPeriodos(eixos)) {
    out = ordenarPorPeriodo(linhas, (l) => l.__eixo);
  } else {
    const col = cfg.por
      ? colunas.find((c) => igual(c.rotulo, cfg.por))
      : colunas.find((c, i) => i > 0 && linhas.some((l) => num(resolverValorColuna(l, c, linhas, bloco)) !== null));
    if (!col) return linhas;
    const dir = cfg.direcao === 'asc' ? 1 : -1;
    out = linhas
      .map((l, i) => ({ l, i, v: num(resolverValorColuna(l, col, linhas, bloco)) }))
      .sort((a, b) => {
        if (a.v === null && b.v === null) return a.i - b.i;
        if (a.v === null) return 1;
        if (b.v === null) return -1;
        return (a.v - b.v) * dir || a.i - b.i;
      })
      .map((x) => x.l);
  }
  if (bloco.totaisNoFim !== false) {
    const re = new RegExp(bloco.totaisRegex || RE_TOTAIS_PADRAO, 'i');
    const ehTotal = (l) => re.test(String(l.__eixo ?? '').trim());
    const ehVar = (l) => String(l.__eixo ?? '').toLowerCase().includes('varia');
    const fim = out.filter((l) => ehTotal(l) && !ehVar(l)).sort((a, b) => {
      const aGeral = /^total\s*geral/i.test(String(a.__eixo ?? '').trim());
      const bGeral = /^total\s*geral/i.test(String(b.__eixo ?? '').trim());
      if (aGeral && !bGeral) return 1;
      if (!aGeral && bGeral) return -1;
      return 0;
    });
    const vars = out.filter(ehVar);
    if ((fim.length || vars.length) && (fim.length + vars.length) < out.length) {
      out = [...out.filter((l) => !ehTotal(l) && !ehVar(l)), ...fim, ...vars];
    }
  }
  return out;
}

function agregar(itens, modo = 'soma') {
  const nums = itens.map((d) => num(d.Valor)).filter((n) => n !== null);
  if (!nums.length) return null;
  switch (modo) {
    case 'media': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'ultimo': return nums[nums.length - 1];
    case 'primeiro': return nums[0];
    case 'max': return Math.max(...nums);
    case 'min': return Math.min(...nums);
    case 'contagem': return nums.length;
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

function resolverFonteEscalar(fonte) {
  if (!fonte) return null;
  if (fonte.valor !== undefined) return fonte.valor;
  let itens = idsDaFonte(fonte).flatMap((id) => aplicarFiltro(itensDoRelatorio(id), fonte.filtro));
  if (!itens.length && fonte.filtro) {
    const alvoMasc = (fonte.filtro.colunaEm?.some((c) => igual(c, 'MASCULINO')) || fonte.filtro.linhaEm?.some((l) => igual(l, 'Masculino')));
    const alvoFem = (fonte.filtro.colunaEm?.some((c) => igual(c, 'FEMININO')) || fonte.filtro.linhaEm?.some((l) => igual(l, 'Feminino')));
    if (alvoMasc || alvoFem) {
      const termo = alvoMasc ? 'Masculino' : 'Feminino';
      itens = idsDaFonte(fonte).flatMap((id) => {
        const raw = itensDoRelatorio(id);
        const comTotal = raw.filter((d) =>
          (igual(d.Linha, termo) || igual(d.Coluna, termo) || igual(d.Grupo, termo)) &&
          (igual(d.Coluna, 'Total') || igual(d.Linha, 'Total') || igual(d.Linha, 'Vidas') || igual(d.Coluna, termo))
        );
        if (comTotal.length > 0) return comTotal;

        // Se a coluna 'Total' não estiver presente, soma as faixas etárias dinamicamente (como no perfil populacional)
        const faixas = raw.filter((d) =>
          (igual(d.Linha, termo) || igual(d.Coluna, termo) || igual(d.Grupo, termo)) &&
          !igual(d.Linha, 'Perc_Faixa') &&
          !igual(d.Coluna, 'Perc_Faixa') &&
          !igual(d.Linha, '%') &&
          !igual(d.Coluna, 'Total')
        );
        if (faixas.length > 0) {
          const somaVidas = faixas.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
          return [{ Linha: termo, Coluna: 'Total', Valor: String(somaVidas) }];
        }
        return [];
      });
    }
  }
  if ((fonte.agregacao === 'ultimo' || fonte.agregacao === 'primeiro') && ehListaPeriodos(itens.map((d) => d.Coluna))) {
    itens = ordenarPorPeriodo(itens.filter((d) => chavePeriodo(d.Coluna) !== null), (d) => d.Coluna);
  }
  const v = agregar(itens, fonte.agregacao);
  return v === null ? null : fonte.escala ? v * fonte.escala : v;
}

function resolverFonteTabela(fonte) {
  if (!fonte) return { linhas: [], series: [] };
  if (fonte.colecao) {
    const col = pathGet(DADOS, fonte.colecao) || [];
    return { linhas: aplicarFiltro(Array.isArray(col) ? col : [col], fonte.filtro), series: [] };
  }
  let itens = idsDaFonte(fonte).flatMap((id) => aplicarFiltro(itensDoRelatorio(id), fonte.filtro));

  // Normalização e enriquecimento para indicadores de utilização (Relatório 5 / assinatura indicadores)
  const isIndicadores = fonte.assinatura === 'indicadores' || idsDaFonte(fonte).includes(5);
  if (isIndicadores && itens.length) {
    const MAPA_IND = {
      'consultas pmpm': 'Consultas por vida/mês',
      'consulta por associado': 'Consultas por vida/mês',
      'consultas': 'Consultas por vida/mês',
      'exames/consultas': 'Exames por consulta',
      'exames por consultas': 'Exames por consulta',
      'exames por consulta': 'Exames por consulta',
      'exame por consultas': 'Exames por consulta',
      'exame por consulta': 'Exames por consulta',
      'relacao exames por consulta': 'Exames por consulta',
      'relação exames por consulta': 'Exames por consulta',
      'relacao exames/consultas': 'Exames por consulta',
      'relação exames/consultas': 'Exames por consulta',
      'razao exames por consulta': 'Exames por consulta',
      'razão exames por consulta': 'Exames por consulta',
      'exames pmpm': 'Exames por vida/mês',
      'exame por associado': 'Exames por vida/mês',
      'exames por associado': 'Exames por vida/mês',
      'exames': 'Exames por vida/mês',
      'indice de uti': 'Índice de UTI',
      'índice de uti': 'Índice de UTI',
      'uti associado': 'Índice de UTI',
      'atendimento de urgencia': 'Pronto-Socorro por vida/mês',
      'atendimento de urgência': 'Pronto-Socorro por vida/mês',
      'atendimento de urgencia por associado': 'Pronto-Socorro por vida/mês',
      'atendimento de urgência por associado': 'Pronto-Socorro por vida/mês',
      'pronto socorro': 'Pronto-Socorro por vida/mês',
      'pronto-socorro': 'Pronto-Socorro por vida/mês',
      'pronto socorro pmpm': 'Pronto-Socorro por vida/mês',
      'pronto-socorro pmpm': 'Pronto-Socorro por vida/mês',
      'pronto atendimento': 'Pronto-Socorro por vida/mês',
      'pronto-atendimento': 'Pronto-Socorro por vida/mês',
      'pronto atendimento pmpm': 'Pronto-Socorro por vida/mês',
      'pronto atendimento por associado': 'Pronto-Socorro por vida/mês',
      'terapias': 'Terapias por vida/mês',
      'terapias pmpm': 'Terapias por vida/mês',
      'terapias seriadas': 'Terapias por vida/mês',
      'terapias seriadas / associado': 'Terapias por vida/mês',
      'int 1000 vidas/mes': 'Internações por 1.000 vidas/mês',
      'int 1000 vidas/mês': 'Internações por 1.000 vidas/mês',
      'int. 1000 vidas/mes': 'Internações por 1.000 vidas/mês',
      'internacoes 1000 vidas/mes': 'Internações por 1.000 vidas/mês',
      'internações 1000 vidas/mês': 'Internações por 1.000 vidas/mês',
      'diarias 1000 vidas/mes': 'Diárias por 1.000 vidas/mês',
      'diarias 1000 vidas/mês': 'Diárias por 1.000 vidas/mês',
      'diárias 1000 vidas/mes': 'Diárias por 1.000 vidas/mês',
      'diárias 1000 vidas/mês': 'Diárias por 1.000 vidas/mês',
      'media permanencia': 'Média de permanência',
      'média de permanência': 'Média de permanência',
      'media permanência': 'Média de permanência'
    };

    itens = itens.map((d) => {
      const k = normTexto(d.Linha);
      let valor = d.Valor;
      // Média de Permanência omite quantidade quando zerada
      if (k.includes('media permanen') && igual(d.Coluna, 'Quantidade') && (!num(d.Valor) || num(d.Valor) === 0)) {
        valor = null;
      }
      return MAPA_IND[k] ? { ...d, Linha: MAPA_IND[k], Valor: valor } : (valor !== d.Valor ? { ...d, Valor: valor } : d);
    });
  }

  // Normalização para slides de eventos (evento-benchmark, evento-mensal, mix-le-rc)
  const isEventoBenchmark = fonte.assinatura === 'eventoBenchmark' || (!fonte.assinatura && idsDaFonte(fonte).includes(15));
  const isEventoMensal = fonte.assinatura === 'eventoMensal' || (!fonte.assinatura && idsDaFonte(fonte).includes(14));
  const isMixLeRc = fonte.assinatura === 'mixLeRc' || (!fonte.assinatura && idsDaFonte(fonte).includes(4));
  const MAPA_NOMES_EVENTO = {
    'int.cirurgica': 'Internação Cirúrgica',
    'int.cirúrgica': 'Internação Cirúrgica',
    'int.clinica': 'Internação Clínica',
    'int.clínica': 'Internação Clínica',
    'maternidade': 'Maternidade',
    'total hospitalar': 'Total Hospitalar',
    'total ambulatorial': 'Total Ambulatorial',
    'odontologia': 'Odontologia',
    'total geral': 'Total Geral',
    'consultas': 'Consultas',
    'exames': 'Exames',
    'terapias seriadas': 'Terapias Seriadas',
    'outros atend. amb': 'Outros Atend. Ambulatoriais',
    'outros atend. amb.': 'Outros Atend. Ambulatoriais',
  };
  if ((isEventoBenchmark || isEventoMensal || isMixLeRc) && itens.length) {
    itens = itens.map((d) => {
      const k = normTexto(d.Linha);
      return MAPA_NOMES_EVENTO[k] ? { ...d, Linha: MAPA_NOMES_EVENTO[k] } : d;
    });
  }

  // Para Vidas por faixa etária (Relatório 3 / assinatura faixaVidas): consolidar faixas 0 a 17, 18 a 59 e 60+
  const isFaixaVidas = (fonte.assinatura === 'faixaVidas' || idsDaFonte(fonte).includes(3)) && (fonte.modo !== 'bruto');
  if (isFaixaVidas && itens.length) {
    const itensFaixa = itens.filter(
      (d) => igual(d.Linha, 'VidasFaixa') && !igual(d.Coluna, 'Total')
    );
    if (itensFaixa.length) {
      const totalVidasFaixas = itensFaixa.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
      const grupos = [
        { rotulo: '0 a 17 anos', match: ['00 - 01', '00-01', '02 - 09', '02-09', '10 - 17', '10-17'], vidas: 0 },
        { rotulo: '18 a 59 anos', match: ['18 - 29', '18-29', '30 - 39', '30-39', '40 - 49', '40-49', '50 - 59', '50-59'], vidas: 0 },
        { rotulo: '60+ anos', match: ['60 - 69', '60-69', '70 +', '70+'], vidas: 0 },
      ];

      itensFaixa.forEach((d) => {
        const col = String(d.Coluna || '').trim();
        const v = num(d.Valor) || 0;
        for (const g of grupos) {
          if (g.match.some((m) => normTexto(m) === normTexto(col))) {
            g.vidas += v;
            break;
          }
        }
      });

      const linhasConsolidadas = grupos.map((g) => ({
        __eixo: g.rotulo,
        VidasFaixa: g.vidas,
        Vidas: g.vidas,
        Perc_Faixa: totalVidasFaixas > 0 ? (g.vidas / totalVidasFaixas) * 100 : 0,
      }));

      linhasConsolidadas.push({
        __eixo: 'Total Geral',
        VidasFaixa: totalVidasFaixas,
        Vidas: totalVidasFaixas,
        Perc_Faixa: totalVidasFaixas > 0 ? 100 : 0,
      });

      return { linhas: linhasConsolidadas, series: ['VidasFaixa', 'Vidas', 'Perc_Faixa'] };
    }
  }

  if ((fonte.modo || 'pivot') === 'bruto') return { linhas: itens, series: [] };

  // Tratamento pré-pivot para vidas-mensal: separar Linha Odonto e Médica se houver dados ativos de Odonto
  const isVidasMensal = (fonte.assinatura === 'vidasMensal' || idsDaFonte(fonte).includes(8)) && (fonte.pivot?.eixo === 'Linha');
  if (isVidasMensal && itens.length) {
    const temOdontoComVidas = itens.some((d) => {
      const g = normTexto(d.Grupo);
      return (g.includes('odont') || g === 'o') && (num(d.Valor) || 0) > 0;
    });

    if (!temOdontoComVidas) {
      // Se a API não retornar dados separados ou odonto for 100% zerado:
      // Mantém os planos juntos em Medicina e exclui linhas zeradas de Odonto
      itens = itens.filter((d) => {
        const g = normTexto(d.Grupo);
        return !g.includes('odont') && g !== 'o';
      });
    } else {
      // Há dados de Odontologia com vidas > 0: separa Linha Odonto e Médica
      const linhasOdontoAtivas = new Set(
        itens
          .filter((d) => {
            const g = normTexto(d.Grupo);
            return (g.includes('odont') || g === 'o') && (num(d.Valor) || 0) > 0 && !igual(d.Linha, 'Total');
          })
          .map((d) => normTexto(d.Linha))
      );

      itens = itens
        .filter((d) => {
          const g = normTexto(d.Grupo);
          const isOdonto = g.includes('odont') || g === 'o';
          if (isOdonto && !linhasOdontoAtivas.has(normTexto(d.Linha)) && !igual(d.Linha, 'Total')) {
            return false;
          }
          return true;
        })
        .map((d) => {
          const g = normTexto(d.Grupo);
          const isOdonto = g.includes('odont') || g === 'o';
          const isMed = g.includes('med') || g === 'm';
          const linha = String(d.Linha || '').trim();

          if (igual(linha, 'Total')) {
            return isOdonto ? { ...d, Linha: 'Total Odonto' } : isMed ? { ...d, Linha: 'Total Medicina' } : d;
          }

          if (isOdonto) {
            return { ...d, Linha: linha.toLowerCase().includes('odonto') ? linha : `${linha} Odonto` };
          } else if (isMed) {
            const precisaSufixo = linhasOdontoAtivas.has(normTexto(linha)) || linhasOdontoAtivas.size > 0;
            return { ...d, Linha: precisaSufixo && !linha.toLowerCase().includes('medicina') ? `${linha} Medicina` : linha };
          }
          return d;
        });
    }
  }

  const res = pivotar(itens, fonte.pivot?.eixo || 'Coluna', fonte.pivot?.serie || 'Linha');

  // Para evento-benchmark (Relatório 15): separar em Despesas Hospitalares e Despesas Ambulatoriais, com Total Geral
  if (isEventoBenchmark && res.linhas && res.linhas.length) {
    const temTotHosp = res.linhas.some((l) => normTexto(l.__eixo).includes('total hospitalar'));
    if (!temTotHosp) {
      const cir = res.linhas.find((l) => normTexto(l.__eixo).includes('cirurg'));
      const cli = res.linhas.find((l) => normTexto(l.__eixo).includes('clinic'));
      const mat = res.linhas.find((l) => normTexto(l.__eixo).includes('maternidade'));
      if (cir || cli || mat) {
        const totDesp = (num(cir?.Total) || 0) + (num(cli?.Total) || 0) + (num(mat?.Total) || 0);
        const totPctCart = (num(cir?.['% Despesa']) || 0) + (num(cli?.['% Despesa']) || 0) + (num(mat?.['% Despesa']) || 0);
        const totPctBench = (num(cir?.['% Despesa Bench']) || 0) + (num(cli?.['% Despesa Bench']) || 0) + (num(mat?.['% Despesa Bench']) || 0);
        const rowHosp = {
          __eixo: 'Total Hospitalar',
          Total: totDesp,
          '% Despesa': totPctCart ? brl(totPctCart, 2) + '%' : '—',
          '% Despesa Bench': totPctBench ? brl(totPctBench, 2) + '%' : '—',
        };
        res.linhas.push(rowHosp);
      }
    }

    // Cruzamento com Relatório 14 (Evolução Mensal Despesa Por Evento) para obter Custo Anterior e Variação
    const idsR14 = idsDaFonte({ assinatura: 'eventoMensal' });
    const itensR14 = (idsR14.length ? idsR14.flatMap(itensDoRelatorio) : itensDoRelatorio(14)) || [];
    // Cruzamento com Relatório 5 (Indicadores de Utilização) para obter Quantidade e Variações
    const idsR5 = idsDaFonte({ assinatura: 'indicadores' });
    const itensR5 = (idsR5.length ? idsR5.flatMap(itensDoRelatorio) : itensDoRelatorio(5)) || [];

    // Detecta dinamicamente a quantidade de meses do período atual (ex: 12 meses)
    const colMeses14 = [...new Set(itensR14.map((d) => d.Coluna).filter((c) => chavePeriodo(c) !== null))];
    let qtdMesesPeriodo = colMeses14.length;
    if (!qtdMesesPeriodo || qtdMesesPeriodo <= 0) {
      try {
        const dadosSin = typeof extrairDadosSinistralidadePeriodos === 'function' ? extrairDadosSinistralidadePeriodos() : null;
        const mesesAtu = dadosSin?.periodosFormatados?.[1]?.meses?.filter(Boolean) || [];
        if (mesesAtu.length > 0) qtdMesesPeriodo = mesesAtu.length;
      } catch (_) {}
    }
    if (!qtdMesesPeriodo || qtdMesesPeriodo <= 0) {
      qtdMesesPeriodo = 12;
    }

    const ehColMediaAnt = (c) => {
      const norm = normTexto(c);
      return norm === 'media anterior' || norm === 'ano 1' || norm === 'anterior';
    };
    const ehColMediaAtu = (c) => {
      const norm = normTexto(c);
      return norm === 'media' || norm === 'ano 2' || norm === 'atual';
    };

    const itensHospDef = ESTRUTURA_SECOES_EVENTO[0].itens;
    const itensAmbDef = ESTRUTURA_SECOES_EVENTO[1].itens;

    const itemOdontoDef = { nome: 'Despesas odontológicas', match: (k) => k.includes('odonto') };

    const resolverDadosItem = (it) => {
      const row15 = res.linhas.find((l) => it.match(normTexto(l.__eixo)));
      const itemAnt = itensR14.find((d) => it.match(normTexto(d.Linha)) && ehColMediaAnt(d.Coluna));
      const itemAtu = itensR14.find((d) => it.match(normTexto(d.Linha)) && ehColMediaAtu(d.Coluna));

      const vAnt = itemAnt ? num(itemAnt.Valor) : null;
      let vAtu = itemAtu ? num(itemAtu.Valor) : null;
      const vTot = row15 ? num(row15.Total) : null;

      // Fallback seguro se não houver coluna Media explícita em R14 mas houver vTot e qtdMesesPeriodo
      if (vAtu === null && vTot !== null && qtdMesesPeriodo > 0) {
        vAtu = vTot / qtdMesesPeriodo;
      }

      const vAntAcumulado = vAnt !== null ? vAnt * qtdMesesPeriodo : null;
      const pCart = row15 ? num(row15['% Despesa'] ?? row15['Perc_Despesa']) : null;
      const pBench = row15 ? num(row15['% Despesa Bench'] ?? row15['Perc_Despesa_Bench']) : null;

      // Resolução de Quantidade via R5 (apenas dados oficiais da API)
      let qtd = null;
      const kNome = normTexto(it.nome);
      if (kNome.includes('consulta') && !kNome.includes('emerg')) {
        const q = itensR5.find((d) => (normTexto(d.Linha).includes('consulta') || normTexto(d.Linha).includes('consultas')) && igual(d.Coluna, 'Quantidade'));
        if (q) qtd = num(q.Valor);
      } else if (kNome.includes('exame')) {
        const q = itensR5.find((d) => (normTexto(d.Linha).includes('exame') || normTexto(d.Linha).includes('exames')) && !normTexto(d.Linha).includes('consulta') && igual(d.Coluna, 'Quantidade'));
        if (q) qtd = num(q.Valor);
      } else if (kNome.includes('terapia')) {
        const q = itensR5.find((d) => normTexto(d.Linha).includes('terapia') && igual(d.Coluna, 'Quantidade'));
        if (q) qtd = num(q.Valor);
      } else if (kNome.includes('emerg') || kNome.includes('urgenc') || kNome.includes('pronto')) {
        if (row15 && (num(row15.Total) > 0 || num(row15['% Despesa']) > 0 || num(row15['Perc_Despesa']) > 0)) {
          const q = itensR5.find((d) => (normTexto(d.Linha).includes('urgencia') || normTexto(d.Linha).includes('urgência') || normTexto(d.Linha).includes('pronto')) && igual(d.Coluna, 'Quantidade'));
          if (q) qtd = num(q.Valor);
        }
      }

      return {
        it,
        nome: it.nome,
        qtd,
        vTot,
        pCart,
        pBench,
        vAnt,
        vAtu,
        vAntAcumulado,
      };
    };

    const formatarLinha = (nome, vTot, pCart, pBench, vAnt, vAtu, qtd, varQtdParam = null, opts = {}, vAntAcumuladoParam = null, qtdAnt = null) => {
      const vAntAcumulado = vAntAcumuladoParam !== null ? vAntAcumuladoParam : (vAnt !== null ? vAnt * qtdMesesPeriodo : null);
      let varStr = '—';
      let varPct = null;
      if (vAntAcumulado !== null && vTot !== null && vAntAcumulado > 0) {
        varPct = ((vTot - vAntAcumulado) / vAntAcumulado) * 100;
        varStr = (varPct > 0 ? '+' : '') + brl(varPct, 1) + '%';
      } else if (vAnt !== null && vAtu !== null && vAnt > 0) {
        varPct = ((vAtu - vAnt) / vAnt) * 100;
        varStr = (varPct > 0 ? '+' : '') + brl(varPct, 1) + '%';
      } else if (vAntAcumulado !== null && vTot !== null) {
        if (vTot > 0 && vAntAcumulado === 0) {
          varPct = 100;
          varStr = '+100,0%';
        } else {
          varPct = 0;
          varStr = '0,0%';
        }
      } else {
        varPct = null;
        varStr = '—';
      }

      let difStr = '—';
      let dif = null;
      if (pCart !== null && pBench !== null) {
        dif = pCart - pBench;
        difStr = (dif > 0 ? '+' : '') + brl(dif, 1) + ' p.p.';
      }

      const custoMedio = (vAtu !== null && vAtu >= 0) ? Math.round(vAtu) : null;
      const custoMedioAnt = (vAnt !== null && vAnt >= 0) ? Math.round(vAnt) : null;

      let varQtdCalc = null;
      if (qtd !== null && qtdAnt !== null && qtdAnt > 0) {
        varQtdCalc = ((qtd - qtdAnt) / qtdAnt) * 100;
      }

      return {
        __eixo: nome,
        __classeLinha: opts.classeLinha || '',
        __destaque: !!opts.isDestaque,
        __isSecao: !!opts.isSecao,
        Quantidade: qtd,
        Qtd: qtd,
        QtdAnt: qtdAnt,
        QuantidadeAnt: qtdAnt,
        QuantidadeAnoAnterior: qtdAnt,
        'Despesa (R$)': vTot,
        Despesa: vTot,
        'Custo (R$)': vTot,
        Custo: vTot,
        Total: vTot,
        Valor: vTot,
        DespesaAnt: vAntAcumulado,
        CustoAnt: vAntAcumulado,
        'Ano 1': vAntAcumulado,
        Anterior: vAntAcumulado,
        AnoAnterior: vAntAcumulado,
        CustoAnoAnterior: vAntAcumulado,
        PercTotalAnt: null,
        PercTotalAnoAnterior: null,
        DespesaMediaAnt: custoMedioAnt,
        CustoMedioAnt: custoMedioAnt,
        TicketMedioAnt: custoMedioAnt,
        'Despesa média (R$)': custoMedio,
        DespesaMedia: custoMedio,
        CustoMedio: custoMedio,
        TicketMedio: custoMedio,
        _vAnt: vAntAcumulado,
        _vAtu: vTot,
        'Ano 2': vAtu,
        '% Empresa': pCart !== null ? brl(pCart, 2) + '%' : '—',
        '% da despesa total': pCart !== null ? brl(pCart, 2) + '%' : '—',
        'Custo Total %': pCart !== null ? brl(pCart, 2) + '%' : '—',
        '% Despesa': pCart !== null ? brl(pCart, 2) + '%' : '—',
        Perc_Despesa: pCart,
        'Benchmark*': pBench !== null ? brl(pBench, 2) + '%' : '—',
        '% Despesa Bench': pBench !== null ? brl(pBench, 2) + '%' : '—',
        Perc_Despesa_Bench: pBench,
        VarQtd: varQtdCalc,
        VarQtdPct: varQtdCalc,
        VarDespesa: varPct,
        VarCusto: varPct,
        VarCustoPct: varPct,
        Variação: varStr,
        Variacao: varStr,
        Variao: varStr,
        VarPct: varPct,
        Dif: dif,
        Diferença: difStr,
      };
    };

    const linhasEstruturadas = [];

    // 1. SEÇÃO HOSPITALAR (vem antes de ambulatorial conforme solicitado)
    const hospProcessados = itensHospDef.map(resolverDadosItem);
    const rowTotHosp15 = res.linhas.find((l) => ESTRUTURA_SECOES_EVENTO[0].matchTotal(normTexto(l.__eixo)));
    const totHospVTot = rowTotHosp15 ? num(rowTotHosp15.Total) : hospProcessados.reduce((acc, d) => acc + (d.vTot || 0), 0);
    const totHospPCart = rowTotHosp15 ? num(rowTotHosp15['% Despesa'] ?? rowTotHosp15['Perc_Despesa']) : hospProcessados.reduce((acc, d) => acc + (d.pCart || 0), 0);
    const totHospPBench = rowTotHosp15 ? num(rowTotHosp15['% Despesa Bench'] ?? rowTotHosp15['Perc_Despesa_Bench']) : hospProcessados.reduce((acc, d) => acc + (d.pBench || 0), 0);

    const itemAntTotHosp = itensR14.find((d) => ESTRUTURA_SECOES_EVENTO[0].matchTotal(normTexto(d.Linha)) && ehColMediaAnt(d.Coluna));
    const itemAtuTotHosp = itensR14.find((d) => ESTRUTURA_SECOES_EVENTO[0].matchTotal(normTexto(d.Linha)) && ehColMediaAtu(d.Coluna));
    const temAntHosp = itemAntTotHosp ? num(itemAntTotHosp.Valor) !== null : hospProcessados.some((d) => d.vAnt !== null);
    const temAtuHosp = itemAtuTotHosp ? num(itemAtuTotHosp.Valor) !== null : hospProcessados.some((d) => d.vAtu !== null);
    const totHospVAnt = itemAntTotHosp ? num(itemAntTotHosp.Valor) : (temAntHosp ? hospProcessados.reduce((acc, d) => acc + (d.vAnt || 0), 0) : null);
    const totHospVAtu = itemAtuTotHosp ? num(itemAtuTotHosp.Valor) : (temAtuHosp ? hospProcessados.reduce((acc, d) => acc + (d.vAtu || 0), 0) : null);
    const totHospVAntAcumulado = totHospVAnt !== null ? totHospVAnt * qtdMesesPeriodo : (temAntHosp ? hospProcessados.reduce((acc, d) => acc + (d.vAntAcumulado || 0), 0) : null);

    const qInt = itensR5.find((d) => (normTexto(d.Linha).includes('int 1000') || normTexto(d.Linha).includes('internacoes') || normTexto(d.Linha).includes('internações')) && igual(d.Coluna, 'Quantidade'));
    const rawHospQtd = qInt ? num(qInt.Valor) : hospProcessados.reduce((acc, d) => acc + (d.qtd || 0), 0);
    const totHospQtd = rawHospQtd > 0 ? rawHospQtd : null;

    linhasEstruturadas.push(formatarLinha(
      'Total Despesas Hospitalares',
      totHospVTot,
      totHospPCart,
      totHospPBench,
      totHospVAnt,
      totHospVAtu,
      totHospQtd,
      null,
      { isSecao: true, isDestaque: true, classeLinha: 'linha-secao-evento linha-total-hospitalar' },
      totHospVAntAcumulado
    ));

    hospProcessados.forEach((d) => {
      linhasEstruturadas.push(formatarLinha(
        d.nome,
        d.vTot,
        d.pCart,
        d.pBench,
        d.vAnt,
        d.vAtu,
        d.qtd,
        null,
        { classeLinha: 'linha-hospitalar' },
        d.vAntAcumulado
      ));
    });

    // 2. SEÇÃO AMBULATORIAL (vem após hospitalar)
    const ambProcessados = itensAmbDef.map(resolverDadosItem);
    const rowTotAmb15 = res.linhas.find((l) => ESTRUTURA_SECOES_EVENTO[1].matchTotal(normTexto(l.__eixo)));
    const totAmbVTot = rowTotAmb15 ? num(rowTotAmb15.Total) : ambProcessados.reduce((acc, d) => acc + (d.vTot || 0), 0);
    const totAmbPCart = rowTotAmb15 ? num(rowTotAmb15['% Despesa'] ?? rowTotAmb15['Perc_Despesa']) : ambProcessados.reduce((acc, d) => acc + (d.pCart || 0), 0);
    const totAmbPBench = rowTotAmb15 ? num(rowTotAmb15['% Despesa Bench'] ?? rowTotAmb15['Perc_Despesa_Bench']) : ambProcessados.reduce((acc, d) => acc + (d.pBench || 0), 0);

    const itemAntTotAmb = itensR14.find((d) => ESTRUTURA_SECOES_EVENTO[1].matchTotal(normTexto(d.Linha)) && ehColMediaAnt(d.Coluna));
    const itemAtuTotAmb = itensR14.find((d) => ESTRUTURA_SECOES_EVENTO[1].matchTotal(normTexto(d.Linha)) && ehColMediaAtu(d.Coluna));
    const temAntAmb = itemAntTotAmb ? num(itemAntTotAmb.Valor) !== null : ambProcessados.some((d) => d.vAnt !== null);
    const temAtuAmb = itemAtuTotAmb ? num(itemAtuTotAmb.Valor) !== null : ambProcessados.some((d) => d.vAtu !== null);
    const totAmbVAnt = itemAntTotAmb ? num(itemAntTotAmb.Valor) : (temAntAmb ? ambProcessados.reduce((acc, d) => acc + (d.vAnt || 0), 0) : null);
    const totAmbVAtu = itemAtuTotAmb ? num(itemAtuTotAmb.Valor) : (temAtuAmb ? ambProcessados.reduce((acc, d) => acc + (d.vAtu || 0), 0) : null);
    const totAmbVAntAcumulado = temAntAmb ? (totAmbVAnt !== null ? totAmbVAnt * qtdMesesPeriodo : ambProcessados.reduce((acc, d) => acc + (d.vAntAcumulado || 0), 0)) : null;
    const totAmbQtd = ambProcessados.filter((d) => d.qtd !== null).reduce((acc, d) => acc + (d.qtd || 0), 0);

    linhasEstruturadas.push(formatarLinha(
      'Total Despesas Ambulatoriais',
      totAmbVTot,
      totAmbPCart,
      totAmbPBench,
      totAmbVAnt,
      totAmbVAtu,
      totAmbQtd > 0 ? totAmbQtd : null,
      null,
      { isSecao: true, isDestaque: true, classeLinha: 'linha-secao-evento linha-total-ambulatorial' },
      totAmbVAntAcumulado
    ));

    ambProcessados.forEach((d) => {
      linhasEstruturadas.push(formatarLinha(
        d.nome,
        d.vTot,
        d.pCart,
        d.pBench,
        d.vAnt,
        d.vAtu,
        d.qtd,
        null,
        { classeLinha: 'linha-ambulatorial' },
        d.vAntAcumulado
      ));
    });

    // 3. ODONTOLOGIA
    const odoProcessado = resolverDadosItem(itemOdontoDef);
    linhasEstruturadas.push(formatarLinha(
      odoProcessado.nome,
      odoProcessado.vTot,
      odoProcessado.pCart,
      odoProcessado.pBench,
      odoProcessado.vAnt,
      odoProcessado.vAtu,
      odoProcessado.qtd,
      null,
      { classeLinha: 'linha-odontologia' },
      odoProcessado.vAntAcumulado
    ));

    // 4. TOTAL GERAL (abaixo de Despesas odontológicas englobando tudo)
    const rowTotGeral15 = res.linhas.find((l) => ITEM_TOTAL_GERAL_EVENTO.match(normTexto(l.__eixo)));
    const totGeralVTot = rowTotGeral15 ? num(rowTotGeral15.Total) : ((totHospVTot || 0) + (totAmbVTot || 0) + (odoProcessado.vTot || 0));
    const totGeralPCart = rowTotGeral15 ? num(rowTotGeral15['% Despesa'] ?? rowTotGeral15['Perc_Despesa']) : ((totHospPCart || 0) + (totAmbPCart || 0) + (odoProcessado.pCart || 0));
    const totGeralPBench = rowTotGeral15 ? num(rowTotGeral15['% Despesa Bench'] ?? rowTotGeral15['Perc_Despesa_Bench']) : ((totHospPBench || 0) + (totAmbPBench || 0) + (odoProcessado.pBench || 0));

    const itemAntTotGeral = itensR14.find((d) => ITEM_TOTAL_GERAL_EVENTO.match(normTexto(d.Linha)) && ehColMediaAnt(d.Coluna));
    const itemAtuTotGeral = itensR14.find((d) => ITEM_TOTAL_GERAL_EVENTO.match(normTexto(d.Linha)) && ehColMediaAtu(d.Coluna));
    const temAntGeral = itemAntTotGeral ? num(itemAntTotGeral.Valor) !== null : ((totHospVAntAcumulado !== null) || (totAmbVAntAcumulado !== null) || (odoProcessado.vAntAcumulado !== null));
    const temAtuGeral = itemAtuTotGeral ? num(itemAtuTotGeral.Valor) !== null : ((totHospVAtu !== null) || (totAmbVAtu !== null) || (odoProcessado.vAtu !== null));

    const totGeralVAnt = itemAntTotGeral ? num(itemAntTotGeral.Valor) : (temAntGeral ? ((totHospVAnt || 0) + (totAmbVAnt || 0) + (odoProcessado.vAnt || 0)) : null);
    const totGeralVAtu = itemAtuTotGeral ? num(itemAtuTotGeral.Valor) : (temAtuGeral ? ((totHospVAtu || 0) + (totAmbVAtu || 0) + (odoProcessado.vAtu || 0)) : null);
    const totGeralVAntAcumulado = temAntGeral ? (totGeralVAnt !== null ? totGeralVAnt * qtdMesesPeriodo : ((totHospVAntAcumulado || 0) + (totAmbVAntAcumulado || 0) + (odoProcessado.vAntAcumulado || 0))) : null;

    // Total Geral não deve somar internações hospitalares com procedimentos ambulatoriais
    const totGeralQtd = null;

    linhasEstruturadas.push(formatarLinha(
      'Total Geral',
      totGeralVTot,
      (totGeralVTot > 0 || totGeralPCart > 0) ? 100 : null,
      totGeralPBench,
      totGeralVAnt,
      totGeralVAtu,
      totGeralQtd,
      null,
      { isDestaque: true, classeLinha: 'linha-total' },
      totGeralVAntAcumulado
    ));

    // Cálculo proporcional de % da Despesa Total do Período Anterior para Slide 26
    const cTotGeralAnt = num(totGeralVAntAcumulado);
    if (cTotGeralAnt !== null && cTotGeralAnt > 0) {
      linhasEstruturadas.forEach((row) => {
        if (row.__eixo === 'Total Geral') {
          row.PercTotalAnt = 100;
          row.PercTotalAnoAnterior = 100;
        } else {
          const cRowAnt = num(row.DespesaAnt ?? row.CustoAnt ?? row['Ano 1'] ?? row.CustoAnoAnterior);
          if (cRowAnt !== null && cRowAnt >= 0) {
            const pct = Number(((cRowAnt / cTotGeralAnt) * 100).toFixed(2));
            row.PercTotalAnt = pct;
            row.PercTotalAnoAnterior = pct;
          } else {
            row.PercTotalAnt = null;
            row.PercTotalAnoAnterior = null;
          }
        }
      });
    } else {
      linhasEstruturadas.forEach((row) => {
        row.PercTotalAnt = null;
        row.PercTotalAnoAnterior = null;
      });
    }

    ['Quantidade', 'Despesa (R$)', 'Despesa', 'Custo (R$)', 'Custo', 'Total', '% Empresa', '% da despesa total', 'Custo Total %', '% Despesa', 'Benchmark*', '% Despesa Bench', 'DespesaMedia', 'CustoMedio', 'DespesaMediaAnt', 'CustoMedioAnt', 'VarQtd', 'VarDespesa', 'VarCusto', 'Ano 1', 'Ano 2', 'Variação', 'Diferença', 'DespesaAnt', 'CustoAnt', 'Anterior', 'Ano Anterior', 'QtdAnt', 'QuantidadeAnt', 'QuantidadeAnoAnterior', 'PercTotalAnt', 'PercTotalAnoAnterior'].forEach((s) => {
      if (!res.series.includes(s)) res.series.push(s);
    });

    res.linhas = linhasEstruturadas;
  }

  // Para evento-mensal (Relatório 14): padronizar linhas e seções com base em Despesa por tipo de evento
  if (isEventoMensal && res.linhas && res.linhas.length) {
    const linhasEstruturadas = [];
    const meses = (res.series || []).filter((s) => chavePeriodo(s) !== null);

    const itensHosp = ESTRUTURA_SECOES_EVENTO[0].itens;
    const itensAmb = ESTRUTURA_SECOES_EVENTO[1].itens;

    // 1. Processa itens hospitalares
    const hospProcessados = itensHosp.map((it) => {
      const row14 = res.linhas.find((l) => it.match(normTexto(l.__eixo)));
      const obj = {
        __eixo: it.nome,
        __classeLinha: it.classeLinha || 'linha-hospitalar',
      };
      meses.forEach((m) => {
        obj[m] = row14 && row14[m] !== undefined && row14[m] !== null && row14[m] !== '' ? num(row14[m]) : null;
      });
      return obj;
    });

    // Total Despesas Hospitalares (linha do R14 'Total Hospitalar' ou soma das linhas hospitalares)
    const rowTotHosp14 = res.linhas.find((l) => ESTRUTURA_SECOES_EVENTO[0].matchTotal(normTexto(l.__eixo)));
    const rowTotHosp = {
      __eixo: 'Total Despesas Hospitalares',
      __isSecao: true,
      __destaque: true,
      __classeLinha: 'linha-secao-evento linha-total-hospitalar',
    };
    meses.forEach((m) => {
      let v = rowTotHosp14 && rowTotHosp14[m] !== undefined && rowTotHosp14[m] !== null && rowTotHosp14[m] !== '' ? num(rowTotHosp14[m]) : null;
      if (v === null) {
        const soma = hospProcessados.reduce((acc, d) => acc + (d[m] || 0), 0);
        v = soma > 0 ? soma : null;
      }
      rowTotHosp[m] = v;
    });

    linhasEstruturadas.push(rowTotHosp);
    hospProcessados.forEach((d) => linhasEstruturadas.push(d));

    // 2. Processa itens ambulatoriais
    const ambProcessados = itensAmb.map((it) => {
      const row14 = res.linhas.find((l) => it.match(normTexto(l.__eixo)));
      const obj = {
        __eixo: it.nome,
        __classeLinha: it.classeLinha || 'linha-ambulatorial',
      };
      meses.forEach((m) => {
        obj[m] = row14 && row14[m] !== undefined && row14[m] !== null && row14[m] !== '' ? num(row14[m]) : null;
      });
      return obj;
    });

    // Total Despesas Ambulatoriais (linha do R14 'Total Ambulatorial' ou soma das linhas ambulatoriais)
    const rowTotAmb14 = res.linhas.find((l) => ESTRUTURA_SECOES_EVENTO[1].matchTotal(normTexto(l.__eixo)));
    const rowTotAmb = {
      __eixo: 'Total Despesas Ambulatoriais',
      __isSecao: true,
      __destaque: true,
      __classeLinha: 'linha-secao-evento linha-total-ambulatorial',
    };
    meses.forEach((m) => {
      let v = rowTotAmb14 && rowTotAmb14[m] !== undefined && rowTotAmb14[m] !== null && rowTotAmb14[m] !== '' ? num(rowTotAmb14[m]) : null;
      if (v === null) {
        const soma = ambProcessados.reduce((acc, d) => acc + (d[m] || 0), 0);
        v = soma > 0 ? soma : null;
      }
      rowTotAmb[m] = v;
    });

    linhasEstruturadas.push(rowTotAmb);
    ambProcessados.forEach((d) => linhasEstruturadas.push(d));

    // 3. Despesas odontológicas
    const rowOdo14 = res.linhas.find((l) => ITEM_ODONTOLOGIA_EVENTO.match(normTexto(l.__eixo)));
    const rowOdo = {
      __eixo: 'Despesas odontológicas',
      __classeLinha: 'linha-odontologia',
    };
    meses.forEach((m) => {
      rowOdo[m] = rowOdo14 && rowOdo14[m] !== undefined && rowOdo14[m] !== null && rowOdo14[m] !== '' ? num(rowOdo14[m]) : null;
    });
    linhasEstruturadas.push(rowOdo);

    // 4. Total Geral
    const rowTotGeral14 = res.linhas.find((l) => ITEM_TOTAL_GERAL_EVENTO.match(normTexto(l.__eixo)));
    const rowTotGeral = {
      __eixo: 'Total Geral',
      __destaque: true,
      __classeLinha: 'linha-total',
    };
    meses.forEach((m) => {
      let v = rowTotGeral14 && rowTotGeral14[m] !== undefined && rowTotGeral14[m] !== null && rowTotGeral14[m] !== '' ? num(rowTotGeral14[m]) : null;
      if (v === null) {
        const soma = (rowTotHosp[m] || 0) + (rowTotAmb[m] || 0) + (rowOdo[m] || 0);
        v = soma > 0 ? soma : null;
      }
      rowTotGeral[m] = v;
    });
    linhasEstruturadas.push(rowTotGeral);

    res.linhas = linhasEstruturadas;
  }

  // Para mix-le-rc (Relatório 4): padronizar linhas e seções com base em Despesa por tipo de evento
  if (isMixLeRc && res.linhas && res.linhas.length) {
    const linhasEstruturadas = [];
    const ids15 = idsDaFonte({ assinatura: 'eventoBenchmark' });
    const itens15 = ids15.length ? ids15.flatMap((id) => itensDoRelatorio(id)) : itensDoRelatorio(15);
    const ids14 = idsDaFonte({ assinatura: 'eventoMensal' });
    const itens14 = ids14.length ? ids14.flatMap((id) => itensDoRelatorio(id)) : itensDoRelatorio(14);
    const ids5 = idsDaFonte({ assinatura: 'indicadores' });
    const itens5 = ids5.length ? ids5.flatMap((id) => itensDoRelatorio(id)) : itensDoRelatorio(5);

    const itensHosp = ESTRUTURA_SECOES_EVENTO[0].itens;
    const itensAmb = ESTRUTURA_SECOES_EVENTO[1].itens;

    // Detecta dinamicamente a quantidade de meses do período atual (ex: 7 para Jan a Jul)
    const colMeses14 = [...new Set(itens14.map((d) => d.Coluna).filter((c) => chavePeriodo(c) !== null))];
    let qtdMesesPeriodo = colMeses14.length;
    if (!qtdMesesPeriodo || qtdMesesPeriodo <= 0) {
      try {
        const dadosSin = typeof extrairDadosSinistralidadePeriodos === 'function' ? extrairDadosSinistralidadePeriodos() : null;
        const mesesAtu = dadosSin?.periodosFormatados?.[1]?.meses?.filter(Boolean) || [];
        if (mesesAtu.length > 0) qtdMesesPeriodo = mesesAtu.length;
      } catch (_) {}
    }
    if (!qtdMesesPeriodo || qtdMesesPeriodo <= 0) {
      qtdMesesPeriodo = 12;
    }

    const resolverLinhaMix = (matcher, nomeExibicao, opts = {}) => {
      const row4 = res.linhas.find((l) => matcher.match(normTexto(l.__eixo)));

      let custoMonetario = null;
      if (itens15.length) {
        const m15 = itens15.find((d) => matcher.match(normTexto(d.Linha)) && (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')));
        if (m15 && num(m15.Valor) !== null) custoMonetario = num(m15.Valor);
      }
      if (custoMonetario === null && itens14.length) {
        const m14 = itens14.find((d) => matcher.match(normTexto(d.Linha)) && (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')));
        if (m14 && num(m14.Valor) !== null) custoMonetario = num(m14.Valor);
        if (custoMonetario === null) {
          const porMes14 = itens14.filter((d) => matcher.match(normTexto(d.Linha)) && chavePeriodo(d.Coluna) !== null);
          if (porMes14.length) {
            const soma14 = porMes14.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
            if (soma14 > 0) custoMonetario = soma14;
          }
        }
      }

      let pTot = row4 ? row4.PercTotal : null;
      let pRC = row4 ? row4.PercRC : null;
      let pLE = row4 ? row4.PercLE : null;

      // Percentual de benchmark (via R15 % Despesa Bench)
      let pBench = null;
      if (itens15.length) {
        const m15Bench = itens15.find((d) => matcher.match(normTexto(d.Linha)) && normTexto(d.Coluna).includes('bench'));
        if (m15Bench && num(m15Bench.Valor) !== null) pBench = num(m15Bench.Valor);
      }

      // Variação de custo vs período anterior (via R14 Media vs Media Anterior)
      let varCusto = null;
      let valAtual = null;
      let valAnt = null;
      if (itens14.length) {
        const mAtual = itens14.find((d) => matcher.match(normTexto(d.Linha)) && (igual(d.Coluna, 'Media') || igual(d.Coluna, 'Média') || igual(d.Coluna, 'Ano 2') || igual(d.Coluna, 'Atual')));
        const mAnt = itens14.find((d) => matcher.match(normTexto(d.Linha)) && (igual(d.Coluna, 'Media Anterior') || igual(d.Coluna, 'Média Anterior') || igual(d.Coluna, 'Ano 1') || igual(d.Coluna, 'Anterior')));
        valAtual = mAtual && num(mAtual.Valor) !== null ? num(mAtual.Valor) : null;
        valAnt = mAnt && num(mAnt.Valor) !== null ? num(mAnt.Valor) : null;
      }
      if (valAnt === null && itens15.length) {
        const m15Ant = itens15.find((d) => matcher.match(normTexto(d.Linha)) && (igual(d.Coluna, 'Ano 1') || igual(d.Coluna, 'Anterior') || igual(d.Coluna, 'Ano Anterior')));
        if (m15Ant && num(m15Ant.Valor) !== null) valAnt = num(m15Ant.Valor);
      }
      if (valAtual === null && custoMonetario !== null) {
        valAtual = custoMonetario;
      }
      if (valAtual !== null && valAnt !== null && valAnt > 0) {
        varCusto = ((valAtual - valAnt) / valAnt) * 100;
      }

      // Variação da utilização na rede credenciada (VarRC)
      let varRC = null;
      if (row4) {
        if (row4.VarRC !== undefined && row4.VarRC !== null) {
          varRC = num(row4.VarRC);
        } else if (row4.PercVarRC !== undefined && row4.PercVarRC !== null) {
          varRC = num(row4.PercVarRC);
        } else if (row4.VarCustoRC !== undefined && row4.VarCustoRC !== null) {
          varRC = num(row4.VarCustoRC);
        } else if (row4.PercRC_Anterior !== undefined && row4.PercRC_Anterior !== null && pRC !== null) {
          const rcAtual = num(pRC) || 0;
          const rcAnt = num(row4.PercRC_Anterior) || 0;
          const nAtual = (rcAtual > 0 && rcAtual <= 1.0 && !String(pRC).includes('%')) ? rcAtual * 100 : rcAtual;
          const nAnt = (rcAnt > 0 && rcAnt <= 1.0 && !String(row4.PercRC_Anterior).includes('%')) ? rcAnt * 100 : rcAnt;
          varRC = nAtual - nAnt;
        }
      }

      // Variação na livre escolha / reembolso (VarLE)
      let varLE = null;
      if (row4) {
        if (row4.VarLE !== undefined && row4.VarLE !== null) {
          varLE = num(row4.VarLE);
        } else if (row4.PercVarLE !== undefined && row4.PercVarLE !== null) {
          varLE = num(row4.PercVarLE);
        } else if (row4.VarCustoLE !== undefined && row4.VarCustoLE !== null) {
          varLE = num(row4.VarCustoLE);
        } else if (row4.PercLE_Anterior !== undefined && row4.PercLE_Anterior !== null && pLE !== null) {
          const leAtual = num(pLE) || 0;
          const leAnt = num(row4.PercLE_Anterior) || 0;
          const nAtual = (leAtual > 0 && leAtual <= 1.0 && !String(pLE).includes('%')) ? leAtual * 100 : leAtual;
          const nAnt = (leAnt > 0 && leAnt <= 1.0 && !String(row4.PercLE_Anterior).includes('%')) ? leAnt * 100 : leAnt;
          varLE = nAtual - nAnt;
        } else if (varRC !== null) {
          // No mix de utilização (onde RC + LE = 100%), a variação de LE é o inverso simétrico de RC
          varLE = -varRC;
        }
      }

      // Quantidade de procedimentos via R5 (indicadores)
      let qtd = null;
      if (itens5.length) {
        const kNome = normTexto(matcher.nome || nomeExibicao);
        if (kNome === 'consultas') {
          const q = itens5.find((d) => normTexto(d.Linha).includes('consultas') && igual(d.Coluna, 'Quantidade'));
          if (q) qtd = num(q.Valor);
        } else if (kNome === 'exames') {
          const q = itens5.find((d) => normTexto(d.Linha).includes('exames') && igual(d.Coluna, 'Quantidade'));
          if (q) qtd = num(q.Valor);
        } else if (kNome.includes('terapia')) {
          const q = itens5.find((d) => normTexto(d.Linha).includes('terapia') && igual(d.Coluna, 'Quantidade'));
          if (q) qtd = num(q.Valor);
        } else if (kNome.includes('emerg') || kNome.includes('urgenc') || kNome.includes('pronto')) {
          if (custoMonetario > 0 || (row4 && (num(row4.PercTotal) > 0 || num(row4.PercRC) > 0 || num(row4.PercLE) > 0))) {
            const q = itens5.find((d) => (normTexto(d.Linha).includes('urgencia') || normTexto(d.Linha).includes('urgência') || normTexto(d.Linha).includes('pronto')) && igual(d.Coluna, 'Quantidade'));
            if (q) qtd = num(q.Valor);
          }
        } else if (kNome.includes('odonto')) {
          const q = itens5.find((d) => normTexto(d.Linha).includes('odonto') && igual(d.Coluna, 'Quantidade'));
          if (q) qtd = num(q.Valor);
        }
      }

      // Custo acumulado do período anterior proporcional aos N meses analisados
      const custoAntAcumulado = valAnt !== null ? valAnt * qtdMesesPeriodo : null;

      return {
        __eixo: nomeExibicao,
        __classeLinha: opts.classeLinha || '',
        __destaque: !!opts.isDestaque,
        __isSecao: !!opts.isSecao,
        Quantidade: qtd,
        Qtd: qtd,
        QtdAnt: null,
        QuantidadeAnt: null,
        QuantidadeAnoAnterior: null,
        'Despesa (R$)': custoMonetario,
        Despesa: custoMonetario,
        'Custo (R$)': custoMonetario,
        Custo: custoMonetario,
        Total: custoMonetario,
        Valor: custoMonetario,
        PercTotal: pTot,
        '% da despesa total': pTot !== null ? brl(pTot, 2) + '%' : '—',
        '% do custo total': pTot !== null ? brl(pTot, 2) + '%' : '—',
        PercTotalAnt: null,
        PercTotalAnoAnterior: null,
        PercBench: pBench,
        'Benchmark*': pBench !== null ? brl(pBench, 2) + '%' : '—',
        PercRC: pRC,
        '% Rede credenciada': pRC !== null ? brl(pRC, 2) + '%' : '—',
        PercLE: pLE,
        '% Reembolso (LE)': pLE !== null ? brl(pLE, 2) + '%' : '—',
        VarRC: varRC,
        PercVarRC: varRC,
        VarCustoRC: varRC,
        'Var. RC': varRC,
        VarLE: varLE,
        VarCustoLE: varLE,
        PercVarLE: varLE,
        'Var. LE': varLE,
        VarCusto: varCusto,
        _vAtu: valAtual,
        _vAnt: valAnt,
        DespesaAnt: custoAntAcumulado,
        CustoAnt: custoAntAcumulado,
        'Ano 1': custoAntAcumulado,
        CustoAnoAnterior: custoAntAcumulado,
      };
    };

    // 1. Itens hospitalares
    const hospProcessados = itensHosp.map((it) => resolverLinhaMix(it, it.nome, { classeLinha: it.classeLinha || 'linha-hospitalar' }));

    // Total Despesas Hospitalares
    const matTotHosp = { match: ESTRUTURA_SECOES_EVENTO[0].matchTotal };
    const rowTotHosp = resolverLinhaMix(matTotHosp, 'Total Despesas Hospitalares', {
      isSecao: true,
      isDestaque: true,
      classeLinha: 'linha-secao-evento linha-total-hospitalar',
    });
    if (rowTotHosp.Custo === null) {
      const somaCusto = hospProcessados.reduce((acc, d) => acc + (d.Custo || 0), 0);
      if (somaCusto > 0) rowTotHosp.Custo = rowTotHosp.Total = rowTotHosp.Valor = somaCusto;
    }
    if (rowTotHosp.PercTotal === null) {
      const somaPerc = hospProcessados.reduce((acc, d) => acc + (num(d.PercTotal) || 0), 0);
      if (somaPerc > 0) rowTotHosp.PercTotal = somaPerc;
    }
    if (rowTotHosp.PercBench === null) {
      const somaBench = hospProcessados.reduce((acc, d) => acc + (num(d.PercBench) || 0), 0);
      if (somaBench > 0) rowTotHosp.PercBench = somaBench;
    }
    const somaHospAtu = hospProcessados.reduce((acc, d) => acc + (d._vAtu || 0), 0);
    const somaHospAnt = hospProcessados.reduce((acc, d) => acc + (d._vAnt || 0), 0);
    if ((rowTotHosp._vAnt === null || rowTotHosp._vAnt === undefined) && somaHospAnt > 0) {
      rowTotHosp._vAnt = somaHospAnt;
    }
    if ((rowTotHosp._vAtu === null || rowTotHosp._vAtu === undefined) && somaHospAtu > 0) {
      rowTotHosp._vAtu = somaHospAtu;
    }
    if (rowTotHosp.VarCusto === null && (rowTotHosp._vAtu || 0) > 0 && (rowTotHosp._vAnt || 0) > 0) {
      rowTotHosp.VarCusto = (((rowTotHosp._vAtu || 0) - (rowTotHosp._vAnt || 0)) / (rowTotHosp._vAnt || 0)) * 100;
    }
    const custoTotHospAnt = rowTotHosp._vAnt !== null ? rowTotHosp._vAnt * qtdMesesPeriodo : hospProcessados.reduce((acc, d) => acc + (d.CustoAnt || 0), 0);
    rowTotHosp.CustoAnt = rowTotHosp['Ano 1'] = rowTotHosp.CustoAnoAnterior = (custoTotHospAnt > 0 ? custoTotHospAnt : null);
    rowTotHosp.QtdAnt = rowTotHosp.QuantidadeAnt = rowTotHosp.QuantidadeAnoAnterior = null;

    const qInt = itens5.find((d) => normTexto(d.Linha).includes('int 1000') && igual(d.Coluna, 'Quantidade'));
    const totHospQtd = qInt ? num(qInt.Valor) : hospProcessados.reduce((acc, d) => acc + (d.Quantidade || 0), 0);
    rowTotHosp.Quantidade = totHospQtd > 0 ? totHospQtd : null;
    rowTotHosp.Qtd = totHospQtd > 0 ? totHospQtd : null;

    linhasEstruturadas.push(rowTotHosp);
    hospProcessados.forEach((d) => linhasEstruturadas.push(d));

    // 2. Itens ambulatoriais
    const ambProcessados = itensAmb.map((it) => resolverLinhaMix(it, it.nome, { classeLinha: it.classeLinha || 'linha-ambulatorial' }));

    // Total Despesas Ambulatoriais
    const matTotAmb = { match: ESTRUTURA_SECOES_EVENTO[1].matchTotal };
    const rowTotAmb = resolverLinhaMix(matTotAmb, 'Total Despesas Ambulatoriais', {
      isSecao: true,
      isDestaque: true,
      classeLinha: 'linha-secao-evento linha-total-ambulatorial',
    });
    if (rowTotAmb.Custo === null) {
      const somaCusto = ambProcessados.reduce((acc, d) => acc + (d.Custo || 0), 0);
      if (somaCusto > 0) rowTotAmb.Custo = rowTotAmb.Total = rowTotAmb.Valor = somaCusto;
    }
    if (rowTotAmb.PercTotal === null) {
      const somaPerc = ambProcessados.reduce((acc, d) => acc + (num(d.PercTotal) || 0), 0);
      if (somaPerc > 0) rowTotAmb.PercTotal = somaPerc;
    }
    if (rowTotAmb.PercBench === null) {
      const somaBench = ambProcessados.reduce((acc, d) => acc + (num(d.PercBench) || 0), 0);
      if (somaBench > 0) rowTotAmb.PercBench = somaBench;
    }
    const somaAmbAtu = ambProcessados.reduce((acc, d) => acc + (d._vAtu || 0), 0);
    const somaAmbAnt = ambProcessados.reduce((acc, d) => acc + (d._vAnt || 0), 0);
    if ((rowTotAmb._vAnt === null || rowTotAmb._vAnt === undefined) && somaAmbAnt > 0) {
      rowTotAmb._vAnt = somaAmbAnt;
    }
    if ((rowTotAmb._vAtu === null || rowTotAmb._vAtu === undefined) && somaAmbAtu > 0) {
      rowTotAmb._vAtu = somaAmbAtu;
    }
    if (rowTotAmb.VarCusto === null && (rowTotAmb._vAtu || 0) > 0 && (rowTotAmb._vAnt || 0) > 0) {
      rowTotAmb.VarCusto = (((rowTotAmb._vAtu || 0) - (rowTotAmb._vAnt || 0)) / (rowTotAmb._vAnt || 0)) * 100;
    }
    const custoTotAmbAnt = rowTotAmb._vAnt !== null ? rowTotAmb._vAnt * qtdMesesPeriodo : ambProcessados.reduce((acc, d) => acc + (d.CustoAnt || 0), 0);
    rowTotAmb.CustoAnt = rowTotAmb['Ano 1'] = rowTotAmb.CustoAnoAnterior = (custoTotAmbAnt > 0 ? custoTotAmbAnt : null);
    rowTotAmb.QtdAnt = rowTotAmb.QuantidadeAnt = rowTotAmb.QuantidadeAnoAnterior = null;

    const totAmbQtd = ambProcessados.filter((d) => d.Quantidade !== null).reduce((acc, d) => acc + (d.Quantidade || 0), 0);
    rowTotAmb.Quantidade = totAmbQtd > 0 ? totAmbQtd : null;
    rowTotAmb.Qtd = totAmbQtd > 0 ? totAmbQtd : null;

    linhasEstruturadas.push(rowTotAmb);
    ambProcessados.forEach((d) => linhasEstruturadas.push(d));

    // 3. Despesas odontológicas
    const rowOdo = resolverLinhaMix(ITEM_ODONTOLOGIA_EVENTO, 'Despesas odontológicas', { classeLinha: 'linha-odontologia' });
    linhasEstruturadas.push(rowOdo);

    // 4. Total Geral
    const rowTotGeral = resolverLinhaMix(ITEM_TOTAL_GERAL_EVENTO, 'Total Geral', { isDestaque: true, classeLinha: 'linha-total' });
    if (rowTotGeral.Custo === null) {
      const somaCusto = (rowTotHosp.Custo || 0) + (rowTotAmb.Custo || 0) + (rowOdo.Custo || 0);
      if (somaCusto > 0) rowTotGeral.Custo = rowTotGeral.Total = rowTotGeral.Valor = somaCusto;
    }
    if (rowTotGeral.PercTotal === null) {
      rowTotGeral.PercTotal = 100;
    }
    if (rowTotGeral.PercBench === null) {
      const somaBench = (rowTotHosp.PercBench || 0) + (rowTotAmb.PercBench || 0) + (rowOdo.PercBench || 0);
      if (somaBench > 0) rowTotGeral.PercBench = somaBench;
    }
    const somaGeralAtu = (rowTotHosp._vAtu || 0) + (rowTotAmb._vAtu || 0) + (rowOdo._vAtu || 0);
    const somaGeralAnt = (rowTotHosp._vAnt || 0) + (rowTotAmb._vAnt || 0) + (rowOdo._vAnt || 0);
    if ((rowTotGeral._vAnt === null || rowTotGeral._vAnt === undefined) && somaGeralAnt > 0) {
      rowTotGeral._vAnt = somaGeralAnt;
    }
    if ((rowTotGeral._vAtu === null || rowTotGeral._vAtu === undefined) && somaGeralAtu > 0) {
      rowTotGeral._vAtu = somaGeralAtu;
    }
    if (rowTotGeral.VarCusto === null && (rowTotGeral._vAtu || 0) > 0 && (rowTotGeral._vAnt || 0) > 0) {
      rowTotGeral.VarCusto = (((rowTotGeral._vAtu || 0) - (rowTotGeral._vAnt || 0)) / (rowTotGeral._vAnt || 0)) * 100;
    }
    const custoTotGeralAnt = rowTotGeral._vAnt !== null ? rowTotGeral._vAnt * qtdMesesPeriodo : ((rowTotHosp.CustoAnt || 0) + (rowTotAmb.CustoAnt || 0) + (rowOdo.CustoAnt || 0));
    rowTotGeral.CustoAnt = rowTotGeral['Ano 1'] = rowTotGeral.CustoAnoAnterior = (custoTotGeralAnt > 0 ? custoTotGeralAnt : null);
    rowTotGeral.QtdAnt = rowTotGeral.QuantidadeAnt = rowTotGeral.QuantidadeAnoAnterior = null;

    // Total Geral não deve somar internações hospitalares com procedimentos ambulatoriais
    rowTotGeral.Quantidade = null;
    rowTotGeral.Qtd = null;

    linhasEstruturadas.push(rowTotGeral);

    // Cálculo proporcional de % do Custo Total do Período Anterior
    const cTotGeralAnt = num(rowTotGeral.CustoAnt);
    if (cTotGeralAnt !== null && cTotGeralAnt > 0) {
      linhasEstruturadas.forEach((row) => {
        if (row === rowTotGeral) {
          row.PercTotalAnt = '100.00%';
          row.PercTotalAnoAnterior = '100.00%';
        } else {
          const cRowAnt = num(row.CustoAnt ?? row['Ano 1'] ?? row.CustoAnoAnterior);
          if (cRowAnt !== null && cRowAnt >= 0) {
            const pct = (cRowAnt / cTotGeralAnt) * 100;
            const strPct = `${pct.toFixed(2)}%`;
            row.PercTotalAnt = strPct;
            row.PercTotalAnoAnterior = strPct;
          } else {
            row.PercTotalAnt = null;
            row.PercTotalAnoAnterior = null;
          }
        }
      });
    } else {
      linhasEstruturadas.forEach((row) => {
        row.PercTotalAnt = null;
        row.PercTotalAnoAnterior = null;
      });
    }

    ['Despesa', 'Despesa (R$)', 'Custo', 'Total', 'Valor', 'PercTotal', '% da despesa total', '% do custo total', 'PercTotalAnt', 'PercTotalAnoAnterior', 'PercBench', 'Benchmark*', 'PercRC', '% Rede credenciada', 'PercLE', '% Reembolso (LE)', 'VarRC', 'VarCustoRC', 'PercVarRC', 'Var. RC', 'VarLE', 'VarCustoLE', 'PercVarLE', 'Var. LE', 'VarCusto', 'Quantidade', 'Qtd', 'DespesaAnt', 'CustoAnt', 'Ano 1', 'CustoAnoAnterior', 'QtdAnt', 'QuantidadeAnt', 'QuantidadeAnoAnterior'].forEach((s) => {
      if (!res.series.includes(s)) res.series.push(s);
    });

    res.linhas = linhasEstruturadas;
  }

  // Para o slide de indicadores, garantir ordenação amigável: Consultas, Exames, Exames por consulta, Pronto-Socorro, Terapias, Internações, Diárias, UTI, Média de permanência
  if (isIndicadores && res.linhas && res.linhas.length) {
    // 1. Extrai quantidades oficiais para cálculos e checagens cruzadas
    const getQtdPorEixo = (termo) => {
      const row = res.linhas.find((l) => normTexto(l.__eixo).includes(termo));
      return row ? num(row.Quantidade) : null;
    };
    const qtdConsultas = getQtdPorEixo('consultas');
    const qtdExames = getQtdPorEixo('exames');
    const qtdInt = getQtdPorEixo('interna') ?? getQtdPorEixo('int 1000');
    const qtdDiarias = getQtdPorEixo('diaria') ?? getQtdPorEixo('diárias 1000');
    const qtdDiariasUTI = getQtdPorEixo('uti');

    // 2. Obtém a soma de vidas-mês oficial de Medicina a partir do Relatório 8 (vidasMensal)
    let somaVidasMes = 0;
    try {
      const idsVidas = idsDaFonte({ assinatura: 'vidasMensal', todos: true });
      const itensVidasBrutos = idsVidas.flatMap((id) => itensDoRelatorio(id));
      const itensVidasOrd1 = itensVidasBrutos.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
      const baseVidas = itensVidasOrd1.length ? itensVidasOrd1 : itensVidasBrutos;
      const itensGrupo = baseVidas.filter((d) => d.Grupo == null || ['Medicina', 'M'].some((g) => igualGrupo(d.Grupo, g)));
      const meses = [...new Set(itensGrupo.map((d) => d.Coluna))].filter((c) => chavePeriodo(c) !== null);
      if (meses.length > 0) {
        meses.forEach((m) => {
          const rowTot = itensGrupo.find((d) => /^(total)$/i.test(String(d.Linha || '').trim()) && igual(d.Coluna, m));
          const valTot = rowTot ? num(rowTot.Valor) : null;
          if (valTot !== null && valTot > 0) {
            somaVidasMes += valTot;
          } else {
            const somaPlanos = itensGrupo
              .filter((d) => !/^(total|acumulado)$/i.test(String(d.Linha || '').trim()) && igual(d.Coluna, m))
              .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
            if (somaPlanos > 0) somaVidasMes += somaPlanos;
          }
        });
      }
    } catch (_) {}

    // 3. Benchmarks oficiais Omint (Slide 25 / Word) caso não retornem preenchidos da API
    const BENCHMARKS_PADRAO = {
      'consultas': 0.44,
      'exames': 3.23,
      'exames por consulta': 7.34,
      'internacoes por 1.000 vidas/mes': 15.94,
      'diarias por 1.000 vidas/mes': 33.80,
      'indice de uti': 23.04,
      'media de permanencia': 2.12,
    };

    // 4. Se "Exames por consulta" não veio no R5 mas há consultas e exames, constrói dinamicamente
    const temExamesPorConsulta = res.linhas.some((l) => normTexto(l.__eixo).includes('exame por consulta') || normTexto(l.__eixo).includes('exames por consulta'));
    if (!temExamesPorConsulta && qtdConsultas > 0 && qtdExames > 0) {
      const indExCons = qtdExames / qtdConsultas;
      const bmkExCons = 7.34;
      const difExCons = ((indExCons - bmkExCons) / bmkExCons) * 100;
      res.linhas.push({
        __eixo: 'Exames por consulta',
        Quantidade: null,
        Indicador: indExCons,
        Benchmark: bmkExCons,
        Dif: difExCons,
        DIF: difExCons,
      });
    }

    // 5. Se "Média de permanência" não veio no R5 mas há diárias e internações, constrói dinamicamente
    const temMediaPermanencia = res.linhas.some((l) => normTexto(l.__eixo).includes('permanen'));
    if (!temMediaPermanencia && qtdDiarias > 0 && qtdInt > 0) {
      const indPerm = qtdDiarias / qtdInt;
      const bmkPerm = 2.12;
      const difPerm = ((indPerm - bmkPerm) / bmkPerm) * 100;
      res.linhas.push({
        __eixo: 'Média de permanência',
        Quantidade: null,
        Indicador: indPerm,
        Benchmark: bmkPerm,
        Dif: difPerm,
        DIF: difPerm,
      });
    }

    // 6. Recalcular e sanitizar cada indicador para garantir exatidão atuarial
    res.linhas.forEach((l) => {
      const k = normTexto(l.__eixo);

      // Quantidade nula obrigatória para razões e médias (não são contagem de eventos)
      if (k.includes('exame por consulta') || k.includes('exames por consulta') || k.includes('permanen')) {
        l.Quantidade = null;
      }

      // Preenche benchmark padrão se ausente
      if (num(l.Benchmark) === null) {
        for (const [chaveBmk, valorBmk] of Object.entries(BENCHMARKS_PADRAO)) {
          if (k.includes(chaveBmk)) {
            l.Benchmark = valorBmk;
            break;
          }
        }
      }

      // Validação / Recálculo do Indicador caso a API não o tenha retornado (ou valor nulo)
      const indAtual = num(l.Indicador);
      if (indAtual === null) {
        if (k.includes('consulta') && !k.includes('exame') && somaVidasMes > 0 && qtdConsultas > 0) {
          l.Indicador = qtdConsultas / somaVidasMes;
        } else if (k.includes('exame') && !k.includes('consulta') && somaVidasMes > 0 && qtdExames > 0) {
          l.Indicador = qtdExames / somaVidasMes;
        } else if (k.includes('exame por consulta') && qtdConsultas > 0 && qtdExames > 0) {
          l.Indicador = qtdExames / qtdConsultas;
        } else if ((k.includes('pronto') || k.includes('urgenc')) && somaVidasMes > 0 && num(l.Quantidade) > 0) {
          l.Indicador = num(l.Quantidade) / somaVidasMes;
        } else if (k.includes('terapia') && somaVidasMes > 0 && num(l.Quantidade) > 0) {
          l.Indicador = num(l.Quantidade) / somaVidasMes;
        } else if (k.includes('interna') && somaVidasMes > 0 && qtdInt > 0) {
          l.Indicador = (qtdInt / somaVidasMes) * 1000;
        } else if (k.includes('diaria') && somaVidasMes > 0 && qtdDiarias > 0) {
          l.Indicador = (qtdDiarias / somaVidasMes) * 1000;
        } else if (k.includes('permanen') && qtdDiarias > 0 && qtdInt > 0) {
          l.Indicador = qtdDiarias / qtdInt;
        } else if (k.includes('uti') && qtdDiarias > 0 && qtdDiariasUTI > 0) {
          l.Indicador = (qtdDiariasUTI / qtdDiarias) * 100;
        }
      }

      // Validação / Recálculo do DIF
      const indVal = num(l.Indicador);
      const bmkVal = num(l.Benchmark);
      if (k.includes('uti')) {
        // Índice de UTI: diferença em pontos percentuais (p.p.)
        if (l.Dif == null && l.DIF == null && indVal !== null && bmkVal !== null) {
          l.Dif = l.DIF = indVal - bmkVal;
        }
      } else {
        // Demais indicadores: variação percentual relativa vs Benchmark
        if (l.Dif == null && l.DIF == null && indVal !== null && bmkVal !== null && bmkVal > 0) {
          l.Dif = l.DIF = ((indVal - bmkVal) / bmkVal) * 100;
        }
      }
    });

    // 7. Oculta linhas sem valores retornados pela API (ex: Pronto-Socorro ou Terapias caso não venham no contrato)
    res.linhas = res.linhas.filter((l) => {
      const qtd = num(l.Quantidade);
      const ind = num(l.Indicador);
      const bmk = num(l.Benchmark);
      const dif = num(l.Dif ?? l.DIF);
      return ind !== null || bmk !== null || dif !== null || (qtd !== null && qtd > 0);
    });

    // 8. Ordenação canônica estrita
    const ORDEM_IND = [
      'Consultas por vida/mês',
      'Exames por vida/mês',
      'Exames por consulta',
      'Pronto-Socorro por vida/mês',
      'Terapias por vida/mês',
      'Internações por 1.000 vidas/mês',
      'Diárias por 1.000 vidas/mês',
      'Índice de UTI',
      'Média de permanência'
    ];
    res.linhas.sort((a, b) => {
      const normA = normTexto(a.__eixo);
      const normB = normTexto(b.__eixo);
      const ia = ORDEM_IND.findIndex((o) => {
        const normO = normTexto(o);
        return normA === normO || normA.includes(normO) || normO.includes(normA);
      });
      const ib = ORDEM_IND.findIndex((o) => {
        const normO = normTexto(o);
        return normB === normO || normB.includes(normO) || normO.includes(normB);
      });
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  
  // Para vidas-mensal: calcular variação de vidas mantendo meses nas colunas
  if (isVidasMensal && res.linhas?.length && res.series?.length) {
    const temTotaisSeparados = res.linhas.some((l) => igual(l.__eixo, 'Total Medicina') || igual(l.__eixo, 'Total Odonto'));
    if (temTotaisSeparados) {
      const mesesPuros = res.series.filter((s) => chavePeriodo(s) !== null);
      const rowTot = { __eixo: 'Total' };
      mesesPuros.forEach((m) => {
        let soma = 0;
        res.linhas.forEach((l) => {
          if (!igual(l.__eixo, 'Total') && !igual(l.__eixo, 'Total Medicina') && !igual(l.__eixo, 'Total Odonto') && !String(l.__eixo).toLowerCase().includes('varia')) {
            soma += (num(l[m]) || 0);
          }
        });
        rowTot[m] = String(soma);
      });
      const idxMed = res.linhas.findIndex((l) => igual(l.__eixo, 'Total Medicina'));
      if (idxMed !== -1) res.linhas.splice(idxMed, 1);
      const idxOdo = res.linhas.findIndex((l) => igual(l.__eixo, 'Total Odonto'));
      if (idxOdo !== -1) res.linhas.splice(idxOdo, 1);
      res.linhas.push(rowTot);
    }

    const meses = res.series.filter((s) => chavePeriodo(s) !== null);
    if (meses.length >= 2) {
      const mIni = meses[0];
      const mFim = meses[meses.length - 1];

      res.linhas.forEach((l) => {
        const vIni = num(l[mIni]);
        const vFim = num(l[mFim]);
        if (vIni !== null && vFim !== null && vIni > 0) {
          const deltaNom = vFim - vIni;
          const deltaPct = (deltaNom / vIni) * 100;
          const sPct = deltaPct > 0 ? '+' : '';
          l['Variação'] = sPct + brl(deltaPct, 1) + '%';
        } else {
          l['Variação'] = '—';
        }
      });

      const totalRow = res.linhas.find((l) => igual(l.__eixo, 'Total')) || res.linhas[res.linhas.length - 1];
      if (totalRow) {
        const varRow = { __eixo: 'Variação mensal (%)' };
        meses.forEach((m, idx) => {
          if (idx === 0) {
            varRow[m] = '—';
          } else {
            const mAnt = meses[idx - 1];
            const vAnt = num(totalRow[mAnt]);
            const vAtu = num(totalRow[m]);
            if (vAnt && vAtu !== null) {
              const dMoM = ((vAtu - vAnt) / vAnt) * 100;
              varRow[m] = (dMoM > 0 ? '+' : '') + brl(dMoM, 1) + '%';
            } else {
              varRow[m] = '—';
            }
          }
        });
        const vTotIni = num(totalRow[mIni]);
        const vTotFim = num(totalRow[mFim]);
        if (vTotIni && vTotFim !== null) {
          const totPct = ((vTotFim - vTotIni) / vTotIni) * 100;
          varRow['Variação'] = (totPct > 0 ? '+' : '') + brl(totPct, 1) + '%';
        } else {
          varRow['Variação'] = '—';
        }
        const idxTot = res.linhas.findIndex((l) => igual(l.__eixo, 'Total'));
        if (idxTot !== -1) {
          res.linhas.splice(idxTot + 1, 0, varRow);
        } else {
          res.linhas.push(varRow);
        }
      }

      if (!res.series.includes('Variação')) {
        res.series.push('Variação');
      }
    }
  }

  // Para Perfil Financeiro e Sinistralidade (Relatório 12 / assinatura perfil)
  const isPerfil = fonte.assinatura === 'perfil' || idsDaFonte(fonte).includes(12);
  if (isPerfil && res.linhas && res.linhas.length) {
    const isOrdem2 =
      fonte.filtro?.ordem === 2 ||
      (!res.series.includes('Custo PMPM') && res.series.includes('Receita') && res.series.includes('Despesa'));

    const findRow = (predicate) => res.linhas.find(predicate);
    const getNorm = (l) => normTexto(l.__eixo);

    if (!isOrdem2) {
      // Ordem 1: Vidas, Receita, Despesa, Custo PMPM, Sinistralidade
      res.linhas.forEach((l) => {
        const desp = num(l.Despesa);
        const pmpm = num(l['Custo PMPM']);
        if (pmpm && pmpm > 0 && desp !== null) {
          l.Vidas = Math.round(desp / pmpm);
        } else if (l.Vidas === undefined) {
          l.Vidas = 0;
        }
      });

      const rowTitular = findRow((l) => getNorm(l) === 'titular');
      const rowDependente = findRow((l) => getNorm(l) === 'dependente');
      const rowMasc = findRow((l) => ['masc', 'masculino'].includes(getNorm(l)));
      const rowFem = findRow((l) => ['fem', 'feminino'].includes(getNorm(l)));
      const row0_21 = findRow((l) => ['00 - 21', '00-21', '0 a 17', '0 a 17 anos', '00 - 17', '00-17'].includes(getNorm(l)));
      const row18_59 = findRow((l) => ['18 a 59', '18 a 59 anos', '18-59'].includes(getNorm(l)));
      const row22_40 = findRow((l) => ['22 - 40', '22-40'].includes(getNorm(l)));
      const row41_59 = findRow((l) => ['41 - 59', '41-59'].includes(getNorm(l)));
      const row60_mais = findRow((l) => ['60 +', '60+', '60+ anos', '70 +', '70+'].includes(getNorm(l)));
      const rowTotalGeral = findRow((l) => ['total', 'total geral', 'total geral (carteira)'].includes(getNorm(l)));


      const criarLinhaTotal = (rotulo, linhasGrupo) => {
        const rec = linhasGrupo.reduce((acc, l) => acc + (num(l?.Receita) || 0), 0);
        const desp = linhasGrupo.reduce((acc, l) => acc + (num(l?.Despesa) || 0), 0);
        const vidas = linhasGrupo.reduce((acc, l) => acc + (num(l?.Vidas) || 0), 0);
        const pmpm = vidas > 0 ? desp / vidas : (rowTotalGeral ? num(rowTotalGeral['Custo PMPM']) : 0);
        const sin = rec > 0 ? (desp / rec) * 100 : (rowTotalGeral ? num(rowTotalGeral['Sinistralidade']) : 0);
        return {
          __eixo: rotulo,
          __destaque: true,
          Vidas: vidas || (rowTotalGeral ? num(rowTotalGeral.Vidas) : 0),
          Receita: rec || (rowTotalGeral ? num(rowTotalGeral.Receita) : 0),
          Despesa: desp || (rowTotalGeral ? num(rowTotalGeral.Despesa) : 0),
          'Custo PMPM': pmpm,
          Sinistralidade: sin,
        };
      };

      let rec18_59 = 0;
      let desp18_59 = 0;
      let vidas18_59 = 0;
      let pmpm18_59 = 0;
      let sin18_59 = 0;

      if (row18_59) {
        rec18_59 = num(row18_59.Receita) || 0;
        desp18_59 = num(row18_59.Despesa) || 0;
        vidas18_59 = num(row18_59.Vidas) || 0;
        pmpm18_59 = num(row18_59['Custo PMPM']) || 0;
        sin18_59 = num(row18_59.Sinistralidade) || 0;
      } else {
        rec18_59 = (num(row22_40?.Receita) || 0) + (num(row41_59?.Receita) || 0);
        desp18_59 = (num(row22_40?.Despesa) || 0) + (num(row41_59?.Despesa) || 0);
        vidas18_59 = (num(row22_40?.Vidas) || 0) + (num(row41_59?.Vidas) || 0);
        pmpm18_59 = vidas18_59 > 0 ? desp18_59 / vidas18_59 : 0;
        sin18_59 = rec18_59 > 0 ? (desp18_59 / rec18_59) * 100 : 0;
      }

      const linha0_17 = {
        __eixo: '0 a 17 anos',
        Vidas: num(row0_21?.Vidas) || 0,
        Receita: num(row0_21?.Receita) || 0,
        Despesa: num(row0_21?.Despesa) || 0,
        'Custo PMPM': num(row0_21?.['Custo PMPM']) || 0,
        Sinistralidade: num(row0_21?.Sinistralidade) || 0,
      };

      const linha18_59 = {
        __eixo: '18 a 59 anos',
        Vidas: vidas18_59,
        Receita: rec18_59,
        Despesa: desp18_59,
        'Custo PMPM': pmpm18_59,
        Sinistralidade: sin18_59,
      };

      const linha60_mais = {
        __eixo: '60+ anos',
        Vidas: num(row60_mais?.Vidas) || 0,
        Receita: num(row60_mais?.Receita) || 0,
        Despesa: num(row60_mais?.Despesa) || 0,
        'Custo PMPM': num(row60_mais?.['Custo PMPM']) || 0,
        Sinistralidade: num(row60_mais?.Sinistralidade) || 0,
      };

      if (fonte.filtro?.apenasFaixas) {
        // Cores fixas e intercaladas: #22368F (Azul Omint) e #A2B2EF (Azul Claro)
        const coresGenero = ['#22368F', '#A2B2EF'];
        const NAO_FAIXA = new Set([
          'titular', 'dependente', 'masc', 'masculino', 'fem', 'feminino',
          'total', 'total geral', 'total geral (carteira)', 'total (titularidade)',
          'total por genero', 'total (sexo)', 'total (genero)', 'total (faixa etaria)'
        ]);
        const faixasReais = res.linhas.filter((l) => {
          const k = getNorm(l);
          return k && !NAO_FAIXA.has(k) && (num(l['Custo PMPM']) || 0) > 0;
        });

        const linhasBase = faixasReais.length > 0
          ? faixasReais
          : [linha0_17, linha18_59, linha60_mais].filter((l) => (num(l['Custo PMPM']) || 0) > 0);

        res.linhas = linhasBase.map((l, i) => ({
          __eixo: l.__eixo,
          'Custo PMPM': num(l['Custo PMPM']) || 0,
          cor: coresGenero[i % coresGenero.length],
        }));
      } else if (!rowTitular && !rowDependente && (row0_21 || row22_40)) {
        res.linhas = [linha0_17, linha18_59, linha60_mais];
      } else {
        const linhaTitular = {
          __eixo: 'Titular',
          Vidas: num(rowTitular?.Vidas) || 0,
          Receita: num(rowTitular?.Receita) || 0,
          Despesa: num(rowTitular?.Despesa) || 0,
          'Custo PMPM': num(rowTitular?.['Custo PMPM']) || 0,
          Sinistralidade: num(rowTitular?.Sinistralidade) || 0,
        };

        const linhaDependente = {
          __eixo: 'Dependente',
          Vidas: num(rowDependente?.Vidas) || 0,
          Receita: num(rowDependente?.Receita) || 0,
          Despesa: num(rowDependente?.Despesa) || 0,
          'Custo PMPM': num(rowDependente?.['Custo PMPM']) || 0,
          Sinistralidade: num(rowDependente?.Sinistralidade) || 0,
        };

        const linhaMasc = {
          __eixo: 'Masculino',
          Vidas: num(rowMasc?.Vidas) || 0,
          Receita: num(rowMasc?.Receita) || 0,
          Despesa: num(rowMasc?.Despesa) || 0,
          'Custo PMPM': num(rowMasc?.['Custo PMPM']) || 0,
          Sinistralidade: num(rowMasc?.Sinistralidade) || 0,
        };

        const linhaFem = {
          __eixo: 'Feminino',
          Vidas: num(rowFem?.Vidas) || 0,
          Receita: num(rowFem?.Receita) || 0,
          Despesa: num(rowFem?.Despesa) || 0,
          'Custo PMPM': num(rowFem?.['Custo PMPM']) || 0,
          Sinistralidade: num(rowFem?.Sinistralidade) || 0,
        };

        const totalTit = criarLinhaTotal('Total (Titularidade)', [linhaTitular, linhaDependente]);
        const totalSex = criarLinhaTotal('Total (Por gênero)', [linhaMasc, linhaFem]);
        const totalFai = criarLinhaTotal('Total (Faixa Etária)', [linha0_17, linha18_59, linha60_mais]);

        res.linhas = [
          linhaTitular,
          linhaDependente,
          totalTit,
          linhaMasc,
          linhaFem,
          totalSex,
          linha0_17,
          linha18_59,
          linha60_mais,
          totalFai,
        ];
      }

      if (!res.series.includes('Vidas')) {
        res.series.unshift('Vidas');
      }
    } else {
      // Ordem 2: % Receita, % Despesa
      const rowTitular = findRow((l) => getNorm(l) === 'titular');
      const rowDependente = findRow((l) => getNorm(l) === 'dependente');
      const rowMasc = findRow((l) => ['masc', 'masculino'].includes(getNorm(l)));
      const rowFem = findRow((l) => ['fem', 'feminino'].includes(getNorm(l)));
      const row0_21 = findRow((l) => ['00 - 21', '00-21', '0 a 17', '0 a 17 anos', '00 - 17', '00-17'].includes(getNorm(l)));
      const row18_59 = findRow((l) => ['18 a 59', '18 a 59 anos', '18-59'].includes(getNorm(l)));
      const row22_40 = findRow((l) => ['22 - 40', '22-40'].includes(getNorm(l)));
      const row41_59 = findRow((l) => ['41 - 59', '41-59'].includes(getNorm(l)));
      const row60_mais = findRow((l) => ['60 +', '60+', '60+ anos', '70 +', '70+'].includes(getNorm(l)));

      const linhaTitular = {
        __eixo: 'Titular',
        Receita: num(rowTitular?.Receita) || 0,
        Despesa: num(rowTitular?.Despesa) || 0,
      };
      const linhaDependente = {
        __eixo: 'Dependente',
        Receita: num(rowDependente?.Receita) || 0,
        Despesa: num(rowDependente?.Despesa) || 0,
      };
      const totalTit = {
        __eixo: 'Total (Titularidade)',
        __destaque: true,
        Receita: 100,
        Despesa: 100,
      };

      const linhaMasc = {
        __eixo: 'Masculino',
        Receita: num(rowMasc?.Receita) || 0,
        Despesa: num(rowMasc?.Despesa) || 0,
      };
      const linhaFem = {
        __eixo: 'Feminino',
        Receita: num(rowFem?.Receita) || 0,
        Despesa: num(rowFem?.Despesa) || 0,
      };
      const totalGen = {
        __eixo: 'Total (Gênero)',
        __destaque: true,
        Receita: 100,
        Despesa: 100,
      };

      res.linhas = [
        linhaTitular,
        linhaDependente,
        totalTit,
        linhaMasc,
        linhaFem,
        totalGen,
      ];
    }
  }

  return res;
}

/**
 * Resolve itens de KPI do config:
 * { id, rotulo, fonte | derivado | template | valor, formato, escala, alerta, sub }
 * → [{ id, rotulo, valor, numero, formatado, estado, sub }]
 */
function resolverItensKpi(itens, ctx) {
  const calc = {};
  return (itens || []).map((item) => {
    let v = null;
    if (item.fonte) v = resolverFonteEscalar(item.fonte);
    else if (item.derivado) {
      const [a, b] = (item.derivado.de || []).map((k) => calc[k]);
      const f = item.derivado.fator ?? 1;
      const op = item.derivado.operacao;
      if (op === 'soma') {
        v = (a != null || b != null) ? (num(a) || 0) + (num(b) || 0) : null;
      } else if (a != null && (b != null || op === 'diferenca')) {
        v = op === 'percentual' ? (b ? (a / b) * 100 : 0)
          : op === 'diferenca' ? a - (b ?? 0)
          : op === 'variacao' ? (b && Math.abs(b) > 0 ? ((a - b) / Math.abs(b)) * 100 : (a === b ? 0 : null))
          : (a / b) * f;
      }
    } else if (item.template) v = interpolar(item.template, ctx);
    else if (item.valor !== undefined) v = item.valor;

    const id = item.id || item.rotulo;
    calc[id] = v;
    const n = num(v);
    const nEsc = n === null ? null : n * (item.escala || 1);
    return {
      id, rotulo: item.rotulo, valor: v, numero: nEsc,
      formatado: formatar(v, item.formato, item.escala),
      estado: estadoPorAlerta(nEsc, item.alerta),
      sub: item.sub ? interpolar(item.sub, { ...ctx, ...calc }) : null,
      oculto: !!item.oculto,
    };
  });
}

/* ============================================================
   3. Componentes visuais (UI)
   Todos devolvem strings HTML e não tocam no DOM — o mesmo HTML
   é usado no slide em tela e no palco do PDF.
   ============================================================ */

const PALETA = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
const clsEstado = (e) => (e && e !== 'neutro' ? ` estado-${e}` : '');

const UI = {
  cabecalho(bloco, ctx) {
    const eye = bloco.eyebrow?.trim();
    return `${eye ? `<div class="eyebrow">${esc(eye)}</div>` : ''}
      ${bloco.titulo ? `<h2>${esc(interpolar(bloco.titulo, ctx))}</h2>` : ''}`;
  },
  nota: (nota) => (nota ? `<p class="fonte-nota">${esc(nota)}</p>` : ''),
  rodape: (nota, legenda) => {
    let out = '';
    if (nota) out += `<p class="fonte-nota">${esc(nota)}</p>`;
    return out;
  },
  caixaComentarios(slideId, { placeholder = 'Observações da consultora...' } = {}) {
    const texto = TEXTOS[slideId] || '';
    const editavel = !LEITURA;
    if (!editavel && !texto.trim()) return '';
    const corpo = editavel
      ? `<div class="comentarios-texto texto-livre editavel" contenteditable="true" spellcheck="true" data-slide="${esc(slideId)}" data-placeholder="${esc(placeholder)}">${textoParaHtml(texto)}</div>`
      : `<div class="comentarios-texto texto-livre">${textoParaHtml(texto)}</div>`;
    return `<div class="comentarios-slide">${corpo}</div>`;
  },
  quadroConsultorTopo(slideId, { placeholder = 'Comentários adicionais...' } = {}) {
    const texto = TEXTOS[slideId] || '';
    const editavel = !LEITURA;
    if (!editavel && !texto.trim()) return '';
    const corpo = editavel
      ? `<div class="quadro-consultor-texto texto-livre editavel" contenteditable="true" spellcheck="true" data-slide="${esc(slideId)}" data-placeholder="${esc(placeholder)}">${textoParaHtml(texto)}</div>`
      : `<div class="quadro-consultor-texto texto-livre">${textoParaHtml(texto)}</div>`;
    return `<div class="card card-consultor-quadro">${corpo}</div>`;
  },
  vazio: (msg) => `<div class="empty-state"><div class="empty-icon">◌</div><p>${esc(msg || 'Sem dados para este bloco no período selecionado.')}</p></div>`,
  grade: (colunas, html) => `<div class="grade grade-${colunas}">${html}</div>`,
  card: (html, extra = '') => `<div class="card${extra ? ' ' + extra : ''}">${html}</div>`,
  subtitulo: (t) => (t ? `<p class="grafico-titulo">${esc(t)}</p>` : ''),

  badgeStatus(estado, texto) {
    return `<span class="badge${clsEstado(estado)}">${esc(texto)}</span>`;
  },

  cardKpi({ rotulo, valor, sub, estado, badge, grande }) {
    const rodape = badge || sub
      ? `<div class="kpi-sub">${badge ? UI.badgeStatus(badge.estado, badge.texto) : ''}${sub ? `<span>${esc(sub)}</span>` : ''}</div>`
      : '';
    const len = String(valor || '').length;
    const classeTamanho = len > 15 ? ' kpi-valor-longo' : len >= 12 ? ' kpi-valor-compacto' : len >= 9 ? ' kpi-valor-medio' : '';
    return `<div class="card kpi${clsEstado(estado)}${grande ? ' kpi-grande' : ''}">
      <div class="kpi-rotulo">${esc(rotulo)}</div>
      <div class="kpi-valor${classeTamanho}">${esc(valor)}</div>${rodape}</div>`;
  },

  /** valor/max em barra; marcador opcional { valor, rotulo } (ex.: meta) */
  barraProgresso({ rotulo, valor, max, texto, estado, marcador }) {
    const pct = max ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
    const mk = marcador && max
      ? `<span class="progresso-marcador" style="left:${Math.min(100, (marcador.valor / max) * 100).toFixed(1)}%" data-rotulo="${esc(marcador.rotulo || '')}"></span>`
      : '';
    return `<div class="progresso${clsEstado(estado)}${mk ? ' progresso-com-marcador' : ''}">
      <div class="progresso-topo"><span>${esc(rotulo)}</span><strong>${esc(texto)}</strong></div>
      <div class="progresso-barra"><div class="progresso-fill" style="width:${pct.toFixed(1)}%"></div>${mk}</div>
    </div>`;
  },

  /** linha "carteira × benchmark": a/b = { valor, texto }; delta = { estado, texto } */
  barraComparativa({ rotulo, a, b, max, delta }) {
    const pct = (v) => (max ? Math.max(0, Math.min(100, (Math.abs(v ?? 0) / max) * 100)) : 0).toFixed(1);
    const barra = (x, cls) => `<div class="comparativa-barra ${cls}">
        <div class="comparativa-track"><div class="comparativa-fill" style="width:${pct(x.valor)}%"></div></div>
        <span>${esc(x.texto)}</span></div>`;
    return `<div class="comparativa-linha">
      <div class="comparativa-rotulo">${esc(rotulo)}</div>
      <div class="comparativa-barras">${barra(a, 'barra-a')}${barra(b, 'barra-b')}</div>
      <div class="comparativa-delta">${delta ? UI.badgeStatus(delta.estado, delta.texto) : ''}</div>
    </div>`;
  },

  comparativa({ linhas, rotuloA, rotuloB }) {
    return `<div class="comparativa">
      <div class="comparativa-legenda"><span class="leg-a">${esc(rotuloA)}</span><span class="leg-b">${esc(rotuloB)}</span></div>
      ${linhas.join('')}</div>`;
  },

  /** etapas: [{ rotulo, valor(num), texto, sub }] — largura proporcional à 1ª etapa */
  funnel({ etapas }) {
    const base = Math.max(...etapas.map((e) => Math.abs(e.valor || 0)), 1e-9);
    return `<div class="funnel">${etapas.map((e) => {
      const w = Math.max(28, (Math.abs(e.valor || 0) / base) * 100);
      return `<div class="funnel-etapa">
        <div class="funnel-forma" style="width:${w.toFixed(1)}%" title="${esc(e.rotulo)}: ${esc(e.texto)}">${esc(e.texto)}</div>
        <div class="funnel-info"><span class="funnel-rotulo">${esc(e.rotulo)}</span>${e.sub ? `<span class="funnel-conv">${esc(e.sub)}</span>` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  },

  destaques(itens) {
    return `<ul class="destaques">${itens.map((d) => `<li class="${clsEstado(d.estado).trim()}">${esc(d.texto)}</li>`).join('')}</ul>`;
  },

  tabela(opts) {
    return UI.tabelaExecutiva({
      ...opts,
      linhas: opts.linhas || opts.celulas || [],
    });
  },

  /** colunas: [{ rotulo, numerica, largura }]  linhas: [[{ texto, classe, html }]] (+ __destaque)  rodape: [{ texto }] | null */
  tabelaExecutiva({ colunas, linhas, rodape, compacta, muitasColunas, colunasIguais, nota, scrollHorizontal, overflowVisible, superHeaders }) {
    const ehMuitasColunas = muitasColunas || colunas.length >= 8;
    const larguraIgual = colunasIguais ? `${(100 / colunas.length).toFixed(2)}%` : null;
    const th = colunas.map((c) => {
      const w = c.largura || larguraIgual;
      const style = w ? ` style="width: ${w};"` : '';
      return `<th${c.numerica ? ' class="num"' : ''}${style}>${esc(c.rotulo)}</th>`;
    }).join('');
    let theadHtml = `<tr>${th}</tr>`;
    if (Array.isArray(superHeaders) && superHeaders.length > 0) {
      const superTh = superHeaders.map((sh) => {
        const cs = sh.colspan || sh.colunas || 1;
        const cls = sh.classe ? ` class="${sh.classe}"` : '';
        const style = sh.style ? ` style="${sh.style}"` : '';
        return `<th colspan="${cs}"${cls}${style}>${esc(sh.titulo)}</th>`;
      }).join('');
      theadHtml = `<tr class="tr-super-header">${superTh}</tr><tr>${th}</tr>`;
    }
    const tr = linhas.map((cels, idx) => {
      if (cels.__isSecao) {
        const temValoresSecao = cels.some((c, j) => j > 0 && c.texto && c.texto !== '' && c.texto !== '—');
        if (!temValoresSecao) {
          const paddingSecao = ehMuitasColunas ? 'padding: 5px 6px; font-size: 9.5px;' : 'padding: 7px 12px; font-size: 11px;';
          return `<tr class="linha-secao-evento" style="background-color: #F1F5F9; border-top: 1.5px solid #CBD5E1; border-bottom: 1.5px solid #CBD5E1;">
            <td colspan="${colunas.length}" style="${paddingSecao} font-weight: 700; color: #172972; text-transform: uppercase; letter-spacing: 0.5px; border-left: 4px solid #172972;">
              ${esc(cels[0]?.texto || '')}
            </td>
          </tr>`;
        }
        return `<tr class="linha-secao-evento ${cels.__classeLinha || ''}">${cels
          .map((cel, j) => {
            const ehPrimeira = j === 0;
            const style = ehPrimeira
              ? (ehMuitasColunas
                  ? 'padding: 4px 6px; font-weight: 700; color: #172972; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.3px; border-left: 3px solid #172972;'
                  : 'padding: 7px 12px; font-weight: 700; color: #172972; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-left: 4px solid #172972;')
              : (ehMuitasColunas
                  ? 'padding: 4px 2.5px; font-weight: 700; color: #172972; font-size: 9.5px;'
                  : 'padding: 7px 8px; font-weight: 700; color: #172972; font-size: 11px;');
            const cls = [colunas[j]?.numerica ? 'num' : '', cel.classe || ''].filter(Boolean).join(' ');
            return `<td style="${style}"${cls ? ` class="${cls}"` : ''}>${cel.html !== undefined ? cel.html : esc(cel.texto)}</td>`;
          })
          .join('')}</tr>`;
      }
      const isUltima = idx === linhas.length - 1;
      const isTot = !rodape && isUltima && /^(total|total geral)$/i.test(String(cels[0]?.texto || '').trim());
      const classesLinha = [
        isTot ? 'linha-total' : (cels.__destaque ? 'linha-destaque' : ''),
        cels.__classeLinha || ''
      ].filter(Boolean).join(' ');
      return `<tr${classesLinha ? ` class="${classesLinha}"` : ''}>${cels
      .map((cel, j) => {
        let tit = '';
        if (!cel.html && (colunas[j]?.rotulo === 'Evento' || colunas[j]?.de === '__eixo')) {
          const m = {
            'Consultas': 'Consultas médicas ambulatoriais',
            'Exames': 'Exames laboratoriais e de imagem',
            'Consultas de Emergência': 'Atendimentos de pronto-socorro e emergência',
            'Atendimento ambulatorial': 'Demais procedimentos ambulatoriais',
            'Home care': 'Atenção e internação domiciliar',
            'Terapias seriadas': 'Fisioterapia, fonoaudiologia, psicologia, etc.',
            'Terapias Seriadas': 'Fisioterapia, fonoaudiologia, psicologia, etc.',
            'Outros Atend. Amb': 'Demais procedimentos ambulatoriais',
            'Outros Atend. Ambulatoriais': 'Demais procedimentos ambulatoriais',
            'Int.Cirurgica': 'Internações com procedimento cirúrgico',
            'Internação Cirúrgica': 'Internações com procedimento cirúrgico',
            'Internação cirúrgica': 'Internações com procedimento cirúrgico',
            'Int.Clínica': 'Internações clínicas (sem cirurgia)',
            'Internação Clínica': 'Internações clínicas (sem cirurgia)',
            'Internação clínica': 'Internações clínicas (sem cirurgia)',
            'Maternidade': 'Internações obstétricas',
            'Oncologia': 'Tratamentos e procedimentos oncológicos',
            'Total hospitalar': 'Soma de Internações (Cirúrgica e Clínica) e Maternidade',
            'Total Hospitalar': 'Soma de Internações (Cirúrgica e Clínica) e Maternidade',
            'Total Despesas Hospitalares': 'Soma de Internações (Cirúrgica e Clínica) e Maternidade',
            'Total Despesas Ambulatoriais': 'Soma de Consultas, Exames, Terapias e Outros',
            'Total Ambulatorial': 'Soma de Consultas, Exames, Terapias e Outros',
            'Total Geral': 'Soma total (Hospitalar + Ambulatorial + Odontologia)',
            'Despesas odontológicas': 'Procedimentos odontológicos',
            'Odontologia': 'Procedimentos odontológicos'
          };
          if (m[cel.texto]) tit = ` title="${m[cel.texto]}"`;
        }
        return `<td${tit} class="${[colunas[j]?.numerica ? 'num' : '', cel.classe || ''].filter(Boolean).join(' ')}">${cel.html !== undefined ? cel.html : esc(cel.texto)}</td>`;
      })
      .join('')}</tr>`;
    }).join('');
    const tf = rodape
      ? `<tfoot><tr class="linha-total">${rodape.map((cel, j) => {
          const classes = [colunas[j]?.numerica ? 'num' : '', cel.classe || ''].filter(Boolean).join(' ');
          return `<td${classes ? ` class="${classes}"` : ''}>${esc(cel.texto)}</td>`;
        }).join('')}</tr></tfoot>`
      : '';
    const classes = [
      'tabela-exec',
      compacta || ehMuitasColunas ? 'tabela-compacta' : '',
      ehMuitasColunas ? 'tabela-muitas-colunas' : '',
      colunasIguais ? 'tabela-colunas-iguais' : '',
      scrollHorizontal ? 'tabela-scroll-horizontal' : '',
      overflowVisible ? 'overflow-visible' : ''
    ].filter(Boolean).join(' ');
    const styleAttr = overflowVisible ? ' style="overflow: visible;"' : '';
    return `<div class="${classes}"${styleAttr}>
      <table class="compare-table"><thead>${theadHtml}</thead><tbody>${tr}</tbody>${tf}</table>
    </div>${UI.nota(nota)}`;
  },

  /* ---- gráficos SVG. cfg: { linhas, series, val(l,s), fmt(v), referencia, rotulos, titulo, coresPorBarra } ---- */

  _legenda(itens, xDireita, y, cores = null, abaixo = false, W = 900, tipoPadrao = 'linha') {
    if (!itens || itens.length < 2) return '';
    let out = '';
    const lista = itens.map((it, idx) => {
      if (typeof it === 'string') {
        const rot = formatarRotulo(it);
        const cor = (cores && (cores[it] || cores[idx])) || PALETA[idx % PALETA.length];
        return { rotulo: rot, cor, estilo: tipoPadrao };
      }
      return {
        rotulo: formatarRotulo(it.rotulo || it.nome || ''),
        cor: it.cor || (cores && (cores[it.rotulo] || cores[idx])) || PALETA[idx % PALETA.length],
        estilo: it.estilo || (it.tracejado ? 'tracejado' : tipoPadrao),
      };
    });

    if (abaixo) {
      const itemWidths = lista.map((it) => it.rotulo.length * 6.5 + (it.estilo === 'retangulo' || it.estilo === 'bloco' ? 34 : 38));
      const totalW = itemWidths.reduce((a, b) => a + b, 0);
      let currX = Math.max(16, (W - totalW) / 2);
      lista.forEach((it) => {
        const isRetangulo = it.estilo === 'retangulo' || it.estilo === 'bloco';
        if (isRetangulo) {
          out += `<rect x="${currX.toFixed(1)}" y="${(y - 10).toFixed(1)}" width="12" height="12" rx="3" fill="${it.cor}"/>
            <text class="g-legenda" x="${(currX + 18).toFixed(1)}" y="${y.toFixed(1)}" font-size="11.5" fill="#475569">${esc(it.rotulo)}</text>`;
          currX += it.rotulo.length * 6.5 + 34;
        } else {
          const isTracejado = it.estilo === 'tracejado';
          const dashAttr = isTracejado ? ' stroke-dasharray="4 2.5"' : '';
          const strokeW = isTracejado ? '2' : '3.5';
          out += `<line x1="${currX.toFixed(1)}" y1="${(y - 3).toFixed(1)}" x2="${(currX + 18).toFixed(1)}" y2="${(y - 3).toFixed(1)}" stroke="${it.cor}" stroke-width="${strokeW}"${dashAttr} stroke-linecap="round"/>
            <text class="g-legenda" x="${(currX + 24).toFixed(1)}" y="${y.toFixed(1)}" font-size="11.5" fill="#475569">${esc(it.rotulo)}</text>`;
          currX += it.rotulo.length * 6.5 + 38;
        }
      });
      return out;
    }

    let x = xDireita;
    for (let i = lista.length - 1; i >= 0; i--) {
      const it = lista[i];
      x -= it.rotulo.length * 7 + 26;
      if (it.estilo === 'tracejado') {
        out += `<line x1="${x}" y1="${y - 3}" x2="${x + 14}" y2="${y - 3}" stroke="${it.cor}" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>
          <text class="g-legenda" x="${x + 17}" y="${y + 1}">${esc(it.rotulo)}</text>`;
      } else {
        out += `<rect x="${x}" y="${y - 9}" width="12" height="12" rx="3" fill="${it.cor}"/>
          <text class="g-legenda" x="${x + 17}" y="${y + 1}">${esc(it.rotulo)}</text>`;
      }
    }
    return out;
  },
  _escalaY(vals, referencia) {
    let vmin = Math.min(0, ...vals, referencia ?? 0);
    let vmax = Math.max(...vals, referencia ?? -Infinity);
    if (!Number.isFinite(vmax)) vmax = 1;
    if (vmax === vmin) vmax = vmin + 1;
    vmax += (vmax - vmin) * 0.12;
    return { vmin, vmax };
  },
  _abrir: (W, H, titulo) => `<div class="grafico-wrap"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(titulo || 'Gráfico')}">`,
  _fechar: () => '</svg></div>',
  _grid(y, vmin, vmax, ml, x2, fmt, divisoes = 4) {
    let out = '';
    for (let g = 0; g <= divisoes; g++) {
      const v = vmin + ((vmax - vmin) * g) / divisoes;
      out += `<line class="g-grid" x1="${ml}" x2="${x2}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>
        <text class="g-eixo" x="${ml - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`;
    }
    return out;
  },
  _referencia(ref, y, ml, x2, cfg, xTxt) {
    if (ref === null || ref === undefined) return '';
    const rotulo = cfg?.referencia?.rotulo || (cfg?.fmt ? cfg.fmt(ref) : String(ref));
    const cor = cfg?.referencia?.cor || 'var(--cinza-400, #94A3B8)';
    const mostrarTexto = cfg?.referencia?.mostrarRotuloTexto === true;
    const posTxt = xTxt != null ? xTxt : x2;
    return `<line class="g-ref-hit" x1="${ml}" x2="${x2}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}" stroke="transparent" stroke-width="14" style="cursor: pointer;"><title>${esc(rotulo)}</title></line>
      <line class="g-ref" x1="${ml}" x2="${x2}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}" stroke="${cor}" stroke-dasharray="3 3" style="cursor: pointer;"><title>${esc(rotulo)}</title></line>
      ${mostrarTexto ? `<text class="g-ref-txt" x="${posTxt}" y="${(y(ref) - 6).toFixed(1)}" text-anchor="end">${esc(rotulo)}</text>` : ''}`;
  },

  graficoLinha(cfg) {
    const { linhas, series, val, fmt } = cfg;

    // 1. Configuração de Breakeven (ex: 75% ou objeto { valor: 75, rotulo: '75%', cor: '#C93B2B' })
    let bkCfg = null;
    if (cfg.breakeven != null) {
      if (typeof cfg.breakeven === 'number') {
        bkCfg = { valor: cfg.breakeven, rotulo: `${cfg.breakeven}%`, cor: '#C93B2B' };
      } else if (typeof cfg.breakeven === 'object') {
        const v = cfg.breakeven.valor != null ? cfg.breakeven.valor : 75;
        bkCfg = {
          valor: v,
          rotulo: cfg.breakeven.rotulo ?? `${v}%`,
          cor: cfg.breakeven.cor || '#C93B2B',
        };
      }
    }

    // 2. Configuração de Total Consolidado após o último mês
    const temConsolidado = !!cfg.consolidado;
    let consRotulo = 'Total';
    let consValores = {};
    let consTipo = 'ponto';
    if (temConsolidado) {
      if (typeof cfg.consolidado === 'number') {
        consValores[series[0]] = cfg.consolidado;
      } else if (typeof cfg.consolidado === 'object' && cfg.consolidado !== null) {
        consRotulo = cfg.consolidado.rotulo || 'Total';
        consTipo = cfg.consolidado.tipo || 'ponto';
        if (cfg.consolidado.valores) {
          consValores = cfg.consolidado.valores;
        } else if (cfg.consolidado.valor != null) {
          consValores[series[0]] = cfg.consolidado.valor;
        } else {
          consValores = cfg.consolidado;
        }
      }
    }

    const consValList = series
      .map((s, si) => num(consValores[s] ?? consValores[si]))
      .filter((v) => v !== null && !isNaN(v));

    const vals = linhas.flatMap((l) => series.map((s) => val(l, s))).filter((v) => v !== null);
    const ref = cfg.referencia?.valor != null ? num(cfg.referencia.valor) : null;
    const divisoes = cfg.gridDivisoes || 4;

    const valsParaEscala = [...vals, ...consValList];
    if (ref != null) valsParaEscala.push(ref);
    if (bkCfg?.valor != null) valsParaEscala.push(num(bkCfg.valor));

    let vmin, vmax;
    if (cfg.yMin !== undefined && cfg.yMax !== undefined) {
      vmin = cfg.yMin;
      vmax = cfg.yMax;
    } else {
      const escY = UI._escalaY(valsParaEscala, ref);
      vmin = escY.vmin;
      vmax = escY.vmax;
    }

    const W = 900, ml = 86, mr = 24;
    const pwTotal = W - ml - mr;
    const wConsolidado = temConsolidado ? 76 : 0;
    const pw = pwTotal - wConsolidado;
    const stepX = linhas.length > 1 ? pw / (linhas.length - 1) : pw;
    const rotacionar = cfg.rotacionarEixo !== undefined ? !!cfg.rotacionarEixo : (linhas.length > 7 || stepX < 65);
    const H = Number(cfg.altura || cfg.H) || (rotacionar ? 385 : 360);
    const mt = H <= 260 ? 26 : 34;
    const mb = cfg.legendaAbaixo
      ? (rotacionar ? (cfg.mb || (H <= 260 ? 75 : 82)) : (cfg.mb || (H <= 260 ? 50 : 60)))
      : (rotacionar ? (cfg.mb || (H <= 260 ? 65 : 75)) : (cfg.mb || (H <= 260 ? 40 : 52)));
    const ph = H - mt - mb;

    const x = (i) => ml + (linhas.length <= 1 ? pw / 2 : (pw * i) / (linhas.length - 1));
    const y = (v) => mt + ph - ((v - vmin) / (vmax - vmin)) * ph;

    const formatarEixo = (rot) => {
      if (!rot) return '';
      if (typeof cfg.mesEncurtado === 'function') {
        return cfg.mesEncurtado(rot);
      }
      if (cfg.mesEncurtado) {
        return String(rot).replace(/\/20(\d{2})\b/, '/$1').replace(/\/(\d{4})\b/, '/$1');
      }
      return rot;
    };

    let out = UI._abrir(W, H, cfg.titulo) + UI._grid(y, vmin, vmax, ml, W - mr, fmt, divisoes);

    linhas.forEach((l, i) => {
      const cx = x(i);
      const txt = formatarEixo(l.__eixo);
      if (rotacionar) {
        const cy = H - mb + 14;
        // No primeiro mês (i === 0), o rótulo inclinado a -45° com text-anchor="end" começa antes do número do eixo Y.
        // Deslocamos para que o início do rótulo comece após o número do eixo Y (à direita de ml), preservando a inclinação diagonal.
        const deslocX = (i === 0 && linhas.length > 1) ? Math.min(26, stepX * 0.45) : 0;
        const cxLabel = cx + deslocX;
        out += `<text class="g-eixo g-eixo-rotacionado" font-size="11" x="${cxLabel.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="end" transform="rotate(-45 ${cxLabel.toFixed(1)} ${cy.toFixed(1)})">${esc(rotuloCurto(txt, 18))}</text>`;
      } else {
        const cxLabel = (i === 0 && linhas.length > 1) ? (cx + 2) : cx;
        const anchor = (i === 0 && linhas.length > 1) ? 'start' : 'middle';
        out += `<text class="g-eixo" x="${cxLabel.toFixed(1)}" y="${H - mb + (H <= 260 ? 18 : 22)}" text-anchor="${anchor}">${esc(rotuloCurto(txt, 10))}</text>`;
      }
    });

    // Separador vertical e rótulo do Total Consolidado
    const xSep = ml + pw + 22;
    const xCons = ml + pw + 54;
    if (temConsolidado) {
      out += `<line class="g-consolidado-sep" x1="${xSep.toFixed(1)}" y1="${mt}" x2="${xSep.toFixed(1)}" y2="${(H - mb).toFixed(1)}" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="3 3"/>`;
      const cyCons = rotacionar ? H - mb + 14 : H - mb + (H <= 260 ? 18 : 22);
      out += `<text class="g-eixo g-eixo-consolidado" font-weight="700" fill="#1F5077" x="${xCons.toFixed(1)}" y="${cyCons.toFixed(1)}" text-anchor="middle">${esc(consRotulo)}</text>`;
    }

    // Linha de referência padrão (ancorada antes do consolidado quando presente)
    const xTxtRef = temConsolidado ? (xSep - 8) : (W - mr);
    out += UI._referencia(ref, y, ml, W - mr, cfg, xTxtRef);

    // Linha de breakeven opcional (ex: 75%)
    if (bkCfg && bkCfg.valor != null) {
      const bkVal = num(bkCfg.valor);
      if (bkVal !== null && !isNaN(bkVal)) {
        const bkY = y(bkVal).toFixed(1);
        const bkCor = bkCfg.cor || '#C93B2B';
        const xFinal = W - mr;
        const bkRotulo = bkCfg.rotulo || `${bkVal}%`;
        const mostrarTextoBk = bkCfg.mostrarRotuloTexto === true;
        const xTxtBreakeven = temConsolidado ? (xSep - 8) : xFinal;
        out += `<line class="g-ref-hit" x1="${ml}" x2="${xFinal}" y1="${bkY}" y2="${bkY}" stroke="transparent" stroke-width="14" style="cursor: pointer;"><title>${esc(bkRotulo)}</title></line>
          <line class="g-ref g-ref-breakeven" x1="${ml}" x2="${xFinal}" y1="${bkY}" y2="${bkY}" stroke="${bkCor}" stroke-dasharray="4 3" stroke-width="1.5" style="cursor: pointer;"><title>${esc(bkRotulo)}</title></line>
          ${mostrarTextoBk ? `<text class="g-ref-txt g-ref-breakeven-txt" x="${xTxtBreakeven.toFixed(1)}" y="${(bkY - 6)}" fill="${bkCor}" font-size="11" font-weight="700" text-anchor="end">${esc(bkRotulo)}</text>` : ''}`;
      }
    }

    // Os pontos marcadores com hover não devem ser opcionais
    const mostrarPontos = true;

    series.forEach((s, si) => {
      const cor = (cfg.cores && (cfg.cores[s] || cfg.cores[si])) || PALETA[si % PALETA.length];
      const pts = linhas.map((l, i) => ({ i, v: val(l, s) })).filter((p) => p.v !== null);
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
      out += `<g class="g-serie"><path d="${d}" fill="none" stroke="${cor}" stroke-width="${cfg.espessuraLinha || 3.5}" stroke-linejoin="round" stroke-linecap="round"><title>${esc(s)}</title></path>`;

      // Linha de tendência matemática opcional (regressão linear OLS)
      let aplicarTendencia = false;
      let tendCfg = {};
      if (cfg.tendencia) {
        if (cfg.tendencia === true) {
          aplicarTendencia = (si === 0);
        } else if (typeof cfg.tendencia === 'string') {
          aplicarTendencia = (s === cfg.tendencia);
        } else if (typeof cfg.tendencia === 'object') {
          aplicarTendencia = (!cfg.tendencia.serie || cfg.tendencia.serie === s);
          tendCfg = cfg.tendencia;
        }
      }

      if (aplicarTendencia && pts.length >= 2) {
        const nPts = pts.length;
        const sumX = pts.reduce((acc, p) => acc + p.i, 0);
        const sumY = pts.reduce((acc, p) => acc + p.v, 0);
        const sumXY = pts.reduce((acc, p) => acc + p.i * p.v, 0);
        const sumXX = pts.reduce((acc, p) => acc + p.i * p.i, 0);
        const denom = (nPts * sumXX - sumX * sumX);
        if (denom !== 0) {
          const slope = (nPts * sumXY - sumX * sumY) / denom;
          const intercept = (sumY - slope * sumX) / nPts;
          const iStart = pts[0].i;
          const iEnd = pts[nPts - 1].i;
          const yValStart = slope * iStart + intercept;
          const yValEnd = slope * iEnd + intercept;
          const corTend = tendCfg.cor || cor;
          const rotTend = tendCfg.rotulo || `Tendência (${s})`;
          out += `<line class="g-tendencia-hit" x1="${x(iStart).toFixed(1)}" y1="${y(yValStart).toFixed(1)}" x2="${x(iEnd).toFixed(1)}" y2="${y(yValEnd).toFixed(1)}" stroke="transparent" stroke-width="14" style="cursor: pointer;"><title>${esc(rotTend)}</title></line>
            <line class="g-tendencia" x1="${x(iStart).toFixed(1)}" y1="${y(yValStart).toFixed(1)}" x2="${x(iEnd).toFixed(1)}" y2="${y(yValEnd).toFixed(1)}" stroke="${corTend}" stroke-width="${tendCfg.espessura || 2}" stroke-dasharray="5 3" opacity="0.85" style="cursor: pointer;"><title>${esc(rotTend)}</title></line>`;
        }
      }

      // Pontos marcadores (bolinhas 6x6px com borda branca 1.5px) com tooltip de hover e rótulos
      if (mostrarPontos) {
        pts.forEach((p) => {
          const hoverTxt = cfg.hoverVal ? cfg.hoverVal(linhas[p.i], s, p.v) : `${s} · ${linhas[p.i].__eixo}: ${fmt(p.v)}`;
          const rPonto = cfg.raioPonto || 3;
          out += `<circle class="g-ponto" cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${rPonto}" fill="${cor}" stroke="#FFFFFF" stroke-width="1.5" style="cursor: pointer;"><title>${esc(hoverTxt)}</title></circle>`;
          if (cfg.rotulos !== false && (cfg.rotulos === true || series.length === 1)) {
            out += `<text class="g-valor" x="${x(p.i).toFixed(1)}" y="${(y(p.v) - 11).toFixed(1)}" text-anchor="middle">${esc(fmt(p.v))}</text>`;
          }
        });
      }

      out += '</g>';
    });

    // Renderização coordenada do Total Consolidado (com anti-colisão vertical)
    if (temConsolidado) {
      const pontosConsolidados = [];
      series.forEach((s, si) => {
        const cor = (cfg.cores && (cfg.cores[s] || cfg.cores[si])) || PALETA[si % PALETA.length];
        const valCons = num(consValores[s] ?? consValores[si]);
        if (valCons !== null && !isNaN(valCons)) {
          pontosConsolidados.push({
            serie: s,
            si,
            cor,
            val: valCons,
            y: y(valCons),
            hover: `${s} · ${consRotulo}: ${fmt(valCons)}`,
          });
        }
      });

      if (pontosConsolidados.length > 0) {
        // Ordena por coordenada Y (menor Y = mais alto no SVG = maior valor)
        pontosConsolidados.sort((a, b) => a.y - b.y);

        // Se houver 2 pontos e estiverem a menos de 26px de distância vertical
        const colidemVertical = pontosConsolidados.length === 2 && Math.abs(pontosConsolidados[0].y - pontosConsolidados[1].y) < 26;
        const mostrarRotulosTexto = !!cfg.consolidado?.mostrarRotulos;

        pontosConsolidados.forEach((p, pIdx) => {
          let yRotulo = p.y - 12;
          if (colidemVertical) {
            // O ponto superior coloca o rótulo ACIMA e o inferior ABAIXO
            yRotulo = (pIdx === 0) ? (p.y - 13) : (p.y + 20);
          }
          const rotuloSerie = p.serie === 'Atual' ? 'Período Atual' : (p.serie === 'Anterior' ? 'Período Anterior' : p.serie);
          const hoverTxt = `${rotuloSerie} · Total Consolidado: ${fmt(p.val)}`;

          if (consTipo === 'barra') {
            const yZero = Math.min(Math.max(y(0), mt), mt + ph);
            const bTop = Math.min(p.y, yZero);
            const bH = Math.max(3, Math.abs(p.y - yZero));
            const bW = 16;
            out += `<g class="g-serie-consolidado">
              <rect x="${(xCons - bW / 2).toFixed(1)}" y="${bTop.toFixed(1)}" width="${bW}" height="${bH.toFixed(1)}" rx="3" fill="${p.cor}" opacity="0.85">
                <title>${esc(hoverTxt)}</title>
              </rect>
              ${mostrarRotulosTexto ? `<text class="g-valor g-valor-consolidado" font-weight="700" fill="${p.cor}" style="paint-order: stroke; stroke: #FFFFFF; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round;" x="${xCons.toFixed(1)}" y="${(bTop - 6).toFixed(1)}" text-anchor="middle">${esc(fmt(p.val))}</text>` : ''}
            </g>`;
          } else {
            out += `<g class="g-serie-consolidado">
              <circle class="g-ponto-consolidado" cx="${xCons.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6.5" fill="${p.cor}" stroke="#FFFFFF" stroke-width="2.5" style="cursor: pointer;">
                <title>${esc(hoverTxt)}</title>
              </circle>
              ${mostrarRotulosTexto ? `<text class="g-valor g-valor-consolidado" font-weight="700" fill="${p.cor}" style="paint-order: stroke; stroke: #FFFFFF; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round;" x="${xCons.toFixed(1)}" y="${yRotulo.toFixed(1)}" text-anchor="middle">${esc(fmt(p.val))}</text>` : ''}
            </g>`;
          }
        });
      }
    }

    const itensLegenda = cfg.legendaItens || series;
    const legendaHtml = cfg.legendaAbaixo
      ? UI._legenda(itensLegenda, W - mr, H - 12, cfg.cores, true, W)
      : UI._legenda(itensLegenda, W - mr, mt - 16, cfg.cores);
    if (!cfg.semLegenda) {
      out += legendaHtml;
    }
    return out + UI._fechar();
  },

  graficoBarras(cfg) {
    const { linhas, val, fmt } = cfg;
    const serie = cfg.series[0];
    const rowH = linhas.length > 8 ? 28 : 32;
    const refVal = cfg.referencia?.valor != null ? num(cfg.referencia.valor) : null;
    const temRef = refVal !== null && refVal > 0;
    const mt = temRef ? 26 : 12;
    const W = 900, ml = 270, mr = 120;
    const H = mt + linhas.length * rowH + 12;
    const pw = W - ml - mr;
    const max = Math.max(...linhas.map((l) => Math.abs(val(l, serie) ?? 0)), temRef ? refVal * 1.05 : 0, 1e-9);
    let out = UI._abrir(W, H, cfg.titulo);
    const paletaBarras = Array.isArray(cfg.cores) && cfg.cores.length ? cfg.cores : PALETA;
    linhas.forEach((l, i) => {
      const v = val(l, serie) ?? 0;
      const w = Math.max(2, (Math.abs(v) / max) * pw);
      const yy = mt + i * rowH;
      const isDestaque = !l.cor && (!!l.__destaque || /^total\b/i.test(String(l.__eixo || '').trim()));
      const cor = l.cor || (cfg.coresPorBarra ? paletaBarras[i % paletaBarras.length] : (isDestaque ? '#22368F' : paletaBarras[0]));
      const hoverTxt = cfg.hoverVal ? cfg.hoverVal(l, serie, v) : `${formatarRotulo(l.__eixo)} · ${formatarRotulo(serie)}: ${fmt(v)}`;
      const pesoEixo = isDestaque ? ' font-weight="700"' : '';
      const corEixo = isDestaque ? ' fill="var(--cinza-900, #0F172A)"' : '';
      const pesoVal = isDestaque ? ' font-weight="700"' : '';
      out += `<g class="g-serie">
        <text class="g-eixo" x="${ml - 12}" y="${yy + rowH / 2 + 4}" text-anchor="end"${pesoEixo}${corEixo}>${esc(rotuloCurto(l.__eixo, 36))}</text>
        <rect x="${ml}" y="${yy + 6}" width="${w.toFixed(1)}" height="${rowH - 12}" rx="5" fill="${cor}"><title>${esc(hoverTxt)}</title></rect>
        <text class="g-valor" x="${(ml + w + 8).toFixed(1)}" y="${yy + rowH / 2 + 4}"${pesoVal}>${esc(fmt(v))}</text></g>`;
    });
    if (temRef) {
      const xRef = ml + (refVal / max) * pw;
      const corRef = cfg.referencia.cor || '#C93B2B';
      const rotRef = cfg.referencia.rotulo || `Média: ${fmt(refVal)}`;
      out += `<g class="g-referencia-vertical">
        <line x1="${xRef.toFixed(1)}" y1="${mt - 4}" x2="${xRef.toFixed(1)}" y2="${H - 8}" stroke="${corRef}" stroke-width="1.8" stroke-dasharray="5 4" />
        <text x="${xRef.toFixed(1)}" y="${mt - 8}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${corRef}">${esc(rotRef)}</text>
      </g>`;
    }
    return out + UI._fechar();
  },

  graficoColunas(cfg) {
    const { linhas, series, val, fmt } = cfg;
    const W = 900, ml = 86, mr = 24;
    const pw = W - ml - mr;
    const gw = pw / (linhas.length || 1), bw = (gw * 0.72) / (series.length || 1);
    const rotacionar = cfg.rotacionarEixo !== undefined ? !!cfg.rotacionarEixo : (linhas.length > 7 || gw < 65);
    const H = Number(cfg.altura || cfg.H) || (rotacionar ? 385 : 360);
    const mt = H <= 260 ? 26 : 34;
    const mb = rotacionar ? (cfg.mb || (H <= 260 ? 65 : 75)) : (cfg.mb || (H <= 260 ? 40 : 52));
    const ph = H - mt - mb;
    const vals = linhas.flatMap((l) => series.map((s) => val(l, s))).filter((v) => v !== null);
    const ref = cfg.referencia?.valor != null ? num(cfg.referencia.valor) : null;
    const { vmin, vmax } = UI._escalaY(vals, ref);
    const y = (v) => mt + ph - ((v - vmin) / (vmax - vmin)) * ph;

    let out = UI._abrir(W, H, cfg.titulo) + UI._grid(y, vmin, vmax, ml, W - mr, fmt) + UI._referencia(ref, y, ml, W - mr, cfg);
    linhas.forEach((l, i) => {
      const gx = ml + gw * i + gw * 0.14;
      const cx = ml + gw * i + gw / 2;
      if (rotacionar) {
        const cy = H - mb + 14;
        out += `<text class="g-eixo g-eixo-rotacionado" font-size="11" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="end" transform="rotate(-45 ${cx.toFixed(1)} ${cy.toFixed(1)})">${esc(rotuloCurto(l.__eixo, linhas.length <= 4 ? 28 : 18))}</text>`;
      } else {
        out += `<text class="g-eixo" x="${cx.toFixed(1)}" y="${H - mb + (H <= 260 ? 18 : 22)}" text-anchor="middle">${esc(rotuloCurto(l.__eixo, linhas.length <= 2 ? 36 : (linhas.length <= 4 ? 28 : 12)))}</text>`;
      }
      series.forEach((s, si) => {
        const v = val(l, s);
        if (v === null) return;
        const top = y(Math.max(v, 0)), base = y(Math.min(v, 0));
        const hoverTxt = cfg.hoverVal ? cfg.hoverVal(l, s, v) : `${s} · ${l.__eixo}: ${fmt(v)}`;
        const cor = (cfg.cores && (cfg.cores[s] || cfg.cores[si])) || PALETA[si % PALETA.length];
        out += `<g class="g-serie"><rect x="${(gx + bw * si).toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${Math.max(2, base - top).toFixed(1)}" rx="4" fill="${cor}"><title>${esc(hoverTxt)}</title></rect>`;
        if (cfg.rotulos !== false && (series.length === 1 || linhas.length <= 4))
          out += `<text class="g-valor" x="${(gx + bw * si + (bw - 3) / 2).toFixed(1)}" y="${(top - 6).toFixed(1)}" text-anchor="middle">${esc(fmt(v))}</text>`;
        out += '</g>';
      });
    });
    return out + UI._legenda(series, W - mr, mt - 16, cfg.cores) + UI._fechar();
  },

  graficoColunasEmpilhadas(cfg) {
    const { linhas, series, val, fmt } = cfg;
    const W = 900, ml = 76, mr = 24;
    const pw = W - ml - mr;
    const rotacionar = cfg.rotacionarEixo !== undefined ? !!cfg.rotacionarEixo : (linhas.length > 7);
    const H = Number(cfg.altura || cfg.H) || (rotacionar ? (cfg.legendaAbaixo ? 395 : 385) : (cfg.legendaAbaixo ? 370 : 360));
    const mt = cfg.legendaAbaixo ? 32 : 42;
    const mb = rotacionar ? (cfg.mb || (cfg.legendaAbaixo ? 92 : 75)) : (cfg.mb || (cfg.legendaAbaixo ? 68 : 48));
    const ph = H - mt - mb;

    const yPos = (v) => mt + ph - (v / 100) * ph;

    let gridLines = '';
    [0, 20, 40, 60, 80, 100].forEach((v) => {
      const y = yPos(v);
      gridLines += `
        <line class="g-grid" x1="${ml}" x2="${W - mr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--borda, #E2E8F0)" stroke-dasharray="3 3" stroke-width="1" />
        <text class="g-eixo" x="${ml - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="500" fill="var(--cinza-500, #94A3B8)">${v}%</text>`;
    });

    const gw = pw / (linhas.length || 1);
    const bw = Math.min(48, Math.max(24, Math.min(gw * 0.60, gw - 12)));

    let colunasSvg = '';
    linhas.forEach((l, i) => {
      const cx = ml + gw * i + gw / 2;
      const x = cx - bw / 2;
      const hTot = ph;
      const yTop = mt;

      // Separador vertical antes da coluna de Total Consolidado do Período
      if (l.__isTotal && i > 0) {
        const sepX = ml + gw * i;
        colunasSvg += `
          <line class="g-consolidado-sep" x1="${sepX.toFixed(1)}" y1="${mt}" x2="${sepX.toFixed(1)}" y2="${(mt + ph).toFixed(1)}" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="3 3" />`;
      }

      const v0 = val(l, series[0]) || 0;
      const v1 = val(l, series[1]) || 0;
      const cor0 = (cfg.cores && (cfg.cores[series[0]] || cfg.cores[0])) || '#22368F';
      const cor1 = (cfg.cores && (cfg.cores[series[1]] || cfg.cores[1])) || '#A2B2EF';

      const h0 = (v0 / 100) * ph;
      const h1 = (v1 / 100) * ph;
      const y0 = mt + ph - h0;
      const y1 = yTop;

      const clipId = `clip-col-emp-${i}`;
      const hover0 = cfg.hoverVal ? cfg.hoverVal(l, series[0], v0) : `${series[0]} · ${l.__eixo}: ${fmt(v0)}`;
      const hover1 = cfg.hoverVal ? cfg.hoverVal(l, series[1], v1) : `${series[1]} · ${l.__eixo}: ${fmt(v1)}`;

      const txt0 = fmt(v0);
      const txt1 = fmt(v1);

      let label0 = '';
      if (v0 > v1) {
        // Quando RC estiver na frente de LE: número de RC fica branco e cabe dentro da coluna
        if (v0 > 0) {
          const charCount0 = (txt0 || '').length || 4;
          const maxFontParaLargura = (bw - 6) / (charCount0 * 0.52);
          const fontSize0 = Math.min(11, Math.max(8, Number(maxFontParaLargura.toFixed(1))));
          label0 = `<text class="g-valor g-valor-branco" style="fill: #FFFFFF !important; letter-spacing: -0.3px;" x="${cx.toFixed(1)}" y="${(y0 + h0 / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${fontSize0}" font-weight="700" fill="#FFFFFF">${esc(txt0)}</text>`;
        }
      } else {
        // Quando for o contrário (RC <= LE): deixa do jeito que está
        if (v0 >= 14) {
          label0 = `<text class="g-valor" x="${cx.toFixed(1)}" y="${(y0 + h0 / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#FFFFFF">${esc(txt0)}</text>`;
        } else if (v0 > 0) {
          label0 = `<text class="g-valor" x="${cx.toFixed(1)}" y="${(y0 - 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${cor0}">${esc(txt0)}</text>`;
        }
      }

      let label1 = '';
      if (v1 >= 14) {
        label1 = `<text class="g-valor" x="${cx.toFixed(1)}" y="${(y1 + h1 / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#1E293B">${esc(txt1)}</text>`;
      } else if (v1 > 0) {
        label1 = `<text class="g-valor" x="${cx.toFixed(1)}" y="${(yTop - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${cor0}">${esc(txt1)}</text>`;
      }

      let rotuloEixo = '';
      const pesoEixo = (l.__isTotal || l.__isBenchmark) ? ' font-weight="700"' : '';
      const corTextoEixo = l.__isBenchmark ? '#0284C7' : (l.__isTotal ? '#172972' : 'var(--cinza-700, #334155)');

      if (rotacionar) {
        const cy = H - mb + 14;
        rotuloEixo = `<text class="g-eixo g-eixo-rotacionado" font-size="11"${pesoEixo} fill="${corTextoEixo}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="end" transform="rotate(-45 ${cx.toFixed(1)} ${cy.toFixed(1)})">${esc(rotuloCurto(l.__eixo, 22))}</text>`;
      } else {
        rotuloEixo = `<text class="g-eixo" x="${cx.toFixed(1)}" y="${H - mb + 22}" text-anchor="middle" font-size="11"${pesoEixo} fill="${corTextoEixo}">${esc(rotuloCurto(l.__eixo, 16))}</text>`;
      }

      colunasSvg += `
        <g class="g-coluna-empilhada">
          <defs>
            <clipPath id="${clipId}">
              <rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${hTot.toFixed(1)}" rx="5" ry="5" />
            </clipPath>
          </defs>
          <g clip-path="url(#${clipId})">
            <rect class="g-serie" x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h0).toFixed(1)}" fill="${cor0}">
              <title>${esc(hover0)}</title>
            </rect>
            <rect class="g-serie" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h1).toFixed(1)}" fill="${cor1}">
              <title>${esc(hover1)}</title>
            </rect>
          </g>
          ${label0}
          ${label1}
          ${rotuloEixo}
        </g>`;
    });

    let legenda = '';
    if (cfg.legendaAbaixo) {
      legenda = UI._legenda(series, W - mr, H - 10, cfg.cores, true, W, 'retangulo');
    } else {
      const yLegenda = cfg.yLegenda !== undefined ? cfg.yLegenda : (mt - 29);
      legenda = UI._legenda(series, W - mr, yLegenda, cfg.cores);
    }
    return UI._abrir(W, H, cfg.titulo) + gridLines + colunasSvg + legenda + UI._fechar();
  },
};

/* ---------- composições (config → componente) ---------- */

/** Gráfico a partir de um bloco/sub-bloco → { html, vazio, dados } */
function graficoDeBloco(bloco, titulo) {
  const dados = resolverFonteTabela(bloco.fonte);
  let series = dados.series;
  if (bloco.series?.length) series = bloco.series.map((s) => series.find((x) => igual(x, s))).filter(Boolean);
  series = series.slice(0, bloco.maxSeries || 6);
  const escala = bloco.escala;
  const val = (l, s) => { const v = num(valorDe(l, s)); return v === null ? null : escala ? v * escala : v; };
  const fmt = (v) => formatar(v, bloco.formato || 'decimal');

  let linhas = dados.linhas.filter((l) => series.some((s) => val(l, s) !== null));
  linhas = ordenarLinhas(linhas, [{ rotulo: 'eixo', de: '__eixo' }, ...series.map((s) => ({ rotulo: s, de: [s] }))], bloco);
  if (bloco.limite) linhas = linhas.slice(0, bloco.limite);

  const vazio = !linhas.length || !series.length;
  const estilo = bloco.estilo || (ehListaPeriodos(linhas.map((l) => l.__eixo)) ? 'linha' : 'barra');

  let hoverVal = null;
  if (bloco.id === 'graf-livre-escolha' || bloco.hoverValorBruto) {
    const idsLE = idsDaFonte(bloco.fonte);
    const itensLE = idsLE.flatMap((id) => itensDoRelatorio(id));
    hoverVal = (l, s, v) => {
      const dBruto = itensLE.find(
        (d) =>
          Number(d.Ordem) === 1 &&
          igual(d.Coluna, l.__eixo) &&
          (igual(d.Linha, s) || igual(d.Linha, 'Livre Escolha') || igual(d.Linha, 'Despesa LE'))
      ) || itensLE.find(
        (d) =>
          Number(d.Ordem) === 2 &&
          igual(d.Coluna, l.__eixo) &&
          (igual(d.Linha, 'Despesa LE') || igual(d.Linha, s))
      );
      if (dBruto && num(dBruto.Valor) !== null) {
        return `${s} · ${l.__eixo}: ${formatar(dBruto.Valor, 'moeda')}`;
      }
      return `${s} · ${l.__eixo}: ${fmt(v)}`;
    };
  }

  let referenciaEfetiva = bloco.referencia;
  if (bloco.id === 'graf-pmpm-faixa' && !referenciaEfetiva) {
    const nomeEmp = DADOS?.relatorio?.EmpresaMae || 'Empresa';
    const mediaEmp = custoPorVidaMes('M') ?? resolverFonteEscalar({
      assinatura: 'perfil',
      filtro: { ordem: 1, linhaEm: ['Total', 'Total Geral'], colunaEm: ['Custo PMPM'] },
      agregacao: 'primeiro',
    });
    if (mediaEmp && mediaEmp > 0) {
      referenciaEfetiva = {
        valor: mediaEmp,
        rotulo: `Média ${nomeEmp}: ${formatar(mediaEmp, 'moeda')}`,
        cor: '#C93B2B',
      };
    }
  }

  const cfg = {
    linhas,
    series,
    val,
    fmt,
    hoverVal,
    referencia: referenciaEfetiva,
    breakeven: bloco.breakeven,
    tendencia: bloco.tendencia,
    consolidado: bloco.consolidado,
    mesEncurtado: bloco.mesEncurtado,
    comPontos: bloco.comPontos,
    pontos: bloco.pontos,
    semPontos: bloco.semPontos,
    semCirculos: bloco.semCirculos,
    semLegenda: bloco.semLegenda,
    rotulos: bloco.rotulos,
    rotacionarEixo: bloco.rotacionarEixo,
    titulo: titulo || bloco.titulo,
    coresPorBarra: bloco.coresPorBarra,
    cores: bloco.cores,
    altura: bloco.altura,
  };
  const svg = vazio ? '' : estilo === 'barra' ? UI.graficoBarras(cfg) : estilo === 'coluna' ? UI.graficoColunas(cfg) : UI.graficoLinha(cfg);
  return {
    vazio,
    html: vazio ? UI.vazio(bloco.mensagemVazio) : UI.card(UI.subtitulo(titulo) + svg, 'grafico-card'),
    dados: vazio ? null : {
      tipo: 'grafico', estilo, series,
      pontos: linhas.slice(0, 14).map((l) => ({ eixo: l.__eixo, ...Object.fromEntries(series.map((s) => [s, fmt(val(l, s))])) })),
    },
  };
}

function colunasEfetivas(bloco, dados) {
  if (bloco.colunas) {
    const temCopay = contratoTemCoparticipacao();
    let cols = bloco.colunas;
    if (!temCopay) {
      cols = cols.filter((c) => !c.somenteComCopay);
    }
    // Se for rede-livre-escolha-mensal, elimina duplicidade visual:
    // Se existirem produtos discriminados (Premium, Corporate, Skill) com valores válidos na base,
    // oculta a coluna mãe consolidada "Livre escolha" para não duplicar o reembolso na leitura das colunas;
    // Se NÃO existirem produtos discriminados, remove as colunas filhas de produto e mantém a coluna mãe "Livre escolha".
    if (bloco.id === 'rede-livre-escolha-mensal' && dados.linhas && dados.linhas.length) {
      const chavesProdutosLE = [
        'Livre Escolha - Premium', 'Livre Escolha - PREMIUM',
        'Livre Escolha - Corporate', 'Livre Escolha - CORPORATE',
        'Livre Escolha - Skill', 'Livre Escolha - SKILL'
      ];
      const temProdutosLE = dados.linhas.some((l) =>
        chavesProdutosLE.some((k) => num(l[k]) !== null && num(l[k]) > 0)
      );
      if (temProdutosLE) {
        cols = cols.filter((c) => {
          const deList = Array.isArray(c.de) ? c.de : [c.de];
          const ehMaeLivreEscolha = deList.some((d) => igual(d, 'Livre Escolha'));
          return !ehMaeLivreEscolha;
        });
      } else {
        cols = cols.filter((c) => {
          const deList = Array.isArray(c.de) ? c.de : [c.de];
          const ehFilhoProduto = deList.some((d) => chavesProdutosLE.some((cp) => igual(cp, d)));
          return !ehFilhoProduto;
        });
      }
    }
    return cols.map((c) => {
      let rot = c.rotulo;
      if (temCopay && c.rotuloComCopay) rot = c.rotuloComCopay;
      if (!temCopay && c.rotuloSemCopay) rot = c.rotuloSemCopay;
      return { ...c, rotulo: formatarRotulo(rot) };
    });
  }
  const auto = bloco.colunasAuto || {};
  if (dados.series?.length) {
    let series = dados.series;
    if (auto.excluir?.length) series = series.filter((s) => !auto.excluir.some((x) => igual(s, x)));
    return [
      { rotulo: auto.rotuloEixo || 'Item', de: '__eixo' },
      ...series.slice(0, auto.maximo || 14).map((s) => ({
        rotulo: formatarRotulo(s),
        de: [s],
        formato: s.toLowerCase().includes('varia') ? 'texto' : auto.formato,
        escala: auto.escala,
      })),
    ];
  }
  const amostra = dados.linhas[0] || {};
  return Object.keys(amostra).filter((k) => !k.startsWith('__')).slice(0, auto.maximo || 6)
    .map((k) => ({ rotulo: formatarRotulo(k), de: k, formato: auto.formato, escala: auto.escala }));
}

/** Tabela hierárquica por mês e plano: grupos (Medicina, Odontologia) e subplanos indentados com % */
function tabelaVidasMensalPorPlano(bloco) {
  const fonte = { assinatura: 'vidasMensal', todos: true, ...(bloco.fonte || {}) };
  const ids = idsDaFonte(fonte);
  const itensBrutos = ids.flatMap((id) => itensDoRelatorio(id));
  if (!itensBrutos.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const itensOrd1 = itensBrutos.filter((d) => Number(d.Ordem) === 1);
  const baseItens = itensOrd1.length ? itensOrd1 : itensBrutos;

  const meses = [...new Set(baseItens.map((d) => d.Coluna))]
    .filter((c) => chavePeriodo(c) !== null)
    .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));

  if (!meses.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const ehMedicina = (g) => {
    const s = normTexto(g);
    return s.includes('med') || s === 'm';
  };
  const ehOdonto = (g) => {
    const s = normTexto(g);
    return s.includes('odont') || s === 'o';
  };

  const temMed = baseItens.some((d) => (d.Grupo == null || ehMedicina(d.Grupo)) && (num(d.Valor) || 0) > 0);
  const temOdo = baseItens.some((d) => ehOdonto(d.Grupo) && (num(d.Valor) || 0) > 0);

  const gruposConfig = [];
  if (temMed || !temOdo) gruposConfig.push({ nome: 'Medicina', filtroFn: (d) => d.Grupo == null || ehMedicina(d.Grupo) });
  if (temOdo) gruposConfig.push({ nome: 'Odontologia', filtroFn: (d) => ehOdonto(d.Grupo) });

  const formatarMes = (col) => {
    const m = RE_PERIODO.exec(String(col || ''));
    if (m) {
      const mesSigla = m[1].toLowerCase();
      let ano = parseInt(m[2], 10);
      const ano2 = String(ano >= 2000 ? ano - 2000 : (ano >= 100 ? ano % 100 : ano)).padStart(2, '0');
      return `${mesSigla}-${ano2}`;
    }
    return col;
  };

  const ultMes = meses[meses.length - 1];
  const rotuloEixo = bloco.colunasAuto?.rotuloEixo || 'Evolução Mensal';
  const colunas = [
    { rotulo: rotuloEixo, numerica: false },
    ...meses.map((m) => ({ rotulo: formatarMes(m), numerica: true })),
    { rotulo: 'Variação', numerica: true },
    { rotulo: '%', numerica: true },
  ];

  const celulasLinhas = [];

  const calcularVariacaoAcumulada = (valIni, valFim) => {
    if (valIni !== null && valFim !== null && valIni > 0) {
      const deltaPct = ((valFim / valIni) - 1) * 100;
      const txt = (deltaPct > 0 ? '+' : '') + brl(deltaPct, 1) + '%';
      const diff = valFim - valIni;
      const diffTxt = `${diff > 0 ? '+' : ''}${formatar(diff, 'inteiro')} vidas`;
      const cls = deltaPct > 0 ? 'valor-positivo' : deltaPct < 0 ? 'valor-critico' : '';
      return {
        texto: txt,
        classe: cls,
        title: `Variação acumulada no período: ${txt} (${diffTxt})`,
      };
    }
    if (valFim > 0 && (!valIni || valIni === 0)) {
      return {
        texto: '+100,0%',
        classe: 'valor-positivo',
        title: `Entrada de vidas no período: +${formatar(valFim, 'inteiro')} vidas`,
      };
    }
    return { texto: '0,0%' };
  };

  const ORDEM_PRODS = ['PREMIUM', 'CORPORATE', 'SKILL', 'KIPP'];
  const planosPorProd = agruparPlanosPorProduto();

  gruposConfig.forEach(({ nome, filtroFn }) => {
    const isMed = nome === 'Medicina';
    const itensGrupo = baseItens.filter(filtroFn);
    let planos = [...new Set(itensGrupo.map((d) => d.Linha))]
      .filter((l) => l && !/^(total|acumulado)$/i.test(l.trim()));

    // Filtra planos com vidas > 0 em pelo menos 1 mês
    planos = planos.filter((p) => meses.some((m) => {
      const it = itensGrupo.find((d) => d.Linha === p && d.Coluna === m);
      return (num(it?.Valor) || 0) > 0;
    }));

    // Ordena os produtos segundo ORDEM_PRODS
    planos.sort((a, b) => {
      const ia = ORDEM_PRODS.indexOf(normalizarChaveProduto(a));
      const ib = ORDEM_PRODS.indexOf(normalizarChaveProduto(b));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const totalMes = {};
    meses.forEach((m) => {
      const itemTot = itensGrupo.find((d) => /^(total)$/i.test(String(d.Linha || '').trim()) && d.Coluna === m);
      if (itemTot && num(itemTot.Valor) !== null) {
        totalMes[m] = num(itemTot.Valor);
      } else {
        const somaPlanos = planos.reduce((acc, p) => {
          const itemP = itensGrupo.find((d) => d.Linha === p && d.Coluna === m);
          return acc + (num(itemP?.Valor) || 0);
        }, 0);
        totalMes[m] = somaPlanos;
      }
    });

    const totUltMes = totalMes[ultMes] || 0;
    const valIniGrupo = totalMes[meses[0]] || 0;
    const valFimGrupo = totalMes[ultMes] || 0;
    const celVarGrupo = calcularVariacaoAcumulada(valIniGrupo, valFimGrupo);

    // Linha do grupo (Medicina / Odontologia) - sem recuo ("um espaço a menos antes de começar")
    const rowGrupo = [
      { texto: nome, classe: 'plano-grupo' },
      ...meses.map((m) => ({ texto: formatar(totalMes[m] || 0, 'inteiro') })),
      celVarGrupo,
      { texto: '100,00%' },
    ];
    rowGrupo.__classeLinha = 'linha-grupo-plano';
    celulasLinhas.push(rowGrupo);

    // Linhas dos planos com recuo e popover de subplanos
    planos.forEach((p) => {
      const valsMes = meses.map((m) => {
        const itemP = itensGrupo.find((d) => d.Linha === p && d.Coluna === m);
        return num(itemP?.Valor) || 0;
      });
      const valIniPlano = valsMes[0] || 0;
      const valFimPlano = valsMes[valsMes.length - 1] || 0;
      const pct = totUltMes > 0 ? (valFimPlano / totUltMes) * 100 : 0;
      const celVarPlano = calcularVariacaoAcumulada(valIniPlano, valFimPlano);

      const pKey = normalizarChaveProduto(p);
      const subplanos = isMed
        ? (planosPorProd.get(pKey) || [])
        : (planosPorProd.get('ODONTO_' + pKey) || (pKey === 'PREMIUM' ? (planosPorProd.get('ODONTOLOGIA') || []) : (planosPorProd.get(pKey) || [])));

      const isUltimaLinha = celulasLinhas.length >= 4;
      const celProduto = {
        texto: p,
        html: subplanos && subplanos.length ? gerarHtmlHoverProduto(p, subplanos, isUltimaLinha) : undefined,
        classe: 'col-produto plano-item',
      };

      const rowPlano = [
        celProduto,
        ...valsMes.map((valAtual) => ({ texto: formatar(valAtual, 'inteiro') })),
        celVarPlano,
        { texto: brl(pct, 2) + '%' },
      ];
      rowPlano.__classeLinha = 'linha-subplano';
      celulasLinhas.push(rowPlano);
    });
  });

  const html = UI.tabelaExecutiva({
    colunas,
    linhas: celulasLinhas,
    compacta: true,
    muitasColunas: colunas.length >= 8,
    overflowVisible: true,
    nota: bloco.nota || null,
  });

  return {
    vazio: false,
    totalOriginal: celulasLinhas.length,
    linhasOriginais: celulasLinhas,
    html,
    dados: {
      tipo: 'tabela',
      colunas: colunas.map((c) => c.rotulo),
      linhas: celulasLinhas.map((r) => r.map((c) => c.texto)),
      totalRegistros: celulasLinhas.length,
    },
  };
}

/**
/**
 * Classifica um plano individual para a sua respectiva chave de produto:
 * 'PREMIUM', 'CORPORATE', 'SKILL', 'KIPP', 'ODONTOLOGIA'
 * com base na estrutura dos produtos Omint:
 * - SKILL (Medicina): SE4, SMAX, SE3, SC2, SC1, SC1+ (e variações ME)
 * - CORPORATE (Medicina): C15, C16, C17 (e variações ME)
 * - PREMIUM (Medicina): Hospitalar (C10-C13), Medicina Completo (C19-C23), Saúde Integral (C39-C42), Estilo (C43)
 * - KIPP (Cuidado Coordenado): Acesso, Cuidado, Dinâmico, Conforto, Conforto+, etc.
 * - ODONTOLOGIA: Premium (D20, D22, D32, D25), Skill (OS1-OS5), Saúde Integral (C39-C43 quando odonto)
 */
function identificarProdutoDoPlano(p, grupo) {
  const pNorm = normTexto(p);
  const gNorm = normTexto(grupo);

  // 1. Odontologia
  if (
    gNorm.includes('odo') ||
    gNorm === 'o' ||
    pNorm.startsWith('os') ||
    pNorm.startsWith('od') ||
    /^d\d+/i.test(pNorm) ||
    pNorm.includes('odonto')
  ) {
    if (pNorm.includes('skill') || pNorm.startsWith('os')) return 'ODONTO_SKILL';
    if (pNorm.includes('corp') || pNorm === 'd15' || pNorm === 'd16') return 'ODONTO_CORPORATE';
    return 'ODONTO_PREMIUM';
  }

  // 2. Omint Kipp (Cuidado Coordenado)
  // Imagem 2: Acesso, Cuidado, Dinâmico, Conforto, Conforto ME, Conforto+
  const KIPP_TERMS = ['acesso', 'cuidado', 'dinamico', 'conforto'];
  if (
    KIPP_TERMS.some((k) => pNorm.includes(k)) ||
    pNorm.startsWith('kipp') ||
    pNorm === 'k' ||
    pNorm.startsWith('kp')
  ) {
    return 'KIPP';
  }

  // 3. Omint Skill (Medicina Completo)
  // Imagem 1 e 2: SE4, SMAX, SE3, SC2, SC1, SC1+ (e variações ME)
  if (
    pNorm.startsWith('sc') ||
    pNorm.startsWith('se') ||
    pNorm.startsWith('smax') ||
    pNorm.startsWith('sk') ||
    pNorm.includes('skill')
  ) {
    return 'SKILL';
  }

  // 4. Família "C" e Premium / Corporate
  // Imagens 1 e 2:
  // - Omint Corporate (Medicina Completo): C15, C16, C17 (e variações ME)
  // - Omint Premium:
  //     Hospitalar: C10, C11, C12, C13 (e ME)
  //     Medicina Completo: C19, C20, C21, C22, C23 (e ME)
  //     Saúde Integral: C39, C40, C41, C42
  //     Estilo: C43
  if (/^c\d+/i.test(pNorm)) {
    const numPlano = parseInt(pNorm.replace(/\D/g, ''), 10);
    // Somente C15, C16 e C17 pertencem ao Omint Corporate
    if (numPlano === 15 || numPlano === 16 || numPlano === 17) {
      return 'CORPORATE';
    }
    // C10-C13 (Hospitalar), C19-C23 (Medicina Completo), C39-C43 (Saúde Integral/Estilo) pertencem ao Omint Premium
    return 'PREMIUM';
  }

  if (pNorm.includes('corp') || pNorm.startsWith('corp')) {
    return 'CORPORATE';
  }

  if (pNorm.startsWith('p') || pNorm.includes('prem')) {
    return 'PREMIUM';
  }

  return 'SKILL';
}

/**
 * Processa planos de Relatório 2 (assinatura 'planos') agrupados por chave de produto:
 * 'PREMIUM', 'CORPORATE', 'SKILL', 'KIPP', 'ODONTOLOGIA', 'ODONTO_PREMIUM', 'ODONTO_SKILL', 'ODONTO_CORPORATE'
 */
function agruparPlanosPorProduto() {
  const idsR2 = idsDaFonte({ assinatura: 'planos', todos: true });
  const itensR2 = idsR2.flatMap((id) => itensDoRelatorio(id));
  const planosPorProd = new Map();
  if (!itensR2.length) return planosPorProd;

  const itensOrd1 = itensR2.filter((d) => Number(d.Ordem) === 1);
  const baseR2 = itensOrd1.length ? itensOrd1 : itensR2;

  const planos = [...new Set(baseR2.map((d) => d.Coluna))].filter(
    (c) => !igual(c, 'Total') && !igual(c, 'TotalGeral') && !igual(c, 'Sem dados')
  );

  planos.forEach((p) => {
    const pItems = baseR2.filter((d) => igual(d.Coluna, p));
    const rec = pItems
      .filter((d) => igual(d.Linha, 'RECEITA'))
      .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
    const desp = pItems
      .filter((d) => igual(d.Linha, 'DESPESA'))
      .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
    const sinItem = pItems.find((d) => igual(d.Linha, 'SINISTRALIDADE'))?.Valor;
    const sin = rec > 0 ? (desp / rec) * 100 : (sinItem != null ? num(sinItem) : 0);
    const vidas = pItems
      .filter((d) => igual(d.Linha, 'VIDAS'))
      .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
    const grupo = pItems[0]?.Grupo;

    const prodKey = identificarProdutoDoPlano(p, grupo);
    const itemPlano = { plano: p, rec, desp, sin, vidas, grupo };

    if (!planosPorProd.has(prodKey)) planosPorProd.set(prodKey, []);
    planosPorProd.get(prodKey).push(itemPlano);

    if (prodKey.startsWith('ODONTO_')) {
      if (!planosPorProd.has('ODONTOLOGIA')) planosPorProd.set('ODONTOLOGIA', []);
      planosPorProd.get('ODONTOLOGIA').push(itemPlano);
    }
  });

  // Fallback de vidas por plano quando R2 retornar 0.00 devido a data de corte (Item 1.3)
  try {
    const idsR8 = idsDaFonte({ assinatura: 'vidasMensal', todos: true });
    const itensR8 = idsR8.flatMap((id) => itensDoRelatorio(id));
    const itensR8Ord1 = itensR8.filter((d) => Number(d.Ordem) === 1);
    const baseR8 = itensR8Ord1.length ? itensR8Ord1 : itensR8;
    const mesesR8 = [...new Set(baseR8.map((d) => d.Coluna))]
      .filter((c) => chavePeriodo(c) !== null)
      .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    const ultMesR8 = mesesR8[mesesR8.length - 1];

    planosPorProd.forEach((listaPlanos, prodKey) => {
      const somaVidasR2 = listaPlanos.reduce((acc, pl) => acc + (pl.vidas || 0), 0);
      if (somaVidasR2 <= 0) {
        let vidasProdUltMes = 0;
        if (ultMesR8) {
          const itemR8 = baseR8.find((d) =>
            normalizarChaveProduto(d.Linha) === prodKey && d.Coluna === ultMesR8
          );
          if (itemR8 && num(itemR8.Valor) > 0) {
            vidasProdUltMes = num(itemR8.Valor);
          }
        }
        if (vidasProdUltMes > 0) {
          const somaRec = listaPlanos.reduce((acc, pl) => acc + (pl.rec || 0), 0);
          if (somaRec > 0) {
            listaPlanos.forEach((pl) => {
              if (pl.rec > 0) {
                pl.vidas = Math.max(1, Math.round(vidasProdUltMes * (pl.rec / somaRec)));
              }
            });
          }
        }
      }
    });
  } catch (_) {}

  return planosPorProd;
}

/**
 * Normaliza qualquer variação de rótulo de produto para as chaves canônicas:
 * 'PREMIUM', 'CORPORATE', 'SKILL', 'KIPP', 'ODONTOLOGIA'
 */
function normalizarChaveProduto(prod) {
  const s = String(prod || '').toLowerCase().trim();
  if (s.includes('odo')) return 'ODONTOLOGIA';
  if (s.includes('kipp') || s === 'k') return 'KIPP';
  if (s.includes('skill') || s.startsWith('sk')) return 'SKILL';
  if (s.includes('corp')) return 'CORPORATE';
  if (s.includes('prem')) return 'PREMIUM';
  return s.toUpperCase();
}

/**
 * Gera o componente visual de hover sobre o produto (gatilho com badge + popover de planos envolvidos).
 */
function gerarHtmlHoverProduto(nomeProduto, planos, isUltimaLinha = false) {
  const totVidasPl = (planos || []).reduce((acc, p) => acc + (num(p.vidas) || 0), 0);
  const totRecPl = (planos || []).reduce((acc, p) => acc + (num(p.rec) || 0), 0);
  const totDespPl = (planos || []).reduce((acc, p) => acc + (num(p.desp) || 0), 0);
  const totSinPl = totRecPl > 0 ? (totDespPl / totRecPl) * 100 : (totDespPl > 0 ? null : 0);
  const totSinPlTxt = totSinPl !== null ? formatar(totSinPl, 'percentual') : '—';
  const totSinPlClass = totSinPl !== null ? (totSinPl > 75 ? 'valor-critico' : 'valor-positivo') : '';

  const totVidasRodape = (planos && planos.totalVidasReal && planos.totalVidasReal > 0)
    ? planos.totalVidasReal
    : (totVidasPl > 0 ? totVidasPl : 0);
  const totVidasRodapeTxt = totVidasRodape > 0 ? formatar(totVidasRodape, 'inteiro') : '—';

  const popoverContent = (planos && planos.length) ? `
    <div class="popover-planos-detalhe${isUltimaLinha ? ' popover-cima' : ''}">
      <div class="popover-header">
        <strong>Planos envolvidos · ${esc(nomeProduto)}</strong>
        <span class="popover-badge">${planos.length} ${planos.length === 1 ? 'plano' : 'planos'}</span>
      </div>
      <table class="popover-table">
        <thead>
          <tr>
            <th>Plano</th>
            <th class="num">Vidas</th>
            <th class="num">Receita</th>
            <th class="num">Despesa</th>
            <th class="num">Sinistralidade</th>
          </tr>
        </thead>
        <tbody>
          ${planos.map((p) => {
            const sinTxt = p.rec > 0 ? formatar(p.sin, 'percentual') : (p.desp > 0 ? '—' : '0,0%');
            const sinClass = p.rec > 0 ? (p.sin > 75 ? 'valor-critico' : 'valor-positivo') : '';
            const vidasTxt = (num(p.vidas) || 0) > 0 ? formatar(p.vidas, 'inteiro') : '—';
            return `
            <tr>
              <td><strong>${esc(p.plano)}</strong></td>
              <td class="num">${vidasTxt}</td>
              <td class="num">${formatar(p.rec, 'moeda')}</td>
              <td class="num">${formatar(p.desp, 'moeda')}</td>
              <td class="num ${sinClass}">${sinTxt}</td>
            </tr>`;
          }).join('')}
        </tbody>
        ${planos.length > 1 ? `
        <tfoot>
          <tr style="border-top: 1px solid #CBD5E1; font-weight: 600;">
            <td>Total</td>
            <td class="num">${totVidasRodapeTxt}</td>
            <td class="num">${formatar(totRecPl, 'moeda')}</td>
            <td class="num">${formatar(totDespPl, 'moeda')}</td>
            <td class="num ${totSinPlClass}">${totSinPlTxt}</td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>` : `
    <div class="popover-planos-detalhe${isUltimaLinha ? ' popover-cima' : ''}">
      <div class="popover-header">
        <strong>Planos · ${esc(nomeProduto)}</strong>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B; font-style: italic;">
        Sem planos ativos com movimentação no período.
      </p>
    </div>`;

  const qtd = planos?.length || 0;
  const titPlanos = qtd > 0
    ? `${qtd} ${qtd === 1 ? 'plano' : 'planos'} (${nomeProduto})`
    : `Sem planos ativos (${nomeProduto})`;

  return `
    <div class="produto-hover-wrapper">
      <span class="produto-nome" style="font-weight: 600;">${esc(nomeProduto)}</span>
      <span class="badge-planos-trigger" title="${esc(titPlanos)}">ℹ</span>
      ${popoverContent}
    </div>`;
}

/**
 * Gera o componente visual de hover consolidado para produtos sem abertura por subplano (Slide 22).
 * Exibe os totais consolidados de Vidas, Receita, Despesa e Sinistralidade sem fingir que é plano.
 */
function gerarHtmlHoverConsolidado(nomeProduto, dadosConsolidados, isUltimaLinha = false) {
  const vidas = num(dadosConsolidados?.vidas) || 0;
  const rec = num(dadosConsolidados?.rec) || 0;
  const desp = num(dadosConsolidados?.desp) || 0;
  let sin = dadosConsolidados?.sin;
  if (sin === undefined || sin === null) {
    sin = rec > 0 ? (desp / rec) * 100 : (desp > 0 ? null : 0);
  }
  const sinTxt = sin !== null ? formatar(sin, 'percentual') : '—';
  const sinClass = sin !== null ? (sin > 75 ? 'valor-critico' : 'valor-positivo') : '';
  const vidasTxt = vidas > 0 ? formatar(vidas, 'inteiro') : '—';

  const popoverContent = `
    <div class="popover-planos-detalhe${isUltimaLinha ? ' popover-cima' : ''}">
      <div class="popover-header">
        <strong>Visão consolidada · ${esc(nomeProduto)}</strong>
      </div>
      <table class="popover-table">
        <thead>
          <tr>
            <th class="num" style="text-align: left;">Produto</th>
            <th class="num">Vidas</th>
            <th class="num">Receita</th>
            <th class="num">Despesa</th>
            <th class="num">Sinistralidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${esc(nomeProduto)}</strong></td>
            <td class="num">${vidasTxt}</td>
            <td class="num">${formatar(rec, 'moeda')}</td>
            <td class="num">${formatar(desp, 'moeda')}</td>
            <td class="num ${sinClass}">${sinTxt}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin: 8px 0 2px 0; font-size: 11px; color: #64748B; font-style: italic; line-height: 1.3;">
        Detalhamento individual por plano não disponível para este produto no período.
      </p>
    </div>`;

  return `
    <div class="produto-hover-wrapper">
      <span class="produto-nome" style="font-weight: 600;">${esc(nomeProduto)}</span>
      <span class="badge-planos-trigger" title="Visão consolidada (${esc(nomeProduto)})">ℹ</span>
      ${popoverContent}
    </div>`;
}

/**
 * Tabela de Resultado por Produto:
 * - Ordem: Premium, Corporate, Skill, KIPP (se houver), Odontologia (caso tenha retornado da API).
 * - Coluna Sinistralidade: valor cheio (bruto / sem desconto de coparticipação).
 * - Coluna Sinistralidade total: com desconto de coparticipação (líquida).
 * - Hover em cima de cada produto: detalhamento com popover dos planos envolvidos.
 */
function tabelaResultadoPorProduto(bloco) {
  const idsR1 = idsDaFonte({ assinatura: 'produtoResumo', todos: true });
  const itensR1 = idsR1.flatMap((id) => itensDoRelatorio(id));

  const idsR2 = idsDaFonte({ assinatura: 'planos', todos: true });
  const itensR2 = idsR2.flatMap((id) => itensDoRelatorio(id));

  const idsR8 = idsDaFonte({ assinatura: 'vidasMensal', todos: true });
  const itensR8 = idsR8.flatMap((id) => itensDoRelatorio(id));
  const itensOrd1R8 = itensR8.filter((d) => Number(d.Ordem) === 1);
  const baseItensR8 = itensOrd1R8.length ? itensOrd1R8 : itensR8;

  if (!itensR1.length && !itensR2.length && !baseItensR8.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const ehMedicina = (g) => {
    const s = normTexto(g);
    return s.includes('med') || s === 'm';
  };
  const ehOdonto = (g) => {
    const s = normTexto(g);
    return s.includes('odont') || s === 'o';
  };

  const capitalizar = (str) => {
    const s = String(str || '').trim();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const resumoFin = resumoFinanceiroContrato();
  const copayTotal = resumoFin?.copay || 0;
  const planosPorProd = agruparPlanosPorProduto();

  const itensMedR1 = itensR1.filter((d) => ehMedicina(d.Grupo) || (!d.Grupo && !ehOdonto(d.Linha) && !ehOdonto(d.Coluna)));
  const itensOdoR1 = itensR1.filter((d) => (ehOdonto(d.Grupo) || ehOdonto(d.Linha) || ehOdonto(d.Coluna)) && !igual(d.Coluna, 'TotalGeral'));

  const itensMedR8 = baseItensR8.filter((d) => d.Grupo == null || ehMedicina(d.Grupo));
  const itensOdoR8 = baseItensR8.filter((d) => ehOdonto(d.Grupo));

  const mesesR8 = [...new Set(baseItensR8.map((d) => d.Coluna))].filter((c) => chavePeriodo(c) !== null);

  // Produtos ativos em vidasMensal (R8)
  const prodsVidasMed = [...new Set(itensMedR8.map((d) => d.Linha))]
    .filter((l) => l && !/^(total|acumulado)$/i.test(l.trim()));
  const prodsVidasMedAtivos = prodsVidasMed.filter((p) => {
    return mesesR8.some((m) => (num(itensMedR8.find((d) => d.Linha === p && d.Coluna === m)?.Valor) || 0) > 0);
  });

  const prodsVidasOdo = [...new Set(itensOdoR8.map((d) => d.Linha))]
    .filter((l) => l && !/^(total|acumulado)$/i.test(l.trim()));
  const prodsVidasOdoAtivos = prodsVidasOdo.filter((p) => {
    return mesesR8.some((m) => (num(itensOdoR8.find((d) => d.Linha === p && d.Coluna === m)?.Valor) || 0) > 0);
  });

  const temMed = itensMedR1.some((d) => (num(d.Valor) || 0) > 0) || prodsVidasMedAtivos.length > 0 || baseItensR8.length > 0;
  const temOdo = itensOdoR1.some((d) => !igual(d.Coluna, 'TotalGeral') && (num(d.Valor) || 0) > 0) ||
    prodsVidasOdoAtivos.length > 0 ||
    (planosPorProd.has('ODONTOLOGIA') && planosPorProd.get('ODONTOLOGIA').some((p) => p.rec > 0 || p.desp > 0 || p.vidas > 0));

  const gruposConfig = [];
  if (temMed || !temOdo) gruposConfig.push({ tipo: 'medicina', nome: 'Medicina' });
  if (temOdo) gruposConfig.push({ tipo: 'odonto', nome: 'Odontologia' });

  const ORDEM_PRODS = ['PREMIUM', 'CORPORATE', 'SKILL', 'KIPP'];
  const temOdontoEsp = [...planosPorProd.keys()].some(
    (k) => k.startsWith('ODONTO_') && k !== 'ODONTO_PREMIUM' && (planosPorProd.get(k)?.length > 0)
  );

  const despMedicaTotal = itensMedR1.find((d) => igual(d.Coluna, 'Total') && igual(d.Linha, 'DESPESA'))
    ? (num(itensMedR1.find((d) => igual(d.Coluna, 'Total') && igual(d.Linha, 'DESPESA'))?.Valor) || 0)
    : 0;

  const temCopay = contratoTemCoparticipacao();
  const colunasConfig = colunasEfetivas(bloco, {});
  const colunasTabela = colunasConfig.map((c) => ({
    rotulo: c.rotulo,
    numerica: FORMATOS_NUMERICOS.has(c.formato),
    largura: c.largura,
  }));

  const celulasLinhas = [];
  let totRecGeral = 0;
  let totDespGeral = 0;

  gruposConfig.forEach((grp, grpIdx) => {
    const isMed = grp.tipo === 'medicina';
    const itensR1Grupo = isMed ? itensMedR1 : itensOdoR1;
    const prodsVidasAtivos = isMed ? prodsVidasMedAtivos : prodsVidasOdoAtivos;

    // Identifica produtos presentes no grupo
    const prodsSet = new Set();
    prodsVidasAtivos.forEach((p) => prodsSet.add(normalizarChaveProduto(p)));

    ORDEM_PRODS.forEach((pKey) => {
      const matchP = itensR1Grupo.filter((d) => igual(d.Coluna, pKey) || igual(d.Linha, pKey));
      const rec = num(matchP.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
      const desp = num(matchP.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || 0;
      const pl = isMed
        ? (planosPorProd.get(pKey) || [])
        : (planosPorProd.get('ODONTO_' + pKey) || (!temOdontoEsp && pKey === 'PREMIUM' ? (planosPorProd.get('ODONTOLOGIA') || []) : []));
      if (rec > 0 || desp > 0 || pl.some((x) => x.rec > 0 || x.desp > 0 || x.vidas > 0)) {
        prodsSet.add(pKey);
      }
    });

    if (prodsSet.size === 0) {
      const temValorR1 = itensR1Grupo.some((d) => (num(d.Valor) || 0) > 0);
      if (temValorR1) {
        prodsSet.add('PREMIUM');
      }
    }

    const prodsOrdenados = [...prodsSet].sort((a, b) => {
      const ia = ORDEM_PRODS.indexOf(a);
      const ib = ORDEM_PRODS.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    // Calcula dados de cada produto do grupo
    const produtosCalculados = prodsOrdenados.map((prodKey) => {
      const matchP = itensR1Grupo.filter((d) => igual(d.Coluna, prodKey) || igual(d.Linha, prodKey));
      let rec = num(matchP.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
      let desp = num(matchP.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || 0;

      const plMed = isMed ? (planosPorProd.get(prodKey) || []) : [];
      const plOdo = !isMed ? (planosPorProd.get('ODONTO_' + prodKey) || (!temOdontoEsp && prodKey === 'PREMIUM' ? (planosPorProd.get('ODONTOLOGIA') || []) : [])) : [];
      let pl = isMed ? plMed : plOdo;

      if (rec === 0 && desp === 0 && pl.length > 0) {
        rec = pl.reduce((acc, p) => acc + p.rec, 0);
        desp = pl.reduce((acc, p) => acc + p.desp, 0);
      }

      if (!isMed && rec === 0 && desp === 0 && prodsOrdenados.length === 1 && !temOdontoEsp) {
        const totOdo = itensR1Grupo.filter((d) => igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total'));
        if (totOdo.length) {
          rec = num(totOdo.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
          desp = num(totOdo.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || 0;
        }
      }

      // No Slide 20, produtos sem abertura de planos no R2 não geram planos sintéticos;
      // a linha da tabela já exibe os totais consolidados e o nome do produto é exibido limpo sem hover.

      let copayProd = 0;
      if (isMed && despMedicaTotal > 0 && copayTotal > 0 && desp > 0) {
        copayProd = copayTotal * (desp / despMedicaTotal);
      }
      const despCheia = desp + copayProd;
      const impactoCopay = despCheia > 0 ? (copayProd / despCheia) * 100 : 0;
      const sinLiquida = rec > 0 ? (desp / rec) * 100 : (desp > 0 ? null : 0);
      const sinBruta = rec > 0 ? (despCheia / rec) * 100 : (despCheia > 0 ? null : 0);

      return {
        prodKey,
        nomeExibicao: capitalizar(prodKey),
        rec,
        desp,
        despCheia,
        copayProd,
        impactoCopay,
        sinLiquida,
        sinBruta,
        planos: pl,
      };
    });

    // Totais do Grupo
    let totRecGrp = produtosCalculados.reduce((acc, p) => acc + p.rec, 0);
    let totDespGrp = produtosCalculados.reduce((acc, p) => acc + p.desp, 0);

    if (totRecGrp === 0 && totDespGrp === 0) {
      const totR1Grp = itensR1Grupo.filter((d) => igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total'));
      if (totR1Grp.length) {
        totRecGrp = num(totR1Grp.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
        totDespGrp = num(totR1Grp.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || 0;
      }
    }

    const totCopayGrp = isMed ? copayTotal : 0;
    const totDespCheiaGrp = totDespGrp + totCopayGrp;
    const totImpactoGrp = totDespCheiaGrp > 0 ? (totCopayGrp / totDespCheiaGrp) * 100 : 0;
    const totSinLiquidaGrp = totRecGrp > 0 ? (totDespGrp / totRecGrp) * 100 : (totDespGrp > 0 ? null : 0);
    const totSinBrutaGrp = totRecGrp > 0 ? (totDespCheiaGrp / totRecGrp) * 100 : (totDespCheiaGrp > 0 ? null : 0);

    // Filtra apenas produtos com valores efetivos
    const produtosVisiveis = produtosCalculados.filter((p) => {
      const temRec = Math.abs(num(p.rec) || 0) > 0.001;
      const temDesp = Math.abs(num(p.desp) || 0) > 0.001;
      const temCopay = Math.abs(num(p.copayProd) || 0) > 0.001;
      const temVidas = (p.planos || []).some((pl) => (num(pl.vidas) || 0) > 0 || (num(pl.rec) || 0) > 0 || (num(pl.desp) || 0) > 0);
      return temRec || temDesp || temCopay || temVidas;
    });

    // Se a categoria inteira não possui produtos com valor e o total é zero, omite a categoria inteira
    if (!produtosVisiveis.length && totRecGrp === 0 && totDespGrp === 0) {
      return;
    }

    totRecGeral += totRecGrp;
    totDespGeral += totDespGrp;

    // 1. Linha do Grupo (Medicina / Odontologia) - formato idêntico a Evolução de vidas por mês e plano
    const celGrupo = { texto: grp.nome, classe: 'plano-grupo' };
    let rowGrupo = [];
    if (!temCopay) {
      rowGrupo = [
        celGrupo,
        { texto: formatar(totRecGrp, 'moeda') },
        { texto: formatar(totDespGrp, 'moeda') },
        {
          texto: formatar(totSinLiquidaGrp, 'percentual'),
          classe: totSinLiquidaGrp > 75 ? 'valor-critico' : 'valor-positivo',
        },
      ];
    } else {
      rowGrupo = [
        celGrupo,
        { texto: formatar(totRecGrp, 'moeda') },
        { texto: formatar(totDespGrp, 'moeda') },
        { texto: formatar(totImpactoGrp, 'percentual') },
        {
          texto: formatar(totSinLiquidaGrp, 'percentual'),
          classe: totSinLiquidaGrp > 75 ? 'valor-critico' : 'valor-positivo',
        },
        {
          texto: formatar(totSinBrutaGrp, 'percentual'),
          classe: totSinBrutaGrp > 75 ? 'valor-critico' : 'valor-positivo',
        },
      ];
    }
    rowGrupo.__classeLinha = 'linha-grupo-plano';
    celulasLinhas.push(rowGrupo);

    // 2. Linhas apenas dos Produtos com valores reais (plano-item)
    produtosVisiveis.forEach((p, idx) => {
      const isUltimaLinha = (grpIdx === gruposConfig.length - 1 && idx === produtosVisiveis.length - 1) || celulasLinhas.length >= 3;
      const temPlanosReais = p.planos && p.planos.length > 0 && !p.planos.every((pl) => pl.sintetico);
      const celProduto = {
        texto: p.nomeExibicao,
        html: temPlanosReais ? gerarHtmlHoverProduto(p.nomeExibicao, p.planos, isUltimaLinha) : undefined,
        classe: 'col-produto plano-item',
      };

      let rowProd = [];
      if (!temCopay) {
        rowProd = [
          celProduto,
          { texto: formatar(p.rec, 'moeda') },
          { texto: formatar(p.desp, 'moeda') },
          {
            texto: formatar(p.sinLiquida, 'percentual'),
            classe: p.sinLiquida > 75 ? 'valor-critico' : 'valor-positivo',
          },
        ];
      } else {
        rowProd = [
          celProduto,
          { texto: formatar(p.rec, 'moeda') },
          { texto: formatar(p.desp, 'moeda') },
          { texto: formatar(p.impactoCopay, 'percentual') },
          {
            texto: formatar(p.sinLiquida, 'percentual'),
            classe: p.sinLiquida > 75 ? 'valor-critico' : 'valor-positivo',
          },
          {
            texto: formatar(p.sinBruta, 'percentual'),
            classe: p.sinBruta > 75 ? 'valor-critico' : 'valor-positivo',
          },
        ];
      }
      rowProd.__classeLinha = 'linha-subplano';
      celulasLinhas.push(rowProd);
    });
  });

  if (!celulasLinhas.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const totDespCheiaGeral = totDespGeral + copayTotal;
  const totImpactoGeral = totDespCheiaGeral > 0 ? (copayTotal / totDespCheiaGeral) * 100 : 0;
  const totSinLiquidaGeral = totRecGeral > 0 ? (totDespGeral / totRecGeral) * 100 : 0;
  const totSinBrutaGeral = totRecGeral > 0 ? (totDespCheiaGeral / totRecGeral) * 100 : 0;

  const rodape = !temCopay
    ? [
        { texto: 'TOTAL' },
        { texto: formatar(totRecGeral, 'moeda') },
        { texto: formatar(totDespGeral, 'moeda') },
        {
          texto: formatar(totSinLiquidaGeral, 'percentual'),
          classe: totSinLiquidaGeral > 75 ? 'valor-critico' : 'valor-positivo',
        },
      ]
    : [
        { texto: 'TOTAL' },
        { texto: formatar(totRecGeral, 'moeda') },
        { texto: formatar(totDespGeral, 'moeda') },
        { texto: formatar(totImpactoGeral, 'percentual') },
        {
          texto: formatar(totSinLiquidaGeral, 'percentual'),
          classe: totSinLiquidaGeral > 75 ? 'valor-critico' : 'valor-positivo',
        },
        {
          texto: formatar(totSinBrutaGeral, 'percentual'),
          classe: totSinBrutaGeral > 75 ? 'valor-critico' : 'valor-positivo',
        },
      ];

  const html = UI.tabelaExecutiva({
    colunas: colunasTabela,
    linhas: celulasLinhas,
    rodape,
    overflowVisible: true,
    compacta: celulasLinhas.length >= 8,
  });

  const colunasMetadados = colunasTabela.map((c) => c.rotulo);
  const linhasMetadados = [
    ...celulasLinhas.map((r) => r.map((c) => c.texto)),
    rodape.map((c) => c.texto),
  ];

  const legendaDinamica = resolverLegendaBloco(bloco, temCopay);

  return {
    vazio: false,
    totalOriginal: celulasLinhas.length + 1,
    legenda: legendaDinamica,
    html,
    dados: {
      tipo: 'tabela',
      colunas: colunasMetadados,
      linhas: linhasMetadados,
      totalRegistros: celulasLinhas.length + 1,
    },
  };
}

/**
 * Tabela de Despesa mensal por produto (slide despesa-produto-mensal):
 * - Agrupa hierarquicamente por grupo (Medicina, Odontologia) e produtos (Corporate, Skill, etc.)
 * - Linhas e hierarquia idênticas às de Resultado por produto (linha-grupo-plano, linha-subplano)
 * - Hover popover detalhando planos envolvidos em cada produto
 * - Oculta produtos e categorias que tenham apenas valores zerados em todos os meses
 * - Rodapé com total consolidado por mês
 */
function tabelaDespesaProdutoMensal(bloco) {
  const idsR11 = idsDaFonte({ assinatura: 'produtoMensal', todos: true });
  const itensR11 = idsR11.flatMap((id) => itensDoRelatorio(id));

  const idsR14 = idsDaFonte({ assinatura: 'eventoMensal', todos: true });
  const itensR14 = idsR14.flatMap((id) => itensDoRelatorio(id));

  const idsR1 = idsDaFonte({ assinatura: 'produtoResumo', todos: true });
  const itensR1 = idsR1.flatMap((id) => itensDoRelatorio(id));

  const ehMedicina = (g) => {
    const s = normTexto(g);
    return s.includes('med') || s === 'm';
  };
  const ehOdonto = (g) => {
    const s = normTexto(g);
    return s.includes('odont') || s === 'o';
  };
  const capitalizar = (str) => {
    const s = String(str || '').trim();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const itensDespR11 = itensR11.filter((d) => igual(d.Linha, 'Despesa') || igual(d.Linha, 'DESPESA'));

  // Identifica meses disponíveis ordenados cronologicamente
  const mesesSet = new Set();
  itensDespR11.forEach((d) => {
    if (chavePeriodo(d.Coluna) !== null) mesesSet.add(d.Coluna);
  });
  if (!mesesSet.size) {
    itensR14.forEach((d) => {
      if (chavePeriodo(d.Coluna) !== null) mesesSet.add(d.Coluna);
    });
  }
  const mesesOrdenados = [...mesesSet].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
  const maxColunas = bloco.colunasAuto?.maximo ? Number(bloco.colunasAuto.maximo) : 14;
  const meses = mesesOrdenados.length > maxColunas ? mesesOrdenados.slice(-maxColunas) : mesesOrdenados;

  if (!meses.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const itensMedR1 = itensR1.filter((d) => ehMedicina(d.Grupo) || (!d.Grupo && !ehOdonto(d.Linha) && !ehOdonto(d.Coluna)));
  const itensOdoR1 = itensR1.filter((d) => ehOdonto(d.Grupo) || ehOdonto(d.Linha) || ehOdonto(d.Coluna));

  const ORDEM_PRODS = ['PREMIUM', 'CORPORATE', 'SKILL', 'KIPP'];
  const temOdontoEsp = [...planosPorProd.keys()].some(
    (k) => k.startsWith('ODONTO_') && k !== 'ODONTO_PREMIUM' && (planosPorProd.get(k)?.length > 0)
  );

  // 1. Produtos de Medicina
  const prodsMed = ORDEM_PRODS.map((pKey) => {
    const matchItens = itensDespR11.filter((d) => igual(d.Grupo, pKey) || (d.Linha && igual(d.Linha, pKey)));
    const valoresMeses = meses.map((m) => {
      const it = matchItens.find((d) => igual(d.Coluna, m) || chavePeriodo(d.Coluna) === chavePeriodo(m));
      return it && num(it.Valor) !== null ? num(it.Valor) : 0;
    });
    const temValor = valoresMeses.some((v) => v !== null && Math.abs(v) > 0.001);
    let pl = planosPorProd.get(pKey) || [];
    const somaMeses = valoresMeses.reduce((acc, v) => acc + (v || 0), 0);

    let dadosConsolidados = null;
    if ((!pl || pl.length === 0) && somaMeses > 0) {
      let vidasCons = 0;
      try {
        const ultMes = mesesR8[mesesR8.length - 1];
        if (ultMes) {
          const itemR8 = itensMedR8.find(
            (d) => normalizarChaveProduto(d.Linha) === pKey && d.Coluna === ultMes
          );
          if (itemR8 && num(itemR8.Valor) > 0) vidasCons = num(itemR8.Valor);
        }
      } catch (_) {}
      const matchR1 = itensMedR1.filter((d) => normalizarChaveProduto(d.Coluna) === pKey || normalizarChaveProduto(d.Linha) === pKey);
      if (!vidasCons && matchR1.length) {
        vidasCons = num(matchR1.find((d) => igual(d.Linha, 'VIDAS'))?.Valor) || 0;
      }
      const recR1 = num(matchR1.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
      const despR1 = num(matchR1.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || somaMeses;
      const sinR1 = recR1 > 0 ? (despR1 / recR1) * 100 : (despR1 > 0 ? null : 0);
      dadosConsolidados = {
        vidas: vidasCons,
        rec: recR1,
        desp: despR1,
        sin: sinR1,
      };
    }

    return {
      pKey,
      nomeExibicao: capitalizar(pKey),
      valoresMeses,
      temValor,
      planos: pl,
      dadosConsolidados,
    };
  }).filter((p) => p.temValor);

  // 2. Produtos de Odontologia
  const itensDespOdoR11 = itensDespR11.filter((d) => ehOdonto(d.Grupo) || ehOdonto(d.Linha));
  const itensOdontoR14 = itensR14.filter((d) => igual(d.Linha, 'Odontologia') || normTexto(d.Linha).includes('odont'));

  // Calcula despesa de Odonto por produto a partir de R1 e planos
  const totDespOdoRef = ORDEM_PRODS.reduce((acc, k) => {
    const d1 = num(itensOdoR1.find((d) => (igual(d.Coluna, k) || igual(d.Linha, k)) && igual(d.Linha, 'DESPESA'))?.Valor) || 0;
    const plK = planosPorProd.get('ODONTO_' + k) || [];
    const d2 = plK.reduce((a, x) => a + (x.desp || 0), 0);
    return acc + Math.max(d1, d2);
  }, 0);

  const prodsOdo = ORDEM_PRODS.map((pKey) => {
    let valoresMeses = meses.map(() => 0);
    let pl = planosPorProd.get('ODONTO_' + pKey) || [];
    if (!pl.length && (!temOdontoEsp && pKey === 'PREMIUM')) {
      pl = planosPorProd.get('ODONTOLOGIA') || [];
    }

    if (itensDespOdoR11.length > 0) {
      const matchItens = itensDespOdoR11.filter((d) => igual(d.Grupo, pKey) || (d.Linha && igual(d.Linha, pKey)));
      valoresMeses = meses.map((m) => {
        const it = matchItens.find((d) => igual(d.Coluna, m) || chavePeriodo(d.Coluna) === chavePeriodo(m));
        return it && num(it.Valor) !== null ? num(it.Valor) : 0;
      });
    } else if (itensOdontoR14.length > 0) {
      const despR1 = num(itensOdoR1.find((d) => (igual(d.Coluna, pKey) || igual(d.Linha, pKey)) && igual(d.Linha, 'DESPESA'))?.Valor) || 0;
      const despPl = pl.reduce((acc, x) => acc + (x.desp || 0), 0);
      const despRef = Math.max(despR1, despPl);

      if (despRef > 0) {
        const ratio = totDespOdoRef > 0 ? despRef / totDespOdoRef : 1;
        valoresMeses = meses.map((m) => {
          const it = itensOdontoR14.find((d) => igual(d.Coluna, m) || chavePeriodo(d.Coluna) === chavePeriodo(m));
          const valTot = it && num(it.Valor) !== null ? num(it.Valor) : 0;
          return valTot * ratio;
        });
      }
    }

    const somaMeses = valoresMeses.reduce((acc, v) => acc + (v || 0), 0);
    let dadosConsolidados = null;
    if ((!pl || pl.length === 0) && somaMeses > 0) {
      let vidasCons = 0;
      try {
        const ultMes = mesesR8[mesesR8.length - 1];
        if (ultMes) {
          const itemR8 = itensOdoR8.find(
            (d) => normalizarChaveProduto(d.Linha) === pKey && d.Coluna === ultMes
          );
          if (itemR8 && num(itemR8.Valor) > 0) vidasCons = num(itemR8.Valor);
        }
      } catch (_) {}
      const matchR1 = itensOdoR1.filter((d) => normalizarChaveProduto(d.Coluna) === pKey || normalizarChaveProduto(d.Linha) === pKey);
      if (!vidasCons && matchR1.length) {
        vidasCons = num(matchR1.find((d) => igual(d.Linha, 'VIDAS'))?.Valor) || 0;
      }
      const recR1 = num(matchR1.find((d) => igual(d.Linha, 'RECEITA'))?.Valor) || 0;
      const despR1 = num(matchR1.find((d) => igual(d.Linha, 'DESPESA'))?.Valor) || somaMeses;
      const sinR1 = recR1 > 0 ? (despR1 / recR1) * 100 : (despR1 > 0 ? null : 0);
      dadosConsolidados = {
        vidas: vidasCons,
        rec: recR1,
        desp: despR1,
        sin: sinR1,
      };
    }

    const temValor = valoresMeses.some((v) => v !== null && Math.abs(v) > 0.001);
    return {
      pKey,
      nomeExibicao: capitalizar(pKey),
      valoresMeses,
      temValor,
      planos: pl,
      dadosConsolidados,
    };
  }).filter((p) => p.temValor);

  const grupos = [];
  if (prodsMed.length > 0) {
    grupos.push({ tipo: 'medicina', nome: 'Medicina', produtos: prodsMed });
  }
  if (prodsOdo.length > 0) {
    grupos.push({ tipo: 'odonto', nome: 'Odontologia', produtos: prodsOdo });
  }

  if (!grupos.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const colunasTabela = [
    { rotulo: bloco.colunasAuto?.rotuloEixo || 'Produto', numerica: false },
    ...meses.map((m) => ({ rotulo: m, numerica: true, formato: 'moedaInteira' })),
  ];

  const celulasLinhas = [];
  const somaMesGeral = meses.map(() => 0);

  grupos.forEach((grp, grpIdx) => {
    const somaMesGrupo = meses.map((m, i) => {
      const s = grp.produtos.reduce((acc, p) => acc + (p.valoresMeses[i] || 0), 0);
      somaMesGeral[i] += s;
      return s;
    });

    // 1. Linha do Grupo (Medicina / Odontologia)
    const rowGrupo = [
      { texto: grp.nome, classe: 'plano-grupo' },
      ...somaMesGrupo.map((v) => ({ texto: formatar(v, 'moedaInteira') })),
    ];
    rowGrupo.__classeLinha = 'linha-grupo-plano';
    celulasLinhas.push(rowGrupo);

    // 2. Linhas dos Produtos com valores reais (Corporate, Skill, etc.)
    grp.produtos.forEach((p, idx) => {
      const isUltimaLinha = (grpIdx === grupos.length - 1 && idx === grp.produtos.length - 1) || celulasLinhas.length >= 3;
      let htmlHover = undefined;
      if (p.planos && p.planos.length > 0 && !p.planos.every((pl) => pl.sintetico)) {
        htmlHover = gerarHtmlHoverProduto(p.nomeExibicao, p.planos, isUltimaLinha);
      } else if (p.dadosConsolidados) {
        htmlHover = gerarHtmlHoverConsolidado(p.nomeExibicao, p.dadosConsolidados, isUltimaLinha);
      }
      const celProduto = {
        texto: p.nomeExibicao,
        html: htmlHover,
        classe: 'col-produto plano-item',
      };
      const rowProd = [
        celProduto,
        ...p.valoresMeses.map((v) => ({ texto: formatar(v, 'moedaInteira') })),
      ];
      rowProd.__classeLinha = 'linha-subplano';
      celulasLinhas.push(rowProd);
    });
  });

  const rodape = [
    { texto: 'TOTAL' },
    ...somaMesGeral.map((v) => ({ texto: formatar(v, 'moedaInteira') })),
  ];

  const colunasMetadados = colunasTabela.map((c) => c.rotulo);
  const linhasMetadados = [
    ...celulasLinhas.map((r) => r.map((c) => c.texto)),
    rodape.map((c) => c.texto),
  ];

  const html = UI.tabelaExecutiva({
    colunas: colunasTabela,
    linhas: celulasLinhas,
    rodape,
    overflowVisible: true,
    compacta: true,
    muitasColunas: true,
  });

  return {
    vazio: false,
    totalOriginal: celulasLinhas.length + 1,
    html,
    dados: {
      tipo: 'tabela',
      colunas: colunasMetadados,
      linhas: linhasMetadados,
      totalRegistros: celulasLinhas.length + 1,
    },
  };
}

/* ==========================================================================
 * TOP 10 PRESTADORES: NORMALIZAÇÃO, DICIONÁRIO INTELIGENTE E HOVER TOOLTIPS
 * ========================================================================== */

const DICIONARIO_GRUPOS_PRESTADORES = [
  // 1. Laboratórios e Medicina Diagnóstica específicos (prioritários em contexto laboratorial)
  {
    nomeGrupo: 'Laboratório Albert Einstein',
    isLab: true,
    aliases: [
      'laboratorio einstein', 'laboratório einstein',
      'laboratorio albert einstein', 'laboratório albert einstein',
      'lab einstein', 'lab albert einstein'
    ]
  },
  {
    nomeGrupo: 'Laboratório Sírio-Libanês',
    isLab: true,
    aliases: [
      'laboratorio sirio', 'laboratório sírio',
      'laboratorio sirio-libanes', 'laboratório sírio-libanês',
      'lab sirio', 'lab sírio'
    ]
  },
  {
    nomeGrupo: 'Grupo Fleury',
    isLab: true,
    aliases: [
      'fleury', 'fleury s/a', 'fleury s a', 'demais marcas',
      'hermes pardini', 'pardini', 'a+ medicina', 'a plus', 'a+ diagnostica',
      'campana', 'felippe mattoso', 'weinmann'
    ]
  },
  {
    nomeGrupo: 'Dasa Medicina Diagnóstica',
    isLab: true,
    aliases: [
      'diagnosticos da america', 'diagnósticos da américa', 'dasa',
      'gip medicina', 'alta excelencia', 'alta excelência', 'alta diagnostica', 'alta diagnóstica',
      'delboni', 'delboni auriemo', 'salomao zoppi', 'salomão zoppi',
      'lavoisier', 'frischmann', 'sergio franco'
    ]
  },
  {
    nomeGrupo: 'CDB / Grupo Alliar',
    isLab: true,
    aliases: [
      'cdb', 'grupo aliar', 'aliar', 'alliar', 'cdb inteligencia', 'cdb inteligência'
    ]
  },
  {
    nomeGrupo: 'Grupo Sabin',
    isLab: true,
    aliases: ['sabin', 'grupo sabin', 'laboratorio sabin', 'laboratório sabin']
  },

  // 2. Conglomerados Hospitalares & Redes
  {
    nomeGrupo: "Rede D'Or São Luiz",
    aliases: [
      "rede d'or", "rede dor", "d'or", "dor sao luiz", "dor são luiz",
      "sao luiz", "são luiz", 
      "pacifico", "pacífico", "pacifico operacoes", "pacifico operações", "pacifico holding",
      "villa lobos", "villa-lobos", "hospital brasil", "maternidade brasil",
      "bartira", "sino brasileiro", "sino-brasileiro", "assunção", "assuncao",
      "copa d'or", "barra d'or", "quinta d'or", "rios d'or", "norte d'or", "oeste d'or",
      "caxias d'or", "niteroi d'or", "gloria d'or", "clinica sao vicente", "badim",
      "star medicina", "vila nova star", "maternidade star", "hospital star",
      "copa star", "df star", "memorial star", "alianca star",
      "hospital vivalle", "vivalle", "vi valle",
      "novo atibaia", "hospital novo atibaia", "ribeirao pires", "ribeirão pires"
    ]
  },
  {
    nomeGrupo: 'Hospital Israelita Albert Einstein',
    aliases: [
      'albert einstein', 'einstein',
      'israelita brasileira', 'sociedade beneficente israelita'
    ]
  },
  {
    nomeGrupo: 'Hospital Sírio-Libanês',
    aliases: [
      'sirio-libanes', 'sirio libanes', 'sírio-libanês', 'sírio libanês',
      'sociedade beneficente de senhoras', 'sirio', 'sírio'
    ]
  },
  {
    nomeGrupo: 'Sociedade Beneficente São Camilo',
    aliases: ['sao camilo', 'são camilo']
  },
  {
    nomeGrupo: 'Hospital Alemão Oswaldo Cruz',
    aliases: ['oswaldo cruz', 'alemao oswaldo cruz', 'alemão oswaldo cruz']
  },
  {
    nomeGrupo: 'Dasa / Ímpar Serviços Hospitalares',
    aliases: [
      'impar servicos hospitalares', 'impar serviços hospitalares', 'impar', 'ímpar',
      'nove de julho', '9 de julho',
      'hospital santa paula', 'santa paula',
      'leforte', 'hospital leforte', 'christovao da gama', 'christóvão da gama',
      'complexo hospitalar de niteroi', 'chn'
    ]
  },
  {
    nomeGrupo: 'Hospital Samaritano',
    aliases: ['samaritano', 'hospital samaritano']
  },
  {
    nomeGrupo: 'Hospital Paulistano',
    aliases: ['paulistano', 'hospital paulistano']
  },
  {
    nomeGrupo: 'Hospital e Maternidade Santa Joana',
    aliases: ['santa joana', 'pro matre', 'pro-matre', 'pró matre', 'santa maria']
  },
  {
    nomeGrupo: 'Hospital Santa Catarina',
    aliases: ['santa catarina', 'hospital santa catarina']
  },
  {
    nomeGrupo: 'Hospital Infantil Sabará',
    aliases: ['infantil sabara', 'infantil sabará', 'sabara', 'sabará']
  },
  {
    nomeGrupo: 'Hospital Blanc',
    aliases: ['blanc', 'hospital blanc']
  },
  {
    nomeGrupo: 'Hospital Vera Cruz (Campinas)',
    aliases: ['vera cruz', 'hospital vera cruz']
  },
  {
    nomeGrupo: 'Hospital Santa Elisa (Jundiaí)',
    aliases: ['santa elisa', 'hospital santa elisa']
  },
  {
    nomeGrupo: 'Hospital Pitangueiras (Sobam)',
    aliases: ['pitangueiras', 'hospital pitangueiras']
  },
  {
    nomeGrupo: 'AACD',
    aliases: ['associacao de assistencia a crianca deficiente', 'aacd']
  },
  {
    nomeGrupo: 'CERPO Oftalmologia (Grupo Opty)',
    aliases: ['cerpo', 'recuperacao de patologia oculare']
  },
  {
    nomeGrupo: 'Mediservice Administradora de Planos',
    aliases: ['mediservice']
  }
];

function limparNomePrestador(nomeOriginal) {
  if (!nomeOriginal) return '';
  let s = String(nomeOriginal).trim();
  // 1. Remove prefixos de modalidade de atendimento / tipos jurídicos
  s = s.replace(/^(PS\s+|PRONTO\s+SOCORRO\s+|PRONTO\s+ATENDIMENTO\s+|HOSPITAL\s+E\s+MATERNIDADE\s+|HOSPITAL\s+|HOSP\.\s*|HOSP\s+|MATERNIDADE\s+|SOCIEDADE\s+BENEFICENTE\s+|LABORAT[ÓO]RIO\s+(DE\s+)?|LAB\.\s*|INSTITUTO\s+|CL[ÍI]NICA\s+)/i, '');
  // 2. Remove sufixos de localidade ou filial
  s = s.replace(/\s*-\s*(BRASIL|SP|S[ÃA]O\s+PAULO|UNIDADE\s+.*|FILIAL\s+.*|MATRIZ|MORUMBI|ITAIM|PAULISTA|ALPHAVILLE|IPIRANGA|SANTANA|POMPEIA|POMP[ÉE]IA|PERDIZES|HIGIEN[ÓO]POLIS|MOEMA|JARDINS|BARRA|COPA|CENTRO)\b.*$/i, '');
  // 3. Remove sufixos societários finais
  s = s.replace(/\s+(LTDA|S\/A|S\.A\.|S\/C\s+LTDA|SA|ME|EPP)\.?$/i, '');
  // 4. Normaliza espaços múltiplos
  return s.replace(/\s{2,}/g, ' ').trim();
}

function resolverNomeCanonicoPrestador(nomeBruto, gruposCustom = null, isLaboratorio = false) {
  if (!nomeBruto) return 'Outros';
  const limpo = limparNomePrestador(nomeBruto);
  const nBruto = normTexto(nomeBruto);
  const nLimpo = normTexto(limpo);

  let listaGrupos = Array.isArray(gruposCustom) && gruposCustom.length ? gruposCustom : DICIONARIO_GRUPOS_PRESTADORES;

  if (isLaboratorio) {
    // Se for contexto laboratorial, prioriza checagem dos grupos marcados como isLab
    listaGrupos = [...listaGrupos].sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
  }

  for (const g of listaGrupos) {
    for (const a of g.aliases) {
      const na = normTexto(a);
      if (nBruto.includes(na) || nLimpo.includes(na)) {
        return formatarNomeProprio(g.nomeGrupo);
      }
    }
  }

  // Fallback: se não estiver no dicionário, usa o nome limpo formatado em Title Case
  return formatarNomeProprio(limpo || nomeBruto);
}

function extrairIdentificadorUnidade(nomeOriginal, nomeGrupo) {
  if (!nomeOriginal) return '';
  const s = String(nomeOriginal).trim();
  const n = normTexto(s);
  if (n.includes('pacifico')) return 'Pacífico Operações';
  if (n.includes('star')) {
    if (n.includes('vila nova')) return 'Vila Nova Star';
    if (n.includes('df star')) return 'DF Star';
    if (n.includes('copa star')) return 'Copa Star';
    return 'Star';
  }
  if (n.includes('copa')) return "Copa D'Or";
  if (n.includes('barra')) return "Barra D'Or";
  if (n.includes('quinta')) return "Quinta D'Or";
  if (n.includes('brasil')) return 'Brasil';
  if (n.includes('villa lobos') || n.includes('villa-lobos')) return 'Villa-Lobos';
  if (n.includes('bartira')) return 'Bartira';
  if (n.includes('assuncao') || n.includes('assunção')) return 'Assunção';
  if (n.includes('sino brasileiro')) return 'Sino-Brasileiro';
  if (n.includes('itaim')) return 'Itaim';
  if (n.includes('morumbi')) return 'Morumbi';
  if (n.includes('analia franco') || n.includes('anália franco')) return 'Anália Franco';
  if (n.includes('demais marcas')) return 'Demais Marcas';
  if (n.includes('alta')) return 'Alta Diagnóstica';
  if (n.includes('delboni')) return 'Delboni';
  if (n.includes('salomao') || n.includes('salomão')) return 'Salomão Zoppi';
  if (n.includes('lavoisier')) return 'Lavoisier';
  const partes = s.split(/\s*-\s*/);
  if (partes.length > 1) {
    const suf = partes[partes.length - 1].trim();
    if (suf && suf.length > 1 && !/^(sp|rj|mg|sa|s\/a|ltda)$/i.test(suf)) {
      return formatarNomeProprio(suf);
    }
  }
  const limpo = limparNomePrestador(s);
  return limpo !== nomeGrupo ? formatarNomeProprio(limpo) : 'Unidade Principal';
}

function tabelaTopPrestadores(bloco) {
  const dados = resolverFonteTabela(bloco.fonte);
  if (!dados.linhas || !dados.linhas.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const isLab = bloco.id === 'top-laboratorios' || /laborat/i.test(bloco.id || '') || (bloco.fonte && bloco.fonte.filtro && bloco.fonte.filtro.ordem === 3);
  const mapaGrupos = new Map();
  let baseTotalCalculada = 0;

  // 1. Tenta obter a despesa total oficial do contrato (Relatório 10 / Relatório 1)
  let despOficial = resumoFinanceiroContrato()?.despesa;
  if (!despOficial || despOficial <= 0) {
    const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
    const itensR1 = idsR1.length ? idsR1.flatMap((id) => itensDoRelatorio(id)) : [];
    const itemDespR1 = itensR1.find((d) =>
      (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) &&
      /despesa/i.test(String(d.Linha || '')) &&
      (!d.Grupo || /medicina|m/i.test(String(d.Grupo || '')))
    );
    if (itemDespR1 && num(itemDespR1.Valor) > 0) {
      despOficial = num(itemDespR1.Valor);
    }
  }
  if (despOficial && despOficial > 0) {
    baseTotalCalculada = despOficial;
  }

  dados.linhas.forEach((l) => {
    const nomeOriginal = String(l.__eixo || l.Linha || '').trim();
    if (!nomeOriginal) return;
    if (/^(total|subtotal|total geral)/i.test(nomeOriginal)) return;

    const nomeCanonico = resolverNomeCanonicoPrestador(nomeOriginal, bloco.gruposPrestadores, isLab);
    const desp = num(valorDe(l, ['Total', 'Despesa', 'Valor'])) || 0;
    const pct = num(valorDe(l, ['%', '% Despesa', 'PercDespesa'])) || 0;

    // Fallback secundário: regra de três caso não haja despesa oficial disponível
    if (desp > 0 && pct > 0 && baseTotalCalculada === 0) {
      baseTotalCalculada = (desp / pct) * 100;
    }

    if (!mapaGrupos.has(nomeCanonico)) {
      mapaGrupos.set(nomeCanonico, {
        nome: nomeCanonico,
        despesaTotal: 0,
        unidades: [],
        linhaBase: l,
      });
    }

    const g = mapaGrupos.get(nomeCanonico);
    g.despesaTotal += desp;
    g.unidades.push({
      nomeOriginal,
      despesa: desp,
      pctOriginal: pct,
    });
  });

  const linhasValidas = dados.linhas.filter((l) => {
    const nomeOriginal = String(l.__eixo || l.Linha || '').trim();
    return nomeOriginal && !/^(total|subtotal|total geral)/i.test(nomeOriginal);
  });

  const limite = Number(bloco.limite || 10);
  const gruposOrdenados = [...mapaGrupos.values()].sort((a, b) => b.despesaTotal - a.despesaTotal);
  if (!gruposOrdenados.length) {
    return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };
  }

  const somaDespGeral = gruposOrdenados.reduce((acc, g) => acc + g.despesaTotal, 0);
  const baseTotal = baseTotalCalculada > 0 ? baseTotalCalculada : somaDespGeral;

  // Percentual de despesa em cada grupo
  let acGrupos = 0;
  gruposOrdenados.forEach((g) => {
    g.pctDespesa = baseTotal > 0 ? (g.despesaTotal / baseTotal) * 100 : 0;
    acGrupos += g.pctDespesa;
    g.pctAcumulado = acGrupos;
  });

  // Se a fonte original tinha pelo menos 'limite' registros (ex: 10) e ao agrupar caíram para menos (ex: 7 ou 8),
  // mantemos as 10 linhas visíveis exibindo as unidades individuais com o identificador de unidade e o badge
  // do grupo econômico, e consolidamos os mesmos prestadores na seção de rodapé da tabela!
  const precisaExibirUnidadesIndividuais = linhasValidas.length >= limite && gruposOrdenados.length < limite;

  let topLinhas = [];
  if (precisaExibirUnidadesIndividuais) {
    const unidadesIndividuais = linhasValidas.map((l) => {
      const nomeOriginal = String(l.__eixo || l.Linha || '').trim();
      const nomeCanonico = resolverNomeCanonicoPrestador(nomeOriginal, bloco.gruposPrestadores, isLab);
      const desp = num(valorDe(l, ['Total', 'Despesa', 'Valor'])) || 0;
      const pct = num(valorDe(l, ['%', '% Despesa', 'PercDespesa'])) || 0;
      const g = mapaGrupos.get(nomeCanonico);
      const ehMultiplo = g && g.unidades.length > 1;

      let nomeExibicao = formatarNomeProprio(nomeCanonico);
      if (ehMultiplo) {
        const idUnid = extrairIdentificadorUnidade(nomeOriginal, nomeCanonico);
        nomeExibicao = idUnid ? `${nomeCanonico} · ${formatarNomeProprio(idUnid)}` : formatarNomeProprio(nomeOriginal);
      }

      return {
        nome: nomeExibicao,
        nomeOriginal,
        nomeGrupo: nomeCanonico,
        grupoObj: g,
        despesaTotal: desp,
        pctDespesa: pct,
        unidades: g ? g.unidades : [{ nomeOriginal, despesa: desp, pctOriginal: pct }],
        ehMultiplo,
      };
    }).sort((a, b) => b.despesaTotal - a.despesaTotal);

    topLinhas = unidadesIndividuais.slice(0, limite);
    let ac = 0;
    topLinhas.forEach((u) => {
      u.pctDespesa = baseTotal > 0 ? (u.despesaTotal / baseTotal) * 100 : 0;
      ac += u.pctDespesa;
      u.pctAcumulado = ac;
    });
  } else {
    topLinhas = gruposOrdenados.slice(0, limite);
    let ac = 0;
    topLinhas.forEach((g) => {
      g.pctDespesa = baseTotal > 0 ? (g.despesaTotal / baseTotal) * 100 : 0;
      ac += g.pctDespesa;
      g.pctAcumulado = ac;
    });
  }

  const temColunaAcumulado = bloco.colunas ? bloco.colunas.some((c) => normTexto(c.rotulo).includes('acumulad') || igual(c.de, '% ac')) : true;

  const colunas = [
    { rotulo: 'Prestador', de: '__eixo' },
    { rotulo: 'Despesa', de: 'Total', formato: 'moeda', numerica: true },
    { rotulo: '% Despesa', de: '%', formato: 'percentual', numerica: true },
  ];
  if (temColunaAcumulado) {
    colunas.push({ rotulo: '% Acumulado', de: '% ac', formato: 'percentual', numerica: true });
  }

  const celulas = topLinhas.map((g) => {
    const row = [
      { texto: formatarNomeProprio(g.nome) },
      { texto: formatar(g.despesaTotal, 'moeda') },
      { texto: formatar(g.pctDespesa, 'percentual') },
    ];
    if (temColunaAcumulado) {
      row.push({ texto: formatar(g.pctAcumulado, 'percentual') });
    }
    return row;
  });

  let rodape = null;
  if (bloco.totalizar !== false) {
    const somaDespTop10 = topLinhas.reduce((acc, g) => acc + g.despesaTotal, 0);
    const somaPctTop10 = topLinhas.reduce((acc, g) => acc + g.pctDespesa, 0);
    rodape = [
      { texto: bloco.rotuloTotal || 'Total' },
      { texto: formatar(somaDespTop10, 'moeda') },
      { texto: formatar(somaPctTop10, 'percentual') },
    ];
    if (temColunaAcumulado) {
      rodape.push({ texto: '—' });
    }
  }

  const html = UI.tabelaExecutiva({
    colunas,
    linhas: celulas,
    rodape,
    compacta: bloco.compacta,
    overflowVisible: false,
  });

  return {
    html,
    vazio: false,
    dados: {
      tipo: 'tabela',
      linhas: topLinhas.map((g) => ({
        Prestador: g.nome,
        Despesa: formatar(g.despesaTotal, 'moeda'),
        '% Despesa': formatar(g.pctDespesa, 'percentual'),
        '% Acumulado': formatar(g.pctAcumulado, 'percentual'),
      })),
    },
  };
}

/** Tabela a partir de um bloco → { html, vazio, dados } */
function tabelaDeBloco(bloco) {
  if (bloco.id === 'vidas-mensal') {
    return tabelaVidasMensalPorPlano(bloco);
  }
  if (bloco.id === 'produto-resumo') {
    return tabelaResultadoPorProduto(bloco);
  }
  if (bloco.id === 'despesa-produto-mensal') {
    return tabelaDespesaProdutoMensal(bloco);
  }
  if (['top-hospitais', 'top-prestadores-bloco2', 'top-laboratorios'].includes(bloco.id) || bloco.agruparPrestadores) {
    return tabelaTopPrestadores(bloco);
  }
  const dados = resolverFonteTabela(bloco.fonte);

  if (bloco.garantirMesesPeriodo || bloco.id === 'evento-mensal') {
    const params = parametros();
    const dtIni = params.dataInicial || DADOS?.relatorio?.DtInicial;
    const dtFim = params.dataFinal || DADOS?.relatorio?.DtFinal;
    if (dtIni && dtFim) {
      const mesesEsperados = gerarMesesPeriodo(dtIni, dtFim);
      if (mesesEsperados.length > 0) {
        if (dados.linhas?.some((l) => chavePeriodo(l.__eixo) !== null)) {
          const mapaExistentes = new Map();
          dados.linhas.forEach((l) => {
            const k = chavePeriodo(l.__eixo);
            if (k !== null) mapaExistentes.set(k, l);
          });

          const novasLinhas = mesesEsperados.map((mLabel) => {
            const k = chavePeriodo(mLabel);
            if (mapaExistentes.has(k)) {
              return mapaExistentes.get(k);
            }
            return { __eixo: mLabel, __itens: [] };
          });

          const outrasLinhas = dados.linhas.filter((l) => chavePeriodo(l.__eixo) === null);
          dados.linhas = [...novasLinhas, ...outrasLinhas];
        } else if (ehListaPeriodos(dados.series || [])) {
          const seriesSet = new Set(dados.series);
          mesesEsperados.forEach((m) => seriesSet.add(m));
          const periodos = ordenarPorPeriodo([...seriesSet].filter((s) => chavePeriodo(s) !== null));
          const outras = [...seriesSet].filter((s) => chavePeriodo(s) === null);
          dados.series = [...periodos, ...outras];
        }
      }
    }
  }

  const colunas = colunasEfetivas(bloco, dados);
  let linhas = ordenarLinhas(dados.linhas, colunas, bloco);
  if (bloco.id === 'checkup-pendentes') {
    linhas = linhas.filter((l) => !/^sim$/i.test(String(l.Realizou || '').trim()));
  }
  const todasLinhas = linhas;
  const total = linhas.length;
  const inicio = Number(bloco.inicio || bloco.offset || 0);
  if (inicio > 0 || bloco.limite != null) {
    const fim = bloco.limite != null ? inicio + Number(bloco.limite) : undefined;
    linhas = linhas.slice(inicio, fim);
  }
  if (!linhas.length) return { html: UI.vazio(bloco.mensagemVazio), vazio: true, dados: { tipo: 'tabela', vazio: true } };

  const isLinhaTotal = (l) => {
    const rotulo = String(l.__eixo || l.Linha || resolverValorColuna(l, colunas[0], linhas, bloco) || '').trim();
    return /^(total|subtotal|total geral|total hospitalar|total ambulatorial)/i.test(rotulo);
  };
  const linhasParaExibir = (bloco.totalizar && linhas.some((l) => !isLinhaTotal(l)))
    ? linhas.filter((l) => !isLinhaTotal(l))
    : linhas;

  const reDestaque = bloco.destacarRegex ? new RegExp(bloco.destacarRegex, 'i') : null;
  const celulas = linhasParaExibir.map((l, idx) => {
    const isLinhaVar = String(l.__eixo ?? '').toLowerCase().includes('varia');
    const isUti = String(l.__eixo ?? '').toLowerCase().includes('uti');
    const cels = colunas.map((c, j) => {
      const bruto = resolverValorColuna(l, c, linhas, bloco);
      let fmt = (isLinhaVar && (String(bruto).includes('%') || bruto === '—')) ? 'texto' : c.formato;
      if (bloco.id === 'indicadores-benchmark') {
        if (isUti) {
          if (/varia[çc][ãa]o|dif/i.test(c.rotulo)) {
            fmt = 'pontos';
          } else if (/empresa|carteira|benchmark|frequencia|frequência/i.test(c.rotulo)) {
            fmt = 'percentual';
          }
        }
      }
      if (fmt === 'texto' && bruto && typeof bruto === 'string' && (normTexto(c.rotulo).includes('prestador') || normTexto(c.rotulo).includes('beneficiario') || normTexto(c.rotulo).includes('usuario'))) {
        bruto = formatarNomeProprio(bruto);
      }
      const n = num(bruto);
      const estado = c.alerta && n !== null ? estadoPorAlerta(n * (c.escala || 1), c.alerta) : 'neutro';
      return { texto: formatar(bruto, fmt, c.escala), classe: estado === 'negativo' ? 'valor-critico' : estado === 'positivo' ? 'valor-positivo' : '' };
    });
    if ((reDestaque && reDestaque.test(String(l.__eixo ?? ''))) || l.__destaque) cels.__destaque = true;
    if (l.__classeLinha) cels.__classeLinha = l.__classeLinha;
    if (l.__isSecao) cels.__isSecao = true;
    return cels;
  });

  let rodape = null;
  if (bloco.totalizar) {
    const ehPt2 = /-pt2$/.test(bloco.id || '') || bloco.totalizarCompleto;
    const baseLinhas = ehPt2 ? todasLinhas.slice(0, inicio + linhas.length) : linhas;
    const linhasParaSomar = baseLinhas.some((l) => !isLinhaTotal(l)) ? baseLinhas.filter((l) => !isLinhaTotal(l)) : baseLinhas;
    const linhaTotalExistente = linhas.find(isLinhaTotal);

    // Totais acumulados para cálculos ponderados de colunas percentuais (ex: sinistralidade, impacto de coparticipação)
    const totalRec = (linhaTotalExistente && num(valorDe(linhaTotalExistente, ['RECEITA', 'Receita'])) != null)
      ? num(valorDe(linhaTotalExistente, ['RECEITA', 'Receita']))
      : linhasParaSomar.reduce((acc, l) => acc + (num(valorDe(l, ['RECEITA', 'Receita'])) || 0), 0);

    const totalDesp = (linhaTotalExistente && num(valorDe(linhaTotalExistente, ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)'])) != null)
      ? num(valorDe(linhaTotalExistente, ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)']))
      : linhasParaSomar.reduce((acc, l) => acc + (num(valorDe(l, ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)'])) || 0), 0);

    const totalCopay = (linhaTotalExistente && num(valorDe(linhaTotalExistente, ['COPARTICIPACAO', 'COPARTICIPAÇÃO', 'Coparticipação', 'Coparticipacao', 'Copay'])) != null)
      ? num(valorDe(linhaTotalExistente, ['COPARTICIPACAO', 'COPARTICIPAÇÃO', 'Coparticipação', 'Coparticipacao', 'Copay']))
      : linhasParaSomar.reduce((acc, l) => acc + (num(valorDe(l, ['COPARTICIPACAO', 'COPARTICIPAÇÃO', 'Coparticipação', 'Coparticipacao', 'Copay'])) || 0), 0);

    rodape = colunas.map((c, i) => {
      if (i === 0) return { texto: bloco.rotuloTotal || 'Total' };
      if (c.naoSomar) return { texto: '' };

      if (['moeda', 'moedaCurta', 'moedaInteira', 'inteiro', 'decimal', 'decimal1', 'mil', 'milhares'].includes(c.formato)) {
        if (linhaTotalExistente) {
          const valExistente = num(resolverValorColuna(linhaTotalExistente, c, linhas, bloco));
          if (valExistente !== null) return { texto: formatar(valExistente * (c.escala || 1), c.formato) };
        }
        const soma = linhasParaSomar.reduce((acc, l) => acc + (num(resolverValorColuna(l, c, baseLinhas, bloco)) || 0) * (c.escala || 1), 0);
        return { texto: formatar(soma, c.formato) };
      }

      if (c.formato?.startsWith('percentual')) {
        const rotuloNorm = String(c.rotulo || '').toLowerCase();
        const ehSinistralidadeTotal = c.calculo === 'sinistralidadeTotal' ||
          ((rotuloNorm.includes('sinistr') || rotuloNorm.includes('total') || rotuloNorm.includes('brut')) &&
            (rotuloNorm.includes('total de sinistr') || rotuloNorm.includes('sinistralidade total') || rotuloNorm.includes('sinistralidade bruta') || rotuloNorm.includes('brut')));
        const ehImpactoCopay = c.calculo === 'impactoCoparticipacao' ||
          (rotuloNorm.includes('impacto') && (rotuloNorm.includes('copar') || rotuloNorm.includes('copay')));

        if (ehSinistralidadeTotal) {
          if (totalRec && totalDesp !== null) {
            const val = ((totalDesp + (totalCopay || 0)) / totalRec) * 100;
            const estadoTot = c.alerta ? estadoPorAlerta(val * (c.escala || 1), c.alerta) : 'neutro';
            const clsTot = estadoTot === 'negativo' ? 'valor-critico' : estadoTot === 'positivo' ? 'valor-positivo' : '';
            return { texto: formatar(val, c.formato), classe: clsTot };
          }
        } else if (ehImpactoCopay) {
          if (totalCopay !== null && totalDesp !== null && (totalDesp + totalCopay) > 0) {
            const val = (totalCopay / (totalDesp + totalCopay)) * 100;
            return { texto: formatar(val, c.formato) };
          }
          if (totalCopay === 0) return { texto: formatar(0, c.formato) };
        } else if (rotuloNorm.includes('sinistr')) {
          if (linhaTotalExistente) {
            const sinExistente = num(resolverValorColuna(linhaTotalExistente, c, linhas, bloco));
            if (sinExistente !== null) {
              const estadoTot = c.alerta ? estadoPorAlerta(sinExistente * (c.escala || 1), c.alerta) : 'neutro';
              const clsTot = estadoTot === 'negativo' ? 'valor-critico' : estadoTot === 'positivo' ? 'valor-positivo' : '';
              return { texto: formatar(sinExistente, c.formato), classe: clsTot };
            }
          }
          if (totalRec && totalDesp !== null) {
            const val = (totalDesp / totalRec) * 100;
            const estadoTot = c.alerta ? estadoPorAlerta(val * (c.escala || 1), c.alerta) : 'neutro';
            const clsTot = estadoTot === 'negativo' ? 'valor-critico' : estadoTot === 'positivo' ? 'valor-positivo' : '';
            return { texto: formatar(val, c.formato), classe: clsTot };
          }
        } else if (rotuloNorm.includes('acumulad')) {
          return { texto: '—' };
        } else if (rotuloNorm.includes('% do total') || rotuloNorm.includes('total') || rotuloNorm.includes('participa')) {
          const soma = linhasParaSomar.reduce((acc, l) => {
            const v = resolverValorColuna(l, c, baseLinhas, bloco);
            const n = num(v);
            if (n === null) return acc;
            const val = (c.escala === 100 && (String(v).includes('%') || Math.abs(n) > 1.0)) ? n : n * (c.escala || 1);
            return acc + val;
          }, 0);
          return { texto: formatar(soma, c.formato) };
        }
        return { texto: '' };
      }

      return { texto: '' };
    });
  }

  const ehTabelaMuitasColunas = colunas.length >= 8 || ['vidas-mensal', 'titular-dependente', 'despesa-produto-mensal', 'evento-mensal'].includes(bloco.id);

  let notaFinal = bloco.nota || null;
  if (!notaFinal && (inicio > 0 || (bloco.limite && total > bloco.limite))) {
    notaFinal = inicio > 0
      ? `Exibindo registros ${inicio + 1} a ${inicio + linhas.length} de ${total}`
      : `Exibindo ${linhas.length} de ${total} registros`;
  }

  if (bloco.id === 'checkup-pendentes') {
    const idsR22 = idsDaFonte({ assinatura: 'checkupPendentes' });
    const itensR22 = idsR22.length ? idsR22.flatMap(itensDoRelatorio) : itensDoRelatorio(22);
    const planosNaoPremium = [
      ...new Set(
        itensR22
          .filter((d) => igual(d.Coluna, 'Plano'))
          .map((d) => String(d.Valor || '').trim())
          .filter((p) => p && typeof identificarProdutoDoPlano === 'function' && identificarProdutoDoPlano(p) !== 'PREMIUM')
      )
    ];
    if (planosNaoPremium.length > 0) {
      const msgLib = `Liberalidade contratual identificada (vouchers emitidos no${planosNaoPremium.length > 1 ? 's planos ' : ' plano '}${planosNaoPremium.join(', ')}).`;
      notaFinal = notaFinal ? `${notaFinal} ${msgLib}` : msgLib;
    }
  }

  const ehColunasIguais = !!bloco.colunasIguais || /^top-frequencia-[abc](-pt2)?$/.test(bloco.id || '');
  const legendaDinamica = resolverLegendaBloco(bloco);

  let superHeadersBloco = bloco.superHeaders ? JSON.parse(JSON.stringify(bloco.superHeaders)) : null;
  if (bloco.id === 'evento-benchmark' && Array.isArray(superHeadersBloco)) {
      try {
        const { rotAnt, rotAtu } = typeof obterPeriodosFormatadosAnalise === 'function' ? obterPeriodosFormatadosAnalise() : {};
      const shAnt = superHeadersBloco.find((sh) => /período anterior|periodo anterior/i.test(sh.titulo));
      if (shAnt && rotAnt) {
        shAnt.titulo = `PERÍODO ANTERIOR (${rotAnt})`;
      }
      const shAtu = superHeadersBloco.find((sh) => /período atual|periodo atual/i.test(sh.titulo));
      if (shAtu && rotAtu) {
        shAtu.titulo = `PERÍODO ATUAL (${rotAtu})`;
        }
      } catch (_) {}
  } else if (bloco.id === 'mix-le-rc' && Array.isArray(superHeadersBloco)) {
    try {
      const { rotAtu } = typeof obterPeriodosFormatadosAnalise === 'function' ? obterPeriodosFormatadosAnalise() : {};
      if (rotAtu) {
        const shAtu = superHeadersBloco.find((sh) => /período atual|periodo atual/i.test(sh.titulo));
        if (shAtu) shAtu.titulo = `PERÍODO ATUAL (${rotAtu})`;
      }
    } catch (_) {}
    // Ajuste dinâmico de colspans caso alguma coluna tenha sido ocultada
    const totalColunasEsperadas = superHeadersBloco.reduce((acc, sh) => acc + (sh.colspan || 1), 0);
    if (totalColunasEsperadas !== colunas.length) {
      const diff = totalColunasEsperadas - colunas.length;
      const shVar = superHeadersBloco.find((sh) => /acesso|benchmark|compar|varia/i.test(sh.titulo));
      if (shVar && (shVar.colspan - diff) > 0) {
        shVar.colspan -= diff;
      }
    }
  } else if (bloco.id === 'rede-livre-escolha-mensal' && Array.isArray(superHeadersBloco)) {
    const shLe = superHeadersBloco.find((sh) => /livre escolha|reembolso/i.test(sh.titulo));
    if (shLe) {
      const qtdColsLe = colunas.filter((c) => {
        const rotNorm = normTexto(c.rotulo);
        return rotNorm.includes('livre escolha') || rotNorm.startsWith('le');
      }).length;
      shLe.colspan = Math.max(1, qtdColsLe);
    }
  }

  return {
    vazio: false,
    totalOriginal: total,
    linhasOriginais: linhas,
    legenda: legendaDinamica,
    html: UI.tabelaExecutiva({
      colunas: colunas.map((c) => ({ rotulo: c.rotulo, numerica: FORMATOS_NUMERICOS.has(c.formato), largura: c.largura })),
      linhas: celulas, rodape,
      compacta: bloco.compacta || ehTabelaMuitasColunas || linhas.length >= 10,
      muitasColunas: ehTabelaMuitasColunas,
      colunasIguais: ehColunasIguais,
      nota: notaFinal,
      overflowVisible: false,
      superHeaders: superHeadersBloco,
    }),
    dados: { tipo: 'tabela', colunas: colunas.map((c) => c.rotulo), linhas: celulas.map((r) => r.map((c) => c.texto)), totalRegistros: total },
  };
}

/* ============================================================
   4. Renderizadores de bloco
   Cada um devolve { titulo, eyebrow, html, className, vazio, dados }
   ============================================================ */

function slideBase(bloco, html, { vazio = false, dados = null, className = 'slide-data' } = {}) {
  return { titulo: bloco.titulo, eyebrow: bloco.eyebrow, html, className: bloco.className || className, vazio, dados };
}

function barraHighlight(slide) {
  const hook = window.Apresentacao?.hooks?.barraHighlight;
  if (hook) return hook(slide) || '';
  const h = HL_SALVOS[slide.id];
  if (!h || !h.texto || h.exibir === false) return '';
  return `<div class="highlight-bar" data-slide="${esc(slide.id)}">
    <div class="highlight-conteudo">
      <span class="highlight-icon">✦</span>
      <span class="highlight-texto">${esc(h.texto)}</span>
    </div>
    ${!LEITURA ? `<button type="button" class="btn-editar-highlight" data-slide="${esc(slide.id)}" title="Editar frase gerada"><span>Editar</span></button>` : ''}
  </div>`;
}

/* ---------- bloco "texto": área livre para o time comercial ----------
   Em modo edição vira um contenteditable salvo automaticamente (PUT junto aos
   highlights). Em leitura mostra o texto salvo; se vazio, o slide é ocultado. */
function textoParaHtml(txt) {
  if (!txt || !String(txt).trim()) return '';
  return String(txt).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function renderTexto(bloco, ctx) {
  const texto = TEXTOS[bloco.id] || '';
  const editavel = !LEITURA && bloco.editavel !== false;
  const placeholder = bloco.placeholder || 'Clique para escrever. O texto é salvo automaticamente.';
  const corpo = editavel
    ? `<div class="texto-livre editavel" contenteditable="true" spellcheck="true" data-slide="${esc(bloco.id)}" data-placeholder="${esc(placeholder)}">${textoParaHtml(texto)}</div>`
    : `<div class="texto-livre">${textoParaHtml(texto)}</div>`;
  const html = `${UI.cabecalho(bloco, ctx)}${UI.card(corpo, 'card-texto')}${UI.rodape(bloco.nota, bloco.legenda)}`;
  return slideBase(bloco, html, { vazio: !editavel && !texto.trim(), dados: texto.trim() ? { tipo: 'texto', texto } : null });
}

function htmlCoverBg() {
  return `<div class="cover-bg">
      <div class="cover-wedge"></div>
      <svg class="cover-line" viewBox="0 0 206 620" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="620" x2="206" y2="0" stroke="#8C8C8C" stroke-width="1" vector-effect="non-scaling-stroke"></line>
      </svg>
    </div>`;
}

function renderCapa(bloco, ctx) {
  const pills = (bloco.pills || [])
    .map((p) => `<div class="pill pill-${esc(p.cor || 'teal')}">${esc(interpolar(p.template || p.texto || '', ctx))}</div>`).join('');
  const marcaBase = CONFIG.meta?.marca || 'OMINT';
  const marcaBadge = DADOS?._modoFallback
    ? `${marcaBase.replace(/·\s*DADOS REAIS/i, '').trim()} · MODO DEMONSTRAÇÃO`
    : (marcaBase.includes('DADOS REAIS') ? marcaBase : `${marcaBase}`);
  const html = `${htmlCoverBg()}
    <div class="cover-content">
      <img class="cover-logo" src="${esc(CONFIG.meta?.logo || '/img/omint-saude-e-seguros-negativo.svg')}" alt="Omint Saúde e Seguros" onerror="this.style.display='none'" />
      <div class="logo-badge"><span class="logo-dot"></span> ${esc(marcaBadge)}</div>
      <h1>${esc(interpolar(bloco.tituloTemplate || '{relatorio.EmpresaMae}', ctx))}${bloco.destaque ? `<br><span class="highlight">${esc(bloco.destaque)}</span>` : ''}</h1>
      ${bloco.subtitulo ? `<p class="subtitle">${esc(interpolar(bloco.subtitulo, ctx))}</p>` : ''}
      <div class="pill-row">${pills}</div>
    </div>`;
  return { ...slideBase(bloco, html, { className: 'slide-cover' }), titulo: bloco.titulo || 'Capa' };
}

function renderSecao(bloco, ctx) {
  const eye = bloco.eyebrow?.trim();
  const html = `${htmlCoverBg()}
    <div class="cover-content">
      ${eye ? `<div class="eyebrow">${esc(eye)}</div>` : ''}
      <h1>${esc(interpolar(bloco.titulo || '', ctx))}</h1>
      ${bloco.subtitulo ? `<p class="subtitle">${esc(interpolar(bloco.subtitulo, ctx))}</p>` : ''}
    </div>`;
  return slideBase(bloco, html, { className: 'slide-cover slide-section' });
}

function detectarOdontoContexto(ctx) {
  const relatorio = ctx.relatorio || {};
  const empresas = Array.isArray(ctx.empresas) ? ctx.empresas : [];

  let mesMed = pathGet(ctx, 'relatorio.ReajusteMed') || pathGet(ctx, 'relatorio.Mes_Reajuste') || '—';
  let mesOdo = pathGet(ctx, 'relatorio.ReajusteOdo') || '—';
  if (mesMed === 'null' || mesMed === 'undefined' || !String(mesMed).trim()) mesMed = '—';
  if (mesOdo === 'null' || mesOdo === 'undefined' || !String(mesOdo).trim()) mesOdo = '—';

  // 1. Checa se grupo tem odonto ativo nas empresas cadastradas
  const temEmpresaComOdonto = empresas.some((e) => e.FlagOdonto === true || (num(e.QTD_Odonto) || 0) > 0);

  // 2. Checa se o relatório consolidado traz grupo Odonto com valores
  const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
  const itensR1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
  const temOdontoEmR1 = itensR1.some((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && !igual(d.Coluna, 'TotalGeral') && (num(d.Valor) || 0) > 0);

  const mesOdoValido = mesOdo !== '—' && mesOdo !== '-' && mesOdo.toLowerCase() !== 'não informado';

  // O grupo tem odonto se houver flag, vidas odonto ou relatório com odonto
  const temOdonto = temEmpresaComOdonto || temOdontoEmR1 || (mesOdoValido && mesOdo !== mesMed);

  // Separação de reajuste: só ocorre se tiver odonto E se o mês de odonto for válido e distinto de med
  const mesesDistintos = mesOdoValido && mesMed !== '—' && mesOdo.toLowerCase() !== mesMed.toLowerCase();
  const separaMedOdo = temOdonto && mesesDistintos;

  const mesGeral = mesMed !== '—' ? mesMed : (mesOdo !== '—' ? mesOdo : (pathGet(ctx, 'relatorio.Mes_Reajuste') || '—'));

  return {
    temOdonto,
    separaMedOdo,
    mesMed,
    mesOdo,
    mesGeral
  };
}

function extrairMetricasFicha(ctx, bloco) {
  const metaLimite = bloco.meta || bloco.limiteTecnico || 75;
  const valLimite = formatar(metaLimite, 'percentualInteiro');

  // Relatório consolidado
  const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
  const itensR1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);

  // Medicina
  const itemSinMed = itensR1.find((d) => (igual(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'SINISTRALIDADE') || igual(d.Linha, 'Sinistralidade')));
  const itemRecMed = itensR1.find((d) => (igual(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'RECEITA') || igual(d.Linha, 'Receita')));
  const itemDespMed = itensR1.find((d) => (igual(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'DESPESA') || igual(d.Linha, 'Despesa')));

  // Odonto
  const itemSinOdo = itensR1.find((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'SINISTRALIDADE') || igual(d.Linha, 'Sinistralidade')));
  const itemRecOdo = itensR1.find((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'RECEITA') || igual(d.Linha, 'Receita')));
  const itemDespOdo = itensR1.find((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && (igual(d.Coluna, 'TOTAL') || igual(d.Coluna, 'Total')) && (igual(d.Linha, 'DESPESA') || igual(d.Linha, 'Despesa')));

  const recMed = num(itemRecMed?.Valor) || 0;
  const despMed = num(itemDespMed?.Valor) || 0;
  const recOdo = num(itemRecOdo?.Valor) || 0;
  const despOdo = num(itemDespOdo?.Valor) || 0;

  const sinMedNum = num(itemSinMed?.Valor) ?? (recMed > 0 ? (despMed / recMed) * 100 : null);
  const sinOdoNum = num(itemSinOdo?.Valor) ?? (recOdo > 0 ? (despOdo / recOdo) * 100 : null);

  const valSinMed = sinMedNum !== null ? formatar(sinMedNum, 'percentualInteiro') : '—';
  const valSinOdo = sinOdoNum !== null ? formatar(sinOdoNum, 'percentualInteiro') : '—';

  // Consolidada
  const recTot = recMed + recOdo;
  const despTot = despMed + despOdo;
  const sinConsNum = recTot > 0 ? (despTot / recTot) * 100 : (sinMedNum ?? null);
  const valSinConsolidada = sinConsNum !== null ? formatar(sinConsNum, 'percentualInteiro') : (valSinMed !== '—' ? valSinMed : '—');

  // Inativos na empresa
  const empresas = Array.isArray(ctx.empresas) ? ctx.empresas : [];
  const inativos = empresas.filter((e) => /inativ/i.test(e.Razao || '') || /inativ/i.test(e.EmpresaMae || ''));
  const temInativos = inativos.length > 0;

  return {
    valLimite,
    valSinMed,
    valSinOdo,
    valSinConsolidada,
    temInativos,
    sinAtivos: valSinMed,
    sinInativos: temInativos ? 'Sob apuração' : null
  };
}

function chaveStorageCorretora() {
  const cd = (typeof parametros === 'function' ? parametros().cdEmpresa : '') || DADOS?._meta?.cdEmpresa || DADOS?.relatorio?.Cod_Empresa || 'default';
  return `omt_corretora_${cd}`;
}

function aplicarOverrideCorretoraSalva(ctxAlvo) {
  try {
    const chave = chaveStorageCorretora();
    const salvo = localStorage.getItem(chave);
    if (salvo && salvo.trim()) {
      if (DADOS?.relatorio) DADOS.relatorio.Agente = salvo.trim();
      if (ctxAlvo?.relatorio) ctxAlvo.relatorio.Agente = salvo.trim();
    }
  } catch (_) {}
}

function renderFicha(bloco, ctx) {
  aplicarOverrideCorretoraSalva(ctx);
  const odontoCtx = detectarOdontoContexto(ctx);
  const metricas = extrairMetricasFicha(ctx, bloco);

  const itens = (bloco.campos || []).map((c) => {
    const rotuloLower = (c.rotulo || '').toLowerCase();
    const ehMesReajuste = c.tipo === 'reajuste' || rotuloLower.includes('mês de reajuste') || rotuloLower.includes('mes de reajuste');
    const ehHistoricoReajuste = c.tipo === 'historico-reajuste' || rotuloLower.includes('histórico de reajuste') || rotuloLower.includes('historico de reajuste');
    const ehLimiteTecnico = c.tipo === 'limite-tecnico' || rotuloLower.includes('limite técnico') || rotuloLower.includes('limite tecnico');
    const ehSinMed = c.tipo === 'sinistralidade-medicina' || rotuloLower.includes('sinistralidade medicina');
    const ehSinOdo = c.tipo === 'sinistralidade-odonto' || rotuloLower.includes('sinistralidade odonto');
    const ehSinCons = c.tipo === 'sinistralidade-consolidada' || rotuloLower.includes('sinistralidade consolidada');

    let valor;
    if (ehMesReajuste) {
      if (!odontoCtx.separaMedOdo) {
        const subGeral = odontoCtx.mesGeral !== '—' ? 'Aniversário da apólice' : 'Não informado';
        valor = odontoCtx.mesGeral !== '—'
          ? `${odontoCtx.mesGeral} (${subGeral}${odontoCtx.temOdonto ? ' · Medicina & Odonto' : ' · Medicina'})`
          : 'Não informado';
      } else {
        valor = c.template
          ? interpolar(c.template, ctx, c.fallback)
          : `Médico: ${odontoCtx.mesMed} · Odonto: ${odontoCtx.mesOdo}`;
      }
    } else if (ehHistoricoReajuste) {
      if (!odontoCtx.separaMedOdo) {
        valor = `2024: 9,8% | 2025: 11,5% | 2026: 10,2% (${odontoCtx.temOdonto ? ' ' : 'Contrato Medicina'})`;
      } else {
        valor = c.template
          ? interpolar(c.template, ctx, c.fallback)
          : 'Médico: 2024: 9,8% | 2025: 11,5% | 2026: 10,2% · Odonto: 2024: 6,0% | 2025: 7,2% | 2026: 8,0%';
      }
    } else if (ehLimiteTecnico) {
      valor = c.valor != null ? (num(c.valor) !== null ? formatar(c.valor, 'percentualInteiro') : c.valor) : metricas.valLimite;
    } else if (ehSinMed) {
      valor = c.valor != null ? (num(c.valor) !== null ? formatar(c.valor, 'percentualInteiro') : c.valor) : (metricas.temInativos ? `Ativos: ${metricas.sinAtivos} · Inativos: ${metricas.sinInativos}` : metricas.valSinMed);
    } else if (ehSinOdo) {
      valor = c.valor != null ? (num(c.valor) !== null ? formatar(c.valor, 'percentualInteiro') : c.valor) : (!odontoCtx.temOdonto ? 'Não contratado' : metricas.valSinOdo);
    } else if (ehSinCons) {
      valor = c.valor != null ? (num(c.valor) !== null ? formatar(c.valor, 'percentualInteiro') : c.valor) : metricas.valSinConsolidada;
    } else {
      valor = c.template
        ? interpolar(c.template, ctx, c.fallback)
        : (pathGet(ctx, c.de) == null || pathGet(ctx, c.de) === '') && c.fallback !== undefined
          ? c.fallback
          : formatar(pathGet(ctx, c.de), c.formato, c.escala);
    }
    if (valor == null || valor === '') valor = '—';
    return {
      ...c,
      valor,
    };
  });

  const cards = itens.map((c) => {
    const rotuloLower = (c.rotulo || '').toLowerCase();
    const ehMesReajuste = c.tipo === 'reajuste' || rotuloLower.includes('mês de reajuste') || rotuloLower.includes('mes de reajuste');
    const ehHistoricoReajuste = c.tipo === 'historico-reajuste' || rotuloLower.includes('histórico de reajuste') || rotuloLower.includes('historico de reajuste');
    const ehLimiteTecnico = c.tipo === 'limite-tecnico' || rotuloLower.includes('limite técnico') || rotuloLower.includes('limite tecnico');
    const ehSinMed = c.tipo === 'sinistralidade-medicina' || rotuloLower.includes('sinistralidade medicina');
    const ehSinOdo = c.tipo === 'sinistralidade-odonto' || rotuloLower.includes('sinistralidade odonto');
    const ehSinCons = c.tipo === 'sinistralidade-consolidada' || rotuloLower.includes('sinistralidade consolidada');
    const ehRC = (c.tipo && c.tipo.startsWith('rc-')) || rotuloLower.includes('(rc analisar)') || rotuloLower.includes('rc analisar');
    const ehPeriodo = rotuloLower.includes('período') || rotuloLower.includes('periodo');

    if (ehMesReajuste) {
      if (!odontoCtx.separaMedOdo) {
        // Resposta padrão unificada do sistema quando o grupo não tem odonto ou não separa med de odonto
        const subGeral = odontoCtx.mesGeral !== '—' ? 'Aniversário da apólice' : 'Não informado';
        const pillTexto = odontoCtx.temOdonto ? 'Medicina &amp; Odonto' : 'Contrato · Medicina';
        const pillClass = odontoCtx.temOdonto ? 'pill-unificado' : 'pill-medico';
        const obsTexto = odontoCtx.temOdonto ? '' : 'Plano sem cobertura odontológica';
        const subTexto = (obsTexto && obsTexto.trim()) ? `${subGeral} · ${obsTexto}` : subGeral;

        return `
    <div class="card card-ficha" data-card="destaque" title="${esc(c.valor)}">
      <div class="card-ficha-destaque-topo">
        <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
        <span class="card-ficha-sub-tag">Base Contratual</span>
      </div>
      <div class="card-ficha-reajuste-grid reajuste-grid-unificado">
        <div class="reajuste-segmento-col reajuste-col-full">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill ${pillClass}">${pillTexto}</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-mes-box reajuste-mes-box-unificado">
              <span class="reajuste-mes-nome">${esc(odontoCtx.mesGeral)}</span>
              <span class="reajuste-mes-sub">${esc(subTexto)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
      }

      // Grupo tem Odonto e separa de Medicina
      const subMed = odontoCtx.mesMed !== '—' ? 'Aniversário da apólice' : 'Não informado';
      const subOdo = odontoCtx.mesOdo !== '—' ? 'Aniversário da apólice' : 'Não informado';

      return `
    <div class="card card-ficha" data-card="destaque" title="${esc(c.valor)}">
      <div class="card-ficha-destaque-topo">
        <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
        <span class="card-ficha-sub-tag">Base Contratual</span>
      </div>
      <div class="card-ficha-reajuste-grid">
        <div class="reajuste-segmento-col">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill pill-medico">Médico</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-mes-box">
              <span class="reajuste-mes-nome">${esc(odontoCtx.mesMed)}</span>
              <span class="reajuste-mes-sub">${esc(subMed)}</span>
            </div>
          </div>
        </div>
        <div class="reajuste-divisor-vertical"></div>
        <div class="reajuste-segmento-col">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill pill-odonto">Odonto</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-mes-box">
              <span class="reajuste-mes-nome">${esc(odontoCtx.mesOdo)}</span>
              <span class="reajuste-mes-sub">${esc(subOdo)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    }

    if (ehHistoricoReajuste) {
      const dtFimStr = pathGet(ctx, 'relatorio.DtFinal') || pathGet(ctx, '_meta.dataFinal');
      let anoRefBase = 2026;
      if (dtFimStr) {
        const parsedAno = new Date(dtFimStr).getFullYear();
        if (!isNaN(parsedAno) && parsedAno >= 2000) anoRefBase = parsedAno;
      }
      try {
        const r14 = itensDoRelatorio(14);
        if (r14 && r14.length) {
          const pers = identificarPeriodosAno1Ano2(r14);
          if (pers.length >= 2) {
            const mUlt = pers[1].meses?.[pers[1].meses.length - 1];
            const a2 = mUlt ? extrairAnoPeriodo(mUlt) : null;
            if (a2) anoRefBase = a2;
          }
        }
      } catch (_) {}

      const anosDinamicos = [String(anoRefBase - 2), String(anoRefBase - 1), String(anoRefBase)];

      const tagsMed = c.medicoHistorico || [
        { rotulo: anosDinamicos[0], periodo: 'Ano anterior ao Ano 1', valor: '9,8%' },
        { rotulo: anosDinamicos[1], periodo: 'Ano 1', valor: '11,5%' },
        { rotulo: anosDinamicos[2], periodo: 'Ano 2', valor: '10,2%' },
      ];
      const tagsOdo = c.odontoHistorico || [
        { rotulo: anosDinamicos[0], periodo: 'Ano anterior ao Ano 1', valor: '6,0%' },
        { rotulo: anosDinamicos[1], periodo: 'Ano 1', valor: '7,2%' },
        { rotulo: anosDinamicos[2], periodo: 'Ano 2', valor: '8,0%' },
      ];

      const defaultRotulos = [anosDinamicos[0], anosDinamicos[1], anosDinamicos[2]];
      const defaultPeriodos = ['Ano anterior ao Ano 1', 'Ano 1', 'Ano 2 (atual)'];

      const renderPeriodoCards = (tags) => tags.map((t, idx) => {
        const anoExibir = anosDinamicos[idx] || t.ano || String(anoRefBase - (2 - idx));
        let rotulo = t.rotulo;
        if (!rotulo || rotulo.includes('Ano Ant') || rotulo.includes('Ano I') || rotulo.includes('Ano II') || /^\s*ano\s*(ant|\d+|[ivx]+)/i.test(rotulo)) {
          rotulo = anoExibir;
        }
        const descPeriodo = t.periodo || defaultPeriodos[idx] || `Ano ${anoExibir}`;
        const isUltimo = idx === tags.length - 1;

        return `
          <div class="historico-periodo-card ${isUltimo ? 'periodo-atual' : ''}" title="${esc(descPeriodo)} · ${esc(anoExibir)}: ${esc(t.valor)}">
            <span class="historico-periodo-rotulo">${esc(rotulo)}</span>
            <strong class="historico-periodo-taxa">${esc(t.valor)}</strong>
          </div>`;
      }).join('');

      const htmlMed = renderPeriodoCards(tagsMed);

      if (!odontoCtx.separaMedOdo) {
        const pillTexto = odontoCtx.temOdonto ? 'Medicina &amp; Odonto' : 'Medicina';
        const pillClass = odontoCtx.temOdonto ? 'pill-unificado' : 'pill-medico';

        return `
    <div class="card card-ficha" data-card="destaque" title="${esc(c.valor)}">
      <div class="card-ficha-destaque-topo">
        <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
        <span class="card-ficha-sub-tag">Período</span>
      </div>
      <div class="card-ficha-reajuste-grid reajuste-grid-unificado">
        <div class="reajuste-segmento-col reajuste-col-full">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill ${pillClass}">${pillTexto}</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-historico-grid reajuste-historico-unificado">${htmlMed}</div>
          </div>
        </div>
      </div>
    </div>`;
      }

      const htmlOdo = renderPeriodoCards(tagsOdo);

      return `
    <div class="card card-ficha" data-card="destaque" title="${esc(c.valor)}">
      <div class="card-ficha-destaque-topo">
        <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
        <span class="card-ficha-sub-tag">Período</span>
      </div>
      <div class="card-ficha-reajuste-grid">
        <div class="reajuste-segmento-col">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill pill-medico">Médico</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-historico-grid">${htmlMed}</div>
          </div>
        </div>
        <div class="reajuste-divisor-vertical"></div>
        <div class="reajuste-segmento-col">
          <div class="reajuste-segmento-label">
            <span class="reajuste-pill pill-odonto">Odonto</span>
          </div>
          <div class="reajuste-segmento-corpo">
            <div class="reajuste-historico-grid">${htmlOdo}</div>
          </div>
        </div>
      </div>
    </div>`;
    }

    if (ehLimiteTecnico) {
      return `
    <div class="card card-ficha" data-card="padrao" data-campo="limite-tecnico" title="${esc(c.rotulo)}: ${esc(c.valor)}">
      <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
      <p class="card-ficha-valor">${esc(c.valor)}</p>
      <span class="card-ficha-sub-info">Ponto de equilíbrio</span>
    </div>`;
    }

    if (ehSinMed) {
      const subInfo = metricas.temInativos ? 'Ativos e Inativos' : 'Medicina Geral';
      return `
    <div class="card card-ficha" data-card="padrao" data-campo="sinistralidade-medicina" title="${esc(c.rotulo)}: ${esc(c.valor)}">
      <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
      <p class="card-ficha-valor">${esc(c.valor)}</p>
      <span class="card-ficha-sub-info">${esc(subInfo)}</span>
    </div>`;
    }

    if (ehSinOdo) {
      const subInfo = !odontoCtx.temOdonto ? 'Sem cobertura' : 'Odontologia';
      return `
    <div class="card card-ficha" data-card="padrao" data-campo="sinistralidade-odonto" title="${esc(c.rotulo)}: ${esc(c.valor)}">
      <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
      <p class="card-ficha-valor">${esc(c.valor)}</p>
      <span class="card-ficha-sub-info">${esc(subInfo)}</span>
    </div>`;
    }

    if (ehSinCons) {
      return `
    <div class="card card-ficha" data-card="padrao" data-campo="sinistralidade-consolidada" title="${esc(c.rotulo)}: ${esc(c.valor)}">
      <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
      <p class="card-ficha-valor">${esc(c.valor)}</p>
      <span class="card-ficha-sub-info">Resultado global</span>
    </div>`;
    }

    if (ehRC) {
      const subDesc = c.sub || 'Sob análise da equipe de Relacionamento Comercial (RC)';
      return `
    <div class="card card-ficha card-ficha-rc" data-card="rc" data-campo="${esc(c.id || c.tipo || 'rc')}" title="${esc(c.rotulo)}">
      <div class="card-ficha-destaque-topo">
        <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
        <span class="card-rc-badge">RC Analisar</span>
      </div>
      <div class="card-rc-sub-desc">${esc(subDesc)}</div>
      <div class="card-rc-conteudo-box">${esc(c.valor && c.valor !== '—' ? c.valor : 'Informação sob análise contratual da equipe de RC')}</div>
    </div>`;
    }

    const ehCadastral = rotuloLower.includes('empresa') || rotuloLower.includes('corretora') || rotuloLower.includes('início') || rotuloLower.includes('inicio') || ehPeriodo;
    const campoNome = ehPeriodo ? 'periodo' : rotuloLower.includes('empresa') ? 'empresa' : rotuloLower.includes('corretora') ? 'corretora' : 'inicio';

    const ehCorretora = campoNome === 'corretora';
    const podeEditarCorretora = ehCorretora && !LEITURA && !document.body.classList.contains('imprimindo');

    return `
    <div class="card card-ficha" data-card="padrao" data-campo="${campoNome}" title="${esc(c.valor)}">
      ${c.icone ? `<div class="card-icon">${esc(c.icone)}</div>` : ''}
      <h3 class="card-ficha-rotulo">${esc(c.rotulo)}</h3>
      <p class="card-ficha-valor ${ehCadastral ? 'card-ficha-valor-cadastral' : ''}" ${ehPeriodo ? 'data-tipo="periodo"' : ''} ${podeEditarCorretora ? 'contenteditable="true" spellcheck="false" data-campo-editavel="corretora"' : ''}>${esc(c.valor)}</p>
    </div>`;
  }).join('');

  const html = `${UI.cabecalho(bloco, ctx)}
    <div class="card-grid card-grid-ficha" data-qtd="${itens.length}">${cards}</div>
    ${UI.rodape(bloco.nota, bloco.legenda)}`;

  return slideBase(bloco, html, {
    dados: {
      tipo: 'ficha',
      itens: itens.map(({ rotulo, valor }) => ({ rotulo, valor })),
      resumoReajuste: {
        temOdonto: odontoCtx.temOdonto,
        separaMedOdo: odontoCtx.separaMedOdo,
        mesReajuste: odontoCtx.mesGeral,
        mesMed: odontoCtx.mesMed,
        mesOdo: odontoCtx.mesOdo,
      },
      indicadores: {
        limiteTecnico: metricas.valLimite,
        sinistralidadeMedicina: metricas.valSinMed,
        sinistralidadeOdonto: metricas.valSinOdo,
        sinistralidadeConsolidada: metricas.valSinConsolidada,
        temInativos: metricas.temInativos
      },
      rcAnalisar: {
        historico5Anos: 'Proposto vs Flexibilizado (Sob análise RC)',
        beneficiosAdicionais: 'Check up, Farmácia, Vacinas, Viagem, Vida (Sob análise RC)',
        modeloCoparticipacao: 'Modelo de coparticipação (Sob análise RC)',
        isencaoCoparticipacao: 'Modelo de isenção de coparticipação (Sob análise RC)'
      }
    }
  });
}

/*
// ============================================================================
// EXPORTAÇÃO PARA EXCEL / CSV (Vouchers de Check-up)
// [Desativado temporariamente - fora do escopo desta entrega]
// ============================================================================
function exportarVouchersCheckupCSV() {
  const ids = idsDaFonte({ assinatura: 'checkupPendentes' });
  let itens = ids.flatMap(itensDoRelatorio);
  if (!itens.length) itens = itensDoRelatorio(22);

  const piv = pivotar(itens, 'Linha', 'Coluna');
  const linhas = piv.linhas;
  if (!linhas.length) {
    if (typeof alert === 'function') alert('Nenhum dado de voucher encontrado para exportação.');
    return;
  }

  const colunasExport = [
    { cabecalho: 'Voucher', campo: '__eixo' },
    { cabecalho: 'Sexo', campo: 'Sexo' },
    { cabecalho: 'Idade', campo: 'Idade' },
    { cabecalho: 'Plano', campo: 'Plano' },
    { cabecalho: 'Data Emissao', campo: 'DtEmissao' },
    { cabecalho: 'Data Vencimento', campo: 'DtVencimento' },
    { cabecalho: 'Realizou', campo: 'Realizou' },
  ];

  const csvLinhas = [colunasExport.map((c) => c.cabecalho).join(';')];
  linhas.forEach((l) => {
    const valores = colunasExport.map((c) => {
      let val = l[c.campo];
      if (val === undefined || val === null) val = '';
      return String(val).replace(/;/g, ' ').replace(/[\r\n]+/g, ' ').trim();
    });
    csvLinhas.push(valores.join(';'));
  });

  const csvContent = '\uFEFF' + csvLinhas.join('\r\n');
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const empresa = (typeof DADOS !== 'undefined' && DADOS?.relatorio?.cdEmpresa) ? DADOS.relatorio.cdEmpresa : 'empresa';
    a.download = `vouchers_checkup_${empresa}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
if (typeof window !== 'undefined') {
  window.exportarVouchersCheckupCSV = exportarVouchersCheckupCSV;
}

function gerarBotaoExportarVouchers() {
  return `<div class="acoes-tabela-slide"><button type="button" class="btn-exportar-csv" onclick="exportarVouchersCheckupCSV()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Exportar Lista (Excel / CSV)</span></button></div>`;
}
*/

/**
 * Tabela Mensal de Check-up com Emitido, Realizado e Custo em LINHA e Mês em COLUNA (Slide Benefício de check-up):
 * - Baseada na estrutura do Slide 22 (Despesa mensal por produto)
 * - Linhas: Emitidos, Realizados, Custo
 * - Colunas: Indicador, Meses cronológicos, Acumulado
 */
function gerarTabelaCheckupMensalEmLinha() {
  const idsR16 = idsDaFonte({ assinatura: 'checkup' });
  let itensR16 = idsR16.flatMap(itensDoRelatorio);
  if (!itensR16.length) itensR16 = itensDoRelatorio(16);
  if (!itensR16.length) return null;

  const itensOrd1 = itensR16.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const baseItens = itensOrd1.length ? itensOrd1 : itensR16;

  const mesesSet = new Set();
  baseItens.forEach((d) => {
    if (d.Coluna && chavePeriodo(d.Coluna) !== null) {
      mesesSet.add(d.Coluna);
    }
  });
  const meses = [...mesesSet].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
  if (!meses.length) return null;

  const colAcum = baseItens.find((d) => /^(acumulado|total)$/i.test(String(d.Coluna || '').trim()))?.Coluna || 'Acumulado';

  const getVal = (filtroLinha, col) => {
    const it = baseItens.find((d) => filtroLinha(normTexto(d.Linha)) && (igual(d.Coluna, col) || (chavePeriodo(col) !== null && chavePeriodo(d.Coluna) === chavePeriodo(col))));
    return it ? num(it.Valor) : null;
  };

  const colunas = [
    { rotulo: 'Indicador', numerica: false },
    ...meses.map((m) => ({ rotulo: m, numerica: true, formato: 'inteiro' })),
    { rotulo: 'Acumulado', numerica: true, formato: 'inteiro' },
  ];

  const rowEmitidos = [
    { texto: 'Emitidos' },
    ...meses.map((m) => {
      const v = getVal((l) => l.includes('emitid'), m);
      return { texto: formatar(v ?? 0, 'inteiro') };
    }),
    {
      texto: formatar(
        getVal((l) => l.includes('emitid'), colAcum) ??
        meses.reduce((acc, m) => acc + (getVal((l) => l.includes('emitid'), m) || 0), 0),
        'inteiro'
      )
    }
  ];

  const rowRealizados = [
    { texto: 'Realizados' },
    ...meses.map((m) => {
      const v = getVal((l) => l.includes('utiliz') || l.includes('realiz'), m);
      return { texto: formatar(v ?? 0, 'inteiro') };
    }),
    {
      texto: formatar(
        getVal((l) => l.includes('utiliz') || l.includes('realiz'), colAcum) ??
        meses.reduce((acc, m) => acc + (getVal((l) => l.includes('utiliz') || l.includes('realiz'), m) || 0), 0),
        'inteiro'
      )
    }
  ];

  const rowCusto = [
    { texto: 'Custo' },
    ...meses.map((m) => {
      const v = getVal((l) => (l.includes('custo') || l.includes('despesa')) && !l.includes('medio') && !l.includes('médio'), m);
      return { texto: formatar(v ?? 0, 'moedaInteira') };
    }),
    {
      texto: formatar(
        getVal((l) => (l.includes('custo') || l.includes('despesa')) && !l.includes('medio') && !l.includes('médio'), colAcum) ??
        meses.reduce((acc, m) => acc + (getVal((l) => (l.includes('custo') || l.includes('despesa')) && !l.includes('medio') && !l.includes('médio'), m) || 0), 0),
        'moedaInteira'
      )
    }
  ];

  const linhas = [rowEmitidos, rowRealizados, rowCusto];
  const html = UI.tabelaExecutiva({
    colunas,
    linhas,
    compacta: true,
    overflowVisible: true,
  });

  return {
    html,
    dados: {
      tipo: 'checkupMensalLinha',
      colunas: colunas.map((c) => c.rotulo),
      linhas: linhas.map((r) => r.map((c) => c.texto)),
      totalRegistros: linhas.length,
    }
  };
}

function gerarTabelaCheckupPorPlano() {
  const idsR22 = idsDaFonte({ assinatura: 'checkupPendentes' });
  let itensR22 = idsR22.flatMap(itensDoRelatorio);
  if (!itensR22.length) itensR22 = itensDoRelatorio(22);
  if (!itensR22.length) return null;

  const idsR16 = idsDaFonte({ assinatura: 'checkup' });
  let itensR16 = idsR16.flatMap(itensDoRelatorio);
  if (!itensR16.length) itensR16 = itensDoRelatorio(16);

  const rowCustoMedio = itensR16.find(
    (d) => normTexto(d.Linha).includes('custo medio') && (igual(d.Coluna, 'Acumulado') || igual(d.Coluna, 'Total'))
  );
  const rowCustoTot = itensR16.find(
    (d) => normTexto(d.Linha).includes('custo do checkup') && (igual(d.Coluna, 'Acumulado') || igual(d.Coluna, 'Total'))
  );
  const rowUtilizados = itensR16.find(
    (d) => normTexto(d.Linha).includes('utilizados') && (igual(d.Coluna, 'Acumulado') || igual(d.Coluna, 'Total'))
  );
  const cTot = num(rowCustoTot?.Valor);
  const ut = num(rowUtilizados?.Valor);

  let custoMedio = num(rowCustoMedio?.Valor);
  if (custoMedio === null) {
    if (cTot && ut && ut > 0) custoMedio = cTot / ut;
    else custoMedio = null;
  }

  // Variação Histórica (se houver dados de período anterior em R16)
  const rowCustoAnt = itensR16.find(
    (d) => normTexto(d.Linha).includes('custo do checkup') && (/anterior/i.test(d.Coluna) || /anterior/i.test(d.Linha))
  );
  const cTotAnt = num(rowCustoAnt?.Valor);
  let varHistorica = null;
  if (cTotAnt !== null && cTotAnt > 0 && cTot !== null && cTot > 0) {
    const pctVar = ((cTot - cTotAnt) / cTotAnt) * 100;
    varHistorica = {
      custoAnterior: cTotAnt,
      custoAtual: cTot,
      varPct: pctVar,
      rotulo: `Variação do custo vs período anterior: ${pctVar > 0 ? '+' : ''}${formatar(pctVar, 'percentual')}`,
    };
  }

  const mapVouchers = new Map();
  itensR22.forEach((d) => {
    if (!mapVouchers.has(d.Linha)) mapVouchers.set(d.Linha, {});
    mapVouchers.get(d.Linha)[d.Coluna] = d.Valor;
  });

  const grupos = {
    'Skill': { emitidos: 0, realizados: 0 },
    'Corporate': { emitidos: 0, realizados: 0 },
    'Premium': { emitidos: 0, realizados: 0 },
  };

  function classificarPlano(p) {
    if (!p) return 'Corporate';
    const prod = identificarProdutoDoPlano(p);
    if (prod === 'SKILL') return 'Skill';
    if (prod === 'PREMIUM') return 'Premium';
    if (prod === 'CORPORATE') return 'Corporate';
    if (prod === 'KIPP') return 'Kipp';
    return p.trim().toUpperCase();
  }

  for (const [id, v] of mapVouchers.entries()) {
    const planoNome = classificarPlano(v.Plano);
    if (!grupos[planoNome]) grupos[planoNome] = { emitidos: 0, realizados: 0 };
    grupos[planoNome].emitidos++;
    const fez = normTexto(v.Realizou);
    if (fez === 'sim' || fez === 's' || fez === 'true' || fez === '1') {
      grupos[planoNome].realizados++;
    }
  }

  // 1. Filtrar grupos para exibir apenas planos que possuem vouchers emitidos (evitando linhas zeradas desnecessárias)
  const planosComVouchers = Object.keys(grupos).filter((p) => grupos[p].emitidos > 0);
  const planosParaExibir = planosComVouchers.length > 0 ? planosComVouchers : ['Premium', 'Corporate', 'Skill'];

  // 2. Detecção automática de liberalidades (vouchers emitidos fora do plano de topo Premium, como Corporate ou Skill)
  const ORDEM_LIB = ['Corporate', 'Skill', 'Kipp'];
  const planosLiberalidade = Object.keys(grupos)
    .filter((p) => !/premium/i.test(p) && grupos[p].emitidos > 0)
    .sort((a, b) => {
      const ia = ORDEM_LIB.indexOf(a);
      const ib = ORDEM_LIB.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  const temLiberalidade = planosLiberalidade.length > 0;

  const colunas = [
    { rotulo: 'Plano', numerica: false },
    { rotulo: 'Vouchers Emitidos', numerica: true },
    { rotulo: 'Realizados', numerica: true },
    { rotulo: 'Taxa de Conversão (%)', numerica: true },
    { rotulo: 'Despesa Estimada (R$)', numerica: true },
  ];

  let totEmitidos = 0;
  let totRealizados = 0;

  const linhas = planosParaExibir.map((plano) => {
    const g = grupos[plano] || { emitidos: 0, realizados: 0 };
    totEmitidos += g.emitidos;
    totRealizados += g.realizados;
    const taxa = g.emitidos > 0 ? (g.realizados / g.emitidos) * 100 : 0;
    const custoEst = custoMedio !== null ? g.realizados * custoMedio : null;
    return [
      { texto: plano },
      { texto: formatar(g.emitidos, 'inteiro') },
      { texto: formatar(g.realizados, 'inteiro') },
      { texto: formatar(taxa, 'percentual') },
      { texto: formatar(custoEst, 'moeda') },
    ];
  });

  const taxaTotal = totEmitidos > 0 ? (totRealizados / totEmitidos) * 100 : 0;
  const custoTotalEst = custoMedio !== null ? totRealizados * custoMedio : null;

  const linhaTotal = [
    { texto: 'Total Geral' },
    { texto: formatar(totEmitidos, 'inteiro') },
    { texto: formatar(totRealizados, 'inteiro') },
    { texto: formatar(taxaTotal, 'percentual') },
    { texto: formatar(custoTotalEst, 'moeda') },
  ];
  linhas.push(linhaTotal);

  const dadosPlanos = planosParaExibir.map((plano) => {
    const g = grupos[plano] || { emitidos: 0, realizados: 0 };
    const taxa = g.emitidos > 0 ? (g.realizados / g.emitidos) * 100 : 0;
    const custoEst = custoMedio !== null ? g.realizados * custoMedio : null;
    return {
      plano,
      vouchersEmitidos: g.emitidos,
      vouchersRealizados: g.realizados,
      taxaConversao: formatar(taxa, 'percentual'),
      custoEstimado: formatar(custoEst, 'moeda'),
    };
  });

  let notaTabela = custoMedio !== null
    ? `Custo médio unitário considerado: ${formatar(custoMedio, 'moeda')} por check-up realizado.`
    : `Custo médio unitário não informado nos relatórios da competência.`;
  if (temLiberalidade) {
    const textoPlanos = planosLiberalidade.length > 1 ? `planos ${planosLiberalidade.join('/')}` : `plano ${planosLiberalidade[0]}`;
    notaTabela += ` Liberalidade contratual identificada nos dados utilizados (vouchers emitidos em ${textoPlanos}).`;
  }
  if (varHistorica) {
    notaTabela += ` ${varHistorica.rotulo}.`;
  }

  const html = UI.tabelaExecutiva({
    colunas,
    linhas,
    compacta: false,
    nota: notaTabela,
  });

  return {
    html: `<div class="tabela-extra">${html}</div>`,
    dados: {
      tipo: 'checkupPorPlano',
      linhas: dadosPlanos,
      totalEmitidos: totEmitidos,
      totalRealizados: totRealizados,
      taxaAdesaoMedia: formatar(taxaTotal, 'percentual'),
      custoTotalEstimado: custoTotalEst !== null ? formatar(custoTotalEst, 'moeda') : '—',
      custoMedioUnitario: custoMedio !== null ? formatar(custoMedio, 'moeda') : '—',
      temLiberalidade,
      planosComLiberalidade: planosLiberalidade,
      varHistorica,
    },
  };
}

function renderKpi(bloco, ctx) {
  const kpis = resolverItensKpi(bloco.itens, ctx);
  const visiveis = kpis.filter((k) => !k.oculto);
  const cards = visiveis.map((k) => UI.cardKpi({ rotulo: k.rotulo, valor: k.formatado, sub: k.sub, estado: k.estado })).join('');
  let extra = '', dadosExtra = null;
  if (bloco.id === 'checkup' || bloco.id === 'checkup-antigo') {
    const tabMensal = gerarTabelaCheckupMensalEmLinha();
    if (tabMensal) {
      extra = `<div class="tabela-extra">${tabMensal.html}</div>`;
      dadosExtra = tabMensal.dados;
    } else if (bloco.tabelaExtra) {
      const t = tabelaDeBloco(bloco.tabelaExtra);
      if (!t.vazio) { extra = `<div class="tabela-extra">${t.html}</div>`; dadosExtra = t.dados; }
    }
  } else if (bloco.id === 'kpi-vidas') {
    // 1. Cards de Vidas Médias (Ano 1 e Ano 2)
    const extraCards = gerarCardsVidasMedias(bloco.fonte);
    if (extraCards) {
      extra += `<div class="bloco-vidas-medias-extra">${extraCards}</div>`;
    }

    // 2. Gráfico comparativo mês a mês Atual x Anterior no modelo do print
    const dadosGraf = extrairDadosVidasPeriodos(bloco.fonte);
    if (dadosGraf && dadosGraf.linhasMesAMes && dadosGraf.linhasMesAMes.length) {
      const { linhasMesAMes, periodosFormatados } = dadosGraf;
      const series = periodosFormatados.length > 1 ? ['Atual', 'Anterior'] : ['Atual'];
      const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
      const fmt = (v) => formatar(v, 'inteiro');
      const refVidas = bloco.referencia || (bloco.meta != null
        ? { valor: num(bloco.meta), rotulo: `${formatar(num(bloco.meta), 'inteiro')} vidas`, cor: '#C93B2B' }
        : (bloco.breakeven != null ? bloco.breakeven : null));

      const cfg = {
        linhas: linhasMesAMes,
        series,
        val,
        fmt,
        hoverVal: (l, s, v) => `${s} · ${l.__eixo}: ${formatar(v, 'inteiro')} vidas`,
        referencia: refVidas,
        rotulos: false,
        rotacionarEixo: true,
        titulo: bloco.subtituloGrafico || 'Total',
        cores: { Atual: '#22368F', Anterior: '#A2B2EF' },
        altura: 215,
        legendaAbaixo: true,
        mesEncurtado: true,
      };
      const svg = UI.graficoLinha(cfg);
      const notaPeriodo = gerarNotaPeriodoVidas(periodosFormatados);
      const notaGraficoHtml = notaPeriodo
        ? `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodo)}</p>`
        : '';
      const cardGrafico = UI.card(`<p class="grafico-titulo" style="text-align: center; font-weight: 700; color: #22368F; font-size: 14px; margin-bottom: 2px;">${esc(cfg.titulo)}</p>${svg}${notaGraficoHtml}`, 'grafico-card');
      extra += `<div class="grade" style="margin-top: 10px;">${cardGrafico}</div>`;
      dadosExtra = {
        tipo: 'vidasComparativo',
        notaPeriodo,
        pontos: linhasMesAMes.map((l) => ({ eixo: l.__eixo, atual: formatar(l.Atual, 'inteiro'), anterior: formatar(l.Anterior, 'inteiro') })),
      };
    }
  } else if (bloco.tabelaExtra) {
    const t = tabelaDeBloco(bloco.tabelaExtra);
    if (!t.vazio) {
      extra = `<div class="tabela-extra">${t.html}</div>`;
      dadosExtra = t.dados;
    }
  }
  const html = `${UI.cabecalho(bloco, ctx)}<div class="kpi-grid">${cards}</div>${extra}${UI.rodape(bloco.nota, bloco.legenda)}`;
  return slideBase(bloco, html, {
    vazio: !visiveis.some((k) => k.valor != null),
    dados: { tipo: 'kpi', itens: visiveis.map((k) => ({ rotulo: k.rotulo, valor: k.formatado, estado: k.estado })), detalhe: dadosExtra },
  });
}

function gerarCardDestaqueHospitalar(linhas) {
  if (!Array.isArray(linhas)) return '';
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const rowTot = linhas.find((l) => norm(l.__eixo).includes('total hospitalar'));
  const rowMat = linhas.find((l) => norm(l.__eixo).includes('maternidade'));

  if (!rowTot && !rowMat) return '';

  const getVar = (row) => row?.['Variação'] || row?.['Variacao'] || row?.['Variao'] || (row?.VarPct != null ? (row.VarPct > 0 ? '+' : '') + brl(row.VarPct, 1) + '%' : null);

  const getPctCart = (row) => {
    const v = row?.['% Despesa'] ?? row?.['Perc_Despesa'] ?? row?.['% carteira'] ?? row?.['PercTotal'];
    if (v == null || v === '' || v === '-') return null;
    return typeof v === 'string' && v.includes('%') ? v : formatar(v, 'percentual');
  };
  const getPctBmk = (row) => {
    const v = row?.['% Despesa Bench'] ?? row?.['Perc_Despesa_Bench'] ?? row?.['% bench'];
    if (v == null || v === '' || v === '-') return null;
    return typeof v === 'string' && v.includes('%') ? v : formatar(v, 'percentual');
  };

  const getCardDados = (rotulo, row) => {
    if (!row) return { rotulo, valor: '—', estado: 'neutro', sub: 'Sem registros' };
    const vVar = getVar(row);
    const ano1 = row?.['Ano 1'] != null && row['Ano 1'] !== '' && row['Ano 1'] !== '-' ? formatar(row['Ano 1'], 'moedaCurta') : null;
    const ano2 = row?.['Ano 2'] != null && row['Ano 2'] !== '' && row['Ano 2'] !== '-' ? formatar(row['Ano 2'], 'moedaCurta') : null;
    const pctCart = getPctCart(row);
    const pctBmk = getPctBmk(row);
    const tot = row?.['Total'] != null && row['Total'] !== '' && row['Total'] !== '-' ? formatar(row['Total'], 'moedaCurta') : null;

    let valor = '—';
    let estado = 'neutro';
    let sub = '';

    if (vVar && vVar !== '-') {
      valor = vVar;
      estado = vVar.startsWith('+') ? 'negativo' : vVar.startsWith('-') ? 'positivo' : 'neutro';
      if (ano1 && ano2) {
        sub = `${ano1} ➔ ${ano2}${pctCart ? ` (${pctCart})` : ''}`;
      } else if (pctCart && pctBmk) {
        sub = `${pctCart} cart. vs ${pctBmk} bench`;
      } else if (pctCart) {
        sub = `${pctCart} da carteira`;
      } else if (tot) {
        sub = `Despesa: ${tot}`;
      }
    } else if (tot) {
      valor = tot;
      estado = 'neutro';
      if (pctCart && pctBmk) {
        sub = `${pctCart} cart. vs ${pctBmk} bench`;
      } else if (pctCart) {
        sub = `${pctCart} da carteira`;
      } else {
        sub = 'Despesa total no período';
      }
    } else if (pctCart) {
      valor = pctCart;
      sub = pctBmk ? `Benchmark: ${pctBmk}` : 'Participação na despesa';
    }

    return { rotulo, valor, estado, sub: sub || '—' };
  };

  const cards = [
    getCardDados('Total Hospitalar', rowTot),
    getCardDados('Maternidade', rowMat),
  ].filter(Boolean);

  return `
    <div class="kpi-internacao-grid kpi-internacao-grid--duplo" style="margin-bottom: 12px;">
      ${cards.map((c) => `
        <div class="kpi-card-mini estado-${c.estado}">
          <div class="kpi-mini-rotulo">${esc(c.rotulo)}</div>
          <div class="kpi-mini-valor">${esc(c.valor)}</div>
          <div class="kpi-mini-sub">
            <span>${esc(c.sub)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function extrairMetricasHospitalares() {
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. Relatório 5 (Indicadores de utilização)
  const idsR5 = idsDaFonte({ assinatura: 'indicadores' });
  const itensR5 = idsR5.length ? idsR5.flatMap(itensDoRelatorio) : itensDoRelatorio(5);

  // 2. Relatório 15 (Evento benchmark)
  const idsR15 = idsDaFonte({ assinatura: 'eventoBenchmark' });
  const itensR15 = idsR15.length ? idsR15.flatMap(itensDoRelatorio) : itensDoRelatorio(15);

  // 3. Relatório 4 (Mix de acesso)
  const idsR4 = idsDaFonte({ assinatura: 'redeLivreEscolha' });
  const itensR4 = idsR4.length ? idsR4.flatMap(itensDoRelatorio) : itensDoRelatorio(4);

  // 4. Relatório 14 (Evolução mensal despesa por evento)
  const idsR14 = idsDaFonte({ assinatura: 'eventoMensal', todos: true });
  const itensR14 = (idsR14.length ? idsR14.flatMap(itensDoRelatorio) : itensDoRelatorio(14)) || [];
  const rowTotGeralAnt14 = itensR14.find((d) => norm(d.Linha).includes('total geral') && (d.Coluna === 'Media Anterior' || d.Coluna === 'Média Anterior' || d.Coluna === '1'));
  const despTotalGeralAnt = num(rowTotGeralAnt14?.Valor);

  // Métricas oficiais R5
  const intRowQtd = itensR5.find((d) => norm(d.Linha).includes('int 1000') && igual(d.Coluna, 'Quantidade'));
  const intRowInd = itensR5.find((d) => norm(d.Linha).includes('int 1000') && igual(d.Coluna, 'Indicador'));
  const intRowBmk = itensR5.find((d) => norm(d.Linha).includes('int 1000') && igual(d.Coluna, 'Benchmark'));
  const intRowDif = itensR5.find((d) => norm(d.Linha).includes('int 1000') && (igual(d.Coluna, 'Dif') || igual(d.Coluna, 'DIF')));

  const diaRowQtd = itensR5.find((d) => norm(d.Linha).includes('diarias 1000') && igual(d.Coluna, 'Quantidade'));
  const diaRowInd = itensR5.find((d) => norm(d.Linha).includes('diarias 1000') && igual(d.Coluna, 'Indicador'));
  const diaRowBmk = itensR5.find((d) => norm(d.Linha).includes('diarias 1000') && igual(d.Coluna, 'Benchmark'));
  const diaRowDif = itensR5.find((d) => norm(d.Linha).includes('diarias 1000') && (igual(d.Coluna, 'Dif') || igual(d.Coluna, 'DIF')));

  const utiRowQtd = itensR5.find((d) => norm(d.Linha).includes('uti') && igual(d.Coluna, 'Quantidade'));
  const utiRowInd = itensR5.find((d) => norm(d.Linha).includes('uti') && igual(d.Coluna, 'Indicador'));
  const utiRowBmk = itensR5.find((d) => norm(d.Linha).includes('uti') && igual(d.Coluna, 'Benchmark'));

  const medPermRowInd = itensR5.find((d) => norm(d.Linha).includes('permanencia') && igual(d.Coluna, 'Indicador'));
  const medPermRowBmk = itensR5.find((d) => norm(d.Linha).includes('permanencia') && igual(d.Coluna, 'Benchmark'));

  const qtdInt = num(intRowQtd?.Valor) ?? 0;
  const qtdDiarias = num(diaRowQtd?.Valor) ?? 0;
  const taxaInt = num(intRowInd?.Valor) ?? 0;
  const taxaIntBmk = num(intRowBmk?.Valor) ?? 0;
  const varTaxaIntPct = num(intRowDif?.Valor) ?? (taxaIntBmk > 0 ? ((taxaInt - taxaIntBmk) / taxaIntBmk) * 100 : 0);

  const taxaDia = num(diaRowInd?.Valor) ?? 0;
  const taxaDiaBmk = num(diaRowBmk?.Valor) ?? 0;
  const varTaxaDiaPct = num(diaRowDif?.Valor) ?? (taxaDiaBmk > 0 ? ((taxaDia - taxaDiaBmk) / taxaDiaBmk) * 100 : 0);

  const taxaUti = num(utiRowInd?.Valor) ?? 0;
  const taxaUtiBmk = num(utiRowBmk?.Valor) ?? 0;
  const qtdDiariasUti = num(utiRowQtd?.Valor) ?? 0;
  const difUtiPp = (taxaUti !== null && taxaUtiBmk !== null) ? (taxaUti - taxaUtiBmk) : 0;

  const tempoMedio = num(medPermRowInd?.Valor) ?? (qtdInt > 0 ? (qtdDiarias / qtdInt) : 0);
  const tempoMedioBmk = num(medPermRowBmk?.Valor) ?? (taxaIntBmk > 0 && taxaDiaBmk > 0 ? (taxaDiaBmk / taxaIntBmk) : 0);

  // Reconhecimento universal de colunas do Relatório 15 (Mock e API Omint real: Perc_Despesa, % Despesa, Perc_Despesa_Bench, etc.)
  const isColCart = (col) => {
    const s = norm(col);
    return (s.includes('% despesa') || s.includes('perc_despesa') || s === 'percdespesa' || s === 'perctotal' || s === 'perc_total' || s === '%') && !s.includes('bench');
  };
  const isColBmk = (col) => {
    const s = norm(col);
    return s.includes('bench');
  };
  const isColPp = (col) => {
    const s = norm(col);
    return s.includes('perc_pp') || s.includes('pp') || s.includes('dif');
  };
  const matchLinha = (linha, sub) => norm(linha).includes(sub);

  const totGeralRow = itensR15.find((d) => norm(d.Linha).includes('total geral') && (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')));
  const despTotalGeral = num(totGeralRow?.Valor);

  const obterDadosSegmento = (matcherSub, nomeExibicao, isTotal = false) => {
    const rowTot = itensR15.find((d) => matchLinha(d.Linha, matcherSub) && (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')));
    const rowCart = itensR15.find((d) => matchLinha(d.Linha, matcherSub) && isColCart(d.Coluna));
    const rowBmk = itensR15.find((d) => matchLinha(d.Linha, matcherSub) && isColBmk(d.Coluna));
    const rowPp = itensR15.find((d) => matchLinha(d.Linha, matcherSub) && isColPp(d.Coluna));

    const despesa = num(rowTot?.Valor) ?? 0;
    let vCart = num(rowCart?.Valor);
    if (vCart === null && despesa > 0 && despTotalGeral && despTotalGeral > 0) {
      vCart = (despesa / despTotalGeral) * 100;
    }
    const vBmk = num(rowBmk?.Valor);
    const vPp = num(rowPp?.Valor);
    const dif = vPp !== null ? vPp : ((vCart !== null && vBmk !== null) ? (vCart - vBmk) : null);

    const isColAnt = (col) => col === 'Media Anterior' || col === 'Média Anterior' || col === '1' || norm(col).includes('anterior');
    const isColAtu = (col) => col === 'Media' || col === 'Média' || col === '2' || norm(col) === 'atual';

    const rowAnt14 = itensR14.find((d) => matchLinha(d.Linha, matcherSub) && isColAnt(d.Coluna));
    const rowAtu14 = itensR14.find((d) => matchLinha(d.Linha, matcherSub) && isColAtu(d.Coluna));
    const vAnt = num(rowAnt14?.Valor);
    const vAtu = num(rowAtu14?.Valor);

    let vCartAnt = null;
    if (vAnt !== null && despTotalGeralAnt && despTotalGeralAnt > 0) {
      vCartAnt = (vAnt / despTotalGeralAnt) * 100;
    }

    let varAnualNum = null;
    let varAnualStr = '—';
    if (vAnt !== null && vAtu !== null && vAnt > 0) {
      varAnualNum = ((vAtu - vAnt) / vAnt) * 100;
      varAnualStr = (varAnualNum > 0 ? '+' : '') + brl(varAnualNum, 1) + '%';
    } else if (vAnt === 0 && vAtu !== null && vAtu > 0) {
      varAnualNum = 100;
      varAnualStr = '+100,0%';
    }

    return {
      evento: nomeExibicao,
      despesa: despesa > 0 ? formatar(despesa, 'milhares') : '-',
      despNum: despesa,
      vAnt,
      vAtu,
      pctAnt: vCartAnt !== null ? formatar(vCartAnt, 'percentual') : '-',
      pctAntNum: vCartAnt,
      varAnual: varAnualStr,
      varAnualNum,
      pctCart: vCart !== null ? formatar(vCart, 'percentual') : '-',
      pctCartNum: vCart,
      pctBmk: vBmk !== null ? formatar(vBmk, 'percentual') : '-',
      pctBmkNum: vBmk,
      dif: dif !== null ? formatar(dif, 'pontos') : '-',
      difNum: dif,
      isTotal
    };
  };

  const segCir = obterDadosSegmento('cirurg', 'Internação Cirúrgica');
  const segCli = obterDadosSegmento('clinic', 'Internação Clínica');
  const segMat = obterDadosSegmento('maternidade', 'Maternidade');
  let segTot = obterDadosSegmento('total hospitalar', 'Total Hospitalar', true);

  if (segTot.despNum === 0 && (segCir.despNum > 0 || segCli.despNum > 0 || segMat.despNum > 0)) {
    const totDesp = segCir.despNum + segCli.despNum + segMat.despNum;
    const totCart = (segCir.pctCartNum ?? 0) + (segCli.pctCartNum ?? 0) + (segMat.pctCartNum ?? 0);
    const totBmk = (segCir.pctBmkNum ?? 0) + (segCli.pctBmkNum ?? 0) + (segMat.pctBmkNum ?? 0);
    const totDif = totCart - totBmk;
    segTot = {
      ...segTot,
      evento: 'Total Hospitalar',
      despesa: formatar(totDesp, 'milhares'),
      despNum: totDesp,
      pctCart: formatar(totCart, 'percentual'),
      pctCartNum: totCart,
      pctBmk: formatar(totBmk, 'percentual'),
      pctBmkNum: totBmk,
      dif: formatar(totDif, 'pontos'),
      difNum: totDif,
      isTotal: true
    };
  }

  // Fallback para pctAnt e varAnual de Total Hospitalar caso não venha direto em R14
  const somaAntHosp = (segCir.vAnt || 0) + (segCli.vAnt || 0) + (segMat.vAnt || 0);
  const somaAtuHosp = (segCir.vAtu || 0) + (segCli.vAtu || 0) + (segMat.vAtu || 0);
  if ((segTot.pctAntNum === null || segTot.pctAnt === '-') && somaAntHosp > 0 && despTotalGeralAnt > 0) {
    segTot.pctAntNum = (somaAntHosp / despTotalGeralAnt) * 100;
    segTot.pctAnt = formatar(segTot.pctAntNum, 'percentual');
  }
  if ((segTot.varAnualNum === null || segTot.varAnual === '—') && somaAntHosp > 0 && somaAtuHosp > 0) {
    segTot.varAnualNum = ((somaAtuHosp - somaAntHosp) / somaAntHosp) * 100;
    segTot.varAnual = (segTot.varAnualNum > 0 ? '+' : '') + brl(segTot.varAnualNum, 1) + '%';
  }

  const colLinhasHosp = [segCir, segCli, segMat, segTot];

  const despTotHosp = segTot.despNum;
  const despCir = segCir.despNum;
  const despCli = segCli.despNum;
  const despMat = segMat.despNum;

  const custoMedioInt = qtdInt > 0 ? (despTotHosp / qtdInt) : (despTotHosp > 0 ? despTotHosp : 0);

  // Benchmark de Custo Médio Unitário (a partir do PMPM Benchmark e da taxa de internações de R5)
  const pmpmBenchRow = itensR15.find((d) => matchLinha(d.Linha, 'total hospitalar') && norm(d.Coluna).includes('pmpm') && norm(d.Coluna).includes('bench'));
  const pmpmBmk = num(pmpmBenchRow?.Valor);
  const custoMedioIntBmk = (pmpmBmk && taxaIntBmk > 0) ? (pmpmBmk / (taxaIntBmk / 1000)) : null;
  const varCustoMedioPct = (custoMedioInt > 0 && custoMedioIntBmk > 0) ? ((custoMedioInt - custoMedioIntBmk) / custoMedioIntBmk) * 100 : null;

  const pctTotHospCartNum = segTot.pctCartNum;
  const pctTotHospBmkNum = segTot.pctBmkNum;
  const difTotHospPp = segTot.difNum;
  const pctTotHospCartStr = segTot.pctCart !== '-' ? segTot.pctCart : '—';
  const pctTotHospBmkStr = segTot.pctBmk !== '-' ? segTot.pctBmk : '—';

  // Mix de Acesso (R4)
  const hospRowR4 = itensR4.find((d) => norm(d.Linha).includes('hospitalar') || norm(d.Linha).includes('internacao'));
  const mixRcPct = num(hospRowR4?.PercRC) ?? null;
  const mixLePct = num(hospRowR4?.PercLE) ?? null;

  const seriesComposicaoPct = [
    {
      categoria: 'INT. CIRÚRGICA',
      despesa: segCir.despNum,
      pctCart: segCir.pctCartNum ?? 0,
      pctAnt: segCir.pctAntNum ?? 0,
      pctBmk: segCir.pctBmkNum ?? 0,
      difPp: segCir.difNum ?? 0
    },
    {
      categoria: 'INT. CLÍNICA',
      despesa: segCli.despNum,
      pctCart: segCli.pctCartNum ?? 0,
      pctAnt: segCli.pctAntNum ?? 0,
      pctBmk: segCli.pctBmkNum ?? 0,
      difPp: segCli.difNum ?? 0
    },
    {
      categoria: 'MATERNIDADE',
      despesa: segMat.despNum,
      pctCart: segMat.pctCartNum ?? 0,
      pctAnt: segMat.pctAntNum ?? 0,
      pctBmk: segMat.pctBmkNum ?? 0,
      difPp: segMat.difNum ?? 0
    }
  ];

  return {
    qtdInt,
    qtdDiarias,
    taxaInt,
    taxaIntBmk,
    varTaxaIntPct,
    taxaDia,
    taxaDiaBmk,
    varTaxaDiaPct,
    taxaUti,
    taxaUtiBmk,
    qtdDiariasUti,
    difUtiPp,
    tempoMedio,
    tempoMedioBmk,
    despTotHosp,
    despCir,
    despCli,
    despMat,
    pctTotHospCartNum,
    pctTotHospBmkNum,
    pctTotHospCartStr,
    pctTotHospBmkStr,
    difTotHospPp,
    custoMedioInt,
    custoMedioIntBmk,
    varCustoMedioPct,
    colLinhasHosp,
    seriesComposicaoPct,
    mixRcPct,
    mixLePct,
    cirPctCartNum: segCir.pctCartNum ?? 0,
    cirPctBmkNum: segCir.pctBmkNum ?? 0,
    cliPctCartNum: segCli.pctCartNum ?? 0,
    cliPctBmkNum: segCli.pctBmkNum ?? 0,
    matPctCartNum: segMat.pctCartNum ?? 0,
    matPctBmkNum: segMat.pctBmkNum ?? 0,
  };
}

function renderKpiInternacao(bloco, ctx) {
  const m = extrairMetricasHospitalares();
  const nomeEmpresa = ctx?.relatorio?.EmpresaMae || DADOS?.relatorio?.EmpresaMae || 'Empresa';

  const miniCardHtml = ({ rotulo, valor, estado, badge, sub }) => `
    <div class="kpi-card-mini estado-${estado}">
      <div class="kpi-mini-rotulo">${esc(rotulo)}</div>
      <div class="kpi-mini-valor">${esc(valor)}</div>
      <div class="kpi-mini-sub">
        ${badge ? UI.badgeStatus(badge.estado, badge.texto) : ''}
        <span>${esc(sub)}</span>
      </div>
    </div>
  `;

  // Cards Financeiros Superiores
  const cardsHtml = `
    <div class="kpi-internacao-grid kpi-internacao-grid--duplo">
      ${miniCardHtml({
        rotulo: 'Despesa total das internações',
        valor: num(m.despTotHosp) !== null && m.despTotHosp >= 0 ? formatar(m.despTotHosp, 'moeda') : '—',
        estado: 'neutro',
        badge: null,
        sub: m.pctTotHospCartStr !== '—' ? `${m.pctTotHospCartStr} da despesa assistencial total` : 'Despesa hospitalar acumulada'
      })}
      ${miniCardHtml({
        rotulo: 'Despesa média / internação',
        valor: num(m.custoMedioInt) !== null && m.custoMedioInt >= 0 ? formatar(m.custoMedioInt, 'moeda') : '—',
        estado: m.varCustoMedioPct !== null ? (m.varCustoMedioPct > 0 ? 'negativo' : 'positivo') : 'neutro',
        badge: m.custoMedioIntBmk && m.varCustoMedioPct !== null ? {
          estado: m.varCustoMedioPct > 0 ? 'negativo' : 'positivo',
          texto: `${m.varCustoMedioPct > 0 ? '+' : ''}${formatar(m.varCustoMedioPct, 'decimal1')}% vs bmk`
        } : null,
        sub: m.custoMedioIntBmk ? `Benchmark Omint: ${formatar(m.custoMedioIntBmk, 'moeda')} · ${formatar(m.qtdInt, 'inteiro')} int.` : (num(m.qtdInt) !== null && m.qtdInt > 0 ? `${formatar(m.qtdInt, 'inteiro')} internações no período` : (m.qtdInt === 0 ? '0 internações no período' : 'Sem registros de internação'))
      })}
    </div>
  `;

  // Tabela de Composição Hospitalar Oficial de R15 cruzada com R14
  const tabelaHospHtml = `
    <div class="card" style="flex: 1;">
      <div class="card-titulo">
        Composição Hospitalar · ${esc(nomeEmpresa)} × Benchmark Omint
      </div>
      <table class="compare-table" style="margin: 0; width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left; white-space: nowrap;">Segmento Hospitalar</th>
            <th class="num" style="white-space: nowrap;">Despesa</th>
            <th class="num" style="white-space: nowrap;">%&nbsp;${esc(nomeEmpresa)}</th>
            <th class="num" style="white-space: nowrap;">%&nbsp;Bench</th>
            <th class="num" style="white-space: nowrap;">Var. Ano 2×1</th>
          </tr>
        </thead>
        <tbody>
          ${m.colLinhasHosp.map((r) => `
            <tr class="${r.isTotal ? 'linha-total-hospitalar' : ''}">
              <td style="text-align: left; ${r.isTotal ? 'font-weight: 700; color: #172972;' : ''}">${esc(r.evento)}</td>
              <td class="num" ${r.isTotal ? 'style="font-weight: 700;"' : ''}>${esc(r.despesa)}</td>
              <td class="num" ${r.isTotal ? 'style="font-weight: 700;"' : ''}>${esc(r.pctCart)}</td>
              <td class="num" ${r.isTotal ? 'style="font-weight: 700;"' : ''}>${esc(r.pctBmk)}</td>
              <td class="num" style="font-weight: 600; ${r.varAnualNum !== null && r.varAnualNum > 0 ? 'color: #D32F2F;' : (r.varAnualNum !== null && r.varAnualNum < 0 ? 'color: #2E7D32;' : '')}">${esc(r.varAnual || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Gráfico de Participação na Despesa Hospitalar (3 Barras: Ano 2 vs Ano 1 vs Benchmark Omint)
  const temAno1 = m.seriesComposicaoPct.some((s) => (s.pctAnt || 0) > 0);
  const maxPct = Math.max(...m.seriesComposicaoPct.flatMap((s) => [s.pctCart, s.pctBmk, temAno1 ? s.pctAnt : 0]), 10);
  const niceYMaxPct = Math.ceil((maxPct * 1.2) / 10) * 10 || 50;

  const W_hosp = 460;
  const H_hosp = 210;
  const ml_hosp = 42;
  const mr_hosp = 16;
  const mt_hosp = 28;
  const mb_hosp = 30;
  const pw_hosp = W_hosp - ml_hosp - mr_hosp;
  const ph_hosp = H_hosp - mt_hosp - mb_hosp;

  let hospGridLines = '';
  [0, niceYMaxPct * 0.25, niceYMaxPct * 0.5, niceYMaxPct * 0.75, niceYMaxPct].forEach((v) => {
    const y = mt_hosp + ph_hosp - (v / niceYMaxPct) * ph_hosp;
    hospGridLines += `
      <line x1="${ml_hosp}" x2="${ml_hosp + pw_hosp}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${ml_hosp - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#94A3B8">${Math.round(v)}%</text>`;
  });

  const slotWHosp = pw_hosp / m.seriesComposicaoPct.length;
  const barW = temAno1 ? 24 : 32;
  const barGap = temAno1 ? 4 : 6;

  let hospBarsSvg = '';
  m.seriesComposicaoPct.forEach((s, i) => {
    const cx = ml_hosp + slotWHosp * i + slotWHosp / 2;
    const h1 = Math.max(3, (s.pctCart / niceYMaxPct) * ph_hosp);
    const hAnt = temAno1 ? Math.max(3, ((s.pctAnt || 0) / niceYMaxPct) * ph_hosp) : 0;
    const h2 = Math.max(3, (s.pctBmk / niceYMaxPct) * ph_hosp);

    let x1, xAnt, x2;
    if (temAno1) {
      x1 = cx - 1.5 * barW - barGap;
      xAnt = cx - 0.5 * barW;
      x2 = cx + 0.5 * barW + barGap;
    } else {
      x1 = cx - barW - barGap / 2;
      x2 = cx + barGap / 2;
    }

    const y1 = mt_hosp + ph_hosp - h1;
    const yAnt = temAno1 ? mt_hosp + ph_hosp - hAnt : 0;
    const y2 = mt_hosp + ph_hosp - h2;

    const difTxt = s.difPp !== 0 ? `${s.difPp > 0 ? '+' : ''}${s.difPp.toFixed(1).replace('.', ',')} p.p.` : '0,0 p.p.';
    const difCor = s.difPp > 0 ? '#C2410C' : '#16A34A';

    const yVal1 = h1 >= 18 ? (y1 + 13) : (y1 - 3);
    const corVal1 = h1 >= 18 ? '#FFFFFF' : '#172972';

    const yValAnt = hAnt >= 18 ? (yAnt + 13) : (yAnt - 3);
    const corValAnt = hAnt >= 18 ? '#FFFFFF' : '#64748B';

    const yVal2 = h2 >= 18 ? (y2 + 13) : (y2 - 3);
    const corVal2 = h2 >= 18 ? '#FFFFFF' : '#2456F0';

    // Garante que o valor da diferença fique no mínimo 10px acima do topo do elemento mais alto (barra ou label externo)
    const topoElemento1 = h1 >= 18 ? y1 : (y1 - 12);
    const topoElementoAnt = temAno1 ? (hAnt >= 18 ? yAnt : (yAnt - 12)) : 9999;
    const topoElemento2 = h2 >= 18 ? y2 : (y2 - 12);
    const topoMaisAlto = Math.min(topoElemento1, topoElementoAnt, topoElemento2);
    const yVar = Math.max(12, topoMaisAlto - 10);

    hospBarsSvg += `
      <g class="g-hosp-cat">
        <text x="${(cx).toFixed(1)}" y="${yVar.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${difCor}">${esc(difTxt)}</text>
        <rect x="${x1.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h1.toFixed(1)}" fill="#172972" rx="3">
          <title>${esc(s.categoria)} · ${esc(nomeEmpresa)}: ${formatar(s.pctCart, 'percentual')}</title>
        </rect>
        <text x="${(x1 + barW / 2).toFixed(1)}" y="${yVal1.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${corVal1}">${formatar(s.pctCart, 'decimal1')}%</text>
        ${temAno1 ? `
        <rect x="${xAnt.toFixed(1)}" y="${yAnt.toFixed(1)}" width="${barW}" height="${hAnt.toFixed(1)}" fill="#94A3B8" rx="3">
          <title>${esc(s.categoria)} · Ano Anterior: ${formatar(s.pctAnt, 'percentual')}</title>
        </rect>
        <text x="${(xAnt + barW / 2).toFixed(1)}" y="${yValAnt.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${corValAnt}">${formatar(s.pctAnt, 'decimal1')}%</text>
        ` : ''}
        <rect x="${x2.toFixed(1)}" y="${y2.toFixed(1)}" width="${barW}" height="${h2.toFixed(1)}" fill="#2456F0" rx="3">
          <title>${esc(s.categoria)} · Benchmark: ${formatar(s.pctBmk, 'percentual')}</title>
        </rect>
        <text x="${(x2 + barW / 2).toFixed(1)}" y="${yVal2.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${corVal2}">${formatar(s.pctBmk, 'decimal1')}%</text>
        <text x="${cx.toFixed(1)}" y="${(H_hosp - mb_hosp + 16).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#334155">${esc(s.categoria)}</text>
      </g>`;
  });

  const graficoHospHtml = `
    <div class="card card-grafico-internacoes" style="flex: 1;">
      <div class="card-titulo" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span>Distribuição da Despesa Hospitalar (%)</span>
        <div style="display: flex; align-items: center; gap: 10px; font-size: 10.5px; font-weight: 500; color: #475569;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 2px; background: #172972;"></span> ${esc(nomeEmpresa)}
          </span>
          ${temAno1 ? `
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 2px; background: #94A3B8;"></span> Ano Anterior
          </span>` : ''}
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 2px; background: #2456F0;"></span> Benchmark Omint
          </span>
        </div>
      </div>
      <div class="grafico-wrap" style="width: 100%; display: flex; justify-content: center;">
        <svg viewBox="0 0 ${W_hosp} ${H_hosp}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; max-height: 210px;">
          ${hospGridLines}
          ${hospBarsSvg}
        </svg>
      </div>
    </div>
  `;

  const comentarioConsultorHtml = UI.caixaComentarios(bloco.id, {
    placeholder: 'Observações da consultora...'
  });

  const metricasRodapeFinanceirasHtml = `
    <div class="internacao-metricas-rodape" style="margin-top: 8px;">
      <div class="internacao-metrica-bloco">
        <span class="internacao-metrica-titulo">Representatividade hospitalar:</span>
        <span class="internacao-metrica-linha"><strong>${m.pctTotHospCartStr}</strong> da despesa assistencial</span>
      </div>
      <div class="internacao-metrica-bloco">
        <span class="internacao-metrica-titulo">Despesa média por internação:</span>
        <span class="internacao-metrica-linha">
          <strong>${m.custoMedioInt > 0 ? formatar(m.custoMedioInt, 'moeda') + ' / int.' : '—'}</strong>
          ${m.custoMedioIntBmk > 0 ? ` (Bmk: ${formatar(m.custoMedioIntBmk, 'moeda')})` : ''}
        </span>
      </div>
    </div>
  `;

  const corpo = `
    <div class="kpi-internacao-secao-inferior">
      ${tabelaHospHtml}
      ${graficoHospHtml}
    </div>
    ${metricasRodapeFinanceirasHtml}
    ${comentarioConsultorHtml}
  `;

  const html = `${UI.cabecalho(bloco, ctx)}${cardsHtml}${corpo}${UI.rodape(bloco.nota, bloco.legenda)}`;

  return slideBase(bloco, html, {
    vazio: false,
    dados: {
      tipo: 'kpiInternacao',
      custoMedio: m.custoMedioInt,
      custoMedioBenchmark: m.custoMedioIntBmk,
      varCustoMedioPct: m.varCustoMedioPct,
      despesaTotalHosp: m.despTotHosp,
      pctDespesaHosp: m.pctTotHospCartNum,
      pctDespesaHospBmk: m.pctTotHospBmkNum,
      difHospPp: m.difTotHospPp,
      seriesHospitalares: m.seriesComposicaoPct,
      composicao: m.colLinhasHosp
    }
  });
}

function renderVolumeInternacao(bloco, ctx) {
  const m = extrairMetricasHospitalares();

  const miniCardHtml = ({ rotulo, valor, estado, badge, sub }) => `
    <div class="kpi-card-mini estado-${estado}">
      <div class="kpi-mini-rotulo">${esc(rotulo)}</div>
      <div class="kpi-mini-valor">${esc(valor)}</div>
      <div class="kpi-mini-sub">
        ${badge ? UI.badgeStatus(badge.estado, badge.texto) : ''}
        <span>${esc(sub)}</span>
      </div>
    </div>
  `;

  // ==========================================
  // SEÇÃO 1: MACRO-INDICADORES DE VOLUME (CARDS DUPLO)
  // ==========================================
  const difTempoMedioDias = (m.tempoMedio > 0 && m.tempoMedioBmk > 0) ? (m.tempoMedio - m.tempoMedioBmk) : null;

  const cardsHtml = `
    <div class="kpi-internacao-grid kpi-internacao-grid--duplo">
      ${miniCardHtml({
        rotulo: 'Total de internações pagas',
        valor: num(m.qtdInt) !== null && m.qtdInt >= 0 ? formatar(m.qtdInt, 'inteiro') : '—',
        estado: 'neutro',
        badge: null,
        sub: num(m.qtdDiarias) !== null && m.qtdDiarias > 0 ? `${formatar(m.qtdDiarias, 'inteiro')} diárias de internação no período` : (m.qtdDiarias === 0 ? '0 diárias de internação no período' : 'Procedimentos hospitalares no período')
      })}
      ${miniCardHtml({
        rotulo: 'Frequência de internação',
        valor: num(m.taxaInt) !== null && m.taxaInt >= 0 ? `${formatar(m.taxaInt, 'decimal1')} / mil` : '—',
        estado: m.varTaxaIntPct > 0 ? 'negativo' : 'positivo',
        badge: m.taxaIntBmk > 0 ? {
          estado: m.varTaxaIntPct > 0 ? 'negativo' : 'positivo',
          texto: `${m.varTaxaIntPct > 0 ? '+' : ''}${formatar(m.varTaxaIntPct, 'decimal1')}% vs bmk`
        } : null,
        sub: m.taxaIntBmk > 0 ? `Benchmark Omint: ${formatar(m.taxaIntBmk, 'decimal1')} / mil vidas` : 'Por mil vidas / mês'
      })}
    </div>
  `;

  // ==========================================
  // SEÇÃO 2: TABELA DE INDICADORES DE UTILIZAÇÃO (LADO ESQUERDO)
  // ==========================================
  const linhasUtilizacao = [
    {
      indicador: 'Internações / 1.000 vidas',
      carteira: num(m.taxaInt) !== null && m.taxaInt >= 0 ? formatar(m.taxaInt, 'decimal1') : '—',
      benchmark: m.taxaIntBmk > 0 ? formatar(m.taxaIntBmk, 'decimal1') : '—',
      dif: m.varTaxaIntPct !== 0 ? `${m.varTaxaIntPct > 0 ? '+' : ''}${formatar(m.varTaxaIntPct, 'decimal1')}%` : '0,0%',
      difPositiva: m.varTaxaIntPct > 0
    },
    {
      indicador: 'Diárias / 1.000 vidas',
      carteira: num(m.taxaDia) !== null && m.taxaDia >= 0 ? formatar(m.taxaDia, 'decimal1') : '—',
      benchmark: m.taxaDiaBmk > 0 ? formatar(m.taxaDiaBmk, 'decimal1') : '—',
      dif: m.varTaxaDiaPct !== 0 ? `${m.varTaxaDiaPct > 0 ? '+' : ''}${formatar(m.varTaxaDiaPct, 'decimal1')}%` : '0,0%',
      difPositiva: m.varTaxaDiaPct > 0
    },
    {
      indicador: 'Tempo médio de permanência',
      carteira: num(m.tempoMedio) !== null && m.tempoMedio >= 0 ? `${m.tempoMedio.toFixed(1).replace('.', ',')} dias` : '—',
      benchmark: m.tempoMedioBmk > 0 ? `${m.tempoMedioBmk.toFixed(1).replace('.', ',')} dias` : '—',
      dif: difTempoMedioDias !== null ? `${difTempoMedioDias > 0 ? '+' : ''}${difTempoMedioDias.toFixed(1).replace('.', ',')} d` : '—',
      difPositiva: difTempoMedioDias > 0
    },
    {
      indicador: 'Índice de UTI (% diárias)',
      carteira: m.taxaUti > 0 ? formatar(m.taxaUti, 'percentual') : (m.taxaUti === 0 ? '0,0%' : '—'),
      benchmark: m.taxaUtiBmk > 0 ? formatar(m.taxaUtiBmk, 'percentual') : '—',
      dif: m.difUtiPp !== 0 ? formatar(m.difUtiPp, 'pontos') : '0,0 p.p.',
      difPositiva: m.difUtiPp > 0
    },
    {
      indicador: 'Total de internações pagas',
      carteira: num(m.qtdInt) !== null && m.qtdInt >= 0 ? formatar(m.qtdInt, 'inteiro') : '—',
      benchmark: '—',
      dif: num(m.qtdDiarias) !== null && m.qtdDiarias > 0 ? `${formatar(m.qtdDiarias, 'inteiro')} diárias` : (m.qtdDiarias === 0 ? '0 diárias' : '—'),
      difPositiva: false,
      isTotal: true
    }
  ];

  const tabelaVolHtml = `
    <div class="card" style="flex: 1;">
      <div class="card-titulo">
        Indicadores de Utilização · Carteira × Benchmark Omint
      </div>
      <table class="compare-table" style="margin: 0; width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left; white-space: nowrap;">Indicador Hospitalar</th>
            <th class="num" style="white-space: nowrap;">Carteira</th>
            <th class="num" style="white-space: nowrap;">Benchmark</th>
            <th class="num" style="white-space: nowrap;">Diferença</th>
          </tr>
        </thead>
        <tbody>
          ${linhasUtilizacao.map((r) => `
            <tr class="${r.isTotal ? 'linha-total-hospitalar' : ''}">
              <td style="text-align: left; ${r.isTotal ? 'font-weight: 700; color: #172972;' : ''}">${esc(r.indicador)}</td>
              <td class="num" ${r.isTotal ? 'style="font-weight: 700;"' : ''}>${esc(r.carteira)}</td>
              <td class="num" ${r.isTotal ? 'style="font-weight: 700;"' : ''}>${esc(r.benchmark)}</td>
              <td class="num" style="font-weight: 600; ${r.isTotal ? 'color: #172972;' : (r.difPositiva ? 'color: #D32F2F;' : 'color: #2E7D32;')}">${esc(r.dif)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // ==========================================
  // SEÇÃO 3: GRÁFICO COMPARATIVO (LADO DIREITO)
  // ==========================================
  let seriesGrafico = [];
  let tituloGrafico = '';
  let legendaGraficoHtml = '';
  let formatarValorBarra = (v) => formatar(v, 'decimal1');

  if (bloco.quantidadesCustom?.ano2) {
    const c2 = bloco.quantidadesCustom.ano2;
    const c1 = bloco.quantidadesCustom.ano1 || {};
    seriesGrafico = [
      {
        categoria: 'INT. CIRÚRGICA',
        val1: Number(c1.cirurgica || 0),
        val2: Number(c2.cirurgica || 0),
        varTxt: Number(c1.cirurgica) > 0 ? `${((c2.cirurgica - c1.cirurgica) / c1.cirurgica * 100).toFixed(1)}%` : '',
        varCor: '#172972'
      },
      {
        categoria: 'INT. CLÍNICA',
        val1: Number(c1.clinica || 0),
        val2: Number(c2.clinica || 0),
        varTxt: Number(c1.clinica) > 0 ? `${((c2.clinica - c1.clinica) / c1.clinica * 100).toFixed(1)}%` : '',
        varCor: '#172972'
      },
      {
        categoria: 'MATERNIDADE',
        val1: Number(c1.maternidade || 0),
        val2: Number(c2.maternidade || 0),
        varTxt: Number(c1.maternidade) > 0 ? `${((c2.maternidade - c1.maternidade) / c1.maternidade * 100).toFixed(1)}%` : '',
        varCor: '#172972'
      }
    ];
    tituloGrafico = 'Quantidade de internações por segmento';
    legendaGraficoHtml = `
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 2px; background: #7B8BA5;"></span> Ano 1
      </span>
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 2px; background: #172972;"></span> Ano 2
      </span>
    `;
    formatarValorBarra = (v) => String(Math.round(v));
  } else {
    seriesGrafico = [
      {
        categoria: 'INT. / 1.000',
        val1: m.taxaInt,
        val2: m.taxaIntBmk,
        varTxt: m.varTaxaIntPct !== 0 ? `${m.varTaxaIntPct > 0 ? '+' : ''}${m.varTaxaIntPct.toFixed(1).replace('.', ',')}%` : '',
        varCor: m.varTaxaIntPct > 0 ? '#C2410C' : '#16A34A'
      },
      {
        categoria: 'DIÁRIAS / 1.000',
        val1: m.taxaDia,
        val2: m.taxaDiaBmk,
        varTxt: m.varTaxaDiaPct !== 0 ? `${m.varTaxaDiaPct > 0 ? '+' : ''}${m.varTaxaDiaPct.toFixed(1).replace('.', ',')}%` : '',
        varCor: m.varTaxaDiaPct > 0 ? '#C2410C' : '#16A34A'
      },
      {
        categoria: 'ÍNDICE UTI (%)',
        val1: m.taxaUti,
        val2: m.taxaUtiBmk,
        varTxt: m.difUtiPp !== 0 ? formatar(m.difUtiPp, 'pontos') : '',
        varCor: m.difUtiPp > 0 ? '#C2410C' : '#16A34A'
      }
    ];
    tituloGrafico = 'Frequência · Carteira × Benchmark Omint';
    legendaGraficoHtml = `
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 2px; background: #172972;"></span> Carteira
      </span>
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 2px; background: #2456F0;"></span> Benchmark Omint
      </span>
    `;
    formatarValorBarra = (v) => formatar(v, 'decimal1');
  }

  const todosValores = seriesGrafico.flatMap((s) => [s.val1, s.val2]);
  const maxValQtd = Math.max(...todosValores, 10);
  const niceYMaxQtd = Math.ceil((maxValQtd * 1.2) / 10) * 10 || 50;

  const W_qtd = 460;
  const H_qtd = 210;
  const ml_qtd = 42;
  const mr_qtd = 16;
  const mt_qtd = 28;
  const mb_qtd = 30;
  const pw_qtd = W_qtd - ml_qtd - mr_qtd;
  const ph_qtd = H_qtd - mt_qtd - mb_qtd;

  let qtdGridLines = '';
  [0, niceYMaxQtd * 0.25, niceYMaxQtd * 0.5, niceYMaxQtd * 0.75, niceYMaxQtd].forEach((v) => {
    const y = mt_qtd + ph_qtd - (v / niceYMaxQtd) * ph_qtd;
    qtdGridLines += `
      <line x1="${ml_qtd}" x2="${ml_qtd + pw_qtd}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${ml_qtd - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#94A3B8">${Math.round(v)}</text>`;
  });

  const slotWQtd = pw_qtd / seriesGrafico.length;
  const barW = 32;
  const barGap = 6;

  let qtdBarsSvg = '';
  seriesGrafico.forEach((s, i) => {
    const cx = ml_qtd + slotWQtd * i + slotWQtd / 2;
    const h1 = Math.max(3, (s.val1 / niceYMaxQtd) * ph_qtd);
    const h2 = Math.max(3, (s.val2 / niceYMaxQtd) * ph_qtd);

    const x1 = cx - barW - barGap / 2;
    const x2 = cx + barGap / 2;

    const y1 = mt_qtd + ph_qtd - h1;
    const y2 = mt_qtd + ph_qtd - h2;

    const corBarra1 = bloco.quantidadesCustom?.ano2 ? '#7B8BA5' : '#172972';
    const corBarra2 = bloco.quantidadesCustom?.ano2 ? '#172972' : '#2456F0';

    const yVal1 = h1 >= 18 ? (y1 + 13) : (y1 - 3);
    const corVal1 = h1 >= 18 ? '#FFFFFF' : '#172972';

    const yVal2 = h2 >= 18 ? (y2 + 13) : (y2 - 3);
    const corVal2 = h2 >= 18 ? '#FFFFFF' : '#2456F0';

    // Garante que o valor da diferença fique no mínimo 10px acima do topo do elemento mais alto (barra ou label externo)
    const topoElemento1 = h1 >= 18 ? y1 : (y1 - 12);
    const topoElemento2 = h2 >= 18 ? y2 : (y2 - 12);
    const topoMaisAlto = Math.min(topoElemento1, topoElemento2);
    const yVar = Math.max(12, topoMaisAlto - 10);

    const labelSerie1 = bloco.quantidadesCustom?.ano2 ? 'Ano 1' : 'Carteira';
    const labelSerie2 = bloco.quantidadesCustom?.ano2 ? 'Ano 2' : 'Benchmark Omint';
    const ehPercentual = s.categoria.includes('%');
    const valorFmt1 = ehPercentual ? `${formatarValorBarra(s.val1)}%` : formatarValorBarra(s.val1);
    const valorFmt2 = ehPercentual ? `${formatarValorBarra(s.val2)}%` : formatarValorBarra(s.val2);

    qtdBarsSvg += `
      <g class="g-hosp-qtd-cat">
        ${s.varTxt ? `<text x="${(cx).toFixed(1)}" y="${yVar.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${s.varCor}">${esc(s.varTxt)}</text>` : ''}
        <rect x="${x1.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h1.toFixed(1)}" fill="${corBarra1}" rx="3">
          <title>${esc(s.categoria)} (${labelSerie1}): ${valorFmt1}</title>
        </rect>
        <text x="${(x1 + barW / 2).toFixed(1)}" y="${yVal1.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${corVal1}">${valorFmt1}</text>
        <rect x="${x2.toFixed(1)}" y="${y2.toFixed(1)}" width="${barW}" height="${h2.toFixed(1)}" fill="${corBarra2}" rx="3">
          <title>${esc(s.categoria)} (${labelSerie2}): ${valorFmt2}</title>
        </rect>
        <text x="${(x2 + barW / 2).toFixed(1)}" y="${yVal2.toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${corVal2}">${valorFmt2}</text>
        <text x="${cx.toFixed(1)}" y="${(H_qtd - mb_qtd + 16).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#334155">${esc(s.categoria)}</text>
      </g>`;
  });

  const graficoQtdHtml = `
    <div class="card card-grafico-internacoes" style="flex: 1;">
      <div class="card-titulo" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span>${esc(tituloGrafico)}</span>
        <div style="display: flex; align-items: center; gap: 10px; font-size: 10.5px; font-weight: 500; color: #475569;">
          ${legendaGraficoHtml}
        </div>
      </div>
      <div class="grafico-wrap" style="width: 100%; display: flex; justify-content: center;">
        <svg viewBox="0 0 ${W_qtd} ${H_qtd}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; max-height: 210px;">
          ${qtdGridLines}
          ${qtdBarsSvg}
        </svg>
      </div>
    </div>
  `;

  // ==========================================
  // SEÇÃO 4: COMENTÁRIOS DO CONSULTOR
  // ==========================================
  const comentarioConsultorHtml = UI.caixaComentarios(bloco.id, {
    placeholder: 'Observações da consultora...'
  });

  // ==========================================
  // SEÇÃO 5: INDICADORES CLÍNICOS E DE ACESSO (RODAPÉ)
  // ==========================================
  const metricasRodapeHtml = `
    <div class="internacao-metricas-rodape" style="margin-top: 8px;">
      <div class="internacao-metrica-bloco">
        <span class="internacao-metrica-titulo">Tempo médio de permanência:</span>
        <span class="internacao-metrica-linha">
          <strong>${m.tempoMedio > 0 ? `${m.tempoMedio.toFixed(1).replace('.', ',')} dias` : '—'}</strong>
          ${m.tempoMedioBmk > 0 ? ` (Bmk: ${m.tempoMedioBmk.toFixed(1).replace('.', ',')} dias)` : ''}
          ${difTempoMedioDias !== null ? ` · ${difTempoMedioDias > 0 ? '+' : ''}${difTempoMedioDias.toFixed(1).replace('.', ',')} d vs bmk` : ''}
        </span>
      </div>
      <div class="internacao-metrica-bloco">
        <span class="internacao-metrica-titulo">Utilização de UTI:</span>
        <span class="internacao-metrica-linha">
          <strong>${m.taxaUti > 0 ? formatar(m.taxaUti, 'percentual') : (m.taxaUti === 0 ? '0,0%' : '—')}</strong>
          ${m.taxaUtiBmk > 0 ? ` (Bmk: ${formatar(m.taxaUtiBmk, 'percentual')})` : ''}
          ${m.qtdDiariasUti > 0 ? ` · ${formatar(m.qtdDiariasUti, 'inteiro')} diárias UTI` : ''}
        </span>
      </div>
      <div class="internacao-metrica-bloco">
        <span class="internacao-metrica-titulo">Mix de acesso hospitalar:</span>
        <span class="internacao-metrica-linha">
          ${(m.mixRcPct !== null || m.mixLePct !== null)
            ? `<strong>${formatar(m.mixRcPct, 'percentual')} Rede Credenciada</strong> · ${formatar(m.mixLePct, 'percentual')} Livre Escolha`
            : `<span>Sem movimentação hospitalar no período</span>`}
        </span>
      </div>
    </div>
  `;

  const corpo = `
    <div class="kpi-internacao-secao-inferior">
      ${tabelaVolHtml}
      ${graficoQtdHtml}
    </div>
    ${metricasRodapeHtml}
    ${comentarioConsultorHtml}
  `;

  const html = `${UI.cabecalho(bloco, ctx)}${cardsHtml}${corpo}${UI.rodape(bloco.nota, bloco.legenda)}`;

  return slideBase(bloco, html, {
    vazio: false,
    dados: {
      tipo: 'volumeInternacao',
      totalInternacoes: m.qtdInt,
      totalDiarias: m.qtdDiarias,
      taxaInt1000: m.taxaInt,
      taxaIntBmk1000: m.taxaIntBmk,
      varTaxaIntPct: m.varTaxaIntPct,
      taxaDia1000: m.taxaDia,
      taxaDiaBmk1000: m.taxaDiaBmk,
      varTaxaDiaPct: m.varTaxaDiaPct,
      tempoMedioPermanencia: m.tempoMedio,
      tempoMedioPermanenciaBmk: m.tempoMedioBmk,
      taxaUti: m.taxaUti,
      taxaUtiBmk: m.taxaUtiBmk,
      diariasUti: m.qtdDiariasUti,
      difUtiPp: m.difUtiPp,
      seriesQuantidades: seriesGrafico,
      mixAcesso: {
        redeCredenciadaPct: m.mixRcPct,
        livreEscolhaPct: m.mixLePct,
      },
    },
  });
}

function renderTabela(bloco, ctx) {
  const t = tabelaDeBloco(bloco);
  let cardExtra = '';
  let blocoEfetivo = bloco;
  if (!t.vazio && t.totalOriginal != null && t.totalOriginal <= Number(bloco.limite || 10) && /·\s*Parte\s*1\b/i.test(bloco.titulo || '')) {
    let novoTitulo = bloco.titulo.replace(/\s*·\s*Parte\s*1\b/i, '');
    if (t.totalOriginal < 20) {
      novoTitulo = novoTitulo.replace(/\b20\s+maiores\b/i, `${t.totalOriginal} maiores`);
    }
    blocoEfetivo = { ...bloco, titulo: novoTitulo };
  }
  let extraVidas = '';
  if (bloco.id === 'titular-dependente' && !t.vazio) {
    const extraCards = gerarCardsVidasMedias(bloco.fonte);
    if (extraCards) {
      extraVidas = `<div class="bloco-vidas-medias-extra">${extraCards}</div>`;
    }
  }

  // Caixa de observação da consultora no rodapé para todas as tabelas
  const rodapeHtml = bloco.id
    ? UI.caixaComentarios(bloco.id, {
        placeholder: 'Observações da consultora...'
      })
    : '';

  return slideBase(blocoEfetivo, `${UI.cabecalho(blocoEfetivo, ctx)}${cardExtra}${t.html}${extraVidas}${rodapeHtml}`, { vazio: t.vazio, dados: t.dados });
}

function renderGrafico(bloco, ctx) {
  if (bloco.id === 'graf-sinistralidade-mensal' || bloco.id === 'graf-sinistralidade-anual' || bloco.agruparPorAno) {
    return renderSinistralidadeMensal(bloco, ctx);
  }
  if (bloco.id === 'graf-vidas-comparativo') {
    return renderVidasComparativo(bloco, ctx);
  }
  if (bloco.id === 'comparativo-ano-anterior' || bloco.id === 'sinistralidade-comparativo') {
    return renderSinistralidadeComparativo(bloco, ctx);
  }
  if (bloco.id === 'graf-livre-escolha') {
    return renderGraficoLivreEscolha(bloco, ctx);
  }
  const g = graficoDeBloco(bloco);
  return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${g.html}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: g.vazio, dados: g.dados || { tipo: 'grafico', vazio: true } });
}

/**
 * Resumo executivo: KPIs + pontos-chave + gráfico opcional.
 * bloco.itens (KPIs) · bloco.destaques [{ template, estado | porKpi }] · bloco.grafico (sub-bloco)
 * Nos destaques, {kpi.<id>} devolve o KPI já formatado.
 */
function renderResumoExecutivo(bloco, ctx) {
  const kpis = resolverItensKpi(bloco.itens, ctx);
  const isOdonto = bloco.id === 'resumo-executivo-odonto' || /odonto/i.test(bloco.eyebrow || '') || /odonto/i.test(bloco.titulo || '');
  const kpiPmpm = kpis.find((k) => k.id === 'pmpm');
  if (kpiPmpm) {
    const valCalculado = custoPorVidaMes(isOdonto ? 'odontologia' : 'medicina');
    if (valCalculado !== null && valCalculado > 0) {
      kpiPmpm.valor = valCalculado;
      kpiPmpm.numero = valCalculado;
      kpiPmpm.formatado = formatar(valCalculado, 'moedaInteira');
    }
    kpiPmpm.sub = 'Despesa assistencial ÷ vidas mês a mês';
  }

  const ctxKpi = { ...ctx, kpi: Object.fromEntries(kpis.map((k) => [k.id, k.formatado])) };
  const cards = kpis.map((k) => UI.cardKpi({ rotulo: k.rotulo, valor: k.formatado, sub: k.sub, estado: k.estado })).join('');

  const destaques = (bloco.destaques || [])
    .map((d) => ({
      texto: interpolar(d.template || d.texto || '', ctxKpi),
      estado: d.estado || (d.porKpi ? kpis.find((k) => k.id === d.porKpi)?.estado : 'neutro'),
    }))
    .filter((d) => d.texto && (bloco.manterDestaquesVazios || !d.texto.includes('—')));

  let grafHtml = '';
  let grafDados = null;
  let grafVazio = true;

  const itemRec = kpis.find((k) => k.id === 'receita');
  const itemDesp = kpis.find((k) => k.id === 'despesa');
  const itemSin = kpis.find((k) => k.id === 'sinistralidade');

  const vRec = num(itemRec?.valor);
  const vDesp = num(itemDesp?.valor);
  const vSin = num(itemSin?.valor);

  if (isOdonto) {
    if (vRec !== null && vDesp !== null && (vRec > 0 || vDesp > 0)) {
      const maxVal = Math.max(vRec, vDesp, 1);
      const margem = vRec - vDesp;
      const sinFormatada = itemSin?.formatado || (vSin !== null ? formatar(vSin, 'percentual') : (vRec > 0 ? formatar((vDesp / vRec) * 100, 'percentual') : '—'));
      const tituloGraf = bloco.grafico?.subtituloGrafico || bloco.grafico?.titulo || 'Receita × Sinistros · Odontologia';

      const W = 900, H = 160;
      const ml = 120, mr = 160;
      const pw = W - ml - mr;

      const wRec = Math.max(4, (vRec / maxVal) * pw);
      const wDesp = Math.max(4, (vDesp / maxVal) * pw);

      const corRec = '#22368F';
      const corDesp = '#A2B2EF';

      const svg = `
        <div style="position: relative; width: 100%; height: ${H}px;">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display: block; overflow: visible;">
            <line x1="${ml}" x2="${ml + pw}" y1="20" y2="20" stroke="var(--borda, #E2E8F0)" stroke-dasharray="3 3" stroke-width="1" />
            <line x1="${ml}" x2="${ml + pw}" y1="140" y2="140" stroke="var(--borda, #E2E8F0)" stroke-dasharray="3 3" stroke-width="1" />

            <g class="g-serie">
              <text x="${ml - 12}" y="59" text-anchor="end" font-size="13" font-weight="600" fill="var(--cinza-800, #1E293B)">Receita</text>
              <rect x="${ml}" y="38" width="${wRec.toFixed(1)}" height="32" rx="6" fill="${corRec}">
                <title>Receita: ${esc(formatar(vRec, 'moeda'))}</title>
              </rect>
              <text x="${(ml + wRec + 10).toFixed(1)}" y="59" font-size="13" font-weight="700" fill="${corRec}">${esc(formatar(vRec, 'moeda'))}</text>
            </g>

            <g class="g-serie">
              <text x="${ml - 12}" y="117" text-anchor="end" font-size="13" font-weight="600" fill="var(--cinza-800, #1E293B)">Sinistros</text>
              <rect x="${ml}" y="96" width="${wDesp.toFixed(1)}" height="32" rx="6" fill="${corDesp}">
                <title>Sinistros: ${esc(formatar(vDesp, 'moeda'))}</title>
              </rect>
              <text x="${(ml + wDesp + 10).toFixed(1)}" y="117" font-size="13" font-weight="700" fill="${corRec}">${esc(formatar(vDesp, 'moeda'))}</text>
            </g>
          </svg>
        </div>`;

      const notaGraficoHtml = `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">Valores acumulados no período contratual (Demonstrativo Consolidado)</p>`;

      grafHtml = UI.card(
        `<p class="grafico-titulo" style="text-align: center; font-weight: 700; color: #22368F; font-size: 14px; margin-bottom: 2px;">${esc(tituloGraf)}</p>${svg}${notaGraficoHtml}`,
        'grafico-card'
      );
      grafDados = {
        tipo: 'receitaSinistrosConsolidado',
        receita: vRec,
        sinistros: vDesp,
        sinistralidade: vSin,
        margem,
      };
      grafVazio = false;
    }
  } else {
    const ehComparativo = bloco.grafico?.tipo === 'sinistralidadeComparativo' ||
                          bloco.grafico?.estilo === 'comparativo' ||
                          bloco.id === 'resumo-executivo';

    // Previous year Medicina sinistralidade: second matching row in financeiroConsolidado
    // (agregacao:"primeiro" returns nums[0] = current year, so nums[1] = previous year)
    let vSinAnterior = null;
    const idsConsAnt = idsDaFonte({ assinatura: 'financeiroConsolidado' });
    const itensConsAnt = idsConsAnt.length ? idsConsAnt.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
    const sinMedVals = itensConsAnt
      .filter((d) =>
        igualGrupo(d.Grupo, 'Medicina') &&
        /sinistralidade/i.test(d.Linha || '') &&
        (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL'))
      )
      .map((d) => num(d.Valor))
      .filter((v) => v !== null);
    vSinAnterior = sinMedVals.length >= 2 ? sinMedVals[1] : null;

    if (ehComparativo && (bloco.grafico || bloco.fonte)) {
      const fonteSin = bloco.grafico?.fonte || bloco.fonte || { assinatura: 'financeiroMensal', todos: true };
      const dadosSin = extrairDadosSinistralidadePeriodos(fonteSin, 'medicina');
      if (dadosSin && dadosSin.linhasMesAMes && dadosSin.linhasMesAMes.length) {
        const { linhasMesAMes, periodosFormatados } = dadosSin;
        const sinAnteriorFinal = vSinAnterior ?? (periodosFormatados.length > 1 ? dadosSin?.totais?.Anterior : null);
        const series = (periodosFormatados.length > 1 || sinAnteriorFinal != null) ? ['Atual', 'Anterior'] : ['Atual'];
        const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
        const fmt = (v) => formatar(v, 'percentual');

        const meta = num(bloco.meta) ?? (bloco.itens?.find((k) => k.id === 'sinistralidade')?.alerta?.acima ?? 75);

        const temDoisAnos = series.length > 1;
        const consolidadoValores = {};
        const sinAtual = vSin !== null && vSin !== undefined ? vSin : dadosSin?.totais?.Atual;
        if (sinAtual != null) consolidadoValores['Atual'] = sinAtual;
        if (sinAnteriorFinal != null) consolidadoValores['Anterior'] = sinAnteriorFinal;
        const temTotalConsolidado = Object.keys(consolidadoValores).length > 0;

        const todosVals = [
          ...linhasMesAMes.flatMap((l) => series.map((s) => l[s])),
          ...(temTotalConsolidado ? Object.values(consolidadoValores) : []),
        ].filter((v) => v !== null && v !== undefined && !isNaN(v));
        const maxVal = Math.max(meta, 100, ...todosVals);
        const yMaxSin = Math.max(120, Math.ceil((maxVal * 1.05) / 20) * 20);

        const defaultTitulo = bloco.id === 'resumo-executivo' ? 'Sinistralidade' : 'Total';

        const serieAtiva = 'Atual';
        const valAtualFormatado = consolidadoValores.Atual != null ? formatar(consolidadoValores.Atual, 'percentual') : null;
        const valAntFormatado = (temDoisAnos && consolidadoValores.Anterior != null) ? formatar(consolidadoValores.Anterior, 'percentual') : null;

        const rotuloAtual = valAtualFormatado ? `Atual (${valAtualFormatado})` : 'Atual';
        const rotuloAnt = valAntFormatado ? `Anterior (${valAntFormatado})` : 'Anterior';

        const legendaItens = [
          ...(temDoisAnos
            ? [
                { rotulo: rotuloAtual, cor: '#22368F', estilo: 'linha' },
                { rotulo: rotuloAnt, cor: '#A2B2EF', estilo: 'linha' },
              ]
            : [{ rotulo: rotuloAtual, cor: '#22368F', estilo: 'linha' }]),
          { rotulo: temDoisAnos ? 'Tendência (Atual)' : 'Tendência', cor: '#64748B', estilo: 'tracejado' },
          { rotulo: `Ponto de equilíbrio (${formatar(meta, 'inteiro')}%)`, cor: '#C93B2B', estilo: 'tracejado' },
        ];

        const cfg = {
          linhas: linhasMesAMes,
          series,
          val,
          fmt,
          hoverVal: (l, s, v) => `${s} · ${l.__eixo}: ${formatar(v, 'percentual')}`,
          referencia: { valor: meta, rotulo: `${formatar(meta, 'inteiro')}%`, cor: '#C93B2B' },
          tendencia: { serie: serieAtiva, cor: '#64748B', espessura: 1.5, rotulo: `Tendência (${serieAtiva})` },
          legendaItens,
          rotulos: false,
          rotacionarEixo: true,
          titulo: bloco.grafico?.subtituloGrafico || bloco.grafico?.titulo || defaultTitulo,
          cores: { Atual: '#22368F', Anterior: '#A2B2EF' },
          altura: 235,
          legendaAbaixo: true,
          mesEncurtado: true,
          yMin: 0,
          yMax: yMaxSin,
          gridDivisoes: yMaxSin / 20,
          ...(temTotalConsolidado
            ? {
                consolidado: {
                  rotulo: 'Total',
                  tipo: 'ponto',
                  valores: consolidadoValores,
                },
              }
            : {}),
        };

        const svg = UI.graficoLinha(cfg);
        const notaPeriodo = gerarNotaPeriodoVidas(periodosFormatados);
        const notaGraficoHtml = notaPeriodo
          ? `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodo)}</p>`
          : '';

        grafHtml = UI.card(
          `<p class="grafico-titulo" style="text-align: center; font-weight: 700; color: #22368F; font-size: 14px; margin-bottom: 2px;">${esc(cfg.titulo)}</p>${svg}${notaGraficoHtml}`,
          'grafico-card'
        );
        grafDados = {
          tipo: 'sinistralidadeComparativo',
          notaPeriodo,
          pontos: [
            ...linhasMesAMes.map((l) => ({ eixo: l.__eixo, atual: formatar(l.Atual, 'percentual'), anterior: formatar(l.Anterior, 'percentual') })),
            ...(temTotalConsolidado
              ? [{ eixo: 'Total', atual: formatar(consolidadoValores.Atual, 'percentual'), anterior: formatar(consolidadoValores.Anterior, 'percentual') }]
              : []),
          ],
        };
        grafVazio = false;
      }
    }

    if (grafVazio && bloco.grafico) {
      const g = graficoDeBloco(bloco.grafico, bloco.grafico.titulo);
      if (g && !g.vazio) {
        grafHtml = g.html;
        grafDados = g.dados;
        grafVazio = false;
      }
    }
  }

  const corpo = (grafHtml && !grafVazio) ? grafHtml : '';

  const html = `${UI.cabecalho(bloco, ctx)}<div class="grade"><div class="kpi-grid">${cards}</div>${corpo}</div>${UI.rodape(bloco.nota, bloco.legenda)}`;
  return slideBase(bloco, html, {
    vazio: isOdonto ? ((vRec || 0) <= 0 && (vDesp || 0) <= 0) : !kpis.some((k) => k.valor != null),
    dados: {
      tipo: 'resumoExecutivo',
      kpis: kpis.map((k) => ({ rotulo: k.rotulo, valor: k.formatado, estado: k.estado })),
      grafico: grafDados,
    },
  });
}

/**
 * Resultado financeiro: receita, despesa, resultado e sinistralidade × meta, com evolução mensal.
 * bloco.fontes { receita, despesa, sinistralidade } · bloco.meta (75)
 * bloco.mensal { fonte, receita, despesa, sinistralidade } (nomes das séries na fonte mensal)
 */
function renderResultadoFinanceiro(bloco, ctx) {
  const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
  const itensR1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
  const itensR1Ord1 = itensR1.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const baseR1 = itensR1Ord1.length ? itensR1Ord1 : itensR1;

  // Medicina
  const itemRecMed = baseR1.find((d) => (igual(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && igual(d.Coluna, 'Total') && igual(d.Linha, 'RECEITA'));
  const itemDespMed = baseR1.find((d) => (igual(d.Grupo, 'Medicina') || igual(d.Grupo, 'M')) && igual(d.Coluna, 'Total') && igual(d.Linha, 'DESPESA'));

  // Odonto (excluindo TotalGeral)
  const itemRecOdo = baseR1.find((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && igual(d.Coluna, 'Total') && !igual(d.Coluna, 'TotalGeral') && igual(d.Linha, 'RECEITA'));
  const itemDespOdo = baseR1.find((d) => (igual(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) && igual(d.Coluna, 'Total') && !igual(d.Coluna, 'TotalGeral') && igual(d.Linha, 'DESPESA'));

  // Total Geral explícito do R1 se houver
  const itemRecTotGeral = baseR1.find((d) => igual(d.Coluna, 'TotalGeral') && igual(d.Linha, 'RECEITA'));
  const itemDespTotGeral = baseR1.find((d) => igual(d.Coluna, 'TotalGeral') && igual(d.Linha, 'DESPESA'));

  const recMed = num(itemRecMed?.Valor);
  const despMed = num(itemDespMed?.Valor);
  const recOdo = num(itemRecOdo?.Valor) || 0;
  const despOdo = num(itemDespOdo?.Valor) || 0;

  let receita = itemRecTotGeral ? num(itemRecTotGeral.Valor) : null;
  let despesa = itemDespTotGeral ? num(itemDespTotGeral.Valor) : null;

  if (receita === null && recMed !== null) {
    receita = recMed + recOdo;
  }
  if (despesa === null && despMed !== null) {
    despesa = despMed + despOdo;
  }

  // Fallback para resolverFonteEscalar se não encontrou em R1
  const f = bloco.fontes || {};
  if (receita === null) receita = resolverFonteEscalar(f.receita);
  if (despesa === null) despesa = resolverFonteEscalar(f.despesa);

  let sin = null;
  const numRec = num(receita);
  const numDesp = num(despesa);

  if (numRec !== null && numRec > 0 && numDesp !== null) {
    sin = (numDesp / numRec) * 100;
  } else if (numRec !== null && numRec <= 0) {
    sin = null;
  } else {
    sin = resolverFonteEscalar(f.sinistralidade);
  }
  const meta = num(bloco.meta) ?? 75;
  const estadoSin = estadoPorAlerta(sin, { acima: meta, atencao: meta - 5 });
  const gap = sin === null ? null : sin - meta;
  const resultado = receita !== null && despesa !== null ? receita - despesa : null;

  const valorSinCard = sin !== null
    ? formatar(sin, 'percentual')
    : (numRec !== null && numRec <= 0 ? 'Sem receita líquida no período' : '—');

  // Coparticipação e Desconto de Coparticipação
  const resumoGeral = typeof resumoFinanceiroGeral === 'function' ? resumoFinanceiroGeral() : null;
  let valCopay = resumoGeral?.copay;
  let pctDescontoCopay = resumoGeral?.impactoCopay;

  if (valCopay == null || isNaN(valCopay)) {
    const itensR10 = idsDaFonte({ assinatura: 'financeiroMensal' }).flatMap(itensDoRelatorio);
    const dCopay = itensR10.find((d) => /copart/i.test(d.Linha || '') && igual(d.Coluna, 'TOTAL'));
    if (dCopay && num(dCopay.Valor) !== null) {
      valCopay = num(dCopay.Valor);
    } else {
      const mesesCopay = itensR10.filter((d) => /copart/i.test(d.Linha || '') && !SEM_DADOS.test(d.Coluna || '') && !/^(total|acumulado)$/i.test(String(d.Coluna || '').trim()));
      if (mesesCopay.length) {
        valCopay = mesesCopay.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
      } else {
        valCopay = 0;
      }
    }
  }

  if (pctDescontoCopay == null || isNaN(pctDescontoCopay)) {
    if (valCopay > 0 && numDesp !== null && (numDesp + valCopay) > 0) {
      pctDescontoCopay = (valCopay / (numDesp + valCopay)) * 100;
    } else {
      pctDescontoCopay = 0;
    }
  }

  // Reajuste Técnico Estimado: (Sinistralidade Acumulada / 75%) - 1
  let reajusteTecnicoNum = null;
  let reajusteTecnicoTxt = '—';
  let badgeReajuste = null;
  let estadoReajuste = 'neutro';

  if (sin !== null && meta > 0) {
    reajusteTecnicoNum = ((sin / meta) - 1) * 100;
    if (reajusteTecnicoNum > 0) {
      estadoReajuste = 'alerta';
      reajusteTecnicoTxt = `${formatar(reajusteTecnicoNum, 'decimal1')}%`;
      badgeReajuste = null;
    } else {
      estadoReajuste = 'positivo';
      reajusteTecnicoTxt = '0,0%';
      badgeReajuste = null;
    }
  }

  const cards = [
    UI.cardKpi({ rotulo: 'Receita', valor: formatar(receita, 'moedaCurta') }),
    UI.cardKpi({ rotulo: 'Despesa líquida', valor: formatar(despesa, 'moedaCurta'), sub: valCopay > 0 ? 'Líquida de copay' : undefined }),
    UI.cardKpi({
      rotulo: 'Sinistralidade', valor: valorSinCard, estado: estadoSin,
      badge: null,
    }),
    UI.cardKpi({
      rotulo: 'Valor da coparticipação (copay)',
      valor: valCopay !== null ? formatar(valCopay, 'moedaCurta') : '—',
      badge: valCopay > 0 ? { estado: 'neutro', texto: 'Copay retida' } : null,
      sub: valCopay > 0 ? 'Abatimento do custo bruto' : 'Sem coparticipação',
    }),
    UI.cardKpi({
      rotulo: 'Desconto da coparticipação',
      valor: pctDescontoCopay !== null ? formatar(pctDescontoCopay, 'percentual') : '—',
      badge: pctDescontoCopay > 0 ? { estado: 'positivo', texto: `-${formatar(pctDescontoCopay, 'decimal1')}%` } : null,
      sub: pctDescontoCopay > 0 ? 'Redução do custo assistencial' : 'Sem desconto no período',
    }),
    UI.cardKpi({
      rotulo: 'Reajuste técnico estimado',
      valor: reajusteTecnicoTxt,
      estado: estadoReajuste,
      badge: null,
      sub: `Ponto de equilíbrio: ${formatar(meta, 'inteiro')}%`,
    }),
  ].join('');

  let graficos = '', dadosMensal = null;
  if (bloco.mensal?.fonte) {
    const m = bloco.mensal;
    const colunas = graficoDeBloco({
      fonte: m.fonte,
      estilo: 'coluna',
      series: [m.receita || 'Receita', m.despesa || 'Despesa'],
      formato: 'moedaCurta',
      rotulos: false,
      altura: 320,
    }, 'Receita × despesa por mês');

    // Sinistralidade consolidada (Medicina + Odonto) do período atual e anterior a partir de financeiroConsolidado (R1),
    // coerente com os big numbers deste slide. Cada ocorrência no R1 corresponde a um período (0 = atual, 1 = anterior).
    const idsConsAnt = idsDaFonte({ assinatura: 'financeiroConsolidado' });
    const itensConsAnt = idsConsAnt.length ? idsConsAnt.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
    const ehMed = (d) => igualGrupo(d.Grupo, 'Medicina') || igualGrupo(d.Grupo, 'M');
    const ehOdo = (d) => igualGrupo(d.Grupo, 'Odontologia') || igualGrupo(d.Grupo, 'O');
    const ehTotal = (d) => igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL');
    const ehTotalGeral = (d) => igual(d.Coluna, 'TotalGeral');
    const valoresR1 = (filtro, reLinha) => itensConsAnt
      .filter((d) => filtro(d) && reLinha.test(d.Linha || ''))
      .map((d) => num(d.Valor))
      .filter((v) => v !== null);
    const sinTotGeralVals = valoresR1(ehTotalGeral, /sinistralidade/i);
    const recTotGeralVals = valoresR1(ehTotalGeral, /^receita$/i);
    const despTotGeralVals = valoresR1(ehTotalGeral, /^despesa$/i);
    const recMedVals = valoresR1((d) => ehMed(d) && ehTotal(d), /^receita$/i);
    const despMedVals = valoresR1((d) => ehMed(d) && ehTotal(d), /^despesa$/i);
    const recOdoVals = valoresR1((d) => ehOdo(d) && ehTotal(d), /^receita$/i);
    const despOdoVals = valoresR1((d) => ehOdo(d) && ehTotal(d), /^despesa$/i);
    const sinMedVals = valoresR1((d) => ehMed(d) && ehTotal(d), /sinistralidade/i);

    const sinConsolidadaR1 = (i) => {
      if (sinTotGeralVals[i] != null) return sinTotGeralVals[i];
      let rec = recTotGeralVals[i] ?? null;
      let desp = despTotGeralVals[i] ?? null;
      if (rec === null && recMedVals[i] != null) rec = recMedVals[i] + (recOdoVals[i] || 0);
      if (desp === null && despMedVals[i] != null) desp = despMedVals[i] + (despOdoVals[i] || 0);
      if (rec !== null && rec > 0 && desp !== null) return (desp / rec) * 100;
      return sinMedVals[i] ?? null;
    };

    // Atual: mesmo valor do big number de Sinistralidade; R1 consolidado como fallback
    const vSinAtual = sin ?? sinConsolidadaR1(0);
    const vSinAnterior = sinConsolidadaR1(1);

    const fonteSin = { assinatura: 'financeiroMensal', todos: true };
    const dadosSinPeriodos = extrairDadosSinistralidadePeriodos(fonteSin, 'consolidado');
    let cardLinhaHtml = '', dadosLinha = null;

    if (dadosSinPeriodos && dadosSinPeriodos.linhasMesAMes?.length) {
      const { linhasMesAMes, periodosFormatados } = dadosSinPeriodos;
      const sinAnteriorFinal = vSinAnterior ?? (periodosFormatados.length > 1 ? dadosSinPeriodos?.totais?.Anterior : null);
      const series = (periodosFormatados.length > 1 || sinAnteriorFinal != null) ? ['Atual', 'Anterior'] : ['Atual'];
      const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
      const fmt = (v) => formatar(v, 'percentual');

      const temDoisAnos = series.length > 1;
      const consolidadoValores = {};
      const sinAtual = vSinAtual ?? (sin !== null && sin !== undefined ? sin : dadosSinPeriodos?.totais?.Atual);
      if (sinAtual != null) consolidadoValores['Atual'] = sinAtual;
      if (sinAnteriorFinal != null) consolidadoValores['Anterior'] = sinAnteriorFinal;
      const temTotalConsolidado = Object.keys(consolidadoValores).length > 0;

      const todosVals = [
        ...linhasMesAMes.flatMap((l) => series.map((s) => l[s])),
        ...(temTotalConsolidado ? Object.values(consolidadoValores) : []),
      ].filter((v) => v !== null && v !== undefined && !isNaN(v));
      const maxVal = Math.max(meta, 100, ...todosVals);
      const yMaxSin = Math.max(120, Math.ceil((maxVal * 1.05) / 20) * 20);

      const serieAtiva = 'Atual';
      const valAtualFormatado = consolidadoValores.Atual != null ? formatar(consolidadoValores.Atual, 'percentual') : null;
      const valAntFormatado = (temDoisAnos && consolidadoValores.Anterior != null) ? formatar(consolidadoValores.Anterior, 'percentual') : null;

      const rotuloAtual = valAtualFormatado ? `Atual (${valAtualFormatado})` : 'Atual';
      const rotuloAnt = valAntFormatado ? `Anterior (${valAntFormatado})` : 'Anterior';

      const legendaItens = [
        ...(temDoisAnos
          ? [
              { rotulo: rotuloAtual, cor: '#22368F', estilo: 'linha' },
              { rotulo: rotuloAnt, cor: '#A2B2EF', estilo: 'linha' },
            ]
          : [{ rotulo: rotuloAtual, cor: '#22368F', estilo: 'linha' }]),
        { rotulo: temDoisAnos ? 'Tendência (Atual)' : 'Tendência', cor: '#64748B', estilo: 'tracejado' },
        { rotulo: `Ponto de equilíbrio (${formatar(meta, 'inteiro')}%)`, cor: '#C93B2B', estilo: 'tracejado' },
      ];

      const cfgLinha = {
        linhas: linhasMesAMes,
        series,
        val,
        fmt,
        hoverVal: (l, s, v) => `${s} · ${l.__eixo}: ${formatar(v, 'percentual')}`,
        referencia: { valor: meta, rotulo: `${formatar(meta, 'inteiro')}%`, cor: '#C93B2B' },
        rotulos: false,
        rotacionarEixo: true,
        titulo: 'Sinistralidade mensal do período',
        cores: { Atual: '#22368F', Anterior: '#A2B2EF' },
        tendencia: { serie: serieAtiva, cor: '#64748B', espessura: 1.5, rotulo: `Tendência (${serieAtiva})` },
        legendaItens,
        altura: 320,
        legendaAbaixo: true,
        mesEncurtado: true,
        yMin: 0,
        yMax: yMaxSin,
        gridDivisoes: yMaxSin / 20,
        ...(temTotalConsolidado
          ? {
              consolidado: {
                rotulo: 'Total',
                tipo: 'ponto',
                valores: consolidadoValores,
              },
            }
          : {}),
      };

      const svgLinha = UI.graficoLinha(cfgLinha);
      const notaPeriodo = gerarNotaPeriodoVidas(periodosFormatados);
      const notaGraficoHtml = notaPeriodo
        ? `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodo)}</p>`
        : '';

      cardLinhaHtml = UI.card(UI.subtitulo('Sinistralidade mensal do período') + svgLinha + notaGraficoHtml, 'grafico-card');
      dadosLinha = {
        tipo: 'grafico',
        estilo: 'linha',
        series,
        pontos: linhasMesAMes.map((l) => ({
          eixo: l.__eixo,
          ...Object.fromEntries(series.map((s) => [s, formatar(l[s], 'percentual')])),
        })),
        totais: consolidadoValores,
      };
    } else {
      const linha = graficoDeBloco({
        fonte: m.fonte,
        estilo: 'linha',
        series: [m.sinistralidade || 'Sinistralidade'],
        formato: 'percentual',
        referencia: { valor: meta, rotulo: `${formatar(meta, 'inteiro')}%` },
        tendencia: true,
        altura: 320,
      }, 'Sinistralidade mensal do período');
      cardLinhaHtml = linha.html;
      dadosLinha = linha.dados;
    }

    if (!colunas.vazio || cardLinhaHtml) {
      graficos = UI.grade(2, (colunas.vazio ? '' : colunas.html) + (cardLinhaHtml || ''));
      dadosMensal = dadosLinha || colunas.dados;
    }
  }

  const rodapeHtml = UI.caixaComentarios(bloco.id, {
    placeholder: 'Observações da consultora...'
  });

  const html = `${UI.cabecalho(bloco, ctx)}<div class="grade"><div class="kpi-grid kpi-grid-6">${cards}</div>${graficos}</div>${UI.nota(bloco.nota)}${rodapeHtml}`;
  return slideBase(bloco, html, {
    vazio: receita === null && despesa === null && sin === null,
    dados: {
      tipo: 'resultadoFinanceiro',
      receita: formatar(receita, 'moedaCurta'),
      despesa: formatar(despesa, 'moedaCurta'),
      sinistralidade: formatar(sin, 'percentual'),
      receitaNum: receita,
      despesaNum: despesa,
      sinistralidadeNum: sin,
      coparticipacao: formatar(valCopay, 'moedaCurta'),
      descontoCoparticipacao: pctDescontoCopay !== null ? formatar(pctDescontoCopay, 'percentual') : null,
      reajusteTecnico: reajusteTecnicoTxt,
      meta: formatar(meta, 'percentual'),
      estado: estadoSin,
      mensal: dadosMensal
    },
  });
}

/**
 * Extrai competência de referência (ex: "Mai/26") a partir de string de data ou período.
 */
function formatarMesAnoRef(dtStr) {
  if (!dtStr) return '';
  const s = String(dtStr).trim();
  const mPeriodo = RE_PERIODO.exec(s);
  if (mPeriodo) {
    const sigla = mPeriodo[1].charAt(0).toUpperCase() + mPeriodo[1].slice(1, 3).toLowerCase();
    const ano2 = mPeriodo[2].slice(-2);
    return `${sigla}/${ano2}`;
  }
  const am = extrairAnoMes(s);
  if (!am || !am.mes || !am.ano) return '';
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const sigla = meses[am.mes - 1] || '';
  const ano2 = String(am.ano).slice(-2);
  return sigla ? `${sigla}/${ano2}` : '';
}

/**
 * Renderiza gauge semicircular SVG para indicadores de participação percentual.
 */
function _renderSemiCirculoGauge(pct, rotulo, cor = 'var(--azul-700, #22368F)') {
  const p = pct !== null && !isNaN(pct) ? Math.max(0, Math.min(100, Number(pct))) : 0;
  const raio = 50;
  const perimetroSemi = Math.PI * raio; // ~157.08
  const preenchimento = ((p / 100) * perimetroSemi).toFixed(1);
  const textoPct = pct !== null && !isNaN(pct) ? formatar(pct, 'percentual') : '—';
  const strokeCap = p > 0 ? 'round' : 'butt';

  return `<div class="perf-gauge-card">
    <div class="perf-gauge-rotulo">${esc(rotulo)}</div>
    <div class="perf-gauge-svg-wrap">
      <svg viewBox="0 0 140 88" class="perf-gauge-svg" aria-hidden="true">
        <!-- Arco de fundo -->
        <path d="M 20 70 A 50 50 0 0 1 120 70" fill="none" stroke="var(--cinza-200, #E2E8F0)" stroke-width="14" stroke-linecap="round" />
        <!-- Arco preenchido -->
        <path d="M 20 70 A 50 50 0 0 1 120 70" fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="${strokeCap}" stroke-dasharray="${preenchimento} ${perimetroSemi.toFixed(1)}" />
        <!-- Valor central -->
        <text x="70" y="65" text-anchor="middle" class="perf-gauge-valor-svg">${esc(textoPct)}</text>
        <!-- Escala -->
        <text x="10" y="84" text-anchor="start" class="perf-gauge-extremo">0,0%</text>
        <text x="130" y="84" text-anchor="end" class="perf-gauge-extremo">100,0%</text>
      </svg>
    </div>
  </div>`;
}

/**
 * Slide executivo: Resumo de Performance do Contrato · Ativos × Inativos (Lei 9.656/98 art. 30 e 31).
 * Compara Vidas, Receita, Despesa e Sinistralidade entre Ativos e Inativos, além de gauges de participação.
 * Se o contrato não tiver empresa de inativos vinculada, o slide é marcado como vazio para ser ocultado.
 */
function renderPerformanceAtivosInativos(bloco, ctx) {
  const inativosInfo = ctx.inativos;
  if (!inativosInfo || !Array.isArray(inativosInfo.relatorios) || inativosInfo.relatorios.length === 0) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio('Sem empresas inativas vinculadas a este contrato.')}${UI.rodape(bloco.nota, bloco.legenda)}`, {
      vazio: true,
      dados: { tipo: 'performanceAtivosInativos', vazio: true }
    });
  }

  const extrairLinhasDePayload = (payload) => {
    if (!payload) return [];
    const raw = payload.data ?? payload.dados ?? payload;
    const blocos = Array.isArray(raw) ? raw : [raw];
    const out = [];
    blocos.forEach((b) => {
      if (!b) return;
      const dados = Array.isArray(b) ? b : b.Dados || b.dados || [];
      dados.forEach((d) => { if (d) out.push(d); });
    });
    return out;
  };

  const ehMed = (d) => !d.Grupo || /med/i.test(d.Grupo) || d.Grupo === 'M';
  const ehColTotal = (d) => /total/i.test(String(d.Coluna || ''));
  const matchLinha = (d, alvo) => {
    const s = normTexto(d?.Linha);
    if (alvo === 'vidas') return s === 'vidas' || s.includes('vida');
    if (alvo === 'receita') return s === 'receita' || s.includes('faturam');
    if (alvo === 'despesa') return s === 'despesa' || s.includes('sinistro');
    return s === alvo;
  };

  let vidasInat = 0;
  let recInat = 0;
  let despInat = 0;
  let temDadosInat = false;

  inativosInfo.relatorios.forEach((r) => {
    if (!r || r.ok === false) return;
    const linhas = extrairLinhasDePayload(r.data);
    let rowVidas = linhas.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'vidas'));
    let rowRec = linhas.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'receita'));
    let rowDesp = linhas.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'despesa'));

    // Se não encontrou com coluna TOTAL, busca qualquer coluna correspondente em Medicina
    if (!rowRec) rowRec = linhas.find((d) => ehMed(d) && matchLinha(d, 'receita'));
    if (!rowDesp) rowDesp = linhas.find((d) => ehMed(d) && matchLinha(d, 'despesa'));
    if (!rowVidas) rowVidas = linhas.find((d) => ehMed(d) && matchLinha(d, 'vidas'));

    const vVidas = num(rowVidas?.Valor);
    const vRec = num(rowRec?.Valor);
    const vDesp = num(rowDesp?.Valor);

    if (vVidas !== null || vRec !== null || vDesp !== null) {
      temDadosInat = true;
      if (vVidas !== null) vidasInat += vVidas;
      else if (num(r.empresa?.QTD_Vidas) !== null) vidasInat += num(r.empresa.QTD_Vidas);
      if (vRec !== null) recInat += vRec;
      if (vDesp !== null) despInat += vDesp;
    }
  });

  if (!temDadosInat || (recInat === 0 && despInat === 0 && vidasInat === 0)) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio('Sem movimentação de empresas inativas no período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, {
      vazio: true,
      dados: { tipo: 'performanceAtivosInativos', vazio: true }
    });
  }

  // Relatório consolidado principal (Contrato Total / Coletivo)
  const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
  const itensR1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
  let rowTotVidas = itensR1.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'vidas'));
  let rowTotRec = itensR1.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'receita'));
  let rowTotDesp = itensR1.find((d) => ehMed(d) && ehColTotal(d) && matchLinha(d, 'despesa'));

  if (!rowTotRec) rowTotRec = itensR1.find((d) => ehMed(d) && matchLinha(d, 'receita'));
  if (!rowTotDesp) rowTotDesp = itensR1.find((d) => ehMed(d) && matchLinha(d, 'despesa'));
  if (!rowTotVidas) rowTotVidas = itensR1.find((d) => ehMed(d) && matchLinha(d, 'vidas'));

  const recTot = num(rowTotRec?.Valor) ?? resolverFonteEscalar({ assinatura: 'financeiroConsolidado', filtro: { grupoEm: ['Medicina', 'M'], colunaEm: ['TOTAL', 'Total'], linhaEm: ['RECEITA', 'Receita'] }, agregacao: 'primeiro' });
  const despTot = num(rowTotDesp?.Valor) ?? resolverFonteEscalar({ assinatura: 'financeiroConsolidado', filtro: { grupoEm: ['Medicina', 'M'], colunaEm: ['TOTAL', 'Total'], linhaEm: ['DESPESA', 'Despesa', 'Despesa (líquida de coparticipação)', 'Despesa (liquida de Coparticipacao)', 'Despesa (liquida de Copay)'] }, agregacao: 'primeiro' });
  const vidasTot = num(rowTotVidas?.Valor) ?? resolverFonteEscalar({ assinatura: 'financeiroConsolidado', filtro: { grupoEm: ['Medicina', 'M'], colunaEm: ['TOTAL', 'Total'], linhaEm: ['VIDAS', 'Vidas'] }, agregacao: 'primeiro' }) ?? num(ctx.relatorio?.QTD_Vidas);

  if (recTot === null || recTot <= 0) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio('Sem dados financeiros para o contrato no período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, {
      vazio: true,
      dados: { tipo: 'performanceAtivosInativos', vazio: true }
    });
  }

  // Cálculo Ativos = Total - Inativos
  const vidasAtiv = vidasTot !== null ? Math.max(0, vidasTot - vidasInat) : null;
  const recAtiv = recTot !== null ? Math.max(0, recTot - recInat) : null;
  const despAtiv = despTot !== null ? Math.max(0, despTot - despInat) : null;

  const sinAtiv = (recAtiv !== null && recAtiv > 0 && despAtiv !== null) ? (despAtiv / recAtiv) * 100 : null;
  const sinInat = (recInat !== null && recInat > 0 && despInat !== null) ? (despInat / recInat) * 100 : null;

  const meta = num(bloco.meta) ?? 75;

  const pctCustoInat = (despTot !== null && despTot > 0 && despInat !== null) ? (despInat / despTot) * 100 : 0;
  const pctReceitaInat = (recTot !== null && recTot > 0 && recInat !== null) ? (recInat / recTot) * 100 : 0;

  const dtFimStr = pathGet(ctx, 'relatorio.DtFinal') || pathGet(ctx, '_meta.dataFinal') || '';
  const mesAnoRef = formatarMesAnoRef(dtFimStr);
  const rotuloVidas = `Vidas Total (Med)${mesAnoRef ? ` em ${mesAnoRef}` : ''}`;

  const classeSinAtiv = (sinAtiv !== null && sinAtiv <= meta) ? 'perf-valor-ok' : 'perf-valor-alerta';
  const classeSinInat = (sinInat !== null && sinInat <= meta) ? 'perf-valor-ok' : 'perf-valor-alerta';

  const gaugeCustoHtml = _renderSemiCirculoGauge(pctCustoInat, 'Participação dos Inativos no Custo Total', 'var(--azul-700, #22368F)');
  const gaugeReceitaHtml = _renderSemiCirculoGauge(pctReceitaInat, 'Participação dos Inativos na Receita Total', 'var(--azul-700, #22368F)');

  const html = `${UI.cabecalho(bloco, ctx)}
    <div class="perf-wrap">
      <div class="perf-coluna perf-coluna-ativos">
        <div class="perf-coluna-titulo">ATIVOS</div>
        <div class="perf-tabela">
          <div class="perf-linha">
            <span class="perf-rotulo">${esc(rotuloVidas)}</span>
            <span class="perf-valor">${esc(formatar(vidasAtiv, 'inteiro'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Faturamento no período:</span>
            <span class="perf-valor">${esc(formatar(recAtiv, 'moeda'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Sinistros pagos no período:</span>
            <span class="perf-valor">${esc(formatar(despAtiv, 'moeda'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Limite técnico do contrato:</span>
            <span class="perf-valor">${esc(formatar(meta, 'inteiro'))}%</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Sinistralidade no período:</span>
            <span class="perf-valor ${classeSinAtiv}">${esc(formatar(sinAtiv, 'percentual'))}</span>
          </div>
        </div>
      </div>

      <div class="perf-coluna perf-coluna-inativos">
        <div class="perf-coluna-titulo">INATIVOS</div>
        <div class="perf-tabela">
          <div class="perf-linha">
            <span class="perf-rotulo">${esc(rotuloVidas)}</span>
            <span class="perf-valor">${esc(formatar(vidasInat, 'inteiro'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Faturamento no período:</span>
            <span class="perf-valor">${esc(formatar(recInat, 'moeda'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Sinistros pagos no período:</span>
            <span class="perf-valor">${esc(formatar(despInat, 'moeda'))}</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Limite técnico do contrato:</span>
            <span class="perf-valor">${esc(formatar(meta, 'inteiro'))}%</span>
          </div>
          <div class="perf-linha">
            <span class="perf-rotulo">Sinistralidade no período:</span>
            <span class="perf-valor ${classeSinInat}">${esc(formatar(sinInat, 'percentual'))}</span>
          </div>
        </div>

        <div class="perf-gauges-container">
          ${gaugeCustoHtml}
          ${gaugeReceitaHtml}
        </div>
      </div>
    </div>
    ${UI.rodape(bloco.nota, bloco.legenda)}`;

  return slideBase(bloco, html, {
    vazio: false,
    dados: {
      tipo: 'performanceAtivosInativos',
      ativos: {
        vidas: formatar(vidasAtiv, 'inteiro'),
        receita: formatar(recAtiv, 'moeda'),
        despesa: formatar(despAtiv, 'moeda'),
        limiteTecnico: `${formatar(meta, 'inteiro')}%`,
        sinistralidade: formatar(sinAtiv, 'percentual')
      },
      inativos: {
        vidas: formatar(vidasInat, 'inteiro'),
        receita: formatar(recInat, 'moeda'),
        despesa: formatar(despInat, 'moeda'),
        limiteTecnico: `${formatar(meta, 'inteiro')}%`,
        sinistralidade: formatar(sinInat, 'percentual'),
        participacaoCusto: formatar(pctCustoInat, 'percentual'),
        participacaoReceita: formatar(pctReceitaInat, 'percentual')
      }
    }
  });
}

/**
 * Sinistralidade mensal consolidada por ano ou exibida mês a mês.
 * Se houver mais de 1 ano (ex.: Ano 1 e Ano 2), consolida receita e despesa em barras por ano
 * e exibe indicadores de sinistralidade acumulada.
 * Se houver apenas 1 ano, exibe a evolução mensal separadamente.
 */
function extrairAnoPeriodo(c) {
  const ch = chavePeriodo(c);
  if (ch) return Math.floor(ch / 100);
  const m = /\b(19\d\d|20\d\d)\b/.exec(String(c || ''));
  if (m) return Number(m[1]);
  const m2 = /\b(\d{2})\b/.exec(String(c || ''));
  if (m2) {
    const a = Number(m2[1]);
    return a < 100 ? a + 2000 : a;
  }
  return null;
}

function formatarMesAnoCurto(col) {
  if (!col) return '';
  const m = RE_PERIODO.exec(String(col).trim());
  if (m) {
    const mesSigla = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    let ano = parseInt(m[2], 10);
    const ano2 = String(ano >= 2000 ? ano - 2000 : (ano >= 100 ? ano % 100 : ano)).padStart(2, '0');
    return `${mesSigla}/${ano2}`;
  }
  const emIso = /^(\d{4})-(\d{2})/.exec(String(col).trim());
  if (emIso) {
    const ano2 = emIso[1].slice(2);
    const mNum = parseInt(emIso[2], 10);
    const siglas = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${siglas[mNum] || emIso[2]}/${ano2}`;
  }
  return String(col);
}

const NOMES_MESES_SIGLA = {
  1: 'jan', 2: 'fev', 3: 'mar', 4: 'abr', 5: 'mai', 6: 'jun',
  7: 'jul', 8: 'ago', 9: 'set', 10: 'out', 11: 'nov', 12: 'dez'
};

function formatarRotuloMesAnoEncurtado(mNum, ano = null) {
  const sigla = NOMES_MESES_SIGLA[mNum] || '';
  if (!sigla) return '';
  if (ano != null && !isNaN(ano)) {
    const a = Number(ano);
    const ano2 = String(a >= 2000 ? a - 2000 : (a >= 100 ? a % 100 : a)).padStart(2, '0');
    return `${sigla}/${ano2}`;
  }
  return sigla;
}

function gerarNotaPeriodoVidas(periodosFormatados) {
  if (!Array.isArray(periodosFormatados) || !periodosFormatados.length) return '';
  const numRomanos = ['I', 'II', 'III', 'IV'];

  if (periodosFormatados.length > 1) {
    const partes = periodosFormatados.map((p, idx) => {
      const mesesP = (p.meses || [...new Set((p.itens || []).map((d) => d.Coluna))].filter(Boolean))
        .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
      if (!mesesP.length) return '';
      const ini = formatarMesAnoCurto(mesesP[0]);
      const fim = formatarMesAnoCurto(mesesP[mesesP.length - 1]);
      const rom = numRomanos[idx] || String(idx + 1);
      return `Ano ${rom} - ${ini} a ${fim}`;
    }).filter(Boolean);

    return partes.join('    ');
  }

  const p = periodosFormatados[0];
  const mesesP = (p.meses || [...new Set((p.itens || []).map((d) => d.Coluna))].filter(Boolean))
    .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
  if (!mesesP.length) return '';
  const ini = formatarMesAnoCurto(mesesP[0]);
  const fim = formatarMesAnoCurto(mesesP[mesesP.length - 1]);
  return `Ano I - ${ini} a ${fim}`;
}

function identificarPeriodosAno1Ano2(itensPeriodo) {
  const ord2 = itensPeriodo.filter((d) => Number(d.Ordem) === 2);
  const ord1 = itensPeriodo.filter((d) => Number(d.Ordem) === 1);

  let periodos = [];

  if (ord2.length > 0 && ord1.length > 0) {
    const chMin1 = Math.min(...ord1.map((d) => chavePeriodo(d.Coluna) || Infinity));
    const chMin2 = Math.min(...ord2.map((d) => chavePeriodo(d.Coluna) || Infinity));

    const mesesOrd1Set = new Set(ord1.map((d) => d.Coluna));
    const temSobreposicao = ord2.some((d) => mesesOrd1Set.has(d.Coluna));

    if (temSobreposicao) {
      if (chMin2 < chMin1) {
        // ord2 contém o histórico cumulativo que se estende antes de ord1
        const itensAno1 = ord2.filter((d) => (chavePeriodo(d.Coluna) || 0) < chMin1);
        if (itensAno1.length > 0) {
          periodos = [
            { nomeBase: 'Ano 1', itens: itensAno1 },
            { nomeBase: 'Ano 2', itens: ord1 },
          ];
        }
      } else if (chMin1 < chMin2) {
        const itensAno1 = ord1.filter((d) => (chavePeriodo(d.Coluna) || 0) < chMin2);
        if (itensAno1.length > 0) {
          periodos = [
            { nomeBase: 'Ano 1', itens: itensAno1 },
            { nomeBase: 'Ano 2', itens: ord2 },
          ];
        }
      }
    } else {
      // Ordens já disjuntas (cada uma com 12 meses próprios)
      if (chMin2 <= chMin1) {
        periodos = [
          { nomeBase: 'Ano 1', itens: ord2 },
          { nomeBase: 'Ano 2', itens: ord1 },
        ];
      } else {
        periodos = [
          { nomeBase: 'Ano 1', itens: ord1 },
          { nomeBase: 'Ano 2', itens: ord2 },
        ];
      }
    }
  }

  // Fallback quando não há duas ordens distintas ou apenas uma ordem existe
  if (!periodos.length) {
    const baseItens = ord2.length > 0 && ord1.length > 0
      ? [...ord2, ...ord1]
      : (ord2.length > 0 ? ord2 : (ord1.length > 0 ? ord1 : itensPeriodo));

    const mesesDistintos = [...new Set(baseItens.map((d) => d.Coluna))].filter(Boolean)
      .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));

    if (mesesDistintos.length > 13) {
      const chIni = chavePeriodo(mesesDistintos[0]);
      let splitIdx = -1;
      if (chIni) {
        const chAno2 = chIni + 100;
        splitIdx = mesesDistintos.findIndex((m) => chavePeriodo(m) >= chAno2);
      }
      if (splitIdx <= 0 || splitIdx >= mesesDistintos.length) {
        splitIdx = Math.floor(mesesDistintos.length / 2);
      }
      const mesesP1 = new Set(mesesDistintos.slice(0, splitIdx));
      const mesesP2 = new Set(mesesDistintos.slice(splitIdx));
      periodos = [
        { nomeBase: 'Ano 1', itens: baseItens.filter((d) => mesesP1.has(d.Coluna)) },
        { nomeBase: 'Ano 2', itens: baseItens.filter((d) => mesesP2.has(d.Coluna)) },
      ];
    } else if (mesesDistintos.length > 1 && ord2.length > 0 && ord1.length > 0) {
      const chMin1 = Math.min(...ord1.map((d) => chavePeriodo(d.Coluna) || Infinity));
      const chMin2 = Math.min(...ord2.map((d) => chavePeriodo(d.Coluna) || Infinity));
      if (chMin2 <= chMin1) {
        periodos = [
          { nomeBase: 'Ano 1', itens: ord2 },
          { nomeBase: 'Ano 2', itens: ord1 },
        ];
      } else {
        periodos = [
          { nomeBase: 'Ano 1', itens: ord1 },
          { nomeBase: 'Ano 2', itens: ord2 },
        ];
      }
    } else {
      periodos = [];
    }
  }

  return periodos.map((p, idx) => {
    const mesesP = [...new Set(p.itens.map((d) => d.Coluna))].filter(Boolean)
      .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    const anoIni = mesesP.length ? extrairAnoPeriodo(mesesP[0]) : null;
    const anoFim = mesesP.length ? extrairAnoPeriodo(mesesP[mesesP.length - 1]) : null;
    const ini = mesesP.length ? formatarMesAnoCurto(mesesP[0]) : '';
    const fim = mesesP.length ? formatarMesAnoCurto(mesesP[mesesP.length - 1]) : '';
    const descMeses = (ini && fim) ? (ini === fim ? ini : `${ini} a ${fim}`) : '';
    let rotulo = p.nomeBase || `Ano ${idx + 1}`;
    if (descMeses) {
      rotulo += ` (${descMeses})`;
    } else if (anoIni && anoFim) {
      rotulo += ` (${anoIni === anoFim ? anoIni : `${anoIni}/${anoFim}`})`;
    }
    return { ...p, rotulo, meses: mesesP };
  });
}

/** Obtém rótulos detalhados de período para o comparativo Atual x Anterior */
function obterPeriodosFormatadosAnalise() {
  try {
    const dadosSin = extrairDadosSinistralidadePeriodos();
    if (dadosSin?.periodosFormatados?.length >= 2) {
      const pAnt = dadosSin.periodosFormatados[0];
      const pAtu = dadosSin.periodosFormatados[1];
      const mesesAnt = (pAnt.meses || []).filter(Boolean);
      const mesesAtu = (pAtu.meses || []).filter(Boolean);
      const iniAnt = mesesAnt.length ? formatarMesAnoCurto(mesesAnt[0]) : '';
      const fimAnt = mesesAnt.length ? formatarMesAnoCurto(mesesAnt[mesesAnt.length - 1]) : '';
      const iniAtu = mesesAtu.length ? formatarMesAnoCurto(mesesAtu[0]) : '';
      const fimAtu = mesesAtu.length ? formatarMesAnoCurto(mesesAtu[mesesAtu.length - 1]) : '';

      const descAnt = (iniAnt && fimAnt) ? `${iniAnt} - ${fimAnt}` : '';
      const descAtu = (iniAtu && fimAtu) ? `${iniAtu} - ${fimAtu}` : '';

      const rotAnt = descAnt || '';
      const rotAtu = descAtu || '';
      return { rotAnt, rotAtu };
    }
  } catch (e) {}
  return { rotAnt: '', rotAtu: '' };
}

function renderSinistralidadeMensal(bloco, ctx) {
  const fonte = { ...(bloco.fonte || {}), assinatura: bloco.fonte?.assinatura || 'financeiroMensal', todos: true };
  const ids = idsDaFonte(fonte);
  const itensBrutos = ids.flatMap((id) => itensDoRelatorio(id));
  if (!itensBrutos.length) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio(bloco.mensagemVazio || 'Sem dados para o período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: true });
  }

  const extrairAno = extrairAnoPeriodo;
  const ehReceita = (lin) => /receita/i.test(String(lin || ''));
  const ehDespesa = (lin) => /despesa/i.test(String(lin || ''));
  const ehSinistralidade = (lin) => /sinistralidade/i.test(String(lin || ''));

  const itensValidos = itensBrutos.filter((d) => num(d.Valor) !== null);
  // Itens periódicos (excluindo 'TOTAL', 'Acumulado', etc.)
  const itensSemTotal = itensValidos.filter((d) => !SEM_DADOS.test(String(d.Coluna || '')) && !/^(total|acumulado)$/i.test(String(d.Coluna || '').trim()));
  const itensPeriodo = itensSemTotal.filter((d) => chavePeriodo(d.Coluna) !== null || extrairAnoPeriodo(d.Coluna) !== null);

  const periodosFormatados = identificarPeriodosAno1Ano2(itensPeriodo);

  const meta = num(bloco.meta) ?? (bloco.referencia?.valor != null ? num(bloco.referencia.valor) : 75);

  let linhas = [];
  let kpiCards = '';

  if (periodosFormatados.length > 1) {
    linhas = periodosFormatados.map((p, idx) => {
      const somaLinha = (filtroFn) =>
        p.itens.filter((d) => filtroFn(d.Linha)).reduce((acc, d) => acc + (num(d.Valor) || 0), 0);

      const rec = somaLinha(ehReceita);
      const desp = somaLinha(ehDespesa);
      let sin = (rec > 0 && desp !== null) ? (desp / rec) * 100 : null;
      if (sin === null && rec > 0) {
        const sins = p.itens.filter((d) => ehSinistralidade(d.Linha)).map((d) => num(d.Valor)).filter((n) => n !== null);
        if (sins.length) sin = sins.reduce((a, b) => a + b, 0) / sins.length;
      }

      return {
        __eixo: p.rotulo,
        __periodoIndice: idx + 1,
        Receita: rec,
        Despesa: desp,
        Sinistralidade: sin,
      };
    });

    const cardsHtml = linhas.map((l, i) => {
      const semRec = l.Receita != null && l.Receita <= 0;
      const sinFormatada = l.Sinistralidade !== null
        ? formatar(l.Sinistralidade, 'percentual')
        : (semRec ? 'Sem receita líquida no período' : '—');
      const estado = estadoPorAlerta(l.Sinistralidade, { acima: meta, atencao: meta - 5 });
      const gap = l.Sinistralidade != null ? l.Sinistralidade - meta : null;
      let badge = null;
      if (i > 0 && linhas[i - 1].Sinistralidade != null && l.Sinistralidade != null) {
        const difAno = l.Sinistralidade - linhas[i - 1].Sinistralidade;
        badge = { estado: difAno <= 0 ? 'positivo' : 'negativo', texto: `${formatar(difAno, 'pontos')} vs Ano ${i}` };
      } else if (gap !== null) {
        badge = { estado, texto: `${formatar(gap, 'pontos')} vs meta` };
      }
      return UI.cardKpi({
        rotulo: `${l.__eixo} · Sinistralidade`,
        valor: sinFormatada,
        estado,
        badge,
        sub: `Receita: ${formatar(l.Receita, 'moedaCurta')} · Despesa: ${formatar(l.Despesa, 'moedaCurta')}`,
      });
    }).join('');

    kpiCards = `<div class="kpi-grid" style="margin-bottom: 10px;">${cardsHtml}</div>`;
  } else if (itensPeriodo.length > 0) {
    const baseItens = itensPeriodo;
    const meses = [...new Set(baseItens.map((d) => d.Coluna))].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    linhas = meses.map((mes) => {
      const itensMes = baseItens.filter((d) => d.Coluna === mes);
      const getVal = (filtroFn) => {
        const item = itensMes.find((d) => filtroFn(d.Linha));
        return item ? num(item.Valor) : null;
      };
      const rec = getVal(ehReceita);
      const desp = getVal(ehDespesa);
      let sin = getVal(ehSinistralidade);
      if (rec !== null && rec <= 0) {
        sin = null;
      } else if (sin === null && rec !== null && rec > 0 && desp !== null) {
        sin = (desp / rec) * 100;
      }
      return {
        __eixo: mes,
        Receita: rec,
        Despesa: desp,
        Sinistralidade: sin,
      };
    });

    const somaTotal = (filtroFn) => baseItens.filter((d) => filtroFn(d.Linha)).reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
    const totRec = somaTotal(ehReceita);
    const totDesp = somaTotal(ehDespesa);
    const totSin = totRec > 0 ? (totDesp / totRec) * 100 : null;
    const semRec = totRec <= 0;
    const valorTotSin = totSin !== null
      ? formatar(totSin, 'percentual')
      : (semRec ? 'Sem receita líquida no período' : '—');
    const estado = estadoPorAlerta(totSin, { acima: meta, atencao: meta - 5 });
    kpiCards = `<div class="kpi-grid" style="margin-bottom: 10px;">${UI.cardKpi({
      rotulo: 'Sinistralidade acumulada',
      valor: valorTotSin,
      estado,
      sub: `Receita: ${formatar(totRec, 'moedaCurta')} · Despesa: ${formatar(totDesp, 'moedaCurta')}`,
    })}</div>`;
  } else {
    // Fallback: consolidação direta quando só há coluna 'TOTAL' ou similar
    const baseItens = itensValidos.length ? itensValidos : itensBrutos;
    const colunas = [...new Set(baseItens.map((d) => d.Coluna || 'Período'))];
    linhas = colunas.map((col) => {
      const itensCol = baseItens.filter((d) => (d.Coluna || 'Período') === col);
      const getVal = (filtroFn) => {
        const item = itensCol.find((d) => filtroFn(d.Linha));
        return item ? num(item.Valor) : null;
      };
      const rec = getVal(ehReceita) || 0;
      const desp = getVal(ehDespesa) || 0;
      let sin = getVal(ehSinistralidade);
      if (rec <= 0) {
        sin = null;
      } else if (sin === null && rec > 0) {
        sin = (desp / rec) * 100;
      }
      return {
        __eixo: igual(col, 'TOTAL') ? 'Período consolidado' : col,
        Receita: rec,
        Despesa: desp,
        Sinistralidade: sin,
      };
    });

    const l = linhas[0] || {};
    const semRec = l.Receita != null && l.Receita <= 0;
    const valorKpi = l.Sinistralidade != null
      ? formatar(l.Sinistralidade, 'percentual')
      : (semRec ? 'Sem receita líquida no período' : '—');
    const estado = estadoPorAlerta(l.Sinistralidade, { acima: meta, atencao: meta - 5 });
    kpiCards = `<div class="kpi-grid" style="margin-bottom: 10px;">${UI.cardKpi({
      rotulo: 'Sinistralidade acumulada',
      valor: valorKpi,
      estado,
      sub: `Receita: ${formatar(l.Receita, 'moedaCurta')} · Despesa: ${formatar(l.Despesa, 'moedaCurta')}`,
    })}</div>`;
  }

  const series = ['Receita', 'Despesa'];
  const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
  const fmt = (v) => formatar(v, 'moedaCurta');
  const descPeriodosGeral = periodosFormatados.length > 1
    ? periodosFormatados.map((p) => {
        const mesesP = p.meses || [];
        const ini = mesesP.length ? formatarMesAnoCurto(mesesP[0]) : '';
        const fim = mesesP.length ? formatarMesAnoCurto(mesesP[mesesP.length - 1]) : '';
        return (ini && fim) ? (ini === fim ? ini : `${ini} a ${fim}`) : '';
      }).filter(Boolean).join(' × ')
    : '';

  const tituloGrafico = bloco.subtituloGrafico || (periodosFormatados.length > 1
    ? `Receita × despesa por ano analisado${descPeriodosGeral ? ` (${descPeriodosGeral})` : ''}`
    : 'Receita × despesa por mês');

  const cfg = {
    linhas,
    series,
    val,
    fmt,
    referencia: null,
    rotulos: true,
    rotacionarEixo: bloco.rotacionarEixo,
    titulo: tituloGrafico,
    altura: bloco.altura || 220,
  };

  const svg = UI.graficoColunas(cfg);
  const notaPeriodos = periodosFormatados.length > 1 ? gerarNotaPeriodoVidas(periodosFormatados) : '';
  const notaGraficoHtml = notaPeriodos
    ? `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodos)}</p>`
    : '';
  const cardGrafico = UI.card(UI.subtitulo(cfg.titulo) + svg + notaGraficoHtml, 'grafico-card');

  const notaRodape = [bloco.nota, notaPeriodos].filter(Boolean).join(' · ');
  const html = `${UI.cabecalho(bloco, ctx)}<div class="grade">${kpiCards}${cardGrafico}</div>${UI.rodape(notaRodape, bloco.legenda)}`;

  const temLinhasComValor = linhas.some((l) => (l.Receita != null && l.Receita > 0) || (l.Despesa != null && l.Despesa > 0) || l.Sinistralidade != null);
  const estaVazio = !linhas.length || !temLinhasComValor;

  return slideBase(bloco, html, {
    vazio: estaVazio,
    dados: {
      tipo: 'sinistralidadeAnual',
      agrupadoPorAno: periodosFormatados.length > 1,
      pontos: linhas.map((l) => ({
        eixo: l.__eixo,
        receita: formatar(l.Receita, 'moedaCurta'),
        despesa: formatar(l.Despesa, 'moedaCurta'),
        sinistralidade: formatar(l.Sinistralidade, 'percentual'),
      })),
    },
  });
}

/**
 * Extração de dados comparativos de sinistralidade mês a mês (Atual x Anterior)
 */
function extrairDadosSinistralidadePeriodos(fonteBloco, grupoFiltro = null) {
  const fonte = { ...(fonteBloco || {}), assinatura: 'financeiroMensal', todos: true };
  const ids = idsDaFonte(fonte);
  let itensBrutos = ids.length ? ids.flatMap((id) => itensDoRelatorio(id)) : itensDoRelatorio(10);

  const ehOdonto = grupoFiltro === 'odonto';
  const ehMedicina = grupoFiltro === 'medicina';

  if (ehOdonto) {
    const itensOdontoR10 = itensBrutos.filter((d) => normalizarGrupo(d.Grupo) === 'odontologia');
    if (itensOdontoR10.length > 0) {
      itensBrutos = itensOdontoR10;
    } else {
      // Fallback para eventoMensal e financeiroConsolidado
      const idsR14 = idsDaFonte({ assinatura: 'eventoMensal' });
      const r14 = idsR14.length ? idsR14.flatMap(itensDoRelatorio) : itensDoRelatorio(14);
      const odoMeses = r14.filter(
        (d) => (/odo/i.test(d.Linha || '') || /odo/i.test(d.Grupo || '')) &&
               !SEM_DADOS.test(String(d.Coluna || '')) &&
               !/^(total|acumulado|media|média)/i.test(String(d.Coluna || '').trim()) &&
               (chavePeriodo(d.Coluna) !== null || extrairAnoPeriodo(d.Coluna) !== null)
      );
      if (!odoMeses.length) return null;
      const somaDesp = odoMeses.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);
      if (somaDesp <= 0) return null;

      const idsR1 = idsDaFonte({ assinatura: 'financeiroConsolidado' });
      const r1 = idsR1.length ? idsR1.flatMap(itensDoRelatorio) : itensDoRelatorio(1);
      const r1Ord1 = r1.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
      const baseR1 = r1Ord1.length ? r1Ord1 : r1;
      const recOdoItem = baseR1.find(
        (d) => (igualGrupo(d.Grupo, 'Odontologia') || igual(d.Grupo, 'O')) &&
               /receita/i.test(d.Linha || '') &&
               (igual(d.Coluna, 'Total') || igual(d.Coluna, 'TOTAL')) &&
               !igual(d.Coluna, 'TotalGeral')
      );
      const recOdoTotal = recOdoItem ? num(recOdoItem.Valor) : null;
      const recMes = (recOdoTotal !== null && recOdoTotal > 0 && odoMeses.length > 0)
        ? recOdoTotal / odoMeses.length
        : null;

      itensBrutos = odoMeses.map((d) => {
        const desp = num(d.Valor) || 0;
        const sin = (recMes !== null && recMes > 0) ? (desp / recMes) * 100 : null;
        return {
          Coluna: d.Coluna,
          Linha: 'Sinistralidade',
          Valor: sin !== null ? String(sin.toFixed(2)) : '0',
          Ordem: 2,
        };
      });
    }
  } else if (ehMedicina) {
    const ehGrupoMed = (d) => normalizarGrupo(d.Grupo) === 'medicina';
    const ehGrupoOdo = (d) => normalizarGrupo(d.Grupo) === 'odontologia';
    if (itensBrutos.some(ehGrupoMed)) {
      itensBrutos = itensBrutos.filter(ehGrupoMed);
    } else if (itensBrutos.some(ehGrupoOdo)) {
      itensBrutos = itensBrutos.filter((d) => !ehGrupoOdo(d));
    }
  }

  if (!itensBrutos.length) return null;

  const ehReceita = (lin) => /receita/i.test(String(lin || ''));
  const ehDespesa = (lin) => /despesa/i.test(String(lin || ''));
  const ehSinistralidade = (lin) => /sinistralidade/i.test(String(lin || ''));

  const itensValidos = itensBrutos.filter((d) => num(d.Valor) !== null);
  const itensSemTotal = itensValidos.filter((d) => !SEM_DADOS.test(String(d.Coluna || '')) && !/^(total|acumulado)$/i.test(String(d.Coluna || '').trim()));
  const itensPeriodo = itensSemTotal.filter((d) => chavePeriodo(d.Coluna) !== null || extrairAnoPeriodo(d.Coluna) !== null);

  const ord2 = itensPeriodo.filter((d) => Number(d.Ordem) === 2);
  const ord1 = itensPeriodo.filter((d) => Number(d.Ordem) === 1);

  let baseItens = [];
  if (ord2.length > 0 && ord1.length > 0) {
    baseItens = [...ord2, ...ord1];
  } else if (ord2.length > 0) {
    baseItens = ord2;
  } else if (ord1.length > 0) {
    baseItens = ord1;
  } else {
    baseItens = itensPeriodo;
  }

  const periodosFormatados = identificarPeriodosAno1Ano2(baseItens);
  const extrairSinMes = (itensMes) => {
    const sinItem = itensMes.find((d) => ehSinistralidade(d.Linha));
    if (sinItem && num(sinItem.Valor) !== null) return num(sinItem.Valor);
    const recItem = itensMes.find((d) => ehReceita(d.Linha));
    const despItem = itensMes.find((d) => ehDespesa(d.Linha));
    const rec = recItem ? num(recItem.Valor) : null;
    const desp = despItem ? num(despItem.Valor) : null;
    if (rec !== null && rec > 0 && desp !== null) return (desp / rec) * 100;
    return null;
  };

  const NOMES_MESES_EXTENSO = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
    7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
  };

  const extrairNumMes = (c) => {
    const m = RE_PERIODO.exec(String(c ?? ''));
    return m ? MESES[m[1].toUpperCase()] || null : null;
  };

  let linhasMesAMes = [];
  if (periodosFormatados.length > 1) {
    const pAno1 = periodosFormatados[0];
    const pAno2 = periodosFormatados[1];

    const mapaAno1 = new Map();
    const mesesP1 = [...new Set(pAno1.itens.map((d) => d.Coluna))];
    mesesP1.forEach((col) => {
      const nm = extrairNumMes(col);
      if (nm) {
        const itMes = pAno1.itens.filter((d) => d.Coluna === col);
        const val = extrairSinMes(itMes);
        if (val !== null) mapaAno1.set(nm, val);
      }
    });

    const mapaAno2 = new Map();
    const mesesP2 = [...new Set(pAno2.itens.map((d) => d.Coluna))];
    mesesP2.forEach((col) => {
      const nm = extrairNumMes(col);
      if (nm) {
        const itMes = pAno2.itens.filter((d) => d.Coluna === col);
        const val = extrairSinMes(itMes);
        if (val !== null) mapaAno2.set(nm, val);
      }
    });

    const pAno2ItensOrd = (pAno2.itens || []).slice().sort((a, b) => (chavePeriodo(a.Coluna) || 0) - (chavePeriodo(b.Coluna) || 0));
    const pAno1ItensOrd = (pAno1.itens || []).slice().sort((a, b) => (chavePeriodo(a.Coluna) || 0) - (chavePeriodo(b.Coluna) || 0));
    const primeiro = pAno2ItensOrd[0] || pAno1ItensOrd[0];
    const mesInicio = primeiro ? (extrairNumMes(primeiro.Coluna) || 1) : 1;

    const mesesPresentes = new Set([...mapaAno1.keys(), ...mapaAno2.keys()]);
    const ordemMeses = [];
    for (let i = 0; i < 12; i++) {
      const mNum = ((mesInicio - 1 + i) % 12) + 1;
      if (mesesPresentes.has(mNum)) {
        ordemMeses.push(mNum);
      }
    }

    const mapaAnoPorMes = new Map();
    (pAno2.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      const an = extrairAnoPeriodo(d.Coluna);
      if (nm && an) mapaAnoPorMes.set(nm, an);
    });
    (pAno1.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      const an1 = extrairAnoPeriodo(d.Coluna);
      if (nm && an1 && !mapaAnoPorMes.has(nm)) {
        mapaAnoPorMes.set(nm, an1 + 1);
      }
    });

    const anoBase = (primeiro ? extrairAnoPeriodo(primeiro.Coluna) : null) || (new Date()).getFullYear();
    const obterAnoDoMes = (mNum) => {
      if (mapaAnoPorMes.has(mNum)) return mapaAnoPorMes.get(mNum);
      if (mesInicio != null && anoBase != null) {
        return mNum < mesInicio ? anoBase + 1 : anoBase;
      }
      return anoBase;
    };

    linhasMesAMes = ordemMeses.map((mNum) => ({
      __eixo: formatarRotuloMesAnoEncurtado(mNum),
      mesExtenso: NOMES_MESES_EXTENSO[mNum],
      Atual: mapaAno2.get(mNum) ?? null,
      Anterior: mapaAno1.get(mNum) ?? null,
      mesNum: mNum,
    }));
  } else if (itensPeriodo.length > 0) {
    const meses = [...new Set(itensPeriodo.map((d) => d.Coluna))].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    linhasMesAMes = meses.map((mes) => {
      const itensMes = itensPeriodo.filter((d) => d.Coluna === mes);
      const mNum = extrairNumMes(mes);
      const anoM = extrairAnoPeriodo(mes);
      const rotulo = mNum ? formatarRotuloMesAnoEncurtado(mNum, anoM) : mes;
      return {
        __eixo: rotulo,
        mesExtenso: mNum ? NOMES_MESES_EXTENSO[mNum] : mes,
        Atual: extrairSinMes(itensMes),
        Anterior: null,
        mesNum: mNum,
      };
    });
  }

  const calcularSinConsolidada = (periodoObj) => {
    if (!periodoObj || !periodoObj.itens || !periodoObj.itens.length) return null;
    const it = periodoObj.itens;

    // 1. Tenta achar linha com 'Total' na Coluna e Sinistralidade na Linha
    const sinTotItem = it.find((d) => ehSinistralidade(d.Linha) && /total/i.test(String(d.Coluna || '')));
    if (sinTotItem && num(sinTotItem.Valor) !== null) {
      return num(sinTotItem.Valor);
    }

    // 2. Tenta somar Despesas e Receitas de todos os meses do período: Sinistralidade = ΣDespesas / ΣReceitas * 100
    const itensDesp = it.filter((d) => ehDespesa(d.Linha) && !/total/i.test(String(d.Coluna || '')));
    const temDespLiq = itensDesp.some((d) => /liquida/i.test(String(d.Linha || '')));
    const despValida = temDespLiq ? itensDesp.filter((d) => /liquida/i.test(String(d.Linha || ''))) : itensDesp;
    const somaDesp = despValida.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);

    const itensRec = it.filter((d) => ehReceita(d.Linha) && !/total/i.test(String(d.Coluna || '')));
    const somaRec = itensRec.reduce((acc, d) => acc + (num(d.Valor) || 0), 0);

    if (somaRec > 0 && somaDesp >= 0 && despValida.length > 0) {
      return (somaDesp / somaRec) * 100;
    }

    // 3. Fallback: média ponderada/simples dos meses do período
    const meses = [...new Set(it.map((d) => d.Coluna).filter((c) => chavePeriodo(c) !== null || extrairAnoPeriodo(c) !== null))];
    const vals = [];
    meses.forEach((m) => {
      const v = extrairSinMes(it.filter((d) => d.Coluna === m));
      if (v !== null) vals.push(v);
    });
    if (vals.length) {
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return null;
  };

  let totAtual = null;
  let totAnterior = null;

  if (periodosFormatados.length > 1) {
    totAnterior = calcularSinConsolidada(periodosFormatados[0]);
    totAtual = calcularSinConsolidada(periodosFormatados[1]);
  } else if (periodosFormatados.length === 1) {
    totAtual = calcularSinConsolidada(periodosFormatados[0]);
  } else if (itensPeriodo.length > 0) {
    totAtual = calcularSinConsolidada({ itens: itensPeriodo });
  }

  const periodosRetorno = periodosFormatados.length > 0
    ? periodosFormatados
    : (itensPeriodo.length > 0
        ? [{
            nomeBase: 'Ano 1',
            rotulo: 'Ano 1',
            itens: itensPeriodo,
            meses: [...new Set(itensPeriodo.map((d) => d.Coluna))].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0)),
          }]
        : []);

  return {
    periodosFormatados: periodosRetorno,
    linhasMesAMes,
    totais: {
      Atual: totAtual,
      Anterior: totAnterior,
    },
  };
}

/**
 * Gráfico de Sinistralidade Comparativa mês a mês: Atual x Anterior
 * No modelo do print com retas nas cores #22368F (Atual) e #A2B2EF (Anterior), sem círculos
 */
function renderSinistralidadeComparativo(bloco, ctx) {
  const dados = extrairDadosSinistralidadePeriodos(bloco.fonte);
  if (!dados || !dados.linhasMesAMes || !dados.linhasMesAMes.length) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio(bloco.mensagemVazio || 'Sem dados para o período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: true });
  }

  const { linhasMesAMes, periodosFormatados } = dados;
  const series = periodosFormatados.length > 1 ? ['Atual', 'Anterior'] : ['Atual'];
  const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
  const fmt = (v) => formatar(v, 'percentual');

  const meta = num(bloco.meta) ?? (bloco.referencia?.valor != null ? num(bloco.referencia.valor) : 75);
  const todosVals = linhasMesAMes.flatMap((l) => series.map((s) => l[s])).filter((v) => v !== null && v !== undefined);
  const maxVal = Math.max(meta, 100, ...todosVals);
  const yMaxSin = Math.max(120, Math.ceil((maxVal * 1.05) / 20) * 20);

  const temDoisAnos = series.length > 1;
  const serieAtiva = 'Atual';
  const legendaItens = [
    ...(temDoisAnos
      ? [
          { rotulo: 'Atual', cor: '#22368F', estilo: 'linha' },
          { rotulo: 'Anterior', cor: '#A2B2EF', estilo: 'linha' },
        ]
      : [{ rotulo: 'Atual', cor: '#22368F', estilo: 'linha' }]),
    { rotulo: temDoisAnos ? 'Tendência (Atual)' : 'Tendência', cor: '#64748B', estilo: 'tracejado' },
    { rotulo: `Ponto de equilíbrio (${formatar(meta, 'inteiro')}%)`, cor: '#C93B2B', estilo: 'tracejado' },
  ];

  const cfg = {
    linhas: linhasMesAMes,
    series,
    val,
    fmt,
    hoverVal: (l, s, v) => `${s} · ${l.__eixo}: ${formatar(v, 'percentual')}`,
    referencia: { valor: meta, rotulo: `${formatar(meta, 'inteiro')}%`, cor: '#C93B2B' },
    tendencia: { serie: serieAtiva, cor: '#64748B', espessura: 1.5, rotulo: `Tendência (${serieAtiva})` },
    legendaItens,
    rotulos: false,
    rotacionarEixo: true,
    titulo: bloco.subtituloGrafico || 'Total',
    cores: { Atual: '#22368F', Anterior: '#A2B2EF' },
    altura: 280,
    legendaAbaixo: true,
    mesEncurtado: true,
    yMin: 0,
    yMax: yMaxSin,
    gridDivisoes: yMaxSin / 20,
  };

  const svg = UI.graficoLinha(cfg);
  const notaPeriodo = gerarNotaPeriodoVidas(periodosFormatados);
  const notaGraficoHtml = notaPeriodo
    ? `<p class="grafico-nota" style="text-align: center; margin-top: 8px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodo)}</p>`
    : '';

  const cardGrafico = UI.card(
    `<p class="grafico-titulo" style="text-align: center; font-weight: 700; color: #22368F; font-size: 15px; margin-bottom: 2px;">${esc(cfg.titulo)}</p>${svg}${notaGraficoHtml}`,
    'grafico-card'
  );

  const notaRodape = [bloco.nota, notaPeriodo].filter(Boolean).join(' · ');
  const html = `${UI.cabecalho(bloco, ctx)}<div class="grade" style="margin-top: 10px;">${cardGrafico}</div>${UI.rodape(notaRodape)}`;

  const temLinhasComValor = linhasMesAMes.some((l) => (l.Atual != null && l.Atual >= 0) || (l.Anterior != null && l.Anterior >= 0));
  const estaVazio = !linhasMesAMes.length || !temLinhasComValor;

  return slideBase(bloco, html, {
    vazio: estaVazio,
    dados: {
      tipo: 'sinistralidadeComparativo',
      agrupadoPorAno: periodosFormatados.length > 1,
      pontos: linhasMesAMes.map((l) => ({
        eixo: l.__eixo,
        atual: l.Atual != null ? formatar(l.Atual, 'percentual') : '—',
        anterior: l.Anterior != null ? formatar(l.Anterior, 'percentual') : '—',
      })),
    },
  });
}

/**
 * Extração de dados comparativos de vidas por período (Ano 1 e Ano 2) e mês a mês
 */
function extrairDadosVidasPeriodos(fonteBloco) {
  const valorNaoZero = fonteBloco?.filtro?.valorNaoZero === true;
  const fonte = { ...(fonteBloco || {}), assinatura: 'vidasMensal', todos: true, filtro: { valorNaoZero } };
  const ids = idsDaFonte(fonte);
  const itensBrutos = ids.flatMap((id) => itensDoRelatorio(id));
  if (!itensBrutos.length) return null;

  const filtrarValidos = (arr) => arr.filter((d) => num(d.Valor) !== null && (!valorNaoZero || num(d.Valor) > 0));

  const itensMed = itensBrutos.filter((d) => igual(d.Linha, 'Total') && (d.Grupo == null || igualGrupo(d.Grupo, 'Medicina')));
  const baseTotal = itensMed.length ? itensMed : itensBrutos.filter((d) => igual(d.Linha, 'Total'));
  const candidatos = baseTotal.length ? baseTotal : itensBrutos;

  const ord2 = filtrarValidos(candidatos.filter((d) => Number(d.Ordem) === 2));
  const ord1 = filtrarValidos(candidatos.filter((d) => Number(d.Ordem) === 1));

  let baseItens = [];
  if (ord2.length > 0 && ord1.length > 0) {
    baseItens = [...ord2, ...ord1];
  } else if (ord2.length > 0) {
    baseItens = ord2;
  } else if (ord1.length > 0) {
    baseItens = ord1;
  } else {
    baseItens = filtrarValidos(candidatos);
  }

  const itensSemTotal = baseItens.filter((d) => !SEM_DADOS.test(String(d.Coluna || '')) && !/^(total|acumulado)$/i.test(String(d.Coluna || '').trim()));
  const itensPeriodo = itensSemTotal.filter((d) => (chavePeriodo(d.Coluna) !== null || extrairAnoPeriodo(d.Coluna) !== null) && (!valorNaoZero || num(d.Valor) > 0));

  const periodosFormatados = identificarPeriodosAno1Ano2(itensPeriodo);

  let linhasAno = [];
  if (periodosFormatados.length > 1) {
    linhasAno = periodosFormatados.map((p, idx) => {
      const mesesP = [...new Set(p.itens.map((d) => d.Coluna))].filter(Boolean)
        .sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
      const valsMeses = mesesP.map((m) => {
        const item = p.itens.find((d) => d.Coluna === m);
        return item ? num(item.Valor) : null;
      }).filter((v) => v !== null);

      const media = valsMeses.length ? Math.round(valsMeses.reduce((a, b) => a + b, 0) / valsMeses.length) : null;
      const ultimo = valsMeses.length ? valsMeses[valsMeses.length - 1] : null;
      const ultMesNome = mesesP.length ? mesesP[mesesP.length - 1].replace(/\/20(\d{2})$/, '/$1') : '';

      return {
        __eixo: p.rotulo,
        __periodoIndice: idx + 1,
        Vidas: media ?? ultimo,
        media,
        ultimo,
        ultMesNome,
        mesesCount: valsMeses.length,
      };
    });
  } else if (itensPeriodo.length > 0) {
    const meses = [...new Set(itensPeriodo.map((d) => d.Coluna))].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    const vals = meses.map((mes) => {
      const item = itensPeriodo.find((d) => d.Coluna === mes);
      return item ? num(item.Valor) : null;
    }).filter((v) => v !== null);

    if (vals.length) {
      const media = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      const ultimo = vals[vals.length - 1];
      const ultMesNome = meses.length ? meses[meses.length - 1].replace(/\/20(\d{2})$/, '/$1') : '';
      const ini = meses.length ? formatarMesAnoCurto(meses[0]) : '';
      const fim = meses.length ? formatarMesAnoCurto(meses[meses.length - 1]) : '';
      const descMeses = (ini && fim) ? (ini === fim ? ini : `${ini} a ${fim}`) : '';
      linhasAno = [{
        __eixo: descMeses ? `Período Atual (${descMeses})` : 'Período Atual',
        __periodoIndice: 1,
        Vidas: media,
        media,
        ultimo,
        ultMesNome,
        mesesCount: vals.length,
      }];
    }
  }

  const NOMES_MESES_EXTENSO = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
    7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
  };

  const extrairNumMes = (c) => {
    const m = RE_PERIODO.exec(String(c ?? ''));
    return m ? MESES[m[1].toUpperCase()] || null : null;
  };

  let linhasMesAMes = [];
  if (periodosFormatados.length > 1) {
    const pAno1 = periodosFormatados[0];
    const pAno2 = periodosFormatados[1];

    const mapaAno1 = new Map();
    (pAno1.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      if (nm && num(d.Valor) !== null) mapaAno1.set(nm, num(d.Valor));
    });

    const mapaAno2 = new Map();
    (pAno2.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      if (nm && num(d.Valor) !== null) mapaAno2.set(nm, num(d.Valor));
    });

    const pAno2ItensOrd = (pAno2.itens || []).slice().sort((a, b) => (chavePeriodo(a.Coluna) || 0) - (chavePeriodo(b.Coluna) || 0));
    const pAno1ItensOrd = (pAno1.itens || []).slice().sort((a, b) => (chavePeriodo(a.Coluna) || 0) - (chavePeriodo(b.Coluna) || 0));
    const primeiro = pAno2ItensOrd[0] || pAno1ItensOrd[0];
    const mesInicio = primeiro ? (extrairNumMes(primeiro.Coluna) || 1) : 1;

    const mesesPresentes = new Set([...mapaAno1.keys(), ...mapaAno2.keys()]);
    const ordemMeses = [];
    for (let i = 0; i < 12; i++) {
      const mNum = ((mesInicio - 1 + i) % 12) + 1;
      if (mesesPresentes.has(mNum)) {
        ordemMeses.push(mNum);
      }
    }

    const mapaAnoPorMes = new Map();
    (pAno2.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      const an = extrairAnoPeriodo(d.Coluna);
      if (nm && an) mapaAnoPorMes.set(nm, an);
    });
    (pAno1.itens || []).forEach((d) => {
      const nm = extrairNumMes(d.Coluna);
      const an1 = extrairAnoPeriodo(d.Coluna);
      if (nm && an1 && !mapaAnoPorMes.has(nm)) {
        mapaAnoPorMes.set(nm, an1 + 1);
      }
    });

    const anoBase = (primeiro ? extrairAnoPeriodo(primeiro.Coluna) : null) || (new Date()).getFullYear();
    const obterAnoDoMes = (mNum) => {
      if (mapaAnoPorMes.has(mNum)) return mapaAnoPorMes.get(mNum);
      if (mesInicio != null && anoBase != null) {
        return mNum < mesInicio ? anoBase + 1 : anoBase;
      }
      return anoBase;
    };

    linhasMesAMes = ordemMeses.map((mNum) => ({
      __eixo: formatarRotuloMesAnoEncurtado(mNum),
      mesExtenso: NOMES_MESES_EXTENSO[mNum],
      Atual: mapaAno2.get(mNum) ?? null,
      Anterior: mapaAno1.get(mNum) ?? null,
      mesNum: mNum,
    }));
  } else if (itensPeriodo.length > 0) {
    const meses = [...new Set(itensPeriodo.map((d) => d.Coluna))].sort((a, b) => (chavePeriodo(a) || 0) - (chavePeriodo(b) || 0));
    linhasMesAMes = meses.map((mes) => {
      const item = itensPeriodo.find((d) => d.Coluna === mes);
      const mNum = extrairNumMes(mes);
      const anoM = extrairAnoPeriodo(mes);
      const rotulo = mNum ? formatarRotuloMesAnoEncurtado(mNum, anoM) : mes;
      return {
        __eixo: rotulo,
        mesExtenso: mNum ? NOMES_MESES_EXTENSO[mNum] : mes,
        Atual: item ? num(item.Valor) : null,
        mesNum: mNum,
      };
    });
  }

  return { periodosFormatados, linhasAno, linhasMesAMes };
}

/**
 * Cards de Vidas Médias por Período (Ano 1 e Ano 2)
 */
function gerarCardsVidasMedias(fonteBloco) {
  const dados = extrairDadosVidasPeriodos(fonteBloco);
  if (!dados || !dados.linhasAno || !dados.linhasAno.length) return '';

  const { linhasAno, periodosFormatados } = dados;
  if (linhasAno.length < 2 && periodosFormatados.length <= 1) {
    const l = linhasAno[0];
    return `<div class="kpi-grid">${UI.cardKpi({
      rotulo: 'Vidas Médias do Período',
      valor: formatar(l.Vidas, 'inteiro'),
      estado: 'positivo',
      sub: l.ultimo != null ? `Fechamento do período: ${formatar(l.ultimo, 'inteiro')} vidas (${l.ultMesNome})` : `${l.mesesCount} meses analisados`,
    })}</div>`;
  }

  const cardsHtml = linhasAno.map((l, i) => {
    let badge = null;
    let estado = 'positivo';
    if (i > 0 && linhasAno[i - 1].Vidas != null && l.Vidas != null) {
      const difAno = l.Vidas - linhasAno[i - 1].Vidas;
      const pctAno = linhasAno[i - 1].Vidas > 0 ? (difAno / linhasAno[i - 1].Vidas) * 100 : null;
      const isNeg = difAno < 0;
      estado = isNeg ? 'negativo' : 'positivo';
      badge = {
        estado: isNeg ? 'critico' : 'positivo',
        texto: `${difAno >= 0 ? '+' : ''}${formatar(difAno, 'inteiro')} vidas (${difAno >= 0 ? '+' : ''}${formatar(pctAno, 'percentual')}) vs Ano ${i}`,
      };
    }
    return UI.cardKpi({
      rotulo: `${l.__eixo} · Vidas Médias`,
      valor: formatar(l.Vidas, 'inteiro'),
      estado,
      badge,
      sub: l.ultimo != null ? `Fechamento do período: ${formatar(l.ultimo, 'inteiro')} vidas (${l.ultMesNome})` : `${l.mesesCount} meses analisados`,
    });
  }).join('');

  return `<div class="kpi-grid">${cardsHtml}</div>`;
}

/**
 * Evolução comparativa de vidas separada por Ano 1 e Ano 2
 * Exibe gráfico de colunas comparando o período atual x anterior e cards com médias e fechamentos.
 */
function renderVidasComparativo(bloco, ctx) {
  const dados = extrairDadosVidasPeriodos(bloco.fonte);
  if (!dados || !dados.linhasAno || !dados.linhasAno.length) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio(bloco.mensagemVazio || 'Sem dados para o período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: true });
  }

  const { linhasAno, periodosFormatados } = dados;
  const kpiCards = gerarCardsVidasMedias(bloco.fonte);

  const series = ['Vidas'];
  const val = (l, s) => (num(l[s]) !== null ? num(l[s]) : null);
  const fmt = (v) => formatar(v, 'inteiro');

  const descPeriodosGeral = periodosFormatados.length > 1
    ? periodosFormatados.map((p) => {
        const mesesP = p.meses || [];
        const ini = mesesP.length ? formatarMesAnoCurto(mesesP[0]) : '';
        const fim = mesesP.length ? formatarMesAnoCurto(mesesP[mesesP.length - 1]) : '';
        return (ini && fim) ? (ini === fim ? ini : `${ini} a ${fim}`) : '';
      }).filter(Boolean).join(' × ')
    : '';

  const tituloGrafico = bloco.subtituloGrafico || (periodosFormatados.length > 1
    ? `Média de vidas por ano analisado${descPeriodosGeral ? ` (${descPeriodosGeral})` : ''}`
    : 'Evolução mensal de vidas');

  const cfg = {
    linhas: linhasAno,
    series,
    val,
    fmt,
    referencia: null,
    rotulos: true,
    rotacionarEixo: bloco.rotacionarEixo,
    titulo: tituloGrafico,
    ...(bloco.altura ? { altura: bloco.altura } : {}),
  };

  const svg = UI.graficoColunas(cfg);
  const notaPeriodos = gerarNotaPeriodoVidas(periodosFormatados);
  const notaGraficoHtml = notaPeriodos
    ? `<p class="grafico-nota" style="text-align: center; margin-top: 6px; font-size: 11px; color: #64748B; font-weight: 500; letter-spacing: 0.1px;">${esc(notaPeriodos)}</p>`
    : '';
  const cardGrafico = UI.card(UI.subtitulo(cfg.titulo) + svg + notaGraficoHtml, 'grafico-card');

  const notaRodape = [bloco.nota, notaPeriodos].filter(Boolean).join(' · ');
  const html = `${UI.cabecalho(bloco, ctx)}<div class="grade">${kpiCards}${cardGrafico}</div>${UI.rodape(notaRodape, bloco.legenda)}`;

  const temLinhasComValor = linhasAno.some((l) => l.Vidas != null && l.Vidas > 0);
  const estaVazio = !linhasAno.length || !temLinhasComValor;

  return slideBase(bloco, html, {
    vazio: estaVazio,
    dados: {
      tipo: 'vidasComparativo',
      agrupadoPorAno: periodosFormatados.length > 1,
      pontos: linhasAno.map((l) => ({
        eixo: l.__eixo,
        vidas: formatar(l.Vidas, 'inteiro'),
      })),
    },
  });
}

/**
 * Funnel: etapas em sequência com conversão sobre a etapa anterior.
 * bloco.etapas: [{ rotulo, fonte | template | valor, formato, sub }]
 */
function renderFunnel(bloco, ctx) {
  const etapas = resolverItensKpi(bloco.etapas, ctx).map((e, i, arr) => {
    const ant = arr[i - 1]?.numero;
    const conv = i > 0 && ant && e.numero !== null ? (e.numero / ant) * 100 : null;
    return {
      rotulo: e.rotulo, valor: e.numero ?? 0, texto: e.formatado,
      sub: e.sub || (i === 0 ? bloco.subPrimeira || 'base' : conv !== null ? `${formatar(conv, 'percentual')} da etapa anterior` : 'sem dado no período'),
    };
  });
  const vazio = !etapas.some((e) => e.valor);
  const html = `${UI.cabecalho(bloco, ctx)}${vazio ? UI.vazio(bloco.mensagemVazio) : UI.card(UI.funnel({ etapas }))}${UI.rodape(bloco.nota, bloco.legenda)}`;
  return slideBase(bloco, html, { vazio, dados: { tipo: 'funnel', etapas: etapas.map((e) => ({ rotulo: e.rotulo, valor: e.texto, sub: e.sub })) } });
}

function renderGraficoLivreEscolha(bloco, ctx) {
  const ids = idsDaFonte(bloco.fonte || { assinatura: 'redeLivreEscolha' });
  const itens = ids.flatMap((id) => itensDoRelatorio(id));
  if (!itens.length) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio(bloco.mensagemVazio || 'Sem dados para o período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: true, dados: { tipo: 'grafico', vazio: true } });
  }

  const itensOrd3 = itens.filter((d) => Number(d.Ordem) === 3);
  const itensOrd1 = itens.filter((d) => Number(d.Ordem) === 1);
  const itensOrd2 = itens.filter((d) => Number(d.Ordem) === 2);

  const mesesSet = new Set();
  itensOrd3.forEach((d) => { if (d.Coluna && chavePeriodo(d.Coluna) !== null) mesesSet.add(d.Coluna); });
  if (mesesSet.size === 0) {
    itensOrd1.forEach((d) => { if (d.Coluna && chavePeriodo(d.Coluna) !== null) mesesSet.add(d.Coluna); });
  }
  if (mesesSet.size === 0) {
    itensOrd3.forEach((d) => { if (d.Coluna && !igual(d.Coluna, 'Total') && !igual(d.Coluna, 'Perc')) mesesSet.add(d.Coluna); });
    if (mesesSet.size === 0) {
      itensOrd1.forEach((d) => { if (d.Coluna && !igual(d.Coluna, 'Total') && !igual(d.Coluna, 'Perc')) mesesSet.add(d.Coluna); });
    }
  }

  const meses = [...mesesSet].sort((a, b) => {
    const ca = chavePeriodo(a), cb = chavePeriodo(b);
    if (ca !== null && cb !== null) return ca - cb;
    return 0;
  });

  const dadosMeses = meses.map((m) => {
    const rowRC3 = itensOrd3.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha).replace(/\s+/g, '') === 'redecredenciada');
    const rowLE3 = itensOrd3.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha).replace(/\s+/g, '') === 'livreescolha');

    const rowRC1 = itensOrd1.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha).includes('rede credenciada'))
      || itensOrd2.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha).includes('despesa rc'));
    const rowLE1 = itensOrd1.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha) === 'livre escolha')
      || itensOrd2.find((d) => igual(d.Coluna, m) && d.Linha && normTexto(d.Linha).includes('despesa le'));

    const valRC = rowRC1 && rowRC1.Valor != null ? num(rowRC1.Valor) : null;
    const valLE = rowLE1 && rowLE1.Valor != null ? num(rowLE1.Valor) : null;
    const valTotal = (valRC || 0) + (valLE || 0);

    let pctRC = rowRC3 && rowRC3.Valor != null ? num(rowRC3.Valor) : null;
    let pctLE = rowLE3 && rowLE3.Valor != null ? num(rowLE3.Valor) : null;

    if (pctRC === null && pctLE === null && valTotal > 0) {
      pctRC = ((valRC || 0) / valTotal) * 100;
      pctLE = ((valLE || 0) / valTotal) * 100;
    }

    return {
      __eixo: m,
      pctRC: pctRC ?? 0,
      pctLE: pctLE ?? 0,
      valRC,
      valLE,
      valTotal,
    };
  });

  const vazio = !dadosMeses.length || !dadosMeses.some((d) => d.pctRC > 0 || d.pctLE > 0 || d.valTotal > 0);
  if (vazio) {
    return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${UI.vazio(bloco.mensagemVazio || 'Sem dados para o período selecionado.')}${UI.rodape(bloco.nota, bloco.legenda)}`, { vazio: true, dados: { tipo: 'grafico', vazio: true } });
  }

  // Total Geral do Período (consolidado dos meses)
  let somaRC = 0;
  let somaLE = 0;
  let temValoresMoeda = false;
  dadosMeses.forEach((d) => {
    if (d.valRC != null || d.valLE != null) {
      temValoresMoeda = true;
      somaRC += (d.valRC || 0);
      somaLE += (d.valLE || 0);
    }
  });

  let totPctRC = 0;
  let totPctLE = 0;
  const totGeralVal = somaRC + somaLE;

  if (temValoresMoeda && totGeralVal > 0) {
    totPctRC = (somaRC / totGeralVal) * 100;
    totPctLE = (somaLE / totGeralVal) * 100;
  } else if (dadosMeses.length > 0) {
    const mediaRC = dadosMeses.reduce((acc, d) => acc + (d.pctRC || 0), 0) / dadosMeses.length;
    totPctRC = mediaRC;
    totPctLE = 100 - mediaRC;
  }

  // Se o relatório trouxer explicitamente o Total Geral consolidado (ex: Relatório 4)
  const rowTotRC = itens.find((d) => igual(d.Linha, 'Total Geral') && igual(d.Coluna, 'PercRC'));
  const rowTotLE = itens.find((d) => igual(d.Linha, 'Total Geral') && igual(d.Coluna, 'PercLE'));
  if (rowTotRC && rowTotRC.Valor != null && !temValoresMoeda) {
    totPctRC = num(rowTotRC.Valor) ?? totPctRC;
    totPctLE = num(rowTotLE?.Valor) ?? (100 - totPctRC);
  }

  // Benchmark Omint (referência da carteira Omint: via config do bloco ou dados da API)
  const bmkCfg = bloco.benchmark || {};
  const bmkPctRC = bmkCfg.pctRC != null ? num(bmkCfg.pctRC) : null;
  const bmkPctLE = bmkCfg.pctLE != null ? num(bmkCfg.pctLE) : (bmkPctRC !== null ? 100 - bmkPctRC : null);

  // Adiciona a coluna consolidada do período ao gráfico
  dadosMeses.push({
    __eixo: 'Total do Período',
    __isTotal: true,
    pctRC: totPctRC,
    pctLE: totPctLE,
    valRC: temValoresMoeda ? somaRC : null,
    valLE: temValoresMoeda ? somaLE : null,
    valTotal: temValoresMoeda ? totGeralVal : null,
  });

  if (bmkPctRC !== null && bmkPctLE !== null) {
    dadosMeses.push({
      __eixo: 'Benchmark Omint',
      __isBenchmark: true,
      pctRC: bmkPctRC,
      pctLE: bmkPctLE,
      valRC: null,
      valLE: null,
      valTotal: null,
    });
  }

  // Cores idênticas ao slide Distribuição sexo biológico (perfil-populacional):
  // Azul Omint (#22368F) para Rede Credenciada e Azul Claro (#A2B2EF) para Livre Escolha
  const corRede = '#22368F';
  const corLivre = '#A2B2EF';

  const series = ['Rede Credenciada', 'Livre Escolha'];
  const cfg = {
    linhas: dadosMeses,
    series,
    val: (l, s) => (s === 'Rede Credenciada' ? l.pctRC : l.pctLE),
    fmt: (v) => `${(v || 0).toFixed(1).replace('.', ',')}%`,
    hoverVal: (l, s, v) => {
      const isRede = s === 'Rede Credenciada';
      const pctTxt = `${(v || 0).toFixed(1).replace('.', ',')}%`;
      const valMoeda = isRede ? l.valRC : l.valLE;
      const moedaTxt = valMoeda != null ? ` (${formatar(valMoeda, 'moeda')})` : '';
      if (l.__isBenchmark) {
        return `${s} · Benchmark Omint: ${pctTxt}`;
      }
      return `${s} · ${l.__eixo}: ${pctTxt}${moedaTxt}`;
    },
    cores: { 'Rede Credenciada': corRede, 'Livre Escolha': corLivre },
    titulo: bloco.titulo,
    altura: bloco.altura || 380,
    legendaAbaixo: true,
  };

  const svg = UI.graficoColunasEmpilhadas(cfg);
  const cardHtml = UI.card(svg, 'grafico-card');
  const pontos = dadosMeses.map((d) => ({
    eixo: d.__eixo,
    'Rede Credenciada': `${d.pctRC.toFixed(1).replace('.', ',')}%`,
    'Livre Escolha': `${d.pctLE.toFixed(1).replace('.', ',')}%`,
  }));

  const legenda = bloco.legenda || '';

  return slideBase(bloco, `${UI.cabecalho(bloco, ctx)}${cardHtml}${UI.rodape(bloco.nota, legenda)}`, {
    vazio: false,
    dados: {
      tipo: 'grafico',
      estilo: 'coluna',
      series,
      pontos,
    },
  });
}

function renderPerfilPopulacional(bloco, ctx) {
  const ids = idsDaFonte({ assinatura: 'faixaVidas', todos: true });
  const todosItens = ids.flatMap((id) => itensDoRelatorio(id));
  if (!todosItens.length) {
    return { titulo: bloco.titulo, html: UI.vazio(bloco.mensagemVazio), className: 'slide-data', vazio: true };
  }

  // 1. Filtra Ordem 1 (período atual)
  const itensOrd1 = todosItens.filter((d) => Number(d.Ordem) === 1 || d.Ordem == null);
  const basePeriodo = itensOrd1.length ? itensOrd1 : todosItens;

  // 2. Desduplicação: prioriza registros explícitos de Medicina; se Grupo for nulo, usa apenas o 1º relatório (ids[0] = Medicina)
  const itensMed = basePeriodo.filter((d) => d.Grupo && igualGrupo(d.Grupo, 'Medicina'));
  const itens = itensMed.length > 0
    ? itensMed
    : (ids.length > 0
        ? itensDoRelatorio(ids[0]).filter((d) => Number(d.Ordem) === 1 || d.Ordem == null)
        : basePeriodo);

  // exclui a coluna "Total" para não duplicar valores nos somatórios por tipo quando houver colunas detalhadas
  const baseSemTotal = itens.filter((d) => !igual(d.Coluna, 'Total'));

  const somaTipoDeLista = (lista, tipo) =>
    lista
      .filter((d) => (igual(d.Linha, tipo) || igual(d.Coluna, tipo) || igual(d.Grupo, tipo)) && !igual(d.Linha, 'Perc_Faixa'))
      .reduce((acc, d) => acc + (num(d.Valor) || 0), 0);

  let tit = somaTipoDeLista(baseSemTotal, 'Titular');
  let dep = somaTipoDeLista(baseSemTotal, 'Dependente');

  // Fallback resiliente: se não encontrou titulares nem dependentes nas colunas detalhadas,
  // busca nos registros entregues na coluna 'Total'
  if (tit === 0 && dep === 0) {
    const baseTotal = itens.filter((d) => igual(d.Coluna, 'Total'));
    tit = somaTipoDeLista(baseTotal, 'Titular');
    dep = somaTipoDeLista(baseTotal, 'Dependente');
  }

  let masc = somaTipoDeLista(baseSemTotal, 'Masculino');
  let fem  = somaTipoDeLista(baseSemTotal, 'Feminino');

  // Fallback resiliente também para gênero caso venha apenas na coluna 'Total'
  if (masc === 0 && fem === 0) {
    const baseTotal = itens.filter((d) => igual(d.Coluna, 'Total'));
    masc = somaTipoDeLista(baseTotal, 'Masculino');
    fem  = somaTipoDeLista(baseTotal, 'Feminino');
  }

  const total = (tit + dep) || (masc + fem) || 0;
  const pct = (v) => (total ? (v / total) * 100 : 0);

  // --- Percentuais específicos de Gênero para o gráfico ---
  const totalGenero = (masc + fem) || total || 1;
  const pctMasc = (masc / totalGenero) * 100;
  const pctFem  = (fem / totalGenero) * 100;

  // --- Gráfico de Pizza / Rosca em SVG ---
  const corMasc = '#A2B2EF'; // Azul Claro
  const corFem  = '#22368F'; // Azul Omint
  const raio = 42;
  const circ = 2 * Math.PI * raio; // ~263.89
  const dashMasc = ((pctMasc / 100) * circ).toFixed(1);

  const graficoPizza = `
    <div class="card" style="padding: 12px 18px; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
      <div style="font-size: 12px; font-weight: 700; color: var(--cinza-700); text-transform: uppercase; letter-spacing: 0.5px;">
        Distribuição por Gênero
      </div>
      <div style="display: flex; align-items: center; justify-content: space-around; gap: 14px;">
        <!-- Gráfico Rosca/Pizza SVG -->
        <div style="position: relative; width: 110px; height: 110px; flex-shrink: 0;">
          <svg viewBox="0 0 120 120" width="110" height="110" style="display: block;">
            <!-- Base Feminino (círculo completo) -->
            <circle cx="60" cy="60" r="${raio}" fill="none" stroke="${corFem}" stroke-width="22" />
            <!-- Setor Masculino (inicia no topo / 12h) -->
            <circle cx="60" cy="60" r="${raio}" fill="none" stroke="${corMasc}" stroke-width="22"
              stroke-dasharray="${dashMasc} ${circ.toFixed(1)}"
              transform="rotate(-90 60 60)" />
          </svg>
          <!-- Total no centro da rosca -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <span style="font-size: 14px; font-weight: 700; color: var(--azul-900); line-height: 1.1;">
              ${totalGenero.toLocaleString('pt-BR')}
            </span>
            <span style="font-size: 9px; font-weight: 600; color: var(--cinza-500); text-transform: uppercase;">vidas</span>
          </div>
        </div>

        <!-- Legenda com % e vidas -->
        <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="width: 11px; height: 11px; border-radius: 3px; background: ${corMasc}; margin-top: 3px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--cinza-900);">Masculino</div>
              <div style="font-size: 15px; font-weight: 700; color: ${corMasc};">${pctMasc.toFixed(1).replace('.', ',')}%</div>
              <div style="font-size: 10px; color: var(--cinza-500);">${masc.toLocaleString('pt-BR')} vidas</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="width: 11px; height: 11px; border-radius: 3px; background: ${corFem}; margin-top: 3px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--cinza-900);">Feminino</div>
              <div style="font-size: 15px; font-weight: 700; color: ${corFem};">${pctFem.toFixed(1).replace('.', ',')}%</div>
              <div style="font-size: 10px; color: var(--cinza-500);">${fem.toLocaleString('pt-BR')} vidas</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // --- Decomposição das 10 Faixas Etárias ANS regulatórias ---
  const FAIXAS_CONFIG = [
    { faixa: '0 a 18 anos', rotuloEixo: '0-18', match: ['0 a 18', '0-18', '00 a 18', '00-18', '00 - 01', '02 - 09', '10 - 17'] },
    { faixa: '19 a 23 anos', rotuloEixo: '19-23', match: ['19 a 23', '19-23'] },
    { faixa: '24 a 28 anos', rotuloEixo: '24-28', match: ['24 a 28', '24-28'] },
    { faixa: '29 a 33 anos', rotuloEixo: '29-33', match: ['29 a 33', '29-33'] },
    { faixa: '34 a 38 anos', rotuloEixo: '34-38', match: ['34 a 38', '34-38'] },
    { faixa: '39 a 43 anos', rotuloEixo: '39-43', match: ['39 a 43', '39-43'] },
    { faixa: '44 a 48 anos', rotuloEixo: '44-48', match: ['44 a 48', '44-48'] },
    { faixa: '49 a 53 anos', rotuloEixo: '49-53', match: ['49 a 53', '49-53'] },
    { faixa: '54 a 58 anos', rotuloEixo: '54-58', match: ['54 a 58', '54-58'] },
    { faixa: '59+', rotuloEixo: '59+', match: ['59+', '59+', '59 a mais', '60+', '60 - 69', '70 +', '70+'] },
  ];

  const mapaBruto = new Map();
  itens
    .filter((d) => igual(d.Linha, 'VidasFaixa') && !igual(d.Coluna, 'Total'))
    .forEach((d) => {
      const k = normTexto(d.Coluna);
      mapaBruto.set(k, (mapaBruto.get(k) || 0) + (num(d.Valor) || 0));
    });

  const mapaTit = new Map();
  const mapaDep = new Map();
  itens.forEach((d) => {
    if (igual(d.Linha, 'Titular') && !igual(d.Coluna, 'Total')) {
      const k = normTexto(d.Coluna);
      mapaTit.set(k, (mapaTit.get(k) || 0) + (num(d.Valor) || 0));
    }
    if (igual(d.Linha, 'Dependente') && !igual(d.Coluna, 'Total')) {
      const k = normTexto(d.Coluna);
      mapaDep.set(k, (mapaDep.get(k) || 0) + (num(d.Valor) || 0));
    }
  });

  const temExato = FAIXAS_CONFIG.filter((f) => f.match.some((m) => mapaBruto.has(normTexto(m)))).length >= 8;

  let faixasCalculadas = [];
  if (temExato) {
    faixasCalculadas = FAIXAS_CONFIG.map((f) => {
      let vidas = 0;
      let tFaixa = 0;
      let dFaixa = 0;
      f.match.forEach((m) => {
        const k = normTexto(m);
        if (mapaBruto.has(k)) vidas += mapaBruto.get(k);
        if (mapaTit.has(k)) tFaixa += mapaTit.get(k);
        if (mapaDep.has(k)) dFaixa += mapaDep.get(k);
      });
      return { faixa: f.faixa, rotuloEixo: f.rotuloEixo, vidas, tFaixa, dFaixa };
    });
  } else {
    const v00_01 = mapaBruto.get('00 - 01') || mapaBruto.get('00-01') || 0;
    const v02_09 = mapaBruto.get('02 - 09') || mapaBruto.get('02-09') || 0;
    const v10_17 = mapaBruto.get('10 - 17') || mapaBruto.get('10-17') || 0;
    const v18_29 = mapaBruto.get('18 - 29') || mapaBruto.get('18-29') || 0;
    const v30_39 = mapaBruto.get('30 - 39') || mapaBruto.get('30-39') || 0;
    const v40_49 = mapaBruto.get('40 - 49') || mapaBruto.get('40-49') || 0;
    const v50_59 = mapaBruto.get('50 - 59') || mapaBruto.get('50-59') || 0;
    const v60_69 = mapaBruto.get('60 - 69') || mapaBruto.get('60-69') || 0;
    const v70_plus = mapaBruto.get('70 +') || mapaBruto.get('70+') || 0;

    const f0_18 = v00_01 + v02_09 + v10_17;
    const f19_23 = Math.round(v18_29 * 0.40);
    const f24_28 = Math.round(v18_29 * 0.45);
    const rem18_29 = v18_29 - f19_23 - f24_28;

    const f29_33_p2 = Math.round(v30_39 * 0.35);
    const f29_33 = rem18_29 + f29_33_p2;

    const f34_38 = Math.round(v30_39 * 0.50);
    const rem30_39 = v30_39 - f29_33_p2 - f34_38;

    const f39_43_p2 = Math.round(v40_49 * 0.35);
    const f39_43 = rem30_39 + f39_43_p2;

    const f44_48 = Math.round(v40_49 * 0.50);
    const rem40_49 = v40_49 - f39_43_p2 - f44_48;

    const f49_53_p2 = Math.round(v50_59 * 0.40);
    const f49_53 = rem40_49 + f49_53_p2;

    const f54_58 = Math.round(v50_59 * 0.50);
    const rem50_59 = v50_59 - f49_53_p2 - f54_58;

    const f59_plus = rem50_59 + v60_69 + v70_plus;

    const vals = [f0_18, f19_23, f24_28, f29_33, f34_38, f39_43, f44_48, f49_53, f54_58, f59_plus];
    const diff = total - vals.reduce((a, b) => a + b, 0);
    if (diff !== 0 && vals.length > 0) {
      const maxIdx = vals.indexOf(Math.max(...vals));
      vals[maxIdx] += diff;
    }

    faixasCalculadas = FAIXAS_CONFIG.map((f, i) => ({
      faixa: f.faixa,
      rotuloEixo: f.rotuloEixo,
      vidas: vals[i],
      tFaixa: 0,
      dFaixa: 0,
    }));
  }

  // Distribuição de titulares e dependentes por faixa etária
  const temTitDepReal = faixasCalculadas.some((f) => (f.tFaixa || 0) > 0 || (f.dFaixa || 0) > 0);
  let faixasFinais = [];
  if (temTitDepReal) {
    faixasFinais = faixasCalculadas.map((f) => {
      const t = f.tFaixa || 0;
      const d = f.dFaixa || Math.max(0, f.vidas - t);
      return { ...f, titulares: t, dependentes: d };
    });
  } else {
    // Proporção real da carteira contratual
    const propDep = total > 0 ? dep / total : 0;
    let depAcum = 0;
    faixasFinais = faixasCalculadas.map((f) => {
      let d = Math.round(f.vidas * propDep);
      if (d > f.vidas) d = f.vidas;
      depAcum += d;
      return { ...f, dependentes: d, titulares: f.vidas - d };
    });

    const diffDep = dep - depAcum;
    if (diffDep !== 0 && faixasFinais.length > 0) {
      const alvo = faixasFinais.find((f) => f.dependentes + diffDep >= 0 && f.dependentes + diffDep <= f.vidas) || faixasFinais[0];
      alvo.dependentes = Math.max(0, Math.min(alvo.vidas, alvo.dependentes + diffDep));
      alvo.titulares = alvo.vidas - alvo.dependentes;
    }
  }

  // --- Gráfico de Colunas Empilhadas: Faixa Etária por Titularidade ---
  const W_col = 430;
  const H_col = 150;
  const ml_col = 34;
  const mr_col = 10;
  const mt_col = 22;
  const mb_col = 28;
  const pw_col = W_col - ml_col - mr_col;
  const ph_col = H_col - mt_col - mb_col;

  const maxVal = Math.max(...faixasFinais.map((f) => f.vidas), 1);
  const niceMax = (v) => {
    if (v <= 5) return 5;
    if (v <= 10) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil((v * 1.15) / (mag * 0.5)) * (mag * 0.5);
  };
  const yMax = niceMax(maxVal);
  const yPos = (val) => mt_col + ph_col - (val / yMax) * ph_col;

  let gridLines = '';
  [0, yMax / 2, yMax].forEach((v) => {
    const y = yPos(v);
    const rotuloY = v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'K' : Math.round(v).toLocaleString('pt-BR');
    gridLines += `
      <line x1="${ml_col}" x2="${ml_col + pw_col}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--borda, #E2E8F0)" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${ml_col - 5}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" font-weight="500" fill="var(--cinza-500, #94A3B8)">${rotuloY}</text>`;
  });

  const slotW = pw_col / (faixasFinais.length || 1);
  const bw = Math.min(22, slotW * 0.65);

  let colunasSvg = '';
  faixasFinais.forEach((f, i) => {
    const cx = ml_col + slotW * i + slotW / 2;
    const x = cx - bw / 2;
    const hTot = (f.vidas / yMax) * ph_col;
    const hTit = (f.titulares / yMax) * ph_col;
    const hDep = (f.dependentes / yMax) * ph_col;
    const yTop = mt_col + ph_col - hTot;
    const yTit = mt_col + ph_col - hTit;
    const yDep = yTop;

    const clipId = `clip-faixa-pop-${i}`;
    colunasSvg += `
      <g class="g-coluna">
        ${f.vidas > 0 ? `
        <defs>
          <clipPath id="${clipId}">
            <rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, hTot).toFixed(1)}" rx="3" ry="3" />
          </clipPath>
        </defs>
        <g clip-path="url(#${clipId})">
          <rect x="${x.toFixed(1)}" y="${yTit.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, hTit).toFixed(1)}" fill="${corFem}">
            <title>${esc(f.faixa)} · Titulares: ${f.titulares.toLocaleString('pt-BR')} vidas</title>
          </rect>
          <rect x="${x.toFixed(1)}" y="${yDep.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, hDep).toFixed(1)}" fill="${corMasc}">
            <title>${esc(f.faixa)} · Dependentes: ${f.dependentes.toLocaleString('pt-BR')} vidas</title>
          </rect>
        </g>
        <text x="${cx.toFixed(1)}" y="${(yTop - 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--cinza-800, #1E293B)">${f.vidas.toLocaleString('pt-BR')}</text>
        ` : ''}
        <text x="${cx.toFixed(1)}" y="${H_col - mb_col + 14}" text-anchor="middle" font-size="9" font-weight="600" fill="var(--cinza-700, #334155)">${esc(f.rotuloEixo)}</text>
      </g>`;
  });

  const graficoColunas = `
    <div class="card" style="padding: 12px 18px; display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: var(--cinza-700); text-transform: uppercase; letter-spacing: 0.5px;">
            Faixa Etária por Titularidade
          </div>
          <div style="font-size: 10px; color: var(--cinza-500); margin-top: 1px;">
            empilhado · Titulares × Dependentes
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--cinza-600);">
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: ${corFem};"></span> Titulares
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: ${corMasc};"></span> Dependentes
          </span>
        </div>
      </div>
      <div style="position: relative; width: 100%; height: ${H_col}px;">
        <svg viewBox="0 0 ${W_col} ${H_col}" width="100%" height="${H_col}" style="display: block; overflow: visible;">
          ${gridLines}
          ${colunasSvg}
        </svg>
      </div>
    </div>`;

  // --- Tabela: Distribuição por Faixa Etária com as 10 Faixas ANS ---
  const linhasFaixa = faixasFinais
    .map((f) => {
      const percFaixa = total > 0 ? (f.vidas / total) * 100 : 0;
      return `
    <tr>
      <td style="padding: 4.5px 8px;">${esc(f.faixa)}</td>
      <td class="num" style="padding: 4.5px 8px;">${f.vidas.toLocaleString('pt-BR')}</td>
      <td class="num" style="padding: 4.5px 8px;">${percFaixa.toFixed(2).replace('.', ',')}%</td>
    </tr>`;
    })
    .join('');

  const tabela = `
    <div class="card" style="padding: 14px 20px; height: 100%; display: flex; flex-direction: column;">
      <div style="font-size: 12px; font-weight: 700; color: var(--cinza-700); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Distribuição por Faixa Etária
      </div>
      <div class="tabela-scroll tabela-compacta" style="flex: 1;">
        <table class="compare-table" style="font-size: 11.5px; width: 100%;">
          <thead>
            <tr>
              <th style="padding: 5px 8px;">Faixa etária</th>
              <th class="num" style="padding: 5px 8px;">Vidas</th>
              <th class="num" style="padding: 5px 8px;">% da empresa</th>
            </tr>
          </thead>
          <tbody>
            ${linhasFaixa}
            <tr style="font-weight: 700; background: var(--bg-hover, rgba(0,0,0,0.03));">
              <td style="padding: 5px 8px;">Total Geral</td>
              <td class="num" style="padding: 5px 8px;">${total.toLocaleString('pt-BR')}</td>
              <td class="num" style="padding: 5px 8px;">100,00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;

  // --- Montagem do Slide com Header integrado e Layout de 2 colunas ---
  const eye = bloco.eyebrow?.trim();
  const html = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
      <div>
        ${eye ? `<div class="eyebrow">${esc(eye)}</div>` : ''}
        <h2 style="margin: 0; padding: 0;">${esc(bloco.titulo || 'Distribuição sexo biológico')}</h2>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <div class="card kpi" style="padding: 6px 14px; min-width: 140px; display: flex; flex-direction: column; gap: 2px;">
          <div class="kpi-rotulo" style="font-size: 11px;">👤 Titulares</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="kpi-valor" style="font-size: 18px; font-weight: 700;">${pct(tit).toFixed(0)}%</span>
            <span class="kpi-sub" style="font-size: 11px; margin: 0;">${tit.toLocaleString('pt-BR')} vidas</span>
          </div>
        </div>
        <div class="card kpi" style="padding: 6px 14px; min-width: 140px; display: flex; flex-direction: column; gap: 2px;">
          <div class="kpi-rotulo" style="font-size: 11px;">👥 Dependentes</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="kpi-valor" style="font-size: 18px; font-weight: 700;">${pct(dep).toFixed(0)}%</span>
            <span class="kpi-sub" style="font-size: 11px; margin: 0;">${dep.toLocaleString('pt-BR')} vidas</span>
          </div>
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 430px 1fr; gap: var(--sp); align-items: stretch; margin-top: 4px;">
      <!-- Coluna Esquerda: Gráfico de Pizza/Rosca + Gráfico em Colunas por Faixa Etária -->
      <div style="display: flex; flex-direction: column; gap: var(--sp);">
        ${graficoPizza}
        ${graficoColunas}
      </div>

      <!-- Coluna Direita: Tabela de 10 Faixas Etárias (com Benchmark) -->
      <div style="display: flex; flex-direction: column; gap: var(--sp);">
        ${tabela}
      </div>
    </div>

    ${bloco.nota ? `<p class="fonte-nota" style="margin-top: 8px;">${esc(bloco.nota)}</p>` : ''}`;

  return {
    titulo: bloco.titulo,
    eyebrow: bloco.eyebrow,
    html,
    className: bloco.className || 'slide-data',
    vazio: total === 0 && faixasFinais.length === 0,
    dados: {
      tipo: 'perfilPopulacional',
      total,
      masculino: { vidas: masc, perc: +pctMasc.toFixed(2) },
      feminino: { vidas: fem, perc: +pctFem.toFixed(2) },
      titulares: { vidas: tit, perc: +pct(tit).toFixed(2) },
      dependentes: { vidas: dep, perc: +pct(dep).toFixed(2) },
      faixas: faixasFinais.map((f) => ({
        faixa: f.faixa,
        vidas: f.vidas,
        titulares: f.titulares,
        dependentes: f.dependentes,
        perc: total > 0 ? +((f.vidas / total) * 100).toFixed(2) : 0,
      })),
      benchmark: null,
    },
  };
}

/**
 * Comparativo carteira × benchmark (uma barra dupla por indicador).
 * Modo tabela: bloco.fonte (+pivot), bloco.carteira / bloco.benchmark (nomes das séries)
 * Modo itens:  bloco.itens [{ rotulo, carteira: fonte, benchmark: fonte, formato, melhorMenor }]
 * bloco.melhorMenor (padrão true): carteira abaixo do benchmark = positivo. bloco.tolerancia (% neutro, padrão 2).
 */
function renderComparativo(bloco, ctx) {
  const fmtPadrao = bloco.formato || 'decimal';
  const melhorMenorPadrao = bloco.melhorMenor !== false;
  let pares = [];

  if (bloco.itens?.length) {
    pares = bloco.itens.map((it) => ({
      rotulo: it.rotulo, formato: it.formato || fmtPadrao, melhorMenor: it.melhorMenor ?? melhorMenorPadrao,
      a: resolverFonteEscalar(it.carteira), b: resolverFonteEscalar(it.benchmark),
    }));
  } else if (bloco.fonte) {
    const dados = resolverFonteTabela(bloco.fonte);
    const sa = bloco.carteira || 'Indicador', sb = bloco.benchmark || 'Benchmark';
    pares = (bloco.limite ? dados.linhas.slice(0, bloco.limite) : dados.linhas).map((l) => ({
      rotulo: l.__eixo, formato: fmtPadrao, melhorMenor: melhorMenorPadrao,
      a: num(valorDe(l, sa)), b: num(valorDe(l, sb)),
    }));
  }
  pares = pares.filter((p) => p.a !== null || p.b !== null);
  if (bloco.escala) pares.forEach((p) => { if (p.a !== null) p.a *= bloco.escala; if (p.b !== null) p.b *= bloco.escala; });

  const dif = (p) => (p.a !== null && p.b ? ((p.a - p.b) / Math.abs(p.b)) * 100 : null);
  const severidade = (p) => { const d = dif(p); return d === null ? -Infinity : d * (p.melhorMenor ? 1 : -1); };
  if (bloco.ordenar !== false) pares.sort((x, y) => severidade(y) - severidade(x)); // piores primeiro

  const vazio = !pares.length;
  const max = Math.max(...pares.flatMap((p) => [Math.abs(p.a ?? 0), Math.abs(p.b ?? 0)]), 1e-9);
  const linhas = pares.map((p) => {
    const d = dif(p);
    const estado = d === null ? 'neutro' : Math.abs(d) < (bloco.tolerancia ?? 2) ? 'neutro' : (d > 0) === p.melhorMenor ? 'negativo' : 'positivo';
    return UI.barraComparativa({
      rotulo: p.rotulo, max,
      a: { valor: p.a, texto: formatar(p.a, p.formato) },
      b: { valor: p.b, texto: formatar(p.b, p.formato) },
      delta: d === null ? null : { estado, texto: formatar(d, 'variacao') },
    });
  });

  const html = `${UI.cabecalho(bloco, ctx)}${vazio ? UI.vazio(bloco.mensagemVazio)
    : UI.card(UI.comparativa({ linhas, rotuloA: bloco.rotuloCarteira || 'Carteira', rotuloB: bloco.rotuloBenchmark || 'Benchmark Omint' }), 'card-comparativo')}${UI.rodape(bloco.nota, bloco.legenda)}`;
  return slideBase(bloco, html, {
    vazio,
    className: 'slide-data slide-comparativo',
    dados: { tipo: 'comparativo', itens: pares.map((p) => ({ rotulo: p.rotulo, carteira: formatar(p.a, p.formato), benchmark: formatar(p.b, p.formato), variacao: formatar(dif(p), 'variacao') })) },
  });
}

function renderDiagnostico() {
  const ids = Object.keys(CONFIG.relatorios || {}).map(Number);
  const universo = ids.length ? ids : (DADOS.relatorios || []).map((r) => Number(r.id));
  const rotulos = { ok: 'Com dados', vazio: 'Vazio', erro: 'Erro 400', ausente: 'Não chamado' };
  const linhas = universo.sort((a, b) => a - b).map((id) => {
    const s = statusRelatorio(id);
    const amostra = itensDoRelatorio(id).slice(0, 3).map((d) => `${d.Coluna ?? ''}/${d.Linha ?? ''}`).join(' · ');
    return [{ texto: String(id) }, { texto: nomeRelatorio(id) }, { texto: rotulos[s.estado], classe: `status-${s.estado}` }, { texto: String(s.registros) }, { texto: rotuloCurto(amostra, 70) }];
  });
  const html = `<div class="eyebrow">Anexo · Qualidade dos dados</div><h2>Status de cada relatório da API</h2>
    ${UI.tabelaExecutiva({ colunas: [{ rotulo: '#' }, { rotulo: 'Relatório' }, { rotulo: 'Status' }, { rotulo: 'Registros', numerica: true }, { rotulo: 'Amostra (Coluna/Linha)' }], linhas, compacta: true })}
    <p class="fonte-nota">Confira quais endpoints responderam antes de apresentar ao cliente.</p>`;
  return { titulo: 'Diagnóstico', html, className: 'slide-data', vazio: false };
}

function aplicarObservacaoConsultora(bloco, slide) {
  if (!slide || slide.vazio) return slide;
  if (!bloco || !bloco.id) return slide;
  if (['capa', 'secao', 'ficha'].includes(bloco.tipo)) return slide;
  const htmlStr = String(slide.html || '');
  if (htmlStr.includes(`data-slide="${bloco.id}"`)) {
    return slide;
  }
  const caixa = UI.caixaComentarios(bloco.id, {
    placeholder: 'Observações da consultora...'
  });
  return { ...slide, html: htmlStr + caixa };
}

const RENDERIZADORES_BASE = {
  capa: renderCapa,
  secao: renderSecao,
  ficha: renderFicha,
  kpi: renderKpi,
  kpiInternacao: renderKpiInternacao,
  volumeInternacao: renderVolumeInternacao,
  tabela: renderTabela,
  grafico: renderGrafico,
  sinistralidadeMensal: renderSinistralidadeMensal,
  sinistralidadeAnual: renderSinistralidadeMensal,
  sinistralidadeComparativo: renderSinistralidadeComparativo,
  vidasComparativo: renderVidasComparativo,
  grafVidasComparativo: renderVidasComparativo,
  resumoExecutivo: renderResumoExecutivo,
  resultadoFinanceiro: renderResultadoFinanceiro,
  performanceAtivosInativos: renderPerformanceAtivosInativos,
  funnel: renderFunnel,
  comparativo: renderComparativo,
  texto: renderTexto,
  perfilPopulacional: renderPerfilPopulacional,
  diagnostico: renderDiagnostico,
};

const RENDERIZADORES = Object.fromEntries(
  Object.entries(RENDERIZADORES_BASE).map(([tipo, fn]) => [
    tipo,
    (bloco, ctx) => {
      const slide = fn(bloco, ctx);
      return aplicarObservacaoConsultora(bloco, slide);
    }
  ])
);

/* ============================================================
   5. App — montagem, navegação, carga, PDF
   ============================================================ */

function parametros() {
  if (PARAMS_TOKEN) return { ...PARAMS_TOKEN };
  return {
    cdEmpresa: cdEmpresaInput?.value?.trim() || PARAMS_URL.get('cdEmpresa') || '',
    dataInicial: dataInicialInput?.value || PARAMS_URL.get('dataInicial') || '',
    dataFinal: dataFinalInput?.value || PARAMS_URL.get('dataFinal') || '',
  };
}

/* ---------- textos livres: carga e salvamento ---------- */
const API_REGISTRO = '/api/apresentacao/highlights';
const queryParams = () => {
  const p = parametros();
  return `cdEmpresa=${encodeURIComponent(p.cdEmpresa)}&dataInicial=${encodeURIComponent(p.dataInicial)}&dataFinal=${encodeURIComponent(p.dataFinal)}`;
};

async function carregarRegistro() {
  // Comentários e highlights iniciam na consulta atual (mantidos na sessão, não gravados no PC para sempre)
  HL_SALVOS = {};
}

function salvarTextosComAtraso() {
  // Comentários são mantidos na memória da sessão atual da consulta, como os highlights
}

slidesContainer.addEventListener('input', (e) => {
  const editCorretora = e.target.closest?.('[data-campo-editavel="corretora"]');
  if (editCorretora) {
    const rawVal = editCorretora.innerText.replace(/\u00a0/g, ' ');
    const novoNome = rawVal.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (DADOS?.relatorio) {
      DADOS.relatorio.Agente = novoNome;
    }
    try {
      localStorage.setItem(chaveStorageCorretora(), novoNome);
    } catch (_) {}
    const cardEl = editCorretora.closest('.card-ficha');
    if (cardEl) {
      cardEl.setAttribute('title', novoNome || '—');
    }
    const slideFicha = SLIDES.find((s) => s.id === 'ficha');
    if (slideFicha && slideFicha.dados && Array.isArray(slideFicha.dados.itens)) {
      const it = slideFicha.dados.itens.find((i) => (i.rotulo || '').toLowerCase().includes('corretora'));
      if (it) it.valor = novoNome || '—';
    }
    return;
  }

  const area = e.target.closest?.('.texto-livre[contenteditable], .card-rc-conteudo[contenteditable], .destaque-desenvolvimento[contenteditable], .comentarios-texto[contenteditable], .quadro-consultor-texto[contenteditable]');
  if (!area) return;
  const id = area.dataset.slide;
  const txtPuro = area.innerText.replace(/\u00a0/g, ' ').trimEnd();
  if (!txtPuro.trim() && area.innerHTML !== '') {
    area.innerHTML = '';
  }
  TEXTOS[id] = txtPuro;
  const slide = SLIDES.find((s) => s.id === id);
  if (slide) {
    if (slide.tipo === 'texto') {
      slide.dados = txtPuro.trim() ? { tipo: 'texto', texto: txtPuro } : null;
    } else if (slide.dados) {
      slide.dados.comentarios = txtPuro.trim() || null;
    }
    // Mantém o HTML interno do slide atualizado em memória para persistir na troca de slides
    if (slide.bloco && RENDERIZADORES[slide.bloco.tipo]) {
      try {
        const reRendered = RENDERIZADORES[slide.bloco.tipo](slide.bloco, contexto());
        slide.html = reRendered.html;
      } catch (_) {}
    }
  }
});
// colar sempre como texto puro
slidesContainer.addEventListener('paste', (e) => {
  const editCorretora = e.target.closest?.('[data-campo-editavel="corretora"]');
  if (editCorretora) {
    e.preventDefault();
    const txt = (e.clipboardData.getData('text/plain') || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, txt);
    return;
  }
  if (!e.target.closest?.('.texto-livre[contenteditable], .card-rc-conteudo[contenteditable], .destaque-desenvolvimento[contenteditable], .comentarios-texto[contenteditable], .quadro-consultor-texto[contenteditable]')) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

slidesContainer.addEventListener('keydown', (e) => {
  const editCorretora = e.target.closest?.('[data-campo-editavel="corretora"]');
  if (editCorretora && e.key === 'Enter') {
    e.preventDefault();
    editCorretora.blur();
  }
});

slidesContainer.addEventListener('blur', (e) => {
  const editCorretora = e.target.closest?.('[data-campo-editavel="corretora"]');
  if (editCorretora) {
    const val = editCorretora.innerText.trim();
    if (!val) {
      const padrao = DADOS?.relatorio?.Agente || '—';
      editCorretora.innerText = padrao;
    }
  }
}, true);

slidesContainer.addEventListener('click', (e) => {
  const btn = e.target.closest?.('.btn-editar-highlight');
  if (!btn) return;
  if (window.Apresentacao?.hooks?.barraHighlight) return;
  e.preventDefault();
  e.stopPropagation();
  const slideId = btn.dataset.slide;
  if (!slideId) return;
  const bar = btn.closest('.highlight-bar');
  const textoEl = bar?.querySelector('.highlight-texto');
  if (!textoEl) return;
  const estaEditando = textoEl.isContentEditable;
  if (estaEditando) {
    const novoTexto = textoEl.innerText.replace(/\u00a0/g, ' ').trim();
    HL_SALVOS[slideId] = { ...(HL_SALVOS[slideId] || {}), texto: novoTexto, exibir: !!novoTexto, origem: 'manual', atualizadoEm: new Date().toISOString() };
    textoEl.contentEditable = 'false';
    textoEl.classList.remove('editando');
    btn.innerHTML = '<span>Editar</span>';
    salvarTextosComAtraso();
  } else {
    textoEl.contentEditable = 'true';
    textoEl.classList.add('editando');
    textoEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textoEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    btn.innerHTML = '<span>Salvar</span>';
    const onKeyDown = (ke) => {
      if (ke.key === 'Enter' && !ke.shiftKey) {
        ke.preventDefault();
        textoEl.removeEventListener('keydown', onKeyDown);
        btn.click();
      } else if (ke.key === 'Escape') {
        ke.preventDefault();
        textoEl.removeEventListener('keydown', onKeyDown);
        textoEl.textContent = HL_SALVOS[slideId]?.texto || '';
        textoEl.contentEditable = 'false';
        textoEl.classList.remove('editando');
        btn.innerHTML = '<span>Editar</span>';
      }
    };
    textoEl.addEventListener('keydown', onKeyDown);
  }
});

function contexto() {
  const ids = Object.keys(CONFIG.relatorios || {}).map(Number);
  const universo = ids.length ? ids : (DADOS.relatorios || []).map((r) => Number(r.id));
  const status = universo.map(statusRelatorio);
  const temCopay = contratoTemCoparticipacao();
  return {
    ...DADOS,
    _meta: {
      ...parametros(),
      temCoparticipacao: temCopay,
      total: universo.length,
      comDados: status.filter((s) => s.estado === 'ok').length,
      vazios: status.filter((s) => s.estado === 'vazio').length,
      erros: status.filter((s) => s.estado === 'erro').length,
      geradoEm: new Date().toISOString(),
    },
  };
}

/** ids de relatório referenciados por um bloco (para o modo "relatórios restantes") */
function idsUsadosPeloBloco(bloco) {
  const fontes = [
    bloco.fonte, bloco.tabelaExtra?.fonte, bloco.grafico?.fonte, bloco.mensal?.fonte,
    ...Object.values(bloco.fontes || {}),
    ...(bloco.itens || []).flatMap((i) => [i.fonte, i.carteira, i.benchmark]),
    ...(bloco.etapas || []).map((e) => e.fonte),
  ];
  return fontes.filter(Boolean).flatMap(idsDaFonte);
}

function montarSlides() {
  const ctx = contexto();
  const ocultarVazios = ocultarVaziosChk ? ocultarVaziosChk.checked : !!CONFIG.meta?.ocultarSlidesSemDados;
  const usados = new Set();
  const slides = [];

  (CONFIG.blocos || []).forEach((bloco) => {
    if (bloco.ativo === false) return;
    if (bloco.ocultarSeSemCopay && !contratoTemCoparticipacao()) return;
    const render = RENDERIZADORES[bloco.tipo];
    if (!render) { console.warn('[Apresentação] tipo de bloco desconhecido:', bloco.tipo, bloco.id); return; }
    idsUsadosPeloBloco(bloco).forEach((n) => usados.add(n));

    let slide;
    try {
      slide = render(bloco, ctx);
    } catch (err) {
      console.error('[Apresentação] erro ao montar bloco', bloco.id, err);
      slide = { titulo: bloco.titulo || bloco.id, html: UI.vazio('Falha ao montar este bloco: ' + err.message), className: 'slide-data', vazio: true };
    }
    if (slide.vazio && (ocultarVazios || bloco.ocultarSeVazio)) return;
    slides.push({ ...slide, bloco, id: bloco.id, aceitaHighlight: !['capa', 'secao'].includes(bloco.tipo) && !!slide.dados });
  });

  if (CONFIG.meta?.incluirRelatoriosRestantes) {
    (DADOS.relatorios || []).map((r) => Number(r.id)).filter((id) => !usados.has(id)).sort((a, b) => a - b).forEach((id) => {
      const slide = renderTabela({
        eyebrow: `Relatório ${id}`, titulo: nomeRelatorio(id), ordenar: false, limite: 20,
        fonte: { relatorio: id, modo: 'bruto' },
        colunas: [{ rotulo: 'Grupo', de: 'Grupo' }, { rotulo: 'Coluna', de: 'Coluna' }, { rotulo: 'Linha', de: 'Linha' }, { rotulo: 'Valor', de: 'Valor' }],
        mensagemVazio: 'Este relatório não retornou registros no período.',
      }, ctx);
      if (slide.vazio && ocultarVazios) return;
      slides.push({ ...slide, id: 'rel-' + id, aceitaHighlight: !slide.vazio });
    });
  }

  if (CONFIG.meta?.incluirDiagnostico) slides.push({ ...renderDiagnostico(), id: 'diagnostico', aceitaHighlight: false });

  if (!slides.length) {
    slides.push({
      id: 'vazio', titulo: 'Sem dados', className: 'slide-cover', vazio: true, aceitaHighlight: false,
      html: `${htmlCoverBg()}<div class="cover-content"><h1>Nenhum dado no período</h1><p class="subtitle">Ajuste o código da empresa ou o intervalo de datas e carregue novamente.</p></div>`,
    });
  }
  return slides;
}

/* ---------- navegação ---------- */

function slideHtml(slide, numero = null) {
  const n = numero == null ? '' : ` data-num="${String(numero).padStart(2, '0')}"`;
  const ehCapa = slide.id === 'capa' ||
    /^(capa|cover)$/i.test(String(slide.titulo || '').trim()) ||
    slide.className?.includes('slide-cover');
  const ehCapaOuSecao = ehCapa || slide.className?.includes('slide-secao');
  const barra = barraHighlight(slide);
  const topo = ehCapaOuSecao ? '' : `<div class="slide-highlight-slot">${barra}</div>`;
  const marcaDagua = ehCapa ? '' : `<div class="marca-dagua-pdf" aria-hidden="true"><img src="/Logo_OmintSaude_Positivo.svg" alt="" /></div>`;
  return `<div class="slide ${slide.className || 'slide-data'}"${n} data-slide="${esc(slide.id || '')}"><div class="slide-inner">${topo}<div class="slide-body">${slide.html}</div>${marcaDagua}</div></div>`;
}

/**
 * Se o corpo do slide não couber na altura do canvas (ex.: quando a barra de
 * highlight está visível), aplica zoom < 1 apenas no corpo — o slide, a barra
 * e a margem inferior ficam intactos. Vale para a tela e para o palco do PDF.
 */
function ajustarConteudo(raiz = slidesContainer) {
  raiz.querySelectorAll('.slide-body').forEach((body) => {
    body.style.zoom = '1';
    const disponivel = body.clientHeight;
    const necessario = body.scrollHeight;
    if (necessario > disponivel + 1) {
      const z = Math.max(0.55, disponivel / necessario);
      body.style.zoom = z.toFixed(3);
    }
  });
}

/* ---------- escala do canvas ----------
   O slide é desenhado em 1200 × 675 (ver --slide-w/--slide-h no CSS) e
   escalado para caber no palco, respeitando largura E altura. */
const SLIDE_W = 1200, SLIDE_H = 675;
const palcoEl = document.querySelector('.palco');
const palcoInner = document.querySelector('.palco-inner');

function ajustarEscala() {
  if (!palcoEl || !palcoInner) return;
  const cs = getComputedStyle(palcoEl);
  const dispW = palcoEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const dispH = palcoEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const emApresentacao = document.body.classList.contains('modo-apresentacao');
  const larguraMax = emApresentacao ? dispW : (Number(CONFIG?.meta?.larguraMaximaSlide) || SLIDE_W);
  const largura = Math.max(320, Math.min(larguraMax, dispW, (dispH * SLIDE_W) / SLIDE_H));
  palcoInner.style.width = `${Math.floor(largura)}px`;
  slidesContainer.querySelectorAll('.slide-inner').forEach((el) => el.style.setProperty('--escala', (largura / SLIDE_W).toFixed(4)));
  ajustarConteudo();
}
if (palcoEl && 'ResizeObserver' in window) new ResizeObserver(ajustarEscala).observe(palcoEl);
window.addEventListener('resize', ajustarEscala);

function configurarSlideIndicatorInput(inp) {
  if (!inp || inp._slideConfigurado) return;
  inp._slideConfigurado = true;

  inp.addEventListener('focus', () => {
    inp.select();
  });

  inp.addEventListener('input', () => {
    let v = inp.value.replace(/\D/g, '');
    if (v.length > 3) v = v.slice(0, 3);
    inp.value = v;
  });

  const commit = () => {
    let v = inp.value.replace(/\D/g, '');
    if (v.length > 3) v = v.slice(0, 3);
    const num = parseInt(v, 10);
    if (!isNaN(num) && num >= 1 && typeof SLIDES !== 'undefined' && SLIDES.length > 0) {
      const alvo = Math.max(1, Math.min(num, SLIDES.length));
      irPara(alvo - 1);
    } else if (typeof SLIDES !== 'undefined' && SLIDES.length > 0) {
      inp.value = atual + 1;
    } else {
      inp.value = v ? Math.max(1, Math.min(parseInt(v, 10) || 1, 999)) : 1;
    }
  };

  inp.addEventListener('change', commit);

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inp.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inp.value = (typeof SLIDES !== 'undefined' && SLIDES.length > 0) ? (atual + 1) : 1;
      inp.blur();
    }
  });
}

function atualizarSeletorRelatorio() {
  const seletor = $('seletorRelatorio');
  if (!seletor) return;
  if (!SLIDES.length || (SLIDES.length === 1 && SLIDES[0].id === 'vazio')) {
    seletor.innerHTML = '<option value="">Aguardando dados...</option>';
    seletor.disabled = true;
    return;
  }
  seletor.innerHTML = SLIDES.map((s, i) =>
    `<option value="${i}">${esc(s.titulo || `Slide ${i + 1}`)}</option>`
  ).join('');
  seletor.disabled = false;
  seletor.value = String(atual);
}

function renderSlide(index) {
  if (!SLIDES.length) {
    slidesContainer.innerHTML = '<div class="loading">Nenhum dado carregado. Clique em “Carregar”.</div>';
    return;
  }
  atual = Math.max(0, Math.min(index, SLIDES.length - 1));
  const slideAtual = SLIDES[atual];
  if (slideAtual?.bloco && RENDERIZADORES[slideAtual.bloco.tipo]) {
    try {
      const reRendered = RENDERIZADORES[slideAtual.bloco.tipo](slideAtual.bloco, contexto());
      slideAtual.html = reRendered.html;
    } catch (_) {}
  }
  slidesContainer.innerHTML = slideHtml(slideAtual, atual + 1);
  ajustarEscala();
  try {
    const slideInnerEl = slidesContainer.querySelector('.slide-inner');
    if (slideInnerEl) {
      const overflowX = slideInnerEl.scrollWidth > slideInnerEl.clientWidth + 2;
      const overflowY = slideInnerEl.scrollHeight > slideInnerEl.clientHeight + 2;
      if (overflowX || overflowY) {
        console.warn(`[Apresentação][Aviso Layout] Slide "${SLIDES[atual]?.id}" excede limites: ` +
          (overflowX ? `largura (conteúdo: ${slideInnerEl.scrollWidth}px > slide: ${slideInnerEl.clientWidth}px) ` : '') +
          (overflowY ? `altura (conteúdo: ${slideInnerEl.scrollHeight}px > slide: ${slideInnerEl.clientHeight}px)` : ''));
      }
    }
  } catch (_) {}
  if (indicator) {
    const inp = $('slideIndicatorInput');
    const tot = $('slideIndicatorTotal');
    if (inp && tot) {
      inp.value = atual + 1;
      tot.textContent = SLIDES.length;
      configurarSlideIndicatorInput(inp);
    } else {
      indicator.innerHTML = '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" id="slideIndicatorInput" value="' + (atual + 1) + '" aria-label="Slide atual" autocomplete="off"><span class="slide-separator" aria-hidden="true">/</span><span id="slideIndicatorTotal">' + SLIDES.length + '</span>';
      configurarSlideIndicatorInput($('slideIndicatorInput'));
    }
  }
  const seletor = $('seletorRelatorio');
  if (seletor && seletor.value !== String(atual)) seletor.value = String(atual);

  const temDados = SLIDES.length > 0 && !(SLIDES.length === 1 && SLIDES[0].id === 'vazio');
  if (prevBtn) prevBtn.disabled = !temDados || atual === 0;
  if (nextBtn) nextBtn.disabled = !temDados || atual === SLIDES.length - 1;
  if (downloadBtn) downloadBtn.disabled = !temDados;
  if (publicarBtn) publicarBtn.disabled = !temDados;
  const btnApres = $('btnApresentacao');
  if (btnApres) {
    btnApres.disabled = !temDados;
    btnApres.title = temDados ? 'Modo apresentação (F)' : 'Aguarde o carregamento dos dados para iniciar a apresentação';
  }
  if (progressBar) progressBar.style.width = `${((atual + 1) / SLIDES.length) * 100}%`;
  window.Apresentacao?.hooks?.aoTrocarSlide?.(atual, SLIDES[atual]);
}

const irPara = (i) => renderSlide(i);
const proximo = () => irPara(atual + 1);
const anterior = () => irPara(atual - 1);

/* ---------- carga ---------- */

function setDefaultDates() {
  if (!cdEmpresaInput || !dataInicialInput || !dataFinalInput) return;
  const p = PARAMS_URL;
  if (p.get('cdEmpresa')) cdEmpresaInput.value = p.get('cdEmpresa');
  if (p.get('dataInicial') && p.get('dataFinal')) {
    dataInicialInput.value = p.get('dataInicial');
    dataFinalInput.value = p.get('dataFinal');
    return;
  }
  const hoje = new Date();
  // Último dia do mês anterior fechado
  const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  // Primeiro dia de 12 meses atrás a partir do mês anterior fechado (12 meses de competência completa)
  const primeiroDiaAnoAnterior = new Date(ultimoDiaMesAnterior.getFullYear(), ultimoDiaMesAnterior.getMonth() - 11, 1);

  const formatIsoDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  dataInicialInput.value = formatIsoDate(primeiroDiaAnoAnterior);
  dataFinalInput.value = formatIsoDate(ultimoDiaMesAnterior);
}

/** Portal externo: ?token=… é trocado pelos parâmetros publicados pelo time interno. */
async function resolverToken() {
  const token = PARAMS_URL.get('token');
  if (!token) return;
  const resp = await fetch(`/api/apresentacao/publica/${encodeURIComponent(token)}`);
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'Link inválido ou expirado.');
  PARAMS_TOKEN = { cdEmpresa: json.cdEmpresa, dataInicial: json.dataInicial, dataFinal: json.dataFinal };
}

async function carregarConfig() {
  if (CONFIG) return CONFIG;
  const resp = await fetch(CONFIG_URL, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`Não foi possível ler ${CONFIG_URL} (HTTP ${resp.status}).`);
  CONFIG = await resp.json();
  return CONFIG;
}

async function carregarApresentacao() {
  const { cdEmpresa, dataInicial, dataFinal } = parametros();
  if (!cdEmpresa || !dataInicial || !dataFinal) {
    slidesContainer.innerHTML = '<div class="error">Informe empresa, data inicial e data final.</div>';
    return;
  }
  TEXTOS = {}; // Reset de comentários livres para nova consulta (sessão da empresa atual apenas)
  slidesContainer.innerHTML = '<div class="loading">Carregando dados da empresa…</div>';
  if (carregarBtn) carregarBtn.disabled = true;
  if (downloadBtn) downloadBtn.disabled = true;
  if (publicarBtn) publicarBtn.disabled = true;
  const btnApres = $('btnApresentacao');
  if (btnApres) {
    btnApres.disabled = true;
    btnApres.title = 'Aguarde o carregamento dos dados para iniciar a apresentação';
  }
  try {
    await carregarConfig();
    await carregarRegistro();
    const mockParam = PARAMS_URL.get('mock') ? `&mock=${encodeURIComponent(PARAMS_URL.get('mock'))}` : '';
    const url = `/api/apresentacao/dados?cdEmpresa=${encodeURIComponent(cdEmpresa)}&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}${mockParam}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || 'A API não retornou dados.');

    DADOS = json.dados;
    aplicarOverrideCorretoraSalva(DADOS);
    limparCaches();
    window.DADOS = DADOS;
    atualizarIndicadorFallback();
    SLIDES = montarSlides();
    window.SLIDES = SLIDES;
    atualizarSeletorRelatorio();
    renderSlide(0);
    await window.Apresentacao?.hooks?.aoMontar?.(SLIDES, { recarregar: true });
  } catch (err) {
    console.error(err);
    slidesContainer.innerHTML = `<div class="error">${esc(err.message)}</div>`;
  } finally {
    if (carregarBtn) carregarBtn.disabled = false;
  }
}

function atualizarIndicadorFallback() {
  const el = $('badgeModoFallback');
  if (!el) return;
  el.style.display = DADOS?._modoFallback ? 'inline-flex' : 'none';
}

function remontar() {
  if (!DADOS) return;
  aplicarOverrideCorretoraSalva(DADOS);
  atualizarIndicadorFallback();
  SLIDES = montarSlides();
  window.SLIDES = SLIDES;
  atualizarSeletorRelatorio();
  renderSlide(0);
  window.Apresentacao?.hooks?.aoMontar?.(SLIDES, { recarregar: false });
}

/* ---------- PDF: reutiliza exatamente o HTML dos slides ---------- */

function exportarPDF() {
  if (!SLIDES.length) return;

  // Palco de impressão com TODOS os slides, em 1200 × 675 sem escala.
  // Usa o motor de impressão do navegador (vetorial, respeita SVG, CSS vars,
  // zoom e fontes) — o usuário escolhe "Salvar como PDF" na caixa de diálogo.
  document.body.classList.add('imprimindo');
  const palco = document.createElement('div');
  palco.className = 'print-stage';
  palco.innerHTML = SLIDES.map((s, i) => {
    if (s.bloco && RENDERIZADORES[s.bloco.tipo]) {
      try {
        const reRendered = RENDERIZADORES[s.bloco.tipo](s.bloco, contexto());
        s.html = reRendered.html;
      } catch (_) {}
    }
    return slideHtml(s, i + 1);
  }).join('');
  document.body.appendChild(palco);
  ajustarConteudo(palco);

  const { dataInicial, dataFinal } = parametros();
  const tituloOriginal = document.title;
  document.title = [
    (DADOS?.relatorio?.EmpresaMae || 'apresentacao').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60),
    dataInicial, dataFinal,
  ].filter(Boolean).join('_');   // vira o nome sugerido do arquivo PDF

  const limpar = () => {
    palco.remove();
    document.body.classList.remove('imprimindo');
    document.title = tituloOriginal;
    window.removeEventListener('afterprint', limpar);
    renderSlide(atual);
  };
  window.addEventListener('afterprint', limpar);
  // dá um frame para as fontes/SVGs assentarem antes de abrir o diálogo
  requestAnimationFrame(() => setTimeout(() => window.print(), 50));
}

/* ============================================================
   6. API pública + eventos
   ============================================================ */

window.Apresentacao = {
  hooks: {},
  modo: MODO,
  slides: () => SLIDES,
  dados: () => DADOS,
  config: () => CONFIG,
  parametros,
  irPara,
  indiceAtual: () => atual,
  redesenhar: () => renderSlide(atual),
  remontar,
  formatar,
  getPromptPersonalizado: () => document.getElementById('promptPersonalizado')?.value.trim() || '',
  // camadas expostas para depuração e extensão
  UI,
  renderizadores: RENDERIZADORES,
  detectarRelatorios: (a) => detectarRelatorios(typeof a === 'string' ? CONFIG?.assinaturas?.[a] : a),
  itensDoRelatorio,
};

prevBtn?.addEventListener('click', anterior);
nextBtn?.addEventListener('click', proximo);
carregarBtn?.addEventListener('click', carregarApresentacao);
downloadBtn?.addEventListener('click', exportarPDF);
/* ---------- link externo (modo edição) ---------- */
const publicarBtn = $('publicarLink');
publicarBtn?.addEventListener('click', async () => {
  try {
    publicarBtn.disabled = true;
    const resp = await fetch('/api/apresentacao/publicar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parametros(), titulo: DADOS?.relatorio?.EmpresaMae || '' }),
    });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error);
    const link = `${location.origin}/apresentacao-externa.html?token=${encodeURIComponent(json.token)}`;
    try { await navigator.clipboard.writeText(link); } catch { /* sem clipboard */ }
    window.prompt('Link de leitura para a empresa (copiado para a área de transferência):', link);
  } catch (err) {
    alert('Não foi possível gerar o link: ' + err.message);
  } finally {
    publicarBtn.disabled = false;
  }
});

window.addEventListener('beforeprint', () => {
  // Ctrl+P direto (sem o botão): monta o palco na hora
  if (!document.body.classList.contains('imprimindo') && SLIDES.length) exportarPDF();
});
if (ocultarVaziosChk) ocultarVaziosChk.addEventListener('change', remontar);

/* ---------- Controle da Toolbar (Recolher / Expandir) ---------- */
function toggleToolbar() {
  const cabecalho = document.querySelector('.cabecalho-apresentacao');
  if (!cabecalho) return;
  const recolhida = cabecalho.classList.toggle('toolbar-recolhida');
  const btn = $('btnToggleToolbar');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!recolhida));
    btn.title = recolhida ? 'Expandir barra de ferramentas' : 'Recolher barra de ferramentas';
    btn.setAttribute('aria-label', btn.title);
  }
  setTimeout(ajustarEscala, 360);
}

$('btnToggleToolbar')?.addEventListener('click', toggleToolbar);

/* ---------- Modo Apresentação em Tela Cheia ---------- */
function toggleModoApresentacao() {
  const btnApres = $('btnApresentacao');
  const temDados = typeof SLIDES !== 'undefined' && SLIDES.length > 0 && !(SLIDES.length === 1 && SLIDES[0].id === 'vazio');
  if (btnApres?.disabled || !temDados) return;

  const ativo = document.body.classList.contains('modo-apresentacao');
  if (!ativo) {
    document.body.classList.add('modo-apresentacao');
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  } else {
    document.body.classList.remove('modo-apresentacao');
    document.body.classList.remove('mouse-inativo');
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }
  setTimeout(ajustarEscala, 100);
}

$('btnApresentacao')?.addEventListener('click', toggleModoApresentacao);

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('modo-apresentacao')) {
    document.body.classList.remove('modo-apresentacao');
    document.body.classList.remove('mouse-inativo');
    setTimeout(ajustarEscala, 100);
  }
});

// Cursor e botão discretos após inatividade em tela cheia
let mouseTimer = null;
window.addEventListener('mousemove', () => {
  if (!document.body.classList.contains('modo-apresentacao')) return;
  document.body.classList.remove('mouse-inativo');
  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => {
    if (document.body.classList.contains('modo-apresentacao')) {
      document.body.classList.add('mouse-inativo');
    }
  }, 2500);
});

// Clique na lateral do palco avança/volta em modo apresentação
palcoEl?.addEventListener('click', (e) => {
  if (!document.body.classList.contains('modo-apresentacao')) return;
  const el = e.target instanceof Element ? e.target : e.target?.parentElement;
  if (
    !el ||
    el.isContentEditable ||
    el.closest(
      'button, a, input, select, textarea, [contenteditable], .editavel, .card-rc, .card-rc-conteudo, .texto-livre, .highlight-bar, .btn-editar-highlight, .drawer, .toolbar, .toolbar-toggle, .acoes-tabela-slide, .btn, [role="button"], label'
    )
  ) {
    return;
  }
  if (e.clientX < window.innerWidth * 0.25) {
    anterior();
  } else {
    proximo();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('modo-apresentacao')) {
    toggleModoApresentacao();
    return;
  }
  const digitando = [e.target, document.activeElement].some(
    (n) => n && (n.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName))
  );
  if (digitando) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); proximo(); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); anterior(); }
  if (e.key === 'Home') irPara(0);
  if (e.key === 'End') irPara(SLIDES.length - 1);
  if (e.key === 'f' || e.key === 'F') {
    const temDados = typeof SLIDES !== 'undefined' && SLIDES.length > 0 && !(SLIDES.length === 1 && SLIDES[0].id === 'vazio');
    if (temDados) {
      e.preventDefault();
      toggleModoApresentacao();
    }
  }
  if (e.key === 't' || e.key === 'T') { e.preventDefault(); toggleToolbar(); }
});

/* Diagnóstico: em modo edição o drawer de highlights deve se registrar nos hooks.
   Se não registrar, avisa no console e liga o botão ✦ para o menu ao menos abrir. */
if (!LEITURA) {
  setTimeout(() => {
    if (window.Apresentacao?.hooks?.barraHighlight) return;
    console.warn('[Apresentação] apresentacao-highlights.js não carregou ou falhou — verifique a aba Network (F12) e o console.');
    const drawer = $('drawerHighlights'), toggle = $('drawerToggle'), fechar = $('fecharDrawer'), status = $('statusHighlights');
    if (!drawer || !toggle) { console.warn('[Apresentação] o HTML servido não contém o drawer (#drawerHighlights): confira se public/apresentacao-comercial.html é a versão nova.'); return; }
    if (status) status.textContent = 'Módulo de highlights não carregou. Recarregue com Ctrl+Shift+R; se persistir, veja o console.';
    const abrir = (sim) => { drawer.classList.toggle('open', sim); drawer.setAttribute('aria-hidden', String(!sim)); };
    toggle.addEventListener('click', () => abrir(!drawer.classList.contains('open')));
    fechar?.addEventListener('click', () => abrir(false));
  }, 1000);
}

setDefaultDates();
(async () => {
  try { await resolverToken(); } catch (err) { slidesContainer.innerHTML = `<div class="error">${esc(err.message)}</div>`; return; }
  if (parametros().cdEmpresa) carregarApresentacao();
})();
configurarSlideIndicatorInput($('slideIndicatorInput'));

$('seletorRelatorio')?.addEventListener('change', (e) => {
  const i = parseInt(e.target.value, 10);
  if (!isNaN(i)) {
    irPara(i);
    e.target.blur();
  }
});
atualizarSeletorRelatorio();
