import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Trip input — what the user tells us                                 */
/* ------------------------------------------------------------------ */

export const MAX_DAYS = 14;

export const placeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  country: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  countryCode: z.string().max(4).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  timezone: z.string().max(64).optional(),
});

export const TRAVEL_GROUPS = ["solo", "couple", "family", "friends", "business"] as const;
export const PACES = ["relaxed", "balanced", "packed"] as const;
export const BUDGET_TIERS = ["shoestring", "moderate", "comfort", "luxury"] as const;

export const tripInputSchema = z.object({
  destination: placeSchema,
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  days: z.number().int().min(1).max(MAX_DAYS),
  group: z.enum(TRAVEL_GROUPS),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(10),
  purpose: z.string().trim().min(1).max(60),
  interests: z.array(z.string().trim().max(40)).max(15),
  pace: z.enum(PACES),
  budgetTier: z.enum(BUDGET_TIERS),
  budgetAmount: z.number().positive().max(10_000_000).optional(),
  currency: z.string().length(3),
  requirements: z.array(z.string().trim().max(60)).max(12),
  notes: z.string().trim().max(600).optional(),
  followUps: z
    .array(z.object({ question: z.string().max(200), answer: z.string().max(400) }))
    .max(6)
    .optional(),
});

export type TripInput = z.infer<typeof tripInputSchema>;
export type Place = z.infer<typeof placeSchema>;

/* ------------------------------------------------------------------ */
/* AI follow-up questions                                              */
/* ------------------------------------------------------------------ */

export const followUpQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string().default(""),
  multi: z.boolean().default(false),
  options: z.array(z.string()).default([]),
});

export const followUpResponseSchema = z.object({
  questions: z.array(followUpQuestionSchema).max(4),
});

export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;

/* ------------------------------------------------------------------ */
/* Generated plan                                                      */
/* ------------------------------------------------------------------ */

export const SLOTS = ["Morning", "Afternoon", "Evening"] as const;
export const ITEM_KINDS = ["sight", "food", "activity", "nature", "shopping", "nightlife", "transport", "rest"] as const;

// LLMs occasionally drift outside an enum; fall back instead of failing the whole plan.
const lenientEnum = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.string().transform((v) => {
    const match = values.find((x) => x.toLowerCase() === v.trim().toLowerCase());
    return (match ?? fallback) as T[number];
  });

const money = z.coerce.number().catch(0).transform((n) => Math.max(0, Math.round(n)));

export const planItemSchema = z.object({
  slot: lenientEnum(SLOTS, "Afternoon"),
  title: z.string(),
  description: z.string(),
  place: z.string().default(""),
  kind: lenientEnum(ITEM_KINDS, "activity"),
  duration: z.string().default(""),
  cost: money.default(0),
  tip: z.string().optional(),
  indoor: z.boolean().optional(),
});

export const planDaySchema = z.object({
  day: z.coerce.number().int(),
  title: z.string(),
  area: z.string().default(""),
  summary: z.string().default(""),
  items: z.array(planItemSchema).min(1),
});

export const tripPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()).default([]),
  bestTimeNote: z.string().default(""),
  days: z.array(planDaySchema).min(1),
  stays: z
    .array(
      z.object({
        area: z.string(),
        style: z.string().default(""),
        priceRange: z.string().default(""),
        why: z.string().default(""),
        examples: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  food: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().default(""),
        where: z.string().default(""),
        dietary: z.string().optional(),
      }),
    )
    .default([]),
  budget: z.object({
    currency: z.string().default("USD"),
    breakdown: z
      .array(z.object({ category: z.string(), amount: money, note: z.string().default("") }))
      .default([]),
    note: z.string().default(""),
  }),
  packing: z.array(z.object({ category: z.string(), items: z.array(z.string()) })).default([]),
  tips: z
    .array(z.object({ category: z.string().default("General"), title: z.string(), body: z.string() }))
    .default([]),
  phrases: z.array(z.object({ phrase: z.string(), meaning: z.string() })).default([]),
});

export type TripPlan = z.infer<typeof tripPlanSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type PlanItem = z.infer<typeof planItemSchema>;

/* ------------------------------------------------------------------ */
/* Weather (from Open-Meteo, not the LLM)                              */
/* ------------------------------------------------------------------ */

export type WeatherDay = {
  date: string;
  code: number;
  max: number;
  min: number;
  precipProb: number | null;
  precipMm: number;
};

export type WeatherInfo = {
  /** forecast = live forecast for the trip dates, historical = same dates last year, current = no dates given */
  kind: "forecast" | "historical" | "current";
  days: WeatherDay[];
  summary: string;
};

export type SavedTrip = {
  id: string;
  createdAt: number;
  updatedAt: number;
  input: TripInput;
  plan: TripPlan;
  weather: WeatherInfo | null;
};

/* ------------------------------------------------------------------ */
/* Refinement chat                                                     */
/* ------------------------------------------------------------------ */

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
