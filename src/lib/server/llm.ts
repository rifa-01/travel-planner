import "server-only";
import type { z } from "zod";

/**
 * Minimal Gemini client (REST, no SDK) that asks for JSON matching a schema,
 * then validates the result with zod. Kept provider-specific on purpose:
 * one well-understood integration beats an abstraction nobody needs yet.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// "latest" alias keeps working as Google ships new Flash versions; Flash-Lite has a separate
// free-tier quota, so it's a sensible fallback when the main model is rate-limited or unavailable.
const DEFAULT_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export class LLMError extends Error {
  constructor(
    message: string,
    /** Safe to show to the user. */
    public readonly userMessage: string,
    public readonly status: number = 502,
    public readonly code: "config" | "model_missing" | "rate_limit" | "overloaded" | "blocked" | "timeout" | "bad_output" | "upstream" = "upstream",
  ) {
    super(message);
  }
}

type GeminiSchema = Record<string, unknown>;

type GenerateOptions<T> = {
  system: string;
  prompt: string;
  /** OpenAPI-style schema passed to Gemini's structured output. */
  responseSchema: GeminiSchema;
  /** Zod schema used to validate (and lightly repair) what comes back. */
  validator: z.ZodType<T>;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

export function isMockMode() {
  return process.env.LLM_MOCK === "true";
}

export async function generateJson<T>(opts: GenerateOptions<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "GEMINI_API_KEY is not set",
      "The AI service isn't configured yet. Add GEMINI_API_KEY to .env.local and restart the server.",
      500,
      "config",
    );
  }

  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL ?? FALLBACK_MODEL;

  // Attempt 1: primary. Attempt 2: retry the same model if the output was bad,
  // or switch to the fallback model if the primary is rate-limited / missing.
  // Both attempts share one time budget. While a fallback is still available, the primary only
  // gets part of it: an overloaded model sometimes stalls instead of answering 503.
  const deadline = Date.now() + (opts.timeoutMs ?? 90_000);
  let lastError: unknown;
  let model = primary;
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 3_000) break;
    const canFallBack = Boolean(fallback) && fallback !== model;
    try {
      return await callOnce(apiKey, model, { ...opts, timeoutMs: canFallBack ? Math.round(remaining * 0.55) : remaining });
    } catch (err) {
      lastError = err;
      if (!(err instanceof LLMError)) break;
      if (err.code === "bad_output" || err.code === "upstream") continue;
      if ((err.code === "rate_limit" || err.code === "overloaded" || err.code === "timeout" || err.code === "model_missing") && canFallBack) {
        console.warn(`[llm] ${model} unavailable (${err.code}), falling back to ${fallback}`);
        model = fallback;
        continue;
      }
      break;
    }
  }
  if (lastError instanceof LLMError && lastError.code === "model_missing") {
    throw new LLMError(lastError.message, "The configured AI model isn't available. Check GEMINI_MODEL.", 500, "config");
  }
  throw lastError;
}

async function callOnce<T>(apiKey: string, model: string, opts: GenerateOptions<T>): Promise<T> {
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
      // Temperature is left at the model default: Gemini 3 models are tuned for it and can loop when lowered.
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new LLMError("Gemini request timed out", "The AI took too long to respond. Please try again.", 504, "timeout");
    }
    throw new LLMError(`Network error: ${String(err)}`, "Couldn't reach the AI service. Check your connection and try again.");
  }

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;

  if (!res.ok) {
    const detail = data.error?.message ?? res.statusText;
    if (res.status === 429) {
      throw new LLMError(
        `Rate limited: ${detail}`,
        "The AI is getting a lot of requests right now (free-tier limit). Wait a minute and try again.",
        429,
        "rate_limit",
      );
    }
    if (res.status === 503) {
      throw new LLMError(
        `Overloaded: ${detail}`,
        "The AI is very busy right now. Wait a moment and try again.",
        503,
        "overloaded",
      );
    }
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new LLMError(`Bad API key: ${detail}`, "The AI service key is invalid. Check GEMINI_API_KEY.", 500, "config");
    }
    if (res.status === 404) {
      throw new LLMError(`Model not found (${model}): ${detail}`, "The configured AI model isn't available. Check GEMINI_MODEL.", 500, "model_missing");
    }
    throw new LLMError(`Gemini ${res.status}: ${detail}`, "The AI service had a problem. Please try again.", 502, "upstream");
  }

  if (data.promptFeedback?.blockReason) {
    throw new LLMError(
      `Blocked: ${data.promptFeedback.blockReason}`,
      "The AI couldn't respond to this request. Try rephrasing your notes or requirements.",
      422,
      "blocked",
    );
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");

  if (!text) {
    if (candidate?.finishReason === "SAFETY") {
      throw new LLMError("Safety stop", "The AI couldn't respond to this request. Try rephrasing.", 422, "blocked");
    }
    throw new LLMError(`Empty response (${candidate?.finishReason})`, "The AI returned an empty answer. Please try again.", 502, "bad_output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const truncated = candidate?.finishReason === "MAX_TOKENS";
    throw new LLMError(
      `Invalid JSON (finish: ${candidate?.finishReason})`,
      truncated
        ? "The plan was too long for the AI to finish. Try fewer days or a slower pace."
        : "The AI returned something we couldn't read. Please try again.",
      502,
      "bad_output",
    );
  }

  const result = opts.validator.safeParse(parsed);
  if (!result.success) {
    console.warn("[llm] schema validation failed", result.error.issues.slice(0, 5));
    throw new LLMError("Schema validation failed", "The AI's answer was incomplete. Please try again.", 502, "bad_output");
  }
  return result.data;
}

/* Small helpers to keep the Gemini schemas readable. */
export const S = {
  str: (description?: string): GeminiSchema => ({ type: "STRING", ...(description && { description }) }),
  num: (description?: string): GeminiSchema => ({ type: "NUMBER", ...(description && { description }) }),
  int: (description?: string): GeminiSchema => ({ type: "INTEGER", ...(description && { description }) }),
  bool: (description?: string): GeminiSchema => ({ type: "BOOLEAN", ...(description && { description }) }),
  enum: (values: readonly string[], description?: string): GeminiSchema => ({
    type: "STRING",
    format: "enum",
    enum: [...values],
    ...(description && { description }),
  }),
  arr: (items: GeminiSchema, description?: string): GeminiSchema => ({
    type: "ARRAY",
    items,
    ...(description && { description }),
  }),
  obj: (properties: Record<string, GeminiSchema>, optional: string[] = []): GeminiSchema => ({
    type: "OBJECT",
    properties,
    required: Object.keys(properties).filter((k) => !optional.includes(k)),
    propertyOrdering: Object.keys(properties),
  }),
};
