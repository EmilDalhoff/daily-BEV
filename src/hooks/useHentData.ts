import { useEffect, useRef, useState } from "react";
import type { HentResultat } from "../types";

/**
 * Generisk hook til at hente data, med simpelt polling-interval.
 * @param hentFn Funktion der returnerer et Promise med data.
 * @param intervalMs Hvor ofte data skal genhentes (ms). 0 = kun ved mount.
 * @param deps Afhængigheder der udløser genhentning (fx valgt prisområde).
 */
export function useHentData<T>(
  hentFn: () => Promise<T>,
  intervalMs = 0,
  deps: unknown[] = []
): HentResultat<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fejl, setFejl] = useState<string | null>(null);
  const hentFnRef = useRef(hentFn);
  hentFnRef.current = hentFn;

  useEffect(() => {
    let aktiv = true;

    async function hent() {
      setLoading(true);
      try {
        const resultat = await hentFnRef.current();
        if (aktiv) {
          setData(resultat);
          setFejl(null);
        }
      } catch (e) {
        if (aktiv) {
          setFejl(e instanceof Error ? e.message : "Ukendt fejl");
        }
      } finally {
        if (aktiv) setLoading(false);
      }
    }

    hent();

    if (intervalMs > 0) {
      const id = setInterval(hent, intervalMs);
      return () => {
        aktiv = false;
        clearInterval(id);
      };
    }
    return () => {
      aktiv = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, fejl };
}
