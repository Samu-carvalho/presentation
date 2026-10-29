function buildUrl() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !deployment || !apiKey) {
    throw new Error("Azure OpenAI env vars ausentes");
  }
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2025-01-01-preview";
  const base = endpoint.replace(/\/+$/, "");
  return { url: `${base}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`, apiKey };
}

export async function chatCompletions({ messages, tools }) {
  const { url, apiKey } = buildUrl();

  const payload = {
    messages,
    tools,
    tool_choice: "auto"
  };

  const payloadJson = JSON.stringify(payload);
  const payloadKb = (payloadJson.length / 1024).toFixed(1);
  // Log do endpoint e tamanho do payload para diagnostico (sem expor a chave)
  const displayUrl = url.replace(/api-version=[^&]+/, "api-version=...");
  console.info(`[Azure OpenAI] Chamando: ${displayUrl} | payload: ${payloadKb}KB`);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: payloadJson
    });
  } catch (fetchErr) {
    // Erro de rede: DNS, TLS, timeout, conexao recusada, etc.
    console.error("[Azure OpenAI] fetch network error:", fetchErr?.cause ?? fetchErr?.message ?? String(fetchErr));
    return {
      ok: false,
      status: 0,
      error: `Network error: ${fetchErr?.cause?.code ?? fetchErr?.cause?.message ?? fetchErr?.message ?? "fetch failed"}`
    };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Loga o corpo completo do erro sem truncar para facilitar diagnostico
    console.error("[Azure OpenAI 4xx/5xx]", JSON.stringify(json));
    const detail = json?.error?.message ?? json?.error ?? json;
    return {
      ok: false,
      status: res.status,
      error: detail
    };
  }

  return {
    ok: true,
    message: json?.choices?.[0]?.message ?? { role: "assistant", content: "" }
  };
}
