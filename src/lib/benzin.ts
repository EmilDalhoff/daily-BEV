import type { Benzinselskab, BenzinData } from "../types";

export interface BenzinSøgning {
  by?: string;
  lat?: number;
  lng?: number;
  selskaber?: Benzinselskab[];
}

export async function hentBenzinpriser(søgning: BenzinSøgning = {}): Promise<BenzinData> {
  const params = new URLSearchParams();
  if (søgning.by) params.set("by", søgning.by);
  if (søgning.lat !== undefined) params.set("lat", String(søgning.lat));
  if (søgning.lng !== undefined) params.set("lng", String(søgning.lng));
  if (søgning.selskaber && søgning.selskaber.length > 0) {
    params.set("selskaber", søgning.selskaber.join(","));
  }

  const qs = params.toString();
  const res = await fetch(`/api/benzin${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new Error(`Benzin-API svarede ${res.status}`);
  }
  return (await res.json()) as BenzinData;
}