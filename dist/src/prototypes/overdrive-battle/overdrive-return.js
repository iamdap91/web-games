export const driveReturnTiming = {
    hold: 0.12,
    dash: 0.3,
    duration: 0.85,
};
/** 종료 위치부터 시작 대형까지 복귀하는 시간과 마지막 공격 자세를 소유한다. */
export class OverdriveReturn {
    data;
    elapsed = 0;
    constructor(data) {
        this.data = data;
    }
    update(dt) {
        this.elapsed = Math.min(driveReturnTiming.duration, this.elapsed + dt);
    }
    get done() {
        return this.elapsed >= driveReturnTiming.duration;
    }
    get snapshot() {
        const { origin, destination } = this.data;
        const progress = Math.max(0, Math.min(1, (this.elapsed - driveReturnTiming.hold) / driveReturnTiming.dash));
        const distance = Math.hypot(destination.x - origin.x, destination.z - origin.z);
        return {
            origin,
            // 마지막 프레임은 보간 오차 없이 전투 시작 좌표에 정확히 놓는다.
            position: progress === 1
                ? { ...destination }
                : {
                    x: origin.x + (destination.x - origin.x) * progress,
                    z: origin.z + (destination.z - origin.z) * progress,
                },
            progress,
            moving: progress > 0 && progress < 1 && distance > 0.001,
            heldAction: this.elapsed < driveReturnTiming.hold ? this.data.action : null,
        };
    }
}
