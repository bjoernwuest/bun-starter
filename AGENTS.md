# AGENTS.md – Guidance for AI Coding Agents

This document provides essential knowledge to make AI agents immediately productive in this codebase.

## Architecture Overview

**Stack**: Elysia.js + React + PostgreSQL + Bun + TypeScript

**Structure**: Multi-tier Elysia sub-applications mounted in a single HTTP server:
- **Login App** (`src/apps/login.ts`) – OAuth2/OpenID authentication with EntraID
- **API App** (`src/apps/api.ts`) – REST API with request bundling, auto-loaded routes, OpenAPI docs, Bearer + SessionID auth
- **UI App** (`src/apps/ui.ts`) – Client-side React app (100% CSR)
- **Setup App** (`src/apps/setup.ts`) – Interactive configuration wizard

**Database**: PostgreSQL with Drizzle ORM. Mutations ONLY occur in `/src/repo/` via repository pattern. Migrations managed by Umzug + Drizzle Kit.

---

## Request Bundling (Critical Pattern)

**What**: Mutating requests (POST/PUT/PATCH/DELETE) are automatically queued on the client and dispatched as a single HTTP request to `/api/request_bundling` after ~250ms or size/count thresholds.

**Why**: Reduces network overhead ~50–70% while maintaining per-request Promise semantics.

**How to use**:
- Frontend: Call `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()` from `src/ui/api/index.ts`
- Backend: Register endpoint via `/src/api/request_bundling.ts` (already implemented)
- Read calls: `apiGet()`, `apiQuery()` bypass bundling (direct fetch)

**Key files**:
- Client: `src/ui/api/_request_bundling.ts` (queuing + ndjson parser), `src/ui/api/_client.ts` (API primitives)
- Server: `src/api/request_bundling.ts` (dispatches sub-requests as internal fetch, streams ndjson)
- Design: `design/request_bundling.md` (845 lines; required reading for any bundling changes)

**Important**: Treat timeout !== rollback. Use idempotent mutations; `clientRequestId` enables duplicate detection on retry.

---

## Configuration System

**Pattern**: Declare config metadata in service files, validated at setup-time, stored in database, read at runtime.

**Lifecycle**:
1. Service declares `export const config = { cfgExample: { domain, key, type, mandatoryForStart, ... } }` (e.g., `src/services/auth.ts`)
2. Setup wizard (`getSetupDemand()`) discovers missing mandatory entries
3. UI accepts values, TypeBox validates, repo persists
4. Runtime reads via `getConfigEntriesByKey()` from `ConfigRepo.ts`

**Type Authority**: Enum `ConfigValueTypes` in `src/types/ConfigEntry.ts`. Types: `string`, `number`, `boolean`, `object`, arrays of each.

**Key files**:
- Declarations: `src/services/auth.ts`, `src/services/EntraIDSync.ts`, `src/services/ui_config.ts`, `src/services/request_bundling.ts`
- Persistence: `src/repo/ConfigRepo.ts`
- Schema: `src/schema/Config.ts`
- Design: `design/configuration.md`

---

## Authentication & Authorization

**Mechanisms**:
- **SessionID**: Cookie-based sessions (OAuth2 callback → DB session → SessionID cookie)
- **Bearer Token**: Validated against EntraID on each request

**Flow**:
1. User logs in via `/login` (OpenID Connect)
2. Backend creates DB session, sets SessionID cookie
3. `src/services/auth.ts` validates on each API request (Bearer or SessionID)
4. Returns `session` + `tokenClaims` to route handler

**Permissions**: Functional permissions system (fine-grained RBAC)
- Declared in `src/services/auth/functional_perms.ts`
- Checked via `authorize(dbClient, tokenClaims, requiredPerms)`
- Groups grant permissions; `cfgRootUserGroup` has superuser status (GUID-based)

**Key files**:
- Auth logic: `src/services/auth.ts` (600+ lines; covers cookies, sessions, bearer tokens, OIDC)
- Functional perms: `src/services/auth/functional_perms.ts`
- Routes: `src/apps/api.ts` (lines 14–68 inject session/bearer context)

