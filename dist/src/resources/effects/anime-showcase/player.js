import { durationMs } from './types.js';
/** 재생 시각과 끝 도달만 소유하며 화면과 분류 선택은 관여하지 않는다. */
export class ShowcasePlayer {
    time = 0;
    running = true;
    rate = 1;
    get snapshot() {
        return { timeMs: this.time, playing: this.running };
    }
    toggle() {
        this.running = !this.running;
        if (this.running && this.time >= durationMs)
            this.time = 0;
    }
    play() {
        if (this.time >= durationMs)
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
    select() {
        this.time = 0;
    }
    seek(timeMs) {
        if (Number.isFinite(timeMs))
            this.time = Math.max(0, Math.min(durationMs, timeMs));
        this.running = false;
    }
    speed(rate) {
        if (Number.isFinite(rate) && rate > 0)
            this.rate = rate;
    }
    advance(deltaMs) {
        if (!this.running)
            return false;
        this.time = Math.min(durationMs, this.time + Math.max(0, deltaMs) * this.rate);
        if (this.time < durationMs)
            return false;
        this.running = false;
        return true;
    }
}
