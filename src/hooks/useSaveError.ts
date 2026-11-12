import { useCallback, useState } from "react";

/**
 * One visible place for "a save failed" messages, so a failed write is never
 * silent. `attempt` runs a save and reports instead of throwing.
 */
export function useSaveError() {
  const [message, setMessage] = useState<string | null>(null);

  const report = useCallback((failureMessage: string, error?: unknown) => {
    if (error !== undefined) console.error(error);
    setMessage(failureMessage);
  }, []);

  const clear = useCallback(() => setMessage(null), []);

  /** Resolves true if the save succeeded; on failure shows `failureMessage` and resolves false. */
  const attempt = useCallback(async (save: () => Promise<unknown>, failureMessage: string): Promise<boolean> => {
    try {
      await save();
      return true;
    } catch (error) {
      report(failureMessage, error);
      return false;
    }
  }, [report]);

  return { message, report, clear, attempt };
}
