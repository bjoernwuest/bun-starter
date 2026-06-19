import type { ApiInstance } from "@/apps/api.ts";
import { status, t } from "elysia";
import { authorize, getApiKeyLength, getApiKeyValidityDays, getLoggedinUserObject } from "@/services/auth.ts";
import {
    FP_CREATE_API_KEYS,
    FP_PROLONG_API_KEYS,
    FP_VIEW_API_KEYS,
} from "@/services/auth/functional_perms.ts";
import {
    createApiKey,
    deleteApiKey,
    disableApiKey,
    getApiKey,
    getApiKeyCount,
    getApiKeyFunctionalPermissions,
    getApiKeys,
    isPgcryptoMissingError,
    prolongApiKey,
    replaceApiKeyFunctionalPermissions,
    updateApiKeyMetadata,
} from "@/repo/api_keys.ts";
import { getFunctionalPermissions } from "@/repo/FunctionalPermissionRepo.ts";
import { getUserListPageSizes } from "@/api/users.ts";
import { runInTransaction } from "@/services/database.ts";

function parseBooleanQuery(value: unknown): boolean {
    return value === true || value === "true" || value === "1";
}

const ApiKeySummarySchema = t.Object({
    identifier: t.String({ format: "uuid" }),
    name: t.String(),
    description: t.Nullable(t.String()),
    createdBy: t.String({ format: "uuid" }),
    createdAt: t.String(),
    updatedAt: t.String(),
    expiresAt: t.String(),
    lastProlongedAt: t.Nullable(t.String()),
    lastProlongedBy: t.Nullable(t.String({ format: "uuid" })),
    disabled: t.Boolean(),
    disabledAt: t.Nullable(t.String()),
    disabledBy: t.Nullable(t.String({ format: "uuid" })),
    permissionNames: t.Array(t.String()),
});

const ApiKeysResponseSchema = t.Object({
    apiKeys: t.Array(ApiKeySummarySchema),
    page: t.Number({ minimum: 0 }),
    pageSize: t.Number({ minimum: 1 }),
    total: t.Number({ minimum: 0 }),
    availablePageSizes: t.Array(t.Number()),
    includeDisabled: t.Boolean(),
});

const ApiKeyDetailSchema = t.Object({
    apiKey: ApiKeySummarySchema,
    permissionIdentifiers: t.Array(t.String({ format: "uuid" })),
    allPermissions: t.Array(t.Object({
        identifier: t.String({ format: "uuid" }),
        functionalPermissionName: t.String(),
        description: t.String(),
        group: t.String(),
        createdAt: t.String(),
        updatedAt: t.String(),
    })),
});

