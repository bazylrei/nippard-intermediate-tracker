import { describe, it, expect } from "vitest";
import { canEditProgram } from "@/lib/program-access";
import { PROGRAMS_PATH, editProgramHref, programHref } from "@/lib/program-routes";

describe("canEditProgram", () => {
  it("lets the creator edit", () => {
    expect(canEditProgram({ createdBy: "user-1" }, "user-1")).toBe(true);
  });

  it("doesn't let anyone else edit, however public the program is", () => {
    expect(canEditProgram({ createdBy: "user-2" }, "user-1")).toBe(false);
  });

  it("doesn't let a built-in program (no creator) be edited, or anyone signed out", () => {
    expect(canEditProgram({ createdBy: null }, "user-1")).toBe(false);
    expect(canEditProgram({ createdBy: null }, null)).toBe(false);
    expect(canEditProgram({ createdBy: "user-1" }, null)).toBe(false);
  });
});

describe("program routes", () => {
  it("previews at the program's page and edits one level below it", () => {
    expect(PROGRAMS_PATH).toBe("/programs");
    expect(programHref("prog-1")).toBe("/programs/prog-1");
    expect(editProgramHref("prog-1")).toBe("/programs/prog-1/edit");
  });

  it("escapes ids", () => {
    expect(programHref("a b/c")).toBe("/programs/a%20b%2Fc");
  });
});
