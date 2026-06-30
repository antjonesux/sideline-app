"use client";

import { fetchPlaybookList, playbookListQueryKey } from "@/lib/playbookListQuery";
import { useQuery } from "@tanstack/react-query";

export function usePlaybookList() {
  return useQuery({
    queryKey: playbookListQueryKey,
    queryFn: fetchPlaybookList,
    retry: 2,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}
