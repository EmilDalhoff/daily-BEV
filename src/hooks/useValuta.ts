import { hentValutakurser } from "../lib/valuta";
import { useHentData } from "./useHentData";

const EN_TIME = 60 * 60 * 1000;

export function useValuta() {
  return useHentData(hentValutakurser, EN_TIME, []);
}