---

## Data Access (Repository Pattern)

**Rule**: All database mutations ONLY in `/src/repo/`. Queries can be inline; mutations must use repo functions.

**Structure**:
- `UserRepo.ts`: User/Group/Functional Permission CRUD
- `ConfigRepo.ts`: Configuration entries
- `FunctionalPermissionRepo.ts`: Permission registration + grants

**Transactions**: Wrap multi-operation mutations in `runInTransaction(db, async (tx) => { ... })` from `database.ts`.

**Schema**: Drizzle models in `/src/schema/`. No raw SQL unless absolutely required.

**Key files**:
- Repos: `src/repo/*.ts`
- Schema: `src/schema/*.ts`
- Transaction helper: `src/services/database.ts` (line ~140: `runInTransaction`)
- Guidelines: `GUIDELINES.md` (rule 12–13: repo-only mutations & transactions)

---

## API Route Pattern

**Auto-loading**: Routes in `/src/api/*.ts` are dynamically imported and registered (see `src/apps/api.ts` lines 150–170).

**Template**:
```typescript
import { authorize } from "@/services/auth.ts";
import { type ApiInstance } from "@/apps/api.ts";

export default (app: ApiInstance) =>
    app.get("/path", async ({ dbClient, session, tokenClaims, request }) => {
        // Route handler receives injected context
        // session = from SessionID cookie or undefined
        // tokenClaims = from Bearer token or undefined
    }, {
        detail: {
            // OpenAPI documentation (required for LLM-compatible API docs)
        }
    });
```

**Auth Pattern**:
```typescript
const authz = await authorize(dbClient, session?.idTokenClaims, [requiredPerm1, requiredPerm2]);
if (!authz.find(p => p.identifier === requiredPerm1.identifier)) {
    return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
}
```

**Key files**:
- Example routes: `src/api/users.ts`, `src/api/groups.ts`, `src/api/functionalpermissions.ts`
- README: `src/api/README.md` (template + OpenAPI guidance)
- API app setup: `src/apps/api.ts` (auto-loading + auth injection)

---

## Frontend Architecture

**Framework**: React 19 + React Router 7 + PrimeReact (UI components)

**Rendering**: 100% client-side rendering. Every Elysia sub-app serves its own JS bundle with 1-year cache (etag support).

**API Layer**: Domain-specific files import from `src/ui/api/index.ts` which re-exports primitives. No direct `fetch()` calls outside `src/ui/api/`.

**Example**:
```typescript
// src/ui/api/Users.ts
import { apiGet, apiPost } from './index.ts';
export async function getUsers() { return apiGet<User[]>('/api/users'); }
export async function createUser(data) { return apiPost('/api/users', data); }
```

**State Management**: No Redux/Zustand. Use React hooks + domain API functions.

**Key files**:
- Pages: `src/ui/pages/*.tsx` (admin views, dashboard)
- API wrapper: `src/ui/api/index.ts`, `src/ui/api/_client.ts`, `src/ui/api/_request_bundling.ts`
- Types: `src/ui/types/` (mirrors server types)
- App entry: `src/ui/app.tsx` (router + page registry)

---

## Real-Time Updates (PubSub)

**Pattern**: Server publishes events on topics; clients subscribe to receive updates (WebSocket).

**Usage**:
- Declare topics as constants (e.g., `pubsub_UserAuth`, `pubsub_UserAuthLogin`)
- Publish: `PubSub.publish(topic, payload)`
- Subscribe: `PubSub.subscribe(topic, callback)` (frontend WebSocket handler)

**Scope**: Keep subscriptions narrow; track what resource frontend renders to publish only affected changes.

**Key files**:
- PubSub: `src/services/pubsub.ts`
- Examples: `src/services/auth.ts` (lines 21–23: topic constants and usage)
- Guidelines: `GUIDELINES.md` (rule 6: narrow scope, track resource)

---

## Database Migrations

