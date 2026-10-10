"use client";

import { BedDouble, Check, ExternalLink, Languages, Lightbulb, MapPin } from "lucide-react";
import { useState } from "react";
import type { TripInput, TripPlan } from "@/lib/schemas";
import { mapsSearchUrl } from "@/lib/plan";
import { loadPacked, savePacked } from "@/lib/storage";
import { Card, cx } from "@/components/ui";
import { SectionTitle } from "./Sidebar";

export function Stays({ plan, input }: { plan: TripPlan; input: TripInput }) {
  if (!plan.stays.length) return null;
  const city = input.destination.name;
  return (
    <section id="stay" data-section aria-labelledby="stay-h">
      <SectionTitle>
        <span id="stay-h">Where to stay</span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.stays.map((s) => (
          <Card key={s.area} className="print-break flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <BedDouble size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{s.area}</h3>
                <p className="text-sm text-muted">{[s.style, s.priceRange && `${s.priceRange} / night`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{s.why}</p>
            {s.examples.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                <span className="font-medium text-ink-soft">Worth a look: </span>
                {s.examples.join(", ")}
              </p>
            )}
            <a
              href={mapsSearchUrl(`hotels in ${s.area}, ${city}`)}
              target="_blank"
              rel="noreferrer"
              className="no-print mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-brand hover:underline"
            >
              Browse stays in {s.area} <ExternalLink size={13} aria-hidden />
            </a>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Check live prices and availability before booking — AI suggestions can be out of date.</p>
    </section>
  );
}

export function Food({ plan, input }: { plan: TripPlan; input: TripInput }) {
  if (!plan.food.length) return null;
  return (
    <section id="food" data-section aria-labelledby="food-h">
      <SectionTitle>
        <span id="food-h">What to eat</span>
      </SectionTitle>
      <Card className="divide-y divide-line">
        {plan.food.map((f) => (
          <div key={f.name} className="print-break flex flex-col gap-1 p-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="sm:w-48 sm:shrink-0">
              <h3 className="font-semibold text-ink">{f.name}</h3>
              {f.dietary && <span className="mt-1 inline-block rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok">{f.dietary}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-relaxed text-ink-soft">{f.description}</p>
              {f.where && (
                <a
                  href={mapsSearchUrl(`${f.where}, ${input.destination.name}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-start gap-1 text-sm text-brand hover:underline"
                >
                  <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden /> {f.where}
                </a>
              )}
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

export function Packing({ plan, tripId }: { plan: TripPlan; tripId: string }) {
  // Plan views only ever render client-side (after generation or decoding a link), so reading storage here is safe.
  // The parent keys this component by trip id, so switching trips re-initialises the list.
  const [packed, setPacked] = useState<string[]>(() => loadPacked(tripId));

  if (!plan.packing.length) return null;
  const all = plan.packing.flatMap((c) => c.items.map((i) => `${c.category}::${i}`));
  const done = all.filter((k) => packed.includes(k)).length;

  function toggle(key: string) {
    const next = packed.includes(key) ? packed.filter((k) => k !== key) : [...packed, key];
    setPacked(next);
    savePacked(tripId, next);
  }

  return (
    <section id="packing" data-section aria-labelledby="packing-h">
      <SectionTitle
        aside={
          <span className="text-sm text-muted tabular-nums">
            {done}/{all.length} packed
          </span>
        }
      >
        <span id="packing-h">Packing list</span>
      </SectionTitle>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.packing.map((c) => (
          <Card key={c.category} className="print-break p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">{c.category}</h3>
            <ul className="space-y-1">
              {c.items.map((item) => {
                const key = `${c.category}::${item}`;
                const on = packed.includes(key);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(key)}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-paper"
                    >
                      <span
                        className={cx(
                          "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                          on ? "border-ok bg-ok text-white" : "border-line-strong bg-surface",
                        )}
                      >
                        {on && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className={cx("transition-colors", on ? "text-muted line-through" : "text-ink-soft")}>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function Tips({ plan }: { plan: TripPlan }) {
  if (!plan.tips.length && !plan.phrases.length) return null;
  return (
    <section id="tips" data-section aria-labelledby="tips-h">
      <SectionTitle>
        <span id="tips-h">Good to know</span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.tips.map((t) => (
          <Card key={t.title} className="print-break p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-accent uppercase">
              <Lightbulb size={13} aria-hidden /> {t.category}
            </p>
            <h3 className="mt-1.5 font-semibold text-ink">{t.title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{t.body}</p>
          </Card>
        ))}
      </div>

      {plan.phrases.length > 0 && (
        <Card className="print-break mt-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Languages size={16} className="text-brand" aria-hidden /> Handy phrases
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {plan.phrases.map((p) => (
              <div key={p.phrase}>
                <dt className="font-medium text-ink">{p.phrase}</dt>
                <dd className="text-sm text-muted">{p.meaning}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </section>
  );
}
