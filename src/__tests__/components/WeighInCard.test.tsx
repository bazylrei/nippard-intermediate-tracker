import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import WeighInCard from "@/components/widgets/WeighInCard";

function renderCard(onSave = vi.fn().mockResolvedValue(undefined), onSkip = vi.fn()) {
  render(<WeighInCard unit="kg" onSave={onSave} onDismiss={onSkip} />);
  return { onSave, onSkip };
}

describe("WeighInCard", () => {
  it("saves the entered weight in the user's unit", async () => {
    const { onSave } = renderCard();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Body weight (kg)"), { target: { value: "82.4" } });
    await act(async () => { fireEvent.click(save); });

    expect(onSave).toHaveBeenCalledWith(82.4);
  });

  it("stays open with an inline error when the save fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderCard(vi.fn().mockRejectedValue(new Error("offline")));

    fireEvent.change(screen.getByLabelText("Body weight (kg)"), { target: { value: "82.4" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your weight");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(); // can retry
  });

  it("can be skipped for the week", () => {
    const { onSkip } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Skip this week" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
