# Changelog: `src/api/` — API Route Layer

## Overview

The entire API route layer underwent a comprehensive refactoring centered on three themes:
1. **File naming convention**: All 10 route files renamed from `snake_case` to `PascalCase`.
2. **Schema extraction**: All inline `t.Object(...)` TypeBox schemas extracted to dedicated `@/types/` files for reuse and OpenAPI consistency.
3. **Import alignment**: All cross-layer imports updated to match the new PascalCase file names throughout the codebase (`Auth.ts`, `DatabaseDriver.ts`, `PubSub.ts`, `Config.ts`, etc.).

Additional changes: enhanced OpenAPI documentation with explicit parameter definitions, OpenAPI tag reorganization from monolithic `"Admin"` to domain-specific tags, and the `getUserListPageSizes` helper was relocated from `@/api/users.ts` to `@/services/ui_config.ts` with a changed signature.

---

## File-by-File Analysis

### 1. `api_keys.ts` → `ApiKey.ts` (similarity 59%)

**Rename**: `src/api/api_keys.ts` → `src/api/ApiKey.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- `@/repo/api_keys.ts` → `@/repo/ApiKeyRepo.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- `@/api/users.ts` (cross-reference for `getUserListPageSizes`) → `@/services/ui_config.ts`
- Added imports for 10 schema types from `@/types/ApiKey.ts` and `@/types/Api.ts`

**Schema extraction**: All 12 inline response/body schemas extracted:
- `ApiKeySummarySchema` (removed inline) — now in `@/types/ApiKey.ts`
- `ApiKeysResponseSchema`, `ApiKeyDetailSchema`, `ApiKeyCreateBodySchema`, `ApiKeyCreatedResponseSchema`, `ApiKeyUpdateMetadataBodySchema`, `ApiKeyUpdatedAtResponseSchema`, `ApiKeyProlongBodySchema`, `ApiKeyProlongResponseSchema`, `ApiKeyDisableResponseSchema`, `ApiKeyPermissionsBodySchema` — all imported from `@/types/ApiKey.ts`
- `OptimisticLockBodySchema`, `SuccessResponseSchema` — imported from `@/types/Api.ts`

**Behavioral change**: `getUserListPageSizes(context)` → `getUserListPageSizes(context.dbClient)` — now passes only `dbClient` instead of full route context.

**OpenAPI tags**: `"Admin"` → `"API Key"` for all 7 endpoints.

**OpenAPI documentation**: Added explicit `parameters` arrays with `X-API-Key` header documentation and path/query parameter schemas for every endpoint (GET list, GET detail, POST create, PUT update metadata, PUT prolong, PUT disable, PUT permissions, DELETE).

---

### 2. `audit_log.ts` → `AuditLog.ts` (similarity 77%)

**Rename**: `src/api/audit_log.ts` → `src/api/AuditLog.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- Added `t` import from `elysia` (was missing)
- Added `getSystemUser` import from `@/repo/UserRepo.ts`
- Added `AuditLogClearResponseSchema`, `AuditLogResponseSchema` from `@/types/AuditEntry.ts`

**Schema extraction**: Explicit `response` blocks added with imported schemas instead of relying solely on `detail`:
- GET: `response: { 200: AuditLogResponseSchema, 401: t.String(), 403: t.String() }`
- POST clear: `response: { 200: AuditLogClearResponseSchema, 401: t.String(), 403: t.String() }`

**OpenAPI tags**: `"Admin"` → `"Audit"`.

**OpenAPI documentation**: Added `X-API-Key` header parameter documentation for both endpoints.

---

### 3. `config.ts` → `Config.ts` (similarity 66%)

**Rename**: `src/api/config.ts` → `src/api/Config.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- `@/services/config_validation.ts` → `@/services/Config.ts` (merged: `parseConfigValue`, `validateConfigInputFormat` now from `Config.ts`)
- `@/services/pubsub.ts` → `@/services/PubSub.ts`
- `@/types/ConfigEntry.ts` → `@/types/Config.ts` (with `pubsub_ConfigUpdated` constant and `schemaForConfigType` now from there)
- Inline constants `pubsub_Config` and `pubsub_ConfigUpdated` removed; `pubsub_ConfigUpdated` now imported from `@/types/Config.ts`

