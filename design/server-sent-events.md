# Server-Sent Events Architecture

## Overview

This application uses Server-Sent Events (SSE) to push server-side PubSub
notifications into the browser in near real time.

The server `PubSub` (`src/services/pubsub.ts`) remains the authoritative
source of truth. A thin bridge fans those events out to connected SSE streams
while applying a per-session topic filter so only relevant events are written to
each stream.

---

## End-to-End Pipeline

```
Publisher
  → server PubSub            (src/services/pubsub.ts)
  → SSE hub / filter         (src/services/server_sent_events.ts)
  → SSE HTTP stream          (GET /api/server_sent_events/stream)
  → browser EventSource      (src/ui/server_sent_events.ts)
  → browser PubSub           (src/ui/pubsub.ts)
  → subscriber callbacks
```

---

## Initialization

The SSE hub is started inside `src/apps/ui.ts`, not in `src/main.ts`.
This ensures the bridge is only active when the UI sub-application is actually
mounted, and it does not start during setup-only runs.

---

## Server-Side Components

### `src/services/pubsub.ts`

The existing server-side PubSub.  Application services publish events here;
other server-side subscribers (e.g. EntraID sync) listen here.

### `src/services/server_sent_events.ts` – SSE Hub

Responsibilities:

- Subscribes to **all** server PubSub messages via `subscribeAll`.
- Processes each notification **asynchronously** (via `Promise.resolve().then`)
  so the publisher's call stack is never blocked.
- Maintains one `ServerSentEventFilter` per authenticated session.
- Evaluates per-session topic filters and enqueues matching events.
- Drops non-matching events immediately.
- Tracks every topic seen since startup (`getKnownTopics()`).
- Runs a background cleanup interval that destroys filters that have been
  disconnected for longer than 30 minutes.

#### Per-Session Filter Lifecycle

| State | Description |
|-------|-------------|
| **Created** | First SSE stream or first topic sync for a session |
| **Streaming** | `next()` is being awaited by the SSE generator |
| **Disconnected** | Stream ended; filter + buffered events retained for 30 min |
| **Destroyed** | Cleaned up by the 5-minute TTL sweep |

The `disconnect()` method ends the current stream without touching the filter.
The `close()` method permanently destroys filter and queue.

#### Session Key Derivation

The session key is derived server-side inside the API layer and is **opaque to
the browser**:

| Auth method | Key format |
|-------------|------------|
| Session cookie | `session:<SessionID cookie value>` |
| Bearer token | `bearer:<oid claim from token>` |

Using the SessionID (or the stable `oid`) as the key guarantees that a browser
reconnecting with the same credentials will reuse the same topic filter.

#### Topic Matching

Topic matching is hierarchical and prefix-based, mirroring server PubSub
semantics:

| Filter | Matches |
|--------|---------|
| `auth` | `auth`, `auth.login`, `auth.login.success`, … |
| `auth.login` | `auth.login`, `auth.login.success`, … |
| `*` | every topic |

---

## API Endpoints

### `GET /api/server_sent_events/stream`

Opens the SSE stream for the authenticated session.

- Authentication via SessionID cookie (preferred) or Bearer token.
- Session key is derived server-side; **no `clientId` query parameter needed**.
- Optional `?topics=auth.login,users` pre-seeds the filter on the first
  connection. On reconnects the query parameter is omitted and the server reuses
  the existing filter.
- Emits:
  - `connected` – snapshot of the current filter state
  - `pubsub` – matching server event envelope `{ topic, data, receivedAt }`
  - `keepalive` – empty ping every 25 s to keep proxies alive

### `PATCH /api/server_sent_events/topics`

Replaces the topic filter for the calling session.

```json
{ "topics": ["auth.login", "users.updated"] }
```

Returns the updated `ServerSentEventClientSnapshot`.

Called automatically by the browser PubSub whenever local subscriptions change.

### `GET /api/server_sent_events/topics`

Returns all topic names that have passed through the server PubSub bridge since
process start.

```json
{ "topics": ["auth", "auth.login", "auth.logout"] }
```

Useful for a browser to discover available topics before subscribing.

---

## Browser-Side Components

### `src/ui/pubsub.ts` – Browser PubSub

A standalone event bus that is completely separate from `src/services/pubsub.ts`.

Responsibilities:

- `subscribe(topic, fn)` / `unsubscribe(token)` / `publish(topic, data)`.
- Hierarchical delivery matching the server PubSub semantics.
- Tracks currently active local topics.
- Debounces topic changes (50 ms) and calls `PATCH /api/server_sent_events/topics`
  when the set stabilises, handling in-flight overlaps safely.

### `src/ui/server_sent_events.ts` – Browser EventSource Bridge

- Builds the SSE stream URL (no `clientId`; server infers from session cookie).
- Opens a single `EventSource` per browser page.
- On each `pubsub` event: parses the JSON envelope and calls `publishSync` into
  the browser PubSub so local subscribers receive it synchronously.

### `src/ui/api/server_sent_events.ts` – API Helpers

- `buildServerSentEventsStreamUrl(topics?)` – builds the stream URL.
- `syncServerSentEventTopics(topics)` – calls `PATCH /api/server_sent_events/topics`.

---

## Reconnect Behaviour (Mobile Networks)

1. Browser SSE connection drops (e.g. mobile handoff).
2. The server stream generator catches the abort signal; `finally` calls
   `disconnectServerSentEventFilter(sessionKey)`.
   - `disconnect()` drains pending waiters (ending the generator loop) but
     **does not** clear the topic filter or queued events.
3. Browser `EventSource` reconnects automatically (browser built-in retry).
4. The same `SessionID` cookie is sent; the server derives the same session key.
5. `upsertServerSentEventFilter` finds the existing filter, leaves topics intact
   (no `?topics` param on reconnect → `topics: undefined` → filter unchanged).
6. Queued events from the gap are delivered immediately on the new stream.
7. The filter's `disconnectedAt` is reset to `null` (streaming again).

---

## Multi-Tab Behaviour

Multiple browser tabs with the same session share one filter.  The last tab to
sync its topics wins.  Events are delivered to all currently connected streams
(each tab has its own EventSource, and each EventSource call to `next()` drains
independently from the same queue).

> **Note**: because the queue is shared, a burst of events is split across tabs
> rather than duplicated.  For use cases that require per-tab delivery, add a
> `tabId` as a sub-key within the session.

---

## Stale Filter Cleanup

A background interval runs every 5 minutes and removes filters that have been
disconnected for more than 30 minutes (`STALE_TTL_MS`).  This is the only
cleanup path in normal operation; no explicit delete is needed on logout.

---

## Files

| Path | Role |
|------|------|
| `src/services/pubsub.ts` | Server PubSub (source of truth) |
| `src/services/server_sent_events.ts` | SSE hub, per-session filter, known-topics registry |
| `src/api/server_sent_events.ts` | API routes (stream, topics PATCH, topics GET) |
| `src/apps/ui.ts` | SSE bridge initialization |
| `src/ui/pubsub.ts` | Browser PubSub |
| `src/ui/server_sent_events.ts` | Browser EventSource bridge |
| `src/ui/api/server_sent_events.ts` | Browser API helpers |
| `design/server-sent-events.md` | This document |
