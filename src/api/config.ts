import { t, status } from "elysia";
import { Value } from "@sinclair/typebox/value";
import type { ApiInstance } from "@/apps/api.ts";
import { authorize } from "@/services/auth.ts";
import { FP_MANAGE_CONFIGURATION } from "@/services/auth/functional_perms.ts";
import { getAllConfigEntries, getConfigEntriesByKey, upsertConfigEntry } from "@/repo/ConfigRepo.ts";
import { parseConfigValue, schemaForConfigType, validateConfigInputFormat } from "@/services/config_validation.ts";
import type { ConfigEntryType } from "@/types/ConfigEntry.ts";
import PubSub from "@/services/pubsub.ts";

const pubsub_Config = "config";
const pubsub_ConfigUpdated = `${pubsub_Config}.updated`;

function canonicalizeJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
    if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = canonicalizeJson(obj[key]);
            return acc;
        }, {});
    }
    return value;
}

function equalsJson(a: unknown, b: unknown): boolean {
    return JSON.stringify(canonicalizeJson(a)) === JSON.stringify(canonicalizeJson(b));
}

function toUiEntry(entry: ConfigEntryType) {
    return {
        domain: entry.domain,
        key: entry.key,
        description: entry.description,
        type: entry.type,
        value: entry.value,
        inputFormat: entry.inputFormat,
        outputFormat: entry.outputFormat,
    };
}

// noinspection JSUnusedGlobalSymbols
export default function register(app: ApiInstance) {
    app.get("/config", async ({ dbClient, session, tokenClaims }) => {
        const authz = await authorize(dbClient, session?.idTokenClaims ?? tokenClaims ?? {}, [FP_MANAGE_CONFIGURATION]);
        if (!authz.some((perm) => perm.identifier === FP_MANAGE_CONFIGURATION.identifier)) {
            return status(403, `Permission denied. Required: ${FP_MANAGE_CONFIGURATION.functionalPermissionName}`);
        }

        const entries = await getAllConfigEntries(dbClient, true);
        const grouped = entries.reduce<Map<string, ReturnType<typeof toUiEntry>[]>>((acc, entry) => {
            if (!acc.has(entry.domain)) acc.set(entry.domain, []);
            acc.get(entry.domain)!.push(toUiEntry(entry));
            return acc;
        }, new Map());

        const domains = [...grouped.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([domain, domainEntries]) => ({
                domain,
                entries: domainEntries.sort((a, b) => a.key.localeCompare(b.key)),
            }));

        return status(200, { domains });
    }, {
        detail: {
            tags: ["Admin"],
            summary: "Get editable application configuration entries",
            description: "Returns all application configuration entries that are flagged with editInUI=true, grouped by domain. Requires FP_MANAGE_CONFIGURATION.",
        },
        response: {
            200: t.Object({
                domains: t.Array(t.Object({
                    domain: t.String(),
                    entries: t.Array(t.Object({
                        domain: t.String(),
                        key: t.String(),
                        description: t.Nullable(t.String()),
                        type: t.Nullable(t.String()),
                        value: t.Any(),
                        inputFormat: t.String(),
                        outputFormat: t.String(),
                    })),
                })),
            }),
            403: t.String(),
        },
    });

    app.put("/config/:domain/:key", async ({ dbClient, session, tokenClaims, params, body }) => {
        const authz = await authorize(dbClient, session?.idTokenClaims ?? tokenClaims ?? {}, [FP_MANAGE_CONFIGURATION]);
        if (!authz.some((perm) => perm.identifier === FP_MANAGE_CONFIGURATION.identifier)) {
            return status(403, `Permission denied. Required: ${FP_MANAGE_CONFIGURATION.functionalPermissionName}`);
        }

        const [entry] = await getConfigEntriesByKey(dbClient, params.domain, params.key, { limit: 1 });
        if (!entry || !entry.editInUI) return status(404, "Configuration entry not found");

        if (!equalsJson(body.knownValue, entry.value)) {
            return status(409, {
                error: "Config entry was modified by another user",
                currentValue: entry.value,
            });
        }

        const parsed = parseConfigValue(entry.type, body.value);
        if (!parsed.ok) return status(400, parsed.error);

        const formatValidation = validateConfigInputFormat(entry, parsed.value);
        if (!formatValidation.ok) return status(400, formatValidation.error);

        const schema = schemaForConfigType(entry.type);
        if (!Value.Check(schema, parsed.value)) return status(400, "Type validation failed");

        const [updated] = await upsertConfigEntry(dbClient, {
            ...entry,
            value: parsed.value,
        });

        PubSub.publish(pubsub_ConfigUpdated, {
            domain: updated!.domain,
            key: updated!.key,
            value: updated!.value,
            updatedAt: new Date().toISOString(),
        });

        return status(200, toUiEntry(updated!));
    }, {
        body: t.Object({
            value: t.Any(),
            knownValue: t.Any(),
        }),
        params: t.Object({
            domain: t.String(),
            key: t.String(),
        }),
        detail: {
            tags: ["Admin"],
            summary: "Update one configuration entry",
            description: "Updates a single configuration entry with optimistic locking. Requires FP_MANAGE_CONFIGURATION.",
        },
        response: {
            200: t.Object({
                domain: t.String(),
                key: t.String(),
                description: t.Nullable(t.String()),
                type: t.Nullable(t.String()),
                value: t.Any(),
                inputFormat: t.String(),
                outputFormat: t.String(),
            }),
            400: t.Union([t.String(), t.Object({ error: t.String() })]),
            403: t.String(),
            404: t.String(),
            409: t.Object({ error: t.String(), currentValue: t.Any() }),
        },
    });
}

