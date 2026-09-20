import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { collectionScore, collectionStats, playerLevel, usePlayer } from "@/lib/store";
import { CARDS } from "@/lib/creatures";
import { useT } from "@/lib/i18n";
import { fetchLeaderboard } from "@/lib/player.functions";
import { showAdminEntry } from "@/lib/admin.functions";
import { initData } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gem,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
  collectionScore as scoreOf,
  collectionStats as statsOf,
  playerLevel as levelOf,
} from "@/lib/progress";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — GRAM Football" },
      {
        name: "description",
        content:
          "Top 100 collectors ranked by collection score, legendaries owned, total cards and player level.",
      },
      { property: "og:title", content: "Leaderboard — GRAM Football" },
      { property: "og:description", content: "Top 100 collectors of GRAM Football." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const CATEGORIES = [
  { id: "score", icon: BarChart3 },
  { id: "legendary", icon: Gem },
  { id: "creatures", icon: Users },
  { id: "level", icon: TrendingUp },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type Row = {
  id: number;
  name: string;
  score: number;
  legendary: number;
  creatures: number;
  level: number;
  photoUrl?: string | null;
};

/** Telegram profile photo with a styled initial as fallback. */
function Avatar({
  row,
  className,
  style,
}: {
  row: Row;
  className: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (row.photoUrl && !failed) {
    return (
      <img
        src={row.photoUrl}
        alt={row.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
        style={style}
      />
    );
  }
  return (
    <span className={`${className} grid place-items-center`} style={style}>
      {row.name.slice(0, 1)}
    </span>
  );
}

const PODIUM = [
  { place: 1, tone: "leaderboard-podium-first", delay: "0.08s" },
  { place: 2, tone: "leaderboard-podium-second", delay: "0s" },
  { place: 3, tone: "leaderboard-podium-third", delay: "0.16s" },
] as const;

function LeaderboardPage() {
  const t = useT();
  const player = usePlayer();
  const [category, setCategory] = useState<CategoryId>("score");
  const stats = collectionStats(player.owned);

  const [live, setLive] = useState<Row[]>([]);
  // The game administrator is kept out of the public ranking, including their
  // own device: the server already excludes them from the fetched rows.
  const [isAdmin, setIsAdmin] = useState(false);

  const myId = Number(String(player.playerId).replace(/^\D+/, "")) || 0;

  const you: Row = {
    id: myId,
    name: player.name,
    score: collectionScore(player.owned),
    legendary: stats.perRarity.legendary.found,
    creatures: stats.found,
    level: playerLevel(player.xp),
    photoUrl: live.find((r) => r.id === myId)?.photoUrl ?? null,
  };

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((players) => {
        if (cancelled) return;
        const mapped = players.map((p) => {
          const st = (p.state ?? {}) as {
            owned?: Record<string, { qty: number; level: number; xp: number }>;
            xp?: number;
          };
          const owned = st.owned ?? {};
          const s = statsOf(owned);
          return {
            id: p.id,
            name: p.name,
            score: scoreOf(owned),
            legendary: s.perRarity.legendary.found,
            creatures: s.found,
            level: levelOf(Number(st.xp ?? 0)),
            photoUrl: p.photoUrl ?? null,
          } as Row;
        });
        setLive(mapped.filter((r) => r.score > 0));
      })
      .catch(() => setLive([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const data = initData();
    if (!data) return;
    showAdminEntry({ data: { initData: data } })
      .then((result) => setIsAdmin(result.visible))
      .catch(() => setIsAdmin(false));
  }, []);

  const rows = useMemo(() => {
    const mine = live.filter((r) => r.id !== you.id);
    const all = isAdmin ? mine : [...mine, you];
    const key: Record<CategoryId, keyof Row> = {
      score: "score",
      legendary: "legendary",
      creatures: "creatures",
      level: "level",
    };
    const k = key[category];
    return all
      .sort(
        (a, b) =>
          (b[k] as number) - (a[k] as number) ||
          b.score - a.score ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    live,
    isAdmin,
    you.id,
    you.score,
    you.legendary,
    you.creatures,
    you.level,
    player.name,
  ]);

  const myRank = useMemo(() => rows.findIndex((r) => r.id === you.id) + 1, [rows, you.id]);

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [category]);
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const valueOf = (r: Row) =>
    category === "score"
      ? r.score.toLocaleString()
      : category === "legendary"
        ? `${r.legendary} LEG`
        : category === "creatures"
          ? `${r.creatures}/${CARDS.length}`
          : `LVL ${r.level}`;


  return (
    <AppShell>
      <header className="leaderboard-header px-5 pt-5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 bg-primary" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase leading-none text-foreground">
              {t("rank.title")}
            </h1>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("rank.sub")}
            </p>
          </div>
        </div>
      </header>

      <nav className="leaderboard-tabs mt-4 grid grid-cols-4 px-5" aria-label={t("rank.title")}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          const Icon = c.icon;
          return (
            <Button
              key={c.id}
              type="button"
              variant="ghost"
              onClick={() => setCategory(c.id)}
              className={`flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none border-b-2 px-1 font-display text-[10px] font-bold uppercase tracking-normal ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {t(`rank.${c.id}`)}
            </Button>
          );
        })}
      </nav>

      {/* Your position, hidden for the administrator account */}
      {!isAdmin && (
        <div className="leaderboard-own mx-5 mt-4 flex items-center gap-3 rounded-lg px-3 py-3">
          <span className="w-9 shrink-0 font-display text-base font-extrabold italic text-primary">
            {myRank > 0 ? `#${myRank}` : "—"}
          </span>
          <Avatar
            row={you}
            className="size-9 shrink-0 overflow-hidden rounded-full border border-primary/50 bg-secondary font-display text-xs font-bold text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
              {t("rank.yourRank")}
            </p>
            <p className="truncate text-xs font-semibold uppercase text-foreground">{you.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-base font-extrabold text-foreground">{valueOf(you)}</p>
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-primary">
              {t(`rank.${category}`)}
            </p>
          </div>
        </div>
      )}


      {myRank > 0 && Math.floor((myRank - 1) / PAGE_SIZE) !== current && (
        <div className="mt-2 px-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage(Math.floor((myRank - 1) / PAGE_SIZE))}
            className="w-full rounded-md border-primary/30 bg-primary/5 text-[10px] font-bold uppercase text-primary"
          >
            {t("rank.jumpToMe")}
          </Button>
        </div>
      )}

      {current === 0 && rows.length >= 3 && (

        <section className="leaderboard-podium mx-5 mt-6 px-3 pb-5 pt-7" aria-label="Top 3">
            <div className="flex items-end justify-center gap-2">
              {(
                [
                  { r: rows[1] as Row, rank: 1 },
                  { r: rows[0] as Row, rank: 0 },
                  { r: rows[2] as Row, rank: 2 },
                ] as const
              ).map(({ r, rank }) => {
                const meta = PODIUM[rank];
                const isYou = r.id === you.id;
                return (
                  <div
                    key={`${r.id}-${rank}`}
                    className={`anim-rise flex min-w-0 flex-1 flex-col items-center gap-1.5 ${meta.tone}`}
                    style={{ animationDelay: meta.delay }}
                  >
                    {rank === 0 ? <Crown className="mb-0.5 size-5 text-primary" aria-hidden="true" /> : <span className="h-6" />}
                    <div className="leaderboard-avatar-wrap relative">
                    <Avatar
                      row={r}
                      className={`shrink-0 overflow-hidden rounded-full bg-secondary font-display font-bold text-muted-foreground ${
                        rank === 0 ? "size-16 text-lg" : "size-12 text-sm"
                      }`}
                    />
                    <span className="leaderboard-place absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 font-display text-[10px] font-extrabold italic">
                      {meta.place}
                    </span>
                    </div>
                    <span className="mt-1 w-full truncate text-center text-[10px] font-semibold uppercase text-foreground">
                      {r.name}
                    </span>
                    <span className="font-display text-xs font-bold text-primary">{valueOf(r)}</span>
                    {isYou && (
                      <span className="text-[8px] font-bold uppercase text-primary">
                        {t("rank.you")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
        </section>
      )}

      <section className="mx-5 mt-4" aria-label={t("rank.title")}>
        <div className="leaderboard-table-head grid grid-cols-[2.25rem_1fr_auto] gap-2 border-b border-border px-2 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <span>POS</span><span>{t("rank.you").replace(/you/i, "Player")}</span><span>{t(`rank.${category}`)}</span>
        </div>
      <ol className="divide-y divide-border">
        {(current === 0 && rows.length >= 3 ? pageRows.slice(3) : pageRows).map((r, i) => {
          const rank =
            current * PAGE_SIZE + i + (current === 0 && rows.length >= 3 ? 3 : 0);
          const isYou = r.id === you.id;
          return (
            <li
              key={`${r.id}-${rank}`}
              className={`grid min-h-12 grid-cols-[2.25rem_2rem_1fr_auto] items-center gap-2 px-2 py-2.5 ${
                isYou
                  ? "leaderboard-row-you"
                  : "bg-background"
              }`}
            >
              <span className="font-display text-sm font-extrabold italic text-muted-foreground">{rank + 1}</span>
              <Avatar
                row={r}
                className="size-7 shrink-0 overflow-hidden rounded-full bg-secondary font-display text-[10px] font-bold text-muted-foreground"
              />
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {r.name}
                {isYou && (
                  <span className="ml-2 text-[8px] font-bold uppercase tracking-widest text-gram">
                    {t("rank.you")}
                  </span>
                )}
              </span>
              <span className="font-display text-xs font-bold text-primary">{valueOf(r)}</span>
            </li>
          );
        })}
        {rows.length <= 1 && (
          <li className="px-3 py-7 text-center text-[11px] font-semibold text-muted-foreground">
            <Trophy className="mx-auto mb-2 size-6 text-primary" aria-hidden="true" />{t("rank.empty")}
          </li>
        )}
      </ol>
      </section>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 px-5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={t("rank.prev")}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="rounded-md border-border bg-secondary text-muted-foreground"
          >
            <ChevronLeft />
          </Button>
          <span className="font-display text-xs font-bold text-dim">
            {current + 1}/{pageCount}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={t("rank.next")}
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            className="rounded-md border-primary/30 bg-primary/5 text-primary"
          >
            <ChevronRight />
          </Button>
        </div>
      )}

    </AppShell>
  );
}
