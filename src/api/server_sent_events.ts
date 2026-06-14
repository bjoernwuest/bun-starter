import type { ApiInstance } from "@/apps/api.ts";
import { sse, t, status } from "elysia";
import {
    disconnectServerSentEventFilter,
    getKnownTopics,
    nextServerSentEvent,
    parseServerSentEventTopics,
    updateServerSentEventClientTopics,
    upsertServerSentEventFilter,
} from "@/services/server_sent_events.ts";

function isTopicArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((topic) => typeof topic === "string");
}

/**
 * Derive a stable session key from the request's auth context.
 *
 * - API key sessions: `api_key:<apiKeyIdentifier claim>`
 * - Session fallback: `session_user:<oid claim>`
 *
 * The key is opaque to the browser so the browser never needs to manage it.
 * Using the SessionID (or oid) as key ensures that reconnecting with the
 * same credentials restores the previously synced topic filter.
 */
function deriveSseKey(_request: Request, tokenClaims: Record<string, any> | undefined): string | null {
    const apiKeyIdentifier = tokenClaims?.apiKeyIdentifier;
    if (typeof apiKeyIdentifier === "string" && apiKeyIdentifier.length > 0) return `api_key:${apiKeyIdentifier}`;

    const oid = tokenClaims?.oid;
    if (typeof oid === "string" && oid.length > 0) return `session_user:${oid}`;

    return null;
}

// noinspection JSUnusedGlobalSymbols
export default function register(app: ApiInstance) {
    /**
     * GET /api/server_sent_events/stream
     *
     * Opens an SSE stream for the authenticated session. The session key is
     * derived server-side from the API key context – the browser
     * does not need to supply a clientId. If the browser reconnects (same
     * credentials) an existing topic filter is preserved.
     */
    app.get("/server_sent_events/stream", async function* ({ request, query, tokenClaims }) {
        const sessionKey = deriveSseKey(request, tokenClaims);
        if (!sessionKey) {
            yield sse({ event: "error", data: { message: "Could not derive session key" } });
            return;
        }

        // Honour an optional ?topics=… hint for the initial connection.
        // If not supplied (e.g. reconnect), the existing server-side filter is preserved.
        const initialTopics = typeof query.topics === "string" ? parseServerSentEventTopics(query.topics) : undefined;
        const filter = upsertServerSentEventFilter(sessionKey, { topics: initialTopics?.length ? initialTopics : undefined });

        try {
            yield sse({ event: "connected", data: filter.snapshot() });

            while (true) {
                const next = await nextServerSentEvent(sessionKey, request.signal, 25_000);
                if (next === null) break;
                if ("kind" in next && next.kind === "heartbeat") {
                    yield sse({ event: "keepalive", data: { ts: new Date().toISOString() } });
                    continue;
                }

                yield sse({ event: "pubsub", data: next });
            }
        } finally {
            // Preserve the topic filter for reconnects – only disconnect, never destroy.
            disconnectServerSentEventFilter(sessionKey);
        }
    }, {
        query: t.Object({
            topics: t.Optional(t.String()),
        }),
        detail: {
            tags: ["Realtime"],
            summary: "Open an SSE stream for PubSub notifications",
            description: "Opens an authenticated SSE stream. The session key is derived server-side from the API key context. Topic filters are preserved across short disconnections so mobile clients can reconnect without re-syncing. Emits: connected, keepalive, pubsub.",
        },
        response: { 200: t.Any() },
    });

    /**
     * PATCH /api/server_sent_events/topics
     *
     * Replaces the topic filter for the calling session. The browser calls this
     * whenever the local PubSub subscription set changes.
     */
    app.patch("/server_sent_events/topics", async ({ request, tokenClaims }) => {
        const sessionKey = deriveSseKey(request, tokenClaims);
        if (!sessionKey) return status(401, "Could not derive session key");

        let parsedBody: unknown;
        try { parsedBody = await request.json(); } catch { return status (400, "Invalid JSON payload"); }

        const topics = (parsedBody as { topics?: unknown })?.topics;
        if (!isTopicArray(topics)) return status (400, "topics must be an array of strings");

        return status(200, updateServerSentEventClientTopics(sessionKey, topics));
    }, {
        body: t.Object({ topics: t.Array(t.String()) }),
        response: {
            200: t.Object({
                sessionKey: t.String(),
                topics: t.Array(t.String()),
                createdAt: t.String(),
                lastSeenAt: t.String(),
                streaming: t.Boolean(),
            }),
            400: t.String(), 401: t.String() },
        detail: {
            tags: ["Realtime"],
            summary: "Update SSE topic filter for the current session",
            description: "Replaces the server-side topic filter for the calling session. The session key is derived from API key authentication context – the browser never has to manage a clientId. Uninterested events are dropped before reaching the stream.",
        },
    });

    /**
     * GET /api/server_sent_events/topics
     *
     * Returns the names of all topics that have been seen by the server-side
     * PubSub bridge since the process started. Useful for the browser to
     * discover which topics exist before subscribing.
     */
    app.get("/server_sent_events/topics", () => {
        return { topics: getKnownTopics() };
    }, {
        response: {
            200: t.Object({ topics: t.Array(t.String()) }),
        },
        detail: {
            tags: ["Realtime"],
            summary: "List all known PubSub topic names",
            description: "Returns all topic names that have passed through the server-side PubSub bridge since startup. This endpoint is read-only and requires authentication. The list grows monotonically and is reset on process restart.",
        },
    });
}
