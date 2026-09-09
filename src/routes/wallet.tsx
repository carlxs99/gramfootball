import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { Buffer } from "buffer";
import { AppShell } from "@/components/AppShell";

// The Telegram WebView does not expose Node's Buffer. Install it synchronously
// in this route chunk before the wallet libraries are ever evaluated.
const browserGlobal = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
browserGlobal.Buffer ??= Buffer;

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
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const walletModule = await import("@/components/TonPanel");
        if (active) setTonPanel(() => walletModule.TonPanel);
      } catch (error) {
        console.error("Wallet module failed to load", error);
        if (active) setLoadError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  return (
    <AppShell>
      <div className="px-4 pb-2">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Wallet</h1>
        <p className="text-[12px] text-dim">Deposits and withdrawals in GRAM.</p>
      </div>
      {loadError ? (
        <div className="mx-4 py-16 text-center text-sm text-dim">
          <p>Could not load the wallet.</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              setLoadAttempt((attempt) => attempt + 1);
            }}
            className="mt-4 rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : TonPanel ? (
        <TonPanel />
      ) : (
        <div className="py-16 text-center text-sm text-dim">Loading wallet…</div>
      )}
    </AppShell>
  );
}
