"""Record the live lax.kognai.ai AIAX documents into fixtures, then derive broken cases."""
import json
import os
import copy
import urllib.request

BASE = "https://lax.kognai.ai"
ROOT = "fixtures"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as response:
        return response.read().decode()


def write(directory, path, text):
    target = os.path.join(ROOT, directory, path.lstrip("/"))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w") as handle:
        handle.write(text)


manifest_text = get("/.well-known/aiax.json")
manifest = json.loads(manifest_text)
write("lax-good", "/.well-known/aiax.json", json.dumps(manifest, indent=2) + "\n")
for entry in manifest["entry_points"]:
    write("lax-good", entry["url"], get(entry["url"]))

# A2: a broken manifest, one case per problem class.
missing = copy.deepcopy(manifest)
missing.pop("updated_at", None)
write("broken-manifest-missing", "/.well-known/aiax.json", json.dumps(missing, indent=2) + "\n")

wrong = copy.deepcopy(manifest)
wrong["entry_points"][0]["est_tokens"] = "1403"
write("broken-manifest-type", "/.well-known/aiax.json", json.dumps(wrong, indent=2) + "\n")

extra = copy.deepcopy(manifest)
extra["marketing_blurb"] = "not in the schema"
write("broken-manifest-extra", "/.well-known/aiax.json", json.dumps(extra, indent=2) + "\n")

badid = copy.deepcopy(manifest)
badid["entry_points"][0]["id"] = "LAX_Offer"
write("broken-manifest-id", "/.well-known/aiax.json", json.dumps(badid, indent=2) + "\n")

# A3: broken sections, each with a good manifest around it.
section_text = get(manifest["entry_points"][0]["url"])
section = json.loads(section_text)


def section_case(name, mutate=None, raw=None, skip=False):
    write(name, "/.well-known/aiax.json", json.dumps(manifest, indent=2) + "\n")
    if not skip:
        write(name, manifest["entry_points"][0]["url"], raw if raw is not None else json.dumps(mutate, indent=2) + "\n")
    for entry in manifest["entry_points"][1:]:
        write(name, entry["url"], get(entry["url"]))


missing_field = copy.deepcopy(section)
missing_field.pop("pact_mandate_template", None)
section_case("broken-section-missing", missing_field)

bad_pricing = copy.deepcopy(section)
bad_pricing["pricing"]["amount"] = 0.01
section_case("broken-section-pricing", bad_pricing)

mismatch = copy.deepcopy(section)
mismatch["section_id"] = "not_the_entry_point"
section_case("broken-section-id", mismatch)

section_case("broken-section-json", raw="{not json")
section_case("broken-section-404", skip=True)

print("fixtures written")
