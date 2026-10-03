export const rewindTiming = {
    trigger: 1500,
    history: 1.6,
    speed: 2.5,
    forward: 2.8,
    warning: 0.35,
};
export class MotionRewind {
    samples = [];
    clock = 0;
    cursor = 0;
    forwardElapsed = 0;
    active = false;
    rewinding = false;
    cycles = 0;
    record(seconds, capture) {
        if (this.rewinding)
            return;
        this.clock += seconds;
        this.samples.push({ time: this.clock, capture });
        // 보관 구간 바로 앞의 한 점도 남겨 시작점까지 부드럽게 보간한다.
        while (this.samples.length > 2 &&
            this.samples[1].time < this.clock - rewindTiming.history)
            this.samples.shift();
        if (this.active)
            this.forwardElapsed += seconds;
        else if (capture.player.x >= rewindTiming.trigger)
            this.active = true;
        else
            return;
        if (this.cycles === 0 || this.forwardElapsed >= rewindTiming.forward) {
            this.cursor = this.clock;
            this.rewinding = true;
            this.cycles++;
        }
    }
    playBackward(seconds) {
        const start = this.samples[0];
        this.cursor = Math.max(start.time, this.cursor - seconds * rewindTiming.speed);
        const capture = this.at(this.cursor);
        if (this.cursor <= start.time) {
            this.rewinding = false;
            this.forwardElapsed = 0;
            // 되감기 화면 자체를 다시 녹화하지 않고 새 조작 구간만 다음 테이프에 담는다.
            this.samples = [{ time: this.clock, capture }];
        }
        return capture;
    }
    at(time) {
        let index = this.samples.length - 1;
        while (index > 0 && this.samples[index].time > time + 1e-9)
            index--;
        const before = this.samples[index];
        const after = this.samples[index + 1];
        // 부동소수점 오차로 모션 전환 직전 프레임을 고르지 않도록 경계를 맞춘다.
        if (!after || Math.abs(before.time - time) < 1e-9)
            return before.capture;
        const blend = Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
        const from = before.capture;
        const to = after.capture;
        const mix = (a, b) => a + (b - a) * blend;
        return {
            ...from,
            velocityY: mix(from.velocityY, to.velocityY),
            player: {
                ...from.player,
                x: mix(from.player.x, to.player.x),
                y: mix(from.player.y, to.player.y),
                motionElapsed: from.player.motion === to.player.motion
                    ? mix(from.player.motionElapsed, to.player.motionElapsed)
                    : from.player.motionElapsed,
                flashRemaining: from.player.flashRemaining > 0 && to.player.flashRemaining > 0
                    ? mix(from.player.flashRemaining, to.player.flashRemaining)
                    : from.player.flashRemaining,
            },
        };
    }
    get snapshot() {
        const warning = this.active && !this.rewinding
            ? Math.max(0, (this.forwardElapsed -
                rewindTiming.forward +
                rewindTiming.warning) /
                rewindTiming.warning)
            : 0;
        return {
            active: this.active,
            rewinding: this.rewinding,
            cycles: this.cycles,
            remaining: this.rewinding
                ? (this.cursor - this.samples[0].time) / rewindTiming.speed
                : 0,
            warning,
            echoes: this.rewinding
                ? [0.06, 0.13, 0.21].map((offset) => this.at(this.cursor + offset).player)
                : warning > 0
                    ? [0.06, 0.13].map((offset) => this.at(this.clock - offset * (1 - warning)).player)
                    : [],
        };
    }
}
