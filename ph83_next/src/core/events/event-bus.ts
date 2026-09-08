export interface DomainEvent<T = unknown> {
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: T;
}

type Handler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

export class EventBus {
  private readonly handlers = new Map<string, Handler[]>();
  subscribe(name: string, handler: Handler): void {
    const list = this.handlers.get(name) ?? [];
    list.push(handler);
    this.handlers.set(name, list);
  }
  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers.get(event.name) ?? []) await handler(event);
  }
}
