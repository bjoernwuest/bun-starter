// noinspection JSUnusedGlobalSymbols
import { syncServerSentEventTopics } from "@/ui/api/index.ts";

type Subscriber = (message: string, data: unknown) => void;
type Token = string;

class ClientPubSubImpl {
    private messages: Record<string, Record<Token, Subscriber>> = {};
    private lastUid = -1;
    private readonly ALL_SUBSCRIBING_MSG = "*";
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private syncInFlight: Promise<void> | null = null;
    private syncPending = false;

    publish(message: string, data?: unknown): boolean {
        return this.doPublish(String(message), data, false);
    }

    publishSync(message: string, data?: unknown): boolean {
        return this.doPublish(String(message), data, true);
    }

    subscribe(message: string, func: Subscriber): Token | false {
        if (typeof func !== "function") return false;

        const messageKey = String(message);
        if (!this.messages[messageKey]) this.messages[messageKey] = {};

        const token = `uid_${++this.lastUid}`;
        this.messages[messageKey]![token] = func;
        this.scheduleServerTopicSync();
        return token;
    }

    subscribeAll(func: Subscriber): Token | false {
        return this.subscribe(this.ALL_SUBSCRIBING_MSG, func);
    }

    subscribeOnce(message: string, func: Subscriber): this {
        const token = this.subscribe(message, (...args) => {
            this.unsubscribe(token as Token);
            func.apply(null, args);
        });
        return this;
    }

    unsubscribe(value: Token | Subscriber | string): boolean | void {
        const isTopic = typeof value === "string" && (this.messages[value] !== undefined || this.descendantTopicExists(value));
        const isToken = !isTopic && typeof value === "string";
        const isFunction = typeof value === "function";

        if (isTopic) {
            this.clearSubscriptions(value as string);
            this.scheduleServerTopicSync();
            return;
        }

        let result = false;
        for (const m in this.messages) {
            if (!Object.prototype.hasOwnProperty.call(this.messages, m)) continue;

            const message = this.messages[m]!;

            if (isToken && message[value as Token]) {
                delete message[value as Token];
                result = true;
                break;
            }

            if (isFunction) {
                for (const t in message) {
                    if (Object.prototype.hasOwnProperty.call(message, t) && message[t] === value) {
                        delete message[t];
                        result = true;
                    }
                }
            }
        }

        if (result) this.scheduleServerTopicSync();
        return result;
    }

    clearAllSubscriptions(): void {
        this.messages = {};
        this.scheduleServerTopicSync();
    }

    clearSubscriptions(topic: string): void {
        for (const m in this.messages) {
            if (Object.prototype.hasOwnProperty.call(this.messages, m) && m.indexOf(topic) === 0) {
                delete this.messages[m];
            }
        }
    }

    countSubscriptions(topic: string): number {
        let count = 0;
        for (const m in this.messages) {
            if (!Object.prototype.hasOwnProperty.call(this.messages, m) || m.indexOf(topic) !== 0) continue;
            for (const token in this.messages[m]) {
                if (Object.prototype.hasOwnProperty.call(this.messages[m], token)) count++;
            }
        }
        return count;
    }

    getSubscriptions(topic: string): string[] {
        const list: string[] = [];
        for (const m in this.messages) {
            if (Object.prototype.hasOwnProperty.call(this.messages, m) && m.indexOf(topic) === 0) list.push(m);
        }
        return list;
    }

    getServerTopics(): string[] {
        if (this.messages[this.ALL_SUBSCRIBING_MSG] && Object.keys(this.messages[this.ALL_SUBSCRIBING_MSG]!).length > 0) {
            return [this.ALL_SUBSCRIBING_MSG];
        }

        const topics = new Set<string>();
        for (const [topic, subscribers] of Object.entries(this.messages)) {
            if (topic === this.ALL_SUBSCRIBING_MSG) continue;
            if (Object.keys(subscribers).length === 0) continue;
            topics.add(topic);
        }

        return [...topics].sort();
    }

    private doPublish(message: string, data: unknown, sync: boolean): boolean {
        const deliver = this.createDeliveryFunction(message, data);
        const hasSubscribers = this.messageHasSubscribers(message);
        if (!hasSubscribers) return false;

        if (sync) deliver();
        else setTimeout(deliver, 0);
        return true;
    }

    private createDeliveryFunction(message: string, data: unknown) {
        return () => {
            let topic = message;
            let position = topic.lastIndexOf(".");

            this.deliverMessage(message, message, data);

            while (position !== -1) {
                topic = topic.substring(0, position);
                position = topic.lastIndexOf(".");
                this.deliverMessage(message, topic, data);
            }

            this.deliverMessage(message, this.ALL_SUBSCRIBING_MSG, data);
        };
    }

    private deliverMessage(originalMessage: string, matchedMessage: string, data: unknown): void {
        const subscribers = this.messages[matchedMessage];
        if (!subscribers) return;

        for (const token in subscribers) {
            if (Object.prototype.hasOwnProperty.call(subscribers, token)) {
                try {
                    subscribers[token]!(originalMessage, data);
                } catch (error) {
                    setTimeout(() => {
                        throw error;
                    }, 0);
                }
            }
        }
    }

    private messageHasSubscribers(message: string): boolean {
        let topic = message;
        let found = this.hasDirectSubscribersFor(topic) || this.hasDirectSubscribersFor(this.ALL_SUBSCRIBING_MSG);
        let position = topic.lastIndexOf(".");

        while (!found && position !== -1) {
            topic = topic.substring(0, position);
            position = topic.lastIndexOf(".");
            found = this.hasDirectSubscribersFor(topic);
        }

        return found;
    }

    private hasDirectSubscribersFor(message: string): boolean {
        const subscribers = this.messages[message];
        if (!subscribers) return false;

        for (const key in subscribers) {
            if (Object.prototype.hasOwnProperty.call(subscribers, key)) return true;
        }
        return false;
    }

    private descendantTopicExists(topic: string): boolean {
        for (const m in this.messages) {
            if (Object.prototype.hasOwnProperty.call(this.messages, m) && m.indexOf(topic) === 0) {
                return true;
            }
        }
        return false;
    }

    private scheduleServerTopicSync(): void {
        if (this.syncTimer !== null) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.syncTimer = null;
            const topics = this.getServerTopics();
            if (this.syncInFlight) {
                this.syncPending = true;
                return;
            }

            this.syncInFlight = syncServerSentEventTopics(topics)
                .catch(() => undefined)
                .finally(() => {
                    this.syncInFlight = null;
                    if (this.syncPending) {
                        this.syncPending = false;
                        this.scheduleServerTopicSync();
                    }
                });
        }, 50);
    }
}

const ClientPubSub = new ClientPubSubImpl();

export function publish(message: string, data?: unknown): boolean {
    return ClientPubSub.publish(message, data);
}

export function publishSync(message: string, data?: unknown): boolean {
    return ClientPubSub.publishSync(message, data);
}

export function subscribe(message: string, func: Subscriber): Token | false {
    return ClientPubSub.subscribe(message, func);
}

export function subscribeAll(func: Subscriber): Token | false {
    return ClientPubSub.subscribeAll(func);
}

export function subscribeOnce(message: string, func: Subscriber): void {
    ClientPubSub.subscribeOnce(message, func);
}

export function unsubscribe(value: Token | Subscriber | string): boolean | void {
    return ClientPubSub.unsubscribe(value);
}

export function clearAllSubscriptions(): void {
    ClientPubSub.clearAllSubscriptions();
}


export function getActiveServerTopics(): string[] {
    return ClientPubSub.getServerTopics();
}



