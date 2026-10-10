"use client";

import { Compass, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FollowUpQuestion, Place, SavedTrip, TripInput, TripPlan, WeatherInfo } from "@/lib/schemas";
import { api, ApiError } from "@/lib/api";
import { deleteTrip, loadTrips, newId, parseTrips, readTripsRaw, saveTrip, subscribeTrips } from "@/lib/storage";
import { decodeTrip } from "@/lib/share";
import { guessCurrency } from "@/lib/options";
import { Button } from "./ui";
import { ToastProvider, useToast } from "./ui/toast";
import { Home } from "./Home";
import { Wizard, type Draft } from "./wizard/Wizard";
import { FollowUps } from "./wizard/FollowUps";
import { Generating } from "./Generating";
import { PlanView } from "./plan/PlanView";

type View = "home" | "wizard" | "questions" | "generating" | "plan";

const DRAFT_KEY = "wayfarer:draft:v1";
const OPEN_TRIP_KEY = "wayfarer:open-trip:v1";

/** The in-progress form survives a reload (but not a new tab) via sessionStorage. */
function restoreDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

function emptyDraft(): Draft {
  return {
    destination: null,
    startDate: undefined,
    days: 4,
    group: "couple",
    adults: 2,
    children: 0,
    purpose: "Holiday",
    interests: [],
    pace: "balanced",
    budgetTier: "moderate",
    budgetAmount: undefined,
    currency: guessCurrency(),
    requirements: [],
    notes: "",
  };
}

export function TravelPlanner() {
  return (
    <ToastProvider>
      <Planner />
    </ToastProvider>
  );
}

