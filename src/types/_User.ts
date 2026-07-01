// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY
import { Type, type Static } from '@sinclair/typebox';

// --- Derived Drizzle Schemas ---
export const UserSchema = Type.Object({
  identifier: Type.String({ format: 'uuid' }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  firstName: Type.Any({ type: 'string' }),
  lastName: Type.Any({ type: 'string' }),
  email: Type.Any({ type: 'string' }),
  disabled: Type.Any({ type: 'boolean' }),
});
export type User = Static<typeof UserSchema>;

export const UserInsertSchema = Type.Object({
  identifier: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
  firstName: Type.Any({ type: 'string' }),
  lastName: Type.Any({ type: 'string' }),
  email: Type.Any({ type: 'string' }),
  disabled: Type.Optional(Type.Any({ type: 'boolean' })),
});
export type UserInsert = Static<typeof UserInsertSchema>;

export const GroupSchema = Type.Object({
  identifier: Type.String({ format: 'uuid' }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  groupName: Type.Any({ type: 'string' }),
  disabled: Type.Any({ type: 'boolean' }),
});
export type Group = Static<typeof GroupSchema>;

export const GroupInsertSchema = Type.Object({
  identifier: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
  groupName: Type.Any({ type: 'string' }),
  disabled: Type.Optional(Type.Any({ type: 'boolean' })),
});
export type GroupInsert = Static<typeof GroupInsertSchema>;

export const UserGroupSchema = Type.Object({
  userIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  groupIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
});
export type UserGroup = Static<typeof UserGroupSchema>;

export const UserGroupInsertSchema = Type.Object({
  userIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
  groupIdentifier: Type.Any({ type: 'string', format: 'uuid' }),
});
export type UserGroupInsert = Static<typeof UserGroupInsertSchema>;

