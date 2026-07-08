import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useDishes, useTags } from "../api/dishes";
import DishCard from "../components/dishes/DishCard";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import { FilterChip } from "../components/ui/Chip";

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const TIME_OPTIONS = [15, 30, 45, 60];
const KCAL_OPTIONS = [400, 600, 800];

export default function DishesPage() {
  const { t } = useTranslation();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [maxKcal, setMaxKcal] = useState<number | null>(null);

  const { data: tags = [] } = useTags();
  const { data: dishes, isLoading, isError } = useDishes({
    ...(activeTag ? { tags: [activeTag] } : {}),
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(maxTime !== null ? { max_time: maxTime } : {}),
    ...(maxKcal !== null ? { kcal_max: maxKcal } : {}),
  });

  const selectClass =
    "rounded-full border-[1.5px] border-line bg-white px-4 py-[9px] font-display text-sm font-bold text-ink-soft outline-none transition-colors hover:border-ink-faint focus:border-primary";

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.dishes")}
        title={
          <>
            {t("dishes.title")}{" "}
            {dishes && <span className="font-bold text-ink-faint">{dishes.length}</span>}
          </>
        }
        actions={
          <>
            <Link to="/dishes/import-mealdb">
              <Button variant="ghost">{t("dishes.importMealDb")}</Button>
            </Link>
            <Link to="/dishes/new">
              <Button>
                <PlusIcon />
                {t("dishes.new")}
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="flex min-w-[260px] flex-1 items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 sm:max-w-[340px]">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.nameFilter")}
            className="flex-1 bg-transparent py-[10px] text-[15px] text-ink outline-none"
          />
        </div>
        <select
          className={selectClass}
          value={maxTime ?? ""}
          onChange={(e) => setMaxTime(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t("search.anyTime")}</option>
          {TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("search.maxTime", { minutes })}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={maxKcal ?? ""}
          onChange={(e) => setMaxKcal(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t("search.anyKcal")}</option>
          {KCAL_OPTIONS.map((kcal) => (
            <option key={kcal} value={kcal}>
              {t("search.maxKcal", { kcal })}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-[9px]">
        <FilterChip active={activeTag === null} onClick={() => setActiveTag(null)}>
          {t("common.all")}
        </FilterChip>
        {tags.map((tag) => (
          <FilterChip
            key={tag.id}
            active={activeTag === tag.slug}
            onClick={() => setActiveTag(tag.slug)}
          >
            {tag.name}
          </FilterChip>
        ))}
      </div>

      {isLoading && <p className="text-ink-muted">{t("common.loading")}</p>}
      {isError && <p className="text-primary">{t("common.error")}</p>}

      {dishes && dishes.length === 0 && (
        <p className="text-ink-soft">
          {activeTag ? t("dishes.noResults") : t("dishes.empty")}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        {dishes?.map((dish) => <DishCard key={dish.id} dish={dish} />)}
      </div>
    </div>
  );
}
