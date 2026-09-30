import type { ReactNode } from "react";

export type HeroTone = "blå" | "grøn" | "gul" | "rød" | "orange";

const toner: Record<HeroTone, string> = {
  blå: "from-[#7FB0F8] to-[#4C7FE6]",
  grøn: "from-[#6FD3A4] to-[#37A97E]",
  gul: "from-[#F8CD6B] to-[#F0A23C]",
  rød: "from-[#F58A7F] to-[#E2564C]",
  orange: "from-[#F9A56B] to-[#EB6B4A]",
};

interface Props {
  tone: HeroTone;
  children: ReactNode;
  /** Stort 3D-ikon til højre */
  ikon?: ReactNode;
  className?: string;
}

/** Stort farvet forsidekort med bløde cirkler i baggrunden – bruges øverst på hver skærm. */
export function HeroKort({ tone, children, ikon, className = "" }: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-4xl bg-gradient-to-br ${toner[tone]} p-6 text-white shadow-soft ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">{children}</div>
        {ikon && <div className="shrink-0 drop-shadow-[0_14px_14px_rgba(20,40,120,0.35)]">{ikon}</div>}
      </div>
    </section>
  );
}