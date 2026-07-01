# src/ui/ Changes

## Summary

The primary change in `src/ui/` is the **elimination of `src/ui/types/`** — the entire UI-local type mirror directory was deleted. All types that were previously duplicated in `src/ui/types/` were consolidated into `src/types/`. Every file in `src/ui/` that imported from `@/ui/types/*` was updated to import from the canonical `@/types/*` path. Additionally, several `README.md` files were removed and the `ConfigUpdateResponse` type was replaced by `ConfigEntryUI` in both API wrappers and page components.

---

## Deleted Files

| File | Description |
|------|-------------|
| [`src/ui/types/AdminApi.ts`](src/ui/types/AdminApi.ts) | All admin API response types (`UsersResponse`, `GroupsResponse`, `UserDetailsResponse`, `FunctionalPermissionsResponse`, `ConfigEntryUI`, `ConfigDomainGroup`, `ApiKeySummary`, `ApiKeyDetailResponse`, etc.) — **139 lines deleted**. Types redistributed to [`@/types/Api.ts`](src/types/Api.ts), [`@/types/ApiKey.ts`](src/types/ApiKey.ts), [`@/types/Config.ts`](src/types/Config.ts), [`@/types/User.ts`](src/types/User.ts), and [`@/types/FunctionalPermission.ts`](src/types/FunctionalPermission.ts). |
| [`src/ui/types/FunctionalPermission.ts`](src/ui/types/FunctionalPermission.ts) | `FunctionalPermissionType` and `NewFunctionalPermissionType` — **19 lines deleted**. Moved to [`@/types/FunctionalPermission.ts`](src/types/FunctionalPermission.ts). |
| [`src/ui/types/Page.ts`](src/ui/types/Page.ts) | `MenuEntry`, `PageMeta`, `PageModule`, `NavLeafItem`, `NavGroupItem`, `NavItem`, `NavSection` — **60 lines deleted**. Moved to [`@/types/Page.ts`](src/types/Page.ts). |
| [`src/ui/types/RequestBundling.ts`](src/ui/types/RequestBundling.ts) | `RequestBundlingMethod`, `RequestBundlingRequestItem`, `RequestBundlingSignal`, `RequestBundlingResponseItem`, `RequestBundlingClientRuntimeConfig` — **59 lines deleted**. Moved to [`@/types/RequestBundling.ts`](src/types/RequestBundling.ts). |
| [`src/ui/types/User.ts`](src/ui/types/User.ts) | `UserType`, `NewUserType`, `GroupType`, `NewGroupType` — **34 lines deleted**. Moved to [`@/types/User.ts`](src/types/User.ts). |
| [`src/ui/types/README.md`](src/ui/types/README.md) | Documentation about the types mirror directory — deleted. |
| [`src/ui/api/README.md`](src/ui/api/README.md) | Documentation about UI API primitives and request bundling — deleted. |
| [`src/ui/pages/README.md`](src/ui/pages/README.md) | Documentation about page architecture — deleted. |
| [`src/ui/tests/README.md`](src/ui/tests/README.md) | Placeholder for Playwright tests — deleted. |

---

## Import Path Migration: `@/ui/types/*` → `@/types/*`

Every `src/ui/` file that previously imported from `@/ui/types/` was updated to import from the canonical `@/types/` path.

### Page files (all page files share the same PageMeta import change)

All 14 page files replaced:
```typescript
import type { PageMeta } from "@/ui/types/Page.ts";
```
with:
```typescript
import type { PageMeta } from "@/types/Page.ts";
```

Affected pages:
- [`src/ui/pages/Dashboard.tsx`](src/ui/pages/Dashboard.tsx)
- [`src/ui/pages/Doc.tsx`](src/ui/pages/Doc.tsx)
- [`src/ui/pages/AdministrationHome.tsx`](src/ui/pages/AdministrationHome.tsx)
- [`src/ui/pages/AdminApiDocumentation.tsx`](src/ui/pages/AdminApiDocumentation.tsx)
- [`src/ui/pages/AdminApiKeyDetail.tsx`](src/ui/pages/AdminApiKeyDetail.tsx)
- [`src/ui/pages/AdminApiKeyList.tsx`](src/ui/pages/AdminApiKeyList.tsx)
- [`src/ui/pages/AdminAuditLog.tsx`](src/ui/pages/AdminAuditLog.tsx)
- [`src/ui/pages/AdminConfigList.tsx`](src/ui/pages/AdminConfigList.tsx)
- [`src/ui/pages/AdminFunctionalPermissionDetail.tsx`](src/ui/pages/AdminFunctionalPermissionDetail.tsx)
- [`src/ui/pages/AdminFunctionalPermissionList.tsx`](src/ui/pages/AdminFunctionalPermissionList.tsx)
- [`src/ui/pages/AdminGroupDetail.tsx`](src/ui/pages/AdminGroupDetail.tsx)
- [`src/ui/pages/AdminGroupList.tsx`](src/ui/pages/AdminGroupList.tsx)
- [`src/ui/pages/AdminUserDetail.tsx`](src/ui/pages/AdminUserDetail.tsx)
- [`src/ui/pages/AdminUserList.tsx`](src/ui/pages/AdminUserList.tsx)

