import { injectable } from 'inversify';

type TimerId = NodeJS.Timeout;

@injectable()
export class SchedulerService {
  private timers: Map<string, TimerId> = new Map();

  start(): void {
    // no-op for in-memory scheduler
  }

  stop(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  scheduleOnce(key: string, dueAt: Date, handler: () => Promise<void> | void) {
    const delay = Math.max(0, dueAt.getTime() - Date.now());
    this.clear(key);
    const id = setTimeout(async () => {
      this.timers.delete(key);
      try {
        await handler();
      } catch (e) {
        console.error('Scheduled handler error', e);
      }
    }, delay);
    this.timers.set(key, id);
  }

  clear(key: string) {
    const id = this.timers.get(key);
    if (id) {
      clearTimeout(id);
      this.timers.delete(key);
    }
  }
}
