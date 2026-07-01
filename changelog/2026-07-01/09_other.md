# Changelog: Remaining Directories (main.ts, migrations, scripts, design, setup, login, utils, static, package.json)

## Overview

This section covers all remaining directories not analyzed in prior changelog chunks:
`design/`, `scripts/`, `src/main.ts`, `src/login/`, `src/migrations/`, `src/setup/`, `src/utils/`, `static/`, `debug_analysis/`, and `package.json`.

---

## 1. [`src/main.ts`](src/main.ts) — Application Entry Point

**12 lines changed.** The startup sequence was reorganized.

### Changes:
- **Imports updated to PascalCase**: All service imports now use PascalCase filenames:
  - `@/services/database.ts` → `@/services/DatabaseDriver.ts`
  - `@/services/audit_log.ts` → `@/services/AuditLog.ts`
  - `@/services/auth/functional_perms.ts` → `@/services/auth/FunctionalPermissions.ts`

- **Audit log startup moved**: The `startAuditLog()` call was moved from the pre-app initialization section (where it ran without a DB client) to *after* `getDatabaseConnection()` and the `injectDb()` middleware. It now receives `dbClient` as an argument: `await startAuditLog(dbClient);`. This ensures the audit log subscriber has a valid database connection when it begins listening to PubSub events.

### Impact:
- The audit log subscriber now starts with a proper database connection, fixing a potential race condition where audit entries could be triggered before the DB was available.

---

## 2. [`scripts/generate_types.ts`](scripts/generate_types.ts) — NEW: TypeBox Type Generator

**190 lines added (new file).** A code generation script that automatically produces TypeBox schemas and TypeScript types from Drizzle ORM schema definitions.

### Functionality:
- Uses `ts-morph` to parse `src/schema/*.ts` files at AST level
- For each Drizzle `pgTable()` definition, generates:
  - `{Name}Schema` — TypeBox `Type.Object()` for select/read shapes
  - `{Name}InsertSchema` — TypeBox `Type.Object()` with optional fields for inserts
  - Corresponding `Static<>` type aliases
- Handles column type mapping (uuid → `String({ format: 'uuid' })`, boolean → `Boolean()`, integer/serial → `Number()`, jsonb → `Object()`, timestamp → `String()`, varchar → `String({ maxLength: N })`)
- Detects optional insert columns via heuristics: fields with `.default()`, `.defaultNow()`, `$onUpdate()`, `serial()`, or without `.notNull()` become `Type.Optional()`
- Handles spread operators like `...Identifier` and `...timestamps` by inlining their fields
- Copies exported enums, type aliases, and interfaces from schema files
- Inlines exported `const` values (like `ConfigValueTypes`) from schema
- Creates user-editable placeholder files (`src/types/{Name}.ts`) with re-exports from generated `src/types/_{Name}.ts`
- Generates files marked with `// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY`

### Output convention:
- `src/types/_{Name}.ts` — auto-generated, overwritten on each run
- `src/types/{Name}.ts` — user-owned placeholder, created only if missing

### Scripts added to [`package.json`](package.json):
- `"typegen": "bun scripts/generate_types.ts"` — run once
- `"typegen:watch": "bun --watch scripts/generate_types.ts"` — watch mode

### Impact:
- Eliminates manual TypeBox schema duplication from Drizzle definitions
- Ensures API validation schemas stay in sync with database schema
- Provides clean separation between auto-generated and user-augmented types

---

## 3. [`package.json`](package.json) — Build & Dependency Updates

**8 lines changed.**

### Dependency additions:
- `bun-types: ^1.3.14` (devDependency)
- `ts-morph: ^28.0.0` (devDependency) — required by `generate_types.ts` for AST parsing

### Script changes:
- **drizzle**: Schema glob changed from `./src/schema/schema.ts` to `'src/schema/*.ts'` — supports multi-file schema layout
- **typegen** (new): `bun scripts/generate_types.ts`
- **typegen:watch** (new): `bun --watch scripts/generate_types.ts`
- **dev**: unchanged
- **build**: unchanged
- **start**: unchanged

---

## 4. `design/` — Design Documentation Updates

All three design documents were updated to reflect the PascalCase file renaming across the codebase.

### [`design/configuration.md`](design/configuration.md) (8 changes)
- Updated service file references: `src/services/auth.ts` → `src/services/Auth.ts`, `src/services/request_bundling.ts` → `src/services/RequestBundling.ts`
- Updated app reference: `src/apps/setup.ts` → `src/apps/Setup.ts`
- Updated reference: `src/services/setup.ts` → `src/services/Setup.ts`

### [`design/request_bundling.md`](design/request_bundling.md) (9 changes)
- Updated type file reference: `request_bundling.ts` → `RequestBundling.ts`
- Updated API route file: `src/api/request_bundling.ts` → `src/api/RequestBundling.ts`
- Updated import example paths

