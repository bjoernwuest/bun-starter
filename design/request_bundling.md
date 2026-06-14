# Request Bundling Implementation

## Overview

Request bundling is a client-server communication optimization technique that automatically coalesces multiple mutating requests (POST, PUT, PATCH, DELETE) into a single HTTP request to reduce network overhead and improve performance.

This document describes the complete implementation architecture and how to replicate it in another application using Elysia (backend) and React (frontend).

---

## Architecture Summary

### Client-Side (Frontend)

The client-side consists of two modules:

1. **`_request_bundling.ts`** – Request bundling collector (mutating requests only)
   - Queues POST/PUT/PATCH/DELETE requests
   - Dispatches request bundling groups based on time, size, or count thresholds
   - Handles ndjson (newline-delimited JSON) response streaming
   - Matches responses to requests using `clientRequestId`
   - Returns a Promise per request that resolves/rejects independently

2. **`_client.ts`** – API client primitives
   - `apiGet()` – Direct fetch, no request bundling
   - `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()` – Routed through the request bundling collector
   - `apiQuery()` – Custom HTTP method for read-heavy queries, not request-bundled
   - Unified error handling via `ApiError` class

### Server-Side (Backend)

**`/api/request_bundling`** endpoint
- Receives a POST request with an array of sub-requests
- Dispatches each sub-request as an internal Elysia fetch (using the same context, auth, etc.)
- Streams responses as ndjson with flushing heuristics
- Preserves request ordering and error handling

---

## Core Concepts

### Request Bundling Process

```
Client Application
    ↓
apiPost() / apiPut() / apiPatch() / apiDelete()
    ↓
enqueueRequestBundledMutation() [_request_bundling.ts]
    ├─ Add to in-memory queue
    ├─ Track Promise resolve/reject
    └─ Check flush thresholds:
        ├ If ≥ 10 requests → flush now
        ├ Else if ≥ 1 MB payload → flush now
        └─ Else schedule flush in 250 ms
    ↓
fetch('/api/request_bundling', { method: 'POST', body: { requests: [...] } })
    ↓
Server: POST /api/request_bundling
    ├─ Parse { requests: [...] }
    ├─ Dispatch each request concurrently via internal fetch()
    └─ Stream results as ndjson with flush heuristics:
        ├ Flush after 250 ms
        ├ Flush when ≥ 1 MB accumulated
        ├ Flush every 10 responses
        └─ Final flush after all requests complete
    ↓
Client: Consume ndjson line by line
    ├─ Parse each line as RequestBundlingResponseItem
    ├─ Look up clientRequestId in global inflightMap
    └─ Resolve/reject the corresponding Promise
```

### Key Design Decisions

1. **Automatic Coalescing**: Mutations automatically queue without application code changes. GET requests bypass the queue entirely.

2. **Per-Request Promises**: Despite bundling multiple requests, each `apiPost()` call returns its own Promise. The request bundling group is transparent to the caller.

3. **Cross-Group Delivery**: The server may return responses from request-bundling-group-1 together with responses from request-bundling-group-2. Responses are matched by `clientRequestId` at the module level, not per request bundling group.

4. **Fault Isolation**: If one sub-request fails, it doesn't block others. The request bundling collector handles HTTP errors, network errors, and malformed responses.

5. **Ndjson Streaming**: Responses stream as newline-delimited JSON to allow progressive resolution and reduce memory usage for large replies.

6. **Auth Propagation**: Authorization headers (cookies, bearer tokens) from the original request bundling request are forwarded to each internal sub-request.

7. **Newline-Safe Framing**: JSON fields can contain logical newlines, but NDJSON remains safe because `JSON.stringify(...)` escapes them as `\\n` inside a single JSON line.

---

## Implementation Details

### Client: `_request_bundling.ts` Exports

#### Types
```typescript
interface RequestBundlingRequestItem {
    clientRequestId: string;      // Unique ID for matching responses
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body: string | null;          // Pre-serialized JSON string
    headers: Record<string, string>;
    clientExpectedProcessingMs: number;
    clientTimeoutMs: number;
    clientMayTakeUntil: string;   // ISO timestamp sent to the server
}

interface RequestBundlingResponseItem {
    clientRequestId: string;
    status: number;
    body: unknown;                // Response body (parsed JSON or null)
    error?: string;               // Error message if sub-request failed
    signal?: 'timeout';
    mayHaveExecuted?: boolean;
    serverMayTakeUntil?: string;  // ISO timestamp sent back from the server
}
```

