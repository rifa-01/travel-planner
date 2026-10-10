"use client";

import { ArrowUp, Loader2, MessageCircle, Sparkles, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, TripInput, TripPlan } from "@/lib/schemas";
import { api, ApiError } from "@/lib/api";
import { Button, cx } from "@/components/ui";

const SUGGESTIONS = [
  "Make day 2 more relaxed",
  "Add a rainy-day backup",
  "Swap in cheaper options",
  "More local, less touristy",
  "Add a day trip",
];

type Props = {
  input: TripInput;
  plan: TripPlan;
  onUpdate: (plan: TripPlan) => void;
  canUndo: boolean;
  onUndo: () => void;
};

type Message = ChatMessage & { error?: boolean };

export function RefineChat({ input, plan, onUpdate, canUndo, onUndo }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  async function send(text: string) {
    const message = text.trim();
    if (message.length < 2 || busy) return;
    const history = messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setDraft("");
    setBusy(true);
    ctrlRef.current = new AbortController();
    try {
      const res = await api<{ reply: string; plan: TripPlan }>("/api/refine", { input, plan, history, message }, ctrlRef.current.signal);
      onUpdate(res.plan);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setMessages((m) => [...m, { role: "assistant", content: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "no-print fixed right-4 bottom-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-ink pr-5 pl-4 font-medium text-white shadow-[var(--shadow-lift)] transition-all hover:bg-ink-soft active:scale-95 sm:right-6 sm:bottom-6",
          open && "pointer-events-none translate-y-4 opacity-0",
        )}
        aria-haspopup="dialog"
      >
        <Sparkles size={18} className="text-sun" /> Edit with AI
      </button>

      {open && <div className="no-print fixed inset-0 z-40 animate-fade-in bg-ink/20 backdrop-blur-[2px] sm:hidden" onClick={() => setOpen(false)} />}

      {open && (
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Edit your plan with AI"
        className={cx(
          "no-print fixed z-50 flex animate-fade-up flex-col overflow-hidden border border-line bg-surface shadow-[var(--shadow-lift)]",
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl",
          "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(600px,calc(100dvh-3rem))] sm:max-h-none sm:w-[400px] sm:rounded-3xl",
        )}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
            <MessageCircle size={18} />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-ink">Edit with AI</h2>
            <p className="text-xs text-muted">Changes apply instantly</p>
          </div>
          {canUndo && (
            <Button variant="ghost" size="sm" icon={Undo2} onClick={onUndo} disabled={busy}>
              Undo
            </Button>
          )}
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="py-2">
              <p className="text-[15px] text-ink-soft">
                Want to change something? Ask in plain words — like swapping an activity, slowing a day down, or adding food spots.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:border-brand hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cx(
                "max-w-[85%] animate-fade-up rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                m.role === "user" ? "ml-auto rounded-br-md bg-brand text-white" : m.error ? "rounded-bl-md bg-danger-soft text-danger" : "rounded-bl-md bg-paper text-ink",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-paper px-4 py-2.5 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" /> Updating your plan…
            </div>
          )}
        </div>

        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="e.g. More beaches on day 3"
            aria-label="Describe a change"
            className="max-h-32 min-h-11 flex-1 resize-none [field-sizing:content] rounded-xl bg-paper px-4 py-2.5 text-[15px] placeholder:text-muted/70 focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || draft.trim().length < 2}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:bg-brand-strong disabled:bg-line disabled:text-muted"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </form>
      </div>
      )}
    </>
  );
}
