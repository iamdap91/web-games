export const actorSize = { pixelsPerUnit: 32 };
export const village = {
    width: 28,
    depth: 24,
    radius: 0.27,
    speed: 3.6,
    spawn: { x: -5, z: 4 },
    river: { left: 2, right: 5 },
    bridge: { x: 3.5, z: 3, width: 5, depth: 3, height: 0.35 },
    terrace: { x: -6, z: -8.5, width: 12, depth: 7, height: 2.4 },
    stairs: { x: -2.5, z: -3, width: 3, depth: 4, count: 8 },
    bench: { x: -8, z: -10.9, width: 2.5, depth: 0.6 },
};
export const houses = [
    { x: -8.5, z: -1.5, width: 3.8, depth: 3, height: 2.5, roof: 0x6b7872 },
    { x: -9, z: 7, width: 3.2, depth: 2.8, height: 2.2, roof: 0xa76c4b },
    { x: 9, z: -4, width: 3.8, depth: 3.4, height: 2.6, roof: 0x64756a },
];
export const trees = [
    { x: -12, z: 1, size: 1.15 },
    { x: -12, z: 10, size: 1 },
    { x: -5, z: 10, size: 0.9 },
    { x: -11, z: -10, size: 1.1 },
    { x: -1, z: -10, size: 1.2 },
    { x: 7, z: -10, size: 1.3 },
    { x: 12, z: -8, size: 1.05 },
    { x: 12, z: 1, size: 1.1 },
    { x: 9, z: 9, size: 1.1 },
    { x: 13, z: 11, size: 0.95 },
];
export const bridgeRails = [-1, 1].map((side) => ({
    x: village.bridge.x,
    z: village.bridge.z + (side * village.bridge.depth) / 2,
    width: village.bridge.width,
    depth: 0.12,
}));
// 계단 옆 돌턱의 바닥 면적을 그리기와 충돌에서 함께 사용한다.
export const stairWalls = [-1, 1].map((side) => ({
    x: village.stairs.x + side * (village.stairs.width / 2 + 0.2),
    z: village.stairs.z,
    width: 0.3,
    depth: village.stairs.depth,
}));
const obstacles = [
    ...houses,
    ...bridgeRails,
    ...stairWalls,
    village.bench,
];
export function contains(bounds, point) {
    return (Math.abs(point.x - bounds.x) <= bounds.width / 2 &&
        Math.abs(point.z - bounds.z) <= bounds.depth / 2);
}
/** 렌더링과 보행 판정이 같은 지형을 참조해 경계의 어긋남을 방지한다. */
export function groundHeight({ x, z }) {
    if (Math.abs(x) > village.width / 2 || Math.abs(z) > village.depth / 2)
        return null;
    if (contains(village.terrace, { x, z }))
        return village.terrace.height;
    if (contains(village.stairs, { x, z }))
        return (((village.stairs.z + village.stairs.depth / 2 - z) /
            village.stairs.depth) *
            village.terrace.height);
    if (contains(village.bridge, { x, z })) {
        const left = village.bridge.x - village.bridge.width / 2;
        const right = village.bridge.x + village.bridge.width / 2;
        return (Math.min(1, (x - left) / (village.river.left - left), (right - x) / (right - village.river.right)) * village.bridge.height);
    }
    if (x > village.river.left && x < village.river.right)
        return null;
    return 0;
}
function touchesBox(point, box) {
    const dx = Math.max(0, Math.abs(point.x - box.x) - box.width / 2);
    const dz = Math.max(0, Math.abs(point.z - box.z) - box.depth / 2);
    return Math.hypot(dx, dz) < village.radius;
}
export function canWalk(point, fromHeight) {
    const height = groundHeight(point);
    if (height === null || Math.abs(height - fromHeight) > 0.18)
        return false;
    if (obstacles.some((box) => touchesBox(point, box)))
        return false;
    if (trees.some((tree) => Math.hypot(point.x - tree.x, point.z - tree.z) <
        village.radius + 0.2 * tree.size))
        return false;
    // 상체 그림의 폭과 분리한 발밑 원으로 통행을 판단한다.
    // 발 가장자리가 강·절벽 밖으로 빠지지 않도록 지면도 확인한다.
    for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ]) {
        const rim = groundHeight({
            x: point.x + dx * village.radius,
            z: point.z + dz * village.radius,
        });
        if (rim === null || Math.abs(rim - height) > 0.2)
            return false;
    }
    return true;
}
export class VillageWalk {
    position = { ...village.spawn };
    height = 0;
    facing = 'front';
    moving = false;
    reset() {
        this.position = { ...village.spawn };
        this.height = 0;
        this.facing = 'front';
        this.stop();
    }
    stop() {
        this.moving = false;
    }
    update(delta, input) {
        const dt = Math.max(0, Math.min(delta, 0.05));
        const length = Math.hypot(input.x, input.z);
        if (!length || !Number.isFinite(length) || !Number.isFinite(dt)) {
            this.stop();
            return;
        }
        if (Math.abs(input.x) > Math.abs(input.z))
            this.facing = input.x > 0 ? 'right' : 'left';
        else
            this.facing = input.z > 0 ? 'front' : 'back';
        const distance = village.speed * dt;
        const dx = (input.x / length) * distance;
        const dz = (input.z / length) * distance;
        const previous = this.position;
        // 작은 하위 스텝과 축별 이동으로 얇은 장애물 통과를 막고 벽을 따라 미끄러진다.
        const steps = Math.max(1, Math.ceil(distance / 0.04));
        for (let i = 0; i < steps; i++) {
            this.tryMove({ x: this.position.x + dx / steps, z: this.position.z });
            this.tryMove({ x: this.position.x, z: this.position.z + dz / steps });
        }
        this.moving =
            Math.hypot(this.position.x - previous.x, this.position.z - previous.z) >
                0.00001;
    }
    tryMove(point) {
        if (!canWalk(point, this.height))
            return;
        this.position = point;
        this.height = groundHeight(point);
    }
    get snapshot() {
        let area = '산들마을 · 아랫길';
        if (contains(village.terrace, this.position))
            area = '산들마을 · 바람 언덕';
        else if (contains(village.stairs, this.position))
            area = '언덕으로 가는 돌계단';
        else if (contains(village.bridge, this.position))
            area = '개울 위 나무다리';
        else if (this.position.x > village.river.right)
            area = '산들마을 · 건너편';
        return {
            ...this.position,
            y: this.height,
            facing: this.facing,
            moving: this.moving,
            area,
        };
    }
}
