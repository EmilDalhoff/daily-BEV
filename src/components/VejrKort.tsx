import { useEffect, useMemo, useRef, useState } from "react";
import { useVejr } from "../hooks/useVejr";
import { lavVejrDom, vejrkodeTilTekst } from "../lib/vejr";
import { HeroKort } from "./HeroKort";
import { Ikon, vejrIkon, type IkonNavn } from "./Ikon";

// Byen vises kun som tekst. Selve positionen er sat i hooks/useVejr (default: Aarhus).
const BY = "Aarhus";

// lavVejrDom() giver et emoji med. Her vælger vi det tilsvarende 3D-ikon.
const domIkon: Record<string, IkonNavn> = {
  "☔": "paraply",
  "🌂": "paraply",
  "🧥": "jakke",
  "😎": "sol",
  "🙂": "solsky",
};

const domBaggrund = {
  godt: "bg-signal-low/15",
  pas: "bg-signal-mid/20",
  dårligt: "bg-signal-high/15",
} as const;

const timeAf = (tid: string) => tid.slice(11, 13);
const komma = (n: number, decimaler = 1) => n.toFixed(decimaler).replace(".", ",");

function Skelet() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-52 rounded-4xl bg-boardline" />
      <div className="h-24 rounded-3xl bg-boardline" />
      <div className="h-28 rounded-3xl bg-boardline" />
    </div>
  );
}

