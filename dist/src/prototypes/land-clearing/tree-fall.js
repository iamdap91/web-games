import { treeShape } from '../../resources/environment/tree-shape.js';
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
        return fallenCrownHits({
            point,
            radius,
            origin: this.origin,
            direction: this.direction,
            scale: this.scale,
        });
    }
    get aim() {
        return this.direction;
    }
    get finished() {
        return this.age >= treeFallDuration;
    }
}
/** 쓰러진 수관의 옆모습을 일반 나무와 거목의 연쇄 판정이 함께 쓴다. */
export function fallenCrownHits({ point, radius, origin, direction, scale, }) {
    const dx = point.x - origin.x;
    const dz = point.z - origin.z;
    // 회전 후 수관의 옆모습은 공용 수관 단면과 같다. 원뿔 판정을 남기지 않는다.
    const local = {
        x: dx * direction.x + dz * direction.z,
        z: dx * direction.z - dz * direction.x,
    };
    return treeShape.crowns.some(({ y, radius: crownRadius }) => {
        const profile = treeShape.crownProfile.map((p) => ({
            x: (y + p.y) * scale,
            z: p.radius * crownRadius * scale,
        }));
        const polygon = [
            ...profile,
            ...[...profile].reverse().map((p) => ({ x: p.x, z: -p.z })),
        ];
        let inside = false;
        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i], b = polygon[(i + 1) % polygon.length];
            if (a.x === b.x && a.z === b.z)
                continue;
            if (distanceToSegment(local, a, b) <= radius)
                return true;
            if (a.z > local.z !== b.z > local.z &&
                local.x < a.x + ((local.z - a.z) * (b.x - a.x)) / (b.z - a.z))
                inside = !inside;
        }
        return inside;
    });
}
