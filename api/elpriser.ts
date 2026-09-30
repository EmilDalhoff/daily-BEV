import type { VercelRequest, VercelResponse } from "./_types";
import type { ElprisData, ElprisTime, PrisArea } from "../src/types";

/**
 * Elpris-proxy
 *
 * Primær kilde:  Energi Data Service, datasættet DayAheadPrices
 * Fallback:      Elprisen lige nu
 *
 * VIGTIGT: Elspotprices (timepriser) blev lukket 30. september 2025, da
 * elmarkedet gik over til 15-minutters priser. Det gamle datasæt returnerer
 * derfor ingen nye data. DayAheadPrices leverer kvartersværdier, som vi her
 * midler til timepriser, så resten af appen stadig kan arbejde med 24 timer
 * pr. dag.
 *
 * Begge kilder normaliseres til samme ElprisData-format.
 */

const ENERGI_DATA_URL =
  "https://api.energidataservice.dk/dataset/DayAheadPrices";

const ELPRISEN_LIGE_NU_URL =
  "https://www.elprisenligenu.dk/api/v1/prices";

const MOMS = 1.25;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutter
const TIDSZONE = "Europe/Copenhagen";

interface RåDayAhead {
  TimeDK: string; // dansk lokaltid uden offset, fx "2026-09-28T13:15:00"
  PriceArea: string;
  DayAheadPriceDKK: number | null; // DKK/MWh, ekskl. moms
}

interface EnergiDataResponse {
  records: RåDayAhead[];
}

interface ElprisenLigeNuRecord {
  DKK_per_kWh: number; // ekskl. moms
  time_start: string; // fx "2026-09-28T13:15:00+02:00"
}

const cache = new Map<PrisArea, { data: ElprisData; hentetMs: number }>();

