/**
 * TON libraries expect Node's Buffer. Bundlers tree-shake a side-effect-only
 * import, so expose it as a function the wallet screen awaits before loading
 * the connector chunk.
 */
export async function installBuffer(): Promise<void> {
  const g = globalThis as unknown as { Buffer?: unknown };
  if (g.Buffer) return;
  const mod = await import("buffer");
  g.Buffer = mod.Buffer;
}
