// Hier können manuelle Typ-Erweiterungen für ApiKey hinzugefügt werden.
import {type Static, t} from "elysia";
import { FunctionalPermissionSchema } from "@/types/FunctionalPermission.ts";

export * from './_ApiKey';


export const pubsub_ApiKeys = "api_keys";
export const pubsub_ApiKeyPermissionsChanged = `${pubsub_ApiKeys}.permissions.changed`;
export const pubsub_ApiKeyCreated = `create.${pubsub_ApiKeys}`;
export const pubsub_ApiKeyUpdated = `update.${pubsub_ApiKeys}`;
export const pubsub_ApiKeyDisabled = `disable.${pubsub_ApiKeys}`;
export const pubsub_ApiKeyDeleted = `delete.${pubsub_ApiKeys}`;

export const ApiKeySummarySchema = t.Object({
    identifier: t.String({format: "uuid"}),
    name: t.String(),
    description: t.Nullable(t.String()),
    createdBy: t.String({format: "uuid"}),
    createdAt: t.String(),
    updatedAt: t.String(),
    expiresAt: t.String(),
    lastProlongedAt: t.Nullable(t.String()),
    lastProlongedBy: t.Nullable(t.String({format: "uuid"})),
    disabled: t.Boolean(),
    disabledAt: t.Nullable(t.String()),
    disabledBy: t.Nullable(t.String({format: "uuid"})),
    permissionNames: t.Array(t.String()),
});
export type ApiKeySummary = Static<typeof ApiKeySummarySchema>;


export const ApiKeysResponseSchema = t.Object({
    apiKeys: t.Array(ApiKeySummarySchema),
    page: t.Number({minimum: 0}),
    pageSize: t.Number({minimum: 1}),
    total: t.Number({minimum: 0}),
    availablePageSizes: t.Array(t.Number()),
    includeDisabled: t.Boolean(),
});
export type ApiKeysResponse = Static<typeof ApiKeysResponseSchema>;

export const ApiKeyDetailSchema = t.Object({
    apiKey: ApiKeySummarySchema,
    permissionIdentifiers: t.Array(t.String({format: "uuid"})),
    allPermissions: t.Array(FunctionalPermissionSchema),
});
export type ApiKeyDetailResponse = Static<typeof ApiKeyDetailSchema>;

export type CreateApiKeyRequest = {
    name: string;
    description?: string | null;
    permissionIdentifiers?: string[];
};

export type CreateApiKeyResponse = {
    identifier: string;
    plainApiKey: string;
    expiresAt: string;
    keyLength: number;
    validityDays: number;
};

// --- Operation-specific request / response schemas ---

export const ApiKeyCreateBodySchema = t.Object({
    name: t.String({ minLength: 1, maxLength: 255 }),
    description: t.Optional(t.Nullable(t.String({ maxLength: 4000 }))),
    permissionIdentifiers: t.Optional(t.Array(t.String({ format: "uuid" }))),
});
export type ApiKeyCreateBody = Static<typeof ApiKeyCreateBodySchema>;

export const ApiKeyCreatedResponseSchema = t.Object({
    identifier: t.String({ format: "uuid" }),
    plainApiKey: t.String(),
    expiresAt: t.String(),
    keyLength: t.Number(),
    validityDays: t.Number(),
});
export type ApiKeyCreatedResponse = Static<typeof ApiKeyCreatedResponseSchema>;

export const ApiKeyUpdateMetadataBodySchema = t.Object({
    knownUpdatedAt: t.String(),
    name: t.String({ minLength: 1, maxLength: 255 }),
    description: t.Nullable(t.String({ maxLength: 4000 })),
});
export type ApiKeyUpdateMetadataBody = Static<typeof ApiKeyUpdateMetadataBodySchema>;

export const ApiKeyUpdatedAtResponseSchema = t.Object({ updatedAt: t.String() });
export type ApiKeyUpdatedAtResponse = Static<typeof ApiKeyUpdatedAtResponseSchema>;

export const ApiKeyProlongBodySchema = t.Object({
    knownUpdatedAt: t.String(),
    days: t.Number({ minimum: 1, maximum: 730 }),
});
export type ApiKeyProlongBody = Static<typeof ApiKeyProlongBodySchema>;

export const ApiKeyProlongResponseSchema = t.Object({
    updatedAt: t.String(),
    expiresAt: t.String(),
    lastProlongedAt: t.Nullable(t.String()),
    lastProlongedBy: t.Nullable(t.String({ format: "uuid" })),
});
export type ApiKeyProlongResponse = Static<typeof ApiKeyProlongResponseSchema>;

export const ApiKeyDisableResponseSchema = t.Object({
    updatedAt: t.String(),
    disabled: t.Boolean(),
    disabledAt: t.Nullable(t.String()),
    disabledBy: t.Nullable(t.String({ format: "uuid" })),
});
export type ApiKeyDisableResponse = Static<typeof ApiKeyDisableResponseSchema>;

export const ApiKeyPermissionsBodySchema = t.Object({
    knownUpdatedAt: t.String(),
    permissionIdentifiers: t.Array(t.String({ format: "uuid" })),
});
export type ApiKeyPermissionsBody = Static<typeof ApiKeyPermissionsBodySchema>;
