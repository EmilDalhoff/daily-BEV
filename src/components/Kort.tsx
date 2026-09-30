import type { ReactNode } from "react";

interface KortProps {
  titel: string;
  ikon?: string;
  children: ReactNode;
  fejl?: string | null;
  loading?: boolean;
}

export function Kort({ titel, ikon, children, fejl, loading }: KortProps) {
  return (
    <section className="rounded-md border border-boardline bg-board/60 p-5 shadow-[0_1px_0_0_theme(colors.boardline)]">
      <header className="mb-4 flex items-baseline justify-between border-b border-boardline pb-3">
        <h2 className="flex items-center gap-2 text-lg font-medium text-paper">
          {ikon && <span aria-hidden>{ikon}</span>}
          {titel}
        </h2>
        {loading && (
          <span className="text-xs text-paper/50">opdaterer …</span>
        )}
      </header>
      {fejl ? (
        <p className="text-sm text-signal-high">
          Kunne ikke hente data lige nu ({fejl}).
        </p>
      ) : (
        children
      )}
    </section>
  );
}
