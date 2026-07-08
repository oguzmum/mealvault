import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useCreateDish, useDish, useUpdateDish, useUploadDishImage } from "../api/dishes";
import type { DishInput } from "../api/types";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { TagChip } from "../components/ui/Chip";
import { tagTone } from "../utils/format";

interface IngredientRow {
  ingredient_name: string;
  amount: string;
  unit: string;
}

interface StepRow {
  text: string;
  timerMinutes: string;
}

const inputClass =
  "w-full rounded-md border border-line bg-cream px-3.5 py-[11px] text-[15px] text-ink outline-none transition-colors focus:border-primary";
const labelClass = "mb-1.5 block text-[13px] font-bold text-ink-soft";

function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DishFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const dishId = id ? Number(id) : undefined;
  const isEdit = dishId !== undefined;

  const { data: existing } = useDish(dishId);
  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const uploadImage = useUploadDishImage();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [baseServings, setBaseServings] = useState("2");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { ingredient_name: "", amount: "", unit: "" },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([{ text: "", timerMinutes: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing || !isEdit) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setCookTime(existing.cook_time_minutes?.toString() ?? "");
    setBaseServings(existing.base_servings.toString());
    setKcal(existing.kcal?.toString() ?? "");
    setProtein(existing.protein_g?.toString() ?? "");
    setCarbs(existing.carbs_g?.toString() ?? "");
    setFat(existing.fat_g?.toString() ?? "");
    setTags(existing.tags.map((tag) => tag.name));
    setIngredients(
      existing.ingredients.length > 0
        ? existing.ingredients.map((item) => ({
            ingredient_name: item.ingredient_name,
            amount: item.amount?.toString() ?? "",
            unit: item.unit ?? item.raw_text ?? "",
          }))
        : [{ ingredient_name: "", amount: "", unit: "" }],
    );
    setSteps(
      existing.steps.length > 0
        ? existing.steps.map((step) => ({
            text: step.text,
            timerMinutes: step.timer_seconds ? Math.round(step.timer_seconds / 60).toString() : "",
          }))
        : [{ text: "", timerMinutes: "" }],
    );
  }, [existing, isEdit]);

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setTags([...tags, value]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  };

  const updateIngredient = (index: number, patch: Partial<IngredientRow>) => {
    setIngredients(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateStep = (index: number, patch: Partial<StepRow>) => {
    setSteps(steps.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("dishes.form.nameRequired"));
      return;
    }
    setError(null);

    const payload: DishInput = {
      name: name.trim(),
      description: description.trim() || null,
      cook_time_minutes: parseNumber(cookTime),
      base_servings: parseNumber(baseServings) ?? 2,
      kcal: parseNumber(kcal),
      protein_g: parseNumber(protein),
      carbs_g: parseNumber(carbs),
      fat_g: parseNumber(fat),
      tags,
      ingredients: ingredients
        .filter((row) => row.ingredient_name.trim())
        .map((row) => ({
          ingredient_name: row.ingredient_name.trim(),
          amount: parseNumber(row.amount),
          unit: row.unit.trim() || null,
        })),
      steps: steps
        .filter((row) => row.text.trim())
        .map((row) => {
          const minutes = parseNumber(row.timerMinutes);
          return {
            text: row.text.trim(),
            timer_seconds: minutes ? Math.round(minutes * 60) : null,
          };
        }),
    };

    const afterSave = async (savedId: number) => {
      if (imageFile) {
        await uploadImage.mutateAsync({ id: savedId, file: imageFile });
      }
      navigate(`/dishes/${savedId}`);
    };

    if (isEdit && dishId !== undefined) {
      updateDish.mutate(
        { id: dishId, payload },
        { onSuccess: (dish) => afterSave(dish.id), onError: () => setError(t("common.error")) },
      );
    } else {
      createDish.mutate(payload, {
        onSuccess: (dish) => afterSave(dish.id),
        onError: () => setError(t("common.error")),
      });
    }
  };

  const isSaving = createDish.isPending || updateDish.isPending || uploadImage.isPending;

  return (
    <div className="max-w-[820px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.dishes")}
        title={isEdit ? t("dishes.edit") : t("dishes.new")}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <label className={labelClass} htmlFor="dish-name">
              {t("dishes.form.name")}
            </label>
            <input
              id="dish-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dishes.form.namePlaceholder")}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dish-description">
              {t("dishes.form.description")}
            </label>
            <textarea
              id="dish-description"
              className={`${inputClass} min-h-20 resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="dish-cooktime">
                {t("dishes.form.cookTime")}
              </label>
              <input
                id="dish-cooktime"
                className={inputClass}
                inputMode="numeric"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="dish-servings">
                {t("dishes.form.baseServings")}
              </label>
              <input
                id="dish-servings"
                className={inputClass}
                inputMode="numeric"
                value={baseServings}
                onChange={(e) => setBaseServings(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="dish-tags">
              {t("dishes.form.tags")}
            </label>
            <input
              id="dish-tags"
              className={inputClass}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={t("dishes.form.tagsPlaceholder")}
            />
            {tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags(tags.filter((item) => item !== tag))}
                    title={t("common.remove")}
                  >
                    <TagChip tone={tagTone(tag.toLowerCase())} label={`${tag} ×`} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="dish-image">
              {t("dishes.form.image")}
            </label>
            <input
              id="dish-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-tint file:px-4 file:py-2 file:font-display file:text-sm file:font-bold file:text-primary"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-2 font-display text-lg font-extrabold">
            {t("dishes.form.nutritionHint")}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["dish-kcal", t("dishes.calories"), kcal, setKcal],
                ["dish-protein", `${t("dishes.protein")} (g)`, protein, setProtein],
                ["dish-carbs", `${t("dishes.carbs")} (g)`, carbs, setCarbs],
                ["dish-fat", `${t("dishes.fat")} (g)`, fat, setFat],
              ] as const
            ).map(([fieldId, label, value, setter]) => (
              <div key={fieldId}>
                <label className={labelClass} htmlFor={fieldId}>
                  {label}
                </label>
                <input
                  id={fieldId}
                  className={inputClass}
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-extrabold">
            {t("dishes.form.ingredients")}
          </h3>
          <div className="flex flex-col gap-2.5">
            {ingredients.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_100px_90px_36px] sm:items-center sm:gap-2.5"
              >
                <input
                  className={inputClass}
                  value={row.ingredient_name}
                  onChange={(e) => updateIngredient(index, { ingredient_name: e.target.value })}
                  placeholder={t("dishes.form.ingredientName")}
                  aria-label={t("dishes.form.ingredientName")}
                />
                <div className="flex gap-2 sm:contents">
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => updateIngredient(index, { amount: e.target.value })}
                    placeholder={t("dishes.form.amount")}
                    aria-label={t("dishes.form.amount")}
                  />
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    value={row.unit}
                    onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                    placeholder={t("dishes.form.unit")}
                    aria-label={t("dishes.form.unit")}
                  />
                  <button
                    type="button"
                    onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                    className="flex flex-shrink-0 items-center justify-center rounded-md border border-line px-3 text-ink-muted hover:border-primary hover:text-primary sm:px-0"
                    title={t("common.remove")}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="link"
            className="mt-3"
            onClick={() => setIngredients([...ingredients, { ingredient_name: "", amount: "", unit: "" }])}
          >
            + {t("dishes.form.addIngredient")}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-extrabold">{t("dishes.form.steps")}</h3>
          <div className="flex flex-col gap-2.5">
            {steps.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[30px_1fr_150px_36px] sm:items-start sm:gap-2.5"
              >
                <div className="flex gap-2 sm:contents">
                  <div className="mt-2 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px] bg-primary-tint font-display text-sm font-extrabold text-primary">
                    {index + 1}
                  </div>
                  <textarea
                    className={`${inputClass} min-h-[46px] min-w-0 flex-1 resize-y`}
                    value={row.text}
                    onChange={(e) => updateStep(index, { text: e.target.value })}
                    placeholder={t("dishes.form.stepText")}
                    aria-label={t("dishes.form.stepText")}
                  />
                </div>
                <div className="flex gap-2 sm:contents">
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    inputMode="numeric"
                    value={row.timerMinutes}
                    onChange={(e) => updateStep(index, { timerMinutes: e.target.value })}
                    placeholder={t("dishes.form.timerMinutes")}
                    aria-label={t("dishes.form.timerMinutes")}
                  />
                  <button
                    type="button"
                    onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                    className="flex h-[46px] flex-shrink-0 items-center justify-center rounded-md border border-line px-3 text-ink-muted hover:border-primary hover:text-primary sm:mt-2 sm:h-[30px] sm:px-0"
                    title={t("common.remove")}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="link"
            className="mt-3"
            onClick={() => setSteps([...steps, { text: "", timerMinutes: "" }])}
          >
            + {t("dishes.form.addStep")}
          </Button>
        </Card>

        {error && <p className="font-bold text-primary">{error}</p>}

        <div className="flex gap-2.5">
          <Button type="submit" disabled={isSaving}>
            {t("common.save")}
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