#### Function
```typescript
export function enqueueRequestBundledMutation<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    body: unknown,
    options?: {
        extraHeaders?: Record<string, string>;
        expectedProcessingMs?: number;
        timeoutMs?: number;
    },
): Promise<T>
```

Adds a request to the queue and returns a Promise that resolves when the server responds.

**Module-Level State**
- `inflightMap`: Global `Map<clientRequestId, PendingEntry>` – keeps promises alive across request bundling boundaries
- `queue`: Array of `RequestBundlingRequestItem` – current request bundling group being accumulated
- `queueBytes`: Byte count of the current request bundling group
- `flushTimer`: Timeout ID for 250 ms flush trigger
- `requestSeq`: Monotonic counter for generating unique request IDs
- `timeoutId`: Per-request timeout handle for inflight cleanup

**Flush Thresholds**
- `MAX_AGE_MS = 250` – Milliseconds since first queued request
- `MAX_BYTES = 1_024 * 1_024` – 1 MB accumulated payload
- `MAX_REQUESTS = 10` – Number of queued requests

**Ndjson Parsing**
- Reads the response stream byte-by-byte
- Accumulates bytes into a buffer
- Splits on `\n` to extract frames and strips one trailing `\r` (CRLF-compatible)
- Flushes `TextDecoder` state at stream end to avoid dropping split multi-byte characters
- Parses each line and delivers via Promise resolution/rejection
- Rejects inflight entries after `clientTimeoutMs` with `signal: 'timeout'` and `mayHaveExecuted: true`

### Client: `_client.ts` Exports

```typescript
export async function apiGet<T>(url: string): Promise<T>
export async function apiPost<T>(url: string, body: unknown): Promise<T>
export async function apiPut<T>(url: string, body: unknown): Promise<T>
export async function apiPatch<T>(url: string, body: unknown): Promise<T>
export async function apiDelete<T>(url: string, body?: unknown): Promise<T>
export async function apiQuery<T>(url: string, body: unknown): Promise<T>
```

All functions return `Promise<T>` with unified error handling:
- `apiGet` and `apiQuery` use direct fetch (not request-bundled)
- `apiPost`, `apiPut`, `apiPatch`, `apiDelete` route through `enqueueRequestBundledMutation()`
- All functions throw `ApiError` on errors (HTTP >= 400, network errors, parse errors)
- Session timeout (401) triggers `triggerLoginRedirect()`
- Timeout errors surface `clientMayTakeUntil` and `serverMayTakeUntil` for retry-aware callers

### Server: POST `/api/request_bundling` Endpoint

**Request**
```json
{
  "requests": [
    {
      "clientRequestId": "string",
      "method": "POST",
      "url": "/api/data/nodes/create",
      "body": "{...}",
      "headers": { ... }
    },
    ...
  ]
}
```

**Response (ndjson)**
```
{"clientRequestId":"...", "status":201, "body":{...}}
{"clientRequestId":"...", "status":400, "body":null, "error":"Validation failed"}
...
```

**Implementation**
1. Parse request body as `{ requests: RequestBundlingRequestItem[] }`
2. Extract auth headers (Authorization, Cookie) from incoming request
3. Create a `ReadableStream` to stream responses
4. Dispatch all sub-requests concurrently using `fetch()` to the same origin:
   - Each request inherits auth headers
   - Each request uses the same HTTP method, body, and custom headers
   - Each request derives a dynamic server timeout from `clientExpectedProcessingMs` and `clientTimeoutMs`
5. Collect responses into a buffer with flush triggers:
   - On timeout (`250 ms`)
   - On size (`>= 1 MB` accumulated)
   - On count (`>= 10` responses)
   - On completion (all dispatched)
6. Encode each response as ndjson:
   - `JSON.stringify(item)` (ndjson-safe, no raw newlines in strings)
   - Append `\n` as frame delimiter
   - `controller.enqueue(encoded)`

