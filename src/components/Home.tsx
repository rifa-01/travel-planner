"use client";

import { ArrowRight, CalendarDays, CloudSun, Compass, MessageCircle, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import type { Place, SavedTrip } from "@/lib/schemas";
import { INSPIRATION } from "@/lib/options";
import { budgetTotal, formatMoney } from "@/lib/plan";
import { formatRange } from "@/lib/dates";
import { Button, Flag } from "@/components/ui";
import { DestinationSearch } from "./wizard/DestinationSearch";

type Props = {
  trips: SavedTrip[];
  onStart: (place: Place | null) => void;
  onOpen: (trip: SavedTrip) => void;
  onDelete: (trip: SavedTrip) => void;
};

const FEATURES = [
  { icon: Wand2, title: "Questions that matter", body: "AI asks a few follow-ups specific to your destination." },
  { icon: CloudSun, title: "Real weather", body: "Live forecasts shape the plan — rainy days get indoor picks." },
  { icon: MessageCircle, title: "Edit by chatting", body: "“Make day 2 slower” — and the plan updates." },
];

export function Home({ trips, onStart, onOpen, onDelete }: Props) {
  const [place, setPlace] = useState<Place | null>(null);

  return (
    <div className="w-full">
      <section className="relative">
        {/* soft decorative backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(15,94,87,0.12),transparent)]" />
          <div className="absolute top-40 -right-40 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(212,100,58,0.10),transparent)]" />
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-14 pb-12 text-center sm:pt-24 sm:pb-16">
          <p className="mb-5 inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-sm text-ink-soft">
            <Compass size={14} className="text-brand" /> Your AI travel planner
          </p>
          <h1 className="animate-fade-up font-display text-[2.6rem] leading-[1.02] font-medium tracking-tight text-balance text-ink [animation-delay:50ms] sm:text-6xl">
            Where are you <em className="text-brand">dreaming</em> of going?
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-lg text-ink-soft [animation-delay:100ms]">
            Tell us a little about your trip. Get a day-by-day plan built around you, the weather and your budget.
          </p>

          <form
            className="relative z-20 mx-auto mt-9 max-w-xl animate-fade-up text-left [animation-delay:150ms]"
            onSubmit={(e) => {
              e.preventDefault();
              onStart(place);
            }}
          >
            <DestinationSearch value={place} onChange={setPlace} size="lg" placeholder="Try “Lisbon” or “Bali”" onSubmit={onStart} />
            <Button type="submit" size="lg" iconRight={ArrowRight} className="mt-3 w-full">
              {place ? `Plan my trip to ${place.name}` : "Start planning"}
            </Button>
          </form>

          <div className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-2 [animation-delay:200ms]">
            <span className="text-sm text-muted">Or try</span>
            {INSPIRATION.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onStart(p)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                <Flag code={p.countryCode} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="trips" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-medium tracking-tight">My trips</h2>
          {trips.length > 0 && <span className="text-sm text-muted">Saved on this device</span>}
        </div>
        {trips.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="font-medium text-ink">No saved trips yet</p>
            <p className="mt-1 text-sm text-muted">Plans you create are saved here automatically, so you can come back to them anytime.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <li key={t.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(t)}
                  className="flex h-full w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="text-sm font-medium text-brand">
                    <Flag code={t.input.destination.countryCode} /> {t.input.destination.name}
                  </span>
                  <span className="mt-1 pr-8 font-display text-xl leading-snug font-medium text-ink">{t.plan.title}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      {t.input.startDate ? formatRange(t.input.startDate, t.plan.days.length) : `${t.plan.days.length} days`}
                    </span>
                    <span>≈ {formatMoney(budgetTotal(t.plan), t.plan.budget.currency)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${t.plan.title}`}
                  onClick={() => onDelete(t)}
                  className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted opacity-100 transition hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-[var(--radius-card)] bg-surface/60 p-5">
              <f.icon size={20} className="text-brand" />
              <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
