/**
 * TON libraries expect Node's Buffer. Bundlers tree-shake a side-effect-only
 * import, so expose it as a function the wallet screen awaits before loading
 * the connector chunk.
 */
export async function installBuffer(): Promise<void> {
  const g = globalThis as unknown as { Buffer?: unknown };
  if (g.Buffer) return;
  // Deep path on purpose: the bare "buffer" specifier resolves to an empty
  // browser stub in the client bundle.
  const mod = await import("buffer/index.js");
  g.Buffer = mod.Buffer;
}
