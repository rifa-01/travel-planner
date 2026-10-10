# Wayfarer — AI Travel Planner

Tell it where you're going. Answer a few questions. Get a day-by-day plan that fits who you're travelling with, your budget and the real weather. Then change it by chatting.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**, using **Google Gemini** (free tier) for the AI and **Open-Meteo** (free, no key) for geocoding and weather.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then paste your key into GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```

Get a free Gemini key at <https://aistudio.google.com/apikey>.

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Server-side only. Never sent to the browser. |
| `GEMINI_MODEL` | no | Defaults to `gemini-flash-latest`. |
| `GEMINI_FALLBACK_MODEL` | no | Defaults to `gemini-3.5-flash-lite`. Used when the main model is rate-limited or unavailable. |
| `LLM_MOCK` | no | `true` returns canned AI responses, so you can work on the UI without using any quota. |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`.

---

## The experience

1. **Destination.** A search box with suggestions from Open-Meteo geocoding, full keyboard support and country flags. If there's no match you can still use the text you typed, so "Tokyo & Kyoto" or a small village still works.
2. **Four short steps.** Dates (optional) and length → who's going and why → interests and pace → budget style, an optional total amount, and must-haves (diet, accessibility, kids, avoiding crowds…) plus free-text notes.
3. **AI follow-up questions.** The model reads everything so far and asks 2–4 questions about this specific destination ("Day trip to Sintra?", "Arriving late on day one?"). Each one has tappable answers, a "why we're asking" line and a free-text field. You can skip the whole step, and if it fails the flow carries on.
4. **Generation.** Real weather is fetched first and passed into the prompt. A staged progress screen shows during generation, and you can cancel it.
5. **The plan.**
   - A hero section with the trip title, summary and key facts, plus Save / Share / Copy text / Print-PDF.
   - **Day-by-day timeline.** Each day is grouped around one neighbourhood. Every stop has a type icon, time slot, duration, per-person cost, an insider tip, a "rain-proof" badge and a Google Maps link. Each day also has a **day-route link** and that day's forecast.
   - **Sidebar:** highlights, a weather strip, a **budget breakdown** that compares the estimate with *your* budget (over / close / under), and a map.
   - **Where to stay** (areas first, a few example properties second), **what to eat** (with dietary labels), a **packing checklist** that remembers what you've ticked, **local tips** and **handy phrases**.
6. **Edit with AI.** A chat panel ("make day 2 more relaxed", "swap in cheaper options"). The plan updates in place, and **Undo** goes back up to 10 changes.
7. **My trips.** Plans are saved to your device automatically. **Share links** carry the whole trip, compressed, in the URL hash, so no account or database is needed.

---

## Product decisions (and why)

- **Weather comes from real data, not the LLM.** Open-Meteo provides a forecast when the trip is within ~15 days. For later trips it uses the *same dates last year*, labelled clearly as a guide. The data goes into the prompt, so rainy days get indoor stops, and it's shown next to each day.
- **Numbers are calculated in code, not trusted from the model.** Budget totals, per-person and per-day figures, the budget comparison, day numbering and slot order are all worked out in code after validation. The model provides the parts of the estimate, and the totals add up.
- **"Where to stay" means areas, not invented hotels.** LLMs make up hotel names with confidence. The plan recommends *areas* with a reason, adds a few well-known example properties, and links to a live search.
- **Every place is a Maps search query**, so even a slightly off name still finds the right place.
- **Questions are optional.** They improve the plan, but a failure or a skip never blocks you.
- **No accounts, no database.** For a planner like this, `localStorage` plus share-by-URL covers save and share without collecting any personal data. Share links use the URL *hash*, which never reaches the server.
- **One provider, kept simple.** A small typed Gemini client (no SDK, no provider abstraction) is easy to read and test. The model name is configurable, and there's an automatic fallback.

## Handling things going wrong

| Situation | What happens |
| --- | --- |
| Missing / invalid API key, model not found | A clear message saying exactly which setting to fix |
| Free-tier rate limit (429) | Switches to the fallback model automatically, otherwise shows a "wait a minute" message |
| Model returns invalid or truncated JSON | Retries once. If the output ran out of tokens, suggests fewer days or a slower pace |
| Output doesn't match the schema | Validated with zod. Slightly-off enum values are corrected rather than failing the whole plan |
| Safety block | Asks the user to rephrase their notes |
| Weather or geocoding down | The plan is still generated, and the weather card says the data isn't available |
| Follow-up questions fail | Explains the problem, offers to try again, and still lets you create the plan |
| Unknown destination | You can still use the text you typed |
| Offline / network error | Offline-specific message |
| Generation takes a while | Staged progress, a reassurance after 30s, and Cancel |
| Generation fails | Error screen with **Try again** / **Edit trip**. Your answers are kept |
| Refresh in the middle of the form | The draft is restored from `sessionStorage` |
| Broken share link | A toast, then the home page |
| Storage full or disabled | Saving fails safely with a message, and the app keeps working |
| Abuse | Per-IP rate limit on AI routes, zod-validated input with length caps |
| Validation | Inline per-step messages (no destination, start date in the past, no interests) |

