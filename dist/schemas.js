// Vendored from github.com/Godman-s/aiax schemas at version 0.1, unchanged.
export const MANIFEST_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://raw.githubusercontent.com/Godman-s/aiax/main/schemas/manifest.schema.json",
    "title": "AIAX Manifest (Tier 0)",
    "description": "The /.well-known/aiax.json document. Target size: 100-300 tokens.",
    "type": "object",
    "required": [
        "aiax_version",
        "product",
        "entry_points",
        "pricing_summary",
        "trust_signals",
        "mcp_endpoint",
        "updated_at"
    ],
    "properties": {
        "aiax_version": {
            "type": "string",
            "description": "AIAX protocol version this document conforms to.",
            "enum": [
                "0.1"
            ]
        },
        "product": {
            "type": "object",
            "required": [
                "name",
                "one_line_purpose",
                "domain"
            ],
            "additionalProperties": false,
            "properties": {
                "name": {
                    "type": "string",
                    "maxLength": 60
                },
                "one_line_purpose": {
                    "type": "string",
                    "maxLength": 160
                },
                "domain": {
                    "type": "string",
                    "description": "Free-text domain tag (e.g. 'agent-invoicing', 'clinical-research', 'defi-payments').",
                    "maxLength": 60
                }
            }
        },
        "entry_points": {
            "type": "array",
            "description": "Tier 1 capability sections available on this surface.",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "url",
                    "purpose",
                    "est_tokens"
                ],
                "additionalProperties": false,
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Section identifier; matches the section_id in the Tier 1 document.",
                        "pattern": "^[a-z0-9][a-z0-9_-]{0,60}$"
                    },
                    "url": {
                        "type": "string",
                        "format": "uri-reference",
                        "description": "Absolute URL or path-relative URI reference (RFC 3986) to the Tier 1 section."
                    },
                    "purpose": {
                        "type": "string",
                        "description": "One-line summary of what this section covers.",
                        "maxLength": 200
                    },
                    "est_tokens": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5000,
                        "description": "Author's estimated token cost to fetch this section. Helps agents budget."
                    }
                }
            }
        },
        "pricing_summary": {
            "type": [
                "string",
                "null"
            ],
            "description": "One-line free-text pricing summary (e.g. '0.01 USDC per invoice'), or null.",
            "maxLength": 200
        },
        "trust_signals": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "score": {
                    "type": [
                        "number",
                        "null"
                    ],
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Sovereign Constitutional Output Rating (0-100), or null."
                },
                "pact_endpoint": {
                    "type": [
                        "string",
                        "null"
                    ],
                    "format": "uri",
                    "description": "URL to initiate PACT negotiation."
                },
                "drs_receipt_count": {
                    "type": [
                        "integer",
                        "null"
                    ],
                    "minimum": 0,
                    "description": "Lifetime count of settled DRS receipts."
                },
                "partnerships": {
                    "type": "array",
                    "maxItems": 5,
                    "items": {
                        "type": "string",
                        "maxLength": 60
                    }
                }
            }
        },
        "mcp_endpoint": {
            "type": [
                "string",
                "null"
            ],
            "format": "uri",
            "description": "Tier 2 MCP server URL, or null if the surface is REST-only."
        },
        "updated_at": {
            "type": "string",
            "format": "date-time",
            "description": "ISO-8601 timestamp of the most recent manifest update."
        },
        "llms_txt_url": {
            "type": "string",
            "format": "uri",
            "description": "Optional pointer to the narrative-counterpart llms.txt for this site."
        },
        "openapi_url": {
            "type": "string",
            "format": "uri",
            "description": "Optional pointer to an OpenAPI document if one exists for callable APIs."
        },
        "extensions": {
            "type": "object",
            "description": "Namespaced object for custom fields. Keys SHOULD use a vendor prefix.",
            "additionalProperties": true
        }
    },
    "additionalProperties": false
};
export const SECTION_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://raw.githubusercontent.com/Godman-s/aiax/main/schemas/section.schema.json",
    "title": "AIAX Capability Section (Tier 1)",
    "description": "A single capability section at /aiax/sections/<section_id>.json. Target size: 200-1,000 tokens.",
    "type": "object",
    "required": [
        "aiax_version",
        "section_id",
        "purpose",
        "inputs",
        "outputs",
        "pricing",
        "examples",
        "pact_mandate_template"
    ],
    "properties": {
        "aiax_version": {
            "type": "string",
            "enum": [
                "0.1"
            ]
        },
        "section_id": {
            "type": "string",
            "description": "Matches the entry_points[].id in the Tier 0 manifest.",
            "pattern": "^[a-z0-9][a-z0-9_-]{0,60}$"
        },
        "purpose": {
            "type": "string",
            "description": "One-paragraph description of what this capability does.",
            "maxLength": 600
        },
        "inputs": {
            "oneOf": [
                {
                    "type": "object",
                    "description": "Inline JSON Schema for the input.",
                    "additionalProperties": true
                },
                {
                    "type": "string",
                    "description": "Prose description (use only if JSON Schema is not yet authored).",
                    "maxLength": 400
                }
            ]
        },
        "outputs": {
            "oneOf": [
                {
                    "type": "object",
                    "description": "Inline JSON Schema for the output.",
                    "additionalProperties": true
                },
                {
                    "type": "string",
                    "maxLength": 400
                }
            ]
        },
        "pricing": {
            "type": [
                "object",
                "null"
            ],
            "additionalProperties": false,
            "required": [
                "model",
                "amount",
                "currency",
                "rail"
            ],
            "properties": {
                "model": {
                    "type": "string",
                    "description": "Pricing model: per_call, per_minute, per_token, flat, free, subscription.",
                    "enum": [
                        "per_call",
                        "per_minute",
                        "per_token",
                        "flat",
                        "free",
                        "subscription"
                    ]
                },
                "amount": {
                    "type": "string",
                    "description": "Amount as a string to preserve precision.",
                    "pattern": "^[0-9]+(\\.[0-9]+)?$"
                },
                "currency": {
                    "type": "string",
                    "description": "Currency code (e.g. USDC, USD, ETH, EUR).",
                    "maxLength": 10
                },
                "rail": {
                    "type": "string",
                    "description": "Payment rail (e.g. x402, usdc-base, stripe, lightning).",
                    "maxLength": 30
                }
            }
        },
        "examples": {
            "type": "array",
            "description": "1-3 representative request/response examples.",
            "minItems": 1,
            "maxItems": 3,
            "items": {
                "type": "object",
                "required": [
                    "description",
                    "request",
                    "response"
                ],
                "additionalProperties": false,
                "properties": {
                    "description": {
                        "type": "string",
                        "maxLength": 200
                    },
                    "request": {},
                    "response": {}
                }
            }
        },
        "pact_mandate_template": {
            "type": [
                "string",
                "null"
            ],
            "format": "uri",
            "description": "URL to a PACT mandate template that pre-fills negotiation parameters for this capability."
        },
        "mcp_tool_name": {
            "type": "string",
            "description": "Name of the MCP tool that performs this capability (Tier 2 binding).",
            "maxLength": 80
        },
        "openapi_operation_id": {
            "type": "string",
            "description": "operationId from the OpenAPI document, if this capability has a REST equivalent.",
            "maxLength": 120
        },
        "latency_p50_ms": {
            "type": "integer",
            "minimum": 0,
            "description": "Measured p50 response latency in milliseconds."
        },
        "latency_p99_ms": {
            "type": "integer",
            "minimum": 0,
            "description": "Measured p99 response latency in milliseconds."
        },
        "extensions": {
            "type": "object",
            "additionalProperties": true
        }
    },
    "additionalProperties": false
};
