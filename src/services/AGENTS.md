# AI Agent Guidelines: Services Layer

This folder contains the **business logic** of the application — everything that goes beyond simple CRUD data operations (which belong in `/src/repo/`). Services orchestrate repos, enforce domain rules, manage external integrations, and provide cross-cutting concerns like authentication, PubSub, and configuration.

---

## Import Rules

### ✅ Allowed imports

| Source | Purpose |
|---|---|
| `@/types/*` | Type definitions, TypeBox schemas, PubSub topic constants, config types |
| `@/repo/*` | Repository functions for data access (the ONLY way to touch the database) |
| `@/utils/*` | Utility functions (e.g., `TTLMap`, `walkDir`) |
| `@/services/*` | Other services (cross-service composition is expected) |
| `@/ui/*` | Frontend constants shared with the server (e.g., `FunctionalPermissionNames`) |
| `drizzle-orm` | **Read-only query building only** — e.g., `eq()`, `sql`, `and()`, `desc()` for constructing queries passed to repo functions. Never use for direct database execution. |
| `@/devmode.ts` | `devMode` flag for conditional logging/behavior |
| External packages in `package.json` | e.g., `openid-client`, `@azure/msal-node`, `croner`, `@sinclair/typebox/value` |

### ❌ Forbidden imports

| Source | Reason |
|---|---|
| `@/schema/*` | Schema files are for Drizzle table definitions only; use repo functions instead |
| `@/apps/*` | Services must not depend on Elysia app instances (avoids circular dependencies) |
| `@/api/*` | Route handlers depend on services, not the other way around |
| Any package not in `package.json` | No undeclared dependencies |

---

## Database Access Rules

1. **No direct database execution.** Services must never call `db.select()`, `db.insert()`, `db.update()`, `db.delete()`, or `db.transaction()` directly. All database operations go through `/src/repo/` functions.

2. **Exception: `DatabaseDriver.ts`.** This file is the *database driver* itself — it creates the Drizzle instance, manages the connection pool, runs migrations, and provides `runInTransaction`. It is the **only** service permitted to import and use `drizzle-orm/postgres-js` and `postgres` directly.

3. **Query building is allowed.** Services may import from `drizzle-orm` (e.g., `eq`, `and`, `sql`) to construct query conditions that are then passed to repo functions. Example pattern:
   ```typescript
   import { eq, and } from "drizzle-orm";
   // Build conditions, pass to repo:
   const users = await getUsers(db, { where: and(eq(usersTable.active, true), ...) });
   ```

4. **Transactions.** For multi-operation atomicity, use `runInTransaction` from `DatabaseDriver.ts`:
   ```typescript
   import { runInTransaction } from "@/services/DatabaseDriver.ts";
   await runInTransaction(db, async (tx) => {
       await someRepoFunction(tx, ...);
       await anotherRepoFunction(tx, ...);
   });
   ```

---

## Configuration Declaration Pattern

Services that require runtime configuration declare it via an exported `config` object:

```typescript
import { type ConfigEntryType, configValueTypes } from "@/types/Config.ts";

export const config = {
    cfgExample: {
        domain: "my_service",
        key: "ExampleKey",
        description: "What this config entry controls.",
        type: configValueTypes.string,
        value: undefined,          // default value; `undefiend` is acceptable if `mandatoryForStart=true`
        inputFormat: "^[a-z]+$",   // regex for UI validation
        outputFormat: "",
        editInUI: true,
        mandatoryForStart: false,  // true → setup wizard blocks until provided
    } satisfies ConfigEntryType,
} satisfies Record<string, ConfigEntryType>;
```

**Rules:**
- The `config` export must satisfy `Record<string, ConfigEntryType>`.
- `domain` should be a stable, human-readable string identifying the service.
- `mandatoryForStart: true` entries are discovered by `Setup.ts` and block application startup until configured.
- Config values are read at runtime via `getConfigEntriesByKey()` from `ConfigRepo.ts`.

### Registering config keys in the database

Declaring the `config` object alone does **not** persist entries to the database — they must be explicitly upserted at startup. Two patterns are used in the codebase:

**Pattern A — Seed all on startup** (see `AuditLog.ts` lines 115–118): iterate over all declared entries and upsert any that are missing. Best when multiple config entries are needed before the service can operate.

```typescript
export async function startMyService(db: DBClient): Promise<void> {
    // Ensure every declared config row exists (seeded with its default value)
    for (const entry of Object.values(config)) {
        const existing = await getConfigEntriesByKey(db, entry.domain, entry.key, { limit: 1 });
        if (existing.length < 1) await upsertConfigEntry(db, entry);
    }
    // …proceed with runtime reads…
}
```

**Pattern B — Lazy upsert on first read** (see `ui_config.ts` lines 31–36): read first; if the row is missing, upsert with the default value and return that. Best for simple, single-entry services where a dedicated startup function would be overkill.

```typescript
export async function getMyConfigValue(db: DBClient): Promise<SomeType> {
    let entries = await getConfigEntriesByKey(db, config.cfgMyKey.domain, config.cfgMyKey.key, { limit: 1 });
    if (entries.length < 1) {
        entries = await upsertConfigEntry(db, config.cfgMyKey);
    }
    return parseTheValue(entries[0]!.value);
}
```

**Key point:** The `value` field in the config declaration serves as the **default** that `upsertConfigEntry` writes on first creation. After that, the database row is the source of truth — changes made via the UI or API will override it.

---

## PubSub Integration

Services may communicate via the PubSub event bus for loose coupling. Guidelines:

- **Declare topic constants** as exported `const` strings (e.g., `export const pubsub_UserAuth = "auth"`).
- **Publish** after successful operations: `PubSub.publish(topic, payload)`.
- **Subscribe** for cross-service reactions: `PubSub.subscribe(topic, callback)`.
- Use **hierarchical topics** (dot-separated) for scoping: `"auth.login"`, `"auth.logout"`.
- The `*` wildcard subscribes to all topics — use sparingly.

---

## Service-to-Service Dependencies

Services may import from each other.

**Avoid circular dependencies.** If two services need each other, extract shared constants/types to `@/types/`, shared service, or use PubSub for decoupling.

---

## File Naming & Structure

- **PascalCase** matching the service domain: `Auth.ts`, `AuditLog.ts`, `EntraIDSync.ts`
- **One file per service domain.** If a service grows large, extract sub-modules into a subdirectory (e.g., `auth/FunctionalPermissions.ts`).
- Each file exports the functions and constants that other layers consume.
- The `config` export (if present) must be a named export, not default.

---

## Anti-Patterns to Avoid

1. **Don't call `getDatabaseConnection()` in services** (except `DatabaseDriver.ts` itself). Accept `dbClient` as a parameter or use the one passed from the route layer.
2. **Don't execute raw SQL or Drizzle queries directly.** Build conditions, then delegate to repo functions.
3. **Don't import from `@/schema/*`.** Schema files are isolated; repo functions are the bridge.
4. **Don't import from `@/apps/*` or `@/api/*`.** Services are a lower layer; routes depend on services, not vice versa.
5. **Don't publish PubSub events before the operation succeeds.** Publish only after the transaction commits.
6. **Don't hardcode configuration values.** Declare them via the `config` export and read at runtime from the database.
7. **Don't skip the `satisfies` check on `config` exports.** It catches type mismatches at compile time.