## Accessibility & polish

Semantic headings with focus moved to each new step, an ARIA combobox/listbox for search, radio/checkbox roles on chips, `aria-live` for loading and chat, a visible focus ring, `prefers-reduced-motion` support, thumb-reachable sticky action bars on mobile, print styles and a consistent set of design tokens (`globals.css`).

---

## Project structure

```
src/
  app/
    page.tsx, layout.tsx, globals.css   design tokens, fonts, print + motion rules
    api/
      places/route.ts     GET  geocoding proxy (Open-Meteo)
      questions/route.ts  POST AI follow-up questions
      plan/route.ts       POST weather → AI plan → normalise
      refine/route.ts     POST chat-based edits to an existing plan
  lib/
    schemas.ts            zod schemas + types (input, plan, weather)
    plan.ts               deterministic helpers: normalise, budget maths, Maps URLs
    server/llm.ts         Gemini client: structured output, retries, fallback, error mapping
    server/prompts.ts     system prompts + response schemas
    server/geo.ts         geocoding + forecast / historical weather
    server/http.ts        error responses, body parsing, rate limiting
    server/mock.ts        canned responses for LLM_MOCK
    storage.ts, share.ts  saved trips, packing state, compressed share links
  components/
    TravelPlanner.tsx     flow state machine + browser history integration
    Home.tsx, Generating.tsx
    wizard/               DestinationSearch, Wizard steps, FollowUps
    plan/                 PlanView, Itinerary, Sidebar, Sections, RefineChat
    ui/                   Button, Chip, OptionCard, Stepper, Flag, Toast…
```

---

## How AI tools were used

**Tools:** Claude Code (Anthropic) as a pair-programmer in the terminal and editor.

**What it was used for**
- Turning the brief into a feature plan and a component and API structure.
- Scaffolding components, the Gemini client, zod schemas and prompts.
- Driving the app in a browser at desktop and mobile sizes to find visual and interaction bugs.
- Checking API details against Google's current documentation.

**What had to be changed, corrected or rethought**
- **Model choice was out of date.** The first draft defaulted to `gemini-2.5-flash`. Google's current docs say 2.5 models are now only available to existing users. I switched to the `gemini-flash-latest` alias, added an automatic fallback to Flash-Lite on 404/429, and removed the temperature override (Gemini 3 models are tuned for their default temperature).
- **Thinking tokens count toward the output limit.** The first token limits risked cutting long plans off part-way. I raised them and added a specific "plan too long" message when output is truncated.
- **Fixed action bar wasn't fixed.** It sat inside a form with an entrance animation, and `transform` creates a new containing block for `position: fixed`. I moved the bar outside the form and linked the button with `form="wizard-form"`.
- **Global focus styles beat Tailwind utilities.** Unlayered CSS overrides `@layer utilities` in Tailwind v4, so headings that were focused programmatically showed rings. I moved the base styles into `@layer base`.
- **Search dropdown was clipped and hidden** by an `overflow-hidden` hero and a sibling's stacking context.
- **Flag emojis don't render on Windows** (they show as "PT"), so they were replaced with small SVG flags.
- **The sticky section nav stopped sticking** because it was inside the hero section. A sticky sidebar taller than the viewport hid its own bottom.
- **React 19 lint (`set-state-in-effect`)** flagged two effects. I rewrote search loading as derived state ("results belong to query X") and restored the draft from an event handler instead of a mount effect.
- **Don't trust the model with maths.** The early version showed the model's own total, which didn't always equal its breakdown. Totals are now calculated in code.

> _Candidate: add your own notes here: what you reviewed, what you disagreed with, and what you'd do next._

## What I'd do next

- Stream the plan so day 1 appears while the rest is still being generated.
- Multi-city routing with a real map of each day's stops (Leaflet + geocoded points).
- Server-side share links (short URLs) and optional accounts to sync across devices.
- Prompt evaluation set: a dozen fixed trip inputs scored for structure and constraint-following.
