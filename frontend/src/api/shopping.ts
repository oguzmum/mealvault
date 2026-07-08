import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { ShoppingCategory } from "./types";

export interface ShoppingItem {
  id: number;
  name: string;
  category: ShoppingCategory;
  amount: number | null;
  unit: string | null;
  note: string | null;
  checked: boolean;
}

export interface ShoppingList {
  id: number;
  start_date: string;
  end_date: string;
  items: ShoppingItem[];
}

export function useShoppingList(start: string) {
  return useQuery({
    queryKey: ["shopping-list", start],
    queryFn: async () => {
      const { data } = await api.get<ShoppingList | null>("/shopping-lists/current", {
        params: { start },
      });
      return data;
    },
  });
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { start: string; end: string }) => {
      const { data } = await api.post<ShoppingList>("/shopping-lists/generate", payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping-list"] }),
  });
}

export function useToggleShoppingItem(start: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checked }: { id: number; checked: boolean }) => {
      const { data } = await api.patch<ShoppingItem>(`/shopping-list-items/${id}`, { checked });
      return data;
    },
    // Optimistic toggle so checking off feels instant in the supermarket
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: ["shopping-list", start] });
      const previous = queryClient.getQueryData<ShoppingList | null>(["shopping-list", start]);
      if (previous) {
        queryClient.setQueryData(["shopping-list", start], {
          ...previous,
          items: previous.items.map((item) => (item.id === id ? { ...item, checked } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["shopping-list", start], context.previous);
      }
    },
  });
}
