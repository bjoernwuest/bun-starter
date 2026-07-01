import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';

export interface ServerSentEventEnvelope {
    topic: string;
    data: unknown;
    receivedAt: string;
}

export interface ServerSentEventClientConfig {
    topics?: readonly string[];
}

export interface ServerSentEventClientSnapshot {
    /** Session-derived key, opaque to the browser. */
    sessionKey: string;
    topics: string[];
    createdAt: string;
    lastSeenAt: string;
    streaming: boolean;
}

export const DEFAULT_MAX_BUFFERED_EVENTS = 100;
export const HEARTBEAT_INTERVAL_MS = 25_000;
/** Stale disconnected filters are removed after this duration (30 min). */
export const STALE_TTL_MS = 30 * 60 * 1_000;

// --- TypeBox schemas for route validation and OpenAPI docs ---

export const SseStreamQuerySchema = t.Object({
    topics: t.Optional(t.String()),
});
export type SseStreamQuery = Static<typeof SseStreamQuerySchema>;

export const SseTopicsUpdateBodySchema = t.Object({
    topics: t.Array(t.String()),
});
export type SseTopicsUpdateBody = Static<typeof SseTopicsUpdateBodySchema>;

export const SseTopicFilterStateSchema = t.Object({
    sessionKey: t.String(),
    topics: t.Array(t.String()),
    createdAt: t.String(),
    lastSeenAt: t.String(),
    streaming: t.Boolean(),
});
export type SseTopicFilterState = Static<typeof SseTopicFilterStateSchema>;

export const SseKnownTopicsResponseSchema = t.Object({
    topics: t.Array(t.String()),
});
export type SseKnownTopicsResponse = Static<typeof SseKnownTopicsResponseSchema>;
