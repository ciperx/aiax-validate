import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { validateSite } from "../dist/validate.js";

const run = promisify(execFile);
const CLI = new URL("../dist/cli.js", import.meta.url).pathname;
const FIXTURES = new URL("../fixtures/", import.meta.url).pathname;

async function cli(args) {
  try {
    const result = await run("node", [CLI, ...args]);
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("A1 the live sites pass with a score of 90 or more", async () => {
  for (const site of ["https://lax.kognai.ai", "https://www.kognai.ai"]) {
    const report = await validateSite(site);
    assert.equal(report.ok, true, `${site} must pass: ${JSON.stringify(report.errors).slice(0, 300)}`);
    assert.ok(report.score >= 90, `${site} scored ${report.score}`);
    assert.ok(report.sections.length >= 1);
  }
});

test("A2 a broken manifest fails with one clear message per problem, naming its field", async () => {
  const cases = [
    ["broken-manifest-missing", "/", 'updated_at'],
    ["broken-manifest-type", "/entry_points/0/est_tokens", "integer"],
    ["broken-manifest-extra", "/marketing_blurb", "not an allowed field"],
    ["broken-manifest-id", "/entry_points/0/id", "pattern"],
  ];
  for (const [fixture, path, needle] of cases) {
    const result = await cli(["https://lax.kognai.ai", "--fixtures", join(FIXTURES, fixture), "--json"]);
    assert.equal(result.code, 1, `${fixture} must exit 1`);
    const parsed = JSON.parse(result.stdout);
    const hit = parsed.errors.find((error) => error.path === path && error.message.toLowerCase().includes(needle.toLowerCase()));
    assert.ok(hit, `${fixture}: expected ${path} mentioning ${needle}, got ${JSON.stringify(parsed.errors)}`);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.score < 100);
  }
});

test("A3 a broken section fails with clear messages", async () => {
  const cases = [
    ["broken-section-missing", "pact_mandate_template"],
    ["broken-section-pricing", "pricing/amount"],
    ["broken-section-id", "section_id"],
    ["broken-section-json", "is not JSON"],
    ["broken-section-404", "answered 404"],
  ];
  for (const [fixture, needle] of cases) {
    const result = await cli(["https://lax.kognai.ai", "--fixtures", join(FIXTURES, fixture), "--json"]);
    assert.equal(result.code, 1, `${fixture} must exit 1`);
    const parsed = JSON.parse(result.stdout);
    const text = JSON.stringify(parsed.sections);
    assert.ok(text.includes(needle), `${fixture}: expected ${needle} in section errors, got ${text.slice(0, 300)}`);
    assert.equal(parsed.ok, false);
  }
});

test("A4 --json prints the report, the plain form prints one line per error, and the exit codes are 0, 1 and 2", async () => {
  const good = await cli(["https://lax.kognai.ai", "--fixtures", join(FIXTURES, "lax-good"), "--json"]);
  assert.equal(good.code, 0);
  const report = JSON.parse(good.stdout);
  assert.deepEqual(Object.keys(report).sort(), [
    "errors",
    "manifest_url",
    "ok",
    "score",
    "sections",
    "url",
    "warnings",
  ]);

  const bad = await cli(["https://lax.kognai.ai", "--fixtures", join(FIXTURES, "broken-manifest-type")]);
  assert.equal(bad.code, 1);
  const lines = bad.stdout.trim().split("\n");
  assert.ok(lines.length >= 2, "one header line plus one line per error");

  const usage = await cli([]);
  assert.equal(usage.code, 2);

  const notUrl = await cli(["not a url"]);
  assert.equal(notUrl.code, 2);
});

test("A5 the broken cases are committed fixtures and the package is ready to publish", async () => {
  const dirs = [
    "lax-good",
    "broken-manifest-missing",
    "broken-manifest-type",
    "broken-manifest-extra",
    "broken-manifest-id",
    "broken-section-missing",
    "broken-section-pricing",
    "broken-section-id",
    "broken-section-json",
    "broken-section-404",
  ];
  for (const dir of dirs) {
    const target = join(FIXTURES, dir, ".well-known", "aiax.json");
    const info = await stat(target);
    assert.ok(info.isFile(), `${dir} must hold a recorded manifest`);
  }
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url).pathname, "utf8"));
  assert.equal(pkg.name, "@ciperx/aiax-validate");
  assert.equal(pkg.bin["aiax-validate"], "dist/cli.js");
  assert.equal(pkg.license, "MIT");
});
