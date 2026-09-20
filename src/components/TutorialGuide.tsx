import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import guide from "@/assets/guide-trainer.webp";
import { Button } from "@/components/ui/button";

const KEY = "gram-football.tutorial.v1";
const LEGACY_KEY = "mccj.tutorial.v1";
const OPEN_EVENT = "gram-football:tutorial";
const STEPS = ["welcome", "packs", "album", "vault", "tasks", "wallet", "invite", "rank"] as const;

export function hasSeenTutorial() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1" || window.localStorage.getItem(LEGACY_KEY) === "1";
}

export function openTutorial() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function TutorialGuide() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasSeenTutorial()) {
      const id = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(id);
    }
    return;
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.localStorage.setItem(KEY, "1");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const last = step === STEPS.length - 1;
  const key = STEPS[step];

  const close = () => {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-void/80 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-[420px]">
        <img
          src={guide}
          alt=""
          width={768}
          height={1024}
          className="pointer-events-none absolute -top-[150px] right-2 h-[190px] w-auto drop-shadow-xl sm:-top-[168px] sm:h-[210px]"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          aria-describedby="tutorial-description"
          className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label={t("common.close")}
            className="absolute right-2 top-2 size-9 rounded-full text-dim"
          >
            <X className="size-4" />
          </Button>

          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
            {t("tutorial.guideName")} · {t("tutorial.step", { a: step + 1, b: STEPS.length })}
          </div>
          <h3 id="tutorial-title" className="mt-1 pr-8 font-display text-[19px] font-extrabold text-ink">
            {t(`tutorial.${key}.title`)}
          </h3>
          <p id="tutorial-description" className="mt-2 min-h-16 text-[13px] leading-relaxed text-dim">
            {t(`tutorial.${key}.text`)}
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                aria-current={i === step ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-line"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {step === 0 ? (
              <Button type="button" variant="outline" onClick={close} className="h-11 flex-1 rounded-xl text-xs font-bold">
                {t("tutorial.skip")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="h-11 flex-1 rounded-xl text-xs font-bold"
              >
                <ChevronLeft aria-hidden="true" />
                {t("tutorial.back")}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => (last ? close() : setStep((s) => s + 1))}
              className="h-11 flex-[1.4] rounded-xl font-display text-xs font-extrabold"
            >
              {last ? t("tutorial.done") : t("tutorial.next")}
              {!last ? <ChevronRight aria-hidden="true" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
