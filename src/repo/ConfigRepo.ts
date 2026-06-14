import { and, eq, sql } from "drizzle-orm";
import { type DBClient } from "@/services/database.ts";
import { Value } from "@sinclair/typebox/value";
import { type ConfigEntryType, type NewConfigEntryType, ConfigEntrySchema } from "@/types/ConfigEntry.ts";
import { ConfigEntry } from "@/schema/schema.ts";

/**
 * Escapes special characters in a string to make it safe for use in regular expressions to PostgreSQL.
 *
 * @param {string} In - The input string that may contain special characters.
 * @return {string} The processed string with special characters escaped.
 */
export function regExFriendly(In: string): string { return In.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Retrieves configuration entries from the database matching the specified pattern.
 *
 * @param {DBClient} db - The database client used to query the configuration entries.
 * @param {string} domain - The domain to which the configuration entries belong.getConfigEntriesByKey
 * @param {string} pattern - The pattern to match against the configuration entry keys.
 * @param {Object} [opts] - Optional parameters for refining the query results.
 * @param {boolean} [opts.isRegex=false] - If true, performs a regular expression match using the specified pattern.
 * @param {boolean} [opts.contains=false] - If true, matches entries where the key contains the specified pattern, case-insensitively.
 * @param {number} [opts.limit] - Limits the number of results returned by the query.
 * @return {Promise<ConfigEntryType[]>} A promise that resolves to an array of configuration entries matching the specified criteria.
 */
export async function getConfigEntriesByKey(db: DBClient, domain: string, pattern: string, opts?: { isRegex?: boolean; contains?: boolean; limit?: number }): Promise<ConfigEntryType[]> {
    const isRegex = !!opts?.isRegex;
    const contains = !!opts?.contains;
    const limit = typeof opts?.limit === "number" ? opts!.limit : undefined;
    let q;
    if (isRegex) {
        // Use Postgres regex operator ~ (case-sensitive). For case-insensitive use ~*.
        q = db.select().from(ConfigEntry).where(and(eq(ConfigEntry.domain, domain), sql.join([
            ConfigEntry.key,
            sql.raw(' ~ '),
            sql.param(pattern),
        ])));
    } else if (contains) {
        // Use ILIKE for case-insensitive `contains`
        const likePattern = `%${pattern}%`;
        q = db.select().from(ConfigEntry).where(and(eq(ConfigEntry.domain, domain), sql.join([
            ConfigEntry.key,
            sql.raw(' ILIKE '),
            sql.param(likePattern),
        ])));
    } else {
        q = db.select().from(ConfigEntry).where(and(eq(ConfigEntry.domain, domain), sql.join([
            ConfigEntry.key,
            sql.raw(' = '),
            sql.param(pattern),
        ])));
    }

    // Exact match
    if (limit) {
        const rows = await q.limit(limit);
        return rows as ConfigEntryType[];
    }
    const rows = await q ?? [];
    return rows as ConfigEntryType[];
}

/**
 * Inserts a new configuration entry into the database or updates the existing one if a conflict occurs.
 *
 * @param {DBClient} db - The database client used to perform the operation.
 * @param {NewConfigEntryType} entry - The configuration entry to be inserted or updated. Must contain key and value properties.
 * @return {Promise<ConfigEntryType[]>} A promise that resolves to the list of configuration entries returned from the operation.
 */
export async function upsertConfigEntry(db: DBClient, entry: NewConfigEntryType): Promise<ConfigEntryType[]> {
    if (!Value.Check(ConfigEntrySchema, entry as unknown)) { throw new Error(`Invalid config entry for upsert: ${JSON.stringify(entry)}`); }
    const rows = await db.insert(ConfigEntry).values(entry).onConflictDoUpdate({
        target: [ConfigEntry.domain, ConfigEntry.key],
        set: {
            value: entry.value,
        }
    }).returning();
    return rows as unknown as ConfigEntryType[];
}

/**
 * Retrieves all configuration entries from the database.
 *
 * @param {DBClient} db - The database client instance used to execute the query.
 * @param {boolean} [uiOnly=false] - A flag indicating whether to filter configuration entries that can only be edited in the UI.
 * @return {Promise<ConfigEntryType[]>} A promise that resolves to an array of configuration entries.
 */
export async function getAllConfigEntries(db: DBClient, uiOnly: boolean = false): Promise<ConfigEntryType[]> {
    if (uiOnly) return await db.select().from(ConfigEntry).where(eq(ConfigEntry.editInUI, true)) as ConfigEntryType[];
    return await db.select().from(ConfigEntry) as ConfigEntryType[];
}