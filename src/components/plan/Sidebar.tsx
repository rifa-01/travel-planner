"use client";

import { ExternalLink, Info, MapPinned } from "lucide-react";
import type { TripInput, TripPlan, WeatherInfo } from "@/lib/schemas";
import { budgetTotal, budgetVerdict, formatMoney, mapsSearchUrl, osmEmbedUrl } from "@/lib/plan";
import { describeWeather } from "@/lib/weatherCodes";
import { formatDate } from "@/lib/dates";
import { Card, cx } from "@/components/ui";

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">{children}</h2>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const WEATHER_LABEL: Record<WeatherInfo["kind"], string> = {
  forecast: "Forecast for your dates",
  historical: "Same dates last year",
  current: "This week",
};

export function WeatherCard({ weather }: { weather: WeatherInfo | null }) {
  if (!weather) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-ink">Weather</h3>
        <p className="mt-1 text-sm text-muted">Weather data isn&apos;t available for this destination — the plan uses typical conditions for the season.</p>
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{WEATHER_LABEL[weather.kind]}</h3>
        <span className="text-xs text-muted">{weather.summary}</span>
      </div>
      {weather.kind === "historical" && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
          <Info size={12} className="mt-0.5 shrink-0" /> Too far ahead for a forecast, so this is a guide to expect.
        </p>
      )}
      <ul className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {weather.days.map((d) => {
          const { label, Icon } = describeWeather(d.code);
          const wet = d.precipMm >= 1 || (d.precipProb ?? 0) >= 60;
          return (
            <li key={d.date} className="flex min-w-[4.25rem] flex-col items-center gap-1 rounded-xl bg-paper px-2 py-3 text-center" title={label}>
              <span className="text-[11px] font-medium text-muted uppercase">{formatDate(d.date, { weekday: "short", day: "numeric" })}</span>
              <Icon size={22} className={wet ? "text-brand" : "text-sun"} aria-label={label} />
              <span className="text-sm font-semibold tabular-nums">{d.max}°</span>
              <span className="text-xs text-muted tabular-nums">{d.min}°</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function MapCard({ input }: { input: TripInput }) {
  const { lat, lon, name, country } = input.destination;
  const query = [name, country].filter(Boolean).join(", ");
  return (
    <Card className="overflow-hidden">
      {lat != null && lon != null ? (
        <iframe
          title={`Map of ${name}`}
          src={osmEmbedUrl(lat, lon)}
          loading="lazy"
          className="h-52 w-full border-0 bg-paper grayscale-[0.2]"
        />
      ) : (
        <div className="grid h-36 place-items-center bg-paper text-muted">
          <MapPinned size={28} />
        </div>
      )}
      <a
        href={mapsSearchUrl(query)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-2 px-5 py-3.5 text-sm font-medium text-brand hover:bg-paper"
      >
        Open {name} in Google Maps <ExternalLink size={15} />
      </a>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function BudgetCard({ plan, input }: { plan: TripPlan; input: TripInput }) {
  const total = budgetTotal(plan);
  const cur = plan.budget.currency;
  const people = input.adults + input.children;
  const verdict = budgetVerdict(plan, input);
  const max = Math.max(...plan.budget.breakdown.map((b) => b.amount), 1);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink">Estimated cost</h3>
      <p className="mt-2 font-display text-3xl font-medium tabular-nums">{formatMoney(total, cur)}</p>
      <p className="text-sm text-muted">
        {people > 1 ? `≈ ${formatMoney(total / people, cur)} per person · ` : ""}
        {formatMoney(total / input.days, cur)}/day · excl. flights
      </p>

      {verdict && (
        <p
          className={cx(
            "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
            verdict.status === "over" ? "bg-danger-soft text-danger" : verdict.status === "close" ? "bg-sun-soft text-[#8a5a12]" : "bg-ok-soft text-ok",
          )}
        >
          {verdict.status === "over"
            ? `About ${formatMoney(-verdict.diff, cur)} over your ${formatMoney(input.budgetAmount!, cur)} budget`
            : verdict.status === "close"
              ? `Right around your ${formatMoney(input.budgetAmount!, cur)} budget`
              : `${formatMoney(verdict.diff, cur)} under your budget — room for extras`}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {plan.budget.breakdown.map((b) => (
          <li key={b.category}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-ink-soft">{b.category}</span>
              <span className="font-medium tabular-nums">{formatMoney(b.amount, cur)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-brand/70" style={{ width: `${(b.amount / max) * 100}%` }} />
            </div>
            {b.note && <p className="mt-1 text-xs text-muted">{b.note}</p>}
          </li>
        ))}
      </ul>
      {plan.budget.note && <p className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">{plan.budget.note}</p>}
      <p className="mt-3 text-xs text-muted">AI estimate — prices vary by season and availability.</p>
    </Card>
  );
}
