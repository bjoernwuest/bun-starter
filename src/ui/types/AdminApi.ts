import type { FunctionalPermissionType } from "@/ui/types/FunctionalPermission.ts";
import type { GroupType, UserType } from "@/ui/types/User.ts";

export type FunctionalPermissionWithGroupsType = FunctionalPermissionType & {
    grantedByGroups?: GroupType[];
};

export type UsersResponse = {
    users: UserType[];
    page: number;
    pageSize: number;
    total: number;
    availablePageSizes: number[];
    includeInactive: boolean;
};

export type GroupsResponse = {
    groups: GroupType[];
    page: number;
    pageSize: number;
    total: number;
    availablePageSizes: number[];
    includeInactive: boolean;
};

export type UserDetailsResponse = {
    user: UserType;
    groups: GroupType[];
    functionalPermissions: FunctionalPermissionWithGroupsType[];
    includeInactive: boolean;
};

export type FunctionalPermissionDetailResponseType = {
    functionalPermission: FunctionalPermissionType;
    grantedToGroups: GroupType[];
};

export type FunctionalPermissionsResponse = {
    functionalPermissions: FunctionalPermissionType[];
    page: number;
    pageSize: number;
    total: number;
    availablePageSizes: number[];
};

export type GroupFunctionalPermissionResponseType = {
    group: GroupType;
    functionalPermissions: FunctionalPermissionType[];
};

export type ErrorResponse = {
    error: string;
    message: unknown;
};

export type ConfigValueType =
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "string[]"
    | "number[]";

export type ConfigEntryUI = {
    domain: string;
    key: string;
    description: string | null;
    type: ConfigValueType | null;
    value: unknown;
    inputFormat: string;
    outputFormat: string;
};

export type ConfigDomainGroup = {
    domain: string;
    entries: ConfigEntryUI[];
};

export type ConfigListResponse = {
    domains: ConfigDomainGroup[];
};

export type ConfigUpdateRequest = {
    value: unknown;
    knownValue: unknown;
};

export type ConfigUpdateResponse = ConfigEntryUI;

export type ConfigConflictResponse = {
    error: string;
    currentValue: unknown;
};

export type ApiKeySummary = {
    identifier: string;
    name: string;
    description: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    lastProlongedAt: string | null;
    lastProlongedBy: string | null;
    disabled: boolean;
    disabledAt: string | null;
    disabledBy: string | null;
    permissionNames: string[];
};

export type ApiKeysResponse = {
    apiKeys: ApiKeySummary[];
    page: number;
    pageSize: number;
    total: number;
    availablePageSizes: number[];
    includeDisabled: boolean;
};

export type ApiKeyDetailResponse = {
    apiKey: ApiKeySummary;
    permissionIdentifiers: string[];
    allPermissions: FunctionalPermissionType[];
};

export type CreateApiKeyRequest = {
    name: string;
    description?: string | null;
    permissionIdentifiers?: string[];
};

export type CreateApiKeyResponse = {
    identifier: string;
    plainApiKey: string;
    expiresAt: string;
    keyLength: number;
    validityDays: number;
};