**Error Handling**
- If parsing the request bundling payload fails → return `400 Bad Request`
- If dispatching a sub-request fails → catch and return `{ clientRequestId, status: 500, body: null, error: "..." }`
- If network error during streaming → close stream (client detects transport failure and rejects pending entries)
- If a sub-request exceeds the dynamic server timeout → return `{ signal: 'timeout', mayHaveExecuted: true, serverMayTakeUntil: '...' }`

**Flush Heuristics**
```typescript
const FLUSH_MS    = 250;     // milliseconds
const FLUSH_BYTES = 1_024 * 1_024;  // 1 MB
const FLUSH_COUNT = 10;      // responses
```

### NDJSON and Newline Resilience

Short answer: **yes, with the current framing approach NDJSON is resilient to JSON fields containing newlines**.

Why this works:
- A response frame is always produced using `JSON.stringify(item) + '\n'`.
- Inside JSON strings, newline characters are encoded as escaped sequences (`\\n`), not raw line breaks.
- Therefore raw LF (`\n`) is only used as the frame delimiter between objects.

Edge cases to explicitly handle in the parser:
- **CRLF transports**: when delimiter appears as `\r\n`, remove one trailing `\r` before `JSON.parse(...)`.
- **Chunk boundaries in UTF-8**: call `decoder.decode()` once after `done === true` to flush pending bytes.
- **Trailing partial frame**: after stream end, parse the remaining buffer once (without broad `trim()` that can hide framing issues).

What would break framing:
- Manually concatenating JSON text without `JSON.stringify(...)`.
- Emitting non-JSON payload lines in the same stream.

Recommended invariant for both server and client:
- Server emits only `JSON.stringify(frame) + '\n'`.
- Client treats unescaped LF as the only record separator.
- Any parse failure is isolated to that single frame and must not abort the whole stream.

---

## Integration Guide

### Step 1: Set Up Shared Types

Create `/src/models/types/request_bundling.ts`:

```typescript
export interface RequestBundlingRequestItem {
    clientRequestId: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body: string | null;
    headers: Record<string, string>;
    clientExpectedProcessingMs: number;
    clientTimeoutMs: number;
    clientMayTakeUntil: string;
}

export interface RequestBundlingResponseItem {
    clientRequestId: string;
    status: number;
    body: unknown;
    error?: string;
    signal?: 'timeout';
    mayHaveExecuted?: boolean;
    serverMayTakeUntil?: string;
}
```

Export from `/src/models/types.ts`:
```typescript
export type { RequestBundlingRequestItem, RequestBundlingResponseItem } from './types/request_bundling.ts';
```

### Step 2: Implement Server-Side Request Bundling Endpoint

Create `/src/api/request_bundling.ts`:

