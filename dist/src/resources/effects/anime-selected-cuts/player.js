/** 재생 시각·배속·선택한 컷 길이만 소유한다. */
export class CutPlayer {
    time = 0;
    duration = 3.3;
    playing = false;
    rate = 1;
    get snapshot() {
        return { time: this.time, duration: this.duration, playing: this.playing };
    }
    select(duration) {
        this.duration = duration;
        this.time = 0;
        this.playing = false;
    }
    toggle() {
        if (this.time >= this.duration)
            this.time = 0;
        this.playing = !this.playing;
    }
    restart() {
        this.time = 0;
        this.playing = true;
    }
    pause() {
        this.playing = false;
    }
    seek(time) {
        if (Number.isFinite(time))
            this.time = Math.max(0, Math.min(this.duration, time));
        this.playing = false;
    }
    speed(rate) {
        if (Number.isFinite(rate) && rate > 0)
            this.rate = rate;
    }
    advance(delta) {
        if (!this.playing)
            return false;
        this.time = Math.min(this.duration, this.time + Math.max(0, delta) * this.rate);
        if (this.time < this.duration)
            return false;
        this.playing = false;
        return true;
    }
}
