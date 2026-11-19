import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeleteExerciseControl from "@/components/exercises/DeleteExerciseControl";

describe("DeleteExerciseControl", () => {
  it("asks before deleting, and deletes nothing until confirmed", () => {
    const onDelete = vi.fn();
    render(<DeleteExerciseControl name="Cable Fly" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /Delete exercise/ }));

    expect(screen.getByText(/Delete “Cable Fly”\?/)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("goes back to the plain button when cancelled", () => {
    const onDelete = vi.fn();
    render(<DeleteExerciseControl name="Cable Fly" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete exercise/ }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: /Delete exercise/ })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
