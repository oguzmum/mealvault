import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="font-display text-[64px] font-black text-ink-faint">404</div>
      <p className="text-ink-soft">{t("common.notFound")}</p>
      <Link to="/" className="font-display font-extrabold text-primary hover:text-primary-hover">
        {t("nav.plan")}
      </Link>
    </div>
  );
}
