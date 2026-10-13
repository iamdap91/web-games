export const frameSize = 96;
export const frameCount = 12;
export const directionCount = 4;
export const motionNames = ['idle', 'walk', 'attack'];
export const durations = {
    idle: 2,
    walk: 1,
    attack: 1.2,
};
const pulse = (phase, center, width) => Math.max(0, 1 - Math.abs(phase - center) / width);
/** 순환 자세는 베이크와 3D 미리보기가 동일한 시간 기준을 사용한다. */
export function calculatePose(motion, phase) {
    const cycle = ((phase % 1) + 1) % 1;
    const wave = Math.sin(cycle * Math.PI * 2);
    if (motion === 'walk') {
        return {
            height: Math.abs(wave) * 0.075,
            lean: 0.08,
            twist: wave * 0.07,
            leftArm: -wave * 0.65,
            rightArm: wave * 0.65,
            elbow: 0.12,
            leftLeg: wave * 0.55,
            rightLeg: -wave * 0.55,
            head: -wave * 0.04,
        };
    }
    if (motion === 'attack') {
        const windup = pulse(cycle, 0.25, 0.25);
        const strike = pulse(cycle, 0.5, 0.13);
        const follow = pulse(cycle, 0.64, 0.22);
        return {
            height: -windup * 0.07 + strike * 0.06,
            lean: -windup * 0.15 + strike * 0.3,
            twist: -windup * 0.5 + strike * 0.5 + follow * 0.1,
            leftArm: -0.35 - windup * 0.35,
            rightArm: windup * 0.6 - strike * 1.65 - follow * 0.8,
            elbow: windup * 1.1 + follow * 0.2,
            leftLeg: strike * 0.15,
            rightLeg: -windup * 0.15 - strike * 0.15,
            head: windup * 0.12 - strike * 0.12,
        };
    }
    return {
        height: wave * 0.025,
        lean: 0,
        twist: wave * 0.025,
        leftArm: -0.1 + wave * 0.025,
        rightArm: -0.1 - wave * 0.025,
        elbow: 0.08,
        leftLeg: 0,
        rightLeg: 0,
        head: wave * 0.04,
    };
}
export function frameRegion(motion, direction, frame) {
    const row = motionNames.indexOf(motion) * directionCount + direction;
    return {
        x: frame * frameSize,
        y: row * frameSize,
        width: frameSize,
        height: frameSize,
    };
}
export class MotionPlayback {
    motion = 'walk';
    phase = 0;
    speed = 1;
    paused = false;
    select(motion) {
        this.motion = motion;
        this.phase = 0;
    }
    setSpeed(speed) {
        if (Number.isFinite(speed))
            this.speed = Math.max(0.25, Math.min(2, speed));
    }
    togglePaused() {
        this.paused = !this.paused;
    }
    seek(frame) {
        this.phase =
            Math.max(0, Math.min(frameCount - 1, Math.floor(frame))) / frameCount;
        this.paused = true;
    }
    advance(seconds) {
        if (this.paused || !Number.isFinite(seconds) || seconds < 0)
            return;
        this.phase =
            (this.phase + (seconds * this.speed) / durations[this.motion]) % 1;
    }
    get state() {
        return {
            motion: this.motion,
            phase: this.phase,
            frame: Math.floor(this.phase * frameCount),
            paused: this.paused,
        };
    }
}
