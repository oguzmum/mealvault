import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { DndContext, PointerSensor, useDndMonitor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { uploadUrl } from "../api/client";
import {
  useCreatePlanEntry,
  useCreateSlot,
  useDeletePlanEntry,
  useDeleteSlot,
  useMovePlanEntry,
  useMoveSlot,
  usePlan,
  useSettings,
  useSlots,
} from "../api/plan";
import type { PlanEntry, PlanSlot } from "../api/plan";
import type { DishListItem } from "../api/types";
import { PhotoPlaceholder } from "../components/dishes/DishCard";
import DishPickerDialog from "../components/plan/DishPickerDialog";
import GeneratorDialog from "../components/plan/GeneratorDialog";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import {
  addDays,
  formatShortDate,
  formatWeekRange,
  isoWeekNumber,
  startOfWeek,
  toISODate,
  weekdayShort,
} from "../utils/week";

function iconForSlot(name: string): string {
  if (name === "Frühstück") return "🥐";
  if (name === "Mittag") return "🍽️";
  return "🍴";
}

interface SlotRef {
  date: string;
  slotId: number;
}

function slotRefId(slot: SlotRef): string {
  return `slot|${slot.date}|${slot.slotId}`;
}

function parseSlotRefId(id: string): SlotRef | null {
  const [prefix, date, slotIdRaw] = id.split("|");
  if (prefix !== "slot" || !date || !slotIdRaw) return null;
  return { date, slotId: Number(slotIdRaw) };
}


function EntryCard({ entry, onRemove }: { entry: PlanEntry; onRemove: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry|${entry.id}`,
    data: { type: "entry", entry },
  });
  // dnd-kit only stops the trailing click's *propagation* after a drag, which
  // isn't enough to stop a real <a href> from navigating. So we navigate
  // programmatically instead, gated on whether a drag just happened.
  const wasDragging = useRef(false);
  useDndMonitor({
    onDragStart: () => {
      wasDragging.current = true;
    },
    onDragEnd: () => {
      setTimeout(() => {
        wasDragging.current = false;
      }, 0);
    },
    onDragCancel: () => {
      setTimeout(() => {
        wasDragging.current = false;
      }, 0);
    },
  });
  const imageUrl = uploadUrl(entry.dish.image_path);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="link"
      tabIndex={0}
      onClick={() => {
        if (!wasDragging.current) {
          navigate(`/dishes/${entry.dish.id}`);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/dishes/${entry.dish.id}`);
        }
      }}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
          : undefined
      }
      className={`group relative block cursor-grab overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_1px_2px_rgba(43,38,33,0.05)] ${isDragging ? "opacity-90 shadow-lg" : ""}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-[46px] w-full object-cover" />
      ) : (
        <PhotoPlaceholder className="h-[46px]" />
      )}
      <div className="px-[9px] py-[7px]">
        <div className="font-display text-xs font-bold leading-tight">{entry.dish.name}</div>
        {entry.dish.kcal !== null && (
          <div className="mt-[3px] text-[11px] font-bold text-primary">
            {Math.round(entry.dish.kcal * entry.servings)} {t("common.kcal")}
            {entry.servings > 1 && ` · ${entry.servings}×`}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs leading-none text-ink-soft shadow group-hover:flex"
        aria-label={t("common.remove")}
      >
        ×
      </button>
    </div>
  );
}

function PlanCell({
  slot,
  slotName,
  entries,
  onPick,
  onRemove,
}: {
  slot: SlotRef;
  slotName: string;
  entries: PlanEntry[];
  onPick: () => void;
  onRemove: (entry: PlanEntry) => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: slotRefId(slot), data: slot });
  const addLabel = `${t("plan.addTo")} ${slot.date} ${slotName}`;
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[96px] flex-col gap-1.5 border-l border-line-soft p-[9px] transition-colors ${isOver ? "bg-primary-tint" : ""}`}
    >
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onRemove={() => onRemove(entry)} />
      ))}
      {entries.length === 0 ? (
        <button
          type="button"
          onClick={onPick}
          className="flex h-[78px] w-full items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-[#E3DACE] text-ink-faint transition-colors hover:border-primary hover:bg-primary-tint hover:text-primary"
          aria-label={addLabel}
        >
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
        </button>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex h-6 w-full items-center justify-center rounded-[10px] border border-dashed border-[#E3DACE] text-ink-faint transition-colors hover:border-primary hover:bg-primary-tint hover:text-primary"
          aria-label={addLabel}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SlotHeader({
  slot,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  slot: PlanSlot;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="group/row relative flex flex-col items-center justify-center gap-1 bg-[#FCFAF6] px-1.5 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{iconForSlot(slot.name)}</span>
        <span className="text-center font-display text-xs font-bold text-ink-soft">{slot.name}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={t("plan.moveSlotUp")}
          className="flex h-4 w-4 items-center justify-center rounded text-ink-faint hover:bg-primary-tint hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={t("plan.moveSlotDown")}
          className="flex h-4 w-4 items-center justify-center rounded text-ink-faint hover:bg-primary-tint hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {!slot.is_default && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("plan.deleteSlot")}
            className="flex h-4 w-4 items-center justify-center rounded text-ink-faint hover:bg-primary-tint hover:text-primary"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlanPage() {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickerSlot, setPickerSlot] = useState<SlotRef | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");

  const monday = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(monday, index)),
    [monday],
  );
  const startIso = toISODate(monday);

  const { data: plan} = usePlan(startIso);
  const { data: settings } = useSettings();
  const { data: slots = [] } = useSlots();
  const createEntry = useCreatePlanEntry();
  const deleteEntry = useDeletePlanEntry();
  const moveEntry = useMovePlanEntry();
  const createSlot = useCreateSlot();
  const moveSlot = useMoveSlot();
  const deleteSlot = useDeleteSlot();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const entriesBySlot = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    plan?.entries.forEach((entry) => {
      const key = `${entry.date}|${entry.slot_id}`;
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    });
    return map;
  }, [plan]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const slot = parseSlotRefId(String(over.id));
    if (!slot) return;

    const data = active.data.current as
      | { type: "palette"; dish: DishListItem }
      | { type: "entry"; entry: PlanEntry }
      | undefined;
    if (!data) return;

    if (data.type === "palette") {
      createEntry.mutate({ date: slot.date, slot_id: slot.slotId, dish_id: data.dish.id });
    } else {
      const source = data.entry;
      if (source.date === slot.date && source.slot_id === slot.slotId) return;
      moveEntry.mutate({ entryId: source.id, date: slot.date, slot_id: slot.slotId });
    }
  };

  const handleAddSlot = (event: FormEvent) => {
    event.preventDefault();
    const name = newSlotName.trim();
    if (!name) return;
    createSlot.mutate(name, {
      onSuccess: () => {
        setNewSlotName("");
        setAddingSlot(false);
      },
    });
  };

  const totals = plan?.totals;
  const weeklyTargets = settings && {
    protein: settings.daily_protein_target_g * 7,
    carbs: settings.daily_carbs_target_g * 7,
    fat: settings.daily_fat_target_g * 7,
  };

  const hasNutrition = (totals?.kcal ?? 0) > 0;

  const macroCards = [
    {
      label: t("dishes.protein"),
      value: totals?.protein_g ?? 0,
      target: weeklyTargets?.protein,
      color: "var(--color-success)",
      track: "bg-success-tint",
    },
    {
      label: t("dishes.carbs"),
      value: totals?.carbs_g ?? 0,
      target: weeklyTargets?.carbs,
      color: "var(--color-accent)",
      track: "bg-accent-tint",
    },
    {
      label: t("dishes.fat"),
      value: totals?.fat_g ?? 0,
      target: weeklyTargets?.fat,
      color: "var(--color-primary)",
      track: "bg-primary-tint",
    },
  ];

  const nutritionCards = (
    <>
      <Card className="flex flex-col justify-center border-none bg-gradient-to-br from-[#FDF3EE] to-[#FBE9DF] px-5 py-[18px]">
        <div className="text-xs font-bold uppercase tracking-wider text-[#B87A5E]">
          {t("plan.weekTotal")}
        </div>
        <div className="mt-1 font-display text-[30px] font-black text-primary-deep">
          {Math.round(totals?.kcal ?? 0)} {t("common.kcal")}
        </div>
        <div className="text-xs font-semibold text-[#B87A5E]">
          Ø {Math.round((totals?.kcal ?? 0) / 7)} {t("common.kcal")} / {t("plan.day")}
          {totals?.incomplete && ` · ${t("plan.incomplete")}`}
        </div>
      </Card>
      {macroCards.map((macro) => (
        <Card key={macro.label} className="px-5 py-[18px]">
          <div className="flex items-center gap-[7px] text-xs font-bold text-ink-soft">
            <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: macro.color }} />
            {macro.label}
          </div>
          <div className="mt-1.5 font-display text-2xl font-extrabold">{Math.round(macro.value)} g</div>
          <div className="mt-2">
            <ProgressBar
              ratio={macro.target ? macro.value / macro.target : 0}
              color={macro.color}
              trackClassName={macro.track}
              heightClassName="h-1.5"
            />
          </div>
        </Card>
      ))}
    </>
  );

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.plan")}
        title={`KW ${isoWeekNumber(monday)} · ${formatWeekRange(monday)}`}
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
			<Button variant="ghost" onClick={() => setWeekOffset(0)}>{t("plan.today")}</Button>
            <Button onClick={() => setGeneratorOpen(true)}>{t("generator.title")}</Button>
          </>
        }
      />

      {hasNutrition ? (
        <div className="mb-[26px] grid grid-cols-2 gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {nutritionCards}
        </div>
      ) : (
        <div className="mb-[26px]">
          <button
            type="button"
            onClick={() => setNutritionOpen((open) => !open)}
            className="flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-primary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${nutritionOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            {nutritionOpen ? t("plan.hideNutrition") : t("plan.showNutrition")}
          </button>
          {nutritionOpen && (
            <div className="mt-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              {nutritionCards}
            </div>
          )}
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[72px_repeat(7,minmax(96px,1fr))]">
              <div className="border-b border-line-soft" />
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className="border-b border-l border-line-soft px-2.5 py-3.5 text-center first:border-l-0"
                >
                  <div className="font-display text-sm font-extrabold">{weekdayShort(index)}</div>
                  <div className="text-[11px] font-semibold text-ink-muted">
                    {formatShortDate(day)}
                  </div>
                </div>
              ))}
            </div>

            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="grid grid-cols-[72px_repeat(7,minmax(96px,1fr))] border-b border-line-soft"
              >
                <SlotHeader
                  slot={slot}
                  isFirst={index === 0}
                  isLast={index === slots.length - 1}
                  onMoveUp={() => moveSlot.mutate({ slotId: slot.id, direction: "up" })}
                  onMoveDown={() => moveSlot.mutate({ slotId: slot.id, direction: "down" })}
                  onDelete={() => deleteSlot.mutate(slot.id)}
                />
                {weekDays.map((day) => {
                  const slotRef: SlotRef = { date: toISODate(day), slotId: slot.id };
                  return (
                    <PlanCell
                      key={slotRef.date}
                      slot={slotRef}
                      slotName={slot.name}
                      entries={entriesBySlot.get(`${slotRef.date}|${slotRef.slotId}`) ?? []}
                      onPick={() => setPickerSlot(slotRef)}
                      onRemove={(entry) => deleteEntry.mutate(entry.id)}
                    />
                  );
                })}
              </div>
            ))}

            <div className="border-b border-line-soft px-3.5 py-2.5">
              {addingSlot ? (
                <form onSubmit={handleAddSlot} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newSlotName}
                    onChange={(event) => setNewSlotName(event.target.value)}
                    placeholder={t("plan.slotNamePlaceholder")}
                    className="rounded-md border border-line bg-cream px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <Button type="submit" disabled={!newSlotName.trim() || createSlot.isPending}>
                    {t("common.add")}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setAddingSlot(false);
                      setNewSlotName("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSlot(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t("plan.addSlot")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-[72px_repeat(7,minmax(96px,1fr))]">
              <div className="px-2.5 py-2.5 text-right font-display text-[11px] font-bold text-ink-muted">
                {t("common.kcal")}
              </div>
              {plan?.day_sums.map((day) => (
                <div
                  key={day.day}
                  className="border-l border-line-soft px-2.5 py-2.5 text-center font-display text-xs font-extrabold text-ink-soft"
                >
                  {day.kcal > 0 ? Math.round(day.kcal) : "–"}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </DndContext>

      {generatorOpen && (
        <GeneratorDialog monday={monday} slots={slots} onClose={() => setGeneratorOpen(false)} />
      )}

      {pickerSlot && (
        <DishPickerDialog
          onClose={() => setPickerSlot(null)}
          onSelect={(dish) => {
            createEntry.mutate({
              date: pickerSlot.date,
              slot_id: pickerSlot.slotId,
              dish_id: dish.id,
            });
            setPickerSlot(null);
          }}
        />
      )}
    </div>
  );
}
