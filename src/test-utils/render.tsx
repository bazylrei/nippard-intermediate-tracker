import { AuthProvider } from "@/context/AuthContext";
import { makeRenderers } from "./renderers";

/** RTL's render / renderHook inside the real AuthProvider (drive it by mocking `@/lib/auth`). */
export const { render, renderHook } = makeRenderers(AuthProvider);

export * from "@testing-library/react";
