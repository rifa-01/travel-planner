import type { SavedTrip } from "./schemas";

/**
 * Saved trips live in localStorage: no accounts needed, and nothing personal
 * leaves the device. Every access is guarded because storage can be disabled
 * (private mode) or full.
 */

const KEY = "wayfarer:trips:v1";
const MAX_TRIPS = 30;

export function loadTrips(): SavedTrip[] {
  return parseTrips(readTripsRaw());
}

/** Raw string snapshot — stable between calls, so it works with useSyncExternalStore. */
export function readTripsRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseTrips(raw: string): SavedTrip[] {
  try {
    const trips = raw ? (JSON.parse(raw) as SavedTrip[]) : [];
    return Array.isArray(trips) ? trips.filter((t) => t?.plan?.days && t.input).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function subscribeTrips(cb: () => void) {
  window.addEventListener("wayfarer:trips", cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener("wayfarer:trips", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Returns false if the trip couldn't be stored. */
export function saveTrip(trip: SavedTrip): boolean {
  try {
    const others = loadTrips().filter((t) => t.id !== trip.id);
    localStorage.setItem(KEY, JSON.stringify([trip, ...others].slice(0, MAX_TRIPS)));
    window.dispatchEvent(new Event("wayfarer:trips"));
    return true;
  } catch {
    return false;
  }
}

export function deleteTrip(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadTrips().filter((t) => t.id !== id)));
    window.dispatchEvent(new Event("wayfarer:trips"));
  } catch {
    /* ignore */
  }
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* Packing checklist state, per trip. */
const packKey = (id: string) => `wayfarer:packed:${id}`;

export function loadPacked(id: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(packKey(id)) ?? "[]");
  } catch {
    return [];
  }
}

export function savePacked(id: string, items: string[]) {
  try {
    localStorage.setItem(packKey(id), JSON.stringify(items));
  } catch {
    /* ignore */
  }
}
