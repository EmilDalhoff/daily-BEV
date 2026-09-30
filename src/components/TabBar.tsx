import { Ikon, type IkonNavn } from "./Ikon";

export type Fane = "vejr" | "el" | "benzin";

const faner: { id: Fane; label: string; ikon: IkonNavn }[] = [
  { id: "vejr", label: "Vejr", ikon: "solsky" },
  { id: "el", label: "Strøm", ikon: "lyn" },
  { id: "benzin", label: "Benzin", ikon: "pumpe" },
];

interface Props {
  aktiv: Fane;
  onSkift: (fane: Fane) => void;
}

/** Bund-navigation som i en rigtig app – svæver over indholdet. */
export function TabBar({ aktiv, onSkift }: Props) {
  return (
    <nav
      aria-label="Hovedmenu"
      className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 rounded-full bg-card/90 p-2 shadow-soft backdrop-blur">
        {faner.map((f) => {
          const erAktiv = f.id === aktiv;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSkift(f.id)}
              aria-current={erAktiv ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-xs font-semibold transition-colors ${
                erAktiv ? "bg-violet text-white shadow-pill" : "text-paper/60"
              }`}
            >
              <Ikon navn={f.ikon} størrelse={erAktiv ? 30 : 26} />
              {f.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}