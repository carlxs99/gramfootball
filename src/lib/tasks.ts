import { CARDS_BY_ID } from "./creatures";
import { collectionStats, playerLevel, type PlayerState } from "./store";

export type TaskGroup = "starter" | "collector" | "economy" | "social";

export type TaskDef = {
  id: string;
  group: TaskGroup;
  title: string;
  detail: string;
  reward: number;
  goal: number;
  progress: (p: PlayerState) => number;
};

export const TASK_GROUP_LABEL: Record<TaskGroup, string> = {
  starter: "Getting started",
  collector: "Collector",
  economy: "Economy",
  social: "Social",
};

const legendaryOwned = (p: PlayerState) =>
  Object.keys(p.owned).filter((id) => CARDS_BY_ID[id]?.rarity === "legendary").length;

export const TASKS: TaskDef[] = [
  {
    id: "first-pack",
    group: "starter",
    title: "Open your first pack",
    detail: "Rip a pack in the shop.",
    reward: 0.5,
    goal: 1,
    progress: (p) => p.packsOpened,
  },
  {
    id: "first-claim",
    group: "starter",
    title: "Claim your first yield",
    detail: "Collect the GRAM your cards produced.",
    reward: 0.5,
    goal: 1,
    progress: (p) => (p.totalEarned > 0 ? 1 : 0),
  },
  {
    id: "ten-cards",
    group: "starter",
    title: "Own 10 different cards",
    detail: "Grow your album to 10 unique cards.",
    reward: 1,
    goal: 10,
    progress: (p) => collectionStats(p.owned).found,
  },
  {
    id: "packs-10",
    group: "collector",
    title: "Open 10 packs",
    detail: "Any pack tier counts.",
    reward: 2,
    goal: 10,
    progress: (p) => p.packsOpened,
  },
  {
    id: "packs-50",
    group: "collector",
    title: "Open 50 packs",
    detail: "Serious collector territory.",
    reward: 10,
    goal: 50,
    progress: (p) => p.packsOpened,
  },
  {
    id: "cards-30",
    group: "collector",
    title: "Own 30 different cards",
    detail: "Fill a third of the album.",
    reward: 4,
    goal: 30,
    progress: (p) => collectionStats(p.owned).found,
  },
  {
    id: "legendary-1",
    group: "collector",
    title: "Pull a Legendary",
    detail: "Land one legendary card.",
    reward: 8,
    goal: 1,
    progress: legendaryOwned,
  },
  {
    id: "legendary-3",
    group: "collector",
    title: "Own 3 Legendaries",
    detail: "Build a legendary line-up.",
    reward: 20,
    goal: 3,
    progress: legendaryOwned,
  },
  {
    id: "album-50",
    group: "collector",
    title: "Complete 50% of the album",
    detail: "Half of every card discovered.",
    reward: 30,
    goal: 50,
    progress: (p) => collectionStats(p.owned).percent,
  },
  {
    id: "streak-7",
    group: "economy",
    title: "Reach a 7-day claim streak",
    detail: "Claim your yield 7 days in a row.",
    reward: 5,
    goal: 7,
    progress: (p) => p.streak,
  },
  {
    id: "mined-5",
    group: "economy",
    title: "Mine 5 GRAM",
    detail: "Total GRAM produced by your cards.",
    reward: 3,
    goal: 5,
    progress: (p) => p.totalEarned,
  },
  {
    id: "level-5",
    group: "economy",
    title: "Reach collector level 5",
    detail: "Earn XP by opening packs.",
    reward: 4,
    goal: 5,
    progress: (p) => playerLevel(p.xp),
  },
  {
    id: "invite-1",
    group: "social",
    title: "Invite your first friend",
    detail: "Share your referral link.",
    reward: 3,
    goal: 1,
    progress: (p) => p.referrals.l1,
  },
  {
    id: "invite-5",
    group: "social",
    title: "Invite 5 friends",
    detail: "Level 1 referrals joined.",
    reward: 15,
    goal: 5,
    progress: (p) => p.referrals.l1,
  },
  {
    id: "network-10",
    group: "social",
    title: "Build a 10-member network",
    detail: "Across all three referral levels.",
    reward: 25,
    goal: 10,
    progress: (p) => p.referrals.l1 + p.referrals.l2 + p.referrals.l3,
  },
];

export function taskState(task: TaskDef, player: PlayerState) {
  const value = Math.min(task.progress(player), task.goal);
  const done = value >= task.goal;
  const claimed = Boolean(player.tasksClaimed[task.id]);
  return { value, done, claimed, percent: Math.round((value / task.goal) * 100) };
}

export function tasksSummary(player: PlayerState) {
  let ready = 0;
  let claimed = 0;
  let pending = 0;
  for (const task of TASKS) {
    const s = taskState(task, player);
    if (s.claimed) claimed += 1;
    else if (s.done) {
      ready += 1;
      pending += task.reward;
    }
  }
  return { ready, claimed, pending, total: TASKS.length };
}
