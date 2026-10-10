import { z } from "zod";
import { chatMessageSchema, tripInputSchema, tripPlanSchema } from "@/lib/schemas";
import { generateJson, isMockMode } from "@/lib/server/llm";
import { errorResponse, parseBody, rateLimit } from "@/lib/server/http";
import { REFINE_SYSTEM, refinePrompt, refineSchema } from "@/lib/server/prompts";
import { normalizePlan } from "@/lib/plan";

export const maxDuration = 120;

const bodySchema = z.object({
  input: tripInputSchema,
  plan: tripPlanSchema,
  history: z.array(chatMessageSchema).max(20).default([]),
  message: z.string().trim().min(2).max(500),
});

const responseSchema = z.object({ reply: z.string(), plan: tripPlanSchema });

export async function POST(req: Request) {
  try {
    rateLimit(req, "llm", 12);
    const { input, plan, history, message } = await parseBody(req, bodySchema);

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 1200));
      const edited = structuredClone(plan);
      edited.days[0].summary = `${edited.days[0].summary} (Edited: ${message})`;
      return Response.json({ reply: `Mock mode: I noted "${message}" on day 1.`, plan: edited });
    }

    const result = await generateJson({
      system: REFINE_SYSTEM,
      prompt: refinePrompt(input, plan, history, message),
      responseSchema: refineSchema,
      validator: responseSchema,
      maxOutputTokens: 16_384 + plan.days.length * 1500,
    });

    // Days may legitimately change length here (e.g. "add a day"), so keep what the AI returned.
    return Response.json({ reply: result.reply, plan: normalizePlan(result.plan, result.plan.days.length, input.currency) });
  } catch (err) {
    return errorResponse(err);
  }
}
