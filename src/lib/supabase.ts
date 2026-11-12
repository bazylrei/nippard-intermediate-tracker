import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export type TypedSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let _client: TypedSupabaseClient | null = null;

export function createClient(): TypedSupabaseClient {
  if (typeof window === "undefined") {
    // During SSR/build, return a no-op proxy to avoid crashing
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"
    );
  }
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
