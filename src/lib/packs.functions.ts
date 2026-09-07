import { createServerFn } from "@tanstack/react-start";
import { BY_RARITY, RARITIES, type Rarity } from "./creatures";
import { PACKS_BY_ID } from "./packs";

/**
 * Pack rolls happen on the server: odds are never resolved by client JS.
 * Storage (user balance / collection) is client-side for now and can be moved
 * to a database without changing this contract.
 */
export const openPack = createServerFn({ method: "POST" })
  .inputValidator((input: { packId: string }) => {
    if (!input || typeof input.packId !== "string" || !PACKS_BY_ID[input.packId]) {
      throw new Error("Unknown pack");
    }
    return { packId: input.packId };
  })
  .handler(async ({ data }) => {
    const pack = PACKS_BY_ID[data.packId]!;
    const rand = () => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0]! / 2 ** 32;
    };

    const rollRarity = (): Rarity => {
      const roll = rand() * 100;
      let acc = 0;
      for (const r of RARITIES) {
        acc += pack.odds[r];
        if (roll < acc) return r;
      }
      return "common";
    };

    const pulls: string[] = [];
    for (let i = 0; i < pack.cards; i++) {
      const rarity = rollRarity();
      const pool = BY_RARITY[rarity];
      pulls.push(pool[Math.floor(rand() * pool.length)]!.id);
    }

    return { packId: pack.id, price: pack.price, pulls, at: Date.now() };
  });
