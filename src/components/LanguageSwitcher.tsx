import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { LANGS, setLang, useLang, useT } from "@/lib/i18n";

export function LanguageSwitcher() {
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("shell.language")}
        className="glossy-pill flex min-h-9 items-center gap-1 rounded-full px-2.5 py-2"
      >
        <Globe size={14} className="text-rare" aria-hidden="true" />
        <span className="text-[13px] leading-none">{active.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-bold ${
                l.code === lang ? "bg-panel2 text-rare" : "text-ink"
              }`}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
