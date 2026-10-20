/**
 * A small JSON Schema validator for the subset the AIAX 0.1 schemas use:
 * type, required, properties, additionalProperties, enum, pattern, maxLength,
 * minItems, maxItems, items, minimum, maximum, format (uri, uri-reference,
 * date-time) and oneOf.
 *
 * It returns one entry per problem, with a JSON pointer path and a plain message.
 */

export interface Problem {
  path: string;
  message: string;
}

type Schema = Record<string, unknown>;

const FORMATS: Record<string, RegExp> = {
  uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]+$/,
  "uri-reference": /^[^\s]+$/,
  "date-time": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
};

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  if (type === "integer") return actual === "integer";
  return actual === type;
}

function pointer(base: string, key: string | number): string {
  return `${base}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

export function validate(document: unknown, schema: Schema, base = ""): Problem[] {
  const problems: Problem[] = [];
  const at = base === "" ? "/" : base;

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((type) => matchesType(document, type))) {
      problems.push({ path: at, message: `must be ${types.join(" or ")}, got ${typeOf(document)}` });
      return problems;
    }
  }

  if (schema.enum !== undefined) {
    const allowed = schema.enum as unknown[];
    if (!allowed.some((value) => JSON.stringify(value) === JSON.stringify(document))) {
      problems.push({ path: at, message: `must be one of ${allowed.map((v) => JSON.stringify(v)).join(", ")}` });
    }
  }

  if (schema.oneOf !== undefined) {
    const options = schema.oneOf as Schema[];
    const passing = options.filter((option) => validate(document, option, base).length === 0);
    if (passing.length !== 1) {
      problems.push({
        path: at,
        message: `must match exactly one of the ${options.length} allowed shapes, matched ${passing.length}`,
      });
    }
    return problems;
  }

  if (typeof document === "string") {
    if (typeof schema.maxLength === "number" && document.length > schema.maxLength) {
      problems.push({ path: at, message: `must be at most ${schema.maxLength} characters, got ${document.length}` });
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(document)) {
      problems.push({ path: at, message: `must match the pattern ${schema.pattern}` });
    }
    if (typeof schema.format === "string") {
      const rule = FORMATS[schema.format];
      if (rule && !rule.test(document)) {
        problems.push({ path: at, message: `must be a valid ${schema.format}` });
      }
    }
  }

  if (typeof document === "number") {
    if (typeof schema.minimum === "number" && document < schema.minimum) {
      problems.push({ path: at, message: `must be at least ${schema.minimum}, got ${document}` });
    }
    if (typeof schema.maximum === "number" && document > schema.maximum) {
      problems.push({ path: at, message: `must be at most ${schema.maximum}, got ${document}` });
    }
  }

  if (Array.isArray(document)) {
    if (typeof schema.minItems === "number" && document.length < schema.minItems) {
      problems.push({ path: at, message: `must hold at least ${schema.minItems} items, got ${document.length}` });
    }
    if (typeof schema.maxItems === "number" && document.length > schema.maxItems) {
      problems.push({ path: at, message: `must hold at most ${schema.maxItems} items, got ${document.length}` });
    }
    if (schema.items && typeof schema.items === "object") {
      document.forEach((item, index) => {
        problems.push(...validate(item, schema.items as Schema, pointer(at === "/" ? "" : at, index)));
      });
    }
  }

  if (document !== null && typeof document === "object" && !Array.isArray(document)) {
    const object = document as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, Schema>;
    const required = (schema.required ?? []) as string[];

    for (const key of required) {
      if (!(key in object)) problems.push({ path: at, message: `is missing the required field "${key}"` });
    }

    for (const [key, value] of Object.entries(object)) {
      const childSchema = properties[key];
      if (childSchema) {
        problems.push(...validate(value, childSchema, pointer(at === "/" ? "" : at, key)));
        continue;
      }
      if (schema.additionalProperties === false) {
        problems.push({ path: pointer(at === "/" ? "" : at, key), message: `is not an allowed field` });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        problems.push(...validate(value, schema.additionalProperties as Schema, pointer(at === "/" ? "" : at, key)));
      }
    }
  }

  return problems;
}
