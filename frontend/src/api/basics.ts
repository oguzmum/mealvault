import { useQuery } from "@tanstack/react-query";

import { api } from "./client";

export interface CookingBasic {
  id: number;
  slug: string;
  title: string;
  content: string;
  keywords: string[];
}

export function useBasics() {
  return useQuery({
    queryKey: ["basics"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await api.get<CookingBasic[]>("/basics");
      return data;
    },
  });
}

/** Find basics whose keywords appear in the given step text (case-insensitive). */
export function matchBasics(text: string, basics: CookingBasic[]): CookingBasic[] {
  const haystack = text.toLowerCase();
  return basics.filter((basic) =>
    basic.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  );
}
