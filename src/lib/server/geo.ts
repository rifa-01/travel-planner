import "server-only";
import type { Place, WeatherDay, WeatherInfo } from "@/lib/schemas";
import { addDays, daysBetween, todayISO } from "@/lib/dates";

/**
 * Open-Meteo: free, keyless geocoding + weather. Weather comes from real data,
 * never from the LLM, and is passed *into* the prompt so the plan can react to it.
 */

const FORECAST_HORIZON_DAYS = 15;

type GeoResult = {
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  feature_code?: string;
  population?: number;
};

export async function searchPlaces(query: string, count = 6): Promise<Place[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as { results?: GeoResult[] };

  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    region: r.admin1 && r.admin1 !== r.name ? r.admin1 : undefined,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }));
}

/** Fill in coordinates when the user typed a free-text destination. */
export async function resolvePlace(place: Place): Promise<Place> {
  if (place.lat != null && place.lon != null) return place;
  // "Tokyo & Kyoto" or "Lisbon, Portugal" → geocode the first meaningful chunk.
  const first = place.name.split(/,|&| and |\/|→|->/i)[0]?.trim();
  if (!first) return place;
  try {
    const [hit] = await searchPlaces(first, 1);
    return hit ? { ...hit, name: place.name } : place;
  } catch {
    return place;
  }
}

type DailyBlock = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum: number[];
};

export async function getWeather(place: Place, startDate: string | undefined, days: number): Promise<WeatherInfo | null> {
  if (place.lat == null || place.lon == null) return null;

  try {
    const today = todayISO();
    const start = startDate ?? today;
    const end = addDays(start, days - 1);
    const offset = daysBetween(today, start);

    // Trip falls inside the forecast window → live forecast.
    if (startDate && offset >= 0 && offset + days <= FORECAST_HORIZON_DAYS) {
      const daily = await fetchDaily("https://api.open-meteo.com/v1/forecast", place, start, end, true);
      return daily && { kind: "forecast", days: daily, summary: summarize(daily) };
    }

    // Trip is further out → the same dates in the most recent past year, as a realistic guide.
    // (The archive lags a few days behind today, hence the buffer.)
    if (startDate) {
      let years = 0;
      while (daysBetween(shiftYear(end, -years), today) < 6 && years < 5) years++;
      const pastStart = shiftYear(start, -years);
      const daily = await fetchDaily("https://archive-api.open-meteo.com/v1/archive", place, pastStart, addDays(pastStart, days - 1), false);
      return daily && { kind: "historical", days: daily, summary: summarize(daily) };
    }

    // No dates → show the coming week so the user still gets a feel for it.
    const daily = await fetchDaily("https://api.open-meteo.com/v1/forecast", place, today, addDays(today, Math.min(days, 7) - 1), true);
    return daily && { kind: "current", days: daily, summary: summarize(daily) };
  } catch (err) {
    console.warn("[weather] unavailable", err);
    return null; // Weather is a nice-to-have; never fail the plan over it.
  }
}

async function fetchDaily(base: string, place: Place, start: string, end: string, withProb: boolean): Promise<WeatherDay[] | null> {
  const url = new URL(base);
  url.searchParams.set("latitude", String(place.lat));
  url.searchParams.set("longitude", String(place.lon));
  url.searchParams.set(
    "daily",
    ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", withProb && "precipitation_probability_max"]
      .filter(Boolean)
      .join(","),
  );
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const { daily } = (await res.json()) as { daily?: DailyBlock };
  if (!daily?.time?.length) return null;

  return daily.time.map((date, i) => ({
    date,
    code: daily.weather_code[i] ?? 0,
    max: Math.round(daily.temperature_2m_max[i] ?? 0),
    min: Math.round(daily.temperature_2m_min[i] ?? 0),
    precipProb: daily.precipitation_probability_max?.[i] ?? null,
    precipMm: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
  }));
}

function summarize(days: WeatherDay[]): string {
  const hi = Math.max(...days.map((d) => d.max));
  const lo = Math.min(...days.map((d) => d.min));
  const wet = days.filter((d) => d.precipMm >= 1 || (d.precipProb ?? 0) >= 60).length;
  const wetText = wet === 0 ? "mostly dry" : `${wet} of ${days.length} days with rain`;
  return `${lo}–${hi}°C, ${wetText}`;
}

function shiftYear(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map(Number);
  // Clamp Feb 29 → Feb 28 when shifting into a non-leap year.
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y + years}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
