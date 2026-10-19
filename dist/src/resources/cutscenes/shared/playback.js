export const sceneWidth = 960;
export const sceneHeight = 540;
export function unit(value) {
    return Math.max(0, Math.min(1, value));
}
export function ease(value) {
    const p = unit(value);
    return 1 - (1 - p) ** 3;
}
/** 재생·탐색·속도와 장면의 시간을 소유하며 DOM이나 렌더러를 참조하지 않는다. */
export class CutscenePlayer {
    cuts;
    constructor(cuts) {
        this.cuts = cuts;
    }
    get durationMs() {
        return this.cuts[this.cuts.length - 1].endMs;
    }
    elapsedMs = 0;
    playing = false;
    speed = 1;
    play() {
        if (this.elapsedMs >= this.durationMs)
            this.elapsedMs = 0;
        this.playing = true;
    }
    pause() {
        this.playing = false;
    }
    restart() {
        this.elapsedMs = 0;
        this.playing = true;
    }
    seek(timeMs) {
        this.elapsedMs = Math.max(0, Math.min(this.durationMs, timeMs));
        if (this.elapsedMs >= this.durationMs)
            this.pause();
    }
    setSpeed(speed) {
        if (Number.isFinite(speed) && speed > 0)
            this.speed = speed;
    }
    advance(deltaMs) {
        if (!this.playing)
            return;
        this.seek(this.elapsedMs + Math.max(0, deltaMs) * this.speed);
    }
    snapshot() {
        const cut = this.cuts.find((item) => this.elapsedMs < item.endMs) ??
            this.cuts[this.cuts.length - 1];
        const localMs = this.elapsedMs - cut.startMs;
        return {
            elapsedMs: this.elapsedMs,
            playing: this.playing,
            ended: this.elapsedMs === this.durationMs,
            cut,
            localMs,
            progress: unit(localMs / (cut.endMs - cut.startMs)),
        };
    }
}
