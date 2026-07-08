import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { uploadUrl } from "../api/client";
import { useDishes, useTags } from "../api/dishes";
import type { DishListItem } from "../api/types";
import { PhotoPlaceholder } from "../components/dishes/DishCard";
import Card from "../components/ui/Card";
import { FilterChip } from "../components/ui/Chip";

/** Height of a single reel row, in px. Keep in sync with the row markup below. */
const ROW_HEIGHT = 92;
/** How many random rows to scroll through before landing on the result. */
const SPIN_ROWS = 26;
const SPIN_DURATION_S = 4.2;
const EASE_OUT: [number, number, number, number] = [0.11, 0.82, 0.18, 1];

function randomDish(pool: DishListItem[]): DishListItem {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** translateY that centers row `index` inside the 3-row viewport. */
function offsetForIndex(index: number): number {
  return -(index - 1) * ROW_HEIGHT;
}

function ReelRow({ dish }: { dish: DishListItem }) {
  const { t } = useTranslation();
  const image = uploadUrl(dish.image_path);
  return (
    <div
      className="flex items-center gap-4 border-b border-line px-4 last:border-b-0"
      style={{ height: ROW_HEIGHT }}
    >
      {image ? (
        <img src={image} alt="" className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover" />
      ) : (
        <PhotoPlaceholder className="h-14 w-14 flex-shrink-0 rounded-2xl" />
      )}
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-display text-lg font-black text-ink">{dish.name}</div>
        <div className="mt-0.5 truncate text-[13px] font-semibold text-ink-soft">
          {dish.kcal !== null && `${Math.round(dish.kcal)} ${t("common.kcal")}`}
          {dish.kcal !== null && dish.cook_time_minutes !== null && " · "}
          {dish.cook_time_minutes !== null && `${dish.cook_time_minutes} ${t("common.minutes")}`}
        </div>
      </div>
    </div>
  );
}

export default function WheelPage() {
  const { t } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reelItems, setReelItems] = useState<DishListItem[]>([]);
  const [offsetY, setOffsetY] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<DishListItem | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  const { data: tags = [] } = useTags();
  const { data: dishes = [] } = useDishes(selectedTags.length ? { tags: selectedTags } : {});

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filtersOpen]);

  const resetReel = () => {
    setReelItems([]);
    setOffsetY(0);
    setResult(null);
  };

  const toggleTag = (slug: string) => {
    if (spinning) return;
    setSelectedTags((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
    resetReel();
  };

  const selectAll = () => {
    if (spinning) return;
    setSelectedTags([]);
    resetReel();
  };

  const spin = () => {
    if (spinning || dishes.length === 0) return;
    const target = randomDish(dishes);
    const fillers = Array.from({ length: SPIN_ROWS }, () => randomDish(dishes));
    const combined = [...reelItems, ...fillers, target];
    setReelItems(combined);
    setResult(null);
    setSpinning(true);
    setOffsetY(offsetForIndex(combined.length - 1));
  };

  const handleSpinComplete = () => {
    if (!spinning) return;
    setResult(reelItems[reelItems.length - 1]);
    setSpinning(false);
  };

  const resultImage = result ? uploadUrl(result.image_path) : null;
  const filterLabel = selectedTags.length
    ? tags
        .filter((tag) => selectedTags.includes(tag.slug))
        .map((tag) => tag.name)
        .join(", ")
    : t("common.all");

  return (
    <div className="flex flex-col items-center px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px] text-center">
      <div className="text-[13px] font-bold uppercase tracking-wider text-primary">
        {t("nav.wheel")}
      </div>
      <h1 className="mb-1.5 mt-1.5 font-display text-[32px] font-black tracking-tight">
        {t("wheel.title")}
      </h1>
      <p className="mb-5 max-w-[440px] text-ink-soft">{t("wheel.subtitle")}</p>

      <div ref={filterRef} className="relative mb-7">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-[18px] py-[9px] font-display text-sm font-bold text-ink transition-colors hover:border-ink-faint"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span className="max-w-[220px] truncate">{filterLabel}</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="absolute left-1/2 top-[calc(100%+8px)] z-10 w-[min(360px,80vw)] -translate-x-1/2 rounded-2xl border border-line bg-white p-3.5 shadow-[0_16px_34px_rgba(43,38,33,0.16)]">
            <div className="flex flex-wrap justify-center gap-[9px]">
              <FilterChip active={selectedTags.length === 0} onClick={selectAll}>
                {t("common.all")}
              </FilterChip>
              {tags.map((tag) => (
                <FilterChip
                  key={tag.id}
                  active={selectedTags.includes(tag.slug)}
                  onClick={() => toggleTag(tag.slug)}
                >
                  {tag.name}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      {dishes.length === 0 ? (
        <p className="mt-4 text-ink-soft">{t("wheel.noDishes")}</p>
      ) : (
        <>
          <div className="relative w-full max-w-[420px]">
            <div
              className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_30px_rgba(43,38,33,0.1)]"
              style={{ height: ROW_HEIGHT * 3 }}
            >
              {reelItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-ink-muted">
                  <div className="font-display text-3xl font-black tracking-wide">?</div>
                  <div className="text-sm font-semibold">{t("wheel.idleHint")}</div>
                </div>
              ) : (
                <motion.div
                  data-testid="reel"
                  animate={{ y: offsetY }}
                  transition={spinning ? { duration: SPIN_DURATION_S, ease: EASE_OUT } : { duration: 0 }}
                  onAnimationComplete={handleSpinComplete}
                >
                  {reelItems.map((dish, index) => (
                    <ReelRow key={index} dish={dish} />
                  ))}
                </motion.div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-line bg-primary-tint/40"
                style={{ height: ROW_HEIGHT }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className={`mt-8 inline-flex items-center gap-2 rounded-full px-11 py-4 font-display text-lg font-black tracking-wide text-white shadow-[0_6px_18px_rgba(232,102,61,0.32)] transition-colors ${
              spinning ? "cursor-default bg-ink-faint shadow-none" : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {spinning ? t("wheel.spinning") : result ? t("wheel.spinAgain") : t("wheel.spin")}
          </button>
        </>
      )}

      {result && !spinning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mt-[26px] flex w-full max-w-[440px] flex-col items-center gap-4 p-4 text-left sm:max-w-none sm:flex-row sm:pr-[22px]">
            <div className="flex w-full items-center gap-4 sm:w-auto">
              {resultImage ? (
                <img
                  src={resultImage}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-[14px] object-cover"
                />
              ) : (
                <PhotoPlaceholder className="h-14 w-14 flex-shrink-0 rounded-[14px]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-success">
                  🎉 {t("wheel.resultLabel")}
                </div>
                <div className="mt-0.5 truncate font-display text-[22px] font-black">
                  {result.name}
                </div>
                <div className="text-[13px] font-semibold text-ink-soft">
                  {result.kcal !== null && `${Math.round(result.kcal)} ${t("common.kcal")}`}
                  {result.kcal !== null && result.cook_time_minutes !== null && " · "}
                  {result.cook_time_minutes !== null &&
                    `${result.cook_time_minutes} ${t("common.minutes")}`}
                </div>
              </div>
            </div>
            <Link
              to={`/dishes/${result.id}`}
              className="inline-flex w-full items-center justify-center rounded-md border border-line bg-white px-[18px] py-[11px] font-display text-[15px] font-bold text-ink transition-colors hover:bg-cream sm:ml-2 sm:w-auto"
            >
              {t("wheel.viewRecipe")}
            </Link>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
