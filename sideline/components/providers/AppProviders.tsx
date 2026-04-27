"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ReturnSessionTracker } from "@/components/providers/ReturnSessionTracker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ReturnSessionTracker />
        {children}
      </QueryClientProvider>
    </AuthProvider>
  );
}
