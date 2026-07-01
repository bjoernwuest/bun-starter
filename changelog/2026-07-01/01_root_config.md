# Root Configuration Changes

## `.gitignore`

- **Change type**: Modified
- **Key changes**:
  - Added glob pattern `/src/migrations/*` to ignore all migration files
  - Added exception `!/src/migrations/AGENTS.md` to keep the migrations directory's guidance document
- **Impact**: Generated migration files (`.sql` and template `.ts` files) are now excluded from version control. Only the [`AGENTS.md`](src/migrations/AGENTS.md:1) file in the migrations directory is tracked, allowing AI coding agents to still receive guidance about migration conventions.

## `AGENTS.md`

- **Change type**: Modified (major rewrite)
- **Key changes**:
  - Replaced ~300 lines of detailed architecture documentation with ~64 lines of concise repo-wide rules and directory map
  - Old content: comprehensive sections covering architecture overview, request bundling, configuration system, authentication, data access, API route patterns, frontend architecture, PubSub, database migrations, development workflows, type safety, optimistic locking, zero-trust, and troubleshooting
  - New content: 13 project-wide rules, root files inventory, root directory descriptions including [`static/`](static/README.md:1) subdirectory structure, [`src/`](src/main.ts:1) subdirectory descriptions, and layered guidance instructions
  - Introduced layered guidance: root [`AGENTS.md`](AGENTS.md:1) now defers to folder-local `AGENTS.md` files in each [`src/`](src/main.ts:1) subdirectory for detailed, layer-specific rules
  - Added specific guidance: Playwright for E2E tests, `cfgRootUserGroup` permission bypass rule, UI text language requirement
  - Referenced [`src/services/DatabaseDriver.ts`](src/services/DatabaseDriver.ts:1) instead of the old `database.ts`
- **Impact**: AI coding agents will now navigate the codebase through a layered guidance system rather than relying on a single monolithic document. The root file provides high-level conventions; detailed implementation guidance is in folder-local `AGENTS.md` files. This scales better as the project grows and reduces maintenance burden of keeping a single file in sync with all architectural changes.

## `GUIDELINES.md`

- **Change type**: Modified
- **Key changes**:
  - Rule 6: Updated file path reference from [`/src/services/pubsub.ts`](src/services/PubSub.ts:1) to [`/src/services/PubSub.ts`](src/services/PubSub.ts:1) (PascalCase rename)
  - Rule 11: Updated file path reference from [`/src/services/auth.ts`](src/services/Auth.ts:1) to [`/src/services/Auth.ts`](src/services/Auth.ts:1) (PascalCase rename)
  - Rule 13: Updated file path reference from [`/src/services/database.ts`](src/services/DatabaseDriver.ts:1) to [`/src/services/DatabaseDriver.ts`](src/services/DatabaseDriver.ts:1) (file rename reflecting its purpose as database driver)
  - Rule 15: Added specifying that optimistic locking uses the `updatedAt` field from [`/src/schema/helpers.ts`](src/schema/helpers.ts:1) with the `timestampColumnType` pattern
  - Removed trailing whitespace between rules and the "STOP READING HERE" marker
  - Removed "Technology stack" section that mentioned Monaco-Editor (no longer needed)
- **Impact**: File path references now align with the PascalCase rename of service files. Developers following the guidelines will reference the correct, current file paths. The removal of the Monaco-Editor dependency from guidelines confirms it is not part of the planned tech stack.

## `README.md`

- **Change type**: Modified
- **Key changes**:
  - Added "Updating from template" section with `git` commands for merging upstream [`bun-starter`](README.md:1) template changes into derived projects
  - Added "IDE configuration" section documenting IntelliJ IDEA auto-generation setup for [`scripts/generate_types.ts`](scripts/generate_types.ts:1) with `--watch` mode
  - Added note that Drizzle-ORM schema changes require running [`scripts/generate_types.ts`](scripts/generate_types.ts:1) to regenerate TypeScript types and TypeBox schemas
- **Impact**: Downstream consumers of the template now have documented procedures for staying in sync with template updates. The IDE configuration documentation streamlines the developer onboarding experience by automating type generation on schema changes.

## `package.json`

- **Change type**: Modified
- **Key changes**:
  - Added `bun-types` (`^1.3.14`) to `devDependencies` for type generation with `ts-morph`
  - Added `ts-morph` (`^28.0.0`) to `devDependencies` for programmatic TypeScript AST manipulation in the type generation script
  - Updated `drizzle` script: changed `--schema` path from single file (`./src/schema/schema.ts`) to glob pattern (`'src/schema/*.ts'`) to pick up all schema files automatically
  - Added `typegen` script: `bun scripts/generate_types.ts` for one-shot type generation
  - Added `typegen:watch` script: `bun --watch scripts/generate_types.ts` for continuous type generation during development
- **Impact**: The drizzle schema glob pattern simplifies adding new schema files without updating the script. The `ts-morph` dependency enables automatic generation of TypeScript types and TypeBox schemas from Drizzle schema definitions, reducing manual type maintenance and ensuring consistency between schema and type definitions. The `typegen:watch` script enables continuous type generation during development.

## `tsconfig.json`

- **Change type**: Modified
- **Key changes**:
  - Added `"bun-types"` to the `compilerOptions.types` array (now `["bun", "bun-types"]`)
- **Impact**: The `bun-types` package provides TypeScript type definitions for Bun-specific APIs. This enables proper type checking for code that uses `ts-morph` and other Bun APIs in development scripts like [`scripts/generate_types.ts`](scripts/generate_types.ts:1).

## `TODO.md`

- **Change type**: Not modified in this diff
- **Note**: File exists in the workspace but had no changes in the current diff.

## `refactor_services.md`

- **Change type**: Not modified in this diff
- **Note**: File exists in the workspace but had no changes in the current diff.
