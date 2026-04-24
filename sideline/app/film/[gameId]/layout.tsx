import { Suspense } from "react";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";

export default function FilmGameDetailLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<GameDetailSkeleton />}>{children}</Suspense>;
}
