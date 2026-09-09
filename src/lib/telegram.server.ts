/** Server-only helpers for Telegram Mini App auth and Bot API calls. */

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates Telegram WebApp initData and returns the authenticated user.
 * Throws when the signature is missing, invalid or older than 24h.
 */
export async function verifyInitData(initData: string): Promise<TelegramUser> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("Telegram bot token is not configured");
  if (!initData) throw new Error("Missing Telegram session");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Invalid Telegram session");
  params.delete("hash");

  const checkString = [...params.entries()]
    .map(([k, v]) => [k, v] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = await hmac(enc.encode("WebAppData"), token);
  const signature = hex(await hmac(secret, checkString));
  if (signature !== hash) throw new Error("Invalid Telegram signature");

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) throw new Error("Telegram session expired");

  const raw = params.get("user");
  if (!raw) throw new Error("Missing Telegram user");
  return JSON.parse(raw) as TelegramUser;
}

/** Calls the Telegram Bot API with the configured bot token. */
export async function botApi(method: string, payload: Record<string, unknown>) {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("Telegram bot token is not configured");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!res.ok || !body.ok) {
    console.error(`Telegram ${method} failed [${res.status}]:`, body.description);
  }
  return body;
}

/** Sends a bot notification to a player. Never throws: notifications are best-effort. */
export async function notifyUser(telegramId: number, text: string) {
  try {
    await botApi("sendMessage", {
      chat_id: telegramId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Telegram notification failed", error);
  }
}
