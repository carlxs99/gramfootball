/** Server-only TON blockchain helpers: deposit scanning and payouts. */

export const DEPOSIT_ADDRESS = "UQA43vCDTfG1gQkytR1IQUnU0P_E5Q6TNFsYR60dKJkROrSd";
export const WITHDRAW_FEE_RATE = 0.05;
export const MIN_WITHDRAW = 0.5;
/** Safety ceiling for a single automated payout. */
export const MAX_WITHDRAW = 500;
export const MIN_DEPOSIT = 0.01;

const API = "https://toncenter.com/api/v3";

function apiHeaders(): Record<string, string> {
  const key = process.env["TONCENTER_API_KEY"];
  return key ? { "X-API-Key": key } : {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...apiHeaders(), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`TON API ${path} failed [${res.status}]: ${text}`);
    throw new Error(`TON network error (${res.status})`);
  }
  return JSON.parse(text) as T;
}

export type ChainDeposit = {
  hash: string;
  lt: number;
  amount: number;
  memo: string;
  from: string;
  at: number;
};

type TxResponse = {
  transactions?: Array<{
    hash: string;
    lt: string;
    now: number;
    in_msg?: {
      source?: string | null;
      value?: string | null;
      message_content?: { decoded?: { comment?: string } | null } | null;
    } | null;
  }>;
};

/** Reads incoming transfers to the game wallet newer than `sinceLt`. */
export async function fetchIncoming(sinceLt: number): Promise<ChainDeposit[]> {
  const params = new URLSearchParams({
    account: DEPOSIT_ADDRESS,
    limit: "100",
    sort: "desc",
  });
  if (sinceLt > 0) params.set("start_lt", String(sinceLt + 1));

  const data = await api<TxResponse>(`/transactions?${params.toString()}`);
  const out: ChainDeposit[] = [];

  for (const tx of data.transactions ?? []) {
    const msg = tx.in_msg;
    if (!msg || !msg.source) continue; // external message, not a transfer
    const amount = Number(msg.value ?? 0) / 1e9;
    if (!(amount > 0)) continue;
    out.push({
      hash: tx.hash,
      lt: Number(tx.lt),
      amount,
      memo: (msg.message_content?.decoded?.comment ?? "").trim(),
      from: msg.source,
      at: tx.now,
    });
  }
  return out;
}

/** Signs and broadcasts a TON payout from the game hot wallet. */
export async function sendTon(to: string, amount: number, comment: string): Promise<string> {
  const mnemonic = process.env["TON_WALLET_MNEMONIC"];
  if (!mnemonic) throw new Error("Payout wallet is not configured yet");

  const [{ mnemonicToPrivateKey }, core, ton] = await Promise.all([
    import("@ton/crypto"),
    import("@ton/core"),
    import("@ton/ton"),
  ]);

  const words = mnemonic.trim().split(/\s+/);
  const keys = await mnemonicToPrivateKey(words);
  const wallet = ton.WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey });
  const address = wallet.address.toString({ bounceable: false, urlSafe: true });

  // toncenter v3 returns the wallet object directly; older shapes nest it in `wallets`.
  const info = await api<{
    seqno?: number | string | null;
    status?: string;
    wallets?: Array<{ seqno?: number | string | null; status?: string }>;
  }>(`/walletInformation?address=${encodeURIComponent(address)}`);
  const row = info.wallets?.[0] ?? info;
  const seqno = Number(row.seqno ?? 0);
  const deployed = (row.status ?? "") === "active" || seqno > 0;
  if (!Number.isFinite(seqno)) throw new Error("Could not read the payout wallet state");

  const transfer = wallet.createTransfer({
    seqno,
    secretKey: keys.secretKey,
    messages: [
      core.internal({
        to: core.Address.parse(to),
        value: BigInt(Math.round(amount * 1e9)),
        bounce: false,
        body: comment,
      }),
    ],
  });

  const external = core.external({
    to: wallet.address,
    ...(deployed ? {} : { init: wallet.init }),
    body: transfer,
  });
  const boc = core.beginCell().store(core.storeMessage(external)).endCell().toBoc();
  const base64 = Buffer.from(boc).toString("base64");

  const result = await api<{ message_hash?: string }>("/message", {
    method: "POST",
    body: JSON.stringify({ boc: base64 }),
  });
  const hash = result.message_hash ?? "";
  // toncenter returns a base64 hash; explorers expect hex.
  return /^[0-9a-fA-F]{64}$/.test(hash)
    ? hash.toLowerCase()
    : hash
      ? Buffer.from(hash, "base64").toString("hex")
      : "";
}

/** Basic sanity check for a user-supplied TON address. */
export async function isValidAddress(value: string) {
  try {
    const core = await import("@ton/core");
    core.Address.parse(value.trim());
    return true;
  } catch {
    return false;
  }
}
