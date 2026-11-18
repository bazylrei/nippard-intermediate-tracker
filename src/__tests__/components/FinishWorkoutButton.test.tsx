import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import FinishWorkoutButton from "@/components/workout/FinishWorkoutButton";

function setup(setCount: number) {
  const onFinish = vi.fn().mockResolvedValue(undefined);
  const onDiscard = vi.fn().mockResolvedValue(undefined);
  render(<FinishWorkoutButton setCount={setCount} onFinish={onFinish} onDiscard={onDiscard} />);
  return { onFinish, onDiscard };
}

const open = () => fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
const press = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };

describe("FinishWorkoutButton", () => {
  it("is available even before a set is logged, since it's the way to discard", () => {
    setup(0);
    expect(screen.getByRole("button", { name: "Finish workout" })).toBeInTheDocument();
  });

  it("opens a dialog offering finish, discard and keep going", () => {
    const { onFinish, onDiscard } = setup(5);
    expect(screen.queryByRole("dialog")).toBeNull();
    open();

    expect(screen.getByRole("dialog", { name: "Finish workout" })).toHaveTextContent("You've logged 5 sets");
    for (const name of ["Finish", "Discard", "Keep going"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("finishes", async () => {
    const { onFinish, onDiscard } = setup(2);
    open();
    await press("Finish");
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("discards", async () => {
    const { onFinish, onDiscard } = setup(2);
    open();
    await press("Discard");
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("can be called off with Keep going", async () => {
    const { onFinish, onDiscard } = setup(1);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Keep going" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onFinish).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
