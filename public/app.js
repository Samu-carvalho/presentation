const form = document.getElementById("analysisForm");
const idInput = document.getElementById("idAutorizacao");
const promptInput = document.getElementById("prompt");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const analyzeBtn = form.querySelector("button[type='submit']");
const bodyEl = document.body;

function setStatus(text) {
  statusEl.textContent = text || "";
}

function setAnalyzingState(isAnalyzing) {
  if (!analyzeBtn) return;

  if (bodyEl) {
    bodyEl.classList.toggle("ai-thinking", !!isAnalyzing);
    bodyEl.classList.toggle("is-analyzing", !!isAnalyzing);
  }

  if (isAnalyzing) {
    analyzeBtn.disabled = true;
    analyzeBtn.style.display = "none";
    return;
  }

  analyzeBtn.disabled = false;
  analyzeBtn.style.display = "";
}

async function runAnalysis(event) {
  event.preventDefault();

  const idAutorizacao = Number(idInput.value);
  const prompt = String(promptInput.value || "").trim();

  if (!Number.isInteger(idAutorizacao) || idAutorizacao <= 0) {
    setStatus("Informe um idAutorizacao valido.");
    return;
  }

  if (!prompt) {
    setStatus("Informe o prompt a ser aplicado.");
    return;
  }

  setStatus("Executando analise...");
  output.innerHTML = "";
  setAnalyzingState(true);
  setStatus("Abrindo tela de processamento...");
  const params = new URLSearchParams({
    idAutorizacao: String(idAutorizacao),
    prompt
  });
  window.location.href = `/analisar?${params.toString()}`;
}

form.addEventListener("submit", runAnalysis);
