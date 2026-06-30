import { MarketingBlueprintBackground } from "@/components/marketing/MarketingBlueprintBackground";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh]">
      <MarketingBlueprintBackground variant="viewport" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
