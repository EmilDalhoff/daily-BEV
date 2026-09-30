import { useCallback } from "react";
import { hentElpriser } from "../lib/energidata";
import type { PrisArea } from "../types";
import { useHentData } from "./useHentData";

const TI_MINUTTER = 10 * 60 * 1000;

export function useElpriser(område: PrisArea) {
  const hent = useCallback(() => hentElpriser(område), [område]);
  return useHentData(hent, TI_MINUTTER, [område]);
}
