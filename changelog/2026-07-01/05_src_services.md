# src/services/ Changes

## Overview: snake_case → PascalCase Rename + Type System Alignment

All service files were renamed from snake_case to PascalCase to match the project's new naming convention. During the rename, import paths were updated to reflect the new type system (`ConfigEntryType` → `Config`, `UserType`/`NewUserType` → `User`/`UserInsert`, etc.) that was restructured in `src/types/`. Several files also received functional improvements beyond cosmetic changes.

---

## File-by-File Analysis

### 1. `audit_log.ts` → `AuditLog.ts` (renamed + modified, 90% similarity)

**Rename:** `audit_log.ts` → `AuditLog.ts`

**Import updates:**
- `@/services/pubsub.ts` → `@/services/PubSub.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts` (added `type DBClient` import)
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`

**Behavioral changes:**
- **`readRuntimeConfig()`** now accepts `db: DBClient` as a parameter instead of calling `getDatabaseConnection()` internally. This makes the function more testable and avoids creating new connections.
- **`startAuditLog()`** now accepts `db: DBClient` parameter and passes it down to `readRuntimeConfig(db)`. The internal `getDatabaseConnection()` call was removed.

### 2. `auth.ts` → `Auth.ts` (renamed + modified, 95% similarity)

**Rename:** `auth.ts` → `Auth.ts`

**Import updates:**
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts` (added `runInTransaction` import)
- `@/services/EntraIDSync.ts` import reformatted as multi-line
- `./pubsub.ts` → `./PubSub.ts`
- `@/repo/api_keys.ts` → split: `@/repo/ApiKeyRepo.ts` + `@/types/ApiKey.ts` (for `pubsub_ApiKeyPermissionsChanged`)
- Added `import type {Session} from "@/types/Auth.ts"`

**Type changes:**
- `UserType` → `User` (from `@/types/User.ts`)
- `FunctionalPermissionType` → `FunctionalPermission` (aliased import from `@/types/FunctionalPermission.ts`)

**Behavioral changes:**
- **Removed `Session` interface** definition — moved to `@/types/Auth.ts` as the canonical location
- **`finishAuth()`**: `db.transaction(async (tx) => {...})` → `runInTransaction(db, async (tx) => {...})` — uses the centralized transaction helper with consistent isolation level settings
- **`getLoggedinUserObject()`** return type: `Promise<UserType | undefined>` → `Promise<User | undefined>`
- **`isMemberOfRootUserGroup()`** parameter type: `UserType` → `User`

### 3. `client-builder.ts` → `ClientBuilder.ts` (pure rename, 100% similarity)

**Rename:** `client-builder.ts` → `ClientBuilder.ts`

No content changes — pure rename operation.

### 4. `config_validation.ts` → `Config.ts` (renamed + modified, 82% similarity)

**Rename:** `config_validation.ts` → `Config.ts`

**Import updates:**
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`

**Behavioral changes:**
- **Removed `schemaForConfigType()` function** — this function generated TypeBox `TSchema` objects for config value types. It was removed because server-side TypeBox validation is no longer needed with the new type system.
- **Removed TypeBox import** (`@sinclair/typebox`) — no longer required for this module.

### 5. `database.ts` → `DatabaseDriver.ts` (renamed + modified, 87% similarity)

**Rename:** `database.ts` → `DatabaseDriver.ts`

**Import updates:**
- Import spacing normalized (curly brace spacing)

**Behavioral changes:**
- **Dynamic schema loading**: Replaced static `import * as schema from "@/schema/schema.ts"` with a new `loadSchemaModules()` function that:
  - Uses `Bun.Glob("*.ts")` to scan all `.ts` files in `src/schema/`
  - Filters out `helpers.ts` and `.d.ts` files
  - Dynamically imports each module via `import(pathToFileURL(...))`
  - Merges all exports into a single schema object
  - Result: `const schema = await loadSchemaModules();` — top-level await replaces static import
- **Added `import {pathToFileURL} from "node:url"`** — required for the dynamic import pattern above

This change means new schema files are automatically picked up without needing to maintain a central barrel export (`schema.ts`).

### 6. `pubsub.ts` → `PubSub.ts` (pure rename, 100% similarity)

**Rename:** `pubsub.ts` → `PubSub.ts`

No content changes — pure rename operation.

### 7. `request_bundling.ts` → `RequestBundling.ts` (renamed + modified, 86% similarity)

**Rename:** `request_bundling.ts` → `RequestBundling.ts`

**Import updates:**
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`

**Behavioral changes:**
- **Moved fallback constants to types module**: Constants `FALLBACK_SERVER_FLUSH_MS`, `FALLBACK_SERVER_FLUSH_BYTES`, `FALLBACK_SERVER_FLUSH_COUNT`, `FALLBACK_DEFAULT_SERVER_TIMEOUT_MS`, `FALLBACK_MIN_SERVER_TIMEOUT_MS`, `FALLBACK_MAX_SERVER_TIMEOUT_MS`, `FALLBACK_CLIENT_MAX_AGE_MS`, `FALLBACK_CLIENT_MAX_BYTES`, `FALLBACK_CLIENT_MAX_REQUESTS`, `FALLBACK_CLIENT_DEFAULT_EXPECTED_PROCESSING_MS`, `FALLBACK_CLIENT_DEFAULT_TIMEOUT_MS` are now imported from `@/types/RequestBundling.ts` instead of being defined locally.
- **Moved `RequestBundlingServerConfig` interface** to `@/types/RequestBundling.ts` — now imported as a type rather than defined locally.

This is part of the broader effort to consolidate type definitions in `src/types/`.

### 8. `server_sent_events.ts` → `ServerSentEvents.ts` (renamed + modified, 92% similarity)

