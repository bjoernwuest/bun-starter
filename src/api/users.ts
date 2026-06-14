import { t } from "elysia";
import type { ApiInstance } from "@/apps/api.ts";
import { getConfigEntriesByKey } from "@/repo/ConfigRepo.ts";
import { type DBClient, runInTransaction } from "@/services/database.ts";
import { config as uiConfig } from "@/services/ui_config.ts";
import {type UserDetailsResponse, UserDetailsResponseSchema, type UsersResponse, UsersResponseSchema} from "@/types/AdminApi.ts";
import { authorize, getCookie, getSession } from "@/services/auth.ts";
import { FP_READ_FUNCTIONAL_PERMISSIONS, FP_READ_GROUPS, FP_READ_USERS } from "@/services/auth/functional_perms.ts";
import { getGroupIdsAssignedTo, getGroups, getUserCount, getUsers } from "@/repo/UserRepo.ts";
import { getFunctionalPermissionsOfGroup, getFunctionalPermissionsOfUser, getGroupsAssignedToFunctionalPermission } from "@/repo/FunctionalPermissionRepo.ts";
import {status} from "elysia";

const DEFAULT_USER_LIST_PAGE_SIZES = [10, 20, 50] as const;

type RouteContext = {
    dbClient: DBClient;
};

function parsePageSizes(raw: unknown): number[] {
    if (Array.isArray(raw)) {
        const parsed = Array.from(new Set(raw
            .map((value) => (typeof value === "number" ? value : Number(value)))
            .filter((value) => Number.isInteger(value) && value > 0)));
        return parsed.length > 0 ? parsed : [...DEFAULT_USER_LIST_PAGE_SIZES];
    }
    return [...DEFAULT_USER_LIST_PAGE_SIZES];
}

function parseBooleanQuery(value: unknown): boolean {
    return value === true || value === "true" || value === "1";
}

export async function getUserListPageSizes(context: RouteContext): Promise<number[]> {
    const entries = await getConfigEntriesByKey(context.dbClient, uiConfig.cfgUserListPageSizes.domain, uiConfig.cfgUserListPageSizes.key, { limit: 1 });
    return parsePageSizes(entries[0]?.value);
}


