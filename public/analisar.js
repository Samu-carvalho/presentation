const params = new URLSearchParams(window.location.search);
const idAutorizacao = Number(params.get("idAutorizacao") || params.get("id") || "");
const prompt = String(params.get("prompt") || "analise-geral").trim();

const stepLabel   = document.getElementById("stepLabel");
const progressBar = document.getElementById("progressBar");
const progressPct = document.getElementById("progressPct");
const progressBox = document.getElementById("progressBox");
const resultBox   = document.getElementById("resultBox");
const errorBox    = document.getElementById("errorBox");
const errorMsg    = document.getElementById("errorMsg");
const pageTitle   = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const statusBar   = document.getElementById("statusBar");
const bodyEl = document.body;

const STEPS = [
  { pct: 8,  label: "Iniciando analise..." },
  { pct: 18, label: "Consultando dados gerais da autorizacao..." },
  { pct: 30, label: "Verificando historico de fluxo e status..." },
  { pct: 42, label: "Buscando procedimentos autorizados..." },
  { pct: 52, label: "Identificando prestadores envolvidos..." },
  { pct: 62, label: "Consultando pendencias e chamados..." },
  { pct: 72, label: "Analisando ocorrencias e observacoes..." },
  { pct: 82, label: "Consolidando dados no modelo de IA..." },
  { pct: 90, label: "Gerando resultado da analise..." },
  { pct: 96, label: "Finalizando e salvando resultado..." }
];

let stepIndex = 0;
let stepTimer;

function setProgress(pct, label) {
  progressBar.style.width = `${pct}%`;
  progressPct.textContent = `${pct}%`;
  if (label) stepLabel.textContent = label;
}

function advanceStep() {
  if (stepIndex < STEPS.length) {
    const s = STEPS[stepIndex++];
    setProgress(s.pct, s.label);
  }
}

function startFakeProgress() {
  advanceStep();
  const interval = Math.floor(2800 / STEPS.length);
  stepTimer = window.setInterval(() => {
    if (stepIndex < STEPS.length) {
      advanceStep();
    } else {
      window.clearInterval(stepTimer);
    }
  }, interval);
}

function stopFakeProgress() {
  window.clearInterval(stepTimer);
}

function setAnalyzingVisual(isAnalyzing) {
  if (!bodyEl) return;
  bodyEl.classList.toggle("is-analyzing", !!isAnalyzing);
}

function showError(msg) {
  stopFakeProgress();
  setAnalyzingVisual(false);
  progressBox.style.display = "none";
  errorBox.style.display = "block";
  errorMsg.textContent = msg || "Erro desconhecido. Tente novamente.";
  pageTitle.textContent = "Falha na analise";
  pageSubtitle.textContent = "";
}

function showSuccess(idAut) {
  stopFakeProgress();
  setAnalyzingVisual(true);
  setProgress(100, "Analise concluida!");
  progressBox.style.display = "none";
  resultBox.style.display = "block";
  pageSubtitle.textContent = `Autorizacao ${idAut}`;

  window.setTimeout(() => {
    window.location.href = `/resultado/${idAut}`;
  }, 1200);
}

async function run() {
  if (!idAutorizacao || !Number.isInteger(idAutorizacao) || idAutorizacao <= 0) {
    showError("Parametro idAutorizacao ausente ou invalido na URL. Exemplo: /analisar?idAutorizacao=502632&prompt=analise-geral");
    return;
  }

  pageSubtitle.textContent = `Autorizacao ${idAutorizacao} — prompt: ${prompt}`;
  statusBar.textContent = `Processando autorizacao ${idAutorizacao}...`;

  setAnalyzingVisual(true);
  startFakeProgress();

  let res, json;
  try {
    res = await fetch("/api/analisar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idAutorizacao, prompt })
    });
    json = await res.json().catch(() => ({}));
  } catch (e) {
    showError("Falha de comunicacao com o servidor. Verifique se o servico esta disponivel.");
    return;
  }

  if (!res.ok || !json.ok) {
    showError(json?.error || `Erro ${res.status} ao processar a analise.`);
    return;
  }

  showSuccess(json.idAutorizacao);
}

run();
