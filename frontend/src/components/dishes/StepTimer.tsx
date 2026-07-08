import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StepTimer({ seconds }: { seconds: number }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = remaining !== null && remaining > 0;
  const done = remaining === 0;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((value) => (value !== null && value > 0 ? value - 1 : value));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const toggle = () => {
    if (running) {
      setRemaining(null);
    } else {
      setRemaining(seconds);
    }
  };

  const base =
    "mt-2.5 inline-flex items-center gap-[7px] rounded-[10px] border-[1.5px] px-[13px] py-2 font-display text-[13px] font-bold transition-colors";
  const style = running
    ? "border-primary bg-primary text-white"
    : done
      ? "border-success bg-success-tint text-success-text"
      : "border-[#F2C9B5] bg-primary-tint text-primary hover:border-primary";

  return (
    <button type="button" onClick={toggle} className={`${base} ${style}`}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6M12 2v3" />
      </svg>
      {running
        ? t("dishes.timerRunning", { time: formatClock(remaining) })
        : done
          ? t("dishes.timerDone")
          : t("dishes.timerStart", { minutes: Math.round(seconds / 60) })}
    </button>
  );
}
