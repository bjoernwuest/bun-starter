// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY
import { Type, type Static } from '@sinclair/typebox';

// --- Derived Drizzle Schemas ---
export const ApiKeySchema = Type.Object({
  identifier: Type.String({ format: 'uuid' }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  name: Type.Any({ type: 'string' }),
  description: Type.Any({ type: 'string' }),
  keyHash: Type.Any({ type: 'string' }),
  createdBy: Type.Any({ type: 'string', format: 'uuid' }),
  expiresAt: Type.Any({ type: 'string' }),
  lastProlongedAt: Type.Any({ type: 'string' }),
  lastProlongedBy: Type.Any({ type: 'string', format: 'uuid' }),
  disabled: Type.Any({ type: 'boolean' }),
  disabledAt: Type.Any({ type: 'string' }),
  disabledBy: Type.Any({ type: 'string', format: 'uuid' }),
});
export type ApiKey = Static<typeof ApiKeySchema>;

export const ApiKeyInsertSchema = Type.Object({
  identifier: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
  name: Type.Any({ type: 'string' }),
  description: Type.Optional(Type.Any({ type: 'string' })),
  keyHash: Type.Any({ type: 'string' }),
  createdBy: Type.Any({ type: 'string', format: 'uuid' }),
  expiresAt: Type.Any({ type: 'string' }),
  lastProlongedAt: Type.Optional(Type.Any({ type: 'string' })),
  lastProlongedBy: Type.Optional(Type.Any({ type: 'string', format: 'uuid' })),
  disabled: Type.Optional(Type.Any({ type: 'boolean' })),
  disabledAt: Type.Optional(Type.Any({ type: 'string' })),
  disabledBy: Type.Optional(Type.Any({ type: 'string', format: 'uuid' })),
});
export type ApiKeyInsert = Static<typeof ApiKeyInsertSchema>;

export const ApiKeyFunctionalPermissionSchema = Type.Object({
  apiKeyIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  functionalPermissionIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  grantedBy: Type.Any({ type: 'string', format: 'uuid' }),
  grantedAt: Type.Any({ type: 'string' }),
});
export type ApiKeyFunctionalPermission = Static<typeof ApiKeyFunctionalPermissionSchema>;

export const ApiKeyFunctionalPermissionInsertSchema = Type.Object({
  apiKeyIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  functionalPermissionIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  grantedBy: Type.Any({ type: 'string', format: 'uuid' }),
  grantedAt: Type.Optional(Type.Any({ type: 'string' })),
});
export type ApiKeyFunctionalPermissionInsert = Static<typeof ApiKeyFunctionalPermissionInsertSchema>;

