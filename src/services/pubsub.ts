/**
 * Minimal TypeScript/Bun compatible PubSubJS implementation
 * Supports hierarchical addressing, synchronous and asynchronous publishing
 * Compatible with browser and server environments
 */

type Subscriber = (message: any, data: any) => void;
type Token = string;

class PubSubImpl {
    private messages: Record<string, Record<Token, Subscriber>> = {};
    private lastUid = -1;
    private readonly ALL_SUBSCRIBING_MSG = '*';
    public immediateExceptions = false;

    /**
     * Publishes a message asynchronously, passing data to its subscribers
     */
    publish(message: any, data?: any): boolean {
        return this.doPublish(message, data, false, this.immediateExceptions);
    }

    /**
     * Publishes a message synchronously, passing data to its subscribers
     */
    publishSync(message: any, data?: any): boolean {
        return this.doPublish(message, data, true, this.immediateExceptions);
    }

    /**
     * Subscribes a function to a message topic
     * Returns a unique token for unsubscribing
     */
    subscribe(message: any, func: Subscriber): Token | false {
        if (typeof func !== 'function') {
            return false;
        }

        // Convert message to string for storage key
        const messageKey = String(message);

        // Initialize topic if not exists
        if (!this.messages[messageKey]) {
            this.messages[messageKey] = {};
        }

        // Generate unique token
        const token = `uid_${++this.lastUid}`;
        this.messages[messageKey]![token] = func;

        return token;
    }

    /**
     * Subscribes to all messages
     */
    subscribeAll(func: Subscriber): Token | false {
        return this.subscribe(this.ALL_SUBSCRIBING_MSG, func);
    }

    /**
     * Subscribes to a message once, then auto-unsubscribes
     */
    subscribeOnce(message: any, func: Subscriber): this {
        const token = this.subscribe(message, (...args) => {
            this.unsubscribe(token as Token);
            func.apply(null, args);
        });
        return this;
    }

    /**
     * Unsubscribes by token, function, or topic
     */
    unsubscribe(value: Token | Subscriber | string): boolean | void {
        const isTopic = typeof value === 'string' && (
            this.messages[value] !== undefined ||
            this.descendantTopicExists(value)
        );
        const isToken = !isTopic && typeof value === 'string';
        const isFunction = typeof value === 'function';

        if (isTopic) {
            this.clearSubscriptions(value as string);
            return;
        }

        let result = false;

        for (const m in this.messages) {
            if (!this.messages.hasOwnProperty(m)) continue;

            const message = this.messages[m]!;

            if (isToken && message[value as Token]) {
                delete message[value as Token];
                result = true;
                break; // tokens are unique
            }

            if (isFunction) {
                for (const t in message) {
                    if (message.hasOwnProperty(t) && message[t] === value) {
                        delete message[t];
                        result = true;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Clears all subscriptions
     */
    clearAllSubscriptions(): void {
        this.messages = {};
    }

    /**
     * Clears subscriptions for a specific topic (including descendants)
     */
    clearSubscriptions(topic: string): void {
        for (const m in this.messages) {
            if (this.messages.hasOwnProperty(m) && m.indexOf(topic) === 0) {
                delete this.messages[m];
            }
        }
    }

    /**
     * Counts subscriptions for a topic
     */
    countSubscriptions(topic: string): number {
        let count = 0;
        for (const m in this.messages) {
            if (this.messages.hasOwnProperty(m) && m.indexOf(topic) === 0) {
                for (const token in this.messages[m]) {
                    if (this.messages[m]!.hasOwnProperty(token)) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    /**
     * Gets all subscription topics matching a prefix
     */
    getSubscriptions(topic: string): string[] {
        const list: string[] = [];
        for (const m in this.messages) {
            if (this.messages.hasOwnProperty(m) && m.indexOf(topic) === 0) {
                list.push(m);
            }
        }
        return list;
    }

    // Private helper methods

    private doPublish(message: any, data: any, sync: boolean, immediateExceptions: boolean): boolean {
        const messageStr = String(message);
        const deliver = this.createDeliveryFunction(messageStr, data, immediateExceptions);
        const hasSubscribers = this.messageHasSubscribers(messageStr);

        if (!hasSubscribers) {
            return false;
        }

        if (sync) {
            deliver();
        } else {
            setTimeout(deliver, 0);
        }

        return true;
    }

    private createDeliveryFunction(message: string, data: any, immediateExceptions: boolean) {
        return () => {
            let topic = message;
            let position = topic.lastIndexOf('.');

            // Deliver to exact topic
            this.deliverMessage(message, message, data, immediateExceptions);

            // Deliver to parent topics in hierarchy
            while (position !== -1) {
                topic = topic.substring(0, position);
                position = topic.lastIndexOf('.');
                this.deliverMessage(message, topic, data, immediateExceptions);
            }

            // Deliver to wildcard subscribers
            this.deliverMessage(message, this.ALL_SUBSCRIBING_MSG, data, immediateExceptions);
        };
    }

    private deliverMessage(originalMessage: string, matchedMessage: string, data: any, immediateExceptions: boolean): void {
        const subscribers = this.messages[matchedMessage];
        if (!subscribers) return;

        const callSubscriber = immediateExceptions
            ? this.callSubscriberWithImmediateExceptions
            : this.callSubscriberWithDelayedExceptions;

        for (const s in subscribers) {
            if (subscribers.hasOwnProperty(s)) {
                callSubscriber(subscribers[s]!, originalMessage, data);
            }
        }
    }

    private callSubscriberWithImmediateExceptions(subscriber: Subscriber, message: any, data: any): void {
        subscriber(message, data);
    }

    private callSubscriberWithDelayedExceptions(subscriber: Subscriber, message: any, data: any): void {
        try {
            subscriber(message, data);
        } catch (ex) {
            setTimeout(() => {
                throw ex;
            }, 0);
        }
    }

    private messageHasSubscribers(message: string): boolean {
        let topic = message;
        let found = this.hasDirectSubscribersFor(topic) || this.hasDirectSubscribersFor(this.ALL_SUBSCRIBING_MSG);
        let position = topic.lastIndexOf('.');

        while (!found && position !== -1) {
            topic = topic.substring(0, position);
            position = topic.lastIndexOf('.');
            found = this.hasDirectSubscribersFor(topic);
        }

        return found;
    }

    private hasDirectSubscribersFor(message: string): boolean {
        const subscribers = this.messages[message];
        if (!subscribers) return false;

        for (const key in subscribers) {
            if (subscribers.hasOwnProperty(key)) {
                return true;
            }
        }
        return false;
    }

    private descendantTopicExists(topic: string): boolean {
        for (const m in this.messages) {
            if (this.messages.hasOwnProperty(m) && m.indexOf(topic) === 0) {
                return true;
            }
        }
        return false;
    }
}

// Create singleton instance
const PubSub = new PubSubImpl();

// Export for both ESM and CommonJS compatibility
export default PubSub;
export { PubSub };