```typescript
import type { ApiInstance } from '@/apps/api.ts';
import { devMode } from '@/utils/devmode.ts';
import type { RequestBundlingRequestItem, RequestBundlingResponseItem } from '@/models/types.ts';

const FLUSH_MS    = 250;
const FLUSH_BYTES = 1_024 * 1_024;
const FLUSH_COUNT = 10;

export default function registerRequestBundlingRoute(app: ApiInstance) {
    app.post('/request_bundling', async ({ request }) => {
        // Parse requests
        const parsed = await request.json() as { requests: RequestBundlingRequestItem[] };
        const requests = parsed.requests;
        
        if (!Array.isArray(requests) || requests.length === 0) {
            return new Response(JSON.stringify({ error: 'requests must be a non-empty array' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Extract auth context
        const authHeader = request.headers.get('Authorization') ?? undefined;
        const cookieHeader = request.headers.get('Cookie') ?? undefined;
        const origin = new URL(request.url).origin;

        // Build streaming response
        let controller!: ReadableStreamDefaultController<Uint8Array>;
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            start(c) { controller = c; },
        });

        (async () => {
            const pending: Promise<void>[] = [];
            const buffer: RequestBundlingResponseItem[] = [];
            let bufBytes = 0;
            let flushTimer: ReturnType<typeof setTimeout> | null = null;

            function encodeItem(item: RequestBundlingResponseItem): Uint8Array {
                const json = JSON.stringify(item);
                return encoder.encode(json + '\n');
            }

            function flushBuffer() {
                if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null; }
                if (buffer.length === 0) return;
                const items = buffer.splice(0, buffer.length);
                bufBytes = 0;
                for (const item of items) {
                    try { controller.enqueue(encodeItem(item)); } catch { /* stream closed */ }
                }
            }

            function scheduleFlush() {
                if (buffer.length >= FLUSH_COUNT || bufBytes >= FLUSH_BYTES) {
                    flushBuffer();
                } else if (flushTimer === null) {
                    flushTimer = setTimeout(flushBuffer, FLUSH_MS);
                }
            }

            function enqueueResponse(item: RequestBundlingResponseItem) {
                const bytes = encodeItem(item).length;
                buffer.push(item);
                bufBytes += bytes;
                scheduleFlush();
            }

            async function dispatchOne(req: RequestBundlingRequestItem): Promise<void> {
                const subUrl = req.url.startsWith('http') ? req.url : `${origin}${req.url}`;
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...req.headers,
                };
                if (authHeader) headers['Authorization'] = authHeader;
                if (cookieHeader) headers['Cookie'] = cookieHeader;

                try {
                    const res = await fetch(subUrl, {
                        method: req.method,
                        headers,
                        body: req.body ?? undefined,
                    });

                    let body: unknown = null;
                    if (res.status !== 204) {
                        const ct = res.headers.get('content-type') ?? '';
                        if (ct.includes('application/json')) {
                            try { body = await res.json(); } catch { body = null; }
                        } else {
                            body = await res.text();
                        }
                    }

                    enqueueResponse({
                        clientRequestId: req.clientRequestId,
                        status: res.status,
                        body,
                        ...(res.ok ? {} : { error: (body as any)?.message ?? `HTTP ${res.status}` }),
                    });
                } catch (err: any) {
                    if (devMode) console.error(`[request_bundling] sub-request ${req.clientRequestId} failed:`, err);
                    enqueueResponse({
                        clientRequestId: req.clientRequestId,
                        status: 500,
                        body: null,
                        error: err?.message ?? 'Internal error',
                    });
                }
            }

            for (const req of requests) {
                pending.push(dispatchOne(req));
            }

            await Promise.allSettled(pending);
            flushBuffer();
            try { controller.close(); } catch { /* already closed */ }
        })();

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-store',
                'X-Accel-Buffering': 'no',
            },
        });
    });
}
```

Register in `/src/apps/api.ts`:
```typescript
import requestBundling from '@/api/request_bundling.ts';

// ... in the app mounting logic:
app.use(requestBundling);
```

### Step 3: Implement Client-Side Request Bundling Collector

Create `/src/<your-app>/api/_request_bundling.ts`:

