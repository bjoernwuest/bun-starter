import { buildServerSentEventsStreamUrl } from "@/ui/api/index.ts";
import { getActiveServerTopics, publishSync } from "./pubsub.ts";

let eventSource: EventSource | null = null;
let unloadListenerRegistered = false;

function parseEnvelope(raw: string): { topic: string; data: unknown } | null {
    try {
        const parsed = JSON.parse(raw) as { topic?: unknown; data?: unknown };
        if (typeof parsed.topic !== "string") return null;
        return { topic: parsed.topic, data: parsed.data };
    } catch {
        return null;
    }
}

function handlePubSubEvent(event: MessageEvent<string>): void {
    const envelope = parseEnvelope(event.data);
    if (!envelope) return;
    publishSync(envelope.topic, envelope.data);
}

export function startServerSentEventsBridge(): EventSource {
    if (eventSource) return eventSource;

    // Pass the current local topic set as a pre-seed hint.
    // The server derives the session key from the cookie, so no clientId is needed.
    const url = buildServerSentEventsStreamUrl(getActiveServerTopics());
    eventSource = new EventSource(url);

    eventSource.addEventListener("pubsub", handlePubSubEvent as EventListener);
    eventSource.addEventListener("connected", () => undefined);
    eventSource.addEventListener("keepalive", () => undefined);

    if (!unloadListenerRegistered && typeof window !== "undefined") {
        unloadListenerRegistered = true;
        window.addEventListener("beforeunload", () => {
            stopServerSentEventsBridge();
        });
    }

    return eventSource;
}

export function stopServerSentEventsBridge(): void {
    if (!eventSource) return;
    eventSource.close();
    eventSource = null;
}
