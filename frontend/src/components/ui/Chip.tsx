import type { ButtonHTMLAttributes } from "react";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Selectable filter pill (dish filters, wheel filters). */
export function FilterChip({ active = false, className = "", ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`rounded-full border-[1.5px] px-[17px] py-[9px] font-display text-sm transition-colors ${
        active
          ? "border-primary bg-primary font-extrabold text-white"
          : "border-line bg-white font-bold text-ink-soft hover:border-ink-faint"
      } ${className}`}
      {...props}
    />
  );
}

export type TagTone = "success" | "neutral" | "accent" | "primary";

const tagTones: Record<TagTone, string> = {
  success: "bg-success-tint text-success-text",
  neutral: "bg-sand text-ink-soft",
  accent: "bg-accent-tint text-accent-text",
  primary: "bg-primary-tint text-primary-deep",
};

/** Small non-interactive tag label on dish cards ("Vegan", "Schnell", …). */
export function TagChip({ tone = "neutral", label }: { tone?: TagTone; label: string }) {
  return (
    <span className={`rounded-full px-[11px] py-1 text-[11px] font-bold ${tagTones[tone]}`}>
      {label}
    </span>
  );
}
