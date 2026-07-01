# src/repo/ Changes

## Overview

The `src/repo/` layer received a coordinated refactoring to align with the new schema and type system. All five existing Repository files were updated, one new AGENTS.md was added, and one file was renamed from snake_case to PascalCase. The changes are primarily **import path updates** to reflect the new consolidated file structure, with no functional or behavioral changes to the repository methods themselves.

### Summary of changes across all files

| Change | Details |
|--------|---------|
| **DBClient import** | `@/services/database.ts` → `@/services/DatabaseDriver.ts` (PascalCase rename) |
| **PubSub import** | `@/services/pubsub.ts` → `@/services/PubSub.ts` (PascalCase rename) |
| **Schema imports** | Monolithic `@/schema/schema.ts` → individual schema files (e.g., `@/schema/Config.ts`, `@/schema/ApiKey.ts`) |
| **Type imports** | Consolidated from old `src/_types/` paths to new `@/types/` files; renamed type identifiers (e.g., `NewUserType` → `UserInsert`, `NewGroupType` → `GroupInsert`) |
| **PubSub constants** | Moved from repo-local definition to `@/types/ApiKey.ts` |
| **Coding style** | Minor whitespace normalization in import statements (spaces inside braces) |

---

## New Files

### src/repo/AGENTS.md

New AI agent guidelines for the Repository (Data Access) layer. Key directives:

- **1:1 Naming Convention**: Every schema file maps to exactly one repository file, named `<SchemaName>Repo.ts` (matching PascalCase/camelCase).
- **Full Encapsulation**: All Drizzle ORM queries must occur exclusively inside repository files.
- **No External Leakage**: Raw Drizzle query builders and database connections must not be exported; only clean asynchronous functions (e.g., `getUserById`, `createGroup`) are exposed.
- **Isolation Focus**: Feature code outside `src/repo/` should call repo methods rather than writing raw Drizzle queries.

---

## Renamed Files

### src/repo/api_keys.ts → src/repo/ApiKeyRepo.ts (92% similarity)

Renamed from snake_case to PascalCase, matching the convention established in [`src/repo/AGENTS.md`](src/repo/AGENTS.md).

**Import path changes:**

| Old Import | New Import |
|------------|------------|
| `@/services/database.ts` (DBClient) | `@/services/DatabaseDriver.ts` |
| `@/services/pubsub.ts` (PubSub) | `@/services/PubSub.ts` |
| `@/types/FunctionalPermission.ts` (`FunctionalPermissionType`) | `@/types/FunctionalPermission.ts` (`FunctionalPermission` aliased as `FunctionalPermissionType`) |
| `@/types/ApiKey.ts` (`ApiKeyType`) | `@/types/ApiKey.ts` (`ApiKey` aliased as `ApiKeyType`) |

**PubSub constants relocated:**
The PubSub topic constants (`pubsub_ApiKeyCreated`, `pubsub_ApiKeyUpdated`, `pubsub_ApiKeyDisabled`, `pubsub_ApiKeyDeleted`, `pubsub_ApiKeyPermissionsChanged`) were previously defined locally in `api_keys.ts`. They have been moved to [`src/types/ApiKey.ts`](src/types/ApiKey.ts) and are now imported from there.

---

## Modified Files

### src/repo/AuditRepo.ts

Minimal change — only import reorganization:

- `DBClient` import path updated: `@/services/database.ts` → `@/services/DatabaseDriver.ts`
- Import order adjusted: Drizzle imports (`desc`, `sql`, `and`) consolidated before the type import

No functional or type name changes.

### src/repo/ConfigRepo.ts

**Import path changes:**

| Old | New |
|-----|-----|
| `DBClient` from `@/services/database.ts` | `DBClient` from `@/services/DatabaseDriver.ts` |
| `ConfigEntry` from `@/schema/schema.ts` | `ConfigEntry` from `@/schema/Config.ts` |
| `ConfigEntryType`, `NewConfigEntryType`, `ConfigEntrySchema` from `@/types/ConfigEntry.ts` | All from `@/types/Config.ts` |

The `ConfigEntrySchema` import was consolidated from the old standalone `ConfigEntry.ts` type file into the new unified `@/types/Config.ts`.

No functional changes to any repository methods.

### src/repo/FunctionalPermissionRepo.ts

**Import path changes:**

| Old | New |
|-----|-----|
| `GroupType`, `UserType` from `@/types/User.ts` | `Group` aliased as `GroupType`, `User` aliased as `UserType` |
| `NewFunctionalPermissionType` from `@/types/FunctionalPermission.ts` | `FunctionalPermissionInsert` from `@/types/FunctionalPermission.ts` |
| `FunctionalPermissionType` from `@/types/FunctionalPermission.ts` | `FunctionalPermission` aliased as `FunctionalPermissionType` |
| `DBClient` from `@/services/database.ts` | `DBClient` from `@/services/DatabaseDriver.ts` |
| `PubSub` from `@/services/pubsub.ts` | `PubSub` from `@/services/PubSub.ts` |

**Type name change:** `NewFunctionalPermissionType` → `FunctionalPermissionInsert` in the `registerFunctionalPermission()` function signature and related JSDoc.

No behavioral changes.

### src/repo/UserRepo.ts

**Import path changes:**

| Old | New |
|-----|-----|
| `GroupType`, `NewGroupType`, `NewUserType`, `UserType` from `@/types/User.ts` | `User` aliased as `UserType`, `UserInsert`, `GroupInsert`, `Group` aliased as `GroupType` |
| `DBClient` from `@/services/database.ts` | `DBClient` from `@/services/DatabaseDriver.ts` |

**Type name changes:**
- `NewUserType` → `UserInsert` (in `getSystemUser()`, `upsertUsers()` signatures/bodies/JSDoc)
- `NewGroupType` → `GroupInsert` (in `upsertGroups()` signatures/bodies/JSDoc)

No behavioral changes.

---

## Deleted Files

No files were deleted from `src/repo/`. The `api_keys.ts` file was renamed (not deleted), resulting in `src/repo/ApiKeyRepo.ts`.

---

## Cross-Reference

These changes are part of a wider refactoring that also affects:

- [`src/schema/`](changelog/02_src_schema.md) — Schema file extraction from monolithic `schema.ts`
- [`src/types/`](changelog/03_src_types.md) — Type file consolidation and renaming (`New*Type` → `*Insert`)
- [`src/services/`](changelog/05_src_services.md) — Service file PascalCase renames (`database.ts` → `DatabaseDriver.ts`, `pubsub.ts` → `PubSub.ts`)
