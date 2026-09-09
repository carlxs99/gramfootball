import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet · Monsters CCJ" },
      {
        name: "description",
        content: "Deposit and withdraw GRAM with your own wallet, detected automatically.",
      },
      { property: "og:title", content: "Wallet · Monsters CCJ" },
      { property: "og:description", content: "Connect your wallet to deposit and withdraw GRAM instantly." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const [TonPanel, setTonPanel] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { Buffer } = await import("buffer");
        const browserGlobal = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
        browserGlobal.Buffer ??= Buffer;

        const walletModule = await import("@/components/TonPanel");
        if (active) setTonPanel(() => walletModule.TonPanel);
      } catch {
        if (active) setLoadError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <div className="px-4 pb-2">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Wallet</h1>
        <p className="text-[12px] text-dim">Deposits and withdrawals in GRAM.</p>
      </div>
      {loadError ? (
        <div className="mx-4 py-16 text-center text-sm text-dim">Could not load the wallet. Please reopen this page.</div>
      ) : TonPanel ? (
        <TonPanel />
      ) : (
        <div className="py-16 text-center text-sm text-dim">Loading wallet…</div>
      )}
    </AppShell>
  );
}
