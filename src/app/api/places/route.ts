import { connection } from "next/server";
import { searchPlaces } from "@/lib/server/geo";
import { errorResponse, HttpError, rateLimit } from "@/lib/server/http";

export async function GET(req: Request) {
  await connection(); // per-request: never prerender this at build time
  try {
    rateLimit(req, "places", 60);
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return Response.json({ places: [] });
    if (q.length > 80) throw new HttpError(400, "Search is too long.", "bad_request");

    const places = await searchPlaces(q).catch(() => {
      throw new HttpError(502, "Place search is unavailable right now. You can still type a destination.", "upstream");
    });
    return Response.json({ places });
  } catch (err) {
    return errorResponse(err);
  }
}
