import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { matchBasics, useBasics } from "../api/basics";
import { uploadUrl } from "../api/client";
import { useDeleteDish, useDish } from "../api/dishes";
import { PhotoPlaceholder } from "../components/dishes/DishCard";
import StepTimer from "../components/dishes/StepTimer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { TagChip } from "../components/ui/Chip";
import ProgressBar from "../components/ui/ProgressBar";
import { formatAmount, scaleAmount, tagTone } from "../utils/format";

export default function DishDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const dishId = Number(id);

  const { data: dish, isLoading, isError } = useDish(Number.isNaN(dishId) ? undefined : dishId);
  const { data: basics = [] } = useBasics();
  const deleteDish = useDeleteDish();
  const [servings, setServings] = useState<number | null>(null);

  if (isLoading) {
    return <p className="px-4 pt-6 sm:px-6 md:px-10 md:pt-[34px] text-ink-muted">{t("common.loading")}</p>;
  }
  if (isError || !dish) {
    return <p className="px-4 pt-6 sm:px-6 md:px-10 md:pt-[34px] text-primary">{t("common.error")}</p>;
  }

  const currentServings = servings ?? dish.base_servings;
  const imageUrl = uploadUrl(dish.image_path);
  const macros = [
    { label: t("dishes.protein"), value: dish.protein_g, color: "var(--color-success)" },
    { label: t("dishes.carbs"), value: dish.carbs_g, color: "var(--color-accent)" },
    { label: t("dishes.fat"), value: dish.fat_g, color: "var(--color-primary)" },
  ];
  const macroMax = Math.max(...macros.map((m) => m.value ?? 0), 1);

  const handleDelete = () => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    deleteDish.mutate(dish.id, { onSuccess: () => navigate("/dishes") });
  };

  return (
    <div className="max-w-[1000px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <Link
        to="/dishes"
        className="mb-[18px] inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink-soft hover:text-ink"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {t("dishes.backToDishes")}
      </Link>

      <div className="relative mb-[22px] h-[230px] overflow-hidden rounded-[22px]">
        {imageUrl ? (
          <img src={imageUrl} alt={dish.name} className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder className="h-full w-full" />
        )}
        <div className="absolute bottom-5 left-5 flex gap-2">
          {dish.tags.map((tag) => (
            <TagChip key={tag.id} tone={tagTone(tag.slug)} label={tag.name} />
          ))}
          {dish.source === "imported" && <TagChip tone="neutral" label={t("dishes.imported")} />}
        </div>
      </div>

      <div className="mb-[26px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="font-display text-[34px] font-black tracking-tight">{dish.name}</h1>
          <div className="mt-2.5 flex gap-[18px] text-sm font-bold text-ink-soft">
            {dish.cook_time_minutes !== null && (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {dish.cook_time_minutes} {t("common.minutes")}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              {t("dishes.servings")}:
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(1, currentServings - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-display font-extrabold text-ink-soft hover:border-primary hover:text-primary"
                  aria-label="-1"
                >
                  −
                </button>
                <span className="w-6 text-center font-display font-extrabold text-ink">
                  {currentServings}
                </span>
                <button
                  type="button"
                  onClick={() => setServings(currentServings + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-display font-extrabold text-ink-soft hover:border-primary hover:text-primary"
                  aria-label="+1"
                >
                  +
                </button>
              </span>
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Link to={`/dishes/${dish.id}/edit`}>
            <Button variant="ghost">{t("common.edit")}</Button>
          </Link>
          <Button variant="ghost" onClick={handleDelete} className="text-primary">
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-lg font-extrabold">{t("dishes.ingredients")}</h3>
            <div className="flex flex-col">
              {dish.ingredients.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-line-soft py-[11px] last:border-b-0"
                >
                  <span className="font-semibold">{item.ingredient_name}</span>
                  <span className="font-display text-sm font-bold text-ink-soft">
                    {item.amount !== null
                      ? `${formatAmount(scaleAmount(item.amount, dish.base_servings, currentServings))}${item.unit ? ` ${item.unit}` : ""}`
                      : (item.raw_text ?? "")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {dish.steps.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-[18px] font-display text-lg font-extrabold">
                {t("dishes.preparation")}
              </h3>
              <div className="flex flex-col gap-[18px]">
                {dish.steps.map((step, index) => {
                  const linkedBasics = matchBasics(step.text, basics);
                  return (
                    <div key={step.id} className="flex gap-[15px]">
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px] bg-primary-tint font-display text-sm font-extrabold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="mt-0.5 leading-[1.55]">{step.text}</p>
                        {linkedBasics.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {linkedBasics.map((basic) => (
                              <Link
                                key={basic.slug}
                                to={`/basics#${basic.slug}`}
                                className="inline-flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-xs font-bold text-ink-soft transition-colors hover:bg-primary-tint hover:text-primary"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                {basic.title}
                              </Link>
                            ))}
                          </div>
                        )}
                        {step.timer_seconds !== null && <StepTimer seconds={step.timer_seconds} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <Card className="sticky top-5 p-[22px]">
          <h3 className="mb-1 font-display text-[17px] font-extrabold">{t("dishes.nutrition")}</h3>
          <div className="mb-4 text-xs font-semibold text-ink-muted">{t("dishes.perServing")}</div>
          <div className="mb-4 border-b border-line-soft pb-[18px] pt-3.5 text-center">
            <div className="font-display text-[38px] font-black leading-none text-primary">
              {dish.kcal !== null ? Math.round(dish.kcal) : "–"}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
              {t("dishes.calories")}
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            {macros.map((macro) => (
              <div key={macro.label}>
                <div className="mb-1.5 flex justify-between text-[13px] font-bold">
                  <span className="text-ink-soft">{macro.label}</span>
                  <span>{macro.value !== null ? `${formatAmount(macro.value)} g` : "–"}</span>
                </div>
                <ProgressBar ratio={(macro.value ?? 0) / macroMax} color={macro.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
