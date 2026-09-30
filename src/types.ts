export type PrisArea = "DK1" | "DK2";

export interface ElprisTime {
  /** Time i lokal tid, ISO-streng */
  tid: string;
  /** øre/kWh inkl. moms (25%) */
  ørePerKWh: number;
}

export interface ElprisData {
  område: PrisArea;
  timer: ElprisTime[];
  /** Indeks for den nuværende time i `timer`, eller -1 hvis ukendt */
  nuIndex: number;
  /** Hvilken kilde dataen faktisk kom fra – Energi Data Service, eller backup ved 429/fejl */
  kilde: "Energi Data Service" | "Elprisen lige nu (backup)";
  hentetTidspunkt: string;
}

export interface VejrTime {
  /** Dansk lokaltid som tekst, fx "2026-09-28T14:00" */
  tid: string;
  temperatur: number;
  føltTemperatur: number;
  /** Sandsynlighed for nedbør, 0-100 % */
  nedbørSandsynlighed: number;
  nedbørMm: number;
  vejrkode: number;
  /** m/s */
  vind: number;
  /** Vindstød, m/s */
  vindstød: number;
  erDag: boolean;
}

export interface VejrData {
  temperaturNu: number;
  føltTemperaturNu: number;
  vindNu: number; // m/s
  solindstrålingNu: number; // W/m², bruges som proxy for solcelleproduktion
  vejrkode: number;
  solTimerIDag: number;
  /** Alle dagens timer (00-23) */
  timer: VejrTime[];
  /** Indeks for den nuværende time i `timer`, eller -1 */
  nuIndex: number;
  minTemp: number;
  maxTemp: number;
  nedbørIAlt: number; // mm
  solopgang: string; // "HH:MM"
  solnedgang: string; // "HH:MM"
  uvMax: number;
  hentetTidspunkt: string;
}

export interface ValutaData {
  basis: "DKK";
  kurser: Record<string, number>; // f.eks. { EUR: 7.46, USD: 6.9 }
  hentetTidspunkt: string;
}

export type Benzinselskab = "OK" | "Circle K" | "Ingo" | "Shell";

export interface BenzinPris {
  selskab: Benzinselskab;
  stationNavn: string;
  by: string;
  postnummer: string;
  /** Kun til stede for kilder med koordinater (OK, Shell) */
  lat?: number;
  lng?: number;
  /** Udfyldt når der er søgt med "brug min position" */
  afstandKm?: number;
  benzin95: number | null;
  diesel: number | null;
  opdateret: string | null;
}

export interface BenzinData {
  priser: BenzinPris[];
  /** Byen der blev filtreret på – eller null hvis vi faldt tilbage til billigste i hele landet */
  søgtBy: string | null;
  kilde: "live" | "fallback";
  /** Sat hvis én af de to kilder (OK eller Circle K/Ingo) fejlede, men den anden virkede */
  advarsel: string | null;
  hentetTidspunkt: string;
}

export type Niveau = "low" | "mid" | "high";

export interface HentResultat<T> {
  data: T | null;
  loading: boolean;
  fejl: string | null;
}