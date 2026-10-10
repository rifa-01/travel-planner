"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_DAYS, type Place, type TripInput } from "@/lib/schemas";
import { BUDGET_OPTIONS, CURRENCIES, GROUPS, INTERESTS, PACE_OPTIONS, PURPOSES, REQUIREMENTS } from "@/lib/options";
import { formatRange, todayISO } from "@/lib/dates";
import { Button, Chip, Field, OptionCard, Stepper, cx, inputClass } from "@/components/ui";
import { DestinationSearch } from "./DestinationSearch";

export type Draft = Omit<TripInput, "destination"> & { destination: Place | null };

const STEPS = [
  { title: "Where are you headed?", subtitle: "Pick a place and how long you'll be there." },
  { title: "Who's going, and why?", subtitle: "This shapes the vibe of every day." },
  { title: "What do you love?", subtitle: "Pick as many as you like — we'll build around them." },
  { title: "Budget & must-haves", subtitle: "So nothing in the plan is a dealbreaker." },
];

type Props = {
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  step: number;
  setStep: (s: number) => void;
  onDone: () => void;
  onExit: () => void;
};

export function Wizard({ draft, setDraft, step, setStep, onDone, onExit }: Props) {
  const [touched, setTouched] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const toggle = (key: "interests" | "requirements", value: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value] }));

  // Move focus to the new heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const error = validate(draft, step);

  function next() {
    setTouched(true);
    if (error) return;
    setTouched(false);
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-36 sm:pt-10">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? onExit() : setStep(step - 1))}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-line-strong"
          aria-label={step === 0 ? "Back to home" : "Previous step"}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length + 1}`}>
          {[...STEPS, null].map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className={cx("h-full rounded-full bg-brand transition-all duration-500", i <= step ? "w-full" : "w-0")}
              />
            </div>
          ))}
        </div>
        <span className="text-sm text-muted tabular-nums">
          {step + 1}/{STEPS.length + 1}
        </span>
      </div>

      <header key={step} className="mb-8 animate-fade-up">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-medium tracking-tight text-ink outline-none sm:text-4xl">
          {STEPS[step].title}
        </h1>
        <p className="mt-2 text-muted">{STEPS[step].subtitle}</p>
      </header>

      <form
        id="wizard-form"
        key={`f${step}`}
        className="animate-fade-up space-y-9 [animation-delay:60ms]"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step === 0 && (
          <>
            <Field label="Destination" hint="Search a city — or type anything, like “Tokyo & Kyoto”.">
              <DestinationSearch value={draft.destination} onChange={(p) => set("destination", p)} autoFocus={!draft.destination} onSubmit={next} />
            </Field>

            <Field label="How many days?">
              <Stepper label="Trip length" value={draft.days} min={1} max={MAX_DAYS} onChange={(v) => set("days", v)} suffix={(v) => (v === 1 ? "day" : "days")} />
            </Field>

            <Field label="When do you start?" hint="Optional — with dates we can use the real forecast and plan around weekdays.">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <CalendarDays size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                  <input
                    type="date"
                    aria-label="Start date"
                    min={todayISO()}
                    value={draft.startDate ?? ""}
                    onChange={(e) => set("startDate", e.target.value || undefined)}
                    className={cx(inputClass, "pl-11")}
                  />
                </div>
                {draft.startDate && (
                  <Button variant="ghost" size="sm" onClick={() => set("startDate", undefined)}>
                    I&apos;m flexible
                  </Button>
                )}
              </div>
              {draft.startDate && (
                <p className="text-sm text-brand">{formatRange(draft.startDate, draft.days)}</p>
              )}
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Travelling as">
              <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {GROUPS.map((g) => (
                  <OptionCard
                    key={g.value}
                    icon={g.icon}
                    title={g.label}
                    selected={draft.group === g.value}
                    onClick={() => setDraft((d) => ({ ...d, group: g.value, adults: g.adults, children: g.children }))}
                  />
                ))}
              </div>
            </Field>

            {(draft.group === "family" || draft.group === "friends") && (
              <div className="grid animate-fade-up gap-3 sm:grid-cols-2">
                <Stepper label="Adults" value={draft.adults} min={1} max={20} onChange={(v) => set("adults", v)} />
                <Stepper label="Children" value={draft.children} min={0} max={10} onChange={(v) => set("children", v)} />
              </div>
            )}

            <Field label="What's the trip for?">
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <Chip key={p.label} icon={p.icon} selected={draft.purpose === p.label} onClick={() => set("purpose", p.label)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Interests" hint={draft.interests.length ? `${draft.interests.length} selected` : "Choose at least one"}>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip key={i.label} multi icon={i.icon} selected={draft.interests.includes(i.label)} onClick={() => toggle("interests", i.label)}>
                    {i.label}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Pace">
              <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
                {PACE_OPTIONS.map((p) => (
                  <OptionCard key={p.value} icon={p.icon} title={p.label} hint={p.hint} selected={draft.pace === p.value} onClick={() => set("pace", p.value)} />
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Spending style">
              <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BUDGET_OPTIONS.map((b) => (
                  <OptionCard key={b.value} icon={b.icon} title={b.label} hint={b.hint} selected={draft.budgetTier === b.value} onClick={() => set("budgetTier", b.value)} />
                ))}
              </div>
            </Field>

            <Field label="Total budget" hint="Optional — for the whole group, excluding flights. We'll tell you if the plan fits." htmlFor="budget">
              <div className="flex gap-2">
                <input
                  id="budget"
                  inputMode="numeric"
                  placeholder="e.g. 2500"
                  value={draft.budgetAmount ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^\d]/g, ""));
                    set("budgetAmount", n > 0 ? Math.min(n, 10_000_000) : undefined);
                  }}
                  className={cx(inputClass, "min-w-0 flex-1")}
                />
                <div className="w-28 shrink-0">
                  <select aria-label="Currency" value={draft.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Field>

            <Field label="Anything we should know?" hint="Dietary needs, accessibility, things to avoid.">
              <div className="flex flex-wrap gap-2">
                {REQUIREMENTS.map((r) => (
                  <Chip key={r} multi selected={draft.requirements.includes(r)} onClick={() => toggle("requirements", r)}>
                    {r}
                  </Chip>
                ))}
              </div>
              <textarea
                aria-label="Other notes"
                rows={3}
                maxLength={600}
                value={draft.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="e.g. It's my partner's birthday on day 3, we're not big on museums, I'd love one great sushi dinner…"
                className={cx(inputClass, "resize-none")}
              />
            </Field>
          </>
        )}

        {touched && error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

      </form>

      {/* Sticky action bar — thumb-reachable on mobile */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="hidden truncate text-sm text-muted sm:block">
            {draft.destination ? `${draft.destination.name} · ${draft.days} ${draft.days === 1 ? "day" : "days"}` : "Let's start with a destination"}
          </p>
          <Button type="submit" form="wizard-form" size="lg" className="w-full sm:w-auto" iconRight={step === STEPS.length - 1 ? Sparkles : ArrowRight}>
            {step === STEPS.length - 1 ? "Continue" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function validate(d: Draft, step: number): string | null {
  if (step === 0) {
    if (!d.destination) return "Choose a destination to continue.";
    if (d.startDate && d.startDate < todayISO()) return "That start date is in the past.";
  }
  if (step === 1 && !d.purpose) return "What's the trip for? Pick the closest match.";
  if (step === 2 && d.interests.length === 0) return "Pick at least one interest so the plan feels like yours.";
  return null;
}
