import type { VercelRequest, VercelResponse } from "./_types";
import type { BenzinData, BenzinPris, Benzinselskab } from "../src/types";

/**
 * Tre officielle, gratis og nøglefrie danske brændstof-API'er, kombineret:
 *
 * 1) OK – https://mobility-prices.ok.dk/api/v1/fuel-prices
 *    Offentligt, ingen auth. Har koordinater.
 *
 * 2) Circle K (dækker også Ingo, Circle K's ubemandede lavpris-brand)
 *    – https://api.circlek.com/eu/prices/v1/fuel/countries/DK
 *    Kræver kun header X-App-Name: PRICES. Har IKKE koordinater, kun by/postnr.
 *
 * 3) Shell – https://shellpumpepriser.geoapp.me/v1/prices
 *    Offentligt, ingen auth. Har koordinater. Ikke Shells eget officielle
 *    API, men et tredjepartsendpoint der (pr. verificering) svarer med
 *    friske, rigtige priser for alle danske Shell-stationer.
 *
 * Alle tre kaldes parallelt. Fejler én eller to, viser vi bare resten
 * (med en advarsel) – appen skal aldrig stå helt uden data.
 *
 * Søgning:
 *   ?by=<by eller postnummer>   – tekstsøgning
 *   ?lat=<tal>&lng=<tal>        – "brug min position", sorteret efter afstand
 *                                  (kun stationer med koordinater: OK + Shell)
 *   ?selskaber=OK,Shell         – filtrér til bestemte kæder
 * Uden nogen af delene bruges FUEL_CITY (miljøvariabel, default Aarhus).
 */

const OK_URL = "https://mobility-prices.ok.dk/api/v1/fuel-prices";
const CIRCLE_K_URL = "https://api.circlek.com/eu/prices/v1/fuel/countries/DK";
const SHELL_URL = "https://shellpumpepriser.geoapp.me/v1/prices";

const STANDARD_BY = process.env.FUEL_CITY ?? "Aarhus";
const ANTAL_STATIONER = 10;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

// --- OK-typer ---
interface OKPris {
  product_name: string;
  price: number;
}
interface OKStation {
  street: string;
  house_number: string;
  postal_code: number;
  city: string;
  coordinates: { latitude: number; longitude: number };
  last_updated_time: string;
  prices: OKPris[];
}
interface OKRespons {
  items: OKStation[];
}

// --- Circle K / Ingo-typer ---
interface CKPris {
  displayName: string;
  price: number;
  lastUpdated: string;
}
interface CKSite {
  name: string;
  address: { street: string; city: string; postalCode: string };
  fuelPrices?: CKPris[];
}
interface CKRespons {
  sites: CKSite[];
}

// --- Shell-typer ---
interface ShellPris {
  fuelType: string; // "Autobenzin" | "Autodiesel"
  octane: string | null;
  productName: string;
  price: string;
  lastUpdated: string;
}
interface ShellStation {
  street: string;
  postalCode: string;
  city: string;
  coordinates: { latitude: string; longitude: string };
  prices: ShellPris[];
}

let cache: { data: BenzinData; hentetMs: number } | null = null;

function normaliser(tekst: string): string {
  return tekst
    .toLowerCase()
    .trim()
    .replaceAll("å", "aa")
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe");
}

function findPris(priser: { navn: string; pris: number }[], matcher: (navn: string) => boolean) {
  return priser.find((p) => matcher(p.navn.toLowerCase()))?.pris ?? null;
}

function tilBenzinPrisFraOK(s: OKStation): BenzinPris {
  const priser = s.prices.map((p) => ({ navn: p.product_name, pris: p.price }));
  return {
    selskab: "OK",
    stationNavn: `OK ${s.street} ${s.house_number}`.trim(),
    by: s.city,
    postnummer: String(s.postal_code),
    lat: s.coordinates?.latitude,
    lng: s.coordinates?.longitude,
    benzin95: findPris(priser, (n) => n.includes("blyfri 95") || n.includes("95")),
    diesel: findPris(priser, (n) => n.includes("diesel")),
    opdateret: s.last_updated_time,
  };
}

function tilBenzinPrisFraCK(site: CKSite): BenzinPris {
  const priser = (site.fuelPrices ?? []).map((p) => ({ navn: p.displayName, pris: p.price }));
  const selskab: Benzinselskab = site.name.toUpperCase().startsWith("INGO") ? "Ingo" : "Circle K";
  return {
    selskab,
    stationNavn: site.name,
    by: site.address.city,
    postnummer: site.address.postalCode,
    benzin95: findPris(priser, (n) => n.includes("95")),
    diesel: findPris(priser, (n) => n.includes("diesel")),
    opdateret: (site.fuelPrices ?? [])[0]?.lastUpdated ?? null,
  };
}

function tilBenzinPrisFraShell(s: ShellStation): BenzinPris {
  const benzin95 = s.prices.find((p) => p.fuelType === "Autobenzin" && p.octane === "95");
  // Foretræk standard diesel (FuelSave) over premium (V-Power Diesel), som
  // OK og Circle K's priser også sammenligner med (standard, ikke premium).
  const diesel =
    s.prices.find((p) => p.fuelType === "Autodiesel" && !p.productName.includes("V-Power")) ??
    s.prices.find((p) => p.fuelType === "Autodiesel");

  return {
    selskab: "Shell",
    stationNavn: `Shell ${s.street}`.trim(),
    by: s.city,
    postnummer: s.postalCode,
    lat: s.coordinates ? Number(s.coordinates.latitude) : undefined,
    lng: s.coordinates ? Number(s.coordinates.longitude) : undefined,
    benzin95: benzin95 ? Number(benzin95.price) : null,
    diesel: diesel ? Number(diesel.price) : null,
    opdateret: benzin95?.lastUpdated ?? diesel?.lastUpdated ?? null,
  };
}

