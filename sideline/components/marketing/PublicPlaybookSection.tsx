import { PublicPlaybookCard } from "@/components/marketing/PublicPlaybookCard";

type PublicPlaybookSectionProps = {
  title: string;
  playbooks: string[];
  side?: "offense" | "defense";
};

export function PublicPlaybookSection({ title, playbooks, side }: PublicPlaybookSectionProps) {
  if (playbooks.length === 0) return null;

  return (
    <section className="mt-10 first:mt-0 sm:mt-12">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
        {title}
      </h2>
      <div className="mt-4 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {playbooks.map((name) => (
          <PublicPlaybookCard key={`${side ?? "offense"}:${name}`} name={name} side={side} />
        ))}
      </div>
    </section>
  );
}
