import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

/**
 * Kører filerne i /api/*.ts direkte inde i `vite dev`, ved at loade dem
 * gennem Vites egen SSR-modul-loader (som allerede kan transformere
 * TypeScript). Det betyder at `npm run dev` er nok til at teste HELE
 * appen lokalt – ingen `vercel dev` eller Vercel-login nødvendig.
 *
 * Dette er kun et udviklingsværktøj: koden her rammer aldrig et rigtigt
 * build, og når du deployer til Vercel, er det Vercels egen runtime der
 * kører de samme filer i /api – ikke denne middleware.
 *
 * Bemærk: dette er en forsimplet stand-in for Vercels Node-runtime. Den
 * dækker det, vores funktioner bruger (req.query, res.status().json()),
 * men er ikke en fuld emulering af alle Vercel-specifikke request/response
 * -felter.
 */
export function localApiDevMiddleware(): Plugin {
  return {
    name: "local-api-dev-middleware",
    apply: "serve", // kører kun under `vite dev`, aldrig under `vite build`
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const funktionsNavn = url.pathname.replace(/^\/api\//, "").split("/")[0];
        const filsti = resolve(process.cwd(), `api/${funktionsNavn}.ts`);

        if (!funktionsNavn || !existsSync(filsti)) return next();

        // Udstyr det almindelige Node-request/response med de minimale
        // Vercel-lignende felter, vores funktioner bruger.
        (req as any).query = Object.fromEntries(url.searchParams.entries());
        (res as any).status = (kode: number) => {
          res.statusCode = kode;
          return res;
        };
        (res as any).json = (body: unknown) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        };

        try {
          const modul = await server.ssrLoadModule(filsti);
          const handler = modul.default as (req: unknown, res: unknown) => Promise<void> | void;
          await handler(req, res);
        } catch (fejl) {
          console.error(`[local-api-dev-middleware] Fejl i /api/${funktionsNavn}:`, fejl);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ fejl: "Lokal API-simulering fejlede – se terminalen." }));
        }
      });
    },
  };
}
