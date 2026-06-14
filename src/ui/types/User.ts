/**
 * UI-safe user type returned by admin API endpoints.
 */
export type UserType = {
    identifier: string;
    firstName: string;
    lastName: string;
    email: string;
    disabled: boolean;
    createdAt: string;
    updatedAt: string;
};

/**
 * UI-safe new-user payload shape.
 */
export type NewUserType = Omit<UserType, "identifier" | "createdAt" | "updatedAt">;

/**
 * UI-safe group type returned by admin API endpoints.
 */
export type GroupType = {
    identifier: string;
    groupName: string;
    disabled: boolean;
    createdAt: string;
    updatedAt: string;
};

/**
 * UI-safe new-group payload shape.
 */
export type NewGroupType = Omit<GroupType, "identifier" | "createdAt" | "updatedAt">;