export function VejrKort() {
  const { data, loading, fejl } = useVejr();
  const [valgtIndex, setValgtIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const dom = useMemo(() => (data ? lavVejrDom(data) : null), [data]);

  // Scroll timepillerne, så den valgte time står i midten første gang data er klar
  const harData = data !== null;
  useEffect(() => {
    const container = stripRef.current;
    const valgt = container?.querySelector<HTMLElement>("[data-valgt]");
    if (!container || !valgt) return;
    container.scrollLeft = valgt.offsetLeft - container.clientWidth / 2 + valgt.clientWidth / 2;
  }, [harData]);

  if (fejl && !data) {
    return (
      <div className="rounded-3xl bg-card p-5 text-sm shadow-soft">
        <p className="font-semibold">Kunne ikke hente vejret lige nu</p>
        <p className="mt-1 text-paper/60">{fejl}</p>
      </div>
    );
  }

  if (!data || !dom) return loading ? <Skelet /> : null;

  // Hvilken time vises i det store kort? Standard er "nu".
  const idx = valgtIndex ?? data.nuIndex;
  const erNu = idx === data.nuIndex;
  const t = data.timer[idx] ?? null;

  const vist = {
    label: erNu ? "Lige nu" : `Kl. ${t ? timeAf(t.tid) : "--"}:00`,
    temp: erNu || !t ? data.temperaturNu : t.temperatur,
    følt: erNu || !t ? data.føltTemperaturNu : t.føltTemperatur,
    kode: erNu || !t ? data.vejrkode : t.vejrkode,
    erDag: t?.erDag ?? true,
    regn: t?.nedbørSandsynlighed ?? 0,
    mm: t?.nedbørMm ?? 0,
    vind: erNu || !t ? data.vindNu : t.vind,
    stød: t?.vindstød ?? data.vindNu,
  };
  const vejr = vejrkodeTilTekst(vist.kode, vist.erDag);

  return (
    <div className="space-y-5">
      {/* Stort forsidekort */}
      <HeroKort
        tone="blå"
        ikon={<Ikon navn={vejrIkon(vist.kode, vist.erDag)} størrelse={112} />}
      >
        <p className="text-sm font-semibold text-white/80">
          {BY} · {vist.label}
        </p>
        <p className="mt-1 text-8xl font-light leading-none tracking-tight">
          {Math.round(vist.temp)}
          <span className="align-top text-5xl">°</span>
        </p>
        <p className="mt-3 text-lg font-bold">{vejr.tekst}</p>
        <p className="text-sm text-white/80">Føles som {Math.round(vist.følt)}°</p>
      </HeroKort>

      {/* Dagens dom */}
      <section className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${domBaggrund[dom.niveau]}`}>
          <Ikon navn={domIkon[dom.emoji] ?? "solsky"} størrelse={44} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-tight">{dom.overskrift}</h2>
          {dom.detaljer.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-sm text-paper/70">
              {dom.detaljer.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tre små felter for den valgte time */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-card p-3 text-center shadow-soft">
          <Ikon navn="dryppe" størrelse={36} className="mx-auto" />
          <p className="mt-1 text-lg font-bold">{Math.round(vist.regn)}%</p>
          <p className="text-xs text-paper/50">{vist.mm >= 0.1 ? `${komma(vist.mm)} mm` : "Regn"}</p>
        </div>
        <div className="rounded-3xl bg-card p-3 text-center shadow-soft">
          <Ikon navn="vind" størrelse={36} className="mx-auto" />
          <p className="mt-1 text-lg font-bold">{Math.round(vist.vind)} m/s</p>
          <p className="text-xs text-paper/50">Stød {Math.round(vist.stød)}</p>
        </div>
        <div className="rounded-3xl bg-card p-3 text-center shadow-soft">
          <Ikon navn="sol" størrelse={36} className="mx-auto" />
          <p className="mt-1 text-lg font-bold">{data.solTimerIDag} t</p>
          <p className="text-xs text-paper/50">Sol i dag</p>
        </div>
      </div>

      {/* Hele dagen som piller */}
      <section>
        <h2 className="mb-1 px-1 text-lg font-extrabold">I dag</h2>
        <div
          ref={stripRef}
          className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {data.timer.map((h, i) => {
            const valgt = i === idx;
            const nu = i === data.nuIndex;
            const fortid = data.nuIndex >= 0 && i < data.nuIndex;
            return (
              <button
                key={h.tid}
                type="button"
                data-valgt={valgt ? "" : undefined}
                aria-pressed={valgt}
                aria-label={`Kl. ${timeAf(h.tid)}: ${Math.round(h.temperatur)} grader, ${Math.round(h.nedbørSandsynlighed)} procent nedbør`}
                onClick={() => setValgtIndex(i)}
                className={`flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 rounded-full px-2 pb-4 pt-3 text-center transition ${
                  valgt ? "-translate-y-1 bg-violet text-white shadow-pill" : "bg-card shadow-soft"
                } ${fortid && !valgt ? "opacity-50" : ""}`}
              >
                <span className={`text-xs font-semibold ${valgt ? "text-white/80" : "text-paper/50"}`}>
                  {nu ? "Nu" : `${timeAf(h.tid)}:00`}
                </span>
                <Ikon navn={vejrIkon(h.vejrkode, h.erDag)} størrelse={34} />
                <span className="text-base font-bold">{Math.round(h.temperatur)}°</span>
                <span className={`h-4 text-[11px] font-semibold ${valgt ? "text-white/80" : "text-accent"}`}>
                  {h.nedbørSandsynlighed >= 30 ? `${Math.round(h.nedbørSandsynlighed)}%` : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="px-1 text-xs text-paper/40">Tryk på en time for at se vejret i det store kort. Procenten er chance for nedbør.</p>
      </section>

      {/* Dagsoversigt */}
      <section className="grid grid-cols-2 gap-3">
        {(
          [
            ["termometer", "Laveste / højeste", `${Math.round(data.minTemp)}° / ${Math.round(data.maxTemp)}°`],
            ["dryppe", "Nedbør i alt", `${komma(data.nedbørIAlt)} mm`],
            ["sol", "Sol op / ned", `${data.solopgang} / ${data.solnedgang}`],
            ["solsky", "UV-indeks", `${Math.round(data.uvMax)}`],
          ] as [IkonNavn, string, string][]
        ).map(([ikon, label, værdi]) => (
          <div key={label} className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-soft">
            <Ikon navn={ikon} størrelse={36} />
            <div className="min-w-0">
              <p className="text-xs text-paper/50">{label}</p>
              <p className="truncate text-sm font-bold">{værdi}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}