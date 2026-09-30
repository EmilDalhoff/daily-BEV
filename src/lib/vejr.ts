import type { VejrData, VejrTime } from "../types";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface RåVejr {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    weather_code: number;
    direct_radiation?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    is_day: number[];
  };
  daily: {
    sunshine_duration: number[]; // sekunder
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

/**
 * Henter vejr for hele dagen (time for time) for en position (default: Aarhus).
 * Alle tider kommer i dansk lokaltid (timezone=Europe/Copenhagen), og vi læser
 * timer direkte fra tidsstemplerne i stedet for via Date.
 */
export async function hentVejr(
  breddegrad = 56.1629,
  længdegrad = 10.2039
): Promise<VejrData> {
  const params = new URLSearchParams({
    latitude: String(breddegrad),
    longitude: String(længdegrad),
    current:
      "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,direct_radiation",
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "is_day",
    ].join(","),
    daily: [
      "sunshine_duration",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "sunrise",
      "sunset",
      "uv_index_max",
    ].join(","),
    wind_speed_unit: "ms", // Open-Meteo bruger km/t som standard
    timezone: "Europe/Copenhagen",
    forecast_days: "1",
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo svarede ${res.status}`);
  }
  const json = (await res.json()) as RåVejr;
  const h = json.hourly;

  const timer: VejrTime[] = h.time.map((tid, i) => ({
    tid,
    temperatur: h.temperature_2m[i],
    føltTemperatur: h.apparent_temperature[i],
    nedbørSandsynlighed: h.precipitation_probability[i] ?? 0,
    nedbørMm: h.precipitation[i] ?? 0,
    vejrkode: h.weather_code[i],
    vind: h.wind_speed_10m[i],
    vindstød: h.wind_gusts_10m[i],
    erDag: h.is_day[i] === 1,
  }));

  const nuNøgle = json.current.time.slice(0, 13); // "ÅÅÅÅ-MM-DDTHH"
  const nuIndex = timer.findIndex((t) => t.tid.slice(0, 13) === nuNøgle);

  return {
    temperaturNu: json.current.temperature_2m,
    føltTemperaturNu: json.current.apparent_temperature,
    vindNu: json.current.wind_speed_10m,
    solindstrålingNu: json.current.direct_radiation ?? 0,
    vejrkode: json.current.weather_code,
    solTimerIDag: Math.round((json.daily.sunshine_duration[0] ?? 0) / 3600),
    timer,
    nuIndex,
    minTemp: json.daily.temperature_2m_min[0],
    maxTemp: json.daily.temperature_2m_max[0],
    nedbørIAlt: json.daily.precipitation_sum[0] ?? 0,
    solopgang: json.daily.sunrise[0].slice(11, 16),
    solnedgang: json.daily.sunset[0].slice(11, 16),
    uvMax: json.daily.uv_index_max[0] ?? 0,
    hentetTidspunkt: new Date().toISOString(),
  };
}

/** Oversætter Open-Meteo's WMO-vejrkoder til korte danske beskrivelser + emoji. */
export function vejrkodeTilTekst(
  kode: number,
  erDag = true
): { tekst: string; emoji: string } {
  const tabel: Record<number, { tekst: string; emoji: string }> = {
    0: { tekst: "Klart vejr", emoji: erDag ? "☀️" : "🌙" },
    1: { tekst: "Mest klart", emoji: erDag ? "🌤️" : "🌙" },
    2: { tekst: "Delvist skyet", emoji: erDag ? "⛅" : "☁️" },
    3: { tekst: "Overskyet", emoji: "☁️" },
    45: { tekst: "Tåge", emoji: "🌫️" },
    48: { tekst: "Rimtåge", emoji: "🌫️" },
    51: { tekst: "Let støvregn", emoji: "🌦️" },
    53: { tekst: "Støvregn", emoji: "🌦️" },
    55: { tekst: "Tæt støvregn", emoji: "🌧️" },
    56: { tekst: "Let isslud", emoji: "🌧️" },
    57: { tekst: "Isslud", emoji: "🌧️" },
    61: { tekst: "Let regn", emoji: "🌧️" },
    63: { tekst: "Regn", emoji: "🌧️" },
    65: { tekst: "Kraftig regn", emoji: "🌧️" },
    66: { tekst: "Let tøbrud", emoji: "🌧️" },
    67: { tekst: "Tøbrud", emoji: "🌧️" },
    71: { tekst: "Let sne", emoji: "🌨️" },
    73: { tekst: "Sne", emoji: "🌨️" },
    75: { tekst: "Kraftig sne", emoji: "❄️" },
    77: { tekst: "Snekorn", emoji: "🌨️" },
    80: { tekst: "Byger", emoji: "🌦️" },
    81: { tekst: "Kraftige byger", emoji: "🌧️" },
    82: { tekst: "Voldsomme byger", emoji: "⛈️" },
    85: { tekst: "Snebyger", emoji: "🌨️" },
    86: { tekst: "Kraftige snebyger", emoji: "❄️" },
    95: { tekst: "Tordenvejr", emoji: "⛈️" },
    96: { tekst: "Torden med hagl", emoji: "⛈️" },
    99: { tekst: "Kraftig torden med hagl", emoji: "⛈️" },
  };
  return tabel[kode] ?? { tekst: "Ukendt vejr", emoji: "🌡️" };
}

// ---------------------------------------------------------------------------
// Dagens dom: skal jeg have regntøj/jakke med?
// ---------------------------------------------------------------------------

export interface VejrDom {
  niveau: "godt" | "pas" | "dårligt";
  emoji: string;
  overskrift: string;
  detaljer: string[];
}

const SNEKODER = new Set([71, 73, 75, 77, 85, 86]);

const time = (tid: string) => tid.slice(11, 13);

/** Er timen "våd"? (høj sandsynlighed eller målbar nedbør) */
function erVåd(t: VejrTime) {
  return t.nedbørSandsynlighed >= 50 || t.nedbørMm >= 0.3;
}

/** Samler sammenhængende våde timer til perioder som "14–17". */
function våddePerioder(timer: VejrTime[]) {
  const perioder: { fra: string; til: string; mm: number }[] = [];
  let aktuel: { fra: number; til: number; mm: number } | null = null;

  for (const t of timer) {
    const h = Number(time(t.tid));
    if (!erVåd(t)) {
      if (aktuel) {
        perioder.push({ fra: String(aktuel.fra).padStart(2, "0"), til: String(aktuel.til).padStart(2, "0"), mm: aktuel.mm });
        aktuel = null;
      }
      continue;
    }
    if (aktuel && h === aktuel.til) {
      aktuel.til = h + 1;
      aktuel.mm += t.nedbørMm;
    } else {
      if (aktuel) {
        perioder.push({ fra: String(aktuel.fra).padStart(2, "0"), til: String(aktuel.til).padStart(2, "0"), mm: aktuel.mm });
      }
      aktuel = { fra: h, til: h + 1, mm: t.nedbørMm };
    }
  }
  if (aktuel) {
    perioder.push({ fra: String(aktuel.fra).padStart(2, "0"), til: String(aktuel.til).padStart(2, "0"), mm: aktuel.mm });
  }
  return perioder;
}

export function lavVejrDom(data: VejrData): VejrDom {
  const start = Math.max(data.nuIndex, 0);
  // Resten af dagen frem til kl. 22 er det, der er relevant at pakke til
  const kommende = data.timer.slice(start).filter((t) => Number(time(t.tid)) <= 22);
  const dagtimer = data.timer.filter((t) => t.erDag);

  const detaljer: string[] = [];

  // --- Regn ---
  const våde = kommende.filter(erVåd);
  const perioder = våddePerioder(kommende);
  const mmIAlt = våde.reduce((sum, t) => sum + t.nedbørMm, 0);
  const højesteSandsynlighed = Math.max(0, ...kommende.map((t) => t.nedbørSandsynlighed));
  const harSne = våde.some((t) => SNEKODER.has(t.vejrkode));
  const nedbørsType = harSne ? "Sne" : "Regn";

  for (const p of perioder) {
    detaljer.push(
      `${nedbørsType} kl. ${p.fra}–${p.til}${p.mm >= 0.1 ? ` (ca. ${p.mm.toFixed(1).replace(".", ",")} mm)` : ""}`
    );
  }

  let regntøj: "ja" | "måske" | "nej" = "nej";
  if (mmIAlt >= 1 || højesteSandsynlighed >= 70) regntøj = "ja";
  else if (våde.length > 0) regntøj = "måske";

  // --- Vind ---
  const stærkesteStød = Math.max(0, ...kommende.map((t) => t.vindstød));
  if (stærkesteStød >= 14) {
    detaljer.push(`Blæsende: vindstød op til ${Math.round(stærkesteStød)} m/s`);
  }

  // --- Temperatur ---
  const koldesteFølt = dagtimer.length
    ? Math.min(...dagtimer.map((t) => t.føltTemperatur))
    : data.minTemp;
  let jakke: "tyk" | "let" | "nej" = "nej";
  if (koldesteFølt <= 5) {
    jakke = "tyk";
    detaljer.push(`Tag en varm jakke – føles som ${Math.round(koldesteFølt)}° i dagtimerne`);
  } else if (koldesteFølt <= 12) {
    jakke = "let";
    detaljer.push(`Tag en jakke – føles ned til ${Math.round(koldesteFølt)}° i dagtimerne`);
  }
  if (data.maxTemp >= 25) {
    detaljer.push(`Varmt: op til ${Math.round(data.maxTemp)}° – husk vand`);
  }
  if (data.uvMax >= 6) {
    detaljer.push(`Høj UV (${Math.round(data.uvMax)}) – solcreme, hvis du er ude længe`);
  }

  // --- Overskrift og niveau ---
  let overskrift: string;
  let emoji: string;
  if (regntøj === "ja") {
    overskrift = harSne ? "Tag vintertøj med – der kommer sne" : "Tag regntøj med";
    emoji = "☔";
  } else if (regntøj === "måske") {
    overskrift = "Måske en byge – en paraply er nok";
    emoji = "🌂";
  } else if (jakke === "tyk") {
    overskrift = "Tørt, men koldt – tag en varm jakke";
    emoji = "🧥";
  } else if (jakke === "let") {
    overskrift = "Tørt vejr – en jakke er nok";
    emoji = "🧥";
  } else {
    overskrift = "Ingen regntøj nødvendigt";
    emoji = data.solTimerIDag >= 6 ? "😎" : "🙂";
  }

  if (regntøj === "nej") {
    detaljer.unshift("Ingen nedbør i vente resten af dagen");
  }

  const niveau: VejrDom["niveau"] =
    regntøj === "ja" || stærkesteStød >= 17 || jakke === "tyk"
      ? "dårligt"
      : regntøj === "måske" || jakke === "let" || stærkesteStød >= 14
        ? "pas"
        : "godt";

  return { niveau, emoji, overskrift, detaljer };
}