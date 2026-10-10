@AGENTS.md

# Wayfarer — AI Travel Planner

Take-home assessment for an **Associate Software Developer** role: "AI Travel Planner".
Brief requirements: React/Next.js, an LLM API (free tier), API keys never exposed to the
frontend, responsive design, good loading/error/empty/edge states, clean code, and a write-up
of how AI tools were used (see README "How AI tools were used" — the candidate still needs to
add their own notes at the placeholder there).

Graders care about: UI/UX quality, consistency, clear user flow, usefulness of AI output,
thoughtful product decisions, edge-state handling, performance, maintainability.
"Don't over-engineer" was explicit in the brief.

## Commands

- `npm run dev` — local dev at http://localhost:3000
- `npm run lint` / `npx tsc --noEmit` / `npm run build` — all must pass before pushing
- `LLM_MOCK=true` in `.env.local` returns canned AI responses (UI work without quota)

## Architecture (see README for the full file-by-file map)

- `src/components/TravelPlanner.tsx` — client state machine: home → wizard (4 steps) →
  questions (AI follow-ups) → generating → plan. Integrates with browser history.
- `src/app/api/{places,questions,plan,refine}/route.ts` — server routes. All AI calls go
  through here; the browser never talks to Gemini.
- `src/lib/server/llm.ts` — Gemini REST client (no SDK). Structured JSON output via
  `responseSchema` (OpenAPI-style, uppercase types), validated with zod. One retry on bad
  output; falls back from `gemini-flash-latest` to `gemini-3.5-flash-lite` on 404/429.
  Temperature intentionally not set (Gemini 3 models are tuned for the default).
- `src/lib/server/prompts.ts` — system prompts + response schemas. Prompt quality lives here.
- `src/lib/server/geo.ts` — Open-Meteo geocoding + weather (forecast ≤15 days out, otherwise
  same dates last year, otherwise "this week"). Weather failure never blocks a plan.
- `src/lib/schemas.ts` — single source of truth for data shapes (zod). Lenient with LLM output.
- `src/lib/plan.ts` — deterministic post-processing: totals, budget verdict, Maps URLs.
- Persistence: `localStorage` (saved trips, packing ticks), `sessionStorage` (form draft).
  Sharing: whole trip deflate-compressed into the URL hash (`#trip=`). No database by design.

## Product decisions to preserve

- Facts from real data, maths in code: weather from Open-Meteo, budget totals summed in code,
  never trust the model's own totals.
- "Where to stay" recommends areas + well-known examples, never invented hotels.
- Every place is a Google Maps *search* query, so slightly-off names still resolve.
- Follow-up questions are optional; their failure never blocks plan generation.
- Every error path has a user-friendly message and a way forward.

## Conventions

- TypeScript strict, Tailwind v4 with design tokens in `src/app/globals.css` (`brand`,
  `accent`, `paper`, `ink`, `line`, `muted`…). Use tokens, not raw hex, in components.
- Reusable UI primitives are in `src/components/ui/index.tsx` (Button, Chip, OptionCard,
  Stepper, Field, Card, Flag, `inputClass`). Reuse them.
- Server-only modules start with `import "server-only"`.
- API errors use one shape: `{ error: { message, code } }` via `errorResponse()`.

## Gotchas already hit (don't reintroduce)

- Next.js 16 here has `cacheComponents` on: GET route handlers that read the request must call
  `await connection()` or the build tries to prerender them.
- React 19 lint rule `react-hooks/set-state-in-effect`: derive state instead of setting it
  synchronously in effects.
- Global base CSS must stay inside `@layer base`, or it overrides Tailwind utilities.
- `position: fixed` bars must not sit inside an element with an animation/transform (it
  becomes their containing block) — the wizard's action bar is outside the `<form>` and uses
  `form="wizard-form"`.
- Emoji flags don't render on Windows → use the `<Flag>` component (flagcdn SVGs).

## Secrets

- The real key goes ONLY in `.env.local` (git-ignored). `.env.example` must keep
  `GEMINI_API_KEY=` empty — it is committed.
- Never prefix the key with `NEXT_PUBLIC_`.

## Remaining work (owner is finishing these)

- [ ] Test with a real Gemini key: generate several trips, check plan quality and timing
- [ ] Add personal notes to the README's AI-usage section
- [ ] Push to GitHub, deploy to Vercel with `GEMINI_API_KEY` set, test the live site
- Ideas from README "What I'd do next": streaming the plan, multi-stop map, short share URLs
