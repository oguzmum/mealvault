import type { ReactNode } from "react";

interface PageHeaderProps {
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6 sm:gap-5">
      <div>
        <div className="text-[13px] font-bold uppercase tracking-wider text-primary">
          {kicker}
        </div>
        <h1 className="mt-1.5 font-display text-[26px] font-black tracking-tight sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
