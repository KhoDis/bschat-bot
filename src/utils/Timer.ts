type TimerCallback = () => void;

class Timer {
  private duration: number; // Initial duration in milliseconds
  private remainingTime: number; // Remaining time in milliseconds
  private callback: TimerCallback; // Callback function
  private startTime: number | null = null; // Start time of the timer
  private timerId: NodeJS.Timeout | null = null; // Timer ID

  constructor(callback: TimerCallback, duration: number) {
    this.duration = duration;
    this.remainingTime = duration;
    this.callback = callback;
  }

  // Starts the timer
  start(): void {
    if (this.timerId) {
      throw new Error("Timer is already running.");
    }

    this.startTime = Date.now();
    this.timerId = setTimeout(() => {
      this.callback();
      this.clear(); // Reset the timer after the callback
    }, this.remainingTime);
  }

  // Adds time to the timer if it's still running
  addTime(milliseconds: number): boolean {
    if (!this.timerId || this.startTime === null) {
      return false; // Timer is not running
    }

    // Calculate elapsed time
    const elapsedTime = Date.now() - this.startTime;

    // Update remaining time
    this.remainingTime = Math.max(
      0,
      this.remainingTime - elapsedTime + milliseconds
    );

    // Clear the current timer and restart with updated remaining time
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.callback();
      this.clear(); // Reset the timer after the callback
    }, this.remainingTime);

    this.startTime = Date.now(); // Reset start time
    return true;
  }

  // Returns the remaining time in milliseconds
  getRemainingTime(): number {
    if (this.startTime === null) {
      return this.remainingTime; // Timer hasn't started
    }

    const elapsedTime = Date.now() - this.startTime;
    return Math.max(0, this.remainingTime - elapsedTime);
  }

  // Clears the timer and resets state
  clear(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.startTime = null;
    this.remainingTime = this.duration;
  }
}

export default Timer;