**Schema extraction**:
- `ConfigDomainsResponseSchema`, `ConfigEntryUiSchema`, `ConfigUpdateBodySchema`, `ConfigParamsSchema`, `ConfigUpdateConflictSchema` — imported from `@/types/Config.ts`
- `ErrorResponseSchema` — imported from `@/types/Api.ts`
- Inline `t.Object(...)` for 200, 400, 409 responses replaced with named schemas

**OpenAPI tags**: Remained `"Admin"` (not split into domain-specific tag).

**OpenAPI documentation**: Added `X-API-Key` header, `domain` path param, and `key` path param documentation.

---

### 4. `functionalpermissions.ts` → `FunctionalPermission.ts` (similarity 90%)

**Rename**: `src/api/functionalpermissions.ts` → `src/api/FunctionalPermission.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- `@/types/AdminApi.ts` → `@/types/Api.ts` (schemas now exported from `Api.ts`)
- `@/api/users.ts` (cross-ref for `getUserListPageSizes`) → `@/services/ui_config.ts`
- Added `GroupIdentifiersBodySchema` from `@/types/FunctionalPermission.ts`
- Added `FunctionalPermissionsListSchema`, `SuccessResponseSchema` from `@/types/Api.ts`

**Schema changes**:
- Response schema for list: inline `t.Array(FunctionalPermissionSchema)` replaced with `FunctionalPermissionsListSchema`
- Grant/revoke responses: inline `t.Object({success: t.Boolean()})` replaced with `SuccessResponseSchema`
- Grant/revoke body: inline object replaced with `GroupIdentifiersBodySchema`

**Behavioral change**: `getUserListPageSizes(context)` → `getUserListPageSizes(context.dbClient)`.

**OpenAPI tags**: `"Admin"` → `"Auth"` for all 4 endpoints.

---

### 5. `groups.ts` → `Group.ts` (similarity 91%)

**Rename**: `src/api/groups.ts` → `src/api/Group.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- `@/types/AdminApi.ts` → `@/types/Api.ts`
- `@/api/users.ts` (cross-ref) → `@/services/ui_config.ts`
- Added `PermissionIdentifiersBodySchema` from `@/types/FunctionalPermission.ts`
- Added `FunctionalPermissionsListSchema`, `SuccessResponseSchema` from `@/types/Api.ts`

**Schema changes**:
- Group functional permissions response: inline `t.Array(FunctionalPermissionSchema)` → `FunctionalPermissionsListSchema`
- Grant/revoke response: inline `t.Object({success: t.Boolean()})` → `SuccessResponseSchema`
- Grant/revoke body: inline object → `PermissionIdentifiersBodySchema`

**Behavioral change**: `getUserListPageSizes(context)` → `getUserListPageSizes(context.dbClient)`.

**OpenAPI tags**: `"Admin"` → `"Users & Groups"` for all 5 endpoints.

---

### 6. `health.ts` → `Health.ts` (similarity 56%)

**Rename**: `src/api/health.ts` → `src/api/Health.ts`

**Import changes**: Added `HealthResponseSchema` from `@/types/Api.ts`.

**Schema extraction**: Explicit `response: { 200: HealthResponseSchema }` added.

**OpenAPI documentation**: Added `X-API-Key` header parameter documentation. Removed trailing newline at end of file.

---

### 7. `me.ts` → `Me.ts` (similarity 78%)

**Rename**: `src/api/me.ts` → `src/api/Me.ts`

