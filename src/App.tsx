import { useState } from "react";
import { BenzinKort } from "./components/BenzinKort";
import { ElprisKort } from "./components/ElprisKort";
import { TabBar, type Fane } from "./components/TabBar";
import { VejrKort } from "./components/VejrKort";
import type { PrisArea } from "./types";

const FANE_NØGLE = "dagligt:fane";

/** Husker hvilken fane du sidst var på (localStorage kan fejle, fx i privat tilstand). */
function læsFane(): Fane {
  try {
    const v = localStorage.getItem(FANE_NØGLE);
    if (v === "vejr" || v === "el" || v === "benzin") return v;
  } catch {
    /* ignorer */
  }
  return "vejr";
}

const dato = new Date().toLocaleDateString("da-DK", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function App() {
  const [fane, setFane] = useState<Fane>(læsFane);
  const [område, setOmråde] = useState<PrisArea>("DK1");

  function skiftFane(ny: Fane) {
    setFane(ny);
    try {
      localStorage.setItem(FANE_NØGLE, ny);
    } catch {
      /* ignorer */
    }
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-5 px-1">
        <p className="text-sm font-semibold capitalize text-paper/50">{dato}</p>
      </header>

      <main className="space-y-4">
        {fane === "vejr" && <VejrKort />}
        {fane === "el" && <ElprisKort område={område} onSkiftOmråde={setOmråde} />}
        {fane === "benzin" && <BenzinKort />}
      </main>

      <TabBar aktiv={fane} onSkift={skiftFane} />
    </div>
  );
}