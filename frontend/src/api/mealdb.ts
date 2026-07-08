import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { Dish } from "./types";

export interface MealDbSearchResult {
  external_id: string;
  name: string;
  thumbnail: string | null;
  category: string | null;
  area: string | null;
  already_imported: boolean;
}

export function useMealDbSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["mealdb-search", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<MealDbSearchResult[]>("/mealdb/search", {
        params: { q: trimmed },
      });
      return data;
    },
  });
}

export function useImportMealDbDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (externalId: string) => {
      const { data } = await api.post<Dish>(`/mealdb/import/${externalId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["mealdb-search"] });
    },
  });
}