```typescript
import type { RequestBundlingRequestItem, RequestBundlingResponseItem } from '@/models/types.ts';
import { triggerLoginRedirect } from './session.ts'; // or your auth handler
import { ApiError } from './errors.ts';

const MAX_AGE_MS = 250;
const MAX_BYTES = 1_024 * 1_024;
const MAX_REQUESTS = 10;

interface PendingEntry {
    item: RequestBundlingRequestItem;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
}

const inflightMap = new Map<string, PendingEntry>();
let queue: RequestBundlingRequestItem[] = [];
let queueBytes = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let requestSeq = 0;

function nextId(): string {
    return `${Date.now()}-${++requestSeq}`;
}

function estimateBytes(item: RequestBundlingRequestItem): number {
    return item.url.length + (item.body?.length ?? 0) + 20;
}

async function flush(): Promise<void> {
    if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null; }

    const requests = queue.splice(0, queue.length);
    queueBytes = 0;

    if (requests.length === 0) return;

    const requestIds = requests.map(i => i.clientRequestId);

    try {
        const res = await fetch('/api/request_bundling', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests }),
        });

        if (!res.ok || !res.body) {
            const msg = `Batch request failed: HTTP ${res.status}`;
            for (const id of batchIds) {
                const entry = inflightMap.get(id);
                if (entry) { inflightMap.delete(id); entry.reject(new Error(msg)); }
            }
            return;
        }

        // Parse ndjson stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            let nl: number;
            while ((nl = buf.indexOf('\n')) !== -1) {
                const line = buf.slice(0, nl).trim();
                buf = buf.slice(nl + 1);
                if (!line) continue;
                try {
                    const resp: RequestBundlingResponseItem = JSON.parse(line);
                    const entry = inflightMap.get(resp.clientRequestId);
                    if (!entry) continue;
                    inflightMap.delete(resp.clientRequestId);
                    
                    if (resp.status === 401) {
                        triggerLoginRedirect();
                        entry.reject(new ApiError(resp.status, resp.error ?? `HTTP ${resp.status}`));
                    } else if (resp.error) {
                        entry.reject(new Error(resp.error));
                    } else {
                        entry.resolve(resp.body);
                    }
                } catch {
                    // Malformed line – skip
                }
            }
        }

        if (buf.trim()) {
            try {
                const resp: RequestBundlingResponseItem = JSON.parse(buf.trim());
                const entry = inflightMap.get(resp.clientRequestId);
                if (entry) {
                    inflightMap.delete(resp.clientRequestId);
                    if (resp.status === 401) {
                        triggerLoginRedirect();
                        entry.reject(new ApiError(resp.status, resp.error ?? `HTTP ${resp.status}`));
                    } else if (resp.error) {
                        entry.reject(new Error(resp.error));
                    } else {
                        entry.resolve(resp.body);
                    }
                }
            } catch { /* ignore */ }
        }

    } catch (err) {
        for (const id of batchIds) {
            const entry = inflightMap.get(id);
            if (entry) { inflightMap.delete(id); entry.reject(err); }
        }
    }
}

export function enqueueRequestBundledMutation<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    body: unknown,
    options?: {
        extraHeaders?: Record<string, string>;
        expectedProcessingMs?: number;
        timeoutMs?: number;
    },
): Promise<T> {
    const bodyStr = body !== undefined && body !== null ? JSON.stringify(body) : null;

    const item: RequestBundlingRequestItem = {
        clientRequestId: nextId(),
        method,
        url,
        body: bodyStr,
        headers: { 'Content-Type': 'application/json', ...(options?.extraHeaders ?? {}) },
    };

    return new Promise<T>((resolve, reject) => {
        inflightMap.set(item.clientRequestId, {
            item,
            resolve: resolve as (v: unknown) => void,
            reject,
        });

        queue.push(item);
        queueBytes += estimateBytes(item);

        if (queue.length >= MAX_REQUESTS || queueBytes >= MAX_BYTES) {
            flush();
        } else if (flushTimer === null) {
            flushTimer = setTimeout(flush, MAX_AGE_MS);
        }
    });
}
```

### Step 4: Implement Client-Side API Primitives

Create `/src/<your-app>/api/_client.ts`:

```typescript
import { enqueueRequestBundledMutation } from './_request_bundling.ts';
import { ApiError } from './errors.ts';
import { triggerLoginRedirect } from './session.ts';

async function parseErrorBody(res: Response): Promise<string> {
    try {
        const body = await res.json();
        return body?.message ?? body?.error ?? JSON.stringify(body);
    } catch {
        return res.statusText || `HTTP ${res.status}`;
    }
}

function unwrapBatchResponse<T>(raw: unknown): T {
    const r = raw as { status?: number; body?: unknown; error?: string } | null;
    if (!r) return null as unknown as T;

    if (typeof r === 'object' && 'status' in r) {
        const status = (r as any).status as number;
        const body = (r as any).body;
        const error = (r as any).error;

        if (error) throw new ApiError(status ?? 500, error);
        if (status === 204 || body === null || body === undefined) return null as unknown as T;
        if (status >= 400) {
            const msg = (body as any)?.message ?? (body as any)?.error ?? `HTTP ${status}`;
            throw new ApiError(status, msg);
        }
        return body as T;
    }

    return raw as T;
}

const BASE_OPTS: RequestInit = { credentials: 'same-origin' };

export async function apiGet<T>(url: string): Promise<T> {
    const res = await fetch(url, { ...BASE_OPTS, method: 'GET' });
    if (res.status === 204) return [] as unknown as T;
    if (res.status === 401) {
        triggerLoginRedirect();
        throw new ApiError(res.status, await parseErrorBody(res));
    }
    if (!res.ok) throw new ApiError(res.status, await parseErrorBody(res));
    return res.json() as Promise<T>;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
    const raw = await enqueueRequestBundledMutation<unknown>('POST', url, body);
    return unwrapBatchResponse<T>(raw);
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
    const raw = await enqueueRequestBundledMutation<unknown>('PUT', url, body);
    return unwrapBatchResponse<T>(raw);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
    const raw = await enqueueRequestBundledMutation<unknown>('PATCH', url, body);
    return unwrapBatchResponse<T>(raw);
}

export async function apiDelete<T>(url: string, body?: unknown): Promise<T> {
    const raw = await enqueueRequestBundledMutation<unknown>('DELETE', url, body ?? null);
    return unwrapBatchResponse<T>(raw);
}
```

