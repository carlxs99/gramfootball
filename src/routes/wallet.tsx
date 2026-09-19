import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { WalletPanel } from "@/components/WalletPanel";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet · GRAM Football" },
      {
        name: "description",
        content: "Deposit and withdraw GRAM with your own wallet, detected automatically.",
      },
      { property: "og:title", content: "Wallet · GRAM Football" },
      {
        property: "og:description",
        content: "Connect your wallet to deposit and withdraw GRAM instantly.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const t = useT();
  return (
    <AppShell>
      <div className="px-4 pb-2">
        <h1 className="font-display text-[22px] font-extrabold text-panel">{t("wallet.title")}</h1>
        <p className="text-[12px] text-dim">{t("wallet.sub")}</p>
      </div>
      <WalletPanel />
    </AppShell>
  );
}
