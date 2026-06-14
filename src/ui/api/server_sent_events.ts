// noinspection JSUnusedGlobalSymbols
import { ApiError } from "./errors.ts";
import { triggerLoginRedirect } from "./session.ts";

const BASE_OPTIONS: RequestInit = { credentials: "same-origin" };

function extractErrorMessage(body: unknown, fallback: string): string {
    if (body && typeof body === "object") {
        const candidate = body as { message?: unknown; error?: unknown };
        if (typeof candidate.message === "string") return candidate.message;
        if (typeof candidate.error === "string") return candidate.error;
    }

    if (typeof body === "string" && body.length > 0) return body;
    return fallback;
}

/**
 * Build the SSE stream URL.
 *
 * An optional initial topics list is forwarded as a query parameter so the
 * server can pre-seed the filter without waiting for the first PATCH round-trip.
 * The browser never sends a clientId – the server derives the session key from
 * the SessionID cookie or Bearer token.
 */
export function buildServerSentEventsStreamUrl(topics: readonly string[] = []): string {
    const url = new URL("/api/server_sent_events/stream", window.location.origin);
    if (topics.length > 0) url.searchParams.set("topics", topics.join(","));
    return url.toString();
}

/**
 * Replace the topic filter for the current session on the server.
 * Authentication is derived from the session cookie, so no clientId is needed.
 */
export async function syncServerSentEventTopics(topics: readonly string[]): Promise<void> {
    const response = await fetch("/api/server_sent_events/topics", {
        ...BASE_OPTIONS,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics }),
    });

    let parsed: unknown = null;
    if (response.status !== 204) {
        try {
            parsed = await response.json();
        } catch {
            parsed = null;
        }
    }

    if (response.status === 401) {
        triggerLoginRedirect();
        throw new ApiError(401, extractErrorMessage(parsed, "Unauthorized"));
    }

    if (!response.ok) {
        throw new ApiError(response.status, extractErrorMessage(parsed, `HTTP ${response.status}`));
    }
}
