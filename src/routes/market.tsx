import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Lock, ShoppingCart, Store, Tag, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CreatureSigil } from "@/components/CreatureSigil";
import { Button } from "@/components/ui/button";
import { initData } from "@/lib/telegram";
import { applyServerState, usePlayer } from "@/lib/store";
import { CARDS_BY_ID, RARITY_LABEL } from "@/lib/creatures";
import {
  marketAccess,
  marketBrowse,
  marketBuy,
  marketCancel,
  marketSell,
  MARKET_FEE,
  type Listing,
} from "@/lib/market.functions";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market — Trade creature cards | Monsters CCJ" },
      {
        name: "description",
        content:
          "Buy and sell Monsters CCJ creature cards with other collectors, paying in GRAM.",
      },
      { property: "og:title", content: "Market — Trade creature cards | Monsters CCJ" },
      {
        property: "og:description",
        content: "Buy and sell creature cards with other collectors, paying in GRAM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketPage,
});

type Tab = "browse" | "mine" | "sell";

function MarketPage() {
  const player = usePlayer();
  const [access, setAccess] = useState<{ open: boolean; admin: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>("browse");
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await marketBrowse({ data: { initData: initData() } });
    setListings(res.listings);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const init = initData();
      if (!init || init.length < 10) {
        setAccess({ open: false, admin: false });
        return;
      }
      try {
        const res = await marketAccess({ data: { initData: init } });
        if (!alive) return;
        setAccess(res);
        if (res.open) await refresh();
      } catch {
        if (alive) setAccess({ open: false, admin: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const mine = useMemo(() => listings.filter((l) => l.mine), [listings]);
  const others = useMemo(() => listings.filter((l) => !l.mine), [listings]);

  if (access === null) {
    return (
      <AppShell>
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-dim" />
        </div>
      </AppShell>
    );
  }

  if (!access.open) return <ComingSoon />;

  return (
    <AppShell>
      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <Store className="size-5 text-gram" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Market</h1>
          <span className="ml-auto rounded-full border border-line bg-panel px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-dim">
            Admin preview
          </span>
        </div>
        <p className="mt-1 text-[11px] text-dim">
          Trade cards with other collectors. The game keeps a{" "}
          {Math.round(MARKET_FEE * 100)}% fee on every sale.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-panel/70 p-1.5">
          {(
            [
              ["browse", "Browse"],
              ["mine", `My listings (${mine.length})`],
              ["sell", "Sell a card"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={tab === id ? "default" : "ghost"}
              onClick={() => setTab(id)}
              className="h-9 rounded-xl text-[9px] font-bold uppercase tracking-wider"
            >
              {label}
            </Button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-3 rounded-xl border border-gram/40 bg-gram/10 px-3 py-2 text-[11px] font-semibold text-gram">
            {notice}
          </div>
        )}
      </div>

      <div className="px-5 pb-32 pt-4">
        {tab === "browse" && (
          <ListingGrid
            listings={others}
            empty="No cards on sale right now."
            action={(l) => ({
              label: `Buy ${l.price} GRAM`,
              icon: ShoppingCart,
              disabled: player.gram < l.price,
              busy: busy === l.id,
              onClick: () =>
                run(l.id, async () => {
                  const res = await marketBuy({ data: { initData: initData(), id: l.id } });
                  applyServerState(res.state);
                  setNotice(`You bought ${CARDS_BY_ID[res.cardId]?.name ?? "a card"}!`);
                }),
            })}
          />
        )}

        {tab === "mine" && (
          <ListingGrid
            listings={mine}
            empty="You have no cards on sale."
            action={(l) => ({
              label: "Cancel",
              icon: X,
              disabled: false,
              busy: busy === l.id,
              onClick: () =>
                run(l.id, async () => {
                  const res = await marketCancel({ data: { initData: initData(), id: l.id } });
                  applyServerState(res.state);
                  setNotice("Listing cancelled, the card is back in your album.");
                }),
            })}
          />
        )}

        {tab === "sell" && (
          <SellPanel
            busy={busy}
            onSell={(cardId, price) =>
              run("sell", async () => {
                const res = await marketSell({
                  data: { initData: initData(), cardId, price },
                });
                applyServerState(res.state);
                setNotice("Card listed on the market.");
                setTab("mine");
              })
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function ListingGrid({
  listings,
  empty,
  action,
}: {
  listings: Listing[];
  empty: string;
  action: (l: Listing) => {
    label: string;
    icon: typeof ShoppingCart;
    disabled: boolean;
    busy: boolean;
    onClick: () => void;
  };
}) {
  if (!listings.length)
    return (
      <div className="rounded-2xl border border-line bg-panel/60 px-4 py-10 text-center text-[11px] font-semibold text-dim">
        {empty}
      </div>
    );

  return (
    <div className="grid grid-cols-2 gap-3">
      {listings.map((l) => {
        const card = CARDS_BY_ID[l.cardId];
        const a = action(l);
        const Icon = a.icon;
        return (
          <div
            key={l.id}
            className="overflow-hidden rounded-2xl border border-line bg-panel/70"
          >
            <div className="aspect-[0.78] w-full">
              {card ? <CreatureSigil creature={card} /> : null}
            </div>
            <div className="p-2.5">
              <div className="truncate font-display text-[12px] font-bold">
                {card?.name ?? l.cardId}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-dim">
                {card ? RARITY_LABEL[card.rarity] : ""} · {l.sellerName}
              </div>
              <Button
                type="button"
                onClick={a.onClick}
                disabled={a.disabled || a.busy}
                className="mt-2 h-9 w-full rounded-xl text-[10px] font-bold"
              >
                {a.busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <Icon className="size-3.5" />
                    {a.label}
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SellPanel({
  busy,
  onSell,
}: {
  busy: string | null;
  onSell: (cardId: string, price: number) => void;
}) {
  const player = usePlayer();
  const [cardId, setCardId] = useState<string | null>(null);
  const [price, setPrice] = useState("1");

  const owned = useMemo(
    () =>
      Object.entries(player.owned)
        .filter(([, e]) => e.qty > 0)
        .map(([id, e]) => ({ card: CARDS_BY_ID[id], qty: e.qty }))
        .filter((x) => Boolean(x.card)),
    [player.owned],
  );

  if (!owned.length)
    return (
      <div className="rounded-2xl border border-line bg-panel/60 px-4 py-10 text-center text-[11px] font-semibold text-dim">
        Open a pack first to get cards you can sell.
      </div>
    );

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {owned.map(({ card, qty }) => (
          <button
            key={card!.id}
            type="button"
            onClick={() => setCardId(card!.id)}
            className={`overflow-hidden rounded-2xl border bg-panel/70 text-left transition ${
              cardId === card!.id ? "border-gram" : "border-line"
            }`}
          >
            <div className="aspect-[0.78] w-full">
              <CreatureSigil creature={card!} />
            </div>
            <div className="px-2 py-1.5">
              <div className="truncate text-[10px] font-bold">{card!.name}</div>
              <div className="text-[9px] font-bold text-dim">x{qty}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-panel/70 p-3">
        <label className="text-[9px] font-bold uppercase tracking-widest text-dim">
          Price in GRAM
        </label>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-dark px-3 py-2 text-sm font-bold text-ink outline-none"
        />
        <p className="mt-1.5 text-[10px] text-dim">
          You receive {(Number(price || 0) * (1 - MARKET_FEE)).toFixed(4)} GRAM after the{" "}
          {Math.round(MARKET_FEE * 100)}% fee.
        </p>
        <Button
          type="button"
          disabled={!cardId || busy === "sell" || !(Number(price) > 0)}
          onClick={() => cardId && onSell(cardId, Number(price))}
          className="mt-3 h-11 w-full rounded-xl font-bold"
        >
          {busy === "sell" ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
          List card for sale
        </Button>
      </div>
    </div>
  );
}

function ComingSoon() {
  return (
    <AppShell>
      <div className="flex flex-col items-center px-6 pb-32 pt-16 text-center">
        <div className="grid size-20 place-items-center rounded-3xl border border-line bg-panel/70">
          <Lock className="size-8 text-gram" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">
          Market — Coming soon
        </h1>
        <p className="mt-2 max-w-[280px] text-[12px] leading-relaxed text-dim">
          Soon you will be able to buy and sell your creature cards with other collectors,
          paying in GRAM. Keep opening packs to be ready when it opens.
        </p>
      </div>
    </AppShell>
  );
}
