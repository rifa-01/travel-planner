import "server-only";
import type { FollowUpQuestion, TripInput, TripPlan } from "@/lib/schemas";

/**
 * Deterministic fake responses for UI development (LLM_MOCK=true).
 * Lets you work on the interface without spending free-tier quota.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockQuestions(input: TripInput): Promise<FollowUpQuestion[]> {
  await wait(900);
  const city = input.destination.name;
  return [
    {
      id: "q1",
      question: `Would you like a day trip outside ${city}?`,
      why: "A day trip frees up a whole day for countryside or a nearby town.",
      multi: false,
      options: ["Yes, one day trip", "Maybe, if it's easy", "No, stay in the city"],
    },
    {
      id: "q2",
      question: "What time do you arrive on day one?",
      why: "Arrival time decides how much we can fit into the first day.",
      multi: false,
      options: ["Morning", "Afternoon", "Late evening"],
    },
    {
      id: "q3",
      question: "Which food experiences sound good?",
      why: "We'll build meals around what excites you most.",
      multi: true,
      options: ["Street food", "Markets", "Cooking class", "Fine dining", "Food tour"],
    },
  ];
}

export async function mockPlan(input: TripInput): Promise<TripPlan> {
  await wait(2500);
  const city = input.destination.name;
  const cur = input.currency;
  const people = input.adults + input.children;
  const areas = ["Old Town", "Riverside", "Arts District", "Hilltop Quarter", "Market Street", "Harbour"];

  return {
    title: `${city}, Slow and Delicious`,
    summary: `A ${input.pace} ${input.days}-day plan built around ${input.interests.slice(0, 3).join(", ") || "the best of the city"}, grouping each day by neighbourhood so you spend more time exploring and less time in transit. (This is mock data — set GEMINI_API_KEY to get a real plan.)`,
    highlights: ["Sunset from the old castle walls", "A market breakfast with the locals", "An evening of live music in a tiny bar"],
    bestTimeNote: "Mild days and cool evenings — bring a light layer.",
    days: Array.from({ length: input.days }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? "Arrive and get your bearings" : i === input.days - 1 ? "Last bites and goodbyes" : `Exploring the ${areas[i % areas.length]}`,
      area: areas[i % areas.length],
      summary: "An easy-going day clustered in one walkable area.",
      items: [
        {
          slot: "Morning" as const,
          title: `${areas[i % areas.length]} walking loop`,
          description: "Wander the lanes before the crowds arrive and grab a coffee at a corner café.",
          place: `${areas[i % areas.length]}, ${city}`,
          kind: "sight" as const,
          duration: "2 hrs",
          cost: 0,
          tip: "Start before 9am for the best light.",
        },
        {
          slot: "Afternoon" as const,
          title: "City museum",
          description: "A compact museum that tells the story of the city in an hour or two.",
          place: `City Museum, ${city}`,
          kind: "activity" as const,
          duration: "2 hrs",
          cost: 12,
          indoor: true,
        },
        {
          slot: "Evening" as const,
          title: "Dinner at a neighbourhood tavern",
          description: "Order the house specials and share plates family-style.",
          place: `Tavern, ${city}`,
          kind: "food" as const,
          duration: "2 hrs",
          cost: 30,
        },
      ],
    })),
    stays: [
      { area: "Old Town", style: "Boutique hotels & guesthouses", priceRange: `90–160 ${cur}`, why: "Walkable to most sights with lots of character.", examples: ["Example Boutique Hotel"] },
      { area: "Riverside", style: "Modern apartments", priceRange: `80–140 ${cur}`, why: "Quieter at night and great for families.", examples: [] },
    ],
    food: [
      { name: "Grilled sardines", description: "The classic summer dish, simply grilled.", where: "Any neighbourhood tasca" },
      { name: "Custard tart", description: "Flaky pastry with a caramelised custard top.", where: "Historic bakeries in the centre", dietary: "Vegetarian" },
    ],
    budget: {
      currency: cur,
      breakdown: [
        { category: "Accommodation", amount: 120 * input.days, note: "Mid-range double room" },
        { category: "Food & drink", amount: 55 * people * input.days, note: "Mix of casual and sit-down" },
        { category: "Activities & entry", amount: 20 * people * input.days, note: "" },
        { category: "Local transport", amount: 8 * people * input.days, note: "Day passes" },
        { category: "Extras", amount: 50, note: "Souvenirs and buffer" },
      ],
      note: "Comfortably within a moderate budget.",
    },
    packing: [
      { category: "Clothing", items: ["Comfortable walking shoes", "Light jacket for evenings"] },
      { category: "Gear", items: ["Reusable water bottle", "Power adapter"] },
    ],
    tips: [
      { category: "Getting around", title: "Buy a transit card", body: "Load a rechargeable card on arrival — it's cheaper than single tickets." },
      { category: "Money", title: "Carry a little cash", body: "Small cafés and market stalls sometimes don't take cards." },
    ],
    phrases: [
      { phrase: "Obrigado/a", meaning: "Thank you" },
      { phrase: "A conta, por favor", meaning: "The bill, please" },
    ],
  };
}
