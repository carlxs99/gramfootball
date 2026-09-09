import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet } from "lucide-react";
import {
  getWallet,
  requestWithdrawal,
  saveTonAddress,
  type WalletSummary,
} from "@/lib/wallet.functions";
import { initData, isTelegram } from "@/lib/telegram";
import { setGram } from "@/lib/store";
import { useT } from "@/lib/i18n";

// The wallet-connect libraries are heavy and browser-specific, so they load
// only when the player asks to connect. The rest of the screen always works.
const TonConnectSection = lazy(() => import("./TonConnectSection"));

/** Keeps a failed connector chunk from blanking the whole wallet screen. */
class ConnectBoundary extends Component<
  { children: ReactNode; fallback: (retry: () => void) => ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("TonConnect failed to load", error);
  }
  override render() {
    if (this.state.failed) return this.props.fallback(() => this.setState({ failed: false }));
    return this.props.children;
  }
}

export function WalletPanel() {
  const t = useT();
  const [data, setData] = useState<WalletSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("1");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const lastGram = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isTelegram()) return;
    try {
      const res = await getWallet({ data: { initData: initData() } });
      setData(res);
      setLoadError(null);
      setGram(res.gram);
      if (lastGram.current !== null && res.gram > lastGram.current) {
        setMessage(`+${(res.gram - lastGram.current).toFixed(2)} GRAM`);
      }
      lastGram.current = res.gram;
      setWithdrawTo((prev) => prev || res.tonAddress || "");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("wallet.loadFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  const onAddress = useCallback((address: string) => {
    setWithdrawTo((prev) => prev || address);
    if (isTelegram()) {
      void saveTonAddress({ data: { initData: initData(), address } }).catch(() => undefined);
    }
  }, []);

  const withdraw = async () => {
    if (!data) return;
    const amount = Number(String(withdrawAmount).replace(",", ".").trim());
    const address = withdrawTo.trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(`Min ${data.minWithdraw} GRAM`);
      return;
    }
    if (amount < data.minWithdraw - 1e-9) {
      setError(`Min ${data.minWithdraw} GRAM`);
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
      setMessage(`${res.net.toFixed(2)} GRAM →`);
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
      <div className="mx-4 space-y-3 py-12 text-center text-sm text-dim">
        {loadError ? (
          <>
            <p>{t("wallet.loadError")}</p>
            <p className="font-mono text-[11px] text-dim/80">{loadError}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 rounded-2xl bg-dark px-5 py-3 text-sm font-bold text-white"
            >
              {t("wallet.retry")}
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> {t("wallet.loading")}
          </span>
        )}
      </div>
    );
  }

  const net = Number(withdrawAmount) > 0 ? Number(withdrawAmount) * (1 - data.feeRate) : 0;

  return (
    <div className="space-y-4 px-4 pb-6">
      <section className="soft-card rounded-3xl p-5">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
          {t("wallet.balance")}
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="font-display text-4xl font-extrabold text-ink">
            {data.gram.toFixed(2)}
          </span>
          <span className="pb-1.5 text-sm font-bold text-gram">GRAM</span>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl bg-emerald-500/12 px-4 py-3 text-[12px] font-semibold text-emerald-600">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-rose-500/12 px-4 py-3 text-[12px] font-semibold text-rose-600">
          {error}
        </div>
      )}

      <section className="soft-card space-y-3 rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-extrabold text-ink">
          <ArrowDownToLine className="size-4 text-sky-500" /> {t("wallet.deposit")}
        </h2>
        <p className="text-[12px] leading-relaxed text-dim">{t("wallet.depositNote")}</p>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="soft-card w-full rounded-2xl px-3.5 py-3 text-sm font-bold text-ink outline-none"
            placeholder="1.0"
          />
          <span className="shrink-0 text-sm font-bold text-gram">GRAM</span>
        </div>
        <div className="flex gap-2">
          {[1, 5, 10, 25].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDepositAmount(String(preset))}
              className="soft-card flex-1 rounded-xl py-2 text-[12px] font-bold text-ink"
            >
              {preset}
            </button>
          ))}
        </div>
        {showConnect ? (
          <ConnectBoundary
            fallback={(retry) => (
              <div className="space-y-2 rounded-2xl bg-rose-500/12 px-4 py-3 text-[12px] font-semibold text-rose-600">
                <p>{t("wallet.connectFailed")}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-xl bg-dark px-4 py-2 text-[12px] font-bold text-white"
                >
                  {t("wallet.retry")}
                </button>
              </div>
            )}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-dim">
                  <Loader2 className="size-4 animate-spin" /> {t("wallet.loading")}
                </div>
              }
            >
              <TonConnectSection
                depositAddress={data.depositAddress}
                memo={data.memo}
                amount={Math.max(Number(depositAmount) || 0, data.minDeposit)}
                onAddress={onAddress}
                onSent={() => {
                  setMessage(t("wallet.sent"));
                  setTimeout(() => void refresh(), 8000);
                }}
                onError={setError}
              />
            </Suspense>
          </ConnectBoundary>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowConnect(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
            >
              <Wallet className="size-4" />
              {t("wallet.connectPay")}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-dim">
              {t("wallet.connectHint")}
            </p>
          </div>
        )}
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
          {busy && <Loader2 className="size-4 animate-spin" />} {t("wallet.withdraw")}
        </button>
      </section>

      <section className="soft-card space-y-2 rounded-3xl p-5">
        <h2 className="font-display text-[15px] font-extrabold text-ink">{t("wallet.history")}</h2>
        {data.deposits.length === 0 && data.withdrawals.length === 0 && (
          <p className="text-[12px] text-dim">{t("wallet.noMoves")}</p>
        )}
        {data.deposits.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between border-b border-black/5 py-2 last:border-0"
          >
            <span className="text-[12px] font-semibold text-dim">
              {t("wallet.deposit")} · {new Date(d.at).toLocaleDateString()}
            </span>
            <span className="text-[13px] font-bold text-emerald-600">+{d.amount.toFixed(2)}</span>
          </div>
        ))}
        {data.withdrawals.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between border-b border-black/5 py-2 last:border-0"
          >
            <span className="text-[12px] font-semibold text-dim">
              {t("wallet.withdraw")} · {w.status} · {new Date(w.at).toLocaleDateString()}
            </span>
            <span className="text-[13px] font-bold text-rose-600">-{w.amount.toFixed(2)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
