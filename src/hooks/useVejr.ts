import { useCallback } from "react";
import { hentVejr } from "../lib/vejr";
import { useHentData } from "./useHentData";

const TREDIVE_MINUTTER = 30 * 60 * 1000;

export function useVejr(breddegrad?: number, længdegrad?: number) {
  const hent = useCallback(() => hentVejr(breddegrad, længdegrad), [breddegrad, længdegrad]);
  return useHentData(hent, TREDIVE_MINUTTER, [breddegrad, længdegrad]);
}
