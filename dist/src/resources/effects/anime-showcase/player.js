/** 재생 시각과 선택한 견본의 길이를 소유하며 배속1은 완성 시간표의 실시간이다. */
export class ShowcasePlayer {
    time = 0;
    duration = 4200;
    running = true;
    rate = 1;
    get snapshot() {
        return {
            timeMs: this.time,
            durationMs: this.duration,
            playing: this.running,
        };
    }
    toggle() {
        this.running = !this.running;
        if (this.running && this.time >= this.duration)
            this.time = 0;
    }
    play() {
        if (this.time >= this.duration)
            this.time = 0;
        this.running = true;
    }
    pause() {
        this.running = false;
    }
    restart() {
        this.time = 0;
        this.running = true;
    }
    select(durationMs) {
        this.duration = durationMs;
        this.time = 0;
    }
    seek(timeMs) {
        if (Number.isFinite(timeMs))
            this.time = Math.max(0, Math.min(this.duration, timeMs));
        this.running = false;
    }
    speed(rate) {
        if (Number.isFinite(rate) && rate > 0)
            this.rate = rate;
    }
    advance(deltaMs) {
        if (!this.running)
            return false;
        this.time = Math.min(this.duration, this.time + Math.max(0, deltaMs) * this.rate);
        if (this.time < this.duration)
            return false;
        this.running = false;
        return true;
    }
}
