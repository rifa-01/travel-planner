import "server-only";
import type { z } from "zod";
import { LLMError } from "./llm";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "error",
  ) {
    super(message);
  }
}

/** Uniform JSON error shape for the client: { error: { message, code } }. */
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json({ error: { message: err.message, code: err.code } }, { status: err.status });
  }
  if (err instanceof LLMError) {
    console.error(`[llm] ${err.code}: ${err.message}`);
    return Response.json({ error: { message: err.userMessage, code: err.code } }, { status: err.status });
  }
  console.error("[api] unexpected error", err);
  return Response.json({ error: { message: "Something went wrong on our side. Please try again.", code: "internal" } }, { status: 500 });
}

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON.", "bad_request");
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new HttpError(400, `Invalid request: ${first?.path.join(".") || "body"} — ${first?.message}`, "bad_request");
  }
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Tiny in-memory rate limiter. Good enough to stop a single client     */
/* from draining the free-tier quota; swap for Redis/Upstash if this    */
/* ever runs on more than one instance.                                */
/* ------------------------------------------------------------------ */

const hits = new Map<string, number[]>();

export function rateLimit(req: Request, bucket: string, limit: number, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new HttpError(429, "You're going a bit fast — wait a moment and try again.", "rate_limit");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // crude memory cap
}
