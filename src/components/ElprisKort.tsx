import { useMemo, useState, type PointerEvent } from "react";
import { useElpriser } from "../hooks/useElpriser";
import { useVejr } from "../hooks/useVejr";
import { klassificér } from "../lib/niveau";
import { elDom, humørBaggrund, humørIkon } from "../lib/humor";
import type { ElprisTime, PrisArea } from "../types";
import { HeroKort, type HeroTone } from "./HeroKort";
import { Ikon } from "./Ikon";

interface Props {
  område: PrisArea;
  onSkiftOmråde: (område: PrisArea) => void;
}

type Dag = "idag" | "imorgen";

// Tidsstempler er dansk lokaltid som tekst ("2026-09-28T13:00:00"), så vi
// læser dato og time direkte fra strengen frem for via Date/tidszoner.
const datoAf = (tid: string) => tid.slice(0, 10);
const timeAf = (tid: string) => tid.slice(11, 13);
const næsteTime = (tid: string) => String((Number(timeAf(tid)) + 1) % 24).padStart(2, "0");
const tidsrum = (tid: string) => `${timeAf(tid)}–${næsteTime(tid)}`;
const komma = (n: number) => n.toFixed(0);

const tone: Record<"low" | "mid" | "high", HeroTone> = {
  low: "grøn",
  mid: "gul",
  high: "rød",
};

function Skelet() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-52 rounded-4xl bg-boardline" />
      <div className="h-24 rounded-3xl bg-boardline" />
      <div className="h-44 rounded-3xl bg-boardline" />
    </div>
  );
}

/** Finder hvilken søjle en finger/mus står over, ud fra x-positionen. */
function indexFraPointer(e: PointerEvent<HTMLDivElement>, antal: number) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width - 1);
  return Math.floor((x / rect.width) * antal);
}

