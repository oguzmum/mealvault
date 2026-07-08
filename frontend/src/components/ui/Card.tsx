import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-line bg-white shadow-[0_1px_3px_rgba(43,38,33,0.05)] ${className}`}
      {...props}
    />
  );
}
