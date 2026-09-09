import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import guide from "@/assets/guide-trainer.png";

const KEY = "mccj.tutorial.v1";
const STEPS = ["welcome", "packs", "album", "vault", "tasks", "wallet", "invite", "rank"] as const;

export function hasSeenTutorial() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1";
}

export function openTutorial() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mccj:tutorial"));
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
    window.addEventListener("mccj:tutorial", onOpen);
    return () => window.removeEventListener("mccj:tutorial", onOpen);
  }, []);

  if (!open) return null;

  const last = step === STEPS.length - 1;
  const key = STEPS[step];

  const close = () => {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(8,6,25,0.72)] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div className="relative w-full max-w-[420px]">
        <img
          src={guide}
          alt=""
          width={768}
          height={1024}
          className="pointer-events-none absolute -top-[168px] right-2 h-[210px] w-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
        />
        <div className="glossy-pill relative overflow-hidden rounded-3xl border border-white/15 bg-[rgba(18,14,44,0.92)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          <button
            onClick={close}
            aria-label={t("common.close")}
            className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 text-dim"
          >
            <X className="size-4" />
          </button>

          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
            {t("tutorial.guideName")} · {t("tutorial.step", { a: step + 1, b: STEPS.length })}
          </div>
          <h3 className="mt-1 pr-8 font-display text-[17px] font-extrabold">
            {t(`tutorial.${key}.title`)}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">{t(`tutorial.${key}.text`)}</p>

          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-white" : "w-1.5 bg-white/25"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={close}
              className="flex-1 rounded-2xl border border-white/15 py-3 text-[13px] font-bold text-dim"
            >
              {t("tutorial.skip")}
            </button>
            <button
              onClick={() => (last ? close() : setStep((s) => s + 1))}
              className="flex-[1.4] rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#0ea5e9] py-3 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
            >
              {last ? t("tutorial.done") : t("tutorial.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
