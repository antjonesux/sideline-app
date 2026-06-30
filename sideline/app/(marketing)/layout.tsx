import { MarketingBlueprintBackground } from "@/components/marketing/MarketingBlueprintBackground";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative scroll-smooth scroll-pt-24 text-slate-100">
      <MarketingBlueprintBackground variant="viewport" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
