import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApplyPlan, useGeneratePlan, useSettings } from "../../api/plan";
import type { GeneratedEntry, PlanSlot } from "../../api/plan";
import type { DishListItem } from "../../api/types";
import { addDays, formatShortDate, toISODate, weekdayShort } from "../../utils/week";
import Button from "../ui/Button";
import Card from "../ui/Card";
import DishPickerDialog from "./DishPickerDialog";

interface GeneratorDialogProps {
  monday: Date;
  slots: PlanSlot[];
  onClose: () => void;
}

export default function GeneratorDialog({ monday, slots, onClose }: GeneratorDialogProps) {
  const { t } = useTranslation();
  const [slotIds, setSlotIds] = useState<number[]>(() =>
    slots.filter((slot) => slot.is_default).map((slot) => slot.id),
  );
  const [suggestion, setSuggestion] = useState<GeneratedEntry[] | null>(null);
  const [swapSlot, setSwapSlot] = useState<{ date: string; slotId: number } | null>(null);

  const { data: settings } = useSettings();
  const generate = useGeneratePlan();
  const apply = useApplyPlan();

  const startIso = toISODate(monday);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(monday, index)),
    [monday],
  );

  const toggleSlot = (slotId: number) => {
    setSlotIds((current) =>
      current.includes(slotId) ? current.filter((id) => id !== slotId) : [...current, slotId],
    );
  };

  const runGenerate = () => {
    generate.mutate(
      { start: startIso, slot_ids: slotIds },
      { onSuccess: (entries) => setSuggestion(entries) },
    );
  };

  const entryFor = (date: string, slotId: number) =>
    suggestion?.find((entry) => entry.date === date && entry.slot_id === slotId);

  const replaceEntry = (date: string, slotId: number, dish: DishListItem) => {
    setSuggestion((current) => {
      if (!current) return current;
      const without = current.filter((e) => !(e.date === date && e.slot_id === slotId));
      return [...without, { date, slot_id: slotId, dish }];
    });
  };

  const removeEntry = (date: string, slotId: number) => {
    setSuggestion(
      (current) => current?.filter((e) => !(e.date === date && e.slot_id === slotId)) ?? null,
    );
  };

  const handleApply = () => {
    if (!suggestion || suggestion.length === 0) return;
    apply.mutate(
      suggestion.map((entry) => ({
        date: entry.date,
        slot_id: entry.slot_id,
        dish_id: entry.dish.id,
      })),
      { onSuccess: onClose },
    );
  };

  const dayKcal = (date: string) =>
    suggestion
      ?.filter((entry) => entry.date === date)
      .reduce((sum, entry) => sum + (entry.dish.kcal ?? 0), 0) ?? 0;

  const sortedSlots = slots.filter((slot) => slotIds.includes(slot.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-label={t("generator.title")}
    >
      <Card
        className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden sm:max-h-[85vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line-soft px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-extrabold">{t("generator.title")}</h3>
              <p className="mt-1 text-sm text-ink-soft">
                {t("generator.subtitle", { kcal: settings?.daily_kcal_target ?? 2000 })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
              aria-label={t("common.cancel")}
            >
              ×
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {slots.map((slot) => (
              <label key={slot.id} className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-soft">
                <input
                  type="checkbox"
                  checked={slotIds.includes(slot.id)}
                  onChange={() => toggleSlot(slot.id)}
                  className="h-4 w-4 accent-[#E8663D]"
                />
                {slot.name}
              </label>
            ))}
            <Button
              onClick={runGenerate}
              disabled={slotIds.length === 0 || generate.isPending}
              className="ml-auto"
            >
              {generate.isPending
                ? t("common.loading")
                : suggestion
                  ? t("generator.regenerate")
                  : t("generator.generate")}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {!suggestion && (
            <p className="py-8 text-center text-ink-soft">{t("generator.hint")}</p>
          )}
          {suggestion && suggestion.length === 0 && (
            <p className="py-8 text-center text-ink-soft">{t("generator.noDishes")}</p>
          )}
          {suggestion && suggestion.length > 0 && (
            <div className="flex flex-col gap-2">
              {weekDays.map((day, index) => {
                const dateIso = toISODate(day);
                return (
                  <div
                    key={dateIso}
                    className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-[14px] border border-line-soft px-2.5 py-2.5 sm:grid-cols-[64px_1fr_auto] sm:gap-3 sm:px-3.5"
                  >
                    <div>
                      <div className="font-display text-sm font-extrabold">
                        {weekdayShort(index)}
                      </div>
                      <div className="text-[11px] font-semibold text-ink-muted">
                        {formatShortDate(day)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {sortedSlots.map((slot) => {
                        const entry = entryFor(dateIso, slot.id);
                        return (
                          <div key={slot.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="w-[76px] flex-shrink-0 text-xs font-bold text-ink-muted">
                              {slot.name}
                            </span>
                            {entry ? (
                              <>
                                <span className="font-display font-bold">{entry.dish.name}</span>
                                {entry.dish.kcal !== null && (
                                  <span className="text-xs font-bold text-primary">
                                    {Math.round(entry.dish.kcal)} {t("common.kcal")}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSwapSlot({ date: dateIso, slotId: slot.id })}
                                  className="ml-auto font-display text-xs font-extrabold text-primary hover:text-primary-hover"
                                >
                                  {t("generator.swap")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEntry(dateIso, slot.id)}
                                  className="text-ink-muted hover:text-primary"
                                  aria-label={t("common.remove")}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSwapSlot({ date: dateIso, slotId: slot.id })}
                                className="text-xs font-bold text-ink-faint hover:text-primary"
                              >
                                + {t("common.add")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-extrabold text-ink-soft">
                        {Math.round(dayKcal(dateIso))}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-ink-muted">
                        {t("common.kcal")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-line-soft px-4 py-4 sm:px-6">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!suggestion || suggestion.length === 0 || apply.isPending}
          >
            {t("generator.apply")}
          </Button>
        </div>
      </Card>

      {swapSlot && (
        <DishPickerDialog
          onClose={() => setSwapSlot(null)}
          onSelect={(dish) => {
            replaceEntry(swapSlot.date, swapSlot.slotId, dish);
            setSwapSlot(null);
          }}
        />
      )}
    </div>
  );
}
