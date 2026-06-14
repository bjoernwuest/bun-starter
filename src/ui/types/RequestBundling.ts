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
    maxAgeMs: number;
    maxBytes: number;
    maxRequests: number;
    defaultExpectedProcessingMs: number;
    defaultTimeoutMs: number;
}

