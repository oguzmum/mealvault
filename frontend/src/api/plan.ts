import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { DishListItem } from "./types";

export interface PlanSlot {
  id: number;
  name: string;
  position: number;
  is_default: boolean;
}

export interface PlanEntry {
  id: number;
  date: string;
  slot_id: number;
  servings: number;
  dish: DishListItem;
}

export interface DayNutrition {
  day: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  incomplete: boolean;
}

export interface NutritionTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  incomplete: boolean;
}

export interface Plan {
  start: string;
  days: number;
  entries: PlanEntry[];
  day_sums: DayNutrition[];
  totals: NutritionTotals;
}

export interface Settings {
  daily_kcal_target: number;
  daily_protein_target_g: number;
  daily_carbs_target_g: number;
  daily_fat_target_g: number;
  default_max_missing: number;
}

export function usePlan(start: string, days = 7) {
  return useQuery({
    queryKey: ["plan", start, days],
    queryFn: async () => {
      const { data } = await api.get<Plan>("/plan", { params: { start, days } });
      return data;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<Settings>("/settings");
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Settings) => {
      const { data } = await api.put<Settings>("/settings", payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useSlots() {
  return useQuery({
    queryKey: ["plan-slots"],
    queryFn: async () => {
      const { data } = await api.get<PlanSlot[]>("/plan/slots");
      return data;
    },
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<PlanSlot>("/plan/slots", { name });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-slots"] }),
  });
}

export function useMoveSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, direction }: { slotId: number; direction: "up" | "down" }) => {
      const { data } = await api.post<PlanSlot[]>(`/plan/slots/${slotId}/move`, { direction });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-slots"] }),
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: number) => {
      await api.delete(`/plan/slots/${slotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-slots"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });
}

export function useCreatePlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      slot_id: number;
      dish_id: number;
      servings?: number;
    }) => {
      const { data } = await api.post<PlanEntry>("/plan/entries", {
        servings: 1,
        ...payload,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });
}

export function useDeletePlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: number) => {
      await api.delete(`/plan/entries/${entryId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });
}

export interface GeneratedEntry {
  date: string;
  slot_id: number;
  dish: DishListItem;
}

export function useGeneratePlan() {
  return useMutation({
    mutationFn: async (payload: { start: string; days?: number; slot_ids: number[] }) => {
      const { data } = await api.post<{ entries: GeneratedEntry[] }>("/plan/generate", payload);
      return data.entries;
    },
  });
}

export function useApplyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      entries: { date: string; slot_id: number; dish_id: number; servings?: number }[],
    ) => {
      const { data } = await api.post<{ applied: number }>("/plan/apply", {
        entries: entries.map((entry) => ({ servings: 1, ...entry })),
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });
}

/** Move an entry to another slot by updating it in place. */
export function useMovePlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      date,
      slot_id,
    }: {
      entryId: number;
      date: string;
      slot_id: number;
    }) => {
      const { data } = await api.patch<PlanEntry>(`/plan/entries/${entryId}`, {
        date,
        slot_id,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });
}
