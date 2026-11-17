import { cacheGet, cacheSet } from "./cache";
import { completeOnboarding, isOnboarded } from "./db";

export const ONBOARDING_PATH = "/onboarding";

/** Per user, so a second account on the same device is still onboarded. */
const cacheKey = (userId: string) => `onboarded-${userId}`;

/**
 * Whether the user has finished onboarding. Done is permanent, so a yes is
 * remembered on this device and answers without a round trip next time; a no is
 * always checked again.
 */
export async function checkOnboarded(userId: string): Promise<boolean> {
  if (cacheGet<boolean>(cacheKey(userId))) return true;
  const done = await isOnboarded(userId);
  if (done) cacheSet(cacheKey(userId), true);
  return done;
}

/** Records that onboarding is finished, on the account and on this device. Rejects if saving fails. */
export async function finishOnboarding(userId: string): Promise<void> {
  await completeOnboarding(userId);
  cacheSet(cacheKey(userId), true);
}
