import { rockForm } from './rock-form.js';
import { fragmentRules, fragmentFootprints, } from './rock-fragments.js';
import { overlapsShape, pushOutsidePolygon, sweepShape, } from './obstacle-collision.js';
export { sweepCircle } from './obstacle-collision.js';
import { energyRules } from '../land-clearing/harvest-energy.js';
import { GiantTree, treeRules, healthyTreeRules, } from './giant-tree.js';
import { entersWeakFace } from './weak-face.js';
import { facingFor, facingVectors, } from '../../resources/characters/ataho/facing.js';
import { clearing } from '../land-clearing/clearing-rules.js';
export const rockRules = {
    target: 'rock',
    center: { x: 0, z: 0 },
    radius: rockForm.radius,
    height: rockForm.height,
    health: 6,
    normalDamage: 1,
    normalReach: clearing.reach,
    weakNormal: { x: 1, z: 0 },
    weakHalfAngle: Math.PI / 5,
    approachCosine: 0.85,
    reward: 2,
    playerRadius: clearing.playerRadius,
    speed: clearing.speed,
    spawn: { x: 0, z: 4.8 },
    boundary: { x: 8, z: 5.7 },
    swingDuration: clearing.swingDuration,
    contactTime: clearing.impactTime,
    dash: {
        speed: 13.5,
        duration: 0.46,
        recovery: 0.72,
        recoilDuration: 0.22,
        recoilDistance: 0.55,
    },
};
export const solidRockRules = {
    target: 'solid-rock',
    center: { x: 5.3, z: 3.3 },
    weakNormal: null,
};
export function isTreeTarget(target) {
    return target === 'tree' || target === 'healthy-tree';
}
export const interactionRules = {
    cost: 1,
    initialCharge: 1,
    duration: 0.55,
    contactTime: 0.25,
};
function length(point) {
    return Math.hypot(point.x, point.z);
}
function normalize(point) {
    const size = length(point) || 1;
    return { x: point.x / size, z: point.z / size };
}
function direction(facing) {
    return facingVectors[facing];
}
/** 바위의 내구도·약점·파괴 방법과 보상 한 번만 지급하는 규칙을 소유한다. */
export class CrackedRock {
    placement;
    health = rockRules.health;
    method = null;
    breakElapsed = 0;
    constructor(placement = rockRules) {
        this.placement = placement;
    }
    get snapshot() {
        return {
            health: this.health,
            broken: this.health === 0,
            method: this.method,
            breakElapsed: this.breakElapsed,
        };
    }
    reset() {
        this.health = rockRules.health;
        this.method = null;
        this.breakElapsed = 0;
    }
    update(dt) {
        if (this.health > 0 || !Number.isFinite(dt) || dt <= 0)
            return;
        this.breakElapsed = Math.min(fragmentRules.duration, this.breakElapsed + dt);
    }
    fragments(motion) {
        if (this.health > 0)
            return [];
        return fragmentFootprints({
            placement: this.placement,
            elapsed: this.breakElapsed,
            motion,
        }).map((vertices) => ({ kind: 'polygon', vertices }));
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
                halfAngle: rockRules.weakHalfAngle,
                approachCosine: rockRules.approachCosine,
            });
        if (options.kind === 'interaction' && !weak)
            return null;
        const damage = weak ? this.health : rockRules.normalDamage;
        this.health = Math.max(0, this.health - damage);
        const broken = this.health === 0;
        if (broken)
            this.method = options.kind;
        return {
            ...options,
            target: this.placement.target,
            damage,
            weak,
            broken,
            reward: broken ? rockRules.reward : 0,
        };
    }
}
/** 이동·행동·돌진 회복을 소유하고 바위/거목 결과를 보상과 착지에 연결한다. */
export class RockWorld {
    rock = new CrackedRock();
    tree = new GiantTree();
    solidRock = new CrackedRock(solidRockRules);
    healthyTree = new GiantTree(healthyTreeRules);
    targets = {
        rock: this.rock,
        tree: this.tree,
        'solid-rock': this.solidRock,
        'healthy-tree': this.healthyTree,
    };
    woodReward = 0;
    charge = interactionRules.initialCharge;
    pendingInteraction = null;
    treeLandings = [];
    normalTarget = null;
    player = { ...rockRules.spawn };
    facing = 'back';
    moving = false;
    action = null;
    contacted = false;
    cooldown = 0;
    reward = 0;
    paused = false;
    elapsed = 0;
    hitStop = 0;
    impacts = [];
    fragmentMotion;
    constructor(options = {}) {
        this.fragmentMotion = options.motion ?? 'full';
    }
    get snapshot() {
        const target = this.nearWeakTarget;
        return {
            player: { ...this.player, facing: this.facing, moving: this.moving },
            rock: this.rock.snapshot,
            tree: this.tree.snapshot,
            solidRock: this.solidRock.snapshot,
            healthyTree: this.healthyTree.snapshot,
            woodReward: this.woodReward,
            energy: { charge: this.charge, capacity: energyRules.capacity },
            interaction: target
                ? {
                    target: target.target,
                    available: this.charge >= interactionRules.cost &&
                        (!this.action || this.action.kind === 'normal') &&
                        !this.pendingInteraction &&
                        !this.paused,
                }
                : null,
            action: this.action
                ? { ...this.action, heading: { ...this.action.heading } }
                : null,
            cooldown: this.cooldown,
            reward: this.reward,
            paused: this.paused,
            elapsed: this.elapsed,
        };
    }
    reset() {
        Object.values(this.targets).forEach((target) => target.reset());
        this.woodReward = 0;
        this.charge = interactionRules.initialCharge;
        this.pendingInteraction = null;
        this.treeLandings = [];
        this.normalTarget = null;
        this.player = { ...rockRules.spawn };
        this.facing = 'back';
        this.moving = false;
        this.action = null;
        this.contacted = false;
        this.cooldown = this.reward = this.elapsed = this.hitStop = 0;
        this.paused = false;
        this.impacts = [];
    }
    togglePause() {
        this.paused = !this.paused;
        this.moving = false;
    }
    /** E를 새로 누른 순간에만 호출한다. 일반 타격 회복 중에는 다음 행동으로 예약한다. */
    interact() {
        const target = this.nearWeakTarget;
        if (this.paused ||
            !target ||
            this.charge < interactionRules.cost ||
            this.pendingInteraction ||
            (this.action && this.action.kind !== 'normal'))
            return false;
        this.pendingInteraction = target.target;
        if (!this.action && this.hitStop <= 0)
            this.startInteraction();
        return true;
    }
    startInteraction() {
        const target = this.nearWeakTarget;
        const requested = this.pendingInteraction;
        this.pendingInteraction = null;
        if (!target ||
            target.target !== requested ||
            this.charge < interactionRules.cost)
            return;
        const heading = normalize({
            x: target.center.x - this.player.x,
            z: target.center.z - this.player.z,
        });
        this.charge -= interactionRules.cost;
        this.normalTarget = target.target;
        this.facing = facingFor(heading);
        this.action = { kind: 'interaction', elapsed: 0, heading, recoil: null };
        this.contacted = false;
        this.moving = false;
    }
    dash() {
        if (this.paused ||
            this.action ||
            this.pendingInteraction ||
            this.cooldown > 1e-8)
            return false;
        this.action = {
            kind: 'dash',
            elapsed: 0,
            heading: direction(this.facing),
            recoil: null,
        };
        this.contacted = false;
        this.cooldown = rockRules.dash.duration + rockRules.dash.recovery;
        return true;
    }
    takeImpacts() {
        const impacts = this.impacts;
        this.impacts = [];
        return impacts;
    }
    takeTreeLandings() {
        const landings = this.treeLandings;
        this.treeLandings = [];
        return landings;
    }
    update(dt, input) {
        if (this.paused || !Number.isFinite(dt) || dt <= 0)
            return;
        let remaining = dt;
        while (remaining > 1e-9) {
            const step = Math.min(1 / 120, remaining);
            this.advance(step, input);
            remaining -= step;
        }
    }
    advance(dt, input) {
        this.elapsed += dt;
        this.rock.update(dt);
        this.solidRock.update(dt);
        for (const shape of this.fragmentColliders) {
            if (shape.kind === 'polygon')
                this.player = this.clamp(pushOutsidePolygon({
                    point: this.player,
                    vertices: shape.vertices,
                    radius: rockRules.playerRadius,
                }));
        }
        if (this.tree.update(dt))
            this.treeLandings.push('tree');
        if (this.healthyTree.update(dt))
            this.treeLandings.push('healthy-tree');
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.hitStop > 0) {
            this.hitStop = Math.max(0, this.hitStop - dt);
            this.moving = false;
            return;
        }
        if (this.action?.kind === 'dash') {
            this.advanceDash(dt);
            return;
        }
        if (!this.action && this.pendingInteraction)
            this.startInteraction();
        const magnitude = length(input);
        this.moving =
            magnitude > 0 &&
                !this.pendingInteraction &&
                (!this.action ||
                    (this.action.kind === 'normal' &&
                        this.action.elapsed >= clearing.moveRecoveryTime));
        if (this.moving) {
            const heading = normalize(input);
            this.facing = facingFor(heading);
            this.walk({
                x: this.player.x + heading.x * rockRules.speed * dt,
                z: this.player.z + heading.z * rockRules.speed * dt,
            });
        }
        if (!this.action && input.attacking) {
            const target = this.obstacles.sort((a, b) => this.surfaceDistance(a) - this.surfaceDistance(b))[0];
            this.normalTarget =
                target && this.surfaceDistance(target) <= rockRules.normalReach
                    ? target.target
                    : null;
            const heading = this.normalTarget && target
                ? normalize({
                    x: target.center.x - this.player.x,
                    z: target.center.z - this.player.z,
                })
                : direction(this.facing);
            this.facing = facingFor(heading);
            this.action = { kind: 'normal', elapsed: 0, heading, recoil: null };
            this.contacted = false;
        }
        if (!this.action)
            return;
        this.action = { ...this.action, elapsed: this.action.elapsed + dt };
        const contactTime = this.action.kind === 'interaction'
            ? interactionRules.contactTime
            : rockRules.contactTime;
        if (!this.contacted && this.action.elapsed >= contactTime) {
            this.contacted = true;
            const target = this.obstacles.find(({ target }) => target === this.normalTarget);
            if (target && this.surfaceDistance(target) <= rockRules.normalReach)
                this.strike(target.target, this.action.kind === 'interaction' ? 'interaction' : 'normal', this.player, this.action.heading);
        }
        const duration = this.action.kind === 'interaction'
            ? interactionRules.duration
            : rockRules.swingDuration;
        if (this.action.elapsed >= duration)
            this.action = null;
    }
    walk(destination) {
        const x = this.clamp({ x: destination.x, z: this.player.z });
        const clear = (point) => this.collisionShapes.every((shape) => !overlapsShape(shape, point, rockRules.playerRadius));
        if (clear(x))
            this.player = x;
        const z = this.clamp({ x: this.player.x, z: destination.z });
        if (clear(z))
            this.player = z;
    }
    clamp(point) {
        return {
            x: Math.max(-rockRules.boundary.x, Math.min(rockRules.boundary.x, point.x)),
            z: Math.max(-rockRules.boundary.z, Math.min(rockRules.boundary.z, point.z)),
        };
    }
    advanceDash(dt) {
        const action = this.action;
        this.moving = true;
        if (action.recoil !== null) {
            const before = Math.min(1, action.recoil / rockRules.dash.recoilDuration);
            const after = Math.min(1, (action.recoil + dt) / rockRules.dash.recoilDuration);
            const retreat = ((1 - before) ** 2 - (1 - after) ** 2) * rockRules.dash.recoilDistance;
            this.walk({
                x: this.player.x - action.heading.x * retreat,
                z: this.player.z - action.heading.z * retreat,
            });
            this.action = {
                ...action,
                elapsed: action.elapsed + dt,
                recoil: action.recoil + dt,
            };
            if (after >= 1)
                this.action = null;
            return;
        }
        const destination = this.clamp({
            x: this.player.x + action.heading.x * rockRules.dash.speed * dt,
            z: this.player.z + action.heading.z * rockRules.dash.speed * dt,
        });
        const contacts = this.collisionShapes
            .map((shape) => sweepShape({
            shape,
            origin: this.player,
            destination,
            radius: rockRules.playerRadius,
        }))
            .filter((contact) => contact !== null);
        const contact = contacts.length ? Math.min(...contacts) : null;
        this.action = { ...action, elapsed: action.elapsed + dt };
        if (contact !== null) {
            this.player = {
                x: this.player.x + (destination.x - this.player.x) * contact,
                z: this.player.z + (destination.z - this.player.z) * contact,
            };
            // 돌진은 단단한 장애물에 막히며 파괴와 기세 소비는 E 상호작용이 맡는다.
            this.action = { ...this.action, recoil: 0 };
        }
        else
            this.player = destination;
        if (this.action.elapsed >= rockRules.dash.duration)
            this.action = null;
    }
    get fragmentColliders() {
        return [
            ...this.rock.fragments(this.fragmentMotion),
            ...this.solidRock.fragments(this.fragmentMotion),
        ];
    }
    get collisionShapes() {
        return [
            ...this.obstacles.map(({ center, radius }) => ({
                kind: 'circle',
                center,
                radius,
            })),
            ...this.fragmentColliders,
        ];
    }
    get obstacles() {
        const obstacles = [];
        if (!this.rock.snapshot.broken)
            obstacles.push({
                target: 'rock',
                center: rockRules.center,
                radius: rockRules.radius,
                weakNormal: rockRules.weakNormal,
                weakHalfAngle: rockRules.weakHalfAngle,
                approachCosine: rockRules.approachCosine,
            });
        if (this.tree.snapshot.phase === 'standing')
            obstacles.push({
                target: 'tree',
                center: treeRules.center,
                radius: treeRules.radius,
                weakNormal: treeRules.weakNormal,
                weakHalfAngle: treeRules.weakHalfAngle,
                approachCosine: treeRules.approachCosine,
            });
        if (!this.solidRock.snapshot.broken)
            obstacles.push({ ...rockRules, ...solidRockRules });
        if (this.healthyTree.snapshot.phase === 'standing')
            obstacles.push({ ...treeRules, ...healthyTreeRules });
        return obstacles;
    }
    get nearWeakTarget() {
        const nearest = this.obstacles.sort((a, b) => this.surfaceDistance(a) - this.surfaceDistance(b))[0];
        if (!nearest ||
            !nearest.weakNormal ||
            this.surfaceDistance(nearest) > rockRules.normalReach)
            return null;
        const heading = {
            x: nearest.center.x - this.player.x,
            z: nearest.center.z - this.player.z,
        };
        return entersWeakFace({
            contact: this.player,
            heading,
            center: nearest.center,
            normal: nearest.weakNormal,
            halfAngle: nearest.weakHalfAngle,
            approachCosine: nearest.approachCosine,
        })
            ? nearest
            : null;
    }
    surfaceDistance(obstacle) {
        return (Math.hypot(this.player.x - obstacle.center.x, this.player.z - obstacle.center.z) - obstacle.radius);
    }
    strike(target, kind, contact, heading) {
        const impact = this.targets[target].hit({
            kind,
            contact,
            heading,
        });
        if (!impact)
            return null;
        if (isTreeTarget(target))
            this.woodReward += impact.reward;
        else
            this.reward += impact.reward;
        if (kind === 'normal' && impact.broken)
            this.charge = Math.min(energyRules.capacity, this.charge + 1);
        this.impacts.push(impact);
        this.hitStop = impact.broken ? clearing.breakStop : clearing.hitStop;
        return impact;
    }
}
