import { useCallback } from "react";
import { hentBenzinpriser, type BenzinSøgning } from "../lib/benzin";
import { useHentData } from "./useHentData";

const TRE_TIMER = 3 * 60 * 60 * 1000;

export function useBenzin(søgning: BenzinSøgning = {}) {
  const { by, lat, lng, selskaber } = søgning;
  const selskaberKey = selskaber?.join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hent = useCallback(() => hentBenzinpriser(søgning), [by, lat, lng, selskaberKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useHentData(hent, TRE_TIMER, [by, lat, lng, selskaberKey]);
}