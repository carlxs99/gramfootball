import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Flag,
  ListChecks,
  PackageOpen,
  ShieldCheck,
  Trophy,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import guide from "@/assets/guide-coach-leo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEY = "gram-football.tutorial.v1";
const LEGACY_KEY = "mccj.tutorial.v1";
const OPEN_EVENT = "gram-football:tutorial";

type TutorialStep = {
  key: "welcome" | "packs" | "album" | "vault" | "tasks" | "wallet" | "invite" | "rank";
  Icon: LucideIcon;
  metric: string;
};

const STEPS: readonly TutorialStep[] = [
  { key: "welcome", Icon: ShieldCheck, metric: "01" },
  { key: "packs", Icon: PackageOpen, metric: "3–8" },
  { key: "album", Icon: BookOpen, metric: "205" },
  { key: "vault", Icon: CircleDollarSign, metric: "24H" },
  { key: "tasks", Icon: ListChecks, metric: "GRAM" },
  { key: "wallet", Icon: WalletCards, metric: "TON" },
  { key: "invite", Icon: UsersRound, metric: "10·5·1%" },
  { key: "rank", Icon: Trophy, metric: "TOP 100" },
] as const;

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
  const pointerStart = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSeenTutorial()) {
      const id = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(id);
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") setStep((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setStep((current) => Math.min(STEPS.length - 1, current + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  if (!current) return null;
  const last = step === STEPS.length - 1;
  const Icon = current.Icon;

  function close() {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start === null) return;
    const distance = event.clientX - start;
    if (Math.abs(distance) < 45) return;
    setStep((currentStep) =>
      distance < 0 ? Math.min(STEPS.length - 1, currentStep + 1) : Math.max(0, currentStep - 1),
    );
  }

  return (
    <div className="tutorial-backdrop fixed inset-0 z-[70] flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="tutorial-board relative flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl outline-none"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label={t("common.close")}
          className="absolute right-2 top-2 z-30 size-9 rounded-md border border-line/70 bg-void/55 text-ink backdrop-blur-sm hover:bg-panel2"
        >
          <X className="size-4" />
        </Button>

        <div className="tutorial-dugout relative h-[158px] shrink-0 overflow-hidden sm:h-[184px]">
          <div className="tutorial-pitch-lines" aria-hidden="true">
            <span className="tutorial-centre-circle" />
            <span className="tutorial-penalty-box" />
          </div>
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-line/70 bg-void/65 px-2.5 py-1.5 backdrop-blur-sm">
            <Flag className="size-3.5 text-primary" aria-hidden="true" />
            <span className="font-display text-[10px] font-extrabold uppercase text-ink">
              {t("tutorial.gamePlan")}
            </span>
          </div>

          <img
            src={guide}
            alt=""
            width={768}
            height={1024}
            className="pointer-events-none absolute -bottom-12 -left-5 z-10 h-[205px] w-auto select-none drop-shadow-2xl sm:-bottom-14 sm:left-0 sm:h-[245px]"
          />

          <div key={`visual-${current.key}`} className="tutorial-step-visual absolute bottom-5 right-5 z-20 flex w-[142px] flex-col items-end sm:right-7 sm:w-[168px]">
            <div className="flex size-12 items-center justify-center rounded-lg border border-primary/50 bg-void/75 text-primary shadow-lg backdrop-blur-sm sm:size-14">
              <Icon className="size-6 sm:size-7" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="mt-2 max-w-full truncate font-display text-[25px] font-extrabold leading-none text-ink sm:text-[30px]">
              {current.metric}
            </div>
            <div className="mt-1 h-0.5 w-16 bg-primary" />
          </div>
        </div>

        <div key={current.key} className="tutorial-copy flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-[9px] font-bold uppercase text-primary">
              {t("tutorial.guideName")}
            </div>
            <div className="shrink-0 font-display text-[10px] font-bold text-dim">
              {t("tutorial.step", { a: step + 1, b: STEPS.length })}
            </div>
          </div>

          <h3 id="tutorial-title" className="mt-1 font-display text-[22px] font-extrabold leading-tight text-ink sm:text-[25px]">
            {t(`tutorial.${current.key}.title`)}
          </h3>
          <p id="tutorial-description" className="mt-2 min-h-[58px] text-[12px] leading-[1.55] text-dim sm:min-h-[62px] sm:text-[13px]">
            {t(`tutorial.${current.key}.text`)}
          </p>

          <div className="mt-3 flex items-center gap-1" role="tablist" aria-label={t("tutorial.progress")}>
            {STEPS.map(({ key, Icon: StepIcon }, index) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="icon"
                role="tab"
                aria-selected={index === step}
                aria-label={t(`tutorial.${key}.title`)}
                onClick={() => setStep(index)}
                className={cn(
                  "h-8 min-w-0 flex-1 rounded-sm border px-0 shadow-none",
                  index === step
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : index < step
                      ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15"
                      : "border-line bg-panel2/50 text-dim hover:bg-panel2 hover:text-ink",
                )}
              >
                <StepIcon className="size-3.5" strokeWidth={2} aria-hidden="true" />
              </Button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2">
            {step === 0 ? (
              <Button type="button" variant="outline" onClick={close} className="h-11 rounded-md text-xs font-bold">
                {t("tutorial.skip")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                className="h-11 rounded-md text-xs font-bold"
              >
                <ChevronLeft aria-hidden="true" />
                {t("tutorial.back")}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => (last ? close() : setStep((value) => value + 1))}
              className="h-11 rounded-md font-display text-xs font-extrabold uppercase"
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