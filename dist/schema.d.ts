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
export declare function validate(document: unknown, schema: Schema, base?: string): Problem[];
export {};
