import { useMemo } from "react";
import { useElpriser } from "../hooks/useElpriser";
import { useVejr } from "../hooks/useVejr";
import { klassificér } from "../lib/niveau";
import type { PrisArea } from "../types";

interface Props {
  område: PrisArea;
}

/**
 * Sammenfatter dagens data til én kort, handlingsorienteret sætning –
 * det første brugeren ser, uden at skulle tolke tal selv.
 */
export function StatusBanner({ område }: Props) {
  const { data: elpris } = useElpriser(område);
  const { data: vejr } = useVejr();

  const besked = useMemo(() => {
    if (!elpris || elpris.nuIndex < 0) {
      return { tekst: "Henter dagens overblik …", emoji: "⏳" };
    }
    const værdier = elpris.timer.map((t) => t.ørePerKWh);
    const min = Math.min(...værdier);
    const max = Math.max(...værdier);
    const nu = elpris.timer[elpris.nuIndex];
    const niveau = klassificér(nu.ørePerKWh, min, max);

    const solProducerer = (vejr?.solindstrålingNu ?? 0) > 200;

    if (niveau === "low") {
      return {
        tekst: "Strømmen er billig lige nu – god timing til vaskemaskine og opvasker.",
        emoji: "🟢",
      };
    }
    if (niveau === "high" && solProducerer) {
      return {
        tekst: "Strømmen er dyr, men solen skinner – kør på solcellerne, spar nettet.",
        emoji: "☀️",
      };
    }
    if (niveau === "high") {
      return {
        tekst: "Strømmen er dyr lige nu – vent med de store forbrugere til senere.",
        emoji: "🔴",
      };
    }
    return {
      tekst: "Strømprisen er til den middel side – hverken godt eller skidt tidspunkt.",
      emoji: "🟡",
    };
  }, [elpris, vejr]);

  return (
    <div className="rounded-md border border-boardline bg-boardline/40 px-5 py-4 text-center sm:text-left">
      <p className="text-base sm:text-lg">
        <span aria-hidden className="mr-2">
          {besked.emoji}
        </span>
        {besked.tekst}
      </p>
    </div>
  );
}
