import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FinishWorkoutButton from "@/components/workout/FinishWorkoutButton";

describe("FinishWorkoutButton", () => {
  it("is hidden until a set is logged", () => {
    render(<FinishWorkoutButton setCount={0} onFinish={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Finish workout" })).toBeNull();
  });

  it("confirms before finishing early", async () => {
    const onFinish = vi.fn().mockResolvedValue(undefined);
    render(<FinishWorkoutButton setCount={5} onFinish={onFinish} />);

    fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
    expect(screen.getByText("Finish now with 5 sets logged?")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish" })); });
    expect(onFinish).toHaveBeenCalled();
  });

  it("can be called off", () => {
    const onFinish = vi.fn();
    render(<FinishWorkoutButton setCount={1} onFinish={onFinish} />);
    fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
    expect(screen.getByText("Finish now with 1 set logged?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep going" }));
    expect(screen.getByRole("button", { name: "Finish workout" })).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
