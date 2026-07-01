import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';

/** HTTP methods supported by request bundling for mutating operations. */
export type RequestBundlingMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * One client request forwarded as part of a bundling batch.
 */
export interface RequestBundlingRequestItem {
    /** Client-side correlation id used to match streamed responses. */
    clientRequestId: string;
    /** HTTP method to execute on the target endpoint. */
    method: RequestBundlingMethod;
    /** Absolute URL or API-relative path for the sub-request. */
    url: string;
    /** JSON-serialized request body, or `null` when no payload is sent. */
    body: string | null;
    /** Headers forwarded to the target endpoint. */
    headers: Record<string, string>;
    /** Client estimate for expected server processing time. */
    clientExpectedProcessingMs: number;
    /** Client timeout budget for this sub-request. */
    clientTimeoutMs: number;
    /** ISO timestamp representing the client timeout deadline. */
    clientMayTakeUntil: string;
}

/** Non-HTTP signals that annotate bundled response outcomes. */
export type RequestBundlingSignal = "timeout";

/**
 * One streamed response item returned from the request bundling endpoint.
 */
export interface RequestBundlingResponseItem {
    /** Correlation id copied from the request item. */
    clientRequestId: string;
    /** HTTP-like status describing the outcome of the sub-request. */
    status: number;
    /** Parsed response payload from the sub-request. */
    body: unknown;
    /** Optional error message when the sub-request fails. */
    error?: string;
    /** Optional non-HTTP signal such as timeout. */
    signal?: RequestBundlingSignal;
    /** True when the mutation may have executed despite an error/timeout. */
    mayHaveExecuted?: boolean;
    /** Server timeout deadline used for best-effort retry safety decisions. */
    serverMayTakeUntil?: string;
}

/**
 * Runtime configuration consumed by the UI request-bundling client.
 */
export interface RequestBundlingClientRuntimeConfig {
    /** Maximum queue age in milliseconds before the client flushes a batch. */
    maxAgeMs: number;
    /** Maximum estimated queued bytes before the client flushes a batch. */
    maxBytes: number;
    /** Maximum queued request count before the client flushes a batch. */
    maxRequests: number;
    /** Default client estimate for processing time in milliseconds. */
    defaultExpectedProcessingMs: number;
    /** Default client timeout budget in milliseconds. */
    defaultTimeoutMs: number;
}

export const FALLBACK_SERVER_FLUSH_MS = 250;
export const FALLBACK_SERVER_FLUSH_BYTES = 1_024 * 1_024;
export const FALLBACK_SERVER_FLUSH_COUNT = 10;
export const FALLBACK_DEFAULT_SERVER_TIMEOUT_MS = 30_000;
export const FALLBACK_MIN_SERVER_TIMEOUT_MS = 5_000;
export const FALLBACK_MAX_SERVER_TIMEOUT_MS = 120_000;
export const FALLBACK_CLIENT_MAX_AGE_MS = 250;
export const FALLBACK_CLIENT_MAX_BYTES = 1_024 * 1_024;
export const FALLBACK_CLIENT_MAX_REQUESTS = 10;
export const FALLBACK_CLIENT_DEFAULT_EXPECTED_PROCESSING_MS = 15_000;
export const FALLBACK_CLIENT_DEFAULT_TIMEOUT_MS = 45_000;

export interface RequestBundlingServerConfig {
    flushMs: number;
    flushBytes: number;
    flushCount: number;
    defaultServerTimeoutMs: number;
    minServerTimeoutMs: number;
    maxServerTimeoutMs: number;
}

// --- TypeBox schemas for route validation and OpenAPI docs ---

export const RequestBundlingClientConfigSchema = t.Object({
    maxAgeMs: t.Number(),
    maxBytes: t.Number(),
    maxRequests: t.Number(),
    defaultExpectedProcessingMs: t.Number(),
    defaultTimeoutMs: t.Number(),
});
export type RequestBundlingClientConfigSchemaType = Static<typeof RequestBundlingClientConfigSchema>;
