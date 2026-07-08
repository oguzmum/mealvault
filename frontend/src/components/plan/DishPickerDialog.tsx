import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useDishes } from "../../api/dishes";
import type { DishListItem } from "../../api/types";
import { uploadUrl } from "../../api/client";
import { PhotoPlaceholder } from "../dishes/DishCard";
import Card from "../ui/Card";

interface DishPickerDialogProps {
  onSelect: (dish: DishListItem) => void;
  onClose: () => void;
}

export default function DishPickerDialog({ onSelect, onClose }: DishPickerDialogProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: dishes, isLoading } = useDishes(query.trim() ? { q: query.trim() } : {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-label={t("plan.pickDish")}
    >
      <Card
        className="flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden sm:max-h-[70vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-extrabold">{t("plan.pickDish")}</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
              aria-label={t("common.cancel")}
            >
              ×
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.nameFilter")}
            className="w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none focus:border-primary"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && <p className="p-3 text-ink-muted">{t("common.loading")}</p>}
          {dishes?.length === 0 && <p className="p-3 text-ink-soft">{t("dishes.noResults")}</p>}
          {dishes?.map((dish) => {
            const imageUrl = uploadUrl(dish.image_path);
            return (
              <button
                key={dish.id}
                type="button"
                onClick={() => onSelect(dish)}
                className="flex w-full items-center gap-3 rounded-[14px] p-2.5 text-left transition-colors hover:bg-primary-tint"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-11 w-11 flex-shrink-0 rounded-[10px] object-cover"
                  />
                ) : (
                  <PhotoPlaceholder className="h-11 w-11 flex-shrink-0 rounded-[10px]" />
                )}
                <span className="flex-1 font-display text-sm font-bold">{dish.name}</span>
                {dish.kcal !== null && (
                  <span className="text-xs font-bold text-primary">
                    {Math.round(dish.kcal)} {t("common.kcal")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
