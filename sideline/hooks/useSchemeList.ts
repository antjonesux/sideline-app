"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { fetchSchemeList, schemeListQueryKey } from "@/lib/schemeListQuery";
import { useQuery } from "@tanstack/react-query";

export function useSchemeList() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: schemeListQueryKey,
    queryFn: fetchSchemeList,
    enabled: !authLoading && Boolean(user),
    retry: 2,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: authLoading || query.isLoading,
  };
}
