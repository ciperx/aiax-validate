#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateSite } from "./validate.js";
function fixtureFetch(dir) {
    return (async (input) => {
        const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const pathname = new URL(target).pathname;
        const file = join(dir, pathname);
        try {
            const text = await readFile(file, "utf8");
            return new Response(text, { status: 200, headers: { "content-type": "application/json" } });
        }
        catch {
            return new Response("not found", { status: 404 });
        }
    });
}
function printPlain(report) {
    if (report.ok) {
        process.stdout.write(`valid: ${report.manifest_url} score ${report.score}\n`);
        return;
    }
    process.stdout.write(`invalid: ${report.manifest_url} score ${report.score}\n`);
    for (const error of report.errors) {
        process.stdout.write(`${error.url} ${error.path} ${error.message}\n`);
    }
    for (const warning of report.warnings) {
        process.stdout.write(`warning: ${warning.url} ${warning.path} ${warning.message}\n`);
    }
}
async function main() {
    const argv = process.argv.slice(2);
    let url;
    let json = false;
    let fixtures;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--json")
            json = true;
        else if (arg === "--fixtures") {
            fixtures = argv[i + 1];
            if (!fixtures)
                throw new Error("--fixtures needs a directory");
            i += 1;
        }
        else if (arg === "--help" || arg === "-h") {
            process.stdout.write("usage: aiax-validate <url> [--json] [--fixtures <dir>]\n");
            return;
        }
        else if (arg.startsWith("--")) {
            throw new Error(`unknown option ${arg}`);
        }
        else if (!url)
            url = arg;
        else
            throw new Error(`unexpected argument ${arg}`);
    }
    if (!url) {
        process.stderr.write("usage: aiax-validate <url> [--json] [--fixtures <dir>]\n");
        process.exitCode = 2;
        return;
    }
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        process.stderr.write(`not a url: ${url}\n`);
        process.exitCode = 2;
        return;
    }
    const report = await validateSite(parsed.toString(), fixtures ? { fetch: fixtureFetch(fixtures) } : {});
    if (json)
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else
        printPlain(report);
    process.exitCode = report.ok ? 0 : 1;
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});
