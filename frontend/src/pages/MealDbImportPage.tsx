import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useImportMealDbDish, useMealDbSearch } from "../api/mealdb";
import type { MealDbSearchResult } from "../api/mealdb";
import { PhotoPlaceholder } from "../components/dishes/DishCard";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function ResultCard({ result }: { result: MealDbSearchResult }) {
  const { t } = useTranslation();
  const importDish = useImportMealDbDish();
  const justImported = importDish.isSuccess && importDish.variables === result.external_id;
  const added = result.already_imported || justImported;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-[150px]">
        {result.thumbnail ? (
          <img src={result.thumbnail} alt={result.name} className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder className="h-full w-full" />
        )}
      </div>
      <div className="px-4 pb-[17px] pt-[15px]">
        <div className="font-display text-[17px] font-extrabold tracking-tight">{result.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-soft">
          {result.category && <span>{result.category}</span>}
          {result.category && result.area && <span>·</span>}
          {result.area && <span>{result.area}</span>}
        </div>
        <Button
          variant={added ? "ghost" : "primary"}
          className="mt-3 w-full justify-center"
          disabled={added || importDish.isPending}
          onClick={() => importDish.mutate(result.external_id)}
        >
          {added
            ? t("mealdbImport.added")
            : importDish.isPending && importDish.variables === result.external_id
              ? t("mealdbImport.adding")
              : t("mealdbImport.add")}
        </Button>
      </div>
    </Card>
  );
}

export default function MealDbImportPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useMealDbSearch(query);

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-[34px]">
      <PageHeader
        kicker={t("mealdbImport.kicker")}
        title={t("mealdbImport.title")}
        subtitle={t("mealdbImport.subtitle")}
        actions={
          <Link to="/dishes">
            <Button variant="ghost">{t("dishes.backToDishes")}</Button>
          </Link>
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-cream px-3.5">
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mealdbImport.placeholder")}
            className="flex-1 bg-transparent py-[10px] text-[15px] text-ink outline-none"
            autoFocus
          />
        </div>
      </Card>

      {query.trim().length < 2 && <p className="text-ink-soft">{t("mealdbImport.hint")}</p>}
      {query.trim().length >= 2 && (isLoading || isFetching) && (
        <p className="text-ink-muted">{t("common.loading")}</p>
      )}
      {query.trim().length >= 2 && !isFetching && results && results.length === 0 && (
        <p className="text-ink-soft">{t("mealdbImport.noResults")}</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        {results?.map((result) => <ResultCard key={result.external_id} result={result} />)}
      </div>
    </div>
  );
}
