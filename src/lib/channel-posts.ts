/**
 * 100 rotating posts for the public news channel. One is published per week by
 * /api/public/broadcast/weekly, cycling forever (week N -> index N % 100).
 *
 * Two formats keep the channel alive:
 *  - "post": HTML message with an inline button that opens the Mini App.
 *  - "poll": native Telegram poll so members can tap and react.
 *
 * Telegram limits respected: poll question <= 300 chars, options <= 100 chars.
 */

export type ChannelPost =
  | { kind: "post"; text: string; button: string }
  | { kind: "poll"; question: string; options: string[] };

const p = (text: string, button = "\ud83c\udfae Play now"): ChannelPost => ({
  kind: "post",
  text,
  button,
});

const q = (question: string, options: string[]): ChannelPost => ({
  kind: "poll",
  question,
  options,
});

export const CHANNEL_POSTS: ChannelPost[] = [
  // ---------- Packs & openings ----------
  p(
    "\ud83c\udccf <b>Pack Monday</b>\n\nEvery pack holds 5 players — and a real shot at a Legendary.\nYour collection is only one rip away from its next power spike.\n\nWhat will you pull today?",
    "\ud83c\udccf Open a pack",
  ),
  p(
    "\u2728 <b>Rarity ladder</b>\n\nCommon \u2192 Rare \u2192 Epic \u2192 Mythic \u2192 Legendary.\nEach step up multiplies the GRAM your player produces every hour.\n\nHow far up the ladder is your best card?",
  ),
  q("How many packs do you open in a normal week?", [
    "1-3, I take it slow",
    "4-10, steady grind",
    "10+, pack addict",
    "I'm saving my GRAM",
  ]),
  p(
    "\ud83d\udd25 <b>Pull of the week</b>\n\nSomeone out there just hit a Legendary on their first pack of the day.\nIt could be you in about 20 seconds.\n\nTap in and find out.",
    "\ud83c\udccf Try your luck",
  ),
  p(
    "\ud83e\uddea <b>Did you know?</b>\n\nDuplicates are never wasted. Every extra copy levels the player up, and higher levels mine more GRAM per hour.\n\nKeep pulling — the doubles are the engine.",
  ),
  q("Your best pull so far?", ["A Legendary", "A Mythic", "An Epic", "Still hunting"]),
  p(
    "\ud83c\udf1f <b>Collector check</b>\n\n170 players. 35 coaches. 205 cards total.\nNobody completes the album by accident.\n\nHow many are still missing from yours?",
    "\ud83d\udcd6 Check my album",
  ),
  p(
    "\u26a1 <b>Two-minute routine</b>\n\n1. Claim your produced GRAM\n2. Open a pack\n3. Check the leaderboard\n\nThat's it. Do it daily and your production snowballs.",
    "\u26a1 Do it now",
  ),

  // ---------- Mining & economy ----------
  p(
    "\u23f0 <b>Your vault is filling</b>\n\nYour players mine GRAM around the clock, but the vault has a ceiling.\nLet it overflow and you're leaving coins on the table.\n\nClaim, then go again.",
    "\ud83d\udcb0 Claim GRAM",
  ),
  p(
    "\ud83d\udcc8 <b>Production 101</b>\n\nMore cards = more GRAM per hour.\nHigher rarity = much more GRAM per hour.\nHigher level = more again.\n\nEvery pack you open makes the next hour richer.",
  ),
  q("What do you spend most of your GRAM on?", [
    "Packs, always packs",
    "New signings",
    "Saving to withdraw",
    "The market",
  ]),
  p(
    "\ud83d\udd0b <b>Idle, not inactive</b>\n\nYou don't need to stare at the screen. Your players keep working while you sleep, work or scroll.\nAll you have to do is show up and collect.",
    "\ud83d\udcb0 Collect",
  ),
  p(
    "\ud83e\uddee <b>Compounding</b>\n\nToday's claim buys tomorrow's pack.\nTomorrow's pack raises next week's hourly rate.\n\nSmall daily loops beat one big session. Every time.",
  ),
  q("How often do you claim your GRAM?", [
    "Several times a day",
    "Once a day",
    "A couple of times a week",
    "When I remember...",
  ]),
  p(
    "\ud83c\udfaf <b>Weekly goal idea</b>\n\nPick one: +5 new players, +1 Epic, or double your hourly production.\nSet it Monday, check it Sunday.\n\nGoals turn a game into a streak.",
  ),

  // ---------- Market ----------
  p(
    "\u26a1 <b>Your lineup is your income</b>\n\nThe cards in your squad decide how much GRAM you produce every hour.\nBench a Bronze, start a Legend, watch the rate jump.\n\nWhen did you last review your lineup?",
    "\u26a1 Check my squad",
  ),
  p(
    "\ud83e\udde0 <b>Scouting tip</b>\n\nRating isn't everything: pace, passing and defending all feed the card's output.\nA balanced squad out-produces two superstars and nine rookies.\n\nRebuild and compare.",
    "\ud83d\udcd6 My squad",
  ),
  q("Your squad style?", [
    "All-out attack",
    "Solid defence",
    "Balanced eleven",
    "Highest ratings only",
  ]),
  p(
    "\ud83c\udfc6 <b>Spend like a sporting director</b>\n\nEvery GRAM you claim can become a new signing.\nSign the cards that pay for themselves, not the prettiest badge.\n\nDo the math before you buy.",
    "\ud83c\udfea Go shopping",
  ),
  p(
    "\ud83d\udee1\ufe0f <b>Nobody can rug you</b>\n\nBalances, pulls and trades are all settled by the server, never by your phone. A cancelled listing returns your card instantly.\n\nFair game, always.",
  ),
  q("How much GRAM do you keep in reserve?", ["None, always signing", "A little", "Half of it", "I save everything"]),

  // ---------- Market ----------
  p(
    "\ud83c\udfea <b>The Market is live</b>\n\nSell your spare cards for GRAM, or swap them with other collectors.\nThat duplicate gathering dust might be exactly what someone else is missing.\n\nList it and find out.",
    "\ud83c\udfea Open the Market",
  ),
  p(
    "\ud83d\udd04 <b>Swaps, not just sales</b>\n\nOffer a card, ask for a specific one — or for any card of the same rarity.\nThe first valid offer closes the deal instantly, both sides at once.\n\nNo scams possible.",
    "\ud83d\udd04 Start a swap",
  ),
  q("What do you use the Market for?", [
    "Selling duplicates",
    "Hunting missing cards",
    "Swapping with collectors",
    "Just browsing prices",
  ]),
  p(
    "\ud83d\udcb8 <b>Market rules in 10 seconds</b>\n\n\u2022 Each rarity has a price floor and ceiling\n\u2022 The game keeps a 3% fee on sales\n\u2022 Unsold listings return to you after 7 days\n\nSimple, safe, server-checked.",
    "\ud83c\udfea Browse listings",
  ),
  p(
    "\ud83d\udd0e <b>Bargain hunt</b>\n\nSort the Market by cheapest and scan the Epics.\nSomeone always undersells a card that produces more than it costs.\n\nThat's free production sitting there.",
    "\ud83d\udd0e Hunt deals",
  ),
  q("Would you sell your last copy of a card?", [
    "Never, collection first",
    "If the price is right",
    "Only duplicates",
    "I sell everything",
  ]),

  // ---------- Referrals ----------
  p(
    "\ud83d\udc65 <b>Bring a friend, earn forever</b>\n\nYou get a cut of what your invites earn — across three levels.\nOne good invite can out-earn a week of grinding.\n\nGrab your link in the app.",
    "\ud83d\udc65 Get my link",
  ),
  p(
    "\ud83c\udf10 <b>Three levels deep</b>\n\nYour friends, their friends, and theirs again — all feed your commissions.\nBuild a network once, collect from it for months.\n\nWho are you inviting today?",
    "\ud83d\udc65 Invite friends",
  ),
  q("How many friends have you invited?", ["None yet", "1-3", "4-10", "10+ — I'm recruiting"]),
  p(
    "\ud83d\udce3 <b>Where to share</b>\n\nCrypto groups, gaming chats, your own story.\nOne link, posted in the right place, can bring a dozen players by tomorrow.\n\nYour link is in the app.",
    "\ud83d\udd17 Copy my link",
  ),

  // ---------- Tasks & streaks ----------
  p(
    "\u2705 <b>Free GRAM you forgot about</b>\n\nThe Tasks page pays for things you already do: opening packs, collecting cards, hitting levels, inviting friends.\n\nGo sweep the ones you've already completed.",
    "\u2705 Check my tasks",
  ),
  p(
    "\ud83d\udd25 <b>Streak power</b>\n\nSeven days in a row pays a bonus — and builds the habit that actually grows a collection.\n\nDon't break the chain today.",
    "\ud83d\udd25 Keep my streak",
  ),
  q("Longest daily streak you've hit?", ["1-2 days", "3-6 days", "7-14 days", "15+ days"]),
  p(
    "\ud83c\udf81 <b>Milestone rewards</b>\n\n10 cards. 30 cards. 50% album. First Legendary.\nEach one drops GRAM straight into your balance.\n\nHow many can you tick off this week?",
    "\ud83c\udfaf See milestones",
  ),

  // ---------- Wallet & TON ----------
  p(
    "\ud83d\udcb3 <b>Wallet, explained</b>\n\nConnect TON, deposit to boost your run, and withdraw your GRAM when you want it.\nEvery movement is listed in your history, newest first.\n\nFull transparency.",
    "\ud83d\udcb3 Open wallet",
  ),
  p(
    "\ud83e\uddfe <b>Payout proof</b>\n\nEvery completed withdrawal is announced publicly in our payouts channel.\nNo screenshots, no promises — just on-chain receipts.\n\n\ud83d\udc49 @playerspayouts",
    "\ud83d\udcb3 My wallet",
  ),
  q("What matters most to you in a Telegram game?", [
    "Real payouts",
    "Fun collecting",
    "Competition",
    "Community",
  ]),
  p(
    "\u2699\ufe0f <b>Deposits are instant-ish</b>\n\nSend with your personal memo tag and the system credits you automatically within minutes.\nNo tickets, no waiting on a human.\n\nYour tag is in the wallet.",
    "\ud83d\udcb3 Open wallet",
  ),

  // ---------- Leaderboard ----------
  p(
    "\ud83c\udfc5 <b>Top 100</b>\n\nThe leaderboard ranks every active player by collection power.\nMost people never check where they stand.\n\nYou might be closer to the top than you think.",
    "\ud83c\udfc5 See my rank",
  ),
  p(
    "\ud83d\udcca <b>Climbing is simple</b>\n\nRarity beats quantity. One Mythic can be worth a fistful of Commons.\nStack levels, chase rarities, watch your rank move.\n\nWhere are you this week?",
    "\ud83c\udfc5 Check ranking",
  ),
  q("What's your leaderboard position?", ["Top 10", "Top 100", "Outside the top 100", "No idea"]),

  // ---------- Players & lore ----------
  p(
    "\u26bd <b>170 players, zero copies</b>\n\nEvery footballer in this game is original art, drawn for this league alone.\nNo borrowed franchises. No reskins.\n\nOwn something that exists nowhere else.",
    "\ud83d\udcd6 See the album",
  ),
  q("Which position do you collect hardest?", [
    "Strikers",
    "Midfielders",
    "Defenders",
    "Goalkeepers",
  ]),
  p(
    "\ud83e\uddd1\u200d\ud83d\ude80 <b>Coaches matter</b>\n\n35 coaches sit alongside your players and push your whole operation forward.\nMost players forget them and wonder why their rate stalls.\n\nCheck your coaching staff.",
    "\ud83d\udcd6 My collection",
  ),
  p(
    "\ud83c\udf0b <b>Legendary lore</b>\n\nThe rarest players don't just look better — they carry the highest producing output in the game.\nOne changes your entire curve.\n\nStill hunting yours?",
    "\ud83c\udccf Hunt a Legendary",
  ),
  q("Pick your dream squad", [
    "Three Legendaries",
    "Balanced Epics",
    "My first signing, forever",
    "Whoever produces most",
  ]),

  // ---------- Tips ----------
  p(
    "\ud83d\udca1 <b>Tip: claim before you buy</b>\n\nCollect your produced GRAM first, then spend.\nHalf the players buy packs while their vault sits full.\n\nFree coins, every single time.",
    "\ud83d\udcb0 Claim first",
  ),
  p(
    "\ud83d\udca1 <b>Tip: duplicates are upgrades</b>\n\nDon't groan at a repeat pull. It levels the card, and levels are permanent production.\n\nThe grind is supposed to repeat.",
  ),
  p(
    "\ud83d\udca1 <b>Tip: check tasks after every session</b>\n\nMost tasks complete themselves while you play. They just need one tap to be claimed.\n\nGo collect what you've already earned.",
    "\u2705 Claim tasks",
  ),
  p(
    "\ud83d\udca1 <b>Tip: your language, your app</b>\n\nThe whole game speaks English, Spanish, Russian, Arabic, Hindi and Portuguese.\nSwitch it in your profile in two taps.\n\nPlay in your own words.",
    "\u2699\ufe0f Open profile",
  ),
  q("Which language do you play in?", ["English", "Spanish", "Russian", "Another one"]),
  p(
    "\ud83d\udca1 <b>Tip: don't sleep on Epics</b>\n\nLegendaries are the dream, but a wall of Epics out-mines a lonely Legendary every day of the week.\n\nDepth wins the long game.",
  ),

  // ---------- Community & engagement ----------
  p(
    "\ud83d\udde3\ufe0f <b>Your turn</b>\n\nWhat's the one feature you want next? Drop it in the comments — we read everything posted here.\n\nThis roadmap is built by players.",
    "\ud83c\udfae Play now",
  ),
  q("What should we build next?", [
    "Clubs and team play",
    "Seasonal events",
    "Player upgrades",
    "Seasonal leagues",
  ]),
  p(
    "\ud83d\udcc5 <b>Weekly check-in</b>\n\nNew week, clean slate.\nClaim, open one pack, check the Market.\nThree actions, five minutes, real progress.\n\nGo.",
    "\ud83c\udfae Start the week",
  ),
  q("How long have you been playing?", [
    "Just joined",
    "A few weeks",
    "A few months",
    "Since the beginning",
  ]),
  p(
    "\ud83c\udf89 <b>Thanks for being here</b>\n\nThis community is what keeps the packs printing and the Market busy.\nInvite one friend this week and the whole thing gets louder.\n\nLet's grow it.",
    "\ud83d\udc65 Invite a friend",
  ),

  // ---------- Rotation two: variety and repeats with new angles ----------
  p(
    "\ud83c\udf19 <b>Night shift</b>\n\nYour players don't clock out. Whatever you claim tomorrow morning was produced while you slept.\n\nOpen one pack before bed and wake up richer.",
    "\ud83c\udccf One more pack",
  ),
  q("When do you usually play?", ["Morning coffee", "Lunch break", "Evening", "Late night"]),
  p(
    "\ud83d\udd2e <b>Pull prediction</b>\n\nOpen three packs right now. Comment what you got.\nSomebody in this channel is about to hit a Mythic.\n\nMight as well be you.",
    "\ud83c\udccf Open three",
  ),
  p(
    "\ud83d\udcc9 <b>Stalled out?</b>\n\nIf your GRAM per hour hasn't moved in a week, you're claiming but not reinvesting.\nOne pack a day fixes it fast.\n\nBreak the plateau.",
    "\ud83c\udccf Reinvest",
  ),
  q("What stops you from playing more?", [
    "Nothing, I'm hooked",
    "Not enough GRAM",
    "I forget to open it",
    "Waiting for new features",
  ]),
  p(
    "\ud83d\udd14 <b>Pin us</b>\n\nPin the bot chat so your daily claim is always one tap away.\nThe players with the biggest balances are just the ones who never miss a day.\n\nSmall habit, big stack.",
    "\ud83d\udcb0 Claim today",
  ),
  p(
    "\ud83e\udd1d <b>Trade night</b>\n\nPost the card you're hunting in the comments.\nSomeone here has a spare and would swap it for the one you're sitting on.\n\nThe Market does the rest.",
    "\ud83d\udd04 Open swaps",
  ),
  q("Rarest card in your album?", ["Legendary", "Mythic", "Epic", "Rare or below"]),
  p(
    "\u26a1 <b>Speedrun challenge</b>\n\nFrom zero to 10 players — how fast can you get there?\nPost your time and let's see who's the quickest collector in the channel.",
    "\u26a1 Start the run",
  ),
  p(
    "\ud83d\udd10 <b>Built to be fair</b>\n\nBalances, pulls and trades are all decided by the server, never by your phone.\nNothing can be faked from the client side.\n\nPlay knowing the odds are real.",
  ),
  q("Which part of the game is your favourite?", [
    "Opening packs",
    "Building my squad",
    "The Market",
    "Watching GRAM tick up",
  ]),
  p(
    "\ud83d\udcbc <b>Flip economics</b>\n\nBuy a duplicate cheap, level your player, mine more per hour.\nThe Market isn't just trading cards — it's buying production.\n\nDo the math and go shopping.",
    "\ud83c\udfea Go shopping",
  ),
  p(
    "\ud83c\udfaf <b>Album completion</b>\n\nHitting 50% of the album pays one of the biggest bonuses in the game.\nEvery pack pushes that percentage up.\n\nHow close are you?",
    "\ud83d\udcd6 Check progress",
  ),
  q("Album completion right now?", ["Under 25%", "25-50%", "50-75%", "Over 75%"]),
  p(
    "\ud83e\udd47 <b>Rank challenge</b>\n\nGoal for this week: climb 10 positions on the leaderboard.\nTwo packs a day and one smart signing usually does it.\n\nScreenshot your before and after.",
    "\ud83c\udfc5 See my rank",
  ),
  p(
    "\ud83d\udd0d <b>Hidden detail</b>\n\nEvery player card shows its exact hourly output. Compare two before you level one up.\nThe smart play is usually not the prettiest card.",
    "\ud83d\udcd6 Compare cards",
  ),
  q("Do you plan your upgrades or go by vibes?", [
    "Pure spreadsheet",
    "Mostly planned",
    "Vibes, always",
    "What upgrades?",
  ]),
  p(
    "\ud83c\udf0d <b>Global table</b>\n\nPlayers from dozens of countries are producing GRAM in this app right now, in six languages.\nYour rivals never sleep — because somewhere it's always morning.",
    "\ud83c\udfc5 Join the race",
  ),
  p(
    "\ud83d\udcb0 <b>Cash-out day</b>\n\nWithdrawals go straight to your TON wallet and get posted publicly when they land.\nEarn it, claim it, take it out.\n\nThat's the whole loop.",
    "\ud83d\udcb3 Withdraw",
  ),
  q("What would you do with your first payout?", [
    "Reinvest in packs",
    "Cash it out",
    "Half and half",
    "Still grinding toward it",
  ]),
  p(
    "\ud83e\udde9 <b>Weekend project</b>\n\nPick one rarity and try to complete it. Commons are cheap, Epics are satisfying, Legendaries are a lifetime goal.\n\nChoose your obsession.",
    "\ud83d\udcd6 Pick a target",
  ),
  p(
    "\ud83d\udd25 <b>Transfer night</b>\n\nPick one position and upgrade it tonight.\nPost what you signed in the comments.\n\nBragging rights are free.",
    "\ud83c\udfea Open the Market",
  ),
  q("Best signing you have made so far?", [
    "A Legend",
    "An Icon",
    "A cheap Gold bargain",
    "Still hunting",
  ]),
  p(
    "\ud83d\udce6 <b>Restock</b>\n\nYour GRAM does nothing sitting still. Packs turn it into permanent hourly income.\nIdle coins are the only real loss in this game.\n\nPut it to work.",
    "\ud83c\udccf Open packs",
  ),
  p(
    "\ud83c\udfad <b>Coach spotlight</b>\n\nCoaches are the rarest slice of the collection — only 35 exist.\nA full coaching staff is the flex nobody in this channel has finished yet.\n\nWho's closest?",
    "\ud83d\udcd6 My coaches",
  ),
  q("How many coaches do you own?", ["0-3", "4-9", "10-17", "18+"]),
  p(
    "\ud83e\uddf2 <b>Magnet strategy</b>\n\nInvite three friends, help them open their first pack, and your commissions run on autopilot while they play.\n\nTeaching pays better than grinding.",
    "\ud83d\udc65 Invite three",
  ),
  p(
    "\ud83d\udcdd <b>Feedback wanted</b>\n\nSomething feel off? Too slow, too expensive, too easy?\nTell us in the comments. Balance changes in this game come from player complaints.",
    "\ud83c\udfae Play now",
  ),
  q("Is the pack price fair?", ["Too cheap", "About right", "A bit high", "Way too high"]),
  p(
    "\ud83c\udf20 <b>Lucky streak</b>\n\nEvery pack is an independent roll — but nobody ever pulled a Legendary from a pack they didn't open.\n\nVariance rewards volume.",
    "\ud83c\udccf Roll again",
  ),
  p(
    "\ud83c\udfdb\ufe0f <b>Long game</b>\n\nThe players at the top didn't get lucky once. They showed up 60 days in a row.\nConsistency is the real meta.\n\nDay one starts today.",
    "\ud83d\udcb0 Start today",
  ),
  
  p(
    "\ud83d\udd01 <b>Swap logic</b>\n\nSwaps only happen between cards of the same rarity, decided by the server, both sides at the same instant.\nNobody can vanish with your card.\n\nTrade with confidence.",
    "\ud83d\udd04 Open swaps",
  ),
  p(
    "\ud83d\udcf1 <b>Built for your phone</b>\n\nNo downloads, no store, no updates. The whole game lives inside Telegram and opens in a second.\n\nShare it with someone who hates installing apps.",
    "\ud83c\udfae Open the app",
  ),
  q("Would you recommend this game to a friend?", [
    "Already did",
    "Yes, definitely",
    "Maybe",
    "Not yet",
  ]),
  p(
    "\ud83c\udfaf <b>Three-tap check-in</b>\n\nClaim. Pack. Task.\nThat's the whole daily loop and it takes less time than reading this post.\n\nGo.",
    "\u26a1 Do the loop",
  ),
  p(
    "\ud83d\udca5 <b>Underdog energy</b>\n\nA well-built squad of Golds out-produces a half-finished wall of Icons.\nDepth beats hype.",
    "\ud83d\udcd6 Build it",
  ),
  q("Most satisfying moment in the game?", [
    "Legendary pull",
    "A bargain signing",
    "First withdrawal",
    "Completing a rarity",
  ]),
  p(
    "\ud83d\udcca <b>Know your numbers</b>\n\nYour profile shows level, collection count, hourly production, balance and activity in one screen.\nRead it once a week and play smarter.",
    "\ud83d\udc64 Open profile",
  ),
  p(
    "\ud83c\udf81 <b>Small wins add up</b>\n\n0.05 here, 0.1 there. Tasks look tiny until you stack a dozen of them into a free pack.\n\nGo sweep the board.",
    "\u2705 Sweep tasks",
  ),
  q("What's your GRAM balance like right now?", [
    "Empty, spent it all",
    "Saving up",
    "Comfortable",
    "Loaded",
  ]),
  p(
    "\ud83d\ude80 <b>New week, new pull</b>\n\nSomewhere in the next 5 packs is a card that changes your production for good.\nThe only way to find it is to open them.\n\nLet's go.",
    "\ud83c\udccf Open packs",
  ),
  p(
    "\ud83e\udde1 <b>See you in there</b>\n\nClaim your GRAM, check the Market, sign one player.\nThe world runs whether you show up or not — but it pays better when you do.",
    "\ud83c\udfae Play now",
  ),
];

/** The post published in a given ISO week index (cycles forever). */
export function postForWeek(weekIndex: number): ChannelPost {
  const list = CHANNEL_POSTS;
  const i = ((weekIndex % list.length) + list.length) % list.length;
  return list[i]!;
}

/** ISO-ish week key, e.g. "2026-W37", plus a monotonic week number. */
export function weekKey(date = new Date()): { key: string; index: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  const index = Math.floor((d.getTime() - Date.UTC(1970, 0, 1)) / (7 * 86400000));
  return { key: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, index };
}
