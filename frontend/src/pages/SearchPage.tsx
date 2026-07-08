import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { uploadUrl } from "../api/client";
import { useIngredientSearch } from "../api/search";
import { PhotoPlaceholder } from "../components/dishes/DishCard";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";

const PANTRY_STORAGE_KEY = "mealvault.pantry";

function loadPantry(): string[] {
  try {
    const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function SearchPage() {
  const { t } = useTranslation();
  const [pantry, setPantry] = useState<string[]>(loadPantry);
  const [input, setInput] = useState("");
  const [maxMissing, setMaxMissing] = useState(2);

  useEffect(() => {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantry));
  }, [pantry]);

  const { data: results, isLoading } = useIngredientSearch(pantry, maxMissing);

  const addItem = () => {
    const value = input.trim();
    if (value && !pantry.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setPantry([...pantry, value]);
    }
    setInput("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  return (
    <div className="max-w-[820px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("search.kicker")}
        title={t("search.title")}
        subtitle={t("search.subtitle")}
      />

      <Card className="mb-6 p-5">
        <div className="flex gap-2.5">
          <div className="flex flex-1 items-center gap-2.5 rounded-[14px] border border-line bg-cream px-3.5">
            <svg
              width="19"
              height="19"
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent py-[13px] text-[15px] text-ink outline-none"
            />
          </div>
          <Button onClick={addItem}>{t("common.add")}</Button>
        </div>

        {pantry.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pantry.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-[7px] rounded-full bg-success-tint py-[7px] pl-3.5 pr-2 text-[13px] font-bold text-success-text"
              >
                {item}
                <button
                  type="button"
                  onClick={() => setPantry(pantry.filter((x) => x !== item))}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-success/20 text-xs leading-none text-success-text"
                  aria-label={`${t("common.remove")}: ${item}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-4 text-[13px] font-bold text-ink-soft">
          {t("search.maxMissing")}
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMaxMissing(Math.max(0, maxMissing - 1))}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-display font-extrabold hover:border-primary hover:text-primary"
              aria-label="-1"
            >
              −
            </button>
            <span className="w-5 text-center font-display font-extrabold text-ink">
              {maxMissing}
            </span>
            <button
              type="button"
              onClick={() => setMaxMissing(Math.min(5, maxMissing + 1))}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-display font-extrabold hover:border-primary hover:text-primary"
              aria-label="+1"
            >
              +
            </button>
          </span>
        </div>
      </Card>

      {pantry.length === 0 ? (
        <p className="text-ink-soft">{t("search.emptyPantry")}</p>
      ) : (
        <>
          <div className="mb-3.5 flex items-baseline gap-[9px]">
            <h3 className="font-display text-lg font-extrabold">{t("search.results")}</h3>
            <span className="text-[13px] font-semibold text-ink-muted">
              {t("search.sortedByMatch")}
            </span>
          </div>

          {isLoading && <p className="text-ink-muted">{t("common.loading")}</p>}
          {results && results.length === 0 && (
            <p className="text-ink-soft">{t("search.noResults")}</p>
          )}

          <div className="flex flex-col gap-3">
            {results?.map(({ dish, total, matched, missing }) => {
              const ratio = matched / total;
              const complete = missing.length === 0;
              const imageUrl = uploadUrl(dish.image_path);
              const badgeClass = complete
                ? "bg-success-tint text-success-text"
                : ratio >= 0.5
                  ? "bg-accent-tint text-accent-text"
                  : "bg-sand text-ink-muted";
              const barColor = complete
                ? "var(--color-success)"
                : ratio >= 0.5
                  ? "var(--color-accent)"
                  : "#E3DACE";
              return (
                <Link key={dish.id} to={`/dishes/${dish.id}`}>
                  <Card className="flex cursor-pointer items-center gap-4 p-3.5 transition-shadow hover:shadow-[0_6px_16px_rgba(43,38,33,0.08)]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-[70px] w-[70px] flex-shrink-0 rounded-[14px] object-cover"
                      />
                    ) : (
                      <PhotoPlaceholder className="h-[70px] w-[70px] flex-shrink-0 rounded-[14px]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-display font-extrabold">{dish.name}</div>
                        <div
                          className={`whitespace-nowrap rounded-full px-3 py-[5px] font-display text-xs font-extrabold ${badgeClass}`}
                        >
                          {t("search.matchBadge", { matched, total })}
                        </div>
                      </div>
                      <div className="my-2.5">
                        <ProgressBar ratio={ratio} color={barColor} />
                      </div>
                      <div className="text-xs font-semibold text-ink-muted">
                        {complete ? (
                          <span className="font-bold text-success">{t("search.complete")}</span>
                        ) : (
                          <>
                            {t("search.missing")}{" "}
                            <span className="text-ink-soft">
                              {missing.slice(0, 3).join(", ")}
                              {missing.length > 3 ? " …" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
