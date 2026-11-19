import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { makeRenderers } from "./renderers";

/** Like `./render`, plus the real PreferencesProvider (drive it by mocking `getPreferences` / `upsertPreferences` in `@/lib/db`). */
export const { render, renderHook } = makeRenderers(function Providers({ children }) {
  return <AuthProvider><PreferencesProvider>{children}</PreferencesProvider></AuthProvider>;
});

export * from "@testing-library/react";
