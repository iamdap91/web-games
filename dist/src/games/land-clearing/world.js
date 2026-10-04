export const clearing = {
    width: 20,
    depth: 16,
    speed: 3.6,
    playerRadius: 0.27,
    reach: 0.95,
    swingDuration: 0.44,
    impactTime: 0.18,
    spawn: { x: 0, z: 4.4 },
};
export const obstacleTypes = {
    brush: { label: '잡목', radius: 0.48, health: 2, material: '목재' },
    rock: { label: '바위', radius: 0.65, health: 3, material: '돌' },
};
const layout = [
    { x: 0, z: 2.6, kind: 'brush' },
    { x: 2.4, z: 2.6, kind: 'rock' },
    { x: -2.4, z: 2.1, kind: 'brush' },
    { x: -4.2, z: 0.1, kind: 'rock' },
    { x: -1.2, z: -0.3, kind: 'rock' },
    { x: 1.3, z: -0.5, kind: 'brush' },
    { x: 4.4, z: 0.3, kind: 'brush' },
    { x: -5.2, z: -3.1, kind: 'brush' },
    { x: -2.5, z: -3.3, kind: 'brush' },
    { x: 0.2, z: -3.4, kind: 'rock' },
    { x: 3.4, z: -3.2, kind: 'rock' },
    { x: 5.7, z: -3.5, kind: 'brush' },
];
const facingVectors = {
    front: { x: 0, z: 1 },
    back: { x: 0, z: -1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
};
function facingFor({ x, z }) {
    return Math.abs(z) >= Math.abs(x)
        ? z < 0
            ? 'back'
            : 'front'
        : x < 0
            ? 'left'
            : 'right';
}
export class ClearingWorld {
    player = {
        ...clearing.spawn,
        facing: 'back',
        moving: false,
    };
    obstacles = layout.map((item, id) => ({
        ...item,
        id,
        health: Number(obstacleTypes[item.kind].health),
    }));
    swing = null;
    impacts = [];
    wood = 0;
    stone = 0;
    reset() {
        this.player = { ...clearing.spawn, facing: 'back', moving: false };
        this.obstacles = layout.map((item, id) => ({
            ...item,
            id,
            health: Number(obstacleTypes[item.kind].health),
        }));
        this.swing = null;
        this.impacts = [];
        this.wood = 0;
        this.stone = 0;
    }
    target() {
        const forward = facingVectors[this.player.facing];
        let best;
        let bestDistance = Infinity;
        for (const item of this.obstacles) {
            if (item.health <= 0)
                continue;
            const dx = item.x - this.player.x;
            const dz = item.z - this.player.z;
            const distance = Math.hypot(dx, dz);
            const surfaceDistance = distance - obstacleTypes[item.kind].radius;
            // 뒤에 있는 물체를 실수로 치지 않되, 정면 대각선은 넉넉하게 선택한다.
            if (surfaceDistance > clearing.reach ||
                (dx * forward.x + dz * forward.z) / distance < 0.35)
                continue;
            if (surfaceDistance < bestDistance) {
                best = item;
                bestDistance = surfaceDistance;
            }
        }
        return best;
    }
    canWalk(point) {
        if (Math.abs(point.x) > clearing.width / 2 - clearing.playerRadius ||
            Math.abs(point.z) > clearing.depth / 2 - clearing.playerRadius)
            return false;
        return this.obstacles.every((item) => item.health <= 0 ||
            Math.hypot(point.x - item.x, point.z - item.z) >=
                clearing.playerRadius + obstacleTypes[item.kind].radius);
    }
    startSwing() {
        const target = this.target();
        if (!target)
            return;
        const dx = target.x - this.player.x;
        const dz = target.z - this.player.z;
        const length = Math.hypot(dx, dz);
        this.player.facing = facingFor({ x: dx, z: dz });
        this.swing = {
            targetId: target.id,
            kind: target.kind,
            aim: { x: dx / length, z: dz / length },
            elapsed: 0,
            hit: false,
        };
    }
    update(dt, input) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, 0.05);
        this.player.moving = false;
        if (!this.swing) {
            const x = Number.isFinite(input.x) ? input.x : 0;
            const z = Number.isFinite(input.z) ? input.z : 0;
            const length = Math.hypot(x, z);
            if (length > 0) {
                this.player.facing = facingFor({ x, z });
                const dx = (x / length) * clearing.speed * dt;
                const dz = (z / length) * clearing.speed * dt;
                const steps = Math.ceil(Math.hypot(dx, dz) / 0.04);
                for (let i = 0; i < steps; i++) {
                    const nextX = { x: this.player.x + dx / steps, z: this.player.z };
                    if (this.canWalk(nextX)) {
                        this.player.x = nextX.x;
                        this.player.moving = true;
                    }
                    const nextZ = { x: this.player.x, z: this.player.z + dz / steps };
                    if (this.canWalk(nextZ)) {
                        this.player.z = nextZ.z;
                        this.player.moving = true;
                    }
                }
            }
            if (input.working)
                this.startSwing();
        }
        const swing = this.swing;
        if (!swing)
            return;
        this.player.moving = false;
        swing.elapsed += dt;
        if (!swing.hit && swing.elapsed >= clearing.impactTime) {
            swing.hit = true;
            const target = this.obstacles.find((item) => item.id === swing.targetId);
            if (target && target.health > 0) {
                target.health--;
                const removed = target.health === 0;
                if (removed) {
                    if (target.kind === 'brush')
                        this.wood++;
                    else
                        this.stone++;
                }
                this.impacts.push({ ...target, removed });
            }
        }
        if (swing.elapsed >= clearing.swingDuration)
            this.swing = null;
    }
    takeImpacts() {
        const events = this.impacts;
        this.impacts = [];
        return events;
    }
    get snapshot() {
        return {
            player: { ...this.player },
            obstacles: this.obstacles.map((item) => ({ ...item })),
            targetId: this.swing?.targetId ?? this.target()?.id ?? null,
            swing: this.swing
                ? {
                    kind: this.swing.kind,
                    aim: { ...this.swing.aim },
                    progress: this.swing.elapsed / clearing.swingDuration,
                }
                : null,
            wood: this.wood,
            stone: this.stone,
            removed: this.wood + this.stone,
            total: this.obstacles.length,
        };
    }
}
