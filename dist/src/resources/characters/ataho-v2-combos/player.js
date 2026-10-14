export const repeatGapMs = 700;
export function comboDuration(motion) {
    return motion.steps.reduce((sum, step) => sum + step.durationMs, 0);
}
/** 동작 선택·시간·정지를 소유하며 그리기와 입력에 의존하지 않는다. */
export class ComboPlayer {
    motion;
    elapsedMs = 0;
    paused = false;
    speed = 1;
    repeating = true;
    constructor(motion) {
        this.motion = motion;
    }
    play(motion = this.motion) {
        this.motion = motion;
        this.elapsedMs = 0;
        this.paused = false;
    }
    setPaused(paused) {
        this.paused = paused;
    }
    setSpeed(speed) {
        if (Number.isFinite(speed) && speed > 0)
            this.speed = speed;
    }
    setRepeating(repeating) {
        this.repeating = repeating;
        this.elapsedMs = Math.min(this.elapsedMs, comboDuration(this.motion));
    }
    seek(elapsedMs) {
        if (!Number.isFinite(elapsedMs))
            return;
        this.elapsedMs = Math.max(0, Math.min(elapsedMs, comboDuration(this.motion)));
        this.paused = true;
    }
    showStep(index) {
        const clamped = Math.max(0, Math.min(index, this.motion.steps.length - 1));
        this.seek(this.motion.steps
            .slice(0, clamped)
            .reduce((sum, step) => sum + step.durationMs, 0));
    }
    update(deltaMs) {
        if (this.paused || !Number.isFinite(deltaMs) || deltaMs <= 0)
            return;
        const duration = comboDuration(this.motion);
        const elapsed = this.elapsedMs + deltaMs * this.speed;
        this.elapsedMs = this.repeating
            ? elapsed % (duration + repeatGapMs)
            : Math.min(elapsed, duration);
    }
    get snapshot() {
        const durationMs = comboDuration(this.motion);
        let remaining = Math.min(this.elapsedMs, durationMs);
        let stepIndex = this.motion.steps.length - 1;
        for (const [index, step] of this.motion.steps.entries()) {
            if (remaining < step.durationMs || index === stepIndex) {
                stepIndex = index;
                break;
            }
            remaining -= step.durationMs;
        }
        const step = this.motion.steps[stepIndex];
        const next = this.motion.steps[stepIndex + 1] ?? step;
        const blend = Math.min(1, remaining / step.durationMs);
        const waiting = this.elapsedMs >= durationMs;
        return {
            motion: this.motion,
            step,
            stepIndex,
            stepElapsedMs: remaining,
            elapsedMs: Math.min(this.elapsedMs, durationMs),
            durationMs,
            x: step.x + (next.x - step.x) * blend,
            y: (step.y ?? 0) + ((next.y ?? 0) - (step.y ?? 0)) * blend,
            paused: this.paused,
            waiting,
            opacity: waiting && this.repeating && !this.paused
                ? Math.max(0, 1 - (this.elapsedMs - durationMs - 400) / 300)
                : 1,
        };
    }
}
