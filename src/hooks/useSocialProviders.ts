import { useEffect, useState } from "react";
import { getEnabledSocialProviders, type SocialProvider } from "@/lib/auth";

/** The providers switched on in Supabase, once known; none until then, so a button never flashes up and fails. */
export function useSocialProviders(): SocialProvider[] {
  const [providers, setProviders] = useState<SocialProvider[]>([]);

  useEffect(() => {
    let cancelled = false;
    getEnabledSocialProviders().then((enabled) => { if (!cancelled) setProviders(enabled); });
    return () => { cancelled = true; };
  }, []);

  return providers;
}
