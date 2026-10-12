/** 재생 시간과 수동 자세 선택을 화면에서 독립해 소유한다. */
export class PixellabPlayback {
    frameCount;
    frameDuration;
    time = 0;
    paused = false;
    speed = 1;
    constructor(frameCount, frameDuration) {
        this.frameCount = frameCount;
        this.frameDuration = frameDuration;
    }
    update(delta) {
        if (!this.paused)
            this.time =
                (this.time + delta * this.speed) %
                    (this.frameCount * this.frameDuration);
    }
    togglePause() {
        this.paused = !this.paused;
    }
    seek(index) {
        this.time =
            Math.max(0, Math.min(this.frameCount - 1, index)) * this.frameDuration;
        this.paused = true;
    }
    setSpeed(speed) {
        this.speed = speed;
    }
    get snapshot() {
        return {
            index: Math.min(this.frameCount - 1, Math.floor(this.time / this.frameDuration)),
            paused: this.paused,
        };
    }
}
