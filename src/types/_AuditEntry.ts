// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY
import { Type, type Static } from '@sinclair/typebox';

// --- Derived Drizzle Schemas ---
export const AuditEntrySchema = Type.Object({
  identifier: Type.String({ format: 'uuid' }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  topic: Type.Any({ type: 'string' }),
  payload: Type.Any({ type: 'object', additionalProperties: true }),
});
export type AuditEntry = Static<typeof AuditEntrySchema>;

export const AuditEntryInsertSchema = Type.Object({
  identifier: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
  topic: Type.Any({ type: 'string' }),
  payload: Type.Any({ type: 'object', additionalProperties: true }),
});
export type AuditEntryInsert = Static<typeof AuditEntryInsertSchema>;

