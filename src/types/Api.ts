import { Type, type Static } from '@sinclair/typebox'
import { t } from 'elysia'
import {GroupSchema, UserSchema} from "@/types/User.ts";
import {FunctionalPermissionSchema} from "@/types/FunctionalPermission.ts";

//export const FunctionalPermissionSchema = Type.Object(createSelectSchema(FunctionalPermission).properties)
export const FunctionalPermissionWithGroupsSchema = Type.Composite([
    FunctionalPermissionSchema,
    Type.Object({grantedByGroups: Type.Array(GroupSchema)})
])
export const FunctionalPermissionsResponseSchema = Type.Object({
    functionalPermissions: Type.Array(FunctionalPermissionSchema),
    page: Type.Number({minimum: 0}),
    pageSize: Type.Number({minimum: 0}),
    total: Type.Number({minimum: 0}),
    availablePageSizes: Type.Array(Type.Number()),
});
export type FunctionalPermissionsResponse = Static<typeof FunctionalPermissionsResponseSchema>;

export const UsersResponseSchema = Type.Object({
    users: Type.Array(UserSchema),
    page: Type.Number({minimum: 0}),
    pageSize: Type.Number({minimum: 0}),
    total: Type.Number({minimum: 0}),
    availablePageSizes: Type.Array(Type.Number()),
    includeInactive: Type.Boolean()
});
export type UsersResponse = Static<typeof UsersResponseSchema>;

export const GroupsResponseSchema = Type.Object({
   groups: Type.Array(GroupSchema),
    page: Type.Number({minimum: 0}),
    pageSize: Type.Number({minimum: 0}),
    total: Type.Number({minimum: 0}),
    availablePageSizes: Type.Array(Type.Number()),
    includeInactive: Type.Boolean()
});
export type GroupsResponse = Static<typeof GroupsResponseSchema>;

export const UserDetailsResponseSchema = Type.Object({
    user: UserSchema,
    groups: Type.Array(GroupSchema),
    functionalPermissions: Type.Array(FunctionalPermissionWithGroupsSchema),
    includeInactive: Type.Boolean()
});
export type UserDetailsResponse = Static<typeof UserDetailsResponseSchema>;

export const FunctionalPermissionDetailResponseSchema = Type.Object({functionalPermission: FunctionalPermissionSchema, grantedToGroups: Type.Array(GroupSchema)});
export type FunctionalPermissionDetailResponseType = Static<typeof FunctionalPermissionDetailResponseSchema>;

export const GroupFunctionalPermissionResponseSchema = Type.Object({
   group: GroupSchema,
   functionalPermissions: Type.Array(FunctionalPermissionSchema)
});
export type GroupFunctionalPermissionResponseType = Static<typeof GroupFunctionalPermissionResponseSchema>;

export const ErrorSchema = Type.Object({error: Type.String(), message: Type.Any()});

// --- Shared utility schemas ---

export const SuccessResponseSchema = t.Object({ success: t.Boolean() });
export type SuccessResponse = Static<typeof SuccessResponseSchema>;

export const OptimisticLockBodySchema = t.Object({ knownUpdatedAt: t.String() });
export type OptimisticLockBody = Static<typeof OptimisticLockBodySchema>;

/** Minimal error response — just the `error` string (no `message`). Use `ErrorSchema` when a detail message is also included. */
export const ErrorResponseSchema = t.Object({ error: t.String() });
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const HealthResponseSchema = t.Object({ status: t.String(), ts: t.String() });
export type HealthResponse = Static<typeof HealthResponseSchema>;

export const FunctionalPermissionsListSchema = t.Array(FunctionalPermissionSchema);
export type FunctionalPermissionsList = Static<typeof FunctionalPermissionsListSchema>;
