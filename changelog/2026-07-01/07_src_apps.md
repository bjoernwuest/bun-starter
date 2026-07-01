# src/apps/ Changes

## Overview

The `src/apps/` directory saw only structural/refactoring changes — no functional logic was modified. All changes are import path renames following the project-wide PascalCase file naming convention, plus the addition of an `AGENTS.md` file replacing a deleted `README.md`.

---

## File-by-File Analysis

### 1. `src/apps/README.md` — **DELETED**

The one-line README (`Contains ElysiaJS sub-application definitions`) was removed. Its documentation role is replaced by the new `AGENTS.md` file.

---

### 2. `src/apps/AGENTS.md` — **NEW** (untracked)

Comprehensive AI agent guidance file for the application entry points layer:
- Documents each sub-application file and its role (`api.ts`, `login.ts`, `setup.ts`, `ui.ts`)
- Establishes rules: keep files limited to app composition, middleware, mounting, and bootstrapping
- Explicitly forbids placing repository mutations or domain business logic here
- Requires cross-layer consistency when changing entry points

---

### 3. `src/apps/api.ts` — Import Path Updates Only

| Old Import Path | New Import Path |
|---|---|
| `@/services/auth.ts` | `@/services/Auth.ts` |
| `@/services/database.ts` | `@/services/DatabaseDriver.ts` |
| *(bundled in auth import)* | `@/types/Auth.ts` (Session type now separate) |

- `Session` type decoupled from the auth services import and imported directly from `@/types/Auth.ts`
- `DBClient` type now sourced from `@/services/DatabaseDriver.ts`

**No functional changes.**

---

### 4. `src/apps/login.ts` — Import Path Updates Only

| Old Import Path | New Import Path |
|---|---|
| `@/services/client-builder.ts` | `@/services/ClientBuilder.ts` |
| `@/services/auth.ts` | `@/services/Auth.ts` |
| `@/services/database.ts` | `@/services/DatabaseDriver.ts` |

**No functional changes.**

---

### 5. `src/apps/setup.ts` — Import Path Updates Only

| Old Import Path | New Import Path |
|---|---|
| `@/services/setup.ts` | `@/services/Setup.ts` |
| `@/services/client-builder.ts` | `@/services/ClientBuilder.ts` |
| `@/types/ConfigEntry.ts` | `@/types/Config.ts` |
| `@/services/database.ts` | `@/services/DatabaseDriver.ts` |

- Config types (`ConfigEntryType`, `ConfigValueTypes`, `NewConfigEntryType`) now imported from the renamed/consolidated `@/types/Config.ts` instead of the deleted `@/types/ConfigEntry.ts`

**No functional changes.**

---

### 6. `src/apps/ui.ts` — Import Path Updates Only

| Old Import Path | New Import Path |
|---|---|
| `@/services/client-builder.ts` | `@/services/ClientBuilder.ts` |
| `@/services/auth.ts` | `@/services/Auth.ts` |
| `@/services/database.ts` | `@/services/DatabaseDriver.ts` |
| `@/services/server_sent_events.ts` | `@/services/ServerSentEvents.ts` |

**No functional changes.**

---

## Summary

- **5 files modified** (import path renames only)
- **1 file deleted** (`README.md`)
- **1 file added** (`AGENTS.md`)
- **Zero behavioral/functional changes** — all modifications are `import` statement realignments to match the PascalCase file renaming applied across `src/services/` and `src/types/`
