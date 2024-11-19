class Timer {
  private timeoutId: NodeJS.Timeout | null = null;
  private remainingTime: number;
  private startTime: number | null = null;
  private callback: () => void;
  private isExecuted: boolean = false;

  constructor(callback: () => void, delay: number) {
    this.callback = callback;
    this.remainingTime = delay;

    // Start the timer immediately
    this.startTimer();
  }

  private startTimer() {
    this.startTime = Date.now();
    this.timeoutId = setTimeout(() => {
      this.isExecuted = true;
      this.callback();
    }, this.remainingTime);
  }

  public addTime(extraTime: number): boolean {
    if (this.isExecuted) {
      return false;
    }

    // Clear the current timeout and calculate new remaining time
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      const elapsedTime = Date.now() - (this.startTime || 0);
      this.remainingTime -= elapsedTime;
    }

    this.remainingTime += extraTime;

    // Restart the timer with the updated time
    this.startTimer();
    return true;
  }

  public clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export default Timer;
