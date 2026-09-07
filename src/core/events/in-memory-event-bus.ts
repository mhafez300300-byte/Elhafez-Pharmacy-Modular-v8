import type { EventBusContract } from '../../contracts/module-contracts';

export class InMemoryEventBus implements EventBusContract {
  private readonly handlers = new Map<string, Array<(event:any)=>Promise<void>|void>>();
  subscribe(type: string, handler: (event:any)=>Promise<void>|void): () => void {
    const list = this.handlers.get(type) || [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => this.handlers.set(type, (this.handlers.get(type)||[]).filter(x => x !== handler));
  }
  async publish(event: { type: string; tenantId?: string; payload?: any }): Promise<void> {
    for (const handler of this.handlers.get(event.type) || []) await handler(event);
  }
}
