// Hier können manuelle Typ-Erweiterungen für FunctionalPermission hinzugefügt werden.
import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';

export * from './_FunctionalPermission';

// --- TypeBox schemas for route validation and OpenAPI docs ---

/** Body for assigning groups to a functional permission. */
export const GroupIdentifiersBodySchema = t.Object({
    groupIdentifiers: t.Array(t.String({ format: "uuid" })),
});
export type GroupIdentifiersBody = Static<typeof GroupIdentifiersBodySchema>;

/** Body for granting/revoking functional permissions on a group. */
export const PermissionIdentifiersBodySchema = t.Object({
    permissionIdentifiers: t.Array(t.String({ format: "uuid" })),
});
export type PermissionIdentifiersBody = Static<typeof PermissionIdentifiersBodySchema>;
