/**
 * Minimale, lokale erstatninger for typerne fra "@vercel/node".
 *
 * Vi importerede før hele @vercel/node-pakken bare for disse to typer,
 * men den trækker en stor mængde Vercel CLI-værktøj med sig (bl.a. til at
 * validere vercel.json), som vi aldrig bruger – og som var kilden til en
 * række npm audit-advarsler (ajv, path-to-regexp, undici). Ingen af de
 * pakker kører nogensinde i vores kode: hverken i browseren eller i selve
 * Vercel-runtimen når funktionen deployes (Vercel bruger sin egen interne
 * håndtering af request/response, uafhængigt af denne npm-pakke).
 *
 * De to typer her dækker præcis det, vores /api-funktioner rent faktisk
 * bruger: `req.query` og `res.status().json()`.
 */

export interface VercelRequest {
  query: Partial<Record<string, string | string[]>>;
}

export interface VercelResponse {
  status(statusCode: number): VercelResponse;
  json(body: unknown): VercelResponse;
}
