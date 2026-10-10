import { tripInputSchema, tripPlanSchema } from "@/lib/schemas";
import { generateJson, isMockMode } from "@/lib/server/llm";
import { errorResponse, parseBody, rateLimit } from "@/lib/server/http";
import { PLAN_SYSTEM, planPrompt, planSchema } from "@/lib/server/prompts";
import { getWeather, resolvePlace } from "@/lib/server/geo";
import { mockPlan } from "@/lib/server/mock";
import { normalizePlan } from "@/lib/plan";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    rateLimit(req, "llm", 12);
    const body = await parseBody(req, tripInputSchema);

    // Real weather first, so the AI can plan around rain and heat.
    const destination = await resolvePlace(body.destination);
    const input = { ...body, destination };
    const weather = await getWeather(destination, input.startDate, input.days);

    const plan = isMockMode()
      ? await mockPlan(input)
      : await generateJson({
          system: PLAN_SYSTEM,
          prompt: planPrompt(input, weather),
          responseSchema: planSchema,
          validator: tripPlanSchema,
          maxOutputTokens: 16_384 + input.days * 1500,
        });

    return Response.json({ plan: normalizePlan(plan, input.days, input.currency), weather, destination });
  } catch (err) {
    return errorResponse(err);
  }
}
