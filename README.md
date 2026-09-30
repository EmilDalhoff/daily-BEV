# Dagligt Dashboard

En lille PWA der samler elpriser, benzinpriser, vejr/sol og valutakurser i ét overblik.
Bygget med **Vite + React + TypeScript + Tailwind CSS**.

## Kom i gang lokalt

Ingen `.env`-fil er nødvendig – alle datakilder er gratis og nøglefri. Der findes en
`.env.example` med ét valgfrit felt (`FUEL_CITY`), hvis du vil ændre hvilken by
benzinkortet viser stationer for.

```bash
npm install
npm run dev
```

Åbn `http://localhost:5173` – **det er det hele.** Alle fire kort, inkl. Elpris, Valuta og
Benzin, virker med det samme. Det skyldes en lille dev-only Vite-plugin
(`vite-plugins/localApiDevMiddleware.ts`), som kører filerne i `/api` direkte inde i
`vite dev`, så du ikke behøver `vercel dev` eller en Vercel-konto for at teste lokalt.

Pluginet kører **kun** under `npm run dev` (`apply: "serve"`) – det rører aldrig
production-builden. Når du deployer til Vercel, er det Vercels egen runtime, der kører de
samme `/api`-filer; pluginet er udelukkende en bekvemmelighed til lokal udvikling.

### Hvorfor kalder elpris og valuta /api i stedet for den eksterne URL direkte?

De blev oprindeligt kaldt direkte fra browseren, men det viste sig i praksis at give en
generisk `Failed to fetch`-fejl – typisk tegn på at kilden ikke sender de CORS-headers
(`Access-Control-Allow-Origin`), som browsere kræver for at en anden origin (din app) må læse
svaret. Løsningen er at proxy'e kaldet gennem vores egen serverless-funktion
(`api/elpriser.ts`, `api/valuta.ts`): server-til-server-kald rammer aldrig CORS, så det er en
robust fix uanset kildens CORS-politik. Samme mønster som benzin-kortet allerede brugte.


## Deploy (Vercel – anbefalet)

