import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import PlanPage from "./PlanPage";

vi.mock("../api/client", () => ({
  API_BASE_URL: "",
  uploadUrl: (path: string | null) => path,
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const emptyPlan = {
  start: "2026-06-29",
  days: 7,
  entries: [],
  day_sums: Array.from({ length: 7 }, (_, i) => ({
    day: `2026-06-${29 + i}`,
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    incomplete: false,
  })),
  totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, incomplete: false },
};

const dishes = [
  {
    id: 42,
    name: "Rote-Linsen-Dal",
    cook_time_minutes: 30,
    kcal: 430,
    image_path: null,
    source: "user",
    tags: [],
  },
];

const settings = {
  daily_kcal_target: 2000,
  daily_protein_target_g: 100,
  daily_carbs_target_g: 250,
  daily_fat_target_g: 70,
  default_max_missing: 2,
};

const slots = [
  { id: 1, name: "Frühstück", position: 0, is_default: true },
  { id: 2, name: "Mittag", position: 1, is_default: true },
];

function renderPlanPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlanPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PlanPage slot assignment", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/plan") return { data: emptyPlan };
      if (url === "/dishes") return { data: dishes };
      if (url === "/settings") return { data: settings };
      if (url === "/plan/slots") return { data: slots };
      return { data: [] };
    });
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 1,
        date: "2026-06-29",
        slot_id: 1,
        servings: 1,
        dish: dishes[0],
      },
    });
  });

  it("assigns a dish to an empty slot via the picker dialog", async () => {
    const user = userEvent.setup();
    renderPlanPage();

    // 14 empty slots (7 days × 2 slots) render as add buttons
    const addButtons = await screen.findAllByRole("button", { name: /Gericht hinzufügen/ });
    expect(addButtons).toHaveLength(14);

    await user.click(addButtons[0]);
    const dialog = screen.getByRole("dialog", { name: "Gericht auswählen" });

    await user.click(await within(dialog).findByText("Rote-Linsen-Dal"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/plan/entries",
        expect.objectContaining({ slot_id: 1, dish_id: 42, servings: 1 }),
      );
    });
    // Dialog closes after selection
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
