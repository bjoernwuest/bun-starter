UI API primitives and request bundling

- Use `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, `apiQuery` from `index.ts`.
- Mutating calls (`POST`, `PUT`, `PATCH`, `DELETE`) are automatically coalesced and sent via `/api/request_bundling`.
- Read calls (`GET`, `QUERY`) go directly to the backend.
- `ApiError` is thrown for HTTP failures and parsing errors.
- Mutation calls accept optional request bundling timing hints via `RequestBundlingOptions` (`expectedProcessingMs`, `timeoutMs`, `extraHeaders`).
- Timeout errors expose `signal`, `mayHaveExecuted`, `clientMayTakeUntil`, and `serverMayTakeUntil` so retry logic can remain idempotent-aware.