**Rename:** `server_sent_events.ts` → `ServerSentEvents.ts`

**Import updates:**
- `./pubsub.ts` → `./PubSub.ts`

**Behavioral changes:**
- **Moved type definitions to `@/types/ServerSentEvents.ts`**: `ServerSentEventEnvelope`, `ServerSentEventClientConfig`, `ServerSentEventClientSnapshot` — previously defined locally, now imported from the types module.
- **Moved constants to `@/types/ServerSentEvents.ts`**: `DEFAULT_MAX_BUFFERED_EVENTS`, `HEARTBEAT_INTERVAL_MS`, `STALE_TTL_MS` — previously defined locally, now imported.

### 9. `setup.ts` → `Setup.ts` (renamed + modified, 96% similarity)

**Rename:** `setup.ts` → `Setup.ts`

**Import updates:**
- `./database.ts` → `./DatabaseDriver.ts`
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`

**Behavioral changes:**
- **Hardcoded filename reference updated**: `setup.ts` → `Setup.ts` in the `getMissingConfigParameters()` function that checks service files for config requirements.

### 10. `EntraIDSync.ts` (modified, not renamed)

**Import updates:**
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`
- `@/types/User.ts`: `NewGroupType` → `GroupInsert`, `NewUserType` → `UserInsert`
- `./database.ts` → `./DatabaseDriver.ts`
- `./pubsub.ts` → `./PubSub.ts`
- `./auth.ts` → `./Auth.ts`

**Behavioral changes:**
- **`startScheduler()`**: `getDatabaseConnection().transaction(async tx => {...})` → `runInTransaction(getDatabaseConnection(), async tx => {...})` — uses centralized transaction helper
- **Type annotations updated**: `NewUserType` → `UserInsert`, `NewGroupType` → `GroupInsert` in user/group sync functions

### 11. `ui_config.ts` (modified, kept snake_case)

**Import updates:**
- `@/types/ConfigEntry.ts` → `@/types/Config.ts`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts` (now imports `type DBClient`)

**Behavioral changes:**
- **Added `DEFAULT_USER_LIST_PAGE_SIZES`** constant (`[10, 20, 50] as const`)
- **Added `parsePageSizes()` helper**: parses raw config values into valid page size arrays with deduplication and fallback to defaults
- **Extracted `getUserListPageSizes(db: DBClient)` function**: replaces the previous module-level top-level await pattern that seeded config on import. The function now handles:
  - Reading existing config entries
  - Seeding defaults if not present
  - Parsing and validating the stored value
- **Config default value**: Changed from literal `[10, 20, 50]` to `[...DEFAULT_USER_LIST_PAGE_SIZES]` for consistency

---

## Auth Subdirectory Changes

### 12. `auth/app_functional_perms.ts` → `auth/ApplicationDefinedFunctionalPermissions.ts` (renamed, 66% similarity)

**Rename:** `app_functional_perms.ts` → `ApplicationDefinedFunctionalPermissions.ts`

**Import updates:**
- `@/types/FunctionalPermission.ts`: `FunctionalPermissionType` → `FunctionalPermission`, `NewFunctionalPermissionType` → `FunctionalPermissionInsert`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`

No behavioral changes beyond type name updates.

### 13. `auth/FunctionalPermissions.ts` (new file, replaces `auth/functional_perms.ts`)

**Status:** New file (`AM` in git status — added + modified)

This file is the PascalCase replacement for the deleted `functional_perms.ts`. It contains the same permission definitions but with updated type references:
- `NewFunctionalPermissionType` → `FunctionalPermissionInsert`
- `FunctionalPermissionType` → `FunctionalPermission`
- `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- Re-export path: `./app_functional_perms.ts` → `./ApplicationDefinedFunctionalPermissions.ts`

All permission definitions (FP_READ_USERS, FP_READ_GROUPS, etc.) are functionally identical; only type annotations changed.

### 14. `auth/functional_perms.ts` (deleted)

**Status:** Deleted (`D` in git status)

Replaced by `auth/FunctionalPermissions.ts` (see above).

---

## New Files

### `src/services/AGENTS.md`

**Status:** New (untracked, `??` in git status)

New documentation file providing layer-specific guidance for the services directory, consistent with the AGENTS.md pattern used across other `src/` subdirectories.

---

## Summary of Patterns

| Pattern | Files Affected |
|---------|---------------|
| **Renamed snake_case → PascalCase** | audit_log→AuditLog, auth→Auth, client-builder→ClientBuilder, config_validation→Config, database→DatabaseDriver, pubsub→PubSub, request_bundling→RequestBundling, server_sent_events→ServerSentEvents, setup→Setup, app_functional_perms→ApplicationDefinedFunctionalPermissions, functional_perms→FunctionalPermissions |
| **ConfigEntry type imports migrated** | All services that used `ConfigEntryType`/`ConfigValueTypes` now import from `@/types/Config.ts` |
| **User/Group type names updated** | `UserType`→`User`, `NewUserType`→`UserInsert`, `NewGroupType`→`GroupInsert` |
| **FunctionalPermission type names updated** | `FunctionalPermissionType`→`FunctionalPermission`, `NewFunctionalPermissionType`→`FunctionalPermissionInsert` |
| **`db.transaction()` → `runInTransaction()`** | Auth.ts, EntraIDSync.ts — centralized transaction helper with explicit isolation level |
| **Type definitions moved to types module** | RequestBundling.ts (constants + interface), ServerSentEvents.ts (types + constants), Auth.ts (Session interface) |
| **Dynamic schema loading** | DatabaseDriver.ts — `Bun.Glob`-based dynamic import replaces static barrel import |
| **Removed TypeBox** | Config.ts — `schemaForConfigType()` removed |
| **Pure rename (no content change)** | ClientBuilder.ts, PubSub.ts |

