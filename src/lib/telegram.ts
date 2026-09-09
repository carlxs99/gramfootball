/** Client-side Telegram Mini App bridge. */

export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TgUser; start_param?: string };
  ready: () => void;
  expand: () => void;
  colorScheme?: string;
  HapticFeedback?: {
    impactOccurred: (s: string) => void;
    notificationOccurred: (t: string) => void;
  };
  openTelegramLink?: (url: string) => void;
  setHeaderColor?: (c: string) => void;
};

export function webApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null;
}

export function isTelegram() {
  const app = webApp();
  return Boolean(app && app.initData);
}

export function tgUser(): TgUser | null {
  return webApp()?.initDataUnsafe?.user ?? null;
}

export function initData() {
  return webApp()?.initData ?? "";
}

export function bootTelegram() {
  const app = webApp();
  if (!app) return;
  try {
    app.ready();
    app.expand();
  } catch {
    /* ignore */
  }
}

export function haptic(kind: "light" | "medium" | "heavy" = "light") {
  try {
    webApp()?.HapticFeedback?.impactOccurred(kind);
  } catch {
    /* ignore */
  }
}

/** Deep-link payload used for referrals (`?startapp=CODE`). */
export function startParam() {
  return webApp()?.initDataUnsafe?.start_param ?? "";
}
