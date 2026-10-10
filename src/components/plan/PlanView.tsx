"use client";

import { Bookmark, BookmarkCheck, CalendarDays, Copy, Printer, Share2, Sparkles, Users, Wallet } from "lucide-react";
import { useState } from "react";
import type { SavedTrip, TripPlan } from "@/lib/schemas";
import { planToText } from "@/lib/plan";
import { formatRange } from "@/lib/dates";
import { encodeTrip } from "@/lib/share";
import { Button, Flag } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { BudgetCard, MapCard, SectionTitle, WeatherCard } from "./Sidebar";
import { DayCard, DayNav } from "./Itinerary";
import { Food, Packing, Stays, Tips } from "./Sections";
import { RefineChat } from "./RefineChat";

const NAV = [
  { id: "itinerary", label: "Itinerary" },
  { id: "stay", label: "Stay" },
  { id: "food", label: "Food" },
  { id: "packing", label: "Packing" },
  { id: "tips", label: "Tips" },
];

type Props = {
  trip: SavedTrip;
  saved: boolean;
  onSave: () => void;
  onUpdatePlan: (plan: TripPlan) => void;
  canUndo: boolean;
  onUndo: () => void;
};

export function PlanView({ trip, saved, onSave, onUpdatePlan, canUndo, onUndo }: Props) {
  const { plan, input, weather } = trip;
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const travellers = input.adults + input.children;

  async function share() {
    setSharing(true);
    try {
      const url = `${location.origin}${location.pathname}#trip=${await encodeTrip(trip)}`;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: plan.title, text: `My ${input.destination.name} trip plan`, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        toast("Share link copied");
      }
    } catch {
      toast("Couldn't create a share link", "error");
    } finally {
      setSharing(false);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(planToText(plan, input));
      toast("Itinerary copied as text");
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-12">
          <p className="flex items-center gap-2 text-sm font-medium text-brand">
            <Flag code={input.destination.countryCode} />
            {[input.destination.name, input.destination.country].filter(Boolean).join(", ")}
          </p>
          <h1 className="mt-2 max-w-3xl animate-fade-up font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance text-ink sm:text-5xl">
            {plan.title}
          </h1>
          <p className="mt-4 max-w-2xl animate-fade-up text-[17px] leading-relaxed text-ink-soft [animation-delay:80ms]">{plan.summary}</p>

          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            <Meta icon={CalendarDays}>{input.startDate ? formatRange(input.startDate, plan.days.length) : `${plan.days.length} days · flexible dates`}</Meta>
            <Meta icon={Users}>
              {travellers} {travellers === 1 ? "traveller" : "travellers"} · {cap(input.group)}
            </Meta>
            <Meta icon={Wallet}>{cap(input.budgetTier)} budget</Meta>
            <Meta icon={Sparkles}>{cap(input.pace)} pace</Meta>
          </ul>

          <div className="no-print mt-6 flex flex-wrap gap-2">
            <Button variant={saved ? "secondary" : "primary"} size="sm" icon={saved ? BookmarkCheck : Bookmark} onClick={onSave} disabled={saved}>
              {saved ? "Saved to My trips" : "Save trip"}
            </Button>
            <Button variant="secondary" size="sm" icon={Share2} onClick={share} loading={sharing}>
              Share
            </Button>
            <Button variant="secondary" size="sm" icon={Copy} onClick={copyText}>
              Copy text
            </Button>
            <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        </div>

      </section>

      {/* Section nav */}
      <nav aria-label="Plan sections" className="no-print sticky top-16 z-20 border-y border-line bg-surface/90 backdrop-blur-md">
        <div className="scrollbar-none mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted hover:border-brand hover:text-ink">
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 pb-28 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Sidebar comes first on mobile: weather + budget are the at-a-glance info. */}
        <aside className="space-y-4 lg:order-2">
          {plan.highlights.length > 0 && (
            <div className="rounded-[var(--radius-card)] bg-ink p-5 text-white">
              <h3 className="text-sm font-semibold text-sun">Trip highlights</h3>
              <ul className="mt-3 space-y-2">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5 text-[15px] leading-snug">
                    <Sparkles size={14} className="mt-1 shrink-0 text-sun" aria-hidden /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <WeatherCard weather={weather} />
          {plan.bestTimeNote && <p className="px-1 text-sm text-muted">{plan.bestTimeNote}</p>}
          <BudgetCard plan={plan} input={input} />
          <div className="hidden lg:block">
            <MapCard input={input} />
          </div>
        </aside>

        <main className="min-w-0 space-y-12 lg:order-1">
          <section id="itinerary" data-section aria-labelledby="itinerary-h">
            <SectionTitle>
              <span id="itinerary-h">Day by day</span>
            </SectionTitle>
            {plan.days.length > 3 && <DayNav days={plan.days} />}
            <div className="space-y-5">
              {plan.days.map((d, i) => (
                <DayCard key={`${d.day}-${d.title}`} day={d} input={input} weather={weather} index={i} />
              ))}
            </div>
          </section>
          <Stays plan={plan} input={input} />
          <Food plan={plan} input={input} />
          <Packing key={trip.id} plan={plan} tripId={trip.id} />
          <Tips plan={plan} />
          <div className="lg:hidden">
            <MapCard input={input} />
          </div>
          <p className="text-center text-xs text-muted">
            Plans are generated by AI. Double-check opening hours, prices and bookings before you go.
          </p>
        </main>
      </div>

      <RefineChat key={trip.id} input={input} plan={plan} onUpdate={onUpdatePlan} canUndo={canUndo} onUndo={onUndo} />
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 font-medium text-ink-soft">
      <Icon size={14} className="text-muted" />
      {children}
    </li>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
