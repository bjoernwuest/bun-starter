# src/schema/ Changes

## Overview

The `src/schema/` directory underwent a targeted refactoring focused on three key themes:

1. **Strict import isolation** — A new [`AGENTS.md`](src/schema/AGENTS.md:1) replaces the old `README.md` with formal AI-agent rules mandating that only `drizzle-orm` imports are permitted within this directory.
2. **Removal of PostgreSQL enum dependency** — The `ConfigValueTypes` in [`Config.ts`](src/schema/Config.ts:12) was changed from a TypeScript/PG `enum` + `pgEnum` to a plain `const` object with `as const` and a derived type, with the column changed from `pgConfigValueTypes("type")` to `text("type").$type<ConfigValueTypes>().notNull()`.
3. **Dynamic schema loading** — The barrel re-export file [`schema.ts`](src/schema/schema.ts:1) was deleted. Schema modules are now auto-discovered and loaded at runtime by [`DatabaseDriver.ts`](src/services/DatabaseDriver.ts:1) using `Bun.Glob`.

The remaining schema definition files (`ApiKey.ts`, `AuditEntry.ts`, `FunctionalPermission.ts`, `helpers.ts`, `User.ts`) were **unchanged**.

---

## Per-File Details

### src/schema/AGENTS.md

- **Change type**: added
- **Key changes**:
  - New file with 21 lines of AI agent guidance.
  - Establishes absolute prohibition on imports from outside this specific folder.
  - Only `drizzle-orm` (and internal cross-references) are permitted.
  - Defines the folder's purpose: Drizzle ORM schema definitions, enums, strict string constants, and TypeScript types directly required by schemas.
- **Impact**: Replaces the informal `README.md` with machine-enforceable rules for AI coding agents. Ensures the schema layer remains a pure, isolated data definition tier.

### src/schema/Config.ts

- **Change type**: modified
- **Key changes**:
  - `configValueTypes` was converted from a TypeScript `enum` to a `const` object with `as const` assertions (e.g., `string: 'string' as const`).
  - The derived type is now `export type ConfigValueTypes = typeof ConfigValueTypes[keyof typeof ConfigValueTypes]` instead of relying on the enum type.
  - The PostgreSQL enum registration (`pgEnum('config_value_types', ...)`) was **removed entirely**.
  - The `type` column changed from `pgConfigValueTypes("type")` to `text("type").$type<ConfigValueTypes>().notNull()` — now uses a plain text column with Drizzle's `$type` type narrowing instead of a PG enum.
  - The column is now `notNull()` (was nullable before).
  - JSDoc comments for `configValueTypes` and `pgConfigValueTypes` were removed.
- **Impact**: Eliminates the need for a PostgreSQL custom enum type (`config_value_types`), simplifying migrations and database portability. The type safety is preserved at the TypeScript/Drizzle level via `$type<>()`. The `notNull()` constraint tightens data integrity.

### src/schema/README.md

- **Change type**: deleted
- **Key changes**:
  - Was a 3-line file with simple instructions: "Schema files must import nothing else than files from drizzle-orm!" and "The file 'schema.ts' must reexport all schema definitions."
- **Impact**: Superseded by the more comprehensive [`AGENTS.md`](src/schema/AGENTS.md:1), which provides detailed AI agent rules including the same import isolation principle plus additional structural guidance.

### src/schema/schema.ts

- **Change type**: deleted
- **Key changes**:
  - Was a barrel re-export file that re-exported all five schema modules (`Config.ts`, `FunctionalPermission.ts`, `ApiKey.ts`, `User.ts`, `AuditEntry.ts`).
- **Impact**: The static re-export pattern is replaced by a dynamic auto-discovery mechanism in [`DatabaseDriver.ts`](src/services/DatabaseDriver.ts:1). The `loadSchemaModules()` function uses `Bun.Glob("*.ts")` to scan the `src/schema/` directory at runtime, filters out `helpers.ts` and `.d.ts` files, and dynamically imports + merges all schema exports. This eliminates the maintenance burden of keeping the barrel file in sync when schema files are added or removed.

### src/schema/ApiKey.ts

- **Change type**: unchanged (not present in diff)
- **Key changes**: None.
- **Impact**: The ApiKey schema definition remains as-is. Not affected by this round of changes.

### src/schema/AuditEntry.ts

- **Change type**: unchanged (not present in diff)
- **Key changes**: None.
- **Impact**: The AuditEntry schema definition remains as-is.

### src/schema/FunctionalPermission.ts

- **Change type**: unchanged (not present in diff)
- **Key changes**: None.
- **Impact**: The FunctionalPermission schema definition remains as-is.

### src/schema/helpers.ts

- **Change type**: unchanged (not present in diff)
- **Key changes**: None.
- **Impact**: Schema helper utilities remain unchanged. (Note: `helpers.ts` is explicitly excluded from the dynamic schema auto-load in `DatabaseDriver.ts`.)

### src/schema/User.ts

- **Change type**: unchanged (not present in diff)
- **Key changes**: None.
- **Impact**: The User and Group schema definitions remain as-is.
