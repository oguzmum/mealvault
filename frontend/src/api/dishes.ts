import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { Dish, DishFilters, DishInput, DishListItem, Tag } from "./types";

export function useDishes(filters: DishFilters = {}) {
  return useQuery({
    queryKey: ["dishes", filters],
    queryFn: async () => {
      const { data } = await api.get<DishListItem[]>("/dishes", {
        params: filters,
        paramsSerializer: { indexes: null },
      });
      return data;
    },
  });
}

export function useDish(id: number | undefined) {
  return useQuery({
    queryKey: ["dishes", id],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Dish>(`/dishes/${id}`);
      return data;
    },
  });
}

export function useTags({ includeEmpty = false }: { includeEmpty?: boolean } = {}) {
  return useQuery({
    queryKey: ["tags", { includeEmpty }],
    queryFn: async () => {
      const { data } = await api.get<Tag[]>("/tags", { params: { include_empty: includeEmpty } });
      return data;
    },
  });
}

export function useRenameTag() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data } = await api.patch<Tag>(`/tags/${id}`, { name });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: invalidate,
  });
}

function useInvalidateDishes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["dishes"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
  };
}

export function useCreateDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async (payload: DishInput) => {
      const { data } = await api.post<Dish>("/dishes", payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DishInput }) => {
      const { data } = await api.put<Dish>(`/dishes/${id}`, payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dishes/${id}`);
    },
    onSuccess: invalidate,
  });
}

export function useUploadDishImage() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<Dish>(`/dishes/${id}/image`, formData);
      return data;
    },
    onSuccess: invalidate,
  });
}
