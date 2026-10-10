import "server-only";
import { ITEM_KINDS, SLOTS, type TripInput, type TripPlan, type WeatherInfo, type ChatMessage } from "@/lib/schemas";
import { addDays, formatDate } from "@/lib/dates";
import { S } from "./llm";

/* ------------------------------------------------------------------ */
/* Shared context                                                      */
/* ------------------------------------------------------------------ */

const PACE_GUIDE: Record<TripInput["pace"], string> = {
  relaxed: "2–3 items per day, long meals, free time built in, late starts",
  balanced: "3–4 items per day with breathing room",
  packed: "5–6 items per day, early starts, maximise what they see",
};

const BUDGET_GUIDE: Record<TripInput["budgetTier"], string> = {
  shoestring: "hostels/guesthouses, street food, public transport, lots of free sights",
  moderate: "3-star hotels or good apartments, casual restaurants, mostly public transport with the odd taxi",
  comfort: "4-star hotels, nice restaurants, taxis when convenient, a few paid experiences",
  luxury: "5-star or boutique hotels, fine dining, private transfers and guides",
};

export function describeTrip(input: TripInput, weather?: WeatherInfo | null): string {
  const d = input.destination;
  const where = [d.name, d.region, d.country].filter(Boolean).join(", ");
  const who =
    input.group === "family"
      ? `family — ${input.adults} adult(s), ${input.children} child(ren)`
      : `${input.group} — ${input.adults + input.children} traveller(s)${input.children ? ` incl. ${input.children} child(ren)` : ""}`;

  const lines = [
    `Destination: ${where}`,
    input.startDate
      ? `Dates: ${formatDate(input.startDate)} to ${formatDate(addDays(input.startDate, input.days - 1))} (${input.days} days)`
      : `Length: ${input.days} days (dates not fixed)`,
    `Travelling as: ${who}`,
    `Purpose: ${input.purpose}`,
    `Interests: ${input.interests.length ? input.interests.join(", ") : "open to suggestions"}`,
    `Pace: ${input.pace} (${PACE_GUIDE[input.pace]})`,
    `Budget style: ${input.budgetTier} (${BUDGET_GUIDE[input.budgetTier]})`,
    input.budgetAmount
      ? `Total budget: about ${input.budgetAmount} ${input.currency} for the whole group, excluding flights to the destination`
      : `Currency for all prices: ${input.currency}`,
    input.requirements.length && `Requirements: ${input.requirements.join(", ")}`,
    input.notes && `Traveller's own notes: """${input.notes}"""`,
  ];

  if (input.followUps?.length) {
    lines.push("Answers to follow-up questions:");
    for (const f of input.followUps) lines.push(`- Q: ${f.question}\n  A: ${f.answer}`);
  }

  if (weather?.days.length) {
    const label =
      weather.kind === "forecast"
        ? "Weather forecast for the trip"
        : weather.kind === "historical"
          ? "Weather on the same dates last year (use as a guide)"
          : "Current weather (trip dates unknown)";
    lines.push(`${label}: ${weather.summary}`);
    if (weather.kind !== "current") {
      lines.push(
        weather.days
          .map((w, i) => `  Day ${i + 1}: ${w.min}–${w.max}°C, ${w.precipMm}mm rain${w.precipProb != null ? ` (${w.precipProb}% chance)` : ""}`)
          .join("\n"),
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}

/* ------------------------------------------------------------------ */
/* Follow-up questions                                                 */
/* ------------------------------------------------------------------ */

export const QUESTIONS_SYSTEM = `You are a seasoned travel planner doing a short intake with a client.
Given what they've told you, ask the 2–4 follow-up questions that would most change the itinerary for THIS destination and THIS traveller.

Good questions are specific to the place and the gaps in what they said, e.g.:
- "Kyoto is very busy in spring — would you trade a famous temple for a quieter one?"
- "Do you want a day trip out of the city (e.g. Sintra), or stay in Lisbon the whole time?"
- "Are you arriving in the morning or late at night on day one?"

Rules:
- Never re-ask something already answered (dates, budget, group, interests, etc.).
- Each question gets 2–5 short tappable options (max ~6 words each). Set multi=true only if several options can apply.
- "why" is one short sentence explaining how the answer changes the plan.
- Use ids q1, q2, q3, q4.`;

export const questionsSchema = S.obj({
  questions: S.arr(
    S.obj({
      id: S.str(),
      question: S.str(),
      why: S.str(),
      multi: S.bool(),
      options: S.arr(S.str()),
    }),
  ),
});

export function questionsPrompt(input: TripInput) {
  return `Here's the trip so far:\n\n${describeTrip(input)}\n\nWhat would you ask next?`;
}

/* ------------------------------------------------------------------ */
/* Full plan                                                           */
/* ------------------------------------------------------------------ */

export const PLAN_SYSTEM = `You are an expert local travel planner. You create realistic, specific, personalised itineraries that a traveller could actually follow.

Quality bar:
- Use real, well-known, currently-operating places. Name them specifically ("Tsukiji Outer Market", not "a local market").
- Geography matters: group each day around one area or neighbourhood, order stops to avoid backtracking, and keep travel times realistic.
- Respect the pace exactly (item count per day). Day 1 and the last day are lighter to allow for arrival and departure.
- Respect every requirement (diet, accessibility, kids, mobility). If travelling with children, keep it child-friendly and include rest.
- Use the weather data: put indoor options on rainy days (set indoor=true for those items), avoid long outdoor walks in heat.
- If dates are given, mind weekdays (e.g. museums closed on Mondays, weekend markets) and local events/holidays you're confident about.
- Mix famous highlights with a few local/less touristy picks matching their interests.
- Every item's "place" is a precise search query for Google Maps (name + city).
- Costs are realistic per-person estimates in the requested currency (0 for free). Don't inflate.
- Budget breakdown is for the WHOLE group for the whole trip, excluding international flights. Categories: Accommodation, Food & drink, Activities & entry, Local transport, Extras. Be honest if the stated budget is too low or generous and say so in budget.note.
- Stays: recommend 2–3 AREAS to stay in (with why it suits them) and 1–3 example properties per area that are well established. Never invent hotels.
- Food: 5–8 dishes or food experiences specific to the destination, with where to try them; respect dietary needs.
- Packing: grouped list tailored to weather, activities and the group. Skip obvious basics (passport, phone).
- Tips: 5–8 practical, destination-specific tips (getting around, money, etiquette, safety, scams, bookings to make in advance).
- Phrases: 4–6 useful local-language phrases if the local language differs from English; otherwise an empty list.
- Tone: warm, confident and concise. Descriptions are 1–2 sentences. No filler or generic advice.`;

const itemSchema = S.obj(
  {
    slot: S.enum(SLOTS),
    title: S.str("Short name of the activity or place"),
    description: S.str("1–2 sentences: what and why it suits this traveller"),
    place: S.str("Google Maps search query, e.g. 'Senso-ji Temple, Tokyo'"),
    kind: S.enum(ITEM_KINDS),
    duration: S.str("e.g. '2 hrs'"),
    cost: S.num("Per-person cost estimate in the trip currency, 0 if free"),
    tip: S.str("Optional insider tip"),
    indoor: S.bool(),
  },
  ["tip", "indoor"],
);

export const planSchema = S.obj({
  title: S.str("Evocative trip title, max 6 words"),
  summary: S.str("2–3 sentences on the shape of the trip and why it fits them"),
  highlights: S.arr(S.str(), "3–5 standout moments"),
  bestTimeNote: S.str("One sentence on season/weather and what it means for this trip"),
  days: S.arr(
    S.obj({
      day: S.int(),
      title: S.str("Theme of the day, max 6 words"),
      area: S.str("Main neighbourhood/area"),
      summary: S.str("One sentence"),
      items: S.arr(itemSchema),
    }),
  ),
  stays: S.arr(
    S.obj({
      area: S.str(),
      style: S.str("e.g. 'Boutique hotels & apartments'"),
      priceRange: S.str("Per night, in trip currency, e.g. '120–180 EUR'"),
      why: S.str(),
      examples: S.arr(S.str()),
    }),
  ),
  food: S.arr(
    S.obj({ name: S.str(), description: S.str(), where: S.str(), dietary: S.str() }, ["dietary"]),
  ),
  budget: S.obj({
    currency: S.str("ISO code"),
    breakdown: S.arr(S.obj({ category: S.str(), amount: S.num(), note: S.str() })),
    note: S.str(),
  }),
  packing: S.arr(S.obj({ category: S.str(), items: S.arr(S.str()) })),
  tips: S.arr(S.obj({ category: S.str(), title: S.str(), body: S.str() })),
  phrases: S.arr(S.obj({ phrase: S.str(), meaning: S.str() })),
});

export function planPrompt(input: TripInput, weather: WeatherInfo | null) {
  return `Plan this trip. Return exactly ${input.days} day(s) in "days", numbered from 1. All prices in ${input.currency}.\n\n${describeTrip(input, weather)}`;
}

/* ------------------------------------------------------------------ */
/* Refinement                                                          */
/* ------------------------------------------------------------------ */

export const REFINE_SYSTEM = `${PLAN_SYSTEM}

You are now EDITING an existing plan based on the traveller's request.
- Change only what the request needs; keep everything else identical (same wording, same order).
- If they ask for something impossible or unsafe, keep the plan and explain briefly in "reply".
- If the request changes the number of days, return the new number of days.
- Keep the budget, packing and tips consistent with any changes.
- "reply" is 1–2 friendly sentences telling them what you changed (or why you didn't).`;

export const refineSchema = S.obj({
  reply: S.str(),
  plan: planSchema,
});

export function refinePrompt(input: TripInput, plan: TripPlan, history: ChatMessage[], message: string) {
  const recent = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Traveller" : "You"}: ${m.content}`)
    .join("\n");
  return [
    `Trip context:\n${describeTrip(input)}`,
    `Current plan (JSON):\n${JSON.stringify(plan)}`,
    recent && `Recent conversation:\n${recent}`,
    `Traveller's request: """${message}"""`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
