import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import WheelPage from "./WheelPage";

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

const allDishes = [
  { id: 1, name: "Rindergulasch", cook_time_minutes: 90, kcal: 720, image_path: null, source: "user", tags: [] },
  { id: 2, name: "Falafel-Wrap", cook_time_minutes: 30, kcal: 540, image_path: null, source: "user", tags: [] },
];
const veganDishes = [allDishes[1]];
const tags = [{ id: 1, name: "Vegan", slug: "vegan" }];

function renderWheelPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WheelPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WheelPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { tags?: string[] } }) => {
      if (url === "/tags") return { data: tags };
      if (url === "/dishes") {
        return { data: config?.params?.tags?.includes("vegan") ? veganDishes : allDishes };
      }
      return { data: [] };
    });
  });

  it("keeps dish names hidden until spinning starts", async () => {
    renderWheelPage();
    await screen.findByRole("button", { name: "Los geht's!" });
    expect(screen.queryByText("Rindergulasch")).not.toBeInTheDocument();
    expect(screen.queryByText("Falafel-Wrap")).not.toBeInTheDocument();
  });

  it("keeps the tag filters collapsed behind a dropdown by default", async () => {
    renderWheelPage();
    await screen.findByRole("button", { name: "Los geht's!" });
    expect(screen.queryByRole("button", { name: "Vegan" })).not.toBeInTheDocument();
  });

  it("narrows the dish pool after selecting a tag filter from the dropdown", async () => {
    const user = userEvent.setup();
    renderWheelPage();

    await user.click(await screen.findByRole("button", { name: "Alle" }));
    await user.click(await screen.findByRole("button", { name: "Vegan" }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/dishes",
        expect.objectContaining({ params: expect.objectContaining({ tags: ["vegan"] }) }),
      );
    });
  });

  it("starts spinning and reveals the reel once the button is clicked", async () => {
    const user = userEvent.setup();
    renderWheelPage();

    const startButton = await screen.findByRole("button", { name: "Los geht's!" });
    await user.click(startButton);

    expect(await screen.findByRole("button", { name: "Automat läuft …" })).toBeDisabled();
    expect(screen.getByTestId("reel")).toBeInTheDocument();
  });
});
