import { GamePlanPageClient } from "@/components/GamePlanPageClient";

export default function GamePlanRoutePage({
  params,
}: {
  params: { id: string };
}) {
  return <GamePlanPageClient schemeId={params.id} />;
}
