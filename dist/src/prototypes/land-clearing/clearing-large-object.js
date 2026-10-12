import { fragmentFootprints, fragmentRules, } from '../cracked-rock/rock-fragments.js';
import { overlapsShape, } from '../cracked-rock/obstacle-collision.js';
import { entersWeakFace } from '../cracked-rock/weak-face.js';
import { rockForm } from '../cracked-rock/rock-form.js';
import { treeRules, } from '../cracked-rock/giant-tree.js';
import { fallenCrownHits } from './tree-fall.js';
import { clearing } from './clearing-rules.js';
/** 기존 영구 ID 7·10·11과 바람숲 일반 자원 ID를 침범하지 않는다. */
export const largeObjectLayout = {
    gate: {
        id: 100,
        kind: 'rock',
        x: 11.4,
        z: 3.5,
        radius: rockForm.radius,
        weakNormal: { x: -1, z: 0 },
        reward: 4,
    },
    tree: {
        id: 101,
        kind: 'tree',
        x: 15.3,
        z: 1.4,
        radius: treeRules.radius,
        weakNormal: { x: 0, z: 1 },
        reward: 6,
    },
};
export const largeObjectHealth = 6;
/** 큰 대상 하나의 내구도·파괴 시각·잔해 충돌과 한 번의 착지를 소유한다. */
export class ClearingLargeObject {
    placement;
    health = largeObjectHealth;
    elapsed = 0;
    landed = false;
    source = null;
    heading = { x: 0, z: -1 };
    constructor(placement) {
        this.placement = placement;
    }
    get obstacle() {
        const { id, kind, x, z } = this.placement;
        return { id, kind, x, z, health: this.health };
    }
    get destructionSource() {
        return this.source;
    }
    get fallHeading() {
        return this.heading;
    }
    get rock() {
        return {
            health: this.health,
            broken: this.health === 0,
            method: this.source === null
                ? null
                : this.source === 'normal'
                    ? 'normal'
                    : 'interaction',
            breakElapsed: this.elapsed,
        };
    }
    get tree() {
        return {
            health: this.health,
            phase: this.health > 0 ? 'standing' : this.landed ? 'fallen' : 'falling',
            method: this.rock.method,
            heading: { ...this.heading },
            fallElapsed: this.elapsed,
        };
    }
    reset(opened = false) {
        this.health = opened ? 0 : largeObjectHealth;
        this.elapsed = opened ? fragmentRules.duration : 0;
        this.source = null;
        this.landed = false;
        this.heading = { x: 0, z: -1 };
    }
    weakFrom(player, heading) {
        return (this.health > 0 &&
            Math.hypot(player.x - this.placement.x, player.z - this.placement.z) <=
                this.placement.radius + clearing.reach &&
            entersWeakFace({
                contact: player,
                heading,
                center: this.placement,
                normal: this.placement.weakNormal,
                halfAngle: Math.PI / 5,
                approachCosine: 0.85,
            }));
    }
    hit(source, heading) {
        if (this.health === 0)
            return null;
        if (this.placement.kind === 'rock' && source !== 'weakStrike')
            return { removed: false };
        this.health = source === 'normal' ? this.health - 1 : 0;
        if (this.health === 0) {
            this.source = source;
            const size = Math.hypot(heading.x, heading.z) || 1;
            this.heading = { x: heading.x / size, z: heading.z / size };
        }
        return { removed: this.health === 0 };
    }
    update(dt) {
        if (this.health > 0 || !Number.isFinite(dt) || dt <= 0)
            return false;
        const duration = this.placement.kind === 'rock'
            ? fragmentRules.duration
            : treeRules.fallDuration + treeRules.fadeDuration;
        this.elapsed = Math.min(duration, this.elapsed + dt);
        if (this.placement.kind !== 'tree' ||
            this.landed ||
            this.elapsed < treeRules.fallDuration)
            return false;
        this.landed = true;
        return true;
    }
    shapes(motion) {
        if (this.health > 0)
            return [
                {
                    kind: 'circle',
                    center: this.placement,
                    radius: this.placement.radius,
                },
            ];
        if (this.placement.kind === 'tree')
            return [];
        return fragmentFootprints({
            placement: {
                target: 'rock',
                center: this.placement,
                weakNormal: this.placement.weakNormal,
            },
            elapsed: this.elapsed,
            motion,
        }).map((vertices) => ({ kind: 'polygon', vertices }));
    }
    blocks(point, motion) {
        return this.shapes(motion).some((shape) => overlapsShape(shape, point, clearing.playerRadius));
    }
    clearsBrush(point, radius) {
        const x = point.x - this.placement.x, z = point.z - this.placement.z;
        const along = x * this.heading.x + z * this.heading.z;
        const across = Math.abs(x * this.heading.z - z * this.heading.x);
        const nearestTrunk = Math.max(0, Math.min(treeRules.trunkHeight, along));
        return (Math.hypot(along - nearestTrunk, across) <= treeRules.radius + radius ||
            fallenCrownHits({
                point,
                radius,
                origin: {
                    x: this.placement.x + this.heading.x * treeRules.crownLift,
                    z: this.placement.z + this.heading.z * treeRules.crownLift,
                },
                direction: this.heading,
                scale: treeRules.scale,
            }));
    }
}
