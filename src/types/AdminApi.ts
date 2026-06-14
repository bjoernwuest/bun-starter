import { Type, type Static } from '@sinclair/typebox'
import {Group, User} from "@/schema/User.ts";
import {createSelectSchema} from "drizzle-typebox";
import {FunctionalPermission} from "@/schema/FunctionalPermission.ts";

const EdenUserSchema = Type.Object(createSelectSchema(User).properties)
const EdenGroupSchema = Type.Object(createSelectSchema(Group).properties)
export const FunctionalPermissionSchema = Type.Object(createSelectSchema(FunctionalPermission).properties)
export const FunctionalPermissionWithGroupsSchema = Type.Composite([
    FunctionalPermissionSchema,
    Type.Object({grantedByGroups: Type.Array(EdenGroupSchema)})
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
    users: Type.Array(EdenUserSchema),
    page: Type.Number({minimum: 0}),
    pageSize: Type.Number({minimum: 0}),
    total: Type.Number({minimum: 0}),
    availablePageSizes: Type.Array(Type.Number()),
    includeInactive: Type.Boolean()
});
export type UsersResponse = Static<typeof UsersResponseSchema>;

export const GroupsResponseSchema = Type.Object({
   groups: Type.Array(EdenGroupSchema),
    page: Type.Number({minimum: 0}),
    pageSize: Type.Number({minimum: 0}),
    total: Type.Number({minimum: 0}),
    availablePageSizes: Type.Array(Type.Number()),
    includeInactive: Type.Boolean()
});
export type GroupsResponse = Static<typeof GroupsResponseSchema>;

export const UserDetailsResponseSchema = Type.Object({
    user: EdenUserSchema,
    groups: Type.Array(EdenGroupSchema),
    functionalPermissions: Type.Array(FunctionalPermissionWithGroupsSchema),
    includeInactive: Type.Boolean()
});
export type UserDetailsResponse = Static<typeof UserDetailsResponseSchema>;

export const FunctionalPermissionDetailResponseSchema = Type.Object({functionalPermission: FunctionalPermissionSchema, grantedToGroups: Type.Array(EdenGroupSchema)});
export type FunctionalPermissionDetailResponseType = Static<typeof FunctionalPermissionDetailResponseSchema>;

export const GroupFunctionalPermissionResponseSchema = Type.Object({
   group: EdenGroupSchema,
   functionalPermissions: Type.Array(FunctionalPermissionSchema)
});
export type GroupFunctionalPermissionResponseType = Static<typeof GroupFunctionalPermissionResponseSchema>;

export const ErrorSchema = Type.Object({error: Type.String(), message: Type.Any()});
