import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import BodyWeightCta from "@/components/BodyWeightCta";

const MESSAGE = "Bodyweight exercises count only their added weight until you log your body weight.";

function open(unit: "kg" | "lbs" = "kg", onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<BodyWeightCta unit={unit} message={MESSAGE} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: "Log body weight" }));
  return onSave;
}

describe("BodyWeightCta", () => {
  it("explains why, with a call to action", () => {
    render(<BodyWeightCta unit="kg" message={MESSAGE} onSave={vi.fn()} />);
    expect(screen.getByRole("note")).toHaveTextContent(MESSAGE);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("opens a weigh-in in place and saves it in kg", async () => {
    const onSave = open("lbs");
    expect(screen.getByRole("form", { name: "Log your body weight" })).toBeInTheDocument();

    // The field takes one decimal, as a person types it (176.4 lbs ≈ 80.01 kg).
    fireEvent.change(screen.getByLabelText("Body weight (lbs)"), { target: { value: "176.4" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });

    expect(onSave.mock.calls[0][0]).toBeCloseTo(80, 1);
  });

  it("keeps the form open with an error when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    open("kg", vi.fn().mockRejectedValue(new Error("offline")));

    fireEvent.change(screen.getByLabelText("Body weight (kg)"), { target: { value: "80" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your weight");
  });

  it("closes again with Not now", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByRole("button", { name: "Log body weight" })).toBeInTheDocument();
  });
});
