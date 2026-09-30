import type { ElprisData, PrisArea } from "../types";

/**
 * Kalder vores egen serverless-funktion (/api/elpriser), som proxier
 * Energi Data Service server-side. Undgår CORS-problemer ved direkte
 * kald fra browseren til api.energidataservice.dk.
 */
export async function hentElpriser(område: PrisArea = "DK1"): Promise<ElprisData> {
  const res = await fetch(`/api/elpriser?omraade=${område}`);
  if (!res.ok) {
    throw new Error(`Elpris-API svarede ${res.status}`);
  }
  return (await res.json()) as ElprisData;
}