/** Dansk dato og time lige nu, uafhængigt af serverens tidszone. */
function danskNu() {
  const parts = new Intl.DateTimeFormat("da-DK", {
    timeZone: TIDSZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    år: Number(get("year")),
    måned: Number(get("month")),
    dag: Number(get("day")),
    time: Number(get("hour")),
  };
}

function formatApiDato(år: number, måned: number, dag: number) {
  return `${år}/${String(måned).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

function næsteDag(år: number, måned: number, dag: number) {
  const dato = new Date(Date.UTC(år, måned - 1, dag));
  dato.setUTCDate(dato.getUTCDate() + 1);
  return {
    år: dato.getUTCFullYear(),
    måned: dato.getUTCMonth() + 1,
    dag: dato.getUTCDate(),
  };
}

/**
 * Midler kvarters- (eller times-) værdier til én pris pr. time.
 *
 * Begge kilders tidsstempler er allerede dansk lokaltid som tekst, så vi
 * grupperer på de første 13 tegn ("ÅÅÅÅ-MM-DDTHH") i stedet for at gå via
 * Date-objekter, som ville blive fortolket i serverens tidszone.
 */
function tilTimepriser(
  punkter: { tid: string; ørePerKWh: number }[]
): ElprisTime[] {
  const grupper = new Map<string, number[]>();

  for (const punkt of punkter) {
    const nøgle = punkt.tid.slice(0, 13);
    const liste = grupper.get(nøgle) ?? [];
    liste.push(punkt.ørePerKWh);
    grupper.set(nøgle, liste);
  }

  return [...grupper.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nøgle, værdier]) => ({
      tid: `${nøgle}:00:00`,
      ørePerKWh: værdier.reduce((sum, v) => sum + v, 0) / værdier.length,
    }));
}

/** Indeks for den nuværende time (dansk tid), eller -1. */
function findNuIndex(timer: ElprisTime[]) {
  const nu = danskNu();
  const dato = `${nu.år}-${String(nu.måned).padStart(2, "0")}-${String(nu.dag).padStart(2, "0")}`;

  return timer.findIndex(
    (t) => t.tid.slice(0, 10) === dato && Number(t.tid.slice(11, 13)) === nu.time
  );
}

async function hentFraEnergiDataService(område: PrisArea): Promise<ElprisData> {
  const params = new URLSearchParams({
    start: "StartOfDay",
    end: "StartOfDay+P2D",
    filter: JSON.stringify({ PriceArea: [område] }),
    columns: "TimeDK,PriceArea,DayAheadPriceDKK",
    sort: "TimeDK ASC",
    limit: "0",
  });

  const res = await fetch(`${ENERGI_DATA_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Energi Data Service fejlede (${res.status}):`, body);
    throw new Error(`Energi Data Service svarede ${res.status}`);
  }

  const json = (await res.json()) as EnergiDataResponse;

  if (!Array.isArray(json.records)) {
    throw new Error("Energi Data Service returnerede ugyldige data");
  }

  const timer = tilTimepriser(
    json.records
      .filter(
        (r) =>
          r.DayAheadPriceDKK !== null && Number.isFinite(r.DayAheadPriceDKK)
      )
      .map((r) => ({
        tid: r.TimeDK,
        // DKK/MWh -> øre/kWh -> inkl. moms
        ørePerKWh: (r.DayAheadPriceDKK! / 10) * MOMS,
      }))
  );

  if (timer.length === 0) {
    throw new Error("Energi Data Service returnerede ingen elpriser");
  }

  return {
    område,
    timer,
    nuIndex: findNuIndex(timer),
    kilde: "Energi Data Service",
    hentetTidspunkt: new Date().toISOString(),
  };
}

async function hentDagFraElprisenLigeNu(
  område: PrisArea,
  år: number,
  måned: number,
  dag: number
) {
  const dato = formatApiDato(år, måned, dag);
  const url = `${ELPRISEN_LIGE_NU_URL}/${dato}_${område}.json`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error(`Elprisen lige nu svarede ${res.status} for ${dato}_${område}`);
  }

  const json = (await res.json()) as ElprisenLigeNuRecord[];

  if (!Array.isArray(json)) {
    throw new Error("Elprisen lige nu returnerede ugyldige data");
  }

  return json
    .filter(
      (r) => Number.isFinite(r.DKK_per_kWh) && typeof r.time_start === "string"
    )
    .map((r) => ({
      tid: r.time_start,
      // DKK/kWh -> øre/kWh -> inkl. moms
      ørePerKWh: r.DKK_per_kWh * 100 * MOMS,
    }));
}

async function hentFraElprisenLigeNu(område: PrisArea): Promise<ElprisData> {
  const nu = danskNu();
  const iMorgen = næsteDag(nu.år, nu.måned, nu.dag);

  const [iDag, iMorgenPunkter] = await Promise.all([
    hentDagFraElprisenLigeNu(område, nu.år, nu.måned, nu.dag),
    // I morgens priser er ikke altid frigivet endnu (typisk ca. kl. 13)
    hentDagFraElprisenLigeNu(område, iMorgen.år, iMorgen.måned, iMorgen.dag).catch(
      () => [] as { tid: string; ørePerKWh: number }[]
    ),
  ]);

  const timer = tilTimepriser([...iDag, ...iMorgenPunkter]);

  if (timer.length === 0) {
    throw new Error("Elprisen lige nu returnerede ingen elpriser");
  }

  return {
    område,
    timer,
    nuIndex: findNuIndex(timer),
    kilde: "Energi Data Service",
    hentetTidspunkt: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const område = (req.query.omraade as PrisArea) || "DK1";

  if (område !== "DK1" && område !== "DK2") {
    return res.status(400).json({ fejl: "omraade skal være DK1 eller DK2" });
  }

  // CDN-cache: 10 min frisk, derefter må en gammel version bruges mens en ny hentes.
  (res as unknown as { setHeader(name: string, value: string): void }).setHeader(
    "Cache-Control",
    "s-maxage=600, stale-while-revalidate=1200",
  );

  const cached = cache.get(område);

  if (cached && Date.now() - cached.hentetMs < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  // 1. Primær kilde
  try {
    const data = await hentFraEnergiDataService(område);
    cache.set(område, { data, hentetMs: Date.now() });
    return res.status(200).json(data);
  } catch (primærFejl) {
    console.warn("Energi Data Service fejlede. Prøver fallback:", primærFejl);
  }

  // 2. Fallback
  try {
    const data = await hentFraElprisenLigeNu(område);
    cache.set(område, { data, hentetMs: Date.now() });
    return res.status(200).json(data);
  } catch (fallbackFejl) {
    console.error(
      "Både Energi Data Service og Elprisen lige nu fejlede:",
      fallbackFejl
    );

    // Hellere gamle data end en fejl
    if (cached) {
      console.warn("Bruger gamle elpriser fra cache");
      return res.status(200).json(cached.data);
    }

    return res.status(502).json({ fejl: "Kunne ikke hente elpriser lige nu" });
  }
}