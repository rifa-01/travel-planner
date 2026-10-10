"use client";

import { AlertTriangle, ArrowLeft, Check, Loader2, Plane, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { TripInput } from "@/lib/schemas";
import { Button, cx } from "@/components/ui";

const STAGES = [
  "Checking the weather for your dates",
  "Finding places that match your interests",
  "Grouping days by neighbourhood",
  "Picking where to eat",
  "Estimating your budget",
  "Adding local tips and final touches",
];

export function Generating({ input, error, onCancel, onRetry }: { input: TripInput; error: string | null; onCancel: () => void; onRetry: () => void }) {
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);

  // Honest-ish progress: stages advance on a timer but never claim to finish before the response does.
  useEffect(() => {
    if (error) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3800);
    const slowT = setTimeout(() => setSlow(true), 30_000);
    return () => {
      clearInterval(t);
      clearTimeout(slowT);
    };
  }, [error]);

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center" role="alert">
        <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle size={26} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-medium">We couldn&apos;t build your plan</h1>
        <p className="mt-2 text-muted">{error}</p>
        <p className="mt-1 text-sm text-muted">Your answers are saved — nothing to re-enter.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={onCancel}>
            Edit trip
          </Button>
          <Button icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16" aria-live="polite" aria-busy>
      <div className="relative mb-8 grid size-24 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/10 [animation-duration:2.2s]" />
        <span className="absolute inset-2 rounded-full bg-brand-soft" />
        <Plane size={34} className="relative animate-float text-brand" />
      </div>
      <h1 className="text-center font-display text-2xl font-medium sm:text-3xl">
        Planning {input.days} {input.days === 1 ? "day" : "days"} in {input.destination.name}
      </h1>
      <p className="mt-2 text-center text-muted">This usually takes 15–40 seconds.</p>

      <ol className="mt-8 w-full space-y-3">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cx(
              "flex items-center gap-3 text-[15px] transition-all duration-500",
              i < stage ? "text-ink-soft" : i === stage ? "font-medium text-ink" : "text-muted/50",
            )}
          >
            <span
              className={cx(
                "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
                i < stage ? "bg-brand text-white" : i === stage ? "bg-brand-soft text-brand" : "bg-line",
              )}
            >
              {i < stage ? <Check size={14} /> : i === stage ? <Loader2 size={14} className="animate-spin" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {slow && <p className="mt-6 animate-fade-in text-center text-sm text-muted">Longer trips take a little more time — almost there.</p>}

      <Button variant="ghost" size="sm" className="mt-8" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
