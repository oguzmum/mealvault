import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { uploadUrl } from "../../api/client";
import type { DishListItem } from "../../api/types";
import { tagTone } from "../../utils/format";
import Card from "../ui/Card";
import { TagChip } from "../ui/Chip";

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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
  );
}

/** Striped placeholder used wherever a dish has no photo, matching the mockup. */
export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[repeating-linear-gradient(45deg,#F5EDE3,#F5EDE3_11px,#EFE5D7_11px,#EFE5D7_22px)] ${className}`}
    />
  );
}

export default function DishCard({ dish }: { dish: DishListItem }) {
  const { t } = useTranslation();
  const imageUrl = uploadUrl(dish.image_path);

  return (
    <Link to={`/dishes/${dish.id}`}>
      <Card className="cursor-pointer overflow-hidden transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(43,38,33,0.09)]">
        <div className="relative h-[150px]">
          {imageUrl ? (
            <img src={imageUrl} alt={dish.name} className="h-full w-full object-cover" />
          ) : (
            <PhotoPlaceholder className="h-full w-full" />
          )}
          {dish.kcal !== null && (
            <div className="absolute right-[11px] top-[11px] rounded-full bg-white/90 px-2.5 py-[5px] font-display text-xs font-extrabold text-primary">
              {Math.round(dish.kcal)} {t("common.kcal")}
            </div>
          )}
        </div>
        <div className="px-4 pb-[17px] pt-[15px]">
          <div className="font-display text-[17px] font-extrabold tracking-tight">{dish.name}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {dish.cook_time_minutes !== null && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft">
                <ClockIcon />
                {dish.cook_time_minutes} {t("common.minutes")}
              </span>
            )}
            {dish.tags.slice(0, 2).map((tag) => (
              <TagChip key={tag.id} tone={tagTone(tag.slug)} label={tag.name} />
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
