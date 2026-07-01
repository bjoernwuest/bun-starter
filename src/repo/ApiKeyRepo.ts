import {and, asc, desc, eq, inArray, sql} from "drizzle-orm";
import {ApiKey, ApiKeyFunctionalPermission} from "@/schema/ApiKey.ts";
import type {FunctionalPermission as FunctionalPermissionType} from "@/types/FunctionalPermission.ts";
import {FunctionalPermission} from "@/schema/FunctionalPermission.ts";
import {
    type ApiKey as ApiKeyType,
    pubsub_ApiKeyCreated,
    pubsub_ApiKeyDeleted,
    pubsub_ApiKeyDisabled,
    pubsub_ApiKeyPermissionsChanged,
    pubsub_ApiKeyUpdated
} from "@/types/ApiKey.ts";
import PubSub from "@/services/PubSub.ts";

import type {DBClient} from "@/services/DatabaseDriver.ts";

function generateApiKeySecret(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    let out = "";
    for (let i = 0; i < values.length; i++) out += chars[values[i]! % chars.length];
    return out;
}

export function isPgcryptoMissingError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "";
    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

    // PostgreSQL: 42883 = undefined_function. We only map crypt/gen_salt lookup failures.
    return code === "42883" && (
        message.includes("gen_salt") ||
        message.includes("crypt(") ||
        message.includes("function crypt")
    );
}

export async function getApiKeyCount(db: DBClient, includeDisabled: boolean): Promise<number> {
    const [row] = await db
        .select({ c: sql<number>`count(*)` })
        .from(ApiKey)
        .where(includeDisabled ? undefined : eq(ApiKey.disabled, false));
    return Number(row?.c ?? 0);
}

export async function getApiKeys(
    db: DBClient,
    page: { page: number; pageSize: number },
    includeDisabled: boolean,
): Promise<ApiKeyType[]> {
    return await db
        .select()
        .from(ApiKey)
        .where(includeDisabled ? undefined : eq(ApiKey.disabled, false))
        .orderBy(desc(ApiKey.createdAt), asc(ApiKey.identifier))
        .offset(Math.max(0, page.page) * Math.max(1, page.pageSize))
        .limit(Math.max(1, page.pageSize));
}

export async function getApiKey(db: DBClient, apiKeyIdentifier: string): Promise<ApiKeyType | undefined> {
    const [row] = await db.select().from(ApiKey).where(eq(ApiKey.identifier, apiKeyIdentifier)).limit(1);
    return row;
}

export async function getApiKeyFunctionalPermissions(db: DBClient, apiKeyIdentifier: string): Promise<FunctionalPermissionType[]> {
    const rows = await db
        .select({ functionalPermission: FunctionalPermission })
        .from(ApiKeyFunctionalPermission)
        .innerJoin(
            FunctionalPermission,
            eq(ApiKeyFunctionalPermission.functionalPermissionIdentifier, FunctionalPermission.identifier),
        )
        .where(eq(ApiKeyFunctionalPermission.apiKeyIdentifier, apiKeyIdentifier));
    return rows.map((row) => row.functionalPermission) as FunctionalPermissionType[];
}

export async function createApiKey(
    db: DBClient,
    data: {
        createdBy: string;
        name: string;
        description?: string | null;
        expiresAt: Date;
        keyLength: number;
        permissionIdentifiers: string[];
    },
): Promise<{ apiKey: ApiKeyType; plainApiKey: string }> {
    const plainApiKey = generateApiKeySecret(data.keyLength);

    const [apiKey] = await db
        .insert(ApiKey)
        .values({
            createdBy: data.createdBy,
            name: data.name,
            description: data.description ?? null,
            keyHash: sql`crypt(${plainApiKey}, gen_salt('bf'))` as unknown as string,
            expiresAt: data.expiresAt.toISOString(),
        })
        .returning();

    if (!apiKey) throw new Error("Could not create API key");

    if (data.permissionIdentifiers.length > 0) {
        await db.insert(ApiKeyFunctionalPermission).values(
            data.permissionIdentifiers.map((functionalPermissionIdentifier) => ({
                apiKeyIdentifier: apiKey.identifier,
                functionalPermissionIdentifier,
                grantedBy: data.createdBy,
            })),
        ).onConflictDoNothing();
    }

    PubSub.publish(pubsub_ApiKeyCreated, { apiKeyIdentifier: apiKey.identifier });
    PubSub.publish(pubsub_ApiKeyPermissionsChanged, { apiKeyIdentifier: apiKey.identifier });
    return { apiKey, plainApiKey };
}

export async function updateApiKeyMetadata(
    db: DBClient,
    data: {
        apiKeyIdentifier: string;
        knownUpdatedAt: string;
        name: string;
        description?: string | null;
    },
): Promise<ApiKeyType | undefined> {
    const rows = await db.update(ApiKey).set({
        name: data.name,
        description: data.description ?? null,
        updatedAt: sql<string>`now()`,
    }).where(and(
        eq(ApiKey.identifier, data.apiKeyIdentifier),
        sql`${ApiKey.updatedAt} = ${data.knownUpdatedAt}::timestamp`,
    )).returning();

    if (rows[0]) {
        PubSub.publish(pubsub_ApiKeyUpdated, { apiKeyIdentifier: data.apiKeyIdentifier });
    }
    return rows[0];
}

