import { tripInputSchema, tripPlanSchema, type SavedTrip } from "./schemas";
import { z } from "zod";

/**
 * Share links carry the whole trip in the URL hash, deflate-compressed.
 * No database needed, and the hash is never sent to the server.
 */

const sharedSchema = z.object({
  input: tripInputSchema,
  plan: tripPlanSchema,
  weather: z.any().nullable().optional(),
});

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeTrip(trip: Pick<SavedTrip, "input" | "plan" | "weather">) {
  const json = new TextEncoder().encode(JSON.stringify({ input: trip.input, plan: trip.plan, weather: trip.weather }));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeTrip(encoded: string): Promise<Pick<SavedTrip, "input" | "plan" | "weather"> | null> {
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
    const parsed = sharedSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? { input: parsed.data.input, plan: parsed.data.plan, weather: parsed.data.weather ?? null } : null;
  } catch {
    return null;
  }
}
