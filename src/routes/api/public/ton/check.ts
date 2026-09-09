import { createFileRoute } from "@tanstack/react-router";

/** Local-only check: which wallet will sign the payouts. */
export const Route = createFileRoute("/api/public/ton/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const host = request.headers.get("host") ?? "";
        if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
          return new Response("Not found", { status: 404 });
        }
        const mnemonic = process.env["TON_WALLET_MNEMONIC"];
        if (!mnemonic) return Response.json({ configured: false });

        const { mnemonicToPrivateKey } = await import("@ton/crypto");
        const { WalletContractV4, WalletContractV5R1 } = await import("@ton/ton");
        const keys = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
        const v4 = WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey });
        const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keys.publicKey });
        return Response.json({
          configured: true,
          words: mnemonic.trim().split(/\s+/).length,
          v4: v4.address.toString({ bounceable: false, urlSafe: true }),
          v5: v5.address.toString({ bounceable: false, urlSafe: true }),
        });
      },
    },
  },
});