### Registry / App files

| File | Change |
|------|--------|
| [`src/ui/PageRegistry.ts`](src/ui/PageRegistry.ts) | `NavGroupItem`, `NavItem`, `NavLeafItem`, `NavSection`, `PageMeta`, `PageModule` → [`@/types/Page.ts`](src/types/Page.ts) |
| [`src/ui/app.tsx`](src/ui/app.tsx) | `NavGroupItem`, `PageModule` → [`@/types/Page.ts`](src/types/Page.ts); `FunctionalPermissionDetailResponseType`, `GroupFunctionalPermissionResponseType`, `UserDetailsResponse` → [`@/types/Api.ts`](src/types/Api.ts) |
| [`src/ui/app_PageRegistry.ts`](src/ui/app_PageRegistry.ts) | `PageModule` → [`@/types/Page.ts`](src/types/Page.ts) |

### API wrapper files

| File | Change |
|------|--------|
| [`src/ui/api/ApiKeys.ts`](src/ui/api/ApiKeys.ts) | `ApiKeyDetailResponse`, `ApiKeysResponse` → [`@/types/ApiKey.ts`](src/types/ApiKey.ts); `CreateApiKeyRequest`, `CreateApiKeyResponse` → [`@/types/ApiKey.ts`](src/types/ApiKey.ts) |
| [`src/ui/api/Config.ts`](src/ui/api/Config.ts) | `ConfigListResponse`, `ConfigUpdateRequest` → [`@/types/Config.ts`](src/types/Config.ts); `ConfigEntryUI` (replaces `ConfigUpdateResponse`) → [`@/types/Config.ts`](src/types/Config.ts) |
| [`src/ui/api/_request_bundling.ts`](src/ui/api/_request_bundling.ts) | `RequestBundlingClientRuntimeConfig`, `RequestBundlingMethod`, `RequestBundlingRequestItem`, `RequestBundlingResponseItem` → [`@/types/RequestBundling.ts`](src/types/RequestBundling.ts) |
| [`src/ui/api/errors.ts`](src/ui/api/errors.ts) | `RequestBundlingSignal` → [`@/types/RequestBundling.ts`](src/types/RequestBundling.ts) |

### Admin API response type redistribution (page files)

Pages importing admin response types from `@/ui/types/AdminApi.ts` now import from [`@/types/Api.ts`](src/types/Api.ts):

| Page File | Types migrated to `@/types/Api.ts` |
|-----------|-----------------------------------|
| [`src/ui/app.tsx`](src/ui/app.tsx) | `FunctionalPermissionDetailResponseType`, `GroupFunctionalPermissionResponseType`, `UserDetailsResponse` |
| [`src/ui/pages/AdminApiKeyDetail.tsx`](src/ui/pages/AdminApiKeyDetail.tsx) | `FunctionalPermissionsResponse` |
| [`src/ui/pages/AdminFunctionalPermissionDetail.tsx`](src/ui/pages/AdminFunctionalPermissionDetail.tsx) | `FunctionalPermissionDetailResponseType`, `GroupsResponse` |
| [`src/ui/pages/AdminFunctionalPermissionList.tsx`](src/ui/pages/AdminFunctionalPermissionList.tsx) | `FunctionalPermissionsResponse` |
| [`src/ui/pages/AdminGroupDetail.tsx`](src/ui/pages/AdminGroupDetail.tsx) | `FunctionalPermissionsResponse`, `GroupFunctionalPermissionResponseType` |
| [`src/ui/pages/AdminGroupList.tsx`](src/ui/pages/AdminGroupList.tsx) | `GroupsResponse` |
| [`src/ui/pages/AdminUserDetail.tsx`](src/ui/pages/AdminUserDetail.tsx) | `UserDetailsResponse` |
| [`src/ui/pages/AdminUserList.tsx`](src/ui/pages/AdminUserList.tsx) | `UsersResponse` |

### Domain type redistribution (pages)

| Page File | Type | Old Import | New Import |
|-----------|------|-----------|------------|
| [`src/ui/pages/AdminApiKeyDetail.tsx`](src/ui/pages/AdminApiKeyDetail.tsx) | `ApiKeyDetailResponse` | `@/ui/types/AdminApi.ts` | [`@/types/ApiKey.ts`](src/types/ApiKey.ts) |
| [`src/ui/pages/AdminApiKeyList.tsx`](src/ui/pages/AdminApiKeyList.tsx) | `ApiKeySummary` | `@/ui/types/AdminApi.ts` | [`@/types/ApiKey.ts`](src/types/ApiKey.ts) |
| [`src/ui/pages/AdminConfigList.tsx`](src/ui/pages/AdminConfigList.tsx) | `ConfigDomainGroup` | `@/ui/types/AdminApi.ts` | [`@/types/Config.ts`](src/types/Config.ts) |
| [`src/ui/pages/AdminConfigList.tsx`](src/ui/pages/AdminConfigList.tsx) | `ConfigEntryUI` | (was bundled in AdminApi) | [`@/types/Config.ts`](src/types/Config.ts) (new separate import) |
| [`src/ui/pages/AdminFunctionalPermissionDetail.tsx`](src/ui/pages/AdminFunctionalPermissionDetail.tsx) | `Group` (aliased as `GroupType`) | `@/ui/types/User.ts` | [`@/types/User.ts`](src/types/User.ts) |
| [`src/ui/pages/AdminGroupDetail.tsx`](src/ui/pages/AdminGroupDetail.tsx) | `FunctionalPermission` (aliased as `FunctionalPermissionType`) | `@/ui/types/FunctionalPermission.ts` | [`@/types/FunctionalPermission.ts`](src/types/FunctionalPermission.ts) |

