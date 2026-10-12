export const boulderRules = {
    radius: 0.85,
    speed: 5.4,
    pushSeconds: 0.32,
    accelerateSeconds: 0.25,
    brakeSeconds: 0.22,
    start: { x: -4, z: -2 },
    ends: { south: { x: -4, z: 5.2 }, east: { x: 1, z: -2 } },
};
/** 이동 경로와 재시도만 소유한다. 파괴·보상은 방문 상태가 처리한다. */
export class RollingBoulder {
    route;
    position;
    phase = 'ready';
    direction = null;
    distance = 0;
    pushElapsed = 0;
    rollElapsed = 0;
    constructor(route = boulderRules) {
        this.route = route;
        this.position = { ...route.start };
    }
    get snapshot() {
        return {
            ...this.position,
            phase: this.phase,
            direction: this.direction,
            pushProgress: this.phase === 'pushing'
                ? this.pushElapsed / boulderRules.pushSeconds
                : null,
            rollProgress: this.direction
                ? this.distance /
                    Math.hypot(this.route.ends[this.direction].x - this.route.start.x, this.route.ends[this.direction].z - this.route.start.z)
                : 0,
            rotation: this.distance / boulderRules.radius,
        };
    }
    directionFrom(player) {
        if (this.phase !== 'ready')
            return null;
        const x = player.x - this.position.x;
        const z = player.z - this.position.z;
        if (Math.hypot(x, z) > 2)
            return null;
        if (z < -0.9 && Math.abs(x) < 0.85)
            return 'south';
        if (x < -0.9 && Math.abs(z) < 0.85)
            return 'east';
        return null;
    }
    push(player) {
        const direction = this.directionFrom(player);
        if (!direction)
            return false;
        this.direction = direction;
        this.phase = 'pushing';
        return true;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0 || !this.direction)
            return null;
        let remainingDelta = delta;
        if (this.phase === 'pushing') {
            const used = Math.min(remainingDelta, boulderRules.pushSeconds - this.pushElapsed);
            this.pushElapsed += used;
            remainingDelta -= used;
            if (this.pushElapsed < boulderRules.pushSeconds)
                return null;
            this.phase = 'rolling';
        }
        if (this.phase !== 'rolling' || remainingDelta <= 0)
            return null;
        const from = { ...this.position };
        const end = this.route.ends[this.direction];
        const total = Math.hypot(end.x - this.route.start.x, end.z - this.route.start.z);
        const { speed, accelerateSeconds, brakeSeconds } = boulderRules;
        const duration = total / speed + (accelerateSeconds + brakeSeconds) / 2;
        this.rollElapsed = Math.min(duration, this.rollElapsed + remainingDelta);
        const time = this.rollElapsed;
        // 가속·감속 거리를 시간에서 직접 구해 프레임 수에 따라 경로가 달라지지 않는다.
        this.distance =
            time < accelerateSeconds
                ? (speed * time * time) / (2 * accelerateSeconds)
                : time > duration - brakeSeconds
                    ? total - (speed * (duration - time) ** 2) / (2 * brakeSeconds)
                    : speed * (time - accelerateSeconds / 2);
        const ratio = this.distance / total;
        this.position = {
            x: this.route.start.x + (end.x - this.route.start.x) * ratio,
            z: this.route.start.z + (end.z - this.route.start.z) * ratio,
        };
        if (time >= duration) {
            this.position = { ...end };
            this.distance = total;
            this.phase = 'stopped';
        }
        return { from, to: { ...this.position } };
    }
    returnToStart() {
        if (this.phase !== 'stopped')
            return false;
        this.position = { ...this.route.start };
        this.phase = 'ready';
        this.direction = null;
        this.distance = 0;
        this.pushElapsed = 0;
        this.rollElapsed = 0;
        return true;
    }
}
export function segmentDistance(point, segment) {
    const x = segment.to.x - segment.from.x;
    const z = segment.to.z - segment.from.z;
    const lengthSquared = x * x + z * z;
    const t = lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((point.x - segment.from.x) * x + (point.z - segment.from.z) * z) /
            lengthSquared));
    return Math.hypot(point.x - segment.from.x - x * t, point.z - segment.from.z - z * t);
}