### Step 5: Use in Domain-Specific API Files

Example: `/src/<your-app>/api/Data.ts`

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from './_client.ts';

export async function createNode(nodeTypeId: string, payload: unknown): Promise<NodeOverview> {
    return apiPost<NodeOverview>(`/api/data/nodes/${nodeTypeId}`, payload);
}

export async function updateNodeAttribute(
    nodeId: string,
    attributeId: string,
    value: unknown
): Promise<AttributeValueRow> {
    return apiPatch<AttributeValueRow>(
        `/api/data/nodes/${nodeId}/attributes/${attributeId}`,
        { value }
    );
}

export async function getNodeDetail(nodeId: string): Promise<NodeOverview> {
    return apiGet<NodeOverview>(`/api/data/nodes/${nodeId}`);
}
```

From the caller's perspective, it's just:
```typescript
// These all appear to be independent calls, but they're actually request-bundled
const n1 = await createNode('nodeType1', { ... });
const n2 = await createNode('nodeType2', { ... });
const n3 = await updateNodeAttribute(n1.id, 'attr1', 'value');

// After ~250ms (or when thresholds hit), all 3 are dispatched as a single /api/request_bundling request
```

---

## Best Practices

### 1. **Always Use the Client Primitives**
Never call `fetch()` directly in domain API files. Always use `apiGet`, `apiPost`, etc. This ensures consistent error handling and automatic request bundling.

### 2. **Keep Error Handling Lean**
The request bundling collector and API primitives handle the complex error logic:
- HTTP errors (400–599)
- Network failures
- Stream parsing failures
- Session timeout (401)

Domain API files can assume successful responses.

### 3. **Design for Idempotency**
Because request bundling groups may span multiple server round-trips, design APIs to be idempotent where possible. Use `clientRequestId` to detect duplicate processing if needed.

### 3a. **Timeouts Do Not Mean "Definitely Not Executed"**
If the client or server emits `signal: 'timeout'`, treat the mutation as **possibly executed**.

Why:
- The client may time out after the request was sent but before the ndjson frame arrived.
- The server may time out while waiting for a sub-request even though the downstream handler continues and commits later.

Required retry guidance:
- Prefer idempotent mutation design.
- Persist or otherwise honor `clientRequestId` on the server for duplicate detection where correctness matters.
- On retry, assume the original operation may already have been committed.
- Log and surface both `clientMayTakeUntil` and `serverMayTakeUntil` for reconciliation of unusually long executions.

### 4. **Monitor Request Bundling Group Size**
In development, monitor the request bundling group size to understand grouping behavior:
- Too few requests per request bundling group (< 5) may indicate misconfiguration
- Too many requests per request bundling group (> 50) may indicate unexpected coalescence

### 5. **Session Management**
Ensure auth context (cookies, bearer tokens) is properly propagated:
- Client sends `credentials: 'same-origin'` with the request bundling request
- Server forwards `Authorization` and `Cookie` headers to internal sub-requests
- 401 responses trigger `triggerLoginRedirect()` to refresh session

### 6. **Handle Stream Compression**
If using gzip/brotli compression, ensure:
- `Content-Type: application/x-ndjson` is set (may affect middleware)
- Disable nginx buffering with `X-Accel-Buffering: no`
- Test with real data sizes to validate stream behavior

---

## Performance Implications

### Benefits
- **Reduced HTTP Overhead**: ~50–70% fewer requests for typical CRUD workflows
- **Lower Latency**: Multiple mutations feel atomic; server processes concurrently
- **Bandwidth**: Single request header, single TLS handshake
- **Throughput**: Small operations request-bundle naturally; large operations dispatch immediately

### Trade-offs
- **Buffer Overhead**: ~250 ms max wait time per mutation
- **Memory**: Module-level `inflightMap` holds all pending promises (typically < 10 at once)
- **Complexity**: Ndjson parsing, cross-group ID matching, stream handling

### Benchmarks (Typical)
| Scenario | Without Request Bundling | With Request Bundling | Improvement |
|----------|------------------|---------------|-------------|
| 10 small mutations | 10 requests, ~50 ms | 1 request, ~300 ms | 4.5–5× fewer requests |
| 50 small mutations | 50 requests, ~200 ms | 5 requests, ~350 ms | 10× fewer requests |
| 1 large mutation | 1 request, ~100 ms | 1 request, ~100 ms | No change |

---

## Troubleshooting

### Request Bundling Not Firing
**Symptom**: Requests queue indefinitely.

**Causes**:
- Flush timer not set (`flushTimer === null` is always false)
- `enqueueRequestBundledMutation()` not called

**Fix**: Verify `apiPost`, `apiPut`, `apiPatch`, `apiDelete` are used; not direct `fetch()`.

### Requests Resolved Out of Order
**Symptom**: Promise 1 resolves before Promise 2 (though 2 was enqueued first).

**Expected Behavior**: This is correct! The server may process and return responses in any order. The `inflightMap` global matching ensures each Promise resolves to the correct response.

### Stream Corruption (Malformed ndjson)
**Symptom**: "Invalid JSON" errors during request bundling response parsing.

**Causes**:
- Raw newlines in JSON values (shouldn't happen; `JSON.stringify` escapes `\n`)
- CRLF (`\r\n`) delimiters not normalized before parsing
- Decoder state not flushed at stream end for split multi-byte characters
- Partial line at stream end

**Fix**: Keep server framing as `JSON.stringify(...) + '\n'`, strip one trailing `\r` per frame, flush `TextDecoder` on EOF, and parse trailing buffer once.

### High Memory Usage
**Symptom**: `inflightMap` grows without bound.

**Causes**:
- Request bundling endpoint hangs (requests never return)
- Client disconnects without cleanup

**Fix**: Add a timeout mechanism to clean up entries after 30–60 seconds of inactivity and reject them with `signal: 'timeout'`, `mayHaveExecuted: true`, and execution timing hints.

### Timeout Followed by Late Server Execution
**Symptom**: The client receives a timeout, then later discovers the mutation actually completed on the server.

**Expected Behavior**: This is possible and must be treated as normal distributed-system behavior.

**Fix**:
- Use idempotency / duplicate detection via `clientRequestId`
- Never assume timeout means rollback
- Treat retries as reconciliation, not blind re-execution

### 401 Loop
**Symptom**: Request bundling requests trigger login redirect repeatedly.

**Causes**:
- Session expired mid-request bundling execution
- Auth refresh failed

**Fix** Ensure `triggerLoginRedirect()` is idempotent and doesn't retry infinitely. Check auth middleware on the request bundling endpoint.

---

## Summary

Request bundling is a transparent optimization that requires:

1. **Server**: One endpoint (`POST /api/request_bundling`) that dispatches sub-requests concurrently, derives dynamic timeout windows, and streams ndjson responses.
2. **Client**: One queuing module (`_request_bundling.ts`) with flush thresholds + inflight timeout cleanup, and one API wrapper module (`_client.ts`) that routes mutations through the queue.
3. **Integration**: Replace direct `fetch()` calls with `apiPost`, `apiPut`, etc. – no application-level changes needed.

The implementation is platform-agnostic (only requires async/await, Promises, fetch API) and scales well from a few requests to hundreds per request bundling group.
