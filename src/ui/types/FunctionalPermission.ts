import type { FunctionalPermissionName } from "@/ui/auth/functional_permissions.ts";

/**
 * UI-safe functional permission type returned by admin API endpoints.
 */
export type FunctionalPermissionType = {
    identifier: string;
    functionalPermissionName: FunctionalPermissionName;
    group: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
};

/**
 * UI-safe new-functional-permission payload shape.
 */
export type NewFunctionalPermissionType = Omit<FunctionalPermissionType, "identifier" | "createdAt" | "updatedAt">;

