"use client";

type CarouselDotsProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function CarouselDots({ count, activeIndex, onSelect }: CarouselDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Slides">
      {Array.from({ length: count }, (_, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Go to slide ${i + 1} of ${count}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            className={
              active
                ? "h-1.5 w-8 shrink-0 rounded-full bg-emerald-500 transition-[width,background-color] duration-300 ease-out"
                : "h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a5565] transition-[width,background-color] duration-300 ease-out"
            }
          />
        );
      })}
    </div>
  );
}
