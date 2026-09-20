/**
 * Rewarded interstitial ad (Libtl SDK).
 * The SDK exposes a global function named after the zone's data-sdk attribute.
 * It resolves once the user has watched the ad or closed it from the
 * "continue" button, which returns control to the app.
 */

const SDK_FN = "show_11849740";

type ShowFn = () => Promise<unknown>;

function getShow(): ShowFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as Record<string, unknown>)[SDK_FN];
  return typeof fn === "function" ? (fn as ShowFn) : null;
}

/** Waits for the SDK global to appear (the script loads asynchronously). */
async function waitForSdk(timeoutMs = 4000): Promise<ShowFn | null> {
  const start = Date.now();
  for (;;) {
    const fn = getShow();
    if (fn) return fn;
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => window.setTimeout(r, 150));
  }
}

/**
 * Shows the rewarded interstitial. Resolves when the ad flow is finished so
 * the caller can grant the reward. Never blocks the reward if ads are
 * unavailable (blocked, offline, slow SDK).
 */
export async function showRewardedAd(): Promise<void> {
  const show = await waitForSdk();
  if (!show) return;
  try {
    await show();
  } catch {
    // Ignore ad errors: the user should still be able to claim.
  }
}
