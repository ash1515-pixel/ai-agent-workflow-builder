const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function fallbackResult() {
  return {
    recommendation: "proceed",
    confidence: 0.82,
    summary: "The topic is sufficiently defined for editorial review.",
    provider: "fallback",
    model: "deterministic-fallback",
    fallback: true,
    note: "No server-side OpenAI response was available, so the disclosed demo fallback was used."
  };
}

function resultFromText(text) {
  const fallback = fallbackResult();
  try {
    const parsed = JSON.parse(text);
    const confidence = Number(parsed.confidence);
    return {
      ...fallback,
      recommendation: parsed.recommendation === "hold" ? "hold" : "proceed",
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : fallback.confidence,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim().slice(0, 600) : fallback.summary
    };
  } catch {
    return { ...fallback, summary: text.trim().slice(0, 600) || fallback.summary };
  }
}

export async function runLlm({ prompt }) {
  const cleanPrompt = typeof prompt === "string" ? prompt.trim().slice(0, 6_000) : "";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !cleanPrompt) {
    await wait(450);
    return fallbackResult();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "developer",
            content: "You are a workflow decision node. Reply with only valid JSON using exactly these fields: recommendation (proceed or hold), confidence (a number from 0 to 1), and summary (one concise sentence)."
          },
          { role: "user", content: cleanPrompt }
        ]
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);

    const parsed = resultFromText(payload.output_text || "");
    return {
      ...parsed,
      provider: "openai",
      model: payload.model || model,
      fallback: false,
      note: "Generated securely by the server-side OpenAI Responses API."
    };
  } catch {
    return fallbackResult();
  } finally {
    clearTimeout(timeout);
  }
}
