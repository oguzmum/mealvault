import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useGenerateShoppingList,
  useShoppingList,
  useToggleShoppingItem,
} from "../api/shopping";
import type { ShoppingItem } from "../api/shopping";
import type { ShoppingCategory } from "../api/types";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import { formatAmount } from "../utils/format";
import { addDays, isoWeekNumber, startOfWeek, toISODate } from "../utils/week";

const CATEGORY_META: Record<ShoppingCategory, { icon: string; tint: string }> = {
  produce: { icon: "🥦", tint: "var(--color-success-tint)" },
  dairy: { icon: "🧀", tint: "var(--color-accent-tint)" },
  meat_fish: { icon: "🐟", tint: "#FDECE5" },
  pantry: { icon: "🫙", tint: "var(--color-sand)" },
  frozen: { icon: "❄️", tint: "#EAF1F4" },
  other: { icon: "🛒", tint: "var(--color-sand)" },
};

const CATEGORY_ORDER: ShoppingCategory[] = [
  "produce", "dairy", "meat_fish", "frozen", "pantry", "other",
];

function quantityLabel(item: ShoppingItem): string {
  const parts: string[] = [];
  if (item.amount !== null) {
    parts.push(`${formatAmount(item.amount)}${item.unit ? ` ${item.unit}` : ""}`);
  }
  if (item.note) parts.push(item.note);
  return parts.join(" + ");
}

export default function ShoppingPage() {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const startIso = toISODate(monday);
  const endIso = toISODate(addDays(monday, 6));

  const { data: list, isLoading } = useShoppingList(startIso);
  const generate = useGenerateShoppingList();
  const toggle = useToggleShoppingItem(startIso);

  const done = list?.items.filter((item) => item.checked).length ?? 0;
  const total = list?.items.length ?? 0;

  const grouped = useMemo(() => {
    const groups = new Map<ShoppingCategory, ShoppingItem[]>();
    list?.items.forEach((item) => {
      const bucket = groups.get(item.category) ?? [];
      bucket.push(item);
      groups.set(item.category, bucket);
    });
    return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => ({
      category,
      items: groups.get(category)!,
    }));
  }, [list]);

  return (
    <div className="max-w-[760px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.shopping")}
        title={t("shopping.title", { week: isoWeekNumber(monday) })}
        actions={
          <>
            <Button variant="ghost" onClick={() => setWeekOffset(weekOffset - 1)} aria-label={t("plan.prevWeek")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Button>
            <Button variant="ghost" onClick={() => setWeekOffset(weekOffset + 1)} aria-label={t("plan.nextWeek")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Button>
            <Button
              onClick={() => generate.mutate({ start: startIso, end: endIso })}
              disabled={generate.isPending}
            >
              {list ? t("shopping.regenerate") : t("shopping.generate")}
            </Button>
          </>
        }
      />

      {isLoading && <p className="text-ink-muted">{t("common.loading")}</p>}

      {!isLoading && !list && (
        <Card className="p-8 text-center text-ink-soft">{t("shopping.empty")}</Card>
      )}

      {list && list.items.length === 0 && (
        <Card className="p-8 text-center text-ink-soft">{t("shopping.noItems")}</Card>
      )}

      {list && list.items.length > 0 && (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-soft">
              {t("shopping.progress")}
            </span>
            <span className="font-display text-[22px] font-black">
              {done}
              <span className="text-ink-faint">/{total}</span>
            </span>
          </div>
          <div className="mb-7">
            <ProgressBar
              ratio={total > 0 ? done / total : 0}
              color="var(--color-success)"
              trackClassName="bg-[#F1EBE2]"
              heightClassName="h-[9px]"
            />
          </div>

          <div className="flex flex-col gap-5">
            {grouped.map(({ category, items }) => {
              const meta = CATEGORY_META[category];
              const doneCount = items.filter((item) => item.checked).length;
              return (
                <Card key={category} className="px-5 pb-3 pt-2">
                  <div className="flex items-center gap-2.5 pb-2.5 pt-3.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-base"
                      style={{ background: meta.tint }}
                    >
                      {meta.icon}
                    </span>
                    <h3 className="font-display text-base font-extrabold">
                      {t(`shopping.categories.${category}`)}
                    </h3>
                    <span className="ml-auto text-xs font-bold text-ink-muted">
                      {doneCount}/{items.length}
                    </span>
                  </div>
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-[13px] border-t border-line-soft py-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggle.mutate({ id: item.id, checked: !item.checked })}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[7px] transition-colors ${
                          item.checked
                            ? "border-[1.5px] border-success bg-success"
                            : "border-[1.8px] border-[#DCD3C6] bg-white"
                        }`}
                        aria-hidden
                      >
                        {item.checked && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`flex-1 font-semibold ${
                          item.checked ? "text-ink-muted line-through" : "text-ink"
                        }`}
                      >
                        {item.name}
                      </span>
                      <span
                        className={`font-display text-[13px] font-bold ${
                          item.checked ? "text-ink-faint" : "text-ink-soft"
                        }`}
                      >
                        {quantityLabel(item)}
                      </span>
                    </label>
                  ))}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
