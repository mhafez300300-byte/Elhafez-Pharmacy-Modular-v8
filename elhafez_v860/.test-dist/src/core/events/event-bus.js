export class EventBus {
    handlers = new Map();
    subscribe(name, handler) {
        const list = this.handlers.get(name) ?? [];
        list.push(handler);
        this.handlers.set(name, list);
    }
    async publish(event) {
        for (const handler of this.handlers.get(event.name) ?? [])
            await handler(event);
    }
}
