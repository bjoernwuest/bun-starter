import type { FunctionalPermissionType, NewFunctionalPermissionType } from "@/types/FunctionalPermission.ts";
import { registerFunctionalPermission } from "@/repo/FunctionalPermissionRepo.ts";
import { getDatabaseConnection } from "@/services/database.ts";
import { FunctionalPermissionNames } from "@/ui/auth/functional_permissions.ts";

// Define and register functional permissions here

const FP_READ_USERS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_USERS, description: "Permitted to read master data of all users - not including user profile", group: "Admin" };
export const FP_READ_USERS = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_USERS_DEF) satisfies FunctionalPermissionType;

const FP_READ_GROUPS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_GROUPS, description: "Permitted to read all groups", group: "Admin" };
export const FP_READ_GROUPS = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_GROUPS_DEF) satisfies FunctionalPermissionType;

const FP_READ_GROUP_FUNCTIONAL_PERMISSIONS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_GROUP_FUNCTIONAL_PERMISSIONS, description: "Read the functional permissions of groups.", group: "Admin" };
export const FP_READ_GROUP_FUNCTIONAL_PERMISSIONS = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_GROUP_FUNCTIONAL_PERMISSIONS_DEF) satisfies FunctionalPermissionType;

const FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS, description: "Can add or remove functional permissions from groups.", group: "Admin" };
export const FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS = await registerFunctionalPermission(getDatabaseConnection(), FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS_DEF) satisfies FunctionalPermissionType;

const FP_READ_FUNCTIONAL_PERMISSIONS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_FUNCTIONAL_PERMISSIONS, description: "Read the functional permissions in the system.", group: "Admin" };
export const FP_READ_FUNCTIONAL_PERMISSIONS = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_FUNCTIONAL_PERMISSIONS_DEF) satisfies FunctionalPermissionType;

const FP_READ_FUNCTIONAL_PERMISSION_GROUPS_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_FUNCTIONAL_PERMISSION_GROUPS, description: "Read the groups assigned in the system.", group: "Admin" };
export const FP_READ_FUNCTIONAL_PERMISSION_GROUPS = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_FUNCTIONAL_PERMISSION_GROUPS_DEF) satisfies FunctionalPermissionType;

const FP_READ_API_DOCUMENTATION_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_READ_API_DOCUMENTATION, description: "Permitted to view the API documentation page.", group: "Admin" };
export const FP_READ_API_DOCUMENTATION = await registerFunctionalPermission(getDatabaseConnection(), FP_READ_API_DOCUMENTATION_DEF) satisfies FunctionalPermissionType;

const FP_MANAGE_CONFIGURATION_DEF: NewFunctionalPermissionType = { functionalPermissionName: FunctionalPermissionNames.FP_MANAGE_CONFIGURATION, description: "Permitted to view and edit application configuration entries.", group: "Admin" };
export const FP_MANAGE_CONFIGURATION = await registerFunctionalPermission(getDatabaseConnection(), FP_MANAGE_CONFIGURATION_DEF) satisfies FunctionalPermissionType;

