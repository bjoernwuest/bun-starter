import { AuditEntry } from "@/schema/AuditEntry.ts";
import { desc, sql, and } from "drizzle-orm";

import type {DBClient} from "@/services/DatabaseDriver.ts";

export type AuditEntryType = typeof AuditEntry.$inferSelect;
export type NewAuditEntryType = typeof AuditEntry.$inferInsert;

/**
 * Inserts a batch of audit entries into the database in a single insert.
 */
export async function insertAuditEntries(db: DBClient, entries: NewAuditEntryType[]): Promise<void> {
    if (entries.length === 0) return;
    await db.insert(AuditEntry).values(entries);
}

/**
 * Retrieves audit log entries with optional JSON-path filtering and pagination.
 *
 * @param db - The database client.
 * @param opts - Filtering and pagination options.
 * @param opts.jsonPathFilter - Optional JSONPath expression (PostgreSQL `@@` operator). Filters payload.
 * @param opts.search - Optional free-text search across topic and payload (as text).
 * @param opts.page - Zero-based page number (default 0).
 * @param opts.pageSize - Page size (default 50).
 */
export async function getAuditEntries(
    db: DBClient,
    opts?: {
        jsonPathFilter?: string;
        search?: string;
        page?: number;
        pageSize?: number;
    },
): Promise<{ entries: AuditEntryType[]; total: number }> {
    const page = opts?.page ?? 0;
    const pageSize = opts?.pageSize ?? 50;

    const conditions = [];

    if (opts?.jsonPathFilter) {
        // Use PostgreSQL jsonb_path_exists with the user-provided filter
        conditions.push(sql`${AuditEntry.payload} @? ${opts.jsonPathFilter}::jsonpath`);
    }

    if (opts?.search) {
        const searchParam = `%${opts.search}%`;
        conditions.push(
            sql`(${AuditEntry.topic} ILIKE ${searchParam} OR ${AuditEntry.payload}::text ILIKE ${searchParam})`,
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
        .select({ c: sql<number>`count(*)` })
        .from(AuditEntry)
        .where(whereClause);

    const total = Number(countRow?.c ?? 0);

    const entries = await db
        .select()
        .from(AuditEntry)
        .where(whereClause)
        .orderBy(desc(AuditEntry.createdAt))
        .offset(page * pageSize)
        .limit(pageSize);

    return { entries, total };
}

/**
 * Deletes all entries from the audit log.
 * Returns the number of deleted rows.
 */
export async function clearAuditEntries(db: DBClient): Promise<number> {
    const result = await db.delete(AuditEntry).returning();
    return result.length;
}
