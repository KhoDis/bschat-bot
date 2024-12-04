type TimerCallback = () => void;

class TimerService {
  private timers: Map<number, Timer> = new Map<number, Timer>();
  constructor() {}

  public createTimer(
    callback: TimerCallback,
    duration: number,
    messageId: number
  ): Timer {
    return new TimerInterval(callback, duration);
  }
}
