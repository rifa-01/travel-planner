"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Flag, cx } from "@/components/ui";

type Props = {
  value: Place | null;
  onChange: (place: Place | null) => void;
  autoFocus?: boolean;
  size?: "md" | "lg";
  placeholder?: string;
  /** Called when the user confirms with Enter on a chosen place. */
  onSubmit?: (place: Place) => void;
};

/**
 * Accessible combobox backed by Open-Meteo geocoding. Picking a suggestion gives us
 * coordinates (weather + map); free text still works for multi-city or obscure places.
 */
export function DestinationSearch({ value, onChange, autoFocus, size = "md", placeholder = "City, region or country", onSubmit }: Props) {
  const [query, setQuery] = useState(value ? label(value) : "");
  const [found, setFound] = useState<{ q: string; places: Place[]; error?: string }>({ q: "", places: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const picked = value && query === label(value);
  const q = query.trim();
  const shouldSearch = !picked && q.length >= 2;

  useEffect(() => {
    if (!shouldSearch) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { places } = await api<{ places: Place[] }>(`/api/places?q=${encodeURIComponent(q)}`, undefined, ctrl.signal);
        setFound({ q, places });
        setActive(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFound({ q, places: [], error: (err as Error).message });
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, shouldSearch]);

  // Results always belong to a specific query, so "loading" is simply "we don't have results for this text yet".
  const loading = shouldSearch && found.q !== q;
  const results = found.places;
  const error = found.error ?? null;

  const freeText = query.trim();
  // Options: geocoded hits, plus "use what I typed" so nothing is a dead end.
  const options: { place: Place; free?: boolean }[] = [
    ...results.map((place) => ({ place })),
    ...(freeText.length >= 2 && !picked ? [{ place: { name: freeText }, free: true }] : []),
  ];

  function choose(place: Place) {
    onChange(place);
    setQuery(label(place));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && options[active]) choose(options[active].place);
      else if (value && picked) onSubmit?.(value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !picked && freeText.length >= 2;

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={size === "lg" ? 22 : 18}
          className={cx("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "left-5" : "left-4")}
          aria-hidden
        />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
          aria-label="Destination"
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={cx(
            "w-full rounded-2xl border border-line-strong bg-surface text-ink placeholder:text-muted/70 shadow-[var(--shadow-card)] transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15",
            size === "lg" ? "h-16 pl-14 pr-14 text-lg" : "h-13 pl-11 pr-11 text-base",
          )}
        />
        <div className={cx("absolute top-1/2 -translate-y-1/2", size === "lg" ? "right-4" : "right-3")}>
          {loading ? (
            <Loader2 size={18} className="animate-spin text-muted" aria-label="Searching" />
          ) : (
            query && (
              <button
                type="button"
                aria-label="Clear destination"
                onClick={() => {
                  setQuery("");
                  onChange(null);
                  inputRef.current?.focus();
                }}
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink"
              >
                <X size={16} />
              </button>
            )
          )}
        </div>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full animate-fade-in overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]"
        >
          {error && <li className="px-3 py-2 text-sm text-muted">{error}</li>}
          {!loading && !error && results.length === 0 && (
            <li className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted uppercase">No exact match found</li>
          )}
          {options.map((o, i) => (
            <li
              key={o.free ? "free" : `${o.place.lat},${o.place.lon},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.place)}
              onMouseEnter={() => setActive(i)}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                i === active ? "bg-paper" : "",
                o.free && results.length > 0 && "mt-1 border-t border-line pt-3",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-lg">
                {!o.free && o.place.countryCode ? <Flag code={o.place.countryCode} className="h-3.5" /> : <MapPin size={16} className="text-brand" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{o.free ? `Use “${o.place.name}”` : o.place.name}</span>
                <span className="block truncate text-sm text-muted">
                  {o.free ? "Multi-city trips and regions work too" : [o.place.region, o.place.country].filter(Boolean).join(", ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function label(p: Place) {
  return p.country && p.lat != null ? `${p.name}, ${p.country}` : p.name;
}
