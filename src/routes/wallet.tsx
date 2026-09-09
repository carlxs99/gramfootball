import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

const TonPanel = lazy(() => import("@/components/TonPanel").then((m) => ({ default: m.TonPanel })));

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet · Monsters CCJ" },
      {
        name: "description",
        content: "Deposit and withdraw GRAM on TON with your own wallet, detected automatically.",
      },
      { property: "og:title", content: "Wallet · Monsters CCJ" },
      { property: "og:description", content: "Connect your TON wallet to deposit and withdraw GRAM instantly." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AppShell>
      <div className="px-4 pb-2">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Wallet</h1>
        <p className="text-[12px] text-dim">Deposits and withdrawals in GRAM on the TON network.</p>
      </div>
      {mounted && (
        <Suspense fallback={<div className="py-16 text-center text-sm text-dim">Loading wallet…</div>}>
          <TonPanel />
        </Suspense>
      )}
    </AppShell>
  );
}
