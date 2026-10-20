import { MANIFEST_SCHEMA, SECTION_SCHEMA } from "./schemas.js";
import { validate, type Problem } from "./schema.js";

export interface ReportEntry {
  url: string;
  path: string;
  message: string;
}

export interface SectionReport {
  id: string;
  url: string;
  ok: boolean;
  errors: ReportEntry[];
}

export interface Report {
  url: string;
  manifest_url: string;
  ok: boolean;
  score: number;
  errors: ReportEntry[];
  warnings: ReportEntry[];
  sections: SectionReport[];
}

export interface ValidateOptions {
  fetch?: typeof globalThis.fetch;
}

interface ManifestEntryPoint {
  id: string;
  url: string;
  purpose?: string;
  est_tokens?: number;
}

const MANIFEST_PATHS = ["/.well-known/aiax.json", "/aiax/manifest.json"];

function absolute(base: string): string {
  try {
    return new URL(base).toString();
  } catch {
    return base;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("the answer is not JSON");
  }
}

function toEntries(url: string, problems: Problem[]): ReportEntry[] {
  return problems.map((problem) => ({ url, path: problem.path, message: problem.message }));
}

export async function validateSite(url: string, options: ValidateOptions = {}): Promise<Report> {
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== "function") throw new Error("fetch is not available");

  const base = absolute(url);
  const errors: ReportEntry[] = [];
  const warnings: ReportEntry[] = [];
  const sections: SectionReport[] = [];

  let manifestUrl = absolute(new URL(MANIFEST_PATHS[0], base).toString());
  let manifest: unknown;
  let found = false;

  for (const candidate of MANIFEST_PATHS) {
    const target = absolute(new URL(candidate, base).toString());
    let response: Response;
    try {
      response = await doFetch(target);
    } catch (error) {
      errors.push({ url: target, path: "/", message: `cannot be fetched: ${(error as Error).message}` });
      continue;
    }
    if (!response.ok) {
      errors.push({ url: target, path: "/", message: `answered ${response.status}, expected 200` });
      continue;
    }
    try {
      manifest = await readJson(response);
    } catch (error) {
      errors.push({ url: target, path: "/", message: `is not JSON: ${(error as Error).message}` });
      continue;
    }
    manifestUrl = target;
    if (candidate !== MANIFEST_PATHS[0]) {
      warnings.push({ url: target, path: "/", message: "was found at the fallback path, the well-known path is preferred" });
    }
    found = true;
    break;
  }

  if (!found || manifest === undefined) {
    return {
      url: base,
      manifest_url: manifestUrl,
      ok: false,
      score: 0,
      errors,
      warnings,
      sections,
    };
  }

  errors.push(...toEntries(manifestUrl, validate(manifest, MANIFEST_SCHEMA)));

  const document = manifest as { entry_points?: ManifestEntryPoint[] };
  const entryPoints = Array.isArray(document.entry_points) ? document.entry_points : [];

  for (const entryPoint of entryPoints) {
    const id = typeof entryPoint?.id === "string" ? entryPoint.id : "unknown";
    const resolved = typeof entryPoint?.url === "string" ? absolute(new URL(entryPoint.url, manifestUrl).toString()) : "";
    if (!resolved) {
      const entry = { url: manifestUrl, path: `/entry_points/${id}/url`, message: "must be a url" };
      sections.push({ id, url: "", ok: false, errors: [entry] });
      errors.push(entry);
      continue;
    }

    let response: Response;
    try {
      response = await doFetch(resolved);
    } catch (error) {
      const entry = { url: resolved, path: "/", message: `cannot be fetched: ${(error as Error).message}` };
      sections.push({ id, url: resolved, ok: false, errors: [entry] });
      errors.push(entry);
      continue;
    }

    if (!response.ok) {
      const entry = { url: resolved, path: "/", message: `answered ${response.status}, expected 200` };
      sections.push({ id, url: resolved, ok: false, errors: [entry] });
      errors.push(entry);
      continue;
    }

    let section: unknown;
    try {
      section = await readJson(response);
    } catch {
      const entry = { url: resolved, path: "/", message: "is not JSON" };
      sections.push({ id, url: resolved, ok: false, errors: [entry] });
      errors.push(entry);
      continue;
    }

    const sectionErrors = toEntries(resolved, validate(section, SECTION_SCHEMA));
    const sectionId = (section as { section_id?: unknown })?.section_id;
    if (sectionId !== id) {
      sectionErrors.push({
        url: resolved,
        path: "/section_id",
        message: `must equal the entry point id "${id}", got ${JSON.stringify(sectionId)}`,
      });
    }
    sections.push({ id, url: resolved, ok: sectionErrors.length === 0, errors: sectionErrors });
    errors.push(...sectionErrors);
  }

  const score = Math.max(0, Math.min(100, 100 - errors.length * 8 - warnings.length * 3));
  return { url: base, manifest_url: manifestUrl, ok: errors.length === 0, score, errors, warnings, sections };
}
