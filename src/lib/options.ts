import {
  Baby,
  Briefcase,
  Camera,
  Coffee,
  Gem,
  Heart,
  Landmark,
  Martini,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Sun,
  Trees,
  User,
  Users,
  UtensilsCrossed,
  Waves,
  Wallet,
  Leaf,
  Footprints,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { TripInput } from "./schemas";

export const GROUPS: { value: TripInput["group"]; label: string; icon: LucideIcon; adults: number; children: number }[] = [
  { value: "solo", label: "Solo", icon: User, adults: 1, children: 0 },
  { value: "couple", label: "Couple", icon: Heart, adults: 2, children: 0 },
  { value: "family", label: "Family", icon: Baby, adults: 2, children: 1 },
  { value: "friends", label: "Friends", icon: Users, adults: 3, children: 0 },
  { value: "business", label: "Work trip", icon: Briefcase, adults: 1, children: 0 },
];

export const PURPOSES: { label: string; icon: LucideIcon }[] = [
  { label: "Holiday", icon: Sun },
  { label: "Romantic getaway", icon: Heart },
  { label: "Adventure", icon: Mountain },
  { label: "Culture & history", icon: Landmark },
  { label: "Food trip", icon: UtensilsCrossed },
  { label: "Relax & recharge", icon: Waves },
  { label: "Celebration", icon: PartyPopper },
  { label: "Work + explore", icon: Briefcase },
];

export const INTERESTS: { label: string; icon: LucideIcon }[] = [
  { label: "Local food", icon: UtensilsCrossed },
  { label: "History", icon: Landmark },
  { label: "Nature & hikes", icon: Trees },
  { label: "Art & museums", icon: Palette },
  { label: "Beaches", icon: Waves },
  { label: "Nightlife", icon: Martini },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Photography", icon: Camera },
  { label: "Cafés", icon: Coffee },
  { label: "Live music", icon: Music },
  { label: "Wellness & spa", icon: Leaf },
  { label: "Hidden gems", icon: Sparkles },
];

export const PACE_OPTIONS: { value: TripInput["pace"]; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "relaxed", label: "Relaxed", hint: "2–3 things a day, lots of downtime", icon: Coffee },
  { value: "balanced", label: "Balanced", hint: "A good mix of seeing and slowing down", icon: Footprints },
  { value: "packed", label: "Packed", hint: "See as much as possible", icon: Zap },
];

export const BUDGET_OPTIONS: { value: TripInput["budgetTier"]; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "shoestring", label: "Shoestring", hint: "Hostels, street food, public transport", icon: Wallet },
  { value: "moderate", label: "Moderate", hint: "Good hotels, casual dining", icon: Coffee },
  { value: "comfort", label: "Comfort", hint: "4-star stays, nice restaurants", icon: Sparkles },
  { value: "luxury", label: "Luxury", hint: "The very best, no compromises", icon: Gem },
];

export const REQUIREMENTS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-free",
  "No alcohol",
  "Wheelchair accessible",
  "Limited walking",
  "Kid-friendly",
  "Avoid crowds",
  "Public transport only",
];

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD", "SGD", "JPY", "LKR", "MYR", "THB", "CHF", "ZAR", "NZD", "SAR"];

/** Best-effort default currency from the browser locale. */
export function guessCurrency(): string {
  if (typeof navigator === "undefined") return "USD";
  const region = navigator.language.split("-")[1]?.toUpperCase();
  const map: Record<string, string> = {
    GB: "GBP", IN: "INR", AE: "AED", AU: "AUD", CA: "CAD", SG: "SGD", JP: "JPY", LK: "LKR", MY: "MYR", TH: "THB",
    CH: "CHF", ZA: "ZAR", NZ: "NZD", SA: "SAR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
  };
  return (region && map[region]) || "USD";
}

export const INSPIRATION = [
  { name: "Lisbon", country: "Portugal", countryCode: "PT", region: "Lisbon", lat: 38.7167, lon: -9.1333 },
  { name: "Kyoto", country: "Japan", countryCode: "JP", region: "Kyoto", lat: 35.0211, lon: 135.7538 },
  { name: "Cape Town", country: "South Africa", countryCode: "ZA", region: "Western Cape", lat: -33.9258, lon: 18.4232 },
  { name: "Mexico City", country: "Mexico", countryCode: "MX", lat: 19.4285, lon: -99.1277 },
  { name: "Istanbul", country: "Türkiye", countryCode: "TR", lat: 41.0138, lon: 28.9497 },
];