### [`design/server-sent-events.md`](design/server-sent-events.md) (34 changes)
- Comprehensive update of all file references to PascalCase throughout the SSE architecture documentation
- Updated `src/services/pubsub.ts` → `src/services/PubSub.ts`
- Updated `src/services/server_sent_events.ts` → `src/services/ServerSentEvents.ts` (note: final name is `ServerSentEvents.ts`, not `ServerSentEvent.ts` as in some docs)
- Updated `src/api/server_sent_events.ts` → `src/api/ServerSentEvent.ts`
- Updated `src/ui/pubsub.ts` → `src/ui/PubSub.ts`
- Updated `src/ui/server_sent_events.ts` → `src/ui/ServerSentEvent.ts`
- Updated `src/ui/api/server_sent_events.ts` → `src/ui/api/ServerSentEvent.ts`
- Updated the component table at the document's end

---

## 5. `src/login/` — Login Application

### [`src/login/AGENTS.md`](src/login/AGENTS.md) — NEW
- 1 line: "This is the 'Login' application. It is responsible to trigger user authentication via OIDC and the load `/src/apps/ui.ts`."

### Files NOT in diff (unchanged):
- `src/login/index.html` — login page HTML shell
- `src/login/index.tsx` — login page entry point
- `src/login/loading.html` — loading spinner page
- `src/login/Login.tsx` — login React component

---

## 6. `src/migrations/` — Database Migrations

### [`src/migrations/README.md`](src/migrations/README.md) — DELETED
- Removed 1-line description: "This directory contains automatically created files by drizzle-kit for schema generation, as well as pre- and post-processing files for Umzug."
- Replaced by [`src/migrations/AGENTS.md`](src/migrations/AGENTS.md) (already existing, not in diff)

### Migration files (exist on disk, NOT in git diff):
These are new migration artifacts generated by drizzle-kit and the Umzug template script:
- `20260701100317_fresh_maggott.sql` — SQL migration
- `20260701100736_huge_moondragon.sql` — SQL migration
- `20260701100736_z_post.ts` — Umzug post-processing script
- `20260701132342_z_post.ts` — Umzug post-processing script

These files represent the generated migration output and are standard drizzle-kit + Umzug artifacts.

---

## 7. `src/setup/` — Setup Wizard Application

### [`src/setup/AGENTS.md`](src/setup/AGENTS.md) — NEW
- 1 line describing the setup application's role: started when mandatory configuration is missing, shows a setup key on console, and starts the real apps after setup completes.

### [`src/setup/README.md`](src/setup/README.md) — DELETED
- Removed 1-line description. Consolidated into AGENTS.md.

### [`src/setup/index.tsx`](src/setup/index.tsx) (2 changes)
- Updated type import: `@/types/ConfigEntry.ts` → `@/types/Config.ts`
- This reflects the consolidation of `ConfigEntry.ts` into the broader `Config.ts` type module

---

## 8. `src/utils/` — Utility Modules

### [`src/utils/AGENTS.md`](src/utils/AGENTS.md) — NEW
- 1 line: "Random utility files that are used across the project. Somehow, the 'other' category for things that are useful but don't fit into the other categories."

### [`src/utils/README.md`](src/utils/README.md) — DELETED
- Removed 1-line description. Consolidated into AGENTS.md.

### Files NOT in diff (unchanged):
- `src/utils/fs.ts` — filesystem utility functions
- `src/utils/TTLMap.ts` — TTL-based map data structure

---

## 9. `static/` — Static Assets

### Files NOT in diff (unchanged):
- `static/README.md` — static assets documentation
- `static/public/README.md` — public assets documentation
- All CSS, font, and theme files are unchanged

---

## 10. `debug_analysis/` — Debug Artifacts

### NOT in diff (unchanged):
- `debug_analysis/README.md` — debug analysis directory documentation

---

## 11. [`src/devmode.ts`](src/devmode.ts)

### NOT in diff (unchanged):
- The dev mode flag file is unchanged. Still exports `export const devMode = ...` used for conditional debug logging.

---

## Summary of Patterns in This Chunk

1. **PascalCase migration continued**: Design docs, main.ts, setup/index.tsx all updated to use PascalCase import paths
2. **README → AGENTS.md consolidation**: `src/login/`, `src/setup/`, `src/utils/`, and `src/migrations/` replaced `README.md` with `AGENTS.md` (targeted at AI coding agents)
3. **Type generation pipeline**: New `scripts/generate_types.ts` + `ts-morph` dependency + `typegen`/`typegen:watch` scripts create an automated type derivation pipeline from Drizzle schemas to TypeBox validators
4. **Multi-file schema support**: Drizzle kit now globs `src/schema/*.ts` instead of a single `schema.ts` file
5. **Audit log initialization fix**: `startAuditLog()` moved to after database connection is established
6. **Design docs kept in sync**: All three design documents updated to reflect current PascalCase filenames
