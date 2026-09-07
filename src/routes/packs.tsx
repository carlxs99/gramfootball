import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OddsTable } from "@/components/OddsTable";
import { PackOpening } from "@/components/PackOpening";
import { rarityBorder, rarityGlow, rarityText, rarityWash } from "@/components/rarity";
import { PACKS, type Pack } from "@/lib/packs";
import { usePlayer } from "@/lib/store";

export const Route = createFileRoute("/packs")({
  head: () => ({
    meta: [
      { title: "Packs — Creature Packs" },
      {
        name: "description",
        content:
          "Five pack tiers from 0.5 to 10 GRAM, with full drop rates shown before every purchase.",
      },
      { property: "og:title", content: "Packs — Creature Packs" },
      {
        property: "og:description",
        content: "Five pack tiers priced in GRAM with transparent drop rates.",
      },
    ],
  }),
  component: PacksPage,
});

function PacksPage() {
  const player = usePlayer();
  const [confirming, setConfirming] = useState<Pack | null>(null);
  const [opening, setOpening] = useState<Pack | null>(null);

  const affordable = confirming ? player.gram >= confirming.price : false;

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-bold leading-none">Pack shop</h1>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
          Prices in GRAM · rolls resolved server-side
        </p>
      </div>

      <div className="space-y-4 px-5 pt-5">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`rounded-[20px] border bg-gradient-to-b to-panel p-4 ${rarityBorder[pack.tone]} ${rarityWash[pack.tone]} ${rarityGlow[pack.tone]}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className={`font-display text-lg font-bold ${rarityText[pack.tone]}`}>
                  {pack.name}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
                  {pack.cards} cards · {pack.tagline}
                </div>
              </div>
              <div className="chip rounded-full px-3 py-1 font-mono text-xs font-bold text-gram">
                {pack.price} GRAM
              </div>
            </div>
            <div className="mt-3">
              <OddsTable pack={pack} />
            </div>
            <button
              type="button"
              onClick={() => setConfirming(pack)}
              className="mt-3 w-full rounded-xl bg-gradient-to-b from-gram to-rare py-3 font-display text-sm font-bold uppercase tracking-widest text-void"
            >
              Buy pack
            </button>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[520px] items-end bg-black/70 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl border-t border-white/15 bg-panel p-5 pb-8 anim-rise">
            <div className="font-display text-lg font-bold">Confirm purchase</div>
            <dl className="mt-4 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-dim">Pack</dt>
                <dd>{confirming.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dim">Cards</dt>
                <dd>{confirming.cards}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dim">Price</dt>
                <dd className="text-gram">{confirming.price} GRAM</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dim">Balance</dt>
                <dd>{player.gram.toFixed(2)} GRAM</dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
                Drop rates per card
              </p>
              <OddsTable pack={confirming} />
            </div>
            <p className="mt-3 font-mono text-[9px] leading-relaxed text-dim">
              Payment runs on your GRAM balance. Telegram / on-chain checkout plugs in here later.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 rounded-xl border border-white/15 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-dim"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => {
                  const pack = confirming;
                  setConfirming(null);
                  setOpening(pack);
                }}
                className="flex-1 rounded-xl bg-gradient-to-b from-legendary to-mythic py-3.5 font-display text-sm font-bold uppercase tracking-widest text-void disabled:opacity-40"
              >
                {affordable ? "Pay & open" : "Low GRAM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {opening && <PackOpening pack={opening} onDone={() => setOpening(null)} />}
    </AppShell>
  );
}
