import { MAX_DAYS, SLOTS, type TripInput, type TripPlan } from "./schemas";

/**
 * Deterministic clean-up of whatever the LLM returned. Anything we can compute
 * ourselves (numbering, ordering, totals) we don't trust the model with.
 */
export function normalizePlan(plan: TripPlan, expectedDays: number, currency: string): TripPlan {
  const days = plan.days.slice(0, Math.min(expectedDays, MAX_DAYS)).map((d, i) => ({
    ...d,
    day: i + 1,
    items: [...d.items].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)),
  }));

  return {
    ...plan,
    days,
    budget: { ...plan.budget, currency: currency.toUpperCase() },
    phrases: plan.phrases.slice(0, 8),
    tips: plan.tips.slice(0, 10),
  };
}

export function budgetTotal(plan: TripPlan) {
  return plan.budget.breakdown.reduce((sum, b) => sum + b.amount, 0);
}

export type BudgetVerdict = { status: "under" | "close" | "over"; diff: number };

/** Compare the AI's estimate with what the user said they'd spend. */
export function budgetVerdict(plan: TripPlan, input: TripInput): BudgetVerdict | null {
  if (!input.budgetAmount) return null;
  const total = budgetTotal(plan);
  const diff = input.budgetAmount - total;
  const ratio = total / input.budgetAmount;
  return { status: ratio > 1.05 ? "over" : ratio > 0.9 ? "close" : "under", diff };
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("en")} ${currency}`;
  }
}

export function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsRouteUrl(places: string[]) {
  const stops = places.filter(Boolean);
  if (stops.length < 2) return mapsSearchUrl(stops[0] ?? "");
  const [origin, ...rest] = stops;
  const destination = rest.pop()!;
  // No travelmode: some days span far-apart stops (e.g. a peninsula drive), so let Maps pick.
  const params = new URLSearchParams({ api: "1", origin, destination });
  if (rest.length) params.set("waypoints", rest.join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function osmEmbedUrl(lat: number, lon: number, span = 0.08) {
  const bbox = [lon - span, lat - span * 0.6, lon + span, lat + span * 0.6].map((n) => n.toFixed(4)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/** Plain-text version for copying into notes / messages. */
export function planToText(plan: TripPlan, input: TripInput) {
  const lines = [`${plan.title} — ${input.destination.name}`, "", plan.summary, ""];
  for (const d of plan.days) {
    lines.push(`Day ${d.day}: ${d.title}${d.area ? ` (${d.area})` : ""}`);
    for (const it of d.items) lines.push(`  • ${it.slot}: ${it.title} — ${it.description}`);
    lines.push("");
  }
  lines.push(`Estimated total: ${formatMoney(budgetTotal(plan), plan.budget.currency)}`);
  return lines.join("\n");
}
