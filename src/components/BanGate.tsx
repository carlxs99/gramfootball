import { ShieldAlert } from "lucide-react";
import { useBanState } from "@/lib/store";
import { useT } from "@/lib/i18n";

/** Full-screen notice that blocks a suspended account from using the app. */
export function BanGate() {
  const ban = useBanState();
  const t = useT();
  if (!ban.banned) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-void/95 px-6 backdrop-blur-md">
      <div className="soft-card w-full max-w-[380px] rounded-3xl p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-panel2 text-legend">
          <ShieldAlert size={26} aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-xl font-extrabold">{t("ban.title")}</h2>
        <p className="mt-3 text-[12px] leading-relaxed text-dim">
          {ban.reason === "multi_account" ? t("ban.multi") : t("ban.other")}
        </p>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-dim">
          {t("ban.help")}
        </p>
      </div>
    </div>
  );
}
