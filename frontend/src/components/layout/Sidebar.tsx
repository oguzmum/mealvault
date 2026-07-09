import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const icons: Record<string, ReactNode> = {
  plan: (
    <svg {...iconProps}>
      <rect width="18" height="18" x="3" y="4" rx="3" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  ),
  dishes: (
    <svg {...iconProps}>
      <path d="M2 12h20" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
      <path d="m4 8 16-4" />
    </svg>
  ),
  search: (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  shopping: (
    <svg {...iconProps}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.5 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.3a2 2 0 0 0 2-1.5L22 7H6" />
    </svg>
  ),
  wheel: (
    <svg {...iconProps}>
      <rect width="18" height="16" x="3" y="4" rx="2.5" />
      <path d="M7 9h10M7 13h10" />
    </svg>
  ),
  basics: (
    <svg {...iconProps}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
  tags: (
    <svg {...iconProps}>
      <path d="M12.5 2H4a2 2 0 0 0-2 2v8.5a2 2 0 0 0 .59 1.41l9 9a2 2 0 0 0 2.82 0l8.5-8.5a2 2 0 0 0 0-2.82l-9-9A2 2 0 0 0 12.5 2Z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const mainNav = [
  { to: "/", key: "plan" },
  { to: "/dishes", key: "dishes" },
  { to: "/search", key: "search" },
  { to: "/shopping", key: "shopping" },
  { to: "/wheel", key: "wheel" },
  { to: "/basics", key: "basics" },
];

function NavItem({
  to,
  itemKey,
  onNavigate,
}: {
  to: string;
  itemKey: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-[13px] px-3.5 py-[11px] text-left font-display text-[15px] transition-colors ${
          isActive
            ? "bg-primary-tint font-extrabold text-primary"
            : "bg-transparent font-bold text-ink-soft hover:bg-cream"
        }`
      }
    >
      {icons[itemKey]}
      <span>{t(`nav.${itemKey}`)}</span>
    </NavLink>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-shrink-0 flex-col border-r border-line bg-white px-4 py-[22px] transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-[11px] px-2 pb-[22px] pt-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-primary to-accent shadow-[0_4px_10px_rgba(232,102,61,0.28)]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12h20" />
              <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
              <path d="m4 8 16-4" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-display text-[19px] font-black leading-none tracking-tight">
              {t("app.name")}
            </div>
            <div className="mt-[3px] text-[11px] font-semibold text-ink-muted">
              {t("app.tagline")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("nav.closeMenu")}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="mt-1.5 flex flex-col gap-1">
          {mainNav.map((item) => (
            <NavItem key={item.key} to={item.to} itemKey={item.key} onNavigate={onClose} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <NavItem to="/tags" itemKey="tags" onNavigate={onClose} />
          <NavItem to="/settings" itemKey="settings" onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
