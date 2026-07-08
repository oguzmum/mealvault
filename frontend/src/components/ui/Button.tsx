import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "link";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-3 font-display text-[15px] font-extrabold text-white shadow-[0_3px_10px_rgba(232,102,61,0.28)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-ink-faint disabled:shadow-none",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-[18px] py-[11px] font-display text-[15px] font-bold text-ink transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:text-ink-faint",
  link: "inline-flex items-center gap-1.5 bg-transparent font-display text-sm font-extrabold text-primary hover:text-primary-hover",
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button type="button" className={`${variants[variant]} ${className}`} {...props} />;
}
