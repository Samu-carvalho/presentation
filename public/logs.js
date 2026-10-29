async function loadLogFiles() {
  const res = await fetch("/api/logs");
  const json = await res.json();
  const filesEl = document.getElementById("files");

  if (!json.files?.length) {
    filesEl.innerHTML = "<p>Sem logs disponiveis.</p>";
    return;
  }

  filesEl.innerHTML = json.files
    .map((f) => `<button class="suggestion" data-file="${f}">${f}</button>`)
    .join("");

  for (const btn of filesEl.querySelectorAll("button[data-file]")) {
    btn.addEventListener("click", () => loadLogEntries(btn.dataset.file));
  }

  loadLogEntries(json.files[0]);
}

function parseLine(line) {
  const m = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(.*?)\] \[(.*?)\] \[(.*)\]$/);
  if (!m) return null;
  return { at: m[1], rotina: m[2], detalhe: m[3], dados: m[4] };
}

async function loadLogEntries(file) {
  const res = await fetch(`/api/logs/${encodeURIComponent(file)}`);
  const json = await res.json();
  const entriesEl = document.getElementById("entries");

  const lines = String(json.content || "").split(/\r?\n/).filter(Boolean).reverse();
  if (!lines.length) {
    entriesEl.innerHTML = "<p>Arquivo vazio.</p>";
    return;
  }

  const html = lines
    .map((line, idx) => {
      const p = parseLine(line);
      if (!p) return "";
      return `
        <div class="log-entry">
          <div class="log-main">
            <span>${p.at}</span>
            <strong>${p.rotina}</strong>
            <span>${p.detalhe}</span>
            <button class="btn btn--ghost" data-plus="${idx}">+</button>
          </div>
          <pre class="log-data" id="log-data-${idx}" hidden>${p.dados}</pre>
        </div>
      `;
    })
    .join("");

  entriesEl.innerHTML = html;

  for (const btn of entriesEl.querySelectorAll("button[data-plus]")) {
    btn.addEventListener("click", () => {
      const idx = btn.dataset.plus;
      const pre = document.getElementById(`log-data-${idx}`);
      const willShow = pre.hasAttribute("hidden");
      if (willShow) pre.removeAttribute("hidden");
      else pre.setAttribute("hidden", "hidden");
      btn.textContent = willShow ? "-" : "+";
    });
  }
}

loadLogFiles();
