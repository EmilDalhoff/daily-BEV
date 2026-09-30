import type { IkonNavn } from "../components/Ikon";
import type { Niveau } from "../types";

export type HumørNiveau = "glad" | "neutral" | "sur";

export interface Dom {
  humør: HumørNiveau;
  overskrift: string;
  detaljer: string[];
}

export const humørIkon: Record<HumørNiveau, IkonNavn> = {
  glad: "glad",
  neutral: "neutral",
  sur: "sur",
};

export const humørBaggrund: Record<HumørNiveau, string> = {
  glad: "bg-signal-low/15",
  neutral: "bg-signal-mid/20",
  sur: "bg-signal-high/15",
};

/**
 * Dagens dom for elprisen. Tager evt. solindstråling med, så det ikke bare
 * bliver "dyrt = surt", når solcellerne alligevel dækker forbruget.
 */
export function elDom(niveau: Niveau, solindstråling = 0): Dom {
  const solProducerer = solindstråling > 200;

  if (niveau === "low") {
    return {
      humør: "glad",
      overskrift: "Billig strøm – god timing til vaskemaskine og opvasker",
      detaljer: solProducerer ? ["Solen skinner oveni, så det er dobbelt op"] : [],
    };
  }

  if (niveau === "high") {
    if (solProducerer) {
      return {
        humør: "neutral",
        overskrift: "Dyr strøm, men solen skinner",
        detaljer: ["Kør på solcellerne i stedet for nettet, hvis du kan"],
      };
    }
    return {
      humør: "sur",
      overskrift: "Dyr strøm lige nu – vent, hvis du kan",
      detaljer: ["De store forbrugere kan med fordel vente til senere"],
    };
  }

  return {
    humør: "neutral",
    overskrift: "Middel pris – hverken godt eller skidt tidspunkt",
    detaljer: [],
  };
}

/**
 * Dagens dom for benzinprisen ved en given station, ift. det billigste
 * fundne i søgningen. Bruges når Benzin-kortet bygges om.
 */
export function benzinDom(prisNu: number, billigstFundet: number): Dom {
  const forskel = prisNu - billigstFundet;

  if (forskel <= 0.05) {
    return {
      humør: "glad",
      overskrift: "Det er en af de billigste, du kan finde",
      detaljer: [],
    };
  }
  if (forskel <= 0.3) {
    return {
      humør: "neutral",
      overskrift: "Meget tæt på den billigste pris",
      detaljer: [],
    };
  }
  return {
    humør: "sur",
    overskrift: `${forskel.toFixed(2).replace(".", ",")} kr dyrere end den billigste`,
    detaljer: [],
  };
}