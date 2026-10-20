# aiax-validate

Validates a site's AIAX manifest and its capability sections against the AIAX 0.1 schemas,
scores the site, and prints one plain message per problem.

## Use

```sh
npx aiax-validate https://lax.kognai.ai
npx aiax-validate https://lax.kognai.ai --json
npx aiax-validate https://lax.kognai.ai --fixtures ./fixtures/lax-good
```

Exit codes: `0` when the site is valid, `1` when it is not, `2` on a usage error.

The manifest is looked for at `/.well-known/aiax.json`, then `/aiax/manifest.json`. Every
entry point `url` is resolved against the manifest URL and fetched. Without `--json` the tool
prints a header line and one line per error, each naming the document, the JSON pointer and
the problem.

## Library

```js
import { validateSite } from "@ciperx/aiax-validate";

const report = await validateSite("https://lax.kognai.ai", { fetch: myFetch });
```

`Report`:

- `url`, `manifest_url`.
- `ok`, true when there is no error.
- `score`, 0 to 100: 100 with no error and no warning, 8 points off per error and 3 per
  warning, never below 0.
- `errors` and `warnings`, each `{url, path, message}` where `path` is a JSON pointer such as
  `/entry_points/0/est_tokens` and `/` is the document root.
- `sections`, each `{id, url, ok, errors}`.

A missing manifest, a section that cannot be fetched or is not JSON, and a section whose
`section_id` differs from its entry point id are errors, not warnings. The only warning the
tool raises today is a manifest found at the fallback path.

`fetch` can be injected, which is how the tests run offline.

## --fixtures

`--fixtures <dir>` answers every request from a file: the URL path under the directory, so
`https://lax.kognai.ai/aiax/sections/lax_offer.json` reads `<dir>/aiax/sections/lax_offer.json`.
A missing file is a 404.

## Schemas

`src/schemas.ts` holds the two schemas from `github.com/Godman-s/aiax` at version 0.1,
unchanged, vendored by `scripts/vendor-schemas.py`. `src/schema.ts` is a small validator for
the subset they use: type, required, properties, additionalProperties, enum, pattern,
maxLength, minItems, maxItems, items, minimum, maximum, format (uri, uri-reference, date-time)
and oneOf.

## Tests

```sh
npm test
```

Five tests, named after the acceptance item they prove:

- A1 the live sites pass with a score of 90 or more.
- A2 a broken manifest fails with one clear message per problem, naming its field: a missing
  required field, a wrong type, an extra field, a bad entry point id.
- A3 a broken section fails: a missing field, a bad pricing amount, a `section_id` that differs
  from its entry point, a section that is not JSON, a section that answers 404.
- A4 `--json` prints the report, the plain form prints one line per error, and the exit codes
  are 0, 1 and 2.
- A5 the broken cases are committed fixtures and the package is ready to publish.

`fixtures/` holds a recorded copy of the live `lax.kognai.ai` documents and nine derived broken
cases, produced by `scripts/record-fixtures.py`.

## npm

The package is publish ready: name `@ciperx/aiax-validate`, bin `aiax-validate`, MIT. Account
creation on npmjs.com sits behind a Cloudflare Turnstile challenge, which an automated agent
cannot pass, so publishing needs a human with an npm account or an access token. The tarball
built by `npm pack` installs the same code with `npm install -g ./ciperx-aiax-validate-1.0.0.tgz`.
