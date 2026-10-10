"use client";

import { ArrowLeft, Info, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FollowUpQuestion, TripInput } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Button, Chip, cx, inputClass } from "@/components/ui";

type Props = {
  input: TripInput;
  /** Cached questions so going back and forth doesn't re-ask the AI. */
  cache: { key: string; questions: FollowUpQuestion[] } | null;
  setCache: (c: { key: string; questions: FollowUpQuestion[] }) => void;
  answers: Record<string, string[]>;
  setAnswers: (fn: (a: Record<string, string[]>) => Record<string, string[]>) => void;
  onBack: () => void;
  onGenerate: (followUps: TripInput["followUps"]) => void;
};

/**
 * Step 5: the AI looks at what we know and asks 2–4 destination-specific questions.
 * Entirely optional — if it fails or the user skips, we still generate a plan.
 */
export function FollowUps({ input, cache, setCache, answers, setAnswers, onBack, onGenerate }: Props) {
  const key = JSON.stringify(input);
  const cached = cache?.key === key ? cache.questions : null;
  const [questions, setQuestions] = useState<FollowUpQuestion[] | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (cached) return;
    const ctrl = new AbortController();
    api<{ questions: FollowUpQuestion[] }>("/api/questions", input, ctrl.signal)
      .then(({ questions }) => {
        setQuestions(questions);
        setCache({ key, questions });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the trip itself changes or on retry
  }, [key, attempt]);

  function pick(q: FollowUpQuestion, option: string) {
    setAnswers((a) => {
      const current = a[q.id] ?? [];
      const nextVal = q.multi ? (current.includes(option) ? current.filter((o) => o !== option) : [...current, option]) : current[0] === option ? [] : [option];
      return { ...a, [q.id]: nextVal };
    });
  }

  function submit() {
    const followUps = (questions ?? [])
      .map((q) => {
        const parts = [...(answers[q.id] ?? []), custom[q.id]?.trim()].filter(Boolean);
        return parts.length ? { question: q.question, answer: parts.join("; ") } : null;
      })
      .filter((x): x is { question: string; answer: string } => x !== null);
    onGenerate(followUps);
  }

  const answeredCount = (questions ?? []).filter((q) => (answers[q.id]?.length ?? 0) > 0 || custom[q.id]?.trim()).length;
  const loading = !questions && !error;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-36 sm:pt-10">
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-line-strong"
          aria-label="Previous step"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-brand" />
          ))}
        </div>
        <span className="text-sm text-muted tabular-nums">5/5</span>
      </div>

      <header className="mb-8 animate-fade-up">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
          <Wand2 size={13} /> Tailored for {input.destination.name}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-medium tracking-tight text-ink outline-none sm:text-4xl">
          A few quick questions
        </h1>
        <p className="mt-2 text-muted">Optional, but they make the plan noticeably better. Skip any you like.</p>
      </header>

      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="space-y-5" aria-label="Thinking of questions">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton mt-2 h-4 w-1/2" />
                <div className="mt-4 flex gap-2">
                  <div className="skeleton h-10 w-28 !rounded-full" />
                  <div className="skeleton h-10 w-24 !rounded-full" />
                  <div className="skeleton h-10 w-32 !rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center">
            <p className="font-medium text-ink">We couldn&apos;t come up with extra questions.</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <p className="mt-1 text-sm text-muted">No problem — you can still create your plan with what you&apos;ve told us.</p>
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              className="mt-4"
              onClick={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {questions && questions.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center text-muted">
            You&apos;ve told us everything we need. Let&apos;s build your plan.
          </p>
        )}

        {questions && questions.length > 0 && (
          <ol className="space-y-5">
            {questions.map((q, i) => (
              <li
                key={q.id}
                style={{ animationDelay: `${i * 70}ms` }}
                className="animate-fade-up rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <p className="font-semibold text-ink">{q.question}</p>
                {q.why && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                    <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> {q.why}
                  </p>
                )}
                <div role={q.multi ? "group" : "radiogroup"} aria-label={q.question} className="mt-4 flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <Chip key={o} multi={q.multi} selected={(answers[q.id] ?? []).includes(o)} onClick={() => pick(q, o)}>
                      {o}
                    </Chip>
                  ))}
                </div>
                <input
                  aria-label={`Other answer for: ${q.question}`}
                  placeholder="Or type your own…"
                  maxLength={150}
                  value={custom[q.id] ?? ""}
                  onChange={(e) => setCustom((c) => ({ ...c, [q.id]: e.target.value }))}
                  className={cx(inputClass, "mt-3 border-transparent bg-paper py-2.5 text-sm")}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
          {questions && questions.length > 0 && (
            <span className="mr-auto text-sm text-muted tabular-nums">
              {answeredCount}/{questions.length} answered
            </span>
          )}
          <Button size="lg" icon={Sparkles} onClick={submit} className="flex-1 sm:flex-none">
            {loading ? "Skip & create plan" : "Create my plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
