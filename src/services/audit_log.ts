import PubSub from "@/services/pubsub.ts";
import { getDatabaseConnection } from "@/services/database.ts";
import { insertAuditEntries, type NewAuditEntryType } from "@/repo/AuditRepo.ts";
import { devMode } from "@/devmode.ts";
import { ConfigValueTypes, type ConfigEntryType } from "@/types/ConfigEntry.ts";
import { getConfigEntriesByKey, upsertConfigEntry } from "@/repo/ConfigRepo.ts";

const configDomain = "audit_log";

// ── ConfigEntry declarations ────────────────────────────────────────────────────
export const config = {
    cfgFlushIntervalMs: {
        domain: configDomain,
        key: "FlushIntervalMs",
        description: "Maximum age of a batched audit-log entry before it is written to the database (milliseconds).",
        type: ConfigValueTypes.number,
        value: 60000,
        inputFormat: "^[1-9][0-9]*$",
        outputFormat: "",
        editInUI: true,
        mandatoryForStart: false,
    } satisfies ConfigEntryType,
    cfgFlushMaxBatchSize: {
        domain: configDomain,
        key: "FlushMaxBatchSize",
        description: "Maximum number of buffered audit-log entries before an immediate flush is triggered.",
        type: ConfigValueTypes.number,
        value: 500,
        inputFormat: "^[1-9][0-9]*$",
        outputFormat: "",
        editInUI: true,
        mandatoryForStart: false,
    } satisfies ConfigEntryType,
} satisfies Record<string, ConfigEntryType>;

/**
 * Topic prefixes the audit log subscriber listens for.
 * Events published with topics starting with any of these prefixes will be logged.
 */
const AUDIT_TOPIC_PREFIXES = ["grant", "revoke", "create", "update", "disable", "delete"];

let batch: NewAuditEntryType[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Reads the two runtime parameters from the database (with fallbacks).
 * Called once at startup and whenever the flush timer is re-armed.
 */
async function readRuntimeConfig(): Promise<{ flushIntervalMs: number; flushMaxBatchSize: number }> {
    const db = getDatabaseConnection();
    const [intervalRow] = await getConfigEntriesByKey(db, config.cfgFlushIntervalMs.domain, config.cfgFlushIntervalMs.key, { limit: 1 });
    const [batchSizeRow] = await getConfigEntriesByKey(db, config.cfgFlushMaxBatchSize.domain, config.cfgFlushMaxBatchSize.key, { limit: 1 });

    const toPositiveInt = (value: unknown, fallback: number): number => {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
    };

    return {
        flushIntervalMs: toPositiveInt(intervalRow?.value, 60000),
        flushMaxBatchSize: toPositiveInt(batchSizeRow?.value, 500),
    };
}

async function flushBatch(): Promise<void> {
    if (batch.length === 0) return;

    const toFlush = batch;
    batch = [];
    try {
        const db = getDatabaseConnection();
        await insertAuditEntries(db, toFlush);
        if (devMode) console.log(`[audit-log] Flushed ${toFlush.length} entries to database`);
    } catch (err) {
        console.error("[audit-log] Failed to flush audit entries:", err);
        // Re-queue on failure (prepend to preserve order as best we can)
        batch = [...toFlush, ...batch];
    }
}

let currentMaxBatchSize = 500;

/**
 * Handles a PubSub event. Logs it if the topic matches one of the tracked prefixes.
 * Also triggers an immediate flush when the batch exceeds the configured max size.
 */
function onPubSubEvent(topic: string, data: any): void {
    if (typeof topic !== "string") return;

    const matches = AUDIT_TOPIC_PREFIXES.some((prefix) =>
        topic.startsWith(prefix) && (topic.length === prefix.length || topic[prefix.length] === "."),
    );

    if (!matches) return;

    batch.push({
        topic,
        payload: data ?? {},
    });

    // Flush immediately if the batch exceeds the configured threshold
    if (batch.length >= currentMaxBatchSize) {
        void flushBatch();
    }
}

let subscriberToken: string | false = false;

/**
 * Starts the audit log subscriber and the periodic flush timer.
 */
export async function startAuditLog(): Promise<void> {
    if (subscriberToken) return; // Already started

    // Ensure the config rows exist (seed with defaults on first run)
    const db = getDatabaseConnection();
    for (const entry of Object.values(config)) {
        const existing = await getConfigEntriesByKey(db, entry.domain, entry.key, { limit: 1 });
        if (existing.length < 1) {
            await upsertConfigEntry(db, entry);
        }
    }

    const { flushIntervalMs, flushMaxBatchSize } = await readRuntimeConfig();
    currentMaxBatchSize = flushMaxBatchSize;

    subscriberToken = PubSub.subscribeAll(onPubSubEvent);
    flushTimer = setInterval(flushBatch, flushIntervalMs);

    if (devMode) console.log("[audit-log] Subscriber started (prefixes:", AUDIT_TOPIC_PREFIXES.join(", "), ", interval:", flushIntervalMs, "ms, maxBatch:", flushMaxBatchSize, ")");
}

/**
 * Stops the audit log subscriber and flushes any remaining entries.
 */
export async function stopAuditLog(): Promise<void> {
    if (subscriberToken) {
        PubSub.unsubscribe(subscriberToken);
        subscriberToken = false;
    }
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flushBatch();
    if (devMode) console.log("[audit-log] Subscriber stopped, final flush complete");
}
