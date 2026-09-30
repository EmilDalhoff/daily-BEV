import { useMemo, useState } from "react";
import { useBenzin } from "../hooks/useBenzin";
import { benzinDom, humørBaggrund, humørIkon } from "../lib/humor";
import type { Benzinselskab, BenzinPris } from "../types";
import { HeroKort } from "./HeroKort";
import { Ikon } from "./Ikon";

const ALLE_SELSKABER: Benzinselskab[] = ["OK", "Circle K", "Ingo", "Shell"];

const selskabFarve: Record<Benzinselskab, string> = {
  OK: "bg-signal-mid/20 text-paper",
  "Circle K": "bg-signal-high/15 text-paper",
  Ingo: "bg-accent/15 text-paper",
  Shell: "bg-signal-mid/25 text-paper",
};

function Skelet() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-40 rounded-4xl bg-boardline" />
      <div className="h-12 rounded-full bg-boardline" />
      <div className="h-64 rounded-3xl bg-boardline" />
    </div>
  );
}

type Positionsstatus = "ingen" | "henter" | "fejlet";

export function BenzinKort() {
  const [byFelt, setByFelt] = useState("");
  const [søgtBy, setSøgtBy] = useState<string | undefined>(undefined);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [positionsstatus, setPositionsstatus] = useState<Positionsstatus>("ingen");
  const [valgteSelskaber, setValgteSelskaber] = useState<Set<Benzinselskab>>(new Set());

  const { data, loading, fejl } = useBenzin({
    by: position ? undefined : søgtBy,
    lat: position?.lat,
    lng: position?.lng,
    selskaber: valgteSelskaber.size > 0 ? [...valgteSelskaber] : undefined,
  });

  const billigst = useMemo(() => {
    if (!data || data.priser.length === 0) return null;
    return data.priser.reduce((a, b) => ((b.benzin95 ?? Infinity) < (a.benzin95 ?? Infinity) ? b : a));
  }, [data]);

  function søg(e: React.FormEvent) {
    e.preventDefault();
    setPosition(null);
    setPositionsstatus("ingen");
    setSøgtBy(byFelt.trim() || undefined);
  }

  function brugMinPosition() {
    if (!("geolocation" in navigator)) {
      setPositionsstatus("fejlet");
      return;
    }
    setPositionsstatus("henter");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setByFelt("");
        setSøgtBy(undefined);
        setPositionsstatus("ingen");
      },
      () => setPositionsstatus("fejlet"),
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  function skiftSelskab(s: Benzinselskab) {
    setValgteSelskaber((forrige) => {
      const næste = new Set(forrige);
      if (næste.has(s)) næste.delete(s);
      else næste.add(s);
      return næste;
    });
  }

  if (fejl && !data) {
    return (
      <div className="rounded-3xl bg-card p-5 text-sm shadow-soft">
        <p className="font-semibold">Kunne ikke hente benzinpriser lige nu</p>
        <p className="mt-1 text-paper/60">{fejl}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stort forsidekort */}
      <HeroKort tone="orange" ikon={<Ikon navn="pumpe" størrelse={92} />}>
        <p className="text-sm font-semibold text-white/80">
          {data?.søgtBy ? data.søgtBy : "Billigste fundet"}
        </p>
        {billigst ? (
          <>
            <p className="mt-1 text-6xl font-light leading-none tracking-tight">
              {billigst.benzin95?.toFixed(2).replace(".", ",")}
              <span className="align-top text-2xl"> kr</span>
            </p>
            <p className="mt-3 truncate text-sm text-white/80">
              {billigst.selskab} · {billigst.by}
              {billigst.afstandKm !== undefined && ` · ${billigst.afstandKm.toFixed(1).replace(".", ",")} km væk`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-white/80">Ingen priser fundet endnu</p>
        )}
      </HeroKort>

      {/* Søgning */}
      <form onSubmit={søg} className="flex gap-2">
        <input
          type="search"
          inputMode="search"
          placeholder="By eller postnummer"
          value={byFelt}
          onChange={(e) => setByFelt(e.target.value)}
          className="min-w-0 flex-1 rounded-full bg-card px-4 py-3 text-base shadow-soft placeholder:text-paper/40 focus:outline-none focus:ring-2 focus:ring-violet"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-violet px-4 py-3 text-sm font-semibold text-white shadow-pill"
        >
          Søg
        </button>
      </form>
      <button
        type="button"
        onClick={brugMinPosition}
        disabled={positionsstatus === "henter"}
        className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-soft transition-colors ${
          position ? "bg-violet text-white" : "bg-card text-paper/80"
        }`}
      >
        📍 {positionsstatus === "henter" ? "Henter din position …" : position ? "Bruger din position" : "Brug min position"}
      </button>
      {positionsstatus === "fejlet" && (
        <p className="-mt-3 px-1 text-xs text-signal-high">
          Kunne ikke hente din position. Tjek at appen har lov til det, og at siden bruger HTTPS (virker først efter
          deploy, ikke i almindelig lokal test).
        </p>
      )}

      {/* Selskabs-filter */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALLE_SELSKABER.map((s) => {
          const valgt = valgteSelskaber.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => skiftSelskab(s)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-colors ${
                valgt ? "bg-violet text-white" : "bg-card text-paper/70"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {loading && !data && <Skelet />}

      {data && (
        <>
          {data.søgtBy === null && (byFelt || søgtBy) && (
            <p className="px-1 text-sm text-signal-mid">
              Ingen stationer fundet for "{søgtBy}" – viser de billigste i hele landet i stedet.
            </p>
          )}
          {data.advarsel && <p className="px-1 text-xs text-signal-mid">{data.advarsel}</p>}

          <ul className="space-y-3">
            {data.priser.map((p: BenzinPris) => {
              const dom = billigst && p.benzin95 !== null ? benzinDom(p.benzin95, billigst.benzin95 ?? p.benzin95) : null;
              return (
                <li key={`${p.selskab}-${p.stationNavn}-${p.by}`} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
                  {dom ? (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${humørBaggrund[dom.humør]}`}>
                      <Ikon navn={humørIkon[dom.humør]} størrelse={32} />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-boardline">
                      <Ikon navn="pumpe" størrelse={28} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selskabFarve[p.selskab]}`}>
                        {p.selskab}
                      </span>
                      <span className="truncate text-sm text-paper/60">{p.by}</span>
                    </p>
                    <p className="truncate text-sm text-paper/50">{p.stationNavn}</p>
                    {p.afstandKm !== undefined && (
                      <p className="text-xs text-paper/40">{p.afstandKm.toFixed(1).replace(".", ",")} km væk</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold">{p.benzin95 !== null ? `${p.benzin95.toFixed(2).replace(".", ",")} kr` : "–"}</p>
                    <p className="text-xs text-paper/50">
                      Diesel {p.diesel !== null ? `${p.diesel.toFixed(2).replace(".", ",")} kr` : "–"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="px-1 text-xs text-paper/40">
        OK, Circle K, Ingo og Shell. Sorteret efter billigste Blyfri 95 (eller nærmeste, hvis du bruger din
        position). Shell-priserne kommer fra et tredjeparts-endpoint, ikke Shells eget officielle API.
      </p>
    </div>
  );
}