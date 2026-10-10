import { followUpResponseSchema, tripInputSchema } from "@/lib/schemas";
import { generateJson, isMockMode } from "@/lib/server/llm";
import { errorResponse, parseBody, rateLimit } from "@/lib/server/http";
import { QUESTIONS_SYSTEM, questionsPrompt, questionsSchema } from "@/lib/server/prompts";
import { mockQuestions } from "@/lib/server/mock";

export async function POST(req: Request) {
  try {
    rateLimit(req, "llm", 12);
    const input = await parseBody(req, tripInputSchema);

    const questions = isMockMode()
      ? await mockQuestions(input)
      : (
          await generateJson({
            system: QUESTIONS_SYSTEM,
            prompt: questionsPrompt(input),
            responseSchema: questionsSchema,
            validator: followUpResponseSchema,
            maxOutputTokens: 4096,
            timeoutMs: 30_000,
          })
        ).questions;

    // Drop anything unusable rather than show a broken question.
    const clean = questions.filter((q) => q.question && q.options.length >= 2).slice(0, 4);
    return Response.json({ questions: clean });
  } catch (err) {
    return errorResponse(err);
  }
}
