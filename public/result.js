function getIdFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

async function loadResult() {
  const id = getIdFromPath();
  const subtitle = document.getElementById("subtitle");
  const container = document.getElementById("resultContainer");

  const isBeneficiario = id.startsWith("B");
  const displayText = isBeneficiario ? `Beneficiario ${id.slice(1)}` : `Autorizacao ${id}`;
  subtitle.textContent = displayText;

  const res = await fetch(`/api/resultado/${encodeURIComponent(id)}`);
  if (!res.ok) {
    container.innerHTML = "<div class=\"bubble bubble--bot\">Resultado nao encontrado.</div>";
    return;
  }

  const json = await res.json();
  container.innerHTML = `<article class="markdown-body">${json.html}</article>`;
}

loadResult();