1. Push koden til et GitHub-repo.
2. Gå til [vercel.com](https://vercel.com) → "Add New Project" → vælg dit repo.
3. Vercel opdager automatisk Vite-projektet og `api/`-mappen som serverless functions.
   Ingen miljøvariabler er nødvendige – alle APIs, der bruges, er gratis og uden nøgle.
4. Deploy. Din app er nu på `https://dit-projekt.vercel.app`.

### Installér som app på telefonen

- **iPhone**: Åbn siden i Safari → Del-ikon → "Føj til hjemmeskærm".
- **Android**: Åbn siden i Chrome → menu (⋮) → "Installer app" / "Føj til startskærm".

## Datakilder – og hvad du bør vide om hver

| Kilde | Bruges til | Nøgle krævet? | Bemærkning |
|---|---|---|---|
| [Energi Data Service](https://www.energidataservice.dk/) | Elpriser (spotpris, øre/kWh) | Nej | Kaldes via `api/elpriser.ts` (se afsnittet ovenfor om hvorfor). Viser kun spotpris inkl. moms – **ikke** transport/nettarif/afgifter, som typisk lægger 100+ øre/kWh oveni. |
| [Open-Meteo](https://open-meteo.com/) | Vejr, sol/solindstråling | Nej | Kaldes direkte fra browseren (`src/lib/vejr.ts`) – understøtter CORS, så ingen proxy nødvendig. `direct_radiation` bruges som **proxy** for solcelleproduktion, ikke en præcis prognose for dit specifikke anlæg. |
| [Frankfurter.app](https://www.frankfurter.app/) | Valutakurser | Nej | Kaldes via `api/valuta.ts` (se afsnittet ovenfor). Bruger ECB's referencekurser (opdateres typisk hverdage ~16 CET). Ikke egnet til handel, kun overblik. |
| [OK](https://mobility-prices.ok.dk/api/v1/fuel-prices) | Benzin/diesel | Nej | Officielt, offentligt API. Cached op til 2 min på OK's side. Giver koordinater, så du kan udvide til kort-visning. |
| [Circle K](https://api.circlek.com/eu/prices) | Benzin/diesel (Circle K + Ingo) | Nej, kun header `X-App-Name: PRICES` | Officielt API. Dækker **også** Ingo-stationer (Circle K's ubemandede lavpris-brand) i samme svar – kendes på at `name` starter med "INGO". Brug bulk-endpointet (`countries/DK`), ikke `sites/{siteId}` som har kendte rate-limit-problemer. |

### Om benzinpriser

`api/benzin.ts` kalder **begge** API'er parallelt (`Promise.allSettled`), slår resultaterne
sammen, filtrerer til den by du har sat i `FUEL_CITY` (default `Aarhus`, matcher også
"Aarhus C" osv.), og viser de billigste stationer på tværs af OK, Circle K og Ingo. Fejler
den ene kilde, vises den anden stadig, med en lille advarsel i UI'et. Falder byfilteret helt
tomt ud (fx en meget lille by), vises i stedet de billigste stationer i hele landet.

Bemærk: priserne er **ikke** ens på tværs af brands/stationer – det er bl.a. hele pointen med
Ingo, at de sætter en lavere pris end de fuldt betjente Circle K-stationer. Vil du have flere
kæder med (Shell, Q8, Uno-X …), er de ikke dækket af nogen af disse to API'er; her findes
betalte tredjeparts-API'er som `benzinpriseridag.dk` eller `fuelfinder.dk`. Da resten af appen
kun kender til `BenzinData`-typen i `src/types.ts`, er det nemt at tilføje en tredje kilde ved
siden af de to eksisterende i `api/benzin.ts`.

## Projektstruktur

```
src/
  lib/            → Rå API-klienter (én fil pr. datakilde)
  hooks/          → React-hooks der wrapper API-klienterne (polling, loading, fejl)
  components/     → UI-kort, ét pr. datakilde + status-banner
  types.ts        → Fælles TypeScript-typer
api/
  benzin.ts       → Vercel serverless function (scraping, se ovenfor)
```

## Idéer til videreudvikling

- **Push-notifikationer**: Kræver en backend/cron-service (fx Vercel Cron + Web Push), da
  ren PWA ikke kan vække sig selv kl. 13:15 uden en server, der trigger det.
- **Historik/graf over tid**: Gem daglige snapshots i en lille database (fx Vercel KV eller
  Supabase) for at kunne vise trends, ikke kun "lige nu".
- **Egen lokation til vejr/sol**: Brug `navigator.geolocation` i stedet for hardkodet
  Aarhus-koordinat i `src/hooks/useVejr.ts`.
- **Flere benzinselskaber**: Se afsnittet om benzin-API ovenfor.

## Afhængigheder

`npm audit` viser 0 sårbarheder. To pakker blev bevidst fjernet undervejs:

- **`@vercel/node`** – blev kun brugt til to TypeScript-typer (`VercelRequest`,
  `VercelResponse`). De er nu defineret lokalt i `api/_types.ts` i stedet, hvilket fjerner en
  stor, unødvendig afhængighedskæde (og de `ajv`/`path-to-regexp`/`undici`-sårbarheder den
  bragte med sig).
- **`cheerio`** – rest fra en tidligere HTML-scraping-baseret version af benzin-kortet, som
  siden blev erstattet af OK's og Circle K's rigtige JSON-API'er. Ubrugt, derfor fjernet.

## Om teknologivalget

Jeg har holdt mig til **Vite** frem for Next.js – til en SPA/PWA uden SEO-behov er Vite
markant hurtigere i dev og giver et simplere build. Next.js ville give mening, hvis du
senere vil have server-side rendering, flere sider, eller mere avanceret routing.

`vite-plugin-pwa` klarer manifest + service worker automatisk (inkl. caching-strategier
defineret i `vite.config.ts`), så du undgår at skrive en service worker i hånden.
