REST endpoints

Files in this directory implement REST endpoints. Use this as template:

```typescript
import { authorize } from "@/services/auth.ts";
import { type ApiInstance } from "@/apps/api.ts";

// Define and register functional permissions in /src/services/auth/functional_perms.ts and then import here

// noinspection JSUnusedGlobalSymbols
export default (app: ApiInstance) =>
    app.get("/<URN>", async ({ dbClient, session, tokenClaims }) => {
        // If required, start with functional permission check like this:
        const session = await getSession(context.dbClient, getCookie(context.request, "SessionID"));
        if (!session) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "text/plain" } });
        const authz = await authorize(context.dbClient, session.idTokenClaims, [<functional permissions required for this endpoint>]);
        if (!authz.some(p => p.identifier === <functional permissions required for this endpoint>.identifier)) return new Response(JSON.stringify({ error: `Permission denied. Required: ${<functional permissions required for this endpoint>.functionalPermissionName}` }), { status: 403, headers: { "Content-Type": "application/json" } });

        // Impelementation of the endpoint goes here.
    }, {
        detail: {
            // OpenAPI specification documentation goes here. Follow ElysiaJS and Scalar documentation for this. The documentation will be used to generate the OAS documentation and the LLM-compatible view of the REST API OAS documentation.
        }
    });

```