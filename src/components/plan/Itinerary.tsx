"use client";

import {
  Bed,
  Bus,
  Clock,
  Landmark,
  Lightbulb,
  MapPin,
  Martini,
  Route,
  ShoppingBag,
  Ticket,
  Trees,
  Umbrella,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PlanDay, PlanItem, TripInput, WeatherInfo } from "@/lib/schemas";
import { formatMoney, mapsRouteUrl, mapsSearchUrl } from "@/lib/plan";
import { addDays, formatDate } from "@/lib/dates";
import { describeWeather } from "@/lib/weatherCodes";
import { Card, cx } from "@/components/ui";

const KIND: Record<PlanItem["kind"], { icon: LucideIcon; tone: string }> = {
  sight: { icon: Landmark, tone: "bg-brand-soft text-brand" },
  food: { icon: UtensilsCrossed, tone: "bg-accent-soft text-accent" },
  activity: { icon: Ticket, tone: "bg-sun-soft text-[#9a6514]" },
  nature: { icon: Trees, tone: "bg-ok-soft text-ok" },
  shopping: { icon: ShoppingBag, tone: "bg-[#efe9fb] text-[#6a4bb5]" },
  nightlife: { icon: Martini, tone: "bg-[#e9ecfb] text-[#3f4fb0]" },
  transport: { icon: Bus, tone: "bg-paper text-ink-soft" },
  rest: { icon: Bed, tone: "bg-paper text-ink-soft" },
};

export function DayNav({ days }: { days: PlanDay[] }) {
  return (
    <nav aria-label="Jump to day" className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
      {days.map((d) => (
        <a
          key={d.day}
          href={`#day-${d.day}`}
          className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand"
        >
          Day {d.day}
        </a>
      ))}
    </nav>
  );
}

export function DayCard({ day, input, weather, index }: { day: PlanDay; input: TripInput; weather: WeatherInfo | null; index: number }) {
  const date = input.startDate ? addDays(input.startDate, day.day - 1) : null;
  const w = weather && weather.kind !== "current" ? weather.days[day.day - 1] : undefined;
  const wx = w && describeWeather(w.code);
  const dayCost = day.items.reduce((s, i) => s + i.cost, 0);
  const places = day.items.map((i) => i.place).filter(Boolean);

  return (
    <Card
      id={`day-${day.day}`}
      data-section
      className="print-break animate-fade-up overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
    >
      <header className="flex items-start gap-4 border-b border-line p-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-center leading-none text-white">
          <span>
            <span className="block text-[10px] font-medium tracking-wider uppercase opacity-70">Day</span>
            <span className="block font-display text-xl">{day.day}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            {[date && formatDate(date), day.area].filter(Boolean).join(" · ")}
          </p>
          <h3 className="mt-0.5 font-display text-xl leading-snug font-medium text-ink">{day.title}</h3>
          {day.summary && <p className="mt-1 text-sm text-muted">{day.summary}</p>}
        </div>
        {wx && w && (
          <div className="hidden shrink-0 flex-col items-center rounded-xl bg-paper px-3 py-2 sm:flex" title={wx.label}>
            <wx.Icon size={20} className="text-brand" aria-label={wx.label} />
            <span className="mt-0.5 text-xs font-medium tabular-nums">
              {w.max}°/{w.min}°
            </span>
          </div>
        )}
      </header>

      <ol className="relative p-5">
        {day.items.map((item, i) => {
          const k = KIND[item.kind];
          const showSlot = i === 0 || day.items[i - 1].slot !== item.slot;
          return (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {/* timeline rail */}
              {i < day.items.length - 1 && <span aria-hidden className="absolute top-11 bottom-1 left-[19px] w-px bg-line" />}
              <span className={cx("relative grid size-10 shrink-0 place-items-center rounded-xl", k.tone)}>
                <k.icon size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                {showSlot && <p className="mb-0.5 text-xs font-semibold tracking-wider text-accent uppercase">{item.slot}</p>}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="font-semibold text-ink">{item.title}</h4>
                  <span className="flex items-center gap-3 text-xs text-muted">
                    {item.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} aria-hidden /> {item.duration}
                      </span>
                    )}
                    <span className="font-medium tabular-nums">{item.cost > 0 ? `${formatMoney(item.cost, input.currency)} pp` : "Free"}</span>
                  </span>
                </div>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
                {item.tip && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-sun-soft/70 px-3 py-2 text-sm text-[#7a4f10]">
                    <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden /> {item.tip}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {item.place && (
                    <a
                      href={mapsSearchUrl(item.place)}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      <MapPin size={13} aria-hidden /> Map
                    </a>
                  )}
                  {item.indoor && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs text-muted">
                      <Umbrella size={11} aria-hidden /> Rain-proof
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/50 px-5 py-3 text-sm">
        <span className="text-muted">
          Activities ≈ <span className="font-medium text-ink tabular-nums">{formatMoney(dayCost, input.currency)}</span> per person
        </span>
        {places.length > 1 && (
          <a href={mapsRouteUrl(places)} target="_blank" rel="noreferrer" className="no-print inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
            <Route size={15} aria-hidden /> Day route
          </a>
        )}
      </footer>
    </Card>
  );
}
