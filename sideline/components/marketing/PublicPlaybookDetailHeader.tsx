type PublicPlaybookDetailHeaderProps = {
  name: string;
  sideOfBall: "offense" | "defense";
};

export function PublicPlaybookDetailHeader({ name, sideOfBall }: PublicPlaybookDetailHeaderProps) {
  const sideLabel = sideOfBall === "defense" ? "defensive" : "offensive";

  return (
    <header className="mt-4">
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
        {name}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
        Every formation and play in the {name} {sideLabel} playbook in College Football 27.
      </p>
    </header>
  );
}
