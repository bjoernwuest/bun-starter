// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY
import { Type, type Static } from '@sinclair/typebox';

// --- Derived Drizzle Schemas ---
export const FunctionalPermissionSchema = Type.Object({
  identifier: Type.String({ format: 'uuid' }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  functionalPermissionName: Type.Any({ type: 'string' }),
  description: Type.Any({ type: 'string' }),
  group: Type.Any({ type: 'string' }),
});
export type FunctionalPermission = Static<typeof FunctionalPermissionSchema>;

export const FunctionalPermissionInsertSchema = Type.Object({
  identifier: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
  functionalPermissionName: Type.Any({ type: 'string' }),
  description: Type.Any({ type: 'string' }),
  group: Type.Optional(Type.Any({ type: 'string' })),
});
export type FunctionalPermissionInsert = Static<typeof FunctionalPermissionInsertSchema>;

export const FunctionalPermissionsOfGroupSchema = Type.Object({
  functionalPermissionIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  grantedTo: Type.Any({ type: 'string', format: 'uuid' }),
  grantedBy: Type.Any({ type: 'string', format: 'uuid' }),
});
export type FunctionalPermissionsOfGroup = Static<typeof FunctionalPermissionsOfGroupSchema>;

export const FunctionalPermissionsOfGroupInsertSchema = Type.Object({
  functionalPermissionIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  grantedTo: Type.Any({ type: 'string', format: 'uuid' }),
  grantedBy: Type.Any({ type: 'string', format: 'uuid' }),
});
export type FunctionalPermissionsOfGroupInsert = Static<typeof FunctionalPermissionsOfGroupInsertSchema>;

