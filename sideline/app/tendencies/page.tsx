import { TendenciesHome } from "@/components/tendencies/TendenciesHome";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { Suspense } from "react";

export default function TendenciesPage() {
  return (
    <Suspense fallback={<FilmRoomSkeleton />}>
      <TendenciesHome />
    </Suspense>
  );
}
