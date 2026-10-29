/* ============================================================
   Omint · Highlights da apresentação
   Menu lateral direito: gera uma frase por slide com a IA
   (Azure OpenAI, via /api/apresentacao/highlights/gerar),
   permite editar, marcar quais aparecem no slide e salvar
   tudo em JSON no servidor.
   Carregue este arquivo DEPOIS de apresentacao-comercial.js.
   ============================================================ */
'use strict';

(function () {
  const API = '/api/apresentacao/highlights';
  const LIMITE = 140;

  /** { [slideId]: { texto, exibir, origem, atualizadoEm } } */
  let HL = {};
  let SLIDES = [];
  let sujo = false;
  let timerSalvar = null;
  let gerandoEmAndamento = false;
  let highlightsNaoVistos = false;

  /* ---------- DOM do drawer ---------- */
  const el = {
    toggle: document.getElementById('drawerToggle'),
    drawer: document.getElementById('drawerHighlights'),
    fechar: document.getElementById('fecharDrawer'),
    gerar: document.getElementById('gerarHighlights'),
    salvar: document.getElementById('salvarHighlights'),
    baixar: document.getElementById('baixarHighlights'),
    status: document.getElementById('statusHighlights'),
    lista: document.getElementById('listaHighlights'),
  };
  if (!el.drawer) return; // HTML antigo sem o menu

  const escHtml = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function status(msg, tipo = 'info') {
    el.status.textContent = msg || '';
    el.status.className = 'drawer-status ' + tipo;
  }

  const elegiveis = () => SLIDES.filter((s) => s.aceitaHighlight);

  function atualizarBadge() {
    const mostrar = highlightsNaoVistos && !el.drawer.classList.contains('open');
    el.toggle.classList.toggle('tem-pendencia', mostrar);
    el.toggle.title = mostrar ? 'Highlights gerados! Abra o menu para visualizar.' : 'Highlights';
  }

  /* ============================================================
     Persistência (Highlights são gerados a cada carga; não são salvos em disco)
     ============================================================ */

  function query() {
    const p = window.Apresentacao.parametros();
    return `cdEmpresa=${encodeURIComponent(p.cdEmpresa)}&dataInicial=${encodeURIComponent(p.dataInicial)}&dataFinal=${encodeURIComponent(p.dataFinal)}`;
  }

  function salvar({ silencioso = false } = {}) {
    sujo = false;
    atualizarBotaoSalvar();
    if (!silencioso) status(`Highlights mantidos na sessão atual (${new Date().toLocaleTimeString('pt-BR')}).`, 'ok');
  }

  function salvarComAtraso() {
    sujo = false;
    atualizarBotaoSalvar();
  }

  function atualizarBotaoSalvar() {
    el.salvar.textContent = sujo ? 'Salvar •' : 'Salvar';
    el.salvar.classList.toggle('pendente', sujo);
  }

  function baixarJson() {
    const p = window.Apresentacao.parametros();
    const corpo = { ...p, atualizadoEm: new Date().toISOString(), highlights: HL };
    const url = URL.createObjectURL(new Blob([JSON.stringify(corpo, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights-${p.cdEmpresa || 'empresa'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     Geração pela IA
     ============================================================ */

  function digest(slides) {
    return slides.map((s) => ({ id: s.id, titulo: s.titulo, eyebrow: s.eyebrow, dados: s.dados }));
  }

  async function gerar(slidesAlvo, rotuloBotao) {
    if (!slidesAlvo || !slidesAlvo.length) {
      status('Nada para gerar.', 'erro');
      return;
    }
    if (gerandoEmAndamento) return;
    gerandoEmAndamento = true;

    const d = window.Apresentacao.dados() || {};
    const p = window.Apresentacao.parametros();

    // Captura o prompt personalizado (se disponível)
    const promptPersonalizado = window.Apresentacao.getPromptPersonalizado?.() || '';

    if (rotuloBotao) rotuloBotao.disabled = true;
    el.gerar.disabled = true;
    el.toggle.classList.add('gerando');
    status(`Gerando ${slidesAlvo.length} highlight(s) com a IA…`);

    try {
      const resp = await fetch(`${API}/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexto: {
            empresa: d.relatorio?.EmpresaMae || p.cdEmpresa,
            periodo: `${p.dataInicial} a ${p.dataFinal}`,
          },
          slides: digest(slidesAlvo),
          promptPersonalizado: promptPersonalizado || undefined,
        }),
      });
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error);

      Object.entries(json.highlights || {}).forEach(([id, h]) => {
        HL[id] = { ...h, exibir: true };
      });

      const n = Object.keys(json.highlights || {}).length;
      const faltou = json.semResposta?.length ? ` ${json.semResposta.length} slide(s) sem frase.` : '';
      status(`${n} highlight(s) gerado(s).${faltou}`, 'ok');

      if (n > 0 && !el.drawer.classList.contains('open')) {
        highlightsNaoVistos = true;
      }

      construirLista();
      window.Apresentacao.redesenhar();
    } catch (err) {
      status('Erro na geração: ' + err.message, 'erro');
    } finally {
      gerandoEmAndamento = false;
      el.gerar.disabled = false;
      el.toggle.classList.remove('gerando');
      if (rotuloBotao) rotuloBotao.disabled = false;
      atualizarBadge();
    }
  }

  function gerarTudo() {
    if (gerandoEmAndamento) return;
    const alvo = elegiveis();
    if (!alvo.length) {
      status('Nenhum slide elegível para highlights.', 'erro');
      return;
    }
    return gerar(alvo, null);
  }

  /* ============================================================
     Lista do drawer
     ============================================================ */

  function construirLista() {
    el.lista.innerHTML = '';
    const alvo = elegiveis();

    if (!alvo.length) {
      el.lista.innerHTML = '<p class="drawer-vazio">Carregue os dados da empresa para listar os slides.</p>';
      return;
    }

    alvo.forEach((slide) => {
      const indice = SLIDES.indexOf(slide);
      const item = HL[slide.id] || { texto: '', exibir: false, origem: null };

      const card = document.createElement('div');
      card.className = 'hl-item';
      card.dataset.slide = slide.id;

      /* cabeçalho: número + título (clicável) + origem */
      const topo = document.createElement('button');
      topo.className = 'hl-topo';
      topo.type = 'button';
      topo.innerHTML = `<span class="hl-num">${indice + 1}</span>
        <span class="hl-titulo">${escHtml(slide.titulo || slide.id)}</span>
        ${item.origem ? `<span class="hl-tag hl-tag-${item.origem}">${item.origem === 'ia' ? 'IA' : 'editado'}</span>` : ''}`;
      topo.addEventListener('click', () => {
        window.Apresentacao.irPara(indice);
        marcarAtivo(indice);
      });
      card.appendChild(topo);

      /* texto do highlight */
      const texto = document.createElement('p');
      texto.className = 'hl-texto' + (item.texto ? '' : ' vazio');
      texto.textContent = item.texto || 'Sem highlight. Gere com a IA ou escreva um.';
      card.appendChild(texto);

      const area = document.createElement('textarea');
      area.className = 'hl-area';
      area.rows = 3;
      area.maxLength = LIMITE;
      area.value = item.texto || '';
      area.hidden = true;
      card.appendChild(area);

      const contador = document.createElement('span');
      contador.className = 'hl-contador';
      contador.hidden = true;
      const atualizarContador = () => (contador.textContent = `${area.value.length}/${LIMITE}`);
      atualizarContador();
      card.appendChild(contador);

      /* ações */
      const acoes = document.createElement('div');
      acoes.className = 'hl-acoes';

      const label = document.createElement('label');
      label.className = 'hl-exibir';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!item.exibir && !!item.texto;
      chk.disabled = !item.texto;
      chk.addEventListener('change', () => {
        HL[slide.id] = { ...(HL[slide.id] || { texto: '' }), exibir: chk.checked };
        window.Apresentacao.redesenhar();
        salvarComAtraso();
      });
      label.appendChild(chk);
      label.appendChild(document.createTextNode(' Exibir no slide'));
      acoes.appendChild(label);

      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'hl-btn';
      btnEditar.textContent = 'Editar';

      const btnRegerar = document.createElement('button');
      btnRegerar.type = 'button';
      btnRegerar.className = 'hl-btn';
      btnRegerar.title = 'Pedir uma nova sugestão da IA para este slide';
      btnRegerar.textContent = '↻';
      btnRegerar.addEventListener('click', () => gerar([slide], btnRegerar));

      let editando = false;
      const aplicar = () => {
        const valor = area.value.trim().slice(0, LIMITE);
        const anterior = HL[slide.id]?.texto || '';
        HL[slide.id] = {
          texto: valor,
          exibir: valor ? (HL[slide.id]?.exibir ?? true) : false,
          origem: valor && valor !== anterior ? 'manual' : HL[slide.id]?.origem || 'manual',
          atualizadoEm: new Date().toISOString(),
        };
        construirLista();
        window.Apresentacao.redesenhar();
        salvarComAtraso();
      };

      btnEditar.addEventListener('click', () => {
        editando = !editando;
        area.hidden = !editando;
        contador.hidden = !editando;
        texto.hidden = editando;
        btnEditar.textContent = editando ? 'Aplicar' : 'Editar';
        if (editando) {
          area.focus();
          window.Apresentacao.irPara(indice);
        } else {
          aplicar();
        }
      });

      area.addEventListener('input', atualizarContador);
      area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          btnEditar.click();
        }
        if (e.key === 'Escape') {
          area.value = HL[slide.id]?.texto || '';
          btnEditar.click();
        }
      });

      acoes.appendChild(btnRegerar);
      acoes.appendChild(btnEditar);
      card.appendChild(acoes);

      el.lista.appendChild(card);
    });

    marcarAtivo(window.Apresentacao.indiceAtual());
  }

  function marcarAtivo(indice) {
    const slide = SLIDES[indice];
    el.lista.querySelectorAll('.hl-item').forEach((c) =>
      c.classList.toggle('ativo', !!slide && c.dataset.slide === slide.id)
    );
  }

  /* ============================================================
     Hooks do engine
     ============================================================ */

  window.Apresentacao.hooks.barraHighlight = (slide) => {
    const h = HL[slide.id];
    if (!h?.exibir || !h.texto) return '';
    return `<div class="highlight-bar" data-slide="${escHtml(slide.id)}">
      <div class="highlight-conteudo">
        <span class="highlight-icon">✦</span>
        <span class="highlight-texto">${escHtml(h.texto)}</span>
      </div>
      <button type="button" class="btn-editar-highlight" data-slide="${escHtml(slide.id)}" title="Editar frase gerada"><span>Editar</span></button>
    </div>`;
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-editar-highlight');
    if (!btn) return;
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
      const anterior = HL[slideId]?.texto || '';
      HL[slideId] = {
        ...(HL[slideId] || {}),
        texto: novoTexto,
        exibir: !!novoTexto,
        origem: novoTexto && novoTexto !== anterior ? 'manual' : HL[slideId]?.origem || 'manual',
        atualizadoEm: new Date().toISOString(),
      };
      textoEl.contentEditable = 'false';
      textoEl.classList.remove('editando');
      btn.innerHTML = '<span>Editar</span>';
      construirLista();
      salvarComAtraso();
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
          textoEl.textContent = HL[slideId]?.texto || '';
          textoEl.contentEditable = 'false';
          textoEl.classList.remove('editando');
          btn.innerHTML = '<span>Editar</span>';
        }
      };
      textoEl.addEventListener('keydown', onKeyDown);
    }
  });

  window.Apresentacao.hooks.aoTrocarSlide = (indice) => marcarAtivo(indice);

  window.Apresentacao.hooks.aoMontar = async (slides, opts = {}) => {
    SLIDES = slides;
    highlightsNaoVistos = false;
    if (opts?.recarregar !== false) {
      // Inicia sempre sem highlights ao carregar a apresentação
      HL = {};
      construirLista();
      window.Apresentacao.redesenhar();
      atualizarBadge();
      status('Abra o menu e clique em "Gerar com IA" para criar os highlights.');
    } else {
      construirLista();
      atualizarBadge();
    }
  };

  /* ============================================================
     Abrir / fechar
     ============================================================ */

  function abrir(sim) {
    el.drawer.classList.toggle('open', sim);
    el.drawer.setAttribute('aria-hidden', String(!sim));
    el.toggle.setAttribute('aria-expanded', String(sim));
    if (sim) {
      highlightsNaoVistos = false;
      atualizarBadge();
    }
  }

  el.toggle.addEventListener('click', () => abrir(!el.drawer.classList.contains('open')));
  el.fechar.addEventListener('click', () => abrir(false));
  el.gerar.addEventListener('click', gerarTudo);
  el.salvar.addEventListener('click', () => salvar());
  el.baixar?.addEventListener('click', baixarJson);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.drawer.classList.contains('open')) {
      const digitando = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (!digitando) abrir(false);
    }
    if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      abrir(!el.drawer.classList.contains('open'));
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (!sujo) return;
    e.preventDefault();
    e.returnValue = '';
  });
})();