**Import changes**:
- `@/services/auth.ts` → `@/services/Auth.ts`
- Added `t` import from `elysia`
- Added `MeContextResponseSchema` from `@/types/Auth.ts`

**Schema extraction**: Inline `t.Object({ user: ..., permissionNames: ..., functionalPermissions: ... })` replaced with `MeContextResponseSchema`.

**OpenAPI tags**: Remained `"Me"` (already had domain-specific tag).

---

### 8. `request_bundling.ts` → `RequestBundling.ts` (similarity 92%)

**Rename**: `src/api/request_bundling.ts` → `src/api/RequestBundling.ts`

**Import changes**:
- `@/services/request_bundling.ts` → `@/services/RequestBundling.ts`
- Added `RequestBundlingClientConfigSchema` and types from `@/types/RequestBundling.ts`
- Added `ErrorResponseSchema` from `@/types/Api.ts`
- Added `t` import from `elysia`

**Schema extraction**:
- GET config: Added `response: { 200: RequestBundlingClientConfigSchema, 401: t.String() }`
- POST bundle: Added `response: { 200: t.Any(), 400: ErrorResponseSchema, 401: t.String() }`

**OpenAPI documentation**: Added `X-API-Key` header parameter to GET config endpoint.

**OpenAPI tags**: Remained `"Request Bundling"`.

---

### 9. `server_sent_events.ts` → `ServerSentEvent.ts` (similarity 74%)

**Rename**: `src/api/server_sent_events.ts` → `src/api/ServerSentEvent.ts`

**Import changes**:
- `@/services/server_sent_events.ts` → `@/services/ServerSentEvents.ts`
- Added `SseStreamQuerySchema`, `SseTopicsUpdateBodySchema`, `SseTopicFilterStateSchema`, `SseKnownTopicsResponseSchema` from `@/types/ServerSentEvents.ts`

**Schema extraction**:
- GET stream query: inline `t.Object({ topics: t.Optional(t.String()) })` → `SseStreamQuerySchema`
- PATCH topics body: inline `t.Object({ topics: t.Array(t.String()) })` → `SseTopicsUpdateBodySchema`
- PATCH topics response: inline → `SseTopicFilterStateSchema`
- GET known-topics response: inline → `SseKnownTopicsResponseSchema`

**Behavioral change (PATCH /topics)**: Manual body parsing via `request.json()` + `isTopicArray` validation replaced with Elysia's built-in body parameter (`body.topics`). The `isTopicArray` helper function removed entirely.

**OpenAPI documentation**: Added explicit `X-API-Key` header and `topics` query parameter documentation across all 3 endpoints.

**OpenAPI tags**: Remained `"Realtime"`.

---

### 10. `users.ts` → `User.ts` (similarity 79%)

**Rename**: `src/api/users.ts` → `src/api/User.ts`

**Import changes**:
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- `@/services/auth.ts` → `@/services/Auth.ts`
- `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`
- `@/types/AdminApi.ts` → `@/types/Api.ts`
- Added `getUserListPageSizes` from `@/services/ui_config.ts`
- Added `t` from `elysia`

**Code removal**: The `getUserListPageSizes()` function and its helpers (`RouteContext` type, `DEFAULT_USER_LIST_PAGE_SIZES`, `parsePageSizes`) were entirely removed from this file. They were relocated to `@/services/ui_config.ts`. Callers now use `getUserListPageSizes(context.dbClient)` instead of `getUserListPageSizes(context)`.

**Behavioral change**: `getUserListPageSizes(context)` → `getUserListPageSizes(context.dbClient)`.

**OpenAPI tags**: `"Admin"` → `"Users & Groups"` for both endpoints (GET list, GET detail).

---

### 11. `README.md` — DELETED

The outdated `src/api/README.md` template file was removed. Its guidance is superseded by the comprehensive `src/api/AGENTS.md`.

### 12. `AGENTS.md` — NEW (untracked)

