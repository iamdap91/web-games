import { facingFor } from '../../resources/characters/ataho/facing.js';
const followDistance = 1.25;
const sampleDistance = 0.04;
/** 실제 보행 경로의 일정 거리 뒤를 따라간다. 입력·지도·렌더링은 소유하지 않는다. */
export class PathFollower {
    samples = [];
    travelled = 0;
    leader;
    pose;
    constructor(leader) {
        this.leader = { ...leader };
        this.pose = { ...leader, moving: false };
        this.reset(leader);
    }
    get snapshot() {
        return { ...this.pose };
    }
    reset(leader, at = leader) {
        this.leader = { ...leader };
        this.pose = { ...at, moving: false };
        this.travelled = Math.hypot(leader.x - at.x, leader.y - at.y, leader.z - at.z);
        this.samples = [
            { ...at, distance: 0 },
            { ...leader, distance: this.travelled },
        ];
    }
    follow(leader, canStand = () => true) {
        const displacement = Math.hypot(leader.x - this.leader.x, leader.y - this.leader.y, leader.z - this.leader.z);
        if (!Number.isFinite(displacement))
            return;
        if (displacement > 4) {
            // 문이나 장면 전환의 직선 지름길을 과거 경로로 만들지 않는다.
            this.reset(leader);
            return;
        }
        this.travelled += displacement;
        this.leader = { ...leader };
        const last = this.samples.at(-1);
        if (this.travelled - last.distance >= sampleDistance)
            this.samples.push({ ...leader, distance: this.travelled });
        const target = Math.max(0, this.travelled - followDistance);
        const index = this.samples.findIndex((sample) => sample.distance >= target);
        const to = index < 0
            ? { ...leader, distance: this.travelled }
            : this.samples[index];
        const from = index <= 0 ? this.samples[0] : this.samples[index - 1];
        const ratio = to.distance === from.distance
            ? 0
            : (target - from.distance) / (to.distance - from.distance);
        const point = {
            x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio,
            z: from.z + (to.z - from.z) * ratio,
        };
        const input = { x: point.x - this.pose.x, z: point.z - this.pose.z };
        const moving = Math.hypot(input.x, input.z) > 0.00001;
        const candidate = {
            ...point,
            facing: moving ? facingFor(input) : this.pose.facing,
            moving,
        };
        this.pose = canStand(candidate)
            ? candidate
            : { ...this.pose, moving: false };
        const discard = this.samples.findIndex((sample) => sample.distance >= target - 0.5);
        if (discard > 1)
            this.samples.splice(0, discard - 1);
    }
}
