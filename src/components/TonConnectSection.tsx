import "@/lib/buffer-polyfill";
import { useEffect } from "react";
import { TonConnectUIProvider, useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";
import { Loader2, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n";

type Props = {
  depositAddress: string;
  memo: string;
  amount: number;
  onAddress: (address: string) => void;
  onSent: () => void;
  onError: (message: string) => void;
};

function manifestUrl() {
  if (typeof window === "undefined") return "/api/public/tonconnect-manifest";
  return `${window.location.origin}/api/public/tonconnect-manifest`;
}

export default function TonConnectSection(props: Props) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl()}>
      <Inner {...props} />
    </TonConnectUIProvider>
  );
}

function Inner({ depositAddress, memo, amount, onAddress, onSent, onError }: Props) {
  const t = useT();
  const [tonConnectUI] = useTonConnectUI();
  const connected = useTonAddress();

  useEffect(() => {
    if (connected) onAddress(connected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const pay = async () => {
    if (!connected) {
      void tonConnectUI.openModal().catch(() => onError(t("wallet.connectFailed")));
      return;
    }
    try {
      const payload = beginCell().storeUint(0, 32).storeStringTail(memo).endCell().toBoc().toString("base64");
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: depositAddress, amount: String(Math.round(amount * 1e9)), payload }],
      });
      onSent();
    } catch {
      onError(t("wallet.cancelled"));
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          try {
            void (connected
              ? tonConnectUI.disconnect()
              : tonConnectUI.openModal().catch(() => onError(t("wallet.connectFailed"))));
          } catch {
            onError(t("wallet.connectFailed"));
          }
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25"
      >
        <Wallet className="size-4" />
        {connected
          ? t("wallet.disconnect", { a: `${connected.slice(0, 4)}…${connected.slice(-4)}` })
          : t("wallet.connect")}
      </button>
      {connected && (
        <button
          type="button"
          onClick={() => void pay()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
        >
          {t("wallet.pay")}
        </button>
      )}
    </div>
  );
}

export function ConnectFallback() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-dim">
      <Loader2 className="size-4 animate-spin" />
    </div>
  );
}
