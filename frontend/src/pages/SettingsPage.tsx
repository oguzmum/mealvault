import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useSettings, useUpdateSettings } from "../api/plan";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const inputClass =
  "w-full rounded-md border border-line bg-cream px-3.5 py-[11px] text-[15px] text-ink outline-none transition-colors focus:border-primary";
const labelClass = "mb-1.5 block text-[13px] font-bold text-ink-soft";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    daily_kcal_target: "2000",
    daily_protein_target_g: "100",
    daily_carbs_target_g: "250",
    daily_fat_target_g: "70",
    default_max_missing: "2",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      daily_kcal_target: String(settings.daily_kcal_target),
      daily_protein_target_g: String(settings.daily_protein_target_g),
      daily_carbs_target_g: String(settings.daily_carbs_target_g),
      daily_fat_target_g: String(settings.daily_fat_target_g),
      default_max_missing: String(settings.default_max_missing),
    });
  }, [settings]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    updateSettings.mutate(
      {
        daily_kcal_target: Number(form.daily_kcal_target) || 2000,
        daily_protein_target_g: Number(form.daily_protein_target_g) || 0,
        daily_carbs_target_g: Number(form.daily_carbs_target_g) || 0,
        daily_fat_target_g: Number(form.daily_fat_target_g) || 0,
        default_max_missing: Number(form.default_max_missing) || 0,
      },
      { onSuccess: () => setSaved(true) },
    );
  };

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "daily_kcal_target", label: t("settings.kcalTarget") },
    { key: "daily_protein_target_g", label: t("settings.proteinTarget") },
    { key: "daily_carbs_target_g", label: t("settings.carbsTarget") },
    { key: "daily_fat_target_g", label: t("settings.fatTarget") },
    { key: "default_max_missing", label: t("settings.maxMissing") },
  ];

  return (
    <div className="max-w-[560px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("nav.settings")}
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {isLoading ? (
        <p className="text-ink-muted">{t("common.loading")}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="flex flex-col gap-4 p-6">
            {fields.map((field) => (
              <div key={field.key}>
                <label className={labelClass} htmlFor={field.key}>
                  {field.label}
                </label>
                <input
                  id={field.key}
                  className={inputClass}
                  inputMode="numeric"
                  value={form[field.key]}
                  onChange={(e) => {
                    setSaved(false);
                    setForm({ ...form, [field.key]: e.target.value });
                  }}
                />
              </div>
            ))}
          </Card>
          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" disabled={updateSettings.isPending}>
              {t("common.save")}
            </Button>
            {saved && (
              <span className="text-sm font-bold text-success-text">{t("settings.saved")}</span>
            )}
            {updateSettings.isError && (
              <span className="text-sm font-bold text-primary">{t("common.error")}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
