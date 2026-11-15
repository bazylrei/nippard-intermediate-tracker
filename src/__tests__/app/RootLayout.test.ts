import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Barlow_Condensed: () => ({ variable: "" }),
  Barlow: () => ({ variable: "" }),
}));
vi.mock("@/context/ProgramContext", () => ({ ProgramProvider: () => null }));
vi.mock("@/context/RestTimerContext", () => ({ RestTimerProvider: () => null }));
vi.mock("@/components/RestTimerBar", () => ({ default: () => null }));
vi.mock("@/lib/program-db", () => ({ ACTIVE_PROGRAM_NAME: "Test Program" }));

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { viewport } from "@/app/layout";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

describe("root viewport", () => {
  it("caps the scale so focusing an input doesn't zoom the page on iOS", () => {
    expect(viewport.maximumScale).toBe(1);
  });
});

describe("root layout head", () => {
  it("runs the saved-theme script in <head>, before the page renders", () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement("p")));
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    expect(head).toContain(THEME_INIT_SCRIPT);
  });
});