**Workflow**:
1. Modify schema in `src/schema/*.ts` (Drizzle models)
2. Run: `bun drizzle` (generates migration + template wrapper)
3. Migration file: `src/migrations/[timestamp]_name.sql` (generated)
4. Template wrappers: `src/migrations/[timestamp]_0_pre.ts`, `src/migrations/[timestamp]_z_post.ts` (for pre/post hooks)

**Key files**:
- Schema models: `src/schema/schema.ts` (re-exports all models)
- Migrations: `src/migrations/*.ts` and `src/migrations/*.sql`
- Generator script: `scripts/generate_umzug_templates.ts`
- Initialization: `src/services/database.ts` (line ~90: `initDatabase()`)

---

## Development Workflows

**Run in dev mode**: `DEV_MODE=1 bun src/main.ts` (enables logging, file serving, mock endpoints)

**Build for production**: `bun build src/main.ts --target bun --outdir ./dist`

**Run tests**: `bun test` (Bun's native test runner)

**Generate migrations**: `bun drizzle`

**Lint/Type-check**: Use IDE (TypeScript strict mode enforced via `tsconfig.json`)

**Debugging**: Dev mode logs database queries (if Drizzle logger enabled), route loading, auth flow.

---

## Type Safety & Validation

**Schema Validation**: TypeBox (`@sinclair/typebox`) for request/response schemas
- Used for OpenAPI docs generation
- Config validation in setup wizard
- Manual validation with `Value.Check(schema, data)`

**Entity Types**: Mirror database schema
- `src/types/User.ts`, `src/types/ConfigEntry.ts`, etc.
- `src/schema/*.ts` are Drizzle models (related but different purpose)
- Frontend mirrors: `src/ui/types/` (subset, UI-only fields added locally)

**Pattern**: Use discriminated unions for polymorphic types (e.g., config value types).

**Key files**:
- Type definitions: `src/types/` and `src/ui/types/`
- Validation: `src/schema/` (Drizzle), `@sinclair/typebox` for schemas

---

## Optimistic Locking & Data Consistency

**Pattern**: All updates require `lastUpdated` field (timestamp); compare with DB row before commit.

**Why**: Multi-client safety; detect stale edits before applying.

**Implementation**: In repo update functions, check timestamp matches before `UPDATE`.

**Error**: Return 409 Conflict if timestamp mismatch.

**Key files**: Data update routes in `src/api/` (e.g., `users.ts`, `functionalpermissions.ts`)

---

## Zero-Trust Architecture

**Client**: Validate all input before sending to server; understand & respect permissions.

**Server**: Validate all input again; re-check permissions on every request (never trust client).

**Why**: Compromised client or MITM cannot bypass server-side checks.

**Guidelines**: `GUIDELINES.md` (rule 10: establish zero-trust)

---

## Project-Specific Conventions

1. **No direct `fetch()` in domain code** – Use API primitives from `src/ui/api/`
2. **No database access outside repos** – All mutations via `src/repo/`
3. **Configuration === service.config export** – New param? Add to service, not hardcoded
4. **Transactions for multi-table mutations** – `runInTransaction()` helper
5. **Idempotency for request bundling** – Timeout doesn't mean rollback; use `clientRequestId` for duplicate detection
6. **OpenAPI docs on every route** – LLM doc generation requires it
7. **SessionID cookie is HttpOnly + Secure** – No client-side JS access
8. **Functional permissions not role-based** – Permission checks are fine-grained, not group-based (groups grant perms)

---

## Troubleshooting Common Issues

**Request bundling not firing**: Check routes use `apiPost()` etc., not direct `fetch()`

**Auth failures**: Check SessionID cookie set/read correctly; Bearer token validated against EntraID

**Migration errors**: Ensure schema changes use Drizzle syntax; run `bun drizzle` before deploy

**Type errors**: Check `src/types/` vs `src/schema/` distinction; mirror relationship on frontend, which must use `/src/ui/types/`

**PubSub silence**: Ensure client subscribes to exact topic string; check Server-Sent-Event connection

---

## Files to Read First

1. `GUIDELINES.md` – Project rules (13 rules; read rule numbers to understand scope)

---

## External Dependencies

Check `./package.json` .

---

**Last Updated**: 2026-06-13
