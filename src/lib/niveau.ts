import type { Niveau } from "../types";

/**
 * Klassificerer en værdi i "billigt / middel / dyrt" ud fra dagens min/max.
 * Bruges til trafiklys-systemet for elpriser mv.
 */
export function klassificér(værdi: number, min: number, max: number): Niveau {
  if (max === min) return "mid";
  const andel = (værdi - min) / (max - min);
  if (andel <= 1 / 3) return "low";
  if (andel <= 2 / 3) return "mid";
  return "high";
}

export const niveauFarve: Record<Niveau, string> = {
  low: "bg-signal-low",
  mid: "bg-signal-mid",
  high: "bg-signal-high",
};

export const niveauTekstFarve: Record<Niveau, string> = {
  low: "text-signal-low",
  mid: "text-signal-mid",
  high: "text-signal-high",
};

export const niveauLabel: Record<Niveau, string> = {
  low: "Billigt",
  mid: "Middel",
  high: "Dyrt",
};
