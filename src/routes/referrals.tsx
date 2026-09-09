import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Send, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatGram } from "@/lib/economy";
import { REFERRAL_RATES, applyReferralCode, referralTotals, usePlayer } from "@/lib/store";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — Creature Packs" },
      {
        name: "description",
        content:
          "Invite friends to Creature Packs and earn 10% of level 1 purchases, 5% of level 2 and 1% of level 3 — paid in GRAM.",
      },
      { property: "og:title", content: "Referrals — Creature Packs" },
      { property: "og:description", content: "Earn GRAM commissions from three referral levels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralsPage,
});

const LEVELS = [
  { key: "l1" as const, label: "Level 1", note: "Friends you invite directly" },
  { key: "l2" as const, label: "Level 2", note: "People invited by your level 1" },
  { key: "l3" as const, label: "Level 3", note: "People invited by your level 2" },
];

function ReferralsPage() {
  const player = usePlayer();
  const totals = referralTotals(player);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLink(`${window.location.origin}/?ref=${player.referralCode}`);
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) setCode(fromUrl.toUpperCase());
  }, [player.referralCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const submit = () => {
    const res = applyReferralCode(code);
    setMsg(res.ok ? "Invite code applied." : (res.error ?? "Something went wrong."));
  };

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">Network</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-none tracking-tight">Referrals</h1>
        <p className="mt-2 text-[11px] leading-snug text-dim">
          Earn a commission in GRAM on every deposit and pack purchase made by your network, three levels deep.
        </p>
      </div>

      {/* Earnings summary */}
      <section className="px-5 pt-4">
        <div className="soft-card grid grid-cols-2 gap-2 rounded-2xl p-4 text-center">
          <div>
            <div className="font-display text-2xl font-extrabold text-gram">{totals.earned.toFixed(2)}</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-dim">GRAM earned</div>
          </div>
          <div>
            <div className="font-display text-2xl font-extrabold">{totals.people}</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-dim">Network size</div>
          </div>
        </div>
      </section>

      {/* Invite link */}
      <section className="px-5 pt-4">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-dim">Your invite code</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="glossy-pill flex-1 truncate rounded-xl px-3 py-2.5 font-display text-base font-extrabold tracking-widest">
              {player.referralCode}
            </span>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy invite link"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-dark text-white transition-transform active:scale-95"
            >
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </div>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Collect creature packs with me and earn GRAM.")}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rare px-4 text-[11px] font-extrabold uppercase tracking-wider text-white transition-transform active:scale-[0.98]"
          >
            <Send size={14} aria-hidden="true" /> Share on Telegram
          </a>
          <p className="mt-2 break-all text-[9px] text-dim">{link}</p>
        </div>
      </section>

      {/* Commission levels */}
      <section className="px-5 pt-5">
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-dim">Commission levels</h2>
        <div className="mt-2 space-y-2">
          {LEVELS.map((lvl) => (
            <div key={lvl.key} className="soft-card flex items-center gap-3 rounded-2xl p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panel2 text-rare">
                <Users size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-extrabold">{lvl.label}</h3>
                  <span className="rounded-full bg-gram/15 px-2 py-0.5 text-[9px] font-extrabold text-gram">
                    {Math.round(REFERRAL_RATES[lvl.key] * 100)}%
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-dim">{lvl.note}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-sm font-extrabold">{player.referrals[lvl.key]}</div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-dim">
                  {formatGram(player.referralEarned[lvl.key])} G
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enter a code */}
      <section className="px-5 pt-5">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-dim">Were you invited?</p>
          {player.referredBy ? (
            <p className="mt-2 text-[11px] font-bold">
              Invited by <span className="text-rare">{player.referredBy}</span>
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="GR123456"
                  maxLength={8}
                  className="min-h-11 flex-1 rounded-xl border border-line bg-panel px-3 font-display text-sm font-extrabold tracking-widest outline-none focus:border-rare"
                />
                <button
                  type="button"
                  onClick={submit}
                  className="min-h-11 shrink-0 rounded-xl bg-dark px-4 text-[10px] font-extrabold uppercase tracking-wider text-white transition-transform active:scale-95"
                >
                  Apply
                </button>
              </div>
              {msg ? <p className="mt-2 text-[10px] text-dim">{msg}</p> : null}
            </>
          )}
        </div>
      </section>

      <p className="px-5 pt-4 text-[9px] leading-snug text-dim">
        Commissions are credited in GRAM as soon as a referral deposits or buys a pack. Payouts settle automatically
        once the Telegram/blockchain payment provider is connected.
      </p>
    </AppShell>
  );
}
