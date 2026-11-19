import { render as rtlRender, renderHook as rtlRenderHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react";

type Wrapper = React.ComponentType<{ children: React.ReactNode }>;

/** render / renderHook that nest the caller's wrapper (if any) inside `Providers`, as in the app. */
export function makeRenderers(Providers: Wrapper) {
  const withProviders = (Inner?: Wrapper): Wrapper =>
    function Wrapped({ children }) {
      return <Providers>{Inner ? <Inner>{children}</Inner> : children}</Providers>;
    };
  return {
    render: (ui: React.ReactElement, options: RenderOptions = {}) =>
      rtlRender(ui, { ...options, wrapper: withProviders(options.wrapper as Wrapper | undefined) }),
    renderHook: <Result, Props>(hook: (props: Props) => Result, options: RenderHookOptions<Props> = {}) =>
      rtlRenderHook(hook, { ...options, wrapper: withProviders(options.wrapper as Wrapper | undefined) }),
  };
}
