import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { useBasics } from "../api/basics";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";

export default function BasicsPage() {
  const { t } = useTranslation();
  const { data: basics, isLoading, isError } = useBasics();
  const location = useLocation();

  // Scroll to the entry referenced from a recipe step link (/basics#slug)
  useEffect(() => {
    if (!location.hash || !basics) return;
    const element = document.getElementById(location.hash.slice(1));
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, basics]);

  return (
    <div className="max-w-[940px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.basics")}
        title={t("basics.title")}
        subtitle={t("basics.subtitle")}
      />

      {isLoading && <p className="text-ink-muted">{t("common.loading")}</p>}
      {isError && <p className="text-primary">{t("common.error")}</p>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {basics?.map((basic) => {
          const highlighted = location.hash === `#${basic.slug}`;
          return (
            <Card
              key={basic.id}
              id={basic.slug}
              className={`scroll-mt-6 p-6 ${highlighted ? "border-primary shadow-[0_0_0_3px_rgba(232,102,61,0.15)]" : ""}`}
            >
              <h3 className="mb-2 font-display text-lg font-extrabold">{basic.title}</h3>
              {basic.content.split("\n\n").map((paragraph, index) => (
                <p key={index} className="mt-2 leading-relaxed text-ink-soft first:mt-0">
                  {paragraph}
                </p>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
