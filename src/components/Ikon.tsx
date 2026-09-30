export type IkonNavn =
  | "sol"
  | "solsky"
  | "solregn"
  | "sky"
  | "regn"
  | "torden"
  | "sne"
  | "taage"
  | "maane"
  | "paraply"
  | "pumpe"
  | "lyn"
  | "vind"
  | "dryppe"
  | "termometer"
  | "jakke"
  | "glad"
  | "neutral"
  | "sur";

interface Props {
  navn: IkonNavn;
  størrelse?: number;
  className?: string;
}

/** 3D-ikon fra /public/icons (Microsoft Fluent Emoji, MIT-licens). */
export function Ikon({ navn, størrelse = 48, className = "" }: Props) {
  return (
    <img
      src={`/icons/${navn}.webp`}
      width={størrelse}
      height={størrelse}
      alt=""
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}

/** Vælger ikon ud fra Open-Meteo's WMO-vejrkode. */
export function vejrIkon(kode: number, erDag = true): IkonNavn {
  if (kode === 0 || kode === 1) return erDag ? "sol" : "maane";
  if (kode === 2) return erDag ? "solsky" : "sky";
  if (kode === 3) return "sky";
  if (kode === 45 || kode === 48) return "taage";
  if ([71, 73, 75, 77, 85, 86].includes(kode)) return "sne";
  if ([82, 95, 96, 99].includes(kode)) return "torden";
  if ([51, 61, 80].includes(kode)) return erDag ? "solregn" : "regn";
  if (kode >= 51 && kode <= 81) return "regn";
  return "sky";
}