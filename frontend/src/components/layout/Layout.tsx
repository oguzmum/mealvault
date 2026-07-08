import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  // Close the drawer whenever we navigate somewhere.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t("nav.openMenu")}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-ink-soft hover:bg-cream"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-primary to-accent">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h20" />
                <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
                <path d="m4 8 16-4" />
              </svg>
            </div>
            <span className="font-display text-base font-black leading-none tracking-tight">
              {t("app.name")}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
