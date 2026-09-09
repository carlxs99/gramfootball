/** Server-only TON blockchain helpers: deposit scanning and payouts. */

export const DEPOSIT_ADDRESS = "UQA43vCDTfG1gQkytR1IQUnU0P_E5Q6TNFsYR60dKJkROrSd";
export const WITHDRAW_FEE_RATE = 0.05;
export const MIN_WITHDRAW = 0.5;
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

  const info = await api<{ wallets?: Array<{ seqno?: number | string | null }> }>(
    `/wallet?address=${encodeURIComponent(address)}`,
  );
  const seqno = Number(info.wallets?.[0]?.seqno ?? 0);

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
    ...(seqno === 0 ? { init: wallet.init } : {}),
    body: transfer,
  });
  const boc = core.beginCell().store(core.storeMessage(external)).endCell().toBoc();
  const base64 = Buffer.from(boc).toString("base64");

  const result = await api<{ message_hash?: string }>("/message", {
    method: "POST",
    body: JSON.stringify({ boc: base64 }),
  });
  return result.message_hash ?? "";
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
