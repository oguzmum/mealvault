import type { TagTone } from "../components/ui/Chip";

/** Map well-known tag slugs to the chip color tones from the design system. */
export function tagTone(slug: string): TagTone {
  if (slug === "vegan") return "success";
  if (slug === "schnell" || slug === "quick") return "accent";
  if (slug === "high-protein" || slug === "highprotein") return "primary";
  return "neutral";
}

/** Format a number for German display, dropping trailing zeros (2.5 → "2,5"). */
export function formatAmount(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

/** Scale an ingredient amount from the dish's base servings to the selected servings. */
export function scaleAmount(amount: number, baseServings: number, servings: number): number {
  if (baseServings <= 0) return amount;
  return (amount * servings) / baseServings;
}
