import type { ValutaData } from "../types";

/**
 * Kalder vores egen serverless-funktion (/api/valuta), som proxier
 * Frankfurter.app server-side. Undgår CORS-problemer ved direkte kald
 * fra browseren.
 */
export async function hentValutakurser(
  valutaer: string[] = ["EUR", "USD", "GBP", "SEK", "NOK"]
): Promise<ValutaData> {
  const res = await fetch(`/api/valuta?valutaer=${valutaer.join(",")}`);
  if (!res.ok) {
    throw new Error(`Valuta-API svarede ${res.status}`);
  }
  return (await res.json()) as ValutaData;
}