async function hentOK(): Promise<BenzinPris[]> {
  const res = await fetch(OK_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OK-API svarede ${res.status}`);
  const json = (await res.json()) as OKRespons;
  return json.items.map(tilBenzinPrisFraOK);
}

async function hentCircleK(): Promise<BenzinPris[]> {
  const res = await fetch(CIRCLE_K_URL, { headers: { "X-App-Name": "PRICES" } });
  if (!res.ok) throw new Error(`Circle K-API svarede ${res.status}`);
  const json = (await res.json()) as CKRespons;
  return json.sites.map(tilBenzinPrisFraCK);
}

async function hentShell(): Promise<BenzinPris[]> {
  const res = await fetch(SHELL_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Shell-API svarede ${res.status}`);
  const json = (await res.json()) as ShellStation[];
  return json.map(tilBenzinPrisFraShell);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function hentAlleBenzinpriser(): Promise<{ alle: BenzinPris[]; advarsel: string | null }> {
  const [ok, ck, shell] = await Promise.allSettled([hentOK(), hentCircleK(), hentShell()]);

  const alle: BenzinPris[] = [];
  const fejl: string[] = [];

  for (const [navn, resultat] of [
    ["OK", ok],
    ["Circle K/Ingo", ck],
    ["Shell", shell],
  ] as const) {
    if (resultat.status === "fulfilled") {
      alle.push(...resultat.value);
    } else {
      fejl.push(navn);
      console.error(`${navn}-API fejlede:`, resultat.reason);
    }
  }

  if (alle.length === 0) {
    throw new Error("Alle tre kilder fejlede");
  }

  return { alle, advarsel: fejl.length > 0 ? `Kunne ikke hente fra: ${fejl.join(", ")}` : null };
}

/** Udvælger og sorterer stationer ud fra søgning: position > tekst > standardby. */
function vælgStationer(
  alle: BenzinPris[],
  by: string | null,
  lat: number | null,
  lng: number | null
): { priser: BenzinPris[]; søgtBy: string | null } {
  const priserFundet = alle.filter((p) => p.benzin95 !== null || p.diesel !== null);

  if (lat !== null && lng !== null) {
    const medKoordinater = priserFundet
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      .map((p) => ({ ...p, afstandKm: haversineKm(lat, lng, p.lat!, p.lng!) }))
      .sort((a, b) => a.afstandKm! - b.afstandKm!);
    return { priser: medKoordinater.slice(0, ANTAL_STATIONER), søgtBy: "Din position" };
  }

  if (by && by.trim().length > 0) {
    const søgt = normaliser(by);
    const relevante = priserFundet.filter(
      (p) => normaliser(p.by).includes(søgt) || p.postnummer.startsWith(by.trim())
    );
    if (relevante.length > 0) {
      relevante.sort((a, b) => (a.benzin95 ?? Infinity) - (b.benzin95 ?? Infinity));
      return { priser: relevante.slice(0, ANTAL_STATIONER), søgtBy: by };
    }
    // Intet fundet for søgningen – vis billigst i hele landet i stedet.
    const billigst = [...priserFundet].sort((a, b) => (a.benzin95 ?? Infinity) - (b.benzin95 ?? Infinity));
    return { priser: billigst.slice(0, ANTAL_STATIONER), søgtBy: null };
  }

  const standard = priserFundet.filter((p) => normaliser(p.by).includes(normaliser(STANDARD_BY)));
  const grundlag = standard.length > 0 ? standard : priserFundet;
  grundlag.sort((a, b) => (a.benzin95 ?? Infinity) - (b.benzin95 ?? Infinity));
  return { priser: grundlag.slice(0, ANTAL_STATIONER), søgtBy: standard.length > 0 ? STANDARD_BY : null };
}

function tomtFald(): BenzinData {
  return {
    priser: [],
    søgtBy: null,
    kilde: "fallback",
    advarsel: "Alle tre datakilder (OK, Circle K/Ingo, Shell) fejlede lige nu.",
    hentetTidspunkt: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  (res as VercelResponse & { setHeader(name: string, value: string): void }).setHeader(
    "Cache-Control",
    "s-maxage=900, stale-while-revalidate=1800",
  );

  const by = typeof req.query.by === "string" ? req.query.by : null;
  const lat = typeof req.query.lat === "string" ? Number(req.query.lat) : null;
  const lng = typeof req.query.lng === "string" ? Number(req.query.lng) : null;
  const selskaberFilter =
    typeof req.query.selskaber === "string" && req.query.selskaber.length > 0
      ? req.query.selskaber.split(",")
      : null;

  try {
    // Cache dækker kun det uspecifikke, mest almindelige kald (ingen søgning).
    const ingenSøgning = !by && lat === null && lng === null && !selskaberFilter;
    if (ingenSøgning && cache && Date.now() - cache.hentetMs < CACHE_TTL_MS) {
      return res.status(200).json(cache.data);
    }

    const { alle, advarsel } = await hentAlleBenzinpriser();
    const filtreret = selskaberFilter ? alle.filter((p) => selskaberFilter.includes(p.selskab)) : alle;
    const { priser, søgtBy } = vælgStationer(filtreret, by, lat, lng);

    const data: BenzinData = {
      priser,
      søgtBy,
      kilde: "live",
      advarsel,
      hentetTidspunkt: new Date().toISOString(),
    };

    if (ingenSøgning) cache = { data, hentetMs: Date.now() };
    return res.status(200).json(data);
  } catch (fejl) {
    console.error("Kunne ikke hente nogen benzinpriser:", fejl);
    return res.status(200).json(tomtFald());
  }
}