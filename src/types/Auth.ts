import type {FunctionalPermissionType} from "./FunctionalPermission.ts";

export type Claims = Record<string, unknown>;

export type AuthorizedContext = {
    claims: Claims;
    permissions: FunctionalPermissionType[];
};