A new, comprehensive 14KB `AGENTS.md` file was added (untracked — `?? src/api/AGENTS.md` in git status). It provides detailed AI agent guidance for the API route layer, covering:
- Base route prefix and registration conventions
- Auto-loading via dynamic `import()`
- Context extension via `.decorate`/`.derive`
- Authentication context properties
- Database transaction handling
- OpenAPI documentation requirements
- Schema definition patterns
- Permissions and authorization patterns
- PubSub/SSE topic naming conventions
- Common anti-patterns to avoid

---

## Cross-Cutting Patterns

### Import Path Normalization

Every file in `src/api/` had its imports updated to reflect the PascalCase-renamed service, repo, and type layers:

| Old Import | New Import |
|---|---|
| `@/services/auth.ts` | `@/services/Auth.ts` |
| `@/services/auth/functional_perms.ts` | `@/services/auth/FunctionalPermissions.ts` |
| `@/services/database.ts` | `@/services/DatabaseDriver.ts` |
| `@/services/pubsub.ts` | `@/services/PubSub.ts` |
| `@/services/config_validation.ts` | `@/services/Config.ts` |
| `@/services/request_bundling.ts` | `@/services/RequestBundling.ts` |
| `@/services/server_sent_events.ts` | `@/services/ServerSentEvents.ts` |
| `@/repo/api_keys.ts` | `@/repo/ApiKeyRepo.ts` |
| `@/types/AdminApi.ts` | `@/types/Api.ts` |
| `@/types/ConfigEntry.ts` | `@/types/Config.ts` |
| `@/api/users.ts` (for `getUserListPageSizes`) | `@/services/ui_config.ts` |

### Schema Extraction Pattern

Inline `t.Object({...})` schemas were universally replaced with named, imported schemas. This provides:
- **Single source of truth** for API contracts
- **Reusable schemas** across route handlers, client code, and tests
- **Better OpenAPI generation** with consistent naming

### OpenAPI Tag Reorganization

The monolithic `"Admin"` tag was split into domain-specific tags:

| Old Tag | New Tag | Affected Files |
|---|---|---|
| `"Admin"` | `"API Key"` | ApiKey.ts |
| `"Admin"` | `"Audit"` | AuditLog.ts |
| `"Admin"` | `"Auth"` | FunctionalPermission.ts |
| `"Admin"` | `"Users & Groups"` | Group.ts, User.ts |
| `"Admin"` | *(unchanged)* | Config.ts |

### OpenAPI Parameter Documentation

Most endpoints gained explicit `parameters` arrays in their `detail` blocks, documenting:
- `X-API-Key` header (with example value)
- Path parameters (with format constraints)
- Query parameters (with defaults and constraints)

### `getUserListPageSizes` Relocation

The helper function was moved from `@/api/users.ts` to `@/services/ui_config.ts`, and its signature changed:
- **Old**: `getUserListPageSizes(context: RouteContext)` — took full route context
- **New**: `getUserListPageSizes(dbClient: DBClient)` — takes only the database client

This eliminated a circular-ish dependency where other API route files imported from `@/api/users.ts`.

### Request Body Parsing (ServerSentEvent)

The `PATCH /server_sent_events/topics` endpoint previously parsed JSON manually with `request.json()` and validated with a custom `isTopicArray` function. This was replaced with Elysia's declarative body parsing (`body.topics`), removing ~10 lines of manual parsing/validation code.

---

## Summary Statistics

| Metric | Count |
|---|---|
| Files renamed | 10 |
| Files deleted | 1 (README.md) |
| Files added | 1 (AGENTS.md) |
| Total files in diff | 11 |
| Cross-layer import path updates | ~50+ occurrences |
| Inline schemas extracted to types | ~30+ |
| OpenAPI tags changed | 7 of 11 files |
| Endpoints with enhanced parameter docs | ~25 |
| Behavioral changes | 2 (getUserListPageSizes signature, SSE body parsing) |