export async function prolongApiKey(
    db: DBClient,
    data: {
        apiKeyIdentifier: string;
        knownUpdatedAt: string;
        prolongByUserIdentifier: string;
        expiresAt: Date;
    },
): Promise<ApiKeyType | undefined> {
    const rows = await db.update(ApiKey).set({
        expiresAt: data.expiresAt.toISOString(),
        lastProlongedAt: sql<string>`now()`,
        lastProlongedBy: data.prolongByUserIdentifier,
        updatedAt: sql<string>`now()`,
    }).where(and(
        eq(ApiKey.identifier, data.apiKeyIdentifier),
        eq(ApiKey.disabled, false),
        sql`${ApiKey.updatedAt} = ${data.knownUpdatedAt}::timestamp`,
    )).returning();

    if (rows[0]) {
        PubSub.publish(pubsub_ApiKeyUpdated, { apiKeyIdentifier: data.apiKeyIdentifier });
    }
    return rows[0];
}

export async function disableApiKey(
    db: DBClient,
    data: {
        apiKeyIdentifier: string;
        knownUpdatedAt: string;
        disabledBy: string;
    },
): Promise<ApiKeyType | undefined> {
    const rows = await db.update(ApiKey).set({
        disabled: true,
        disabledAt: sql<string>`now()`,
        disabledBy: data.disabledBy,
        updatedAt: sql<string>`now()`,
    }).where(and(
        eq(ApiKey.identifier, data.apiKeyIdentifier),
        eq(ApiKey.disabled, false),
        sql`${ApiKey.updatedAt} = ${data.knownUpdatedAt}::timestamp`,
    )).returning();

    if (rows[0]) {
        PubSub.publish(pubsub_ApiKeyDisabled, { apiKeyIdentifier: data.apiKeyIdentifier });
    }
    return rows[0];
}

export async function deleteApiKey(
    db: DBClient,
    data: {
        apiKeyIdentifier: string;
        knownUpdatedAt: string;
    },
): Promise<boolean> {
    const rows = await db.delete(ApiKey).where(and(
        eq(ApiKey.identifier, data.apiKeyIdentifier),
        sql`${ApiKey.updatedAt} = ${data.knownUpdatedAt}::timestamp`,
    )).returning();
    PubSub.publish(pubsub_ApiKeyDeleted, { apiKeyIdentifier: data.apiKeyIdentifier });
    return rows.length > 0;
}

export async function replaceApiKeyFunctionalPermissions(
    db: DBClient,
    data: {
        apiKeyIdentifier: string;
        grantedBy: string;
        knownUpdatedAt: string;
        permissionIdentifiers: string[];
    },
): Promise<boolean> {
    const touched = await db
        .update(ApiKey)
        .set({ updatedAt: sql<string>`now()` })
        .where(and(
            eq(ApiKey.identifier, data.apiKeyIdentifier),
            sql`${ApiKey.updatedAt} = ${data.knownUpdatedAt}::timestamp`,
        ))
        .returning({ identifier: ApiKey.identifier });
    if (touched.length < 1) return false;

    await db.delete(ApiKeyFunctionalPermission).where(eq(ApiKeyFunctionalPermission.apiKeyIdentifier, data.apiKeyIdentifier));
    if (data.permissionIdentifiers.length > 0) {
        await db.insert(ApiKeyFunctionalPermission).values(
            data.permissionIdentifiers.map((functionalPermissionIdentifier) => ({
                apiKeyIdentifier: data.apiKeyIdentifier,
                functionalPermissionIdentifier,
                grantedBy: data.grantedBy,
            })),
        ).onConflictDoNothing();
    }

    PubSub.publish(pubsub_ApiKeyPermissionsChanged, { apiKeyIdentifier: data.apiKeyIdentifier });
    return true;
}

export async function validateApiKeySecret(db: DBClient, apiKeySecret: string): Promise<ApiKeyType | undefined> {
    const [row] = await db
        .select()
        .from(ApiKey)
        .where(and(
            eq(ApiKey.disabled, false),
            sql`${ApiKey.expiresAt} > now()`,
            sql`${ApiKey.keyHash} = crypt(${apiKeySecret}, ${ApiKey.keyHash})`,
        ))
        .orderBy(desc(ApiKey.createdAt))
        .limit(1);
    return row;
}

export async function getFunctionalPermissionsOfApiKey(
    db: DBClient,
    apiKeyIdentifier: string,
): Promise<FunctionalPermissionType[]> {
    // CRITICAL: Must check key existence and expiry status, not just permissions
    // This prevents fetching permissions for expired or disabled keys
    const [key] = await db.select().from(ApiKey).where(
        and(
            eq(ApiKey.identifier, apiKeyIdentifier),
            eq(ApiKey.disabled, false),
            sql`${ApiKey.expiresAt} > now()`  // Only active, non-expired keys
        )
    ).limit(1);

    if (!key) return [];  // Key doesn't exist, is disabled, or expired

    const assignments = await db
        .select({ functionalPermissionIdentifier: ApiKeyFunctionalPermission.functionalPermissionIdentifier })
        .from(ApiKeyFunctionalPermission)
        .where(eq(ApiKeyFunctionalPermission.apiKeyIdentifier, apiKeyIdentifier));
    const ids = assignments.map((row) => row.functionalPermissionIdentifier);
    if (ids.length === 0) return [];
    return await db.select().from(FunctionalPermission).where(inArray(FunctionalPermission.identifier, ids)) as FunctionalPermissionType[];
}

