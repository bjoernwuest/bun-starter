import { ConfigValueTypes, type ConfigEntryType } from "@/types/ConfigEntry.ts";
import type { DBClient } from "@/services/database.ts";
import { getConfigEntriesByKey } from "@/repo/ConfigRepo.ts";
import type { RequestBundlingClientRuntimeConfig } from "@/types/RequestBundling.ts";

const configDomain = "request_bundling";

const FALLBACK_SERVER_FLUSH_MS = 250;
const FALLBACK_SERVER_FLUSH_BYTES = 1_024 * 1_024;
const FALLBACK_SERVER_FLUSH_COUNT = 10;
const FALLBACK_DEFAULT_SERVER_TIMEOUT_MS = 30_000;
const FALLBACK_MIN_SERVER_TIMEOUT_MS = 5_000;
const FALLBACK_MAX_SERVER_TIMEOUT_MS = 120_000;

const FALLBACK_CLIENT_MAX_AGE_MS = 250;
const FALLBACK_CLIENT_MAX_BYTES = 1_024 * 1_024;
const FALLBACK_CLIENT_MAX_REQUESTS = 10;
const FALLBACK_CLIENT_DEFAULT_EXPECTED_PROCESSING_MS = 15_000;
const FALLBACK_CLIENT_DEFAULT_TIMEOUT_MS = 45_000;

export interface RequestBundlingServerConfig {
    flushMs: number;
    flushBytes: number;
    flushCount: number;
    defaultServerTimeoutMs: number;
    minServerTimeoutMs: number;
    maxServerTimeoutMs: number;
}

export const config = {
    cfgServerFlushMs: { domain: configDomain, key: "Server.FlushMs", description: "How long the request bundling endpoint may buffer NDJSON frames before flushing (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgServerFlushBytes: { domain: configDomain, key: "Server.FlushBytes", description: "Maximum buffered response bytes before the request bundling endpoint flushes the stream.", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgServerFlushCount: { domain: configDomain, key: "Server.FlushCount", description: "Maximum buffered response item count before the request bundling endpoint flushes the stream.", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgServerDefaultTimeoutMs: { domain: configDomain, key: "Server.DefaultTimeoutMs", description: "Fallback server timeout budget per bundled sub-request (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgServerMinTimeoutMs: { domain: configDomain, key: "Server.MinTimeoutMs", description: "Minimum allowed server timeout for bundled sub-requests (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgServerMaxTimeoutMs: { domain: configDomain, key: "Server.MaxTimeoutMs", description: "Maximum allowed server timeout for bundled sub-requests (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgClientMaxAgeMs: { domain: configDomain, key: "Client.MaxAgeMs", description: "How long the browser may keep queued mutations before sending a request bundling batch (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgClientMaxBytes: { domain: configDomain, key: "Client.MaxBytes", description: "Maximum estimated queued request bytes before the browser sends a request bundling batch.", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgClientMaxRequests: { domain: configDomain, key: "Client.MaxRequests", description: "Maximum number of queued mutations before the browser sends a request bundling batch.", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgClientDefaultExpectedProcessingMs: { domain: configDomain, key: "Client.DefaultExpectedProcessingMs", description: "Default client hint for expected server processing time of bundled sub-requests (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
    cfgClientDefaultTimeoutMs: { domain: configDomain, key: "Client.DefaultTimeoutMs", description: "Default client timeout budget used for queued bundled sub-requests (milliseconds).", type: ConfigValueTypes.number, value: undefined, inputFormat: "^[1-9][0-9]*$", outputFormat: "", editInUI: true, mandatoryForStart: false },
} satisfies Record<string, ConfigEntryType>;

let cachedServerConfig: RequestBundlingServerConfig | undefined;
let cachedClientConfig: RequestBundlingClientRuntimeConfig | undefined;

function toPositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : fallback;
}

async function readConfigNumber(db: DBClient, entry: ConfigEntryType, fallback: number): Promise<number> {
    const result = await getConfigEntriesByKey(db, entry.domain, entry.key);
    return toPositiveInteger(result[0]?.value, fallback);
}

export async function getRequestBundlingServerConfig(db: DBClient): Promise<RequestBundlingServerConfig> {
    if (!cachedServerConfig) {
        const flushMs = await readConfigNumber(db, config.cfgServerFlushMs, FALLBACK_SERVER_FLUSH_MS);
        const flushBytes = await readConfigNumber(db, config.cfgServerFlushBytes, FALLBACK_SERVER_FLUSH_BYTES);
        const flushCount = await readConfigNumber(db, config.cfgServerFlushCount, FALLBACK_SERVER_FLUSH_COUNT);
        const defaultServerTimeoutMs = await readConfigNumber(db, config.cfgServerDefaultTimeoutMs, FALLBACK_DEFAULT_SERVER_TIMEOUT_MS);
        const minServerTimeoutMs = await readConfigNumber(db, config.cfgServerMinTimeoutMs, FALLBACK_MIN_SERVER_TIMEOUT_MS);
        const maxServerTimeoutMs = await readConfigNumber(db, config.cfgServerMaxTimeoutMs, FALLBACK_MAX_SERVER_TIMEOUT_MS);

        cachedServerConfig = {
            flushMs,
            flushBytes,
            flushCount,
            defaultServerTimeoutMs,
            minServerTimeoutMs: Math.min(minServerTimeoutMs, maxServerTimeoutMs),
            maxServerTimeoutMs: Math.max(maxServerTimeoutMs, minServerTimeoutMs),
        };
    }

    return cachedServerConfig;
}

export async function getRequestBundlingClientRuntimeConfig(db: DBClient): Promise<RequestBundlingClientRuntimeConfig> {
    if (!cachedClientConfig) {
        cachedClientConfig = {
            maxAgeMs: await readConfigNumber(db, config.cfgClientMaxAgeMs, FALLBACK_CLIENT_MAX_AGE_MS),
            maxBytes: await readConfigNumber(db, config.cfgClientMaxBytes, FALLBACK_CLIENT_MAX_BYTES),
            maxRequests: await readConfigNumber(db, config.cfgClientMaxRequests, FALLBACK_CLIENT_MAX_REQUESTS),
            defaultExpectedProcessingMs: await readConfigNumber(db, config.cfgClientDefaultExpectedProcessingMs, FALLBACK_CLIENT_DEFAULT_EXPECTED_PROCESSING_MS),
            defaultTimeoutMs: await readConfigNumber(db, config.cfgClientDefaultTimeoutMs, FALLBACK_CLIENT_DEFAULT_TIMEOUT_MS),
        };
    }

    return cachedClientConfig;
}

