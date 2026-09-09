import "@/lib/buffer-polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { TonConnectUIProvider, useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, Loader2, Wallet } from "lucide-react";
import { beginCell } from "@ton/core";
import { getWallet, requestWithdrawal, saveTonAddress, type WalletSummary } from "@/lib/wallet.functions";
import { initData, isTelegram } from "@/lib/telegram";
import { setGram } from "@/lib/store";

const MANIFEST = "/tonconnect-manifest.json";

export function TonPanel() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST}>
      <WalletBody />
    </TonConnectUIProvider>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="soft-card flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-dim">{label}</span>
        <span className="block truncate font-mono text-[12px] font-semibold text-ink">{value}</span>
      </span>
      {done ? <Check className="size-4 shrink-0 text-emerald-500" /> : <Copy className="size-4 shrink-0 text-dim" />}
    </button>
  );
}

function WalletBody() {
  const [tonConnectUI] = useTonConnectUI();
  const connected = useTonAddress();
  const [data, setData] = useState<WalletSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("1");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const lastGram = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isTelegram()) return;
    try {
      const res = await getWallet({ data: { initData: initData() } });
      setData(res);
      setGram(res.gram);
      if (lastGram.current !== null && res.gram > lastGram.current) {
        setMessage(`Deposit received: +${(res.gram - lastGram.current).toFixed(2)} GRAM`);
      }
      lastGram.current = res.gram;
      if (!withdrawTo) setWithdrawTo(res.tonAddress ?? connected ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wallet.loadFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Poll while the wallet screen is open so deposits appear on their own.
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Remember the connected wallet as the payout destination.
  useEffect(() => {
    if (!connected || !isTelegram()) return;
    setWithdrawTo((prev) => prev || connected);
    void saveTonAddress({ data: { initData: initData(), address: connected } }).catch(() => undefined);
  }, [connected]);

  const sendDeposit = async () => {
    if (!data) return;
    const amount = Number(depositAmount);
    if (!(amount >= data.minDeposit)) {
      setError(`Minimum deposit is ${data.minDeposit} GRAM`);
      return;
    }
    if (!connected) {
      void tonConnectUI.openModal();
      return;
    }
    setError(null);
    const payload = beginCell().storeUint(0, 32).storeStringTail(data.memo).endCell().toBoc().toString("base64");
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          { address: data.depositAddress, amount: String(Math.round(amount * 1e9)), payload },
        ],
      });
      setMessage(t("wallet.sent"));
      setTimeout(() => void refresh(), 8000);
    } catch {
      setError(t("wallet.cancelled"));
    }
  };

  const withdraw = async () => {
    if (!data) return;
    const amount = Number(withdrawAmount);
    const address = withdrawTo.trim();
    if (!(amount >= data.minWithdraw)) {
      setError(`Minimum withdrawal is ${data.minWithdraw} GRAM`);
      return;
    }
    if (amount > data.gram) {
      setError(t("wallet.notEnough"));
      return;
    }
    if (!address) {
      setError(t("wallet.needAddress"));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await requestWithdrawal({ data: { initData: initData(), amount, address } });
      setGram(res.gram);
      setWithdrawAmount("");
      setMessage(`Sent ${res.net.toFixed(2)} GRAM to your wallet`);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wallet.withdrawFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!isTelegram()) {
    return (
      <div className="soft-card mx-4 rounded-3xl p-5 text-center text-sm text-dim">
        {t("wallet.onlyTelegram")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-dim">
        <Loader2 className="size-4 animate-spin" /> {t("wallet.loading")}
      </div>
    );
  }

  const net = Number(withdrawAmount) > 0 ? Number(withdrawAmount) * (1 - data.feeRate) : 0;

  return (
    <div className="space-y-4 px-4 pb-6">
      <section className="soft-card rounded-3xl p-5">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">{t("wallet.balance")}</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="font-display text-4xl font-extrabold text-ink">{data.gram.toFixed(2)}</span>
          <span className="pb-1.5 text-sm font-bold text-gram">GRAM</span>
        </div>
        <button
          type="button"
          onClick={() => (connected ? tonConnectUI.disconnect() : tonConnectUI.openModal())}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25"
        >
          <Wallet className="size-4" />
          {connected ? t("wallet.disconnect", { a: `${connected.slice(0, 4)}…${connected.slice(-4)}` }) : t("wallet.connect")}
        </button>
      </section>

      {message && (
        <div className="rounded-2xl bg-emerald-500/12 px-4 py-3 text-[12px] font-semibold text-emerald-600">{message}</div>
      )}
      {error && (
        <div className="rounded-2xl bg-rose-500/12 px-4 py-3 text-[12px] font-semibold text-rose-600">{error}</div>
      )}

      <section className="soft-card space-y-3 rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-extrabold text-ink">
          <ArrowDownToLine className="size-4 text-sky-500" /> {t("wallet.deposit")}
        </h2>
        <p className="text-[12px] leading-relaxed text-dim">
          {t("wallet.depositNote")}
        </p>
        <CopyRow label={t("wallet.gameWallet")} value={data.depositAddress} />
        <CopyRow label={t("wallet.memo")} value={data.memo} />
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="soft-card w-24 rounded-2xl px-3 py-3 text-sm font-bold text-ink outline-none"
            placeholder="1.0"
          />
          <button
            type="button"
            onClick={() => void sendDeposit()}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
          >
            {connected ? t("wallet.pay") : t("wallet.connectPay")}
          </button>
        </div>
      </section>

      <section className="soft-card space-y-3 rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-extrabold text-ink">
          <ArrowUpFromLine className="size-4 text-indigo-500" /> {t("wallet.withdraw")}
        </h2>
        <p className="text-[12px] leading-relaxed text-dim">
          {t("wallet.withdrawNote", { min: data.minWithdraw, fee: Math.round(data.feeRate * 100) })}
        </p>
        <input
          inputMode="decimal"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder={t("wallet.amount", { max: data.gram.toFixed(2) })}
          className="soft-card w-full rounded-2xl px-3.5 py-3 text-sm font-bold text-ink outline-none"
        />
        <input
          value={withdrawTo}
          onChange={(e) => setWithdrawTo(e.target.value)}
          placeholder={t("wallet.destination")}
          className="soft-card w-full rounded-2xl px-3.5 py-3 font-mono text-[12px] font-semibold text-ink outline-none"
        />
        <div className="flex items-center justify-between text-[11px] font-semibold text-dim">
          <span>{t("wallet.youReceive")}</span>
          <span className="text-ink">{net.toFixed(2)} GRAM</span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void withdraw()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Withdraw
        </button>
      </section>

      <section className="soft-card space-y-2 rounded-3xl p-5">
        <h2 className="font-display text-[15px] font-extrabold text-ink">{t("wallet.history")}</h2>
        {data.deposits.length === 0 && data.withdrawals.length === 0 && (
          <p className="text-[12px] text-dim">{t("wallet.noMoves")}</p>
        )}
        {data.deposits.map((d) => (
          <div key={d.id} className="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
            <span className="text-[12px] font-semibold text-dim">{t("wallet.deposit")} · {new Date(d.at).toLocaleDateString()}</span>
            <span className="text-[13px] font-bold text-emerald-600">+{d.amount.toFixed(2)}</span>
          </div>
        ))}
        {data.withdrawals.map((w) => (
          <div key={w.id} className="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
            <span className="text-[12px] font-semibold text-dim">
              Withdrawal · {w.status} · {new Date(w.at).toLocaleDateString()}
            </span>
            <span className="text-[13px] font-bold text-rose-600">-{w.amount.toFixed(2)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
