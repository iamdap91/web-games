import { treeShape } from '../../rendering/tree-shape.js';
export const treeFallDuration = 1.05;
export const treeFallContactTime = 0.9;
export function treeFallAngle(age) {
    return (Math.pow(Math.min(1, age / treeFallDuration), 1.7) * Math.PI) / 2;
}
function distanceToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}
/** 쓰러짐의 시간과 수관이 덮는 범위를 소유하며 한 번만 충돌을 알린다. */
export class TreeFall {
    origin;
    scale;
    age = 0;
    landed = false;
    direction;
    constructor(origin, direction, scale) {
        this.origin = origin;
        this.scale = scale;
        const length = Math.hypot(direction.x, direction.z);
        this.direction = { x: direction.x / length, z: direction.z / length };
    }
    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0)
            return false;
        this.age += dt;
        if (this.landed || this.age < treeFallContactTime)
            return false;
        this.landed = true;
        return true;
    }
    hits(point, radius) {
        const dx = point.x - this.origin.x;
        const dz = point.z - this.origin.z;
        // 쓰러진 수관을 옆에서 본 삼각형과 잡목의 충돌 원이 겹치는지 확인한다.
        const local = {
            x: dx * this.direction.x + dz * this.direction.z,
            z: Math.abs(dx * this.direction.z - dz * this.direction.x),
        };
        return treeShape.crowns.some(({ y, radius: crownRadius }) => {
            const base = (y - treeShape.crownHeight / 2) * this.scale;
            const tip = (y + treeShape.crownHeight / 2) * this.scale;
            const width = crownRadius * this.scale;
            if (local.x >= base &&
                local.x <= tip &&
                local.z <= (width * (tip - local.x)) / (tip - base))
                return true;
            const lower = { x: base, z: -width };
            const upper = { x: base, z: width };
            const end = { x: tip, z: 0 };
            return (Math.min(distanceToSegment(local, lower, upper), distanceToSegment(local, upper, end), distanceToSegment(local, end, lower)) <= radius);
        });
    }
    get aim() {
        return this.direction;
    }
    get finished() {
        return this.age >= treeFallDuration;
    }
}
