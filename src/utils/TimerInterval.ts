import Timer from "./Timer";
import { formatTime } from "./timeUtils";

class TimerInterval {
  timer: Timer;
  interval: NodeJS.Timeout;

  constructor(
    callback: () => void,
    runAfter: number,
    update: () => void,
    updateEach: number
  ) {
    this.timer = new Timer(callback, runAfter);
    this.timer.start();
    this.interval = setInterval(update, updateEach);
  }

  clear() {
    this.timer.clear();
    clearInterval(this.interval);
  }

  getRemainingTime() {
    return this.timer.getRemainingTime() ?? 0;
  }

  getFormattedTime() {
    return formatTime(this.getRemainingTime());
  }

  addTime(time: number) {
    this.timer.addTime(time);
  }
}

export default TimerInterval;