---

## `ConfigUpdateResponse` → `ConfigEntryUI` Replacement

The `ConfigUpdateResponse` type (which was an alias for `ConfigEntryUI`) was eliminated. Both the API wrapper and the config page now use `ConfigEntryUI` directly.

**Affected files:**

[`src/ui/api/Config.ts`](src/ui/api/Config.ts):
- Removed import of `ConfigUpdateResponse`, now imports `ConfigEntryUI` from [`@/types/Config.ts`](src/types/Config.ts)
- Return type of `updateConfigEntry()` changed from `ConfigUpdateResponse` to `ConfigEntryUI`

[`src/ui/pages/AdminConfigList.tsx`](src/ui/pages/AdminConfigList.tsx):
- Removed import of both `ConfigEntryUI` and `ConfigUpdateResponse` from `@/ui/types/AdminApi.ts`
- Now imports `ConfigDomainGroup` from [`@/types/Config.ts`](src/types/Config.ts) and `ConfigEntryUI` from [`@/types/Config.ts`](src/types/Config.ts) (separate import statement)
- `mergeUpdatedEntry()` function signature changed: parameter type `ConfigUpdateResponse` → `ConfigEntryUI`

---

## Unchanged Files

These `src/ui/` files were **not modified** in this diff:

| File | Status |
|------|--------|
| [`src/ui/AGENTS.md`](src/ui/AGENTS.md) | Unchanged |
| [`src/ui/index.html`](src/ui/index.html) | Unchanged |
| [`src/ui/index.tsx`](src/ui/index.tsx) | Unchanged |
| [`src/ui/global.d.ts`](src/ui/global.d.ts) | Unchanged |
| [`src/ui/pubsub.ts`](src/ui/pubsub.ts) | Unchanged |
| [`src/ui/server_sent_events.ts`](src/ui/server_sent_events.ts) | Unchanged |
| [`src/ui/api/_client.ts`](src/ui/api/_client.ts) | Unchanged |
| [`src/ui/api/AuditLog.ts`](src/ui/api/AuditLog.ts) | Unchanged |
| [`src/ui/api/index.ts`](src/ui/api/index.ts) | Unchanged |
| [`src/ui/api/server_sent_events.ts`](src/ui/api/server_sent_events.ts) | Unchanged |
| [`src/ui/api/session.ts`](src/ui/api/session.ts) | Unchanged |
| [`src/ui/auth/functional_permissions.ts`](src/ui/auth/functional_permissions.ts) | Unchanged |
| [`src/ui/auth/app_functional_permissions.ts`](src/ui/auth/app_functional_permissions.ts) | Unchanged |
| [`src/ui/pages/PageTemplate.tsx`](src/ui/pages/PageTemplate.tsx) | Unchanged |

---

## Architectural Impact

1. **Single source of truth for types**: The `src/ui/types/` directory was a duplicate mirror of `src/types/` intended to prevent server-side dependencies (e.g., `drizzle-orm`) from leaking into UI code. This separation has been removed. Types now live exclusively in `src/types/`, with the shared `@/types/*` path alias available to both server and client code.

2. **Cleaner type organization**: Types are now organized by domain in `src/types/`:
   - [`src/types/Api.ts`](src/types/Api.ts) — generic API response wrapper types (`UsersResponse`, `GroupsResponse`, etc.)
   - [`src/types/ApiKey.ts`](src/types/ApiKey.ts) — API key domain types
   - [`src/types/Config.ts`](src/types/Config.ts) — configuration domain types
   - [`src/types/User.ts`](src/types/User.ts) — user/group domain types
   - [`src/types/FunctionalPermission.ts`](src/types/FunctionalPermission.ts) — functional permission domain types
   - [`src/types/Page.ts`](src/types/Page.ts) — page metadata and navigation types
   - [`src/types/RequestBundling.ts`](src/types/RequestBundling.ts) — request bundling client/server contract types

3. **No behavioral changes**: All changes are import path migrations and type consolidations only. No page logic, UI rendering, or API interaction patterns were modified.

4. **Removed documentation READMEs**: Three `README.md` files containing architecture documentation (`src/ui/api/`, `src/ui/pages/`, `src/ui/types/`) and one tests placeholder (`src/ui/tests/`) were deleted.
