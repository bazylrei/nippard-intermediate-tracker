import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FinishWorkoutSheet from "@/components/workout/FinishWorkoutSheet";

function setup(setCount: number, over: Partial<Parameters<typeof FinishWorkoutSheet>[0]> = {}) {
  const props = {
    onFinish: vi.fn().mockResolvedValue(undefined),
    onDiscard: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...over,
  };
  render(<FinishWorkoutSheet setCount={setCount} {...props} />);
  return props;
}

const press = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };

describe("FinishWorkoutSheet", () => {
  it("uses the singular for one set", () => {
    setup(1);
    expect(screen.getByRole("dialog")).toHaveTextContent("You've logged 1 set.");
  });

  it("offers no Finish with nothing logged, only discard or keep going", () => {
    setup(0);
    expect(screen.queryByRole("button", { name: "Finish" })).toBeNull();
    expect(screen.getByRole("dialog")).toHaveTextContent("Nothing is logged yet");
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep going" })).toBeInTheDocument();
  });

  it("closes after finishing and after discarding", async () => {
    const a = setup(3);
    await press("Finish");
    expect(a.onFinish).toHaveBeenCalledOnce();
    expect(a.onClose).toHaveBeenCalledOnce();
    document.body.innerHTML = "";

    const b = setup(3);
    await press("Discard");
    expect(b.onDiscard).toHaveBeenCalledOnce();
    expect(b.onClose).toHaveBeenCalledOnce();
  });

  it("disables every button while an action is running, so it can't run twice", async () => {
    let resolve!: () => void;
    const onFinish = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    setup(3, { onFinish });
    await press("Finish");

    expect(screen.getByRole("button", { name: "Finishing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep going" })).toBeDisabled();
    await act(async () => { resolve(); });
  });

  it("closes on a backdrop tap", () => {
    const { onClose } = setup(3);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close on a tap inside the panel", () => {
    const { onClose } = setup(3);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
