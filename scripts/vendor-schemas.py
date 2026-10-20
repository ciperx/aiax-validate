import json

m = json.load(open("/tmp/aiax_manifest.schema.json"))
s = json.load(open("/tmp/aiax_section.schema.json"))
out = "// Vendored from github.com/Godman-s/aiax schemas at version 0.1, unchanged.\n"
out += "export const MANIFEST_SCHEMA: Record<string, unknown> = " + json.dumps(m, indent=2) + ";\n\n"
out += "export const SECTION_SCHEMA: Record<string, unknown> = " + json.dumps(s, indent=2) + ";\n"
open("src/schemas.ts", "w").write(out)
print("wrote", len(out))