export function ElprisKort({ område, onSkiftOmråde }: Props) {
  const { data, loading, fejl } = useElpriser(område);
  const { data: vejr } = useVejr();
  const [valgtDag, setValgtDag] = useState<Dag>("idag");
  const [valgtIndex, setValgtIndex] = useState<number | null>(null);

  const visning = useMemo(() => {
    if (!data || data.timer.length === 0) return null;

    const datoer = [...new Set(data.timer.map((t) => datoAf(t.tid)))];
    const nuTid = data.nuIndex >= 0 ? data.timer[data.nuIndex].tid : null;
    const idagDato = nuTid ? datoAf(nuTid) : datoer[0];
    const imorgenDato = datoer.find((d) => d > idagDato) ?? null;
    const visDato = valgtDag === "imorgen" && imorgenDato ? imorgenDato : idagDato;

    const dagTimer: ElprisTime[] = data.timer.filter((t) => datoAf(t.tid) === visDato);
    const værdier = dagTimer.map((t) => t.ørePerKWh);
    const min = Math.min(...værdier);
    const max = Math.max(...værdier);

    const billigst = dagTimer.reduce((a, b) => (b.ørePerKWh < a.ørePerKWh ? b : a));
    const dyrest = dagTimer.reduce((a, b) => (b.ørePerKWh > a.ørePerKWh ? b : a));

    return { dagTimer, min, max, billigst, dyrest, nuTid, harImorgen: imorgenDato !== null };
  }, [data, valgtDag]);

  if (fejl && !data) {
    return (
      <div className="rounded-3xl bg-card p-5 text-sm shadow-soft">
        <p className="font-semibold">Kunne ikke hente elpriser lige nu</p>
        <p className="mt-1 text-paper/60">{fejl}</p>
      </div>
    );
  }

  if (!visning) return loading ? <Skelet /> : null;

  function skiftDag(dag: Dag) {
    setValgtDag(dag);
    setValgtIndex(null);
  }

  const vistIndex = valgtIndex ?? visning.dagTimer.findIndex((t) => t.tid === visning.nuTid);
  const vist = visning.dagTimer[vistIndex] ?? visning.dagTimer[0];
  const erNu = vist.tid === visning.nuTid;
  const niveau = klassificér(vist.ørePerKWh, visning.min, visning.max);
  const dom = elDom(niveau, erNu ? vejr?.solindstrålingNu ?? 0 : 0);

  return (
    <div className="space-y-5">
      {/* Stort forsidekort */}
      <HeroKort tone={tone[niveau]} ikon={<Ikon navn="lyn" størrelse={100} />}>
        <p className="text-sm font-semibold text-white/80">
          {område} · {erNu ? "Lige nu" : `Kl. ${tidsrum(vist.tid)}`}
        </p>
        <p className="mt-1 text-7xl font-light leading-none tracking-tight">
          {komma(vist.ørePerKWh)}
          <span className="align-top text-3xl">øre</span>
        </p>
        <p className="mt-3 text-sm text-white/80">Inkl. moms, pr. kWh</p>
      </HeroKort>

      {/* Dagens dom */}
      <section className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${humørBaggrund[dom.humør]}`}>
          <Ikon navn={humørIkon[dom.humør]} størrelse={44} />
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

      {/* Valg af område / dag */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-card p-1 shadow-soft">
          {(["DK1", "DK2"] as PrisArea[]).map((o) => (
            <button
              key={o}
              onClick={() => onSkiftOmråde(o)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                o === område ? "bg-violet text-white shadow-pill" : "text-paper/60"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        {visning.harImorgen && (
          <div className="flex gap-1 rounded-full bg-card p-1 shadow-soft">
            {(
              [
                ["idag", "I dag"],
                ["imorgen", "I morgen"],
              ] as [Dag, string][]
            ).map(([dag, label]) => (
              <button
                key={dag}
                onClick={() => skiftDag(dag)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  dag === valgtDag ? "bg-violet text-white shadow-pill" : "text-paper/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Graf man kan trække fingeren hen over */}
      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div
          className="flex select-none gap-[3px]"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => setValgtIndex(indexFraPointer(e, visning.dagTimer.length))}
          onPointerMove={(e) => setValgtIndex(indexFraPointer(e, visning.dagTimer.length))}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setValgtIndex(null);
          }}
        >
          {visning.dagTimer.map((t, i) => {
            const bjælkeNiveau = klassificér(t.ørePerKWh, visning.min, visning.max);
            const højdeProcent =
              visning.max === visning.min ? 50 : ((t.ørePerKWh - visning.min) / (visning.max - visning.min)) * 100;
            const nu = t.tid === visning.nuTid;
            const denne = i === vistIndex;
            const visLabel = Number(timeAf(t.tid)) % 3 === 0;
            const farve =
              bjælkeNiveau === "low" ? "bg-signal-low" : bjælkeNiveau === "mid" ? "bg-signal-mid" : "bg-signal-high";

            return (
              <button
                key={t.tid}
                type="button"
                aria-label={`Kl. ${tidsrum(t.tid)}: ${komma(t.ørePerKWh)} øre pr. kWh`}
                onClick={() => setValgtIndex(i)}
                className="group flex min-w-0 flex-1 flex-col items-stretch focus:outline-none"
              >
                <div className="flex h-28 items-end">
                  <div
                    className={`w-full rounded-t-full transition-opacity ${farve} ${
                      denne
                        ? "opacity-100 ring-2 ring-violet"
                        : nu
                          ? "opacity-100 ring-2 ring-paper/30"
                          : "opacity-50 group-hover:opacity-80"
                    }`}
                    style={{ height: `${Math.max(højdeProcent, 6)}%` }}
                  />
                </div>
                <span className="mt-1 block h-4 text-center text-[11px] text-paper/50">
                  {visLabel ? timeAf(t.tid) : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-paper/40">Tryk eller træk fingeren hen over søjlerne for at se prisen time for time.</p>
        <p className="mt-2 text-sm text-paper/70">
          Billigst kl. {tidsrum(visning.billigst.tid)} ({komma(visning.billigst.ørePerKWh)} øre) · Dyrest kl.{" "}
          {tidsrum(visning.dyrest.tid)} ({komma(visning.dyrest.ørePerKWh)} øre)
        </p>
      </section>

      <p className="px-1 text-xs text-paper/40">
        {område}. Inkl. moms, ekskl. transport/afgifter. Timepris = gennemsnit af kvartersprisene.
      </p>
    </div>
  );
}