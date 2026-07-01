// Hier können manuelle Typ-Erweiterungen für AuditEntry hinzugefügt werden.
import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';
import { AuditEntrySchema } from './_AuditEntry';

export * from './_AuditEntry';

export const AuditLogResponseSchema = t.Object({
    entries: t.Array(AuditEntrySchema),
    page: t.Number(),
    pageSize: t.Number(),
    total: t.Number(),
});
export type AuditLogResponse = Static<typeof AuditLogResponseSchema>;

export const AuditLogClearResponseSchema = t.Object({ success: t.Boolean(), deletedCount: t.Number() });
export type AuditLogClearResponse = Static<typeof AuditLogClearResponseSchema>;