// noinspection JSUnusedGlobalSymbols
export default function register(app: ApiInstance) {
    app.get("/users", async (context) => {
        const session = await getSession(context.dbClient, getCookie(context.request, "SessionID"));
        if (!session) return status(401, "Not authenticated");
        const authz = await authorize(context.dbClient, session.idTokenClaims, [FP_READ_USERS]);
        if (!authz.some(p => p.identifier === FP_READ_USERS.identifier)) return status(403, `Permission denied. Required: ${FP_READ_USERS.functionalPermissionName}`);

        const availablePageSizes = await getUserListPageSizes(context);
        const page = Math.max(0, Number(context.query.page ?? 0));
        const pageSize = Math.max(0, Number(context.query.pageSize ?? availablePageSizes[0] ?? 1));
        const includeInactive = parseBooleanQuery(context.query.includeInactive);
        const total = await getUserCount(context.dbClient, includeInactive);

        const users = await getUsers(context.dbClient, undefined, {page: page, pageSize: pageSize}, includeInactive);

        return {
            users,
            page,
            pageSize: pageSize,
            total,
            availablePageSizes,
            includeInactive,
        } satisfies UsersResponse;
    }, {
        response: {200: UsersResponseSchema, 401: t.String(), 403: t.String()},
        detail: {
            tags: ["Admin"],
            summary: "Get paged user list",
            description: "Retrieve a paginated list of users with their core information. Supports filtering by active/inactive status. Requires 'FP_READ_USERS' permission.",
            parameters: [
                {
                    name: "page",
                    description: "Zero-based page number for pagination. Defaults to 0.",
                    in: "query",
                    required: false,
                    schema: { type: "integer", minimum: 0, default: 0 },
                },
                {
                    name: "pageSize",
                    description: "Number of users per page. Must be one of the available page sizes returned by the server. Defaults to the first available size.",
                    in: "query",
                    required: false,
                    schema: { type: "integer", minimum: 1 },
                },
                {
                    name: "includeInactive",
                    description: "Include disabled/inactive users in the results. Accepts 'true', '1', true (boolean). Defaults to false.",
                    in: "query",
                    required: false,
                    schema: { type: "string", enum: ["true", "1", "false", "0"], default: "false" },
                },
                {
                    name: "Cookie",
                    description: "SessionID cookie containing the authenticated session. Required for authentication.",
                    in: "header",
                    required: false,
                    schema: { type: "string", example: "SessionID=<session-uuid>" },
                },
            ],
        },
    });

    app.get("/users/:userid", async (context) => {
        const session = await getSession(context.dbClient, getCookie(context.request, "SessionID"));
        if (!session) return status(401, "Not authenticated");
        const authz = await authorize(context.dbClient, session.idTokenClaims, [FP_READ_USERS, FP_READ_GROUPS, FP_READ_FUNCTIONAL_PERMISSIONS]);
        if (!authz.some(p => p.identifier === FP_READ_USERS.identifier)) return status(403, `Permission denied. Required: ${FP_READ_USERS.functionalPermissionName}`);

        return await runInTransaction(context.dbClient, async (_tx) => {
            const [user] = await getUsers(context.dbClient, [{identifier: context.params.userid}]);

            if (!user) return status(404, "User does not exists");

            const includeInactive = parseBooleanQuery(context.query.includeInactive);
            const groups = authz.some(p => p.identifier === FP_READ_GROUPS.identifier) ? await getGroups(context.dbClient, (await getGroupIdsAssignedTo(context.dbClient, [{ identifier: user.identifier }])).get(user.identifier) ?? [], undefined, includeInactive) : [];

            const functionalPermissions = [FP_READ_GROUPS, FP_READ_FUNCTIONAL_PERMISSIONS].every(p => authz.some(ap => ap.identifier === p.identifier))
                ? await (async () => {
                    const perms = includeInactive
                        ? [...new Map((await Promise.all(groups.map((grp) => getFunctionalPermissionsOfGroup(context.dbClient, grp)))).flat().map((perm) => [perm.identifier, perm])).values()]
                        : await getFunctionalPermissionsOfUser(context.dbClient, user);
                    return await Promise.all(perms.map(async (perm) => ({
                        ...perm,
                        grantedByGroups: await getGroupsAssignedToFunctionalPermission(context.dbClient, perm)
                    })));
                })()
                : [];

            return {
                user: user,
                groups: groups,
                functionalPermissions: functionalPermissions,
                includeInactive: includeInactive
            } satisfies UserDetailsResponse;
        });
    }, {
        response: {200: UserDetailsResponseSchema, 401: t.String(), 403: t.String(), 404: t.String()},
        detail: {
            tags: ["Admin"],
            summary: "Get user details",
            description: "Retrieve detailed information about a specific user including their assigned groups and functional permissions. Requires 'FP_READ_USERS' permission. Additional data (groups, functional permissions) is included only if the user has 'FP_READ_GROUPS' and 'FP_READ_FUNCTIONAL_PERMISSIONS' permissions respectively.",
            parameters: [
                {
                    name: "userid",
                    description: "UUID of the user to retrieve. Must be a valid UUID identifier.",
                    in: "path",
                    required: true,
                    schema: { type: "string", format: "uuid" },
                },
                {
                    name: "includeInactive",
                    description: "When retrieving group and permission information, include disabled/inactive items. Accepts 'true', '1', true (boolean). Defaults to false.",
                    in: "query",
                    required: false,
                    schema: { type: "string", enum: ["true", "1", "false", "0"], default: "false" },
                },
                {
                    name: "Cookie",
                    description: "SessionID cookie containing the authenticated session. Required for authentication.",
                    in: "header",
                    required: false,
                    schema: { type: "string", example: "SessionID=<session-uuid>" },
                },
            ],
        },
    });
}

