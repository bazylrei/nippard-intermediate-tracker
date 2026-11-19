import { render as rtlRender, renderHook as rtlRenderHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";

type Wrapper = React.ComponentType<{ children: React.ReactNode }>;

/** Nests the caller's wrapper (if any) inside the real AuthProvider, as in the app. */
const withAuth = (Inner?: Wrapper): Wrapper =>
  function Wrapped({ children }) {
    return <AuthProvider>{Inner ? <Inner>{children}</Inner> : children}</AuthProvider>;
  };

/** RTL's render, inside the real AuthProvider (drive it by mocking `@/lib/auth`). */
export function render(ui: React.ReactElement, options: RenderOptions = {}) {
  return rtlRender(ui, { ...options, wrapper: withAuth(options.wrapper as Wrapper | undefined) });
}

/** RTL's renderHook, inside the real AuthProvider. */
export function renderHook<Result, Props>(hook: (props: Props) => Result, options: RenderHookOptions<Props> = {}) {
  return rtlRenderHook(hook, { ...options, wrapper: withAuth(options.wrapper as Wrapper | undefined) });
}

export * from "@testing-library/react";
