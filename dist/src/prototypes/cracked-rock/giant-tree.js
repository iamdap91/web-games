import { entersWeakFace } from './weak-face.js';
export const treeRules = {
    target: 'tree',
    center: { x: -3.8, z: -1.4 },
    radius: 0.7,
    scale: 1.8,
    trunkHeight: 4,
    crownLift: 1.6,
    health: 6,
    weakNormal: { x: 0, z: 1 },
    weakHalfAngle: Math.PI / 5,
    approachCosine: 0.85,
    reward: 3,
    fallDuration: 1.15,
    fadeDuration: 0.45,
};
export const healthyTreeRules = {
    target: 'healthy-tree',
    center: { x: 4.8, z: -2.5 },
    weakNormal: null,
};
/** 내구도·약한 밑동·쓰러짐 시간·한 번의 착지와 보상을 소유한다. */
export class GiantTree {
    placement;
    health = treeRules.health;
    method = null;
    heading = { x: 0, z: -1 };
    fallElapsed = 0;
    landed = false;
    constructor(placement = treeRules) {
        this.placement = placement;
    }
    get snapshot() {
        return {
            health: this.health,
            phase: this.health > 0 ? 'standing' : this.landed ? 'fallen' : 'falling',
            method: this.method,
            heading: { ...this.heading },
            fallElapsed: this.fallElapsed,
        };
    }
    reset() {
        this.health = treeRules.health;
        this.method = null;
        this.heading = { x: 0, z: -1 };
        this.fallElapsed = 0;
        this.landed = false;
    }
    hit(options) {
        if (this.health === 0)
            return null;
        const weak = options.kind === 'interaction' &&
            this.placement.weakNormal !== null &&
            entersWeakFace({
                ...options,
                center: this.placement.center,
                normal: this.placement.weakNormal,
                halfAngle: treeRules.weakHalfAngle,
                approachCosine: treeRules.approachCosine,
            });
        if (options.kind === 'interaction' && !weak)
            return null;
        const damage = weak ? this.health : 1;
        this.health = Math.max(0, this.health - damage);
        const broken = this.health === 0;
        if (broken) {
            this.method = options.kind;
            const size = Math.hypot(options.heading.x, options.heading.z) || 1;
            this.heading = {
                x: options.heading.x / size,
                z: options.heading.z / size,
            };
        }
        return {
            ...options,
            target: this.placement.target,
            damage,
            weak,
            broken,
            reward: broken ? treeRules.reward : 0,
        };
    }
    update(dt) {
        if (this.health > 0 || !Number.isFinite(dt) || dt <= 0)
            return false;
        this.fallElapsed = Math.min(treeRules.fallDuration + treeRules.fadeDuration, this.fallElapsed + dt);
        if (this.landed || this.fallElapsed < treeRules.fallDuration)
            return false;
        this.landed = true;
        return true;
    }
}
