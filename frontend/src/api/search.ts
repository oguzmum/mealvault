import { useQuery } from "@tanstack/react-query";

import { api } from "./client";
import type { DishListItem } from "./types";

export interface IngredientSearchResult {
  dish: DishListItem;
  total: number;
  matched: number;
  missing: string[];
}

export function useIngredientSearch(ingredients: string[], maxMissing: number) {
  return useQuery({
    queryKey: ["ingredient-search", ingredients, maxMissing],
    enabled: ingredients.length > 0,
    queryFn: async () => {
      const { data } = await api.post<IngredientSearchResult[]>("/search/by-ingredients", {
        ingredients,
        max_missing: maxMissing,
      });
      return data;
    },
  });
}
