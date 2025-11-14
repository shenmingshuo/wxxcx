/**
 * 简单的事件发射器
 */
export class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.events.get(event);
    if (!handlers) return;
    
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (!handlers) return;
    
    handlers.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  once(event: string, handler: Function): void {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  clear(): void {
    this.events.clear();
  }
}