function Planner() {
  const toast = useToast();
  const [view, setViewState] = useState<View>("home");
  const [step, setStep] = useState(0);
  const [draft, setDraftState] = useState<Draft>(emptyDraft);
  const [questionCache, setQuestionCache] = useState<{ key: string; questions: FollowUpQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [followUps, setFollowUps] = useState<TripInput["followUps"]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [saved, setSaved] = useState(false);
  const [undoStack, setUndoStack] = useState<TripPlan[]>([]);
  const genCtrl = useRef<AbortController | null>(null);

  const tripsRaw = useSyncExternalStore(subscribeTrips, readTripsRaw, () => "");
  const trips = useMemo(() => parseTrips(tripsRaw), [tripsRaw]);

  /* ---------------- navigation (keeps the browser back button useful) ---------------- */

  const setView = useCallback((v: View, opts: { replace?: boolean } = {}) => {
    // Leaving the loading screen any other way cancels the in-flight request.
    if (v !== "generating" && v !== "plan") genCtrl.current?.abort();
    setViewState(v);
    const url = v === "plan" ? location.href : location.pathname;
    if (opts.replace) history.replaceState({ view: v }, "", url);
    else history.pushState({ view: v }, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      // In-page anchors (#day-2, #food…) push a stateless entry: stay put and tag it with the current view.
      if (!e.state) {
        history.replaceState({ view: viewRef.current }, "", location.href);
        return;
      }
      const v = (e.state.view as View | undefined) ?? "home";
      genCtrl.current?.abort();
      // "generating" isn't a place you can go back to.
      setViewState(v === "generating" ? "questions" : v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---------------- restore draft + open shared links ---------------- */

  useEffect(() => {
    // A refresh on the plan page reopens that trip (history.state survives reloads).
    let reopened: SavedTrip | undefined;
    try {
      const id = history.state?.view === "plan" ? sessionStorage.getItem(OPEN_TRIP_KEY) : null;
      reopened = id ? loadTrips().find((t) => t.id === id) : undefined;
    } catch {
      /* storage disabled: start fresh */
    }
    history.replaceState({ view: "home" }, "", location.href);

    if (reopened) {
      queueMicrotask(() => {
        setTrip(reopened);
        setSaved(true);
        setViewState("plan");
        history.replaceState({ view: "plan" }, "", location.href);
      });
      return;
    }

    const hash = location.hash;
    if (hash.startsWith("#trip=")) {
      decodeTrip(hash.slice(6)).then((shared) => {
        if (!shared) {
          history.replaceState({ view: "home" }, "", location.pathname);
          toast("That share link is broken or incomplete", "error");
          return;
        }
        setTrip({ ...shared, id: newId(), createdAt: Date.now(), updatedAt: Date.now() });
        setSaved(false);
        setUndoStack([]);
        setViewState("plan");
        history.replaceState({ view: "plan" }, "", location.href);
      });
    }
  }, [toast]);

  useEffect(() => {
    try {
      if (view === "plan" && trip && saved) sessionStorage.setItem(OPEN_TRIP_KEY, trip.id);
    } catch {
      /* ignore */
    }
  }, [view, trip, saved]);

  const setDraft = useCallback((fn: (d: Draft) => Draft) => {
    setDraftState((d) => {
      const next = fn(d);
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const input: TripInput | null = useMemo(
    () => (draft.destination ? { ...draft, destination: draft.destination, notes: draft.notes || undefined } : null),
    [draft],
  );

  /* ---------------- actions ---------------- */

  const draftRestored = useRef(false);

  function start(place: Place | null) {
    const restore = !draftRestored.current;
    draftRestored.current = true;
    setDraft((d) => {
      const base = (restore && restoreDraft()) || d;
      return place ? { ...base, destination: place } : base;
    });
    setStep(0);
    setView("wizard");
  }

  async function generate(fu: TripInput["followUps"] = followUps) {
    if (!input) return;
    setFollowUps(fu);
    setGenError(null);
    if (view !== "generating") setView("generating");

    genCtrl.current?.abort();
    const ctrl = (genCtrl.current = new AbortController());
    const body: TripInput = { ...input, followUps: fu };

    try {
      const res = await api<{ plan: TripPlan; weather: WeatherInfo | null; destination: Place }>("/api/plan", body, ctrl.signal);
      const now = Date.now();
      const next: SavedTrip = { id: newId(), createdAt: now, updatedAt: now, input: { ...body, destination: res.destination }, plan: res.plan, weather: res.weather };
      setTrip(next);
      setUndoStack([]);
      // Auto-save: losing a freshly generated plan to a refresh would be painful.
      const ok = saveTrip(next);
      setSaved(ok);
      if (!ok) toast("Couldn't save this trip on your device", "error");
      setView("plan", { replace: true });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setGenError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function cancelGeneration() {
    genCtrl.current?.abort();
    setGenError(null);
    setView("questions", { replace: true });
  }

  function openTrip(t: SavedTrip) {
    setTrip(t);
    setSaved(true);
    setUndoStack([]);
    setView("plan");
  }

  function removeTrip(t: SavedTrip) {
    if (!confirm(`Delete “${t.plan.title}”? This can't be undone.`)) return;
    deleteTrip(t.id);
    toast("Trip deleted");
  }

  function updatePlan(plan: TripPlan) {
    if (!trip) return;
    setUndoStack((s) => [...s.slice(-9), trip.plan]);
    const next = { ...trip, plan, input: { ...trip.input, days: plan.days.length }, updatedAt: Date.now() };
    setTrip(next);
    if (saved) saveTrip(next);
  }

  function undo() {
    if (!trip || !undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    const next = { ...trip, plan: prev, input: { ...trip.input, days: prev.days.length }, updatedAt: Date.now() };
    setTrip(next);
    if (saved) saveTrip(next);
    toast("Change undone");
  }

  function save() {
    if (!trip) return;
    if (saveTrip(trip)) {
      setSaved(true);
      toast("Saved to My trips");
    } else toast("Couldn't save — your browser storage may be full or disabled", "error");
  }

  function newTrip() {
    draftRestored.current = true;
    setDraft(() => emptyDraft());
    setAnswers({});
    setQuestionCache(null);
    setStep(0);
    setView("wizard");
  }

  /* ---------------- render ---------------- */

  return (
    <>
      <header className="no-print sticky top-0 z-30 h-16 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
          <button type="button" onClick={() => setView("home")} className="flex items-center gap-2 font-display text-xl font-medium tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-white">
              <Compass size={18} />
            </span>
            Wayfarer
          </button>
          <div className="flex items-center gap-1">
            {trips.length > 0 && view !== "home" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView("home");
                  setTimeout(() => document.getElementById("trips")?.scrollIntoView(), 50);
                }}
              >
                My trips
              </Button>
            )}
            {(view === "home" || view === "plan") && (
              <Button variant="secondary" size="sm" icon={Plus} onClick={newTrip}>
                New trip
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {view === "home" && <Home trips={trips} onStart={start} onOpen={openTrip} onDelete={removeTrip} />}

        {view === "wizard" && (
          <Wizard draft={draft} setDraft={setDraft} step={step} setStep={setStep} onExit={() => setView("home")} onDone={() => setView("questions")} />
        )}

        {view === "questions" && input && (
          <FollowUps
            input={input}
            cache={questionCache}
            setCache={setQuestionCache}
            answers={answers}
            setAnswers={setAnswers}
            onBack={() => {
              setStep(3);
              setView("wizard");
            }}
            onGenerate={generate}
          />
        )}

        {view === "generating" && input && (
          <Generating input={input} error={genError} onCancel={cancelGeneration} onRetry={() => generate()} />
        )}

        {view === "plan" && trip && (
          <PlanView trip={trip} saved={saved} onSave={save} onUpdatePlan={updatePlan} canUndo={undoStack.length > 0} onUndo={undo} />
        )}

        {/* Lost state (e.g. a back/forward into a view whose data is gone) → offer a way out. */}
        {((view === "plan" && !trip) || ((view === "questions" || view === "generating") && !input)) && (
          <div className="mx-auto max-w-md px-4 py-24 text-center">
            <p className="font-display text-2xl">Nothing to show here</p>
            <p className="mt-2 text-muted">Let&apos;s start a new trip.</p>
            <Button className="mt-6" icon={Plus} onClick={newTrip}>
              New trip
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