export default function register(app: ApiInstance) {
    app.get("/api_keys", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_VIEW_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_VIEW_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_VIEW_API_KEYS.functionalPermissionName}`);
        }

        const availablePageSizes = await getUserListPageSizes(context);
        const page = Math.max(0, Number(context.query.page ?? 0));
        const pageSize = Math.max(1, Number(context.query.pageSize ?? availablePageSizes[0] ?? 10));
        const includeDisabled = parseBooleanQuery(context.query.includeDisabled);

        const total = await getApiKeyCount(context.dbClient, includeDisabled);
        const rows = await getApiKeys(context.dbClient, { page, pageSize }, includeDisabled);
        const apiKeys = await Promise.all(rows.map(async (apiKey) => {
            const permissions = await getApiKeyFunctionalPermissions(context.dbClient, apiKey.identifier);
            return {
                identifier: apiKey.identifier,
                name: apiKey.name,
                description: apiKey.description,
                createdBy: apiKey.createdBy,
                createdAt: apiKey.createdAt,
                updatedAt: apiKey.updatedAt,
                expiresAt: apiKey.expiresAt,
                lastProlongedAt: apiKey.lastProlongedAt ? apiKey.lastProlongedAt : null,
                lastProlongedBy: apiKey.lastProlongedBy,
                disabled: apiKey.disabled,
                disabledAt: apiKey.disabledAt ? apiKey.disabledAt : null,
                disabledBy: apiKey.disabledBy,
                permissionNames: permissions.map((perm) => perm.functionalPermissionName),
            };
        }));

        return {
            apiKeys,
            page,
            pageSize,
            total,
            availablePageSizes,
            includeDisabled,
        };
    }, {
        response: { 200: ApiKeysResponseSchema, 403: t.String() },
        detail: {
            tags: ["Admin"],
            summary: "Get paged API key list",
            description: "Retrieve API keys with metadata and assigned permission names. Authenticate with an API key using the X-API-Key header.",
        },
    });

    app.get("/api_keys/:apikeyid", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_VIEW_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_VIEW_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_VIEW_API_KEYS.functionalPermissionName}`);
        }

        const apiKey = await getApiKey(context.dbClient, context.params.apikeyid);
        if (!apiKey) return status(404, "API key does not exist");

        const [permissions, allPermissions] = await Promise.all([
            getApiKeyFunctionalPermissions(context.dbClient, apiKey.identifier),
            getFunctionalPermissions(context.dbClient),
        ]);

        return {
            apiKey: {
                identifier: apiKey.identifier,
                name: apiKey.name,
                description: apiKey.description,
                createdBy: apiKey.createdBy,
                createdAt: apiKey.createdAt,
                updatedAt: apiKey.updatedAt,
                expiresAt: apiKey.expiresAt,
                lastProlongedAt: apiKey.lastProlongedAt ? apiKey.lastProlongedAt : null,
                lastProlongedBy: apiKey.lastProlongedBy,
                disabled: apiKey.disabled,
                disabledAt: apiKey.disabledAt ? apiKey.disabledAt : null,
                disabledBy: apiKey.disabledBy,
                permissionNames: permissions.map((perm) => perm.functionalPermissionName),
            },
            permissionIdentifiers: permissions.map((perm) => perm.identifier),
            allPermissions,
        };
    }, {
        response: { 200: ApiKeyDetailSchema, 403: t.String(), 404: t.String() },
        detail: {
            tags: ["Admin"],
            summary: "Get API key details",
            description: "Retrieve one API key with metadata and editable permission assignment context. Authenticate with an API key using the X-API-Key header.",
        },
    });

    app.post("/api_keys", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_CREATE_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_CREATE_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_CREATE_API_KEYS.functionalPermissionName}`);
        }

        const user = await getLoggedinUserObject(context.dbClient, claims);
        if (!user) return status(403, 'Permission denied. Must be executed by human user');
        const keyLength = await getApiKeyLength(context.dbClient);
        const validityDays = await getApiKeyValidityDays(context.dbClient);
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

        let created;
        try {
            created = await runInTransaction(context.dbClient, async (tx) => {
                return await createApiKey(tx, {
                    createdBy: user.identifier,
                    name: context.body.name,
                    description: context.body.description ?? null,
                    expiresAt,
                    keyLength,
                    permissionIdentifiers: context.body.permissionIdentifiers ?? [],
                });
            });
        } catch (error) {
            if (isPgcryptoMissingError(error)) {
                return status(500, "API key could not be created because PostgreSQL extension 'pgcrypto' is not installed. Run: CREATE EXTENSION IF NOT EXISTS pgcrypto;");
            }
            throw error;
        }

        return {
            identifier: created.apiKey.identifier,
            plainApiKey: created.plainApiKey,
            expiresAt: created.apiKey.expiresAt,
            keyLength,
            validityDays,
        };
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 255 }),
            description: t.Optional(t.Nullable(t.String({ maxLength: 4000 }))),
            permissionIdentifiers: t.Optional(t.Array(t.String({ format: "uuid" }))),
        }),
        response: {
            200: t.Object({
                identifier: t.String({ format: "uuid" }),
                plainApiKey: t.String(),
                expiresAt: t.String(),
                keyLength: t.Number(),
                validityDays: t.Number(),
            }),
            403: t.String(),
            500: t.String(),
        },
        detail: {
            tags: ["Admin"],
            summary: "Create API key",
            description: "Create a new API key and return the plaintext key once. Authenticate with an API key using the X-API-Key header.",
        },
    });

    app.put("/api_keys/:apikeyid", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_PROLONG_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_PROLONG_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_PROLONG_API_KEYS.functionalPermissionName}`);
        }

        const updated = await updateApiKeyMetadata(context.dbClient, {
            apiKeyIdentifier: context.params.apikeyid,
            knownUpdatedAt: context.body.knownUpdatedAt,
            name: context.body.name,
            description: context.body.description ?? null,
        });

        if (!updated) return status(409, "API key was modified by another user");
        return { updatedAt: updated.updatedAt };
    }, {
        body: t.Object({
            knownUpdatedAt: t.String(),
            name: t.String({ minLength: 1, maxLength: 255 }),
            description: t.Nullable(t.String({ maxLength: 4000 })),
        }),
        response: { 200: t.Object({ updatedAt: t.String() }), 403: t.String(), 409: t.String() },
    });

    app.put("/api_keys/:apikeyid/prolong", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_PROLONG_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_PROLONG_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_PROLONG_API_KEYS.functionalPermissionName}`);
        }

        const user = await getLoggedinUserObject(context.dbClient, claims);
        if (!user) return status(403, 'Permission denied. Must be executed by human user');
        const expiresAt = new Date(Date.now() + context.body.days * 24 * 60 * 60 * 1000);

        const updated = await prolongApiKey(context.dbClient, {
            apiKeyIdentifier: context.params.apikeyid,
            knownUpdatedAt: context.body.knownUpdatedAt,
            prolongByUserIdentifier: user.identifier,
            expiresAt,
        });

        if (!updated) return status(409, "API key was modified, disabled, or no longer exists");
        return {
            updatedAt: updated.updatedAt,
            expiresAt: updated.expiresAt,
            lastProlongedAt: updated.lastProlongedAt ? updated.lastProlongedAt : null,
            lastProlongedBy: updated.lastProlongedBy,
        };
    }, {
        body: t.Object({
            knownUpdatedAt: t.String(),
            days: t.Number({ minimum: 1, maximum: 730 }),
        }),
        response: {
            200: t.Object({
                updatedAt: t.String(),
                expiresAt: t.String(),
                lastProlongedAt: t.Nullable(t.String()),
                lastProlongedBy: t.Nullable(t.String({ format: "uuid" })),
            }),
            403: t.String(),
            409: t.String(),
        },
    });

    app.put("/api_keys/:apikeyid/disable", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_PROLONG_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_PROLONG_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_PROLONG_API_KEYS.functionalPermissionName}`);
        }

        const user = await getLoggedinUserObject(context.dbClient, claims);
        if (!user) return status(403, 'Permission denied. Must be executed by human user');
        const updated = await disableApiKey(context.dbClient, {
            apiKeyIdentifier: context.params.apikeyid,
            knownUpdatedAt: context.body.knownUpdatedAt,
            disabledBy: user.identifier,
        });
        if (!updated) return status(409, "API key was modified, already disabled, or no longer exists");
        return {
            updatedAt: updated.updatedAt,
            disabled: updated.disabled,
            disabledAt: updated.disabledAt ? updated.disabledAt : null,
            disabledBy: updated.disabledBy,
        };
    }, {
        body: t.Object({ knownUpdatedAt: t.String() }),
        response: {
            200: t.Object({
                updatedAt: t.String(),
                disabled: t.Boolean(),
                disabledAt: t.Nullable(t.String()),
                disabledBy: t.Nullable(t.String({ format: "uuid" })),
            }),
            403: t.String(),
            409: t.String(),
        },
    });

    app.put("/api_keys/:apikeyid/permissions", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_PROLONG_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_PROLONG_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_PROLONG_API_KEYS.functionalPermissionName}`);
        }

        const user = await getLoggedinUserObject(context.dbClient, claims);
        if (!user) return status(403, 'Permission denied. Must be executed by human user');
        const ok = await runInTransaction(context.dbClient, async (tx) => {
            return await replaceApiKeyFunctionalPermissions(tx, {
                apiKeyIdentifier: context.params.apikeyid,
                grantedBy: user.identifier,
                knownUpdatedAt: context.body.knownUpdatedAt,
                permissionIdentifiers: context.body.permissionIdentifiers,
            });
        });

        if (!ok) return status(409, "API key was modified by another user");
        return { success: true };
    }, {
        body: t.Object({
            knownUpdatedAt: t.String(),
            permissionIdentifiers: t.Array(t.String({ format: "uuid" })),
        }),
        response: { 200: t.Object({ success: t.Boolean() }), 403: t.String(), 409: t.String() },
    });

    app.delete("/api_keys/:apikeyid", async (context) => {
        const claims = context.session?.idTokenClaims ?? context.tokenClaims ?? {};
        const authz = await authorize(context.dbClient, claims, [FP_PROLONG_API_KEYS]);
        if (!authz.some((perm) => perm.identifier === FP_PROLONG_API_KEYS.identifier)) {
            return status(403, `Permission denied. Required: ${FP_PROLONG_API_KEYS.functionalPermissionName}`);
        }

        const deleted = await deleteApiKey(context.dbClient, {
            apiKeyIdentifier: context.params.apikeyid,
            knownUpdatedAt: context.body.knownUpdatedAt,
        });
        if (!deleted) return status(409, "API key was modified by another user");
        return { success: true };
    }, {
        body: t.Object({ knownUpdatedAt: t.String() }),
        response: { 200: t.Object({ success: t.Boolean() }), 403: t.String(), 409: t.String() },
    });
}

