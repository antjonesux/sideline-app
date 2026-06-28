import { TendenciesHome } from "@/components/tendencies/TendenciesHome";
import { TendenciesHomeSkeleton } from "@/components/shared/PageSkeleton";
import { Suspense } from "react";

export default function TendenciesPage() {
  return (
    <Suspense fallback={<TendenciesHomeSkeleton />}>
      <TendenciesHome />
    </Suspense>
  );
}
