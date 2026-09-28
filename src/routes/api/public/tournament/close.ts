import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Called hourly by pg_cron. Closes last week's referral tournament exactly
 * once (week row is the idempotency key), stores the winners with their
 * pre-rolled cards, delivers the prizes and notifies each winner. Every run
 * also retries any delivery that failed before.
 */
export const Route = createFileRoute("/api/public/tournament/close")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { weekStart, weekKeyOf, prizeFor } = await import("@/lib/tournament");
        const { weeklyStandings, rollPrizeCards, deliverResult } = await import(
          "@/lib/tournament.server"
        );
        const { notifyUser, announceTournamentWinners } = await import("@/lib/telegram.server");

        const thisWeek = weekStart();
        const prev = new Date(thisWeek.getTime() - 7 * 86400000);
        const key = weekKeyOf(prev);
        let closed = false;

        const { error: claimError } = await supabaseAdmin
          .from("referral_tournament_weeks" as any)
          .insert({ week_key: key });
        if (!claimError) {
          const standings = await weeklyStandings(supabaseAdmin, prev, thisWeek);
          const top = standings.slice(0, 10);
          const ids = top.map((s) => s.id);
          const { data: names } = ids.length
            ? await supabaseAdmin
                .from("players")
                .select("telegram_id, first_name, username")
                .in("telegram_id", ids)
            : { data: [] as any[] };
          const nameOf = new Map(
            (names ?? []).map((n: any) => [Number(n.telegram_id), n.first_name ?? n.username]),
          );
          const rows = top.map((s, i) => {
            const place = i + 1;
            const prize = prizeFor(place)!;
            return {
              week_key: key,
              place,
              telegram_id: s.id,
              name: nameOf.get(s.id) ?? null,
              referrals: s.referrals,
              prize: prize.kind === "pack" ? prize.packId : "bronze",
              cards: rollPrizeCards(place),
            };
          });
          if (rows.length) {
            const { error } = await supabaseAdmin
              .from("referral_tournament_results" as any)
              .insert(rows);
            if (error) console.error("tournament results insert failed", error.message);
          }
          closed = true;
        } else if (claimError.code !== "23505") {
          return Response.json({ ok: false, error: claimError.message }, { status: 500 });
        }

        // Deliver (or retry) every pending prize.
        const { data: pending } = await supabaseAdmin
          .from("referral_tournament_results" as any)
          .select("week_key, place, telegram_id, cards, prize")
          .eq("delivered", false)
          .limit(50);
        let delivered = 0;
        for (const r of (pending ?? []) as any[]) {
          try {
            await deliverResult(supabaseAdmin, {
              week_key: r.week_key,
              place: r.place,
              telegram_id: Number(r.telegram_id),
              cards: (r.cards ?? []) as string[],
            });
            await supabaseAdmin
              .from("referral_tournament_results" as any)
              .update({ delivered: true })
              .eq("week_key", r.week_key)
              .eq("place", r.place);
            delivered++;
            const prizeText =
              r.prize === "premium"
                ? "a League Pack"
                : r.prize === "rookie"
                  ? "an Academy Pack"
                  : r.prize === "basic"
                    ? "a Kick-Off Pack"
                    : "a Bronze card";
            await notifyUser(
              Number(r.telegram_id),
              `🏆 <b>Congratulations, champion!</b>\n\nYou finished <b>#${r.place}</b> in this week's Referral Cup and won ${prizeText}! 🎉\n\nYour prize is already in your album. A new tournament just started — keep inviting and go for the top!`,
            );
          } catch (e) {
            console.error("tournament delivery failed", r.week_key, r.place, e);
          }
        }

        // Announce the winners in the news channel exactly once per week.
        const { data: weekRow } = await supabaseAdmin
          .from("referral_tournament_weeks" as any)
          .select("announced_at")
          .eq("week_key", key)
          .maybeSingle();
        if (weekRow && !(weekRow as any).announced_at) {
          const { data: winners } = await supabaseAdmin
            .from("referral_tournament_results" as any)
            .select("place, name, telegram_id, referrals, prize")
            .eq("week_key", key)
            .order("place", { ascending: true })
            .limit(10);
          if (winners?.length) {
            const prizeTextOf = (p: string) =>
              p === "premium"
                ? "League Pack"
                : p === "rookie"
                  ? "Academy Pack"
                  : p === "basic"
                    ? "Kick-Off Pack"
                    : "Bronze card";
            await announceTournamentWinners(
              key,
              (winners as any[]).map((w) => ({
                place: w.place,
                name: w.name ?? `Player ${w.telegram_id}`,
                referrals: w.referrals,
                prize: prizeTextOf(w.prize),
              })),
            );
          }
          await supabaseAdmin
            .from("referral_tournament_weeks" as any)
            .update({ announced_at: new Date().toISOString() })
            .eq("week_key", key);
        }

        return Response.json({ ok: true, week: key, closed, delivered });
      },
    },
  },
});
