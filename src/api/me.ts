import type { ApiInstance } from "@/apps/api.ts";
import { getMyFunctionalPermissions } from "@/services/auth.ts";
import { t } from "elysia";

// noinspection JSUnusedGlobalSymbols
export default function register(app: ApiInstance) {
    app.get("/me/context", async ({ dbClient, session, tokenClaims }) => {
        const claims = (session?.idTokenClaims ?? tokenClaims ?? {}) as Record<string, unknown>;

        const functionalPermissions = await getMyFunctionalPermissions(dbClient, claims as Record<string, any>).catch(() => []);

        return {
            user: {
                oid: typeof claims.oid === "string" ? claims.oid : null,
                displayName: typeof claims.name === "string" ? claims.name : null,
                preferredUsername: typeof claims.preferred_username === "string" ? claims.preferred_username : null,
            },
            permissionNames: functionalPermissions.map((permission) => permission.functionalPermissionName),
            functionalPermissions,
        };
    }, {
        response: {
            200: t.Object({
                user: t.Object({
                    oid: t.Union([t.String(), t.Null()]),
                    displayName: t.Union([t.String(), t.Null()]),
                    preferredUsername: t.Union([t.String(), t.Null()]),
                }),
                permissionNames: t.Array(t.String()),
                functionalPermissions: t.Any(),
            }),
            401: t.String(),
        },
        detail: {
            tags: ["Auth"],
            summary: "Get current user context and functional permissions",
            description: "Retrieve the currently authenticated user's identity information and list of functional permissions they have been granted through group memberships. Authentication is required via SessionID cookie (preferred) or Bearer token. Returns null values if claims are not available.",
            parameters: [
                {
                    name: "Cookie",
                    description: "SessionID cookie set after successful OAuth2 login. Use this for browser-based authentication.",
                    in: "header",
                    required: false,
                    schema: { type: "string", example: "SessionID=<session-uuid>" },
                },
                {
                    name: "Authorization",
                    description: "Bearer token from EntraID for API-based authentication. Format: 'Bearer <token>'",
                    in: "header",
                    required: false,
                    schema: { type: "string", example: "Bearer eyJhbGciOiJSUzI1NiIs..." },
                },
            ],
        },
    });
}
