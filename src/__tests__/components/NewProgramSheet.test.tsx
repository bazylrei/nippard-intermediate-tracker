import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import NewProgramSheet from "@/components/programs/NewProgramSheet";

function renderSheet(onCreate = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<NewProgramSheet onCreate={onCreate} onClose={onClose} />);
  return { onCreate, onClose };
}
const nameField = () => screen.getByLabelText("Name");
const create = () => screen.getByRole("button", { name: "Create program" });

describe("NewProgramSheet", () => {
  it("can't create until the program has a name", () => {
    renderSheet();
    expect(create()).toBeDisabled();
    fireEvent.change(nameField(), { target: { value: "   " } });
    expect(create()).toBeDisabled();
    fireEvent.change(nameField(), { target: { value: "Summer Cut" } });
    expect(create()).toBeEnabled();
  });

  it("creates with what was entered, under an id made for this sheet", async () => {
    const { onCreate } = renderSheet();
    fireEvent.change(nameField(), { target: { value: "Summer Cut" } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Six weeks" } });
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "Hypertrophy" } });
    await act(async () => { fireEvent.click(create()); });

    expect(onCreate).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/), { name: "Summer Cut", description: "Six weeks", category: "Hypertrophy" });
  });

  it("keeps the same id when a failed create is retried, so it can't be added twice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onCreate = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    renderSheet(onCreate);
    fireEvent.change(nameField(), { target: { value: "Plan" } });
    await act(async () => { fireEvent.click(create()); });
    await act(async () => { fireEvent.click(create()); });

    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onCreate.mock.calls[1][0]).toBe(onCreate.mock.calls[0][0]);
  });

  it("stays open with an error when creating fails, and can be tried again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { onClose } = renderSheet(vi.fn().mockRejectedValue(new Error("offline")));
    fireEvent.change(nameField(), { target: { value: "Plan" } });
    await act(async () => { fireEvent.click(create()); });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't create the program");
    expect(onClose).not.toHaveBeenCalled();
    expect(create()).toBeEnabled();
  });

  it("creates once however often it's pressed while saving", async () => {
    let resolve: () => void = () => {};
    const onCreate = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    renderSheet(onCreate);
    fireEvent.change(nameField(), { target: { value: "Plan" } });
    fireEvent.click(create());
    fireEvent.click(screen.getByRole("button", { name: "Creating…" }));
    await act(async () => { resolve(); });
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("closes without creating from Cancel and the close button", () => {
    const { onCreate, onClose } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onCreate).not.toHaveBeenCalled();
  });
});
