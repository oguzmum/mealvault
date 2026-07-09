import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteTag, useRenameTag, useTags } from "../api/dishes";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";

const inputClass =
  "w-full rounded-md border border-line bg-cream px-3 py-1.5 text-[15px] text-ink outline-none transition-colors focus:border-primary";

export default function TagsPage() {
  const { t } = useTranslation();
  const { data: tags = [], isLoading } = useTags({ includeEmpty: true });
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveEdit = () => {
    const name = editValue.trim();
    if (editingId === null || !name) {
      setEditingId(null);
      return;
    }
    renameTag.mutate({ id: editingId, name }, { onSuccess: () => setEditingId(null) });
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit();
    } else if (event.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(t("tags.confirmDelete", { name }))) return;
    deleteTag.mutate(id);
  };

  return (
    <div className="max-w-[720px] px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader kicker={t("nav.tags")} title={t("tags.title")} subtitle={t("tags.subtitle")} />

      {isLoading ? (
        <p className="text-ink-muted">{t("common.loading")}</p>
      ) : tags.length === 0 ? (
        <p className="text-ink-muted">{t("tags.empty")}</p>
      ) : (
        <Card className="divide-y divide-line-soft">
          <div className="grid grid-cols-[1fr_110px_72px] items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-faint">
            <span>{t("tags.name")}</span>
            <span className="text-right">{t("tags.dishCount")}</span>
            <span />
          </div>
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="grid min-h-[52px] grid-cols-[1fr_110px_72px] items-center gap-2 px-5 py-3"
            >
              {editingId === tag.id ? (
                <input
                  autoFocus
                  className={inputClass}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                />
              ) : (
                <span className="font-display text-[15px] font-bold">{tag.name}</span>
              )}
              <span className="text-right text-sm font-semibold text-ink-soft">{tag.dish_count}</span>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(tag.id, tag.name)}
                  aria-label={t("tags.rename")}
                  className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-primary-tint hover:text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tag.id, tag.name)}
                  aria-label={t("tags.delete")}
                  className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-primary-tint hover:text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {renameTag.isError && (
        <p className="mt-3 text-sm font-bold text-primary">{t("tags.renameError")}</p>
      )}
    </div>
  );
}
