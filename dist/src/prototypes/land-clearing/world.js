import { ForestGimmicks, } from './forest-gimmicks.js';
import { forestClearingLayout, forestHollow, insideForestClearing, } from './forest-clearing-layout.js';
import { boulderRules, segmentDistance, } from '../forest-interactions/rolling-boulder.js';
import { ClearingLargeObject, largeObjectLayout, } from './clearing-large-object.js';
import { WeakStrike } from './weak-strike.js';
import { pushOutsidePolygon } from '../cracked-rock/obstacle-collision.js';
import { treeRules } from '../cracked-rock/giant-tree.js';
import { facingFor, facingVectors, } from '../../resources/characters/ataho/facing.js';
import { groveLayout, insideGrove } from './grove-layout.js';
import { clearing } from './clearing-rules.js';
import { HarvestSwing } from './harvest-swing.js';
import { HarvestEnergy } from './harvest-energy.js';
import { HarvestRush, rushRules } from './harvest-rush.js';
import { GroundSlam, slamReaches, } from './ground-slam.js';
import { StreamLoot, streamLootRules, } from './stream-loot.js';
import { ClearingDiscovery, discoveryLayout, } from './clearing-discovery.js';
import { createClearingProgress, isClearingProgress, isClearingTreeId, } from './clearing-progress.js';
import { treeFallDuration, TreeFall } from './tree-fall.js';
import { treeShape } from '../../resources/environment/tree-shape.js';
export { clearing } from './clearing-rules.js';
const largeTreeScale = 1.1;
export const obstacleTypes = {
    brush: {
        label: '잡목',
        radius: 0.48,
        health: 2,
        material: '목재',
        reward: 1,
    },
    rock: { label: '바위', radius: 0.65, health: 3, material: '돌', reward: 1 },
    tree: {
        label: '큰 나무',
        radius: (treeShape.trunkWidth * largeTreeScale) / Math.SQRT2,
        scale: largeTreeScale,
        health: 4,
        material: '목재',
        reward: 3,
    },
};
const layout = [
    { x: 0, z: 2.6, kind: 'brush' },
    { x: 2.4, z: 2.6, kind: 'rock' },
    { x: -2.4, z: 2.1, kind: 'brush' },
    { x: -4.2, z: 0.1, kind: 'rock' },
    { x: -1.2, z: -0.3, kind: 'rock' },
    { x: 1.3, z: -0.5, kind: 'brush' },
    { x: 5.4, z: -0.8, kind: 'brush' },
    { x: -5.2, z: -3.1, kind: 'tree' },
    { x: -2.5, z: -3.3, kind: 'brush' },
    { x: 0.2, z: -3.4, kind: 'rock' },
    { x: discoveryLayout.source.x, z: discoveryLayout.source.z, kind: 'rock' },
    { x: 5.7, z: -3.5, kind: 'tree' },
];
export function obstacleRadius(item) {
    if (item.id === largeObjectLayout.gate.id)
        return largeObjectLayout.gate.radius;
    if (item.id === largeObjectLayout.tree.id)
        return largeObjectLayout.tree.radius;
    return item.id === discoveryLayout.source.id
        ? discoveryLayout.source.radius
        : obstacleTypes[item.kind].radius;
}
function createPlayer() {
    return { ...clearing.spawn, facing: 'back', moving: false };
}
function createObstacles() {
    return [
        ...[...layout, ...groveLayout.resources].map((item, id) => ({
            ...item,
            id,
        })),
        ...forestClearingLayout.resources,
    ].map((item) => ({ ...item, health: obstacleTypes[item.kind].health }));
}
export class ClearingWorld {
    forest;
    forestEvents = [];
    forestWorkConsumed = false;
    player = createPlayer();
    obstacles = createObstacles();
    swing = null;
    impacts = [];
    falls = [];
    energy = new HarvestEnergy();
    rush = new HarvestRush();
    slam = new GroundSlam();
    slamImpacts = [];
    discovery = new ClearingDiscovery(clearing.width / 2 - clearing.playerRadius);
    loot = new StreamLoot(clearing.width / 2 - clearing.playerRadius);
    lootEvents = [];
    wood = 0;
    stone = 0;
    initialRemoved = 0;
    finished = false;
    visitId;
    groveUnlocked;
    weakStrikeUnlocked;
    gate = new ClearingLargeObject(largeObjectLayout.gate);
    giantTree = new ClearingLargeObject(largeObjectLayout.tree);
    weakStrike = null;
    fragmentMotion = 'full';
    groveDiscovered;
    groveEvents = [];
    speedMultiplier;
    constructor(entry) {
        if (entry &&
            (!Number.isSafeInteger(entry.visitId) ||
                entry.visitId < 0 ||
                !isClearingProgress(entry.progress)))
            throw new Error('채집 입장 정보가 올바르지 않습니다.');
        this.forest = new ForestGimmicks(entry?.progress);
        this.visitId = entry?.visitId ?? null;
        this.groveUnlocked =
            entry?.groveUnlocked === true || entry?.progress.groveOpened === true;
        this.weakStrikeUnlocked = entry ? entry.weakStrikeUnlocked === true : true;
        this.gate.reset(this.groveUnlocked);
        this.groveDiscovered = entry?.progress.groveDiscovered ?? false;
        this.speedMultiplier = entry?.movementSpeedMultiplier ?? 1;
        if (!Number.isFinite(this.speedMultiplier) ||
            this.speedMultiplier <= 0 ||
            this.speedMultiplier > 2)
            throw new Error('이동 속도가 유효하지 않습니다.');
        this.obstacles = createObstacles();
        if (!entry)
            return;
        const progress = entry.progress;
        for (const item of this.obstacles) {
            if ((item.id === discoveryLayout.source.id && progress.springOpened) ||
                progress.fallenTrees.some((tree) => tree.id === item.id)) {
                item.health = 0;
                this.initialRemoved++;
            }
        }
        this.discovery.restore(progress, this.obstacles
            .filter((item) => item.kind === 'tree')
            .map((item) => ({
            id: item.id,
            origin: { x: item.x, z: item.z },
            scale: obstacleTypes.tree.scale,
        })));
        this.loot.restore(progress);
    }
    get canReturn() {
        const { exit } = clearing;
        return (this.visitId !== null &&
            !this.finished &&
            Math.abs(this.player.x - exit.x) <= exit.halfWidth &&
            this.player.z >= exit.z);
    }
    returnToTown() {
        if (this.visitId === null || !this.canReturn)
            return null;
        this.finished = true;
        this.swing = null;
        this.weakStrike = null;
        this.rush.reset();
        this.slam.reset();
        this.energy.cancelRequest();
        this.player.moving = false;
        // 이미 쓰러뜨린 나무의 착지와 연쇄 보상만 마무리한다. 준비 중 공격은 발동하지 않는다.
        this.updateFalls(treeFallDuration);
        this.updateLargeObjects(treeRules.fallDuration + treeRules.fadeDuration);
        this.discovery.update(treeFallDuration, this.player);
        const discovery = this.discovery.snapshot;
        return {
            visitId: this.visitId,
            gained: { wood: this.wood, stone: this.stone },
            progress: {
                ...createClearingProgress(),
                springOpened: discovery.springAge !== null,
                flowerBankReached: discovery.crossed,
                groveOpened: this.groveUnlocked,
                groveDiscovered: this.groveDiscovered,
                vineOpened: this.forest.vine.snapshot.opened,
                hollowClaimed: this.forest.hollow.snapshot.phase === 'claimed',
                fallenTrees: discovery.logs.flatMap((log) => isClearingTreeId(log.id)
                    ? [{ id: log.id, direction: { ...log.aim } }]
                    : []),
                claimedLoot: this.loot.claimedLoot,
            },
        };
    }
    reset() {
        if (this.visitId !== null)
            return;
        this.forest = new ForestGimmicks();
        this.forestEvents = [];
        this.forestWorkConsumed = false;
        this.player = createPlayer();
        this.obstacles = createObstacles();
        this.swing = null;
        this.weakStrike = null;
        this.groveUnlocked = false;
        this.groveDiscovered = false;
        this.groveEvents = [];
        this.gate.reset();
        this.giantTree.reset();
        this.impacts = [];
        this.falls = [];
        this.slam.reset();
        this.rush.reset();
        this.energy.reset();
        this.slamImpacts = [];
        this.discovery.reset();
        this.loot.reset();
        this.lootEvents = [];
        this.wood = 0;
        this.stone = 0;
    }
    target() {
        const forward = facingVectors[this.player.facing];
        const candidates = this.harvestables
            .filter((item) => item.health > 0 || this.discovery.canPush(item.id))
            .map((item) => ({ ...item, radius: obstacleRadius(item) }));
        for (const item of this.loot.snapshot)
            if (item.kind === 'crate')
                candidates.push({
                    ...item,
                    kind: 'crate',
                    radius: streamLootRules.crateRadius,
                });
        let best;
        let bestDistance = Infinity;
        for (const item of candidates) {
            const dx = item.x - this.player.x;
            const dz = item.z - this.player.z;
            const distance = Math.hypot(dx, dz);
            const surfaceDistance = distance - item.radius;
            // 뒤에 있는 물체는 제외하고 정면 대각선은 넉넉하게 선택한다.
            if (surfaceDistance > clearing.reach ||
                (distance > 0 && (dx * forward.x + dz * forward.z) / distance < 0.35))
                continue;
            if (surfaceDistance < bestDistance) {
                best = item;
                bestDistance = surfaceDistance;
            }
        }
        return best;
    }
    /** 동행 표시는 같은 충돌 규칙을 조회하며 채집·파괴·보상 상태를 변경하지 않는다. */
    canStand(point) {
        return this.canWalk(point);
    }
    canWalk(point) {
        const southLimit = this.visitId !== null &&
            Math.abs(point.x - clearing.exit.x) <= clearing.exit.halfWidth
            ? clearing.exit.z + clearing.playerRadius
            : clearing.depth / 2 - clearing.playerRadius;
        const insideOriginal = Math.abs(point.x) <= clearing.width / 2 - clearing.playerRadius &&
            point.z >= -clearing.depth / 2 + clearing.playerRadius &&
            point.z <= southLimit;
        if (!insideOriginal &&
            !insideGrove(point, clearing.playerRadius) &&
            !insideForestClearing(point, clearing.playerRadius))
            return false;
        if (!this.discovery.canWalk(point, clearing.playerRadius) ||
            this.forest.blocks(point))
            return false;
        if ([this.gate, this.giantTree].some((item) => item.blocks(point, this.fragmentMotion)))
            return false;
        return this.obstacles.every((item) => item.health <= 0 ||
            Math.hypot(point.x - item.x, point.z - item.z) >=
                clearing.playerRadius + obstacleRadius(item));
    }
    startSwing() {
        const target = this.target();
        const forward = facingVectors[this.player.facing];
        let dx = target
            ? target.x - this.player.x
            : forward.x * clearing.strikeReach;
        let dz = target
            ? target.z - this.player.z
            : forward.z * clearing.strikeReach;
        if (Math.hypot(dx, dz) < 0.001) {
            dx = forward.x * clearing.strikeReach;
            dz = forward.z * clearing.strikeReach;
        }
        const length = Math.hypot(dx, dz);
        this.player.facing = facingFor({ x: dx, z: dz });
        const radius = target?.radius ?? 0;
        // 앞뒤 회전 공격은 몸 옆으로 뻗는 발에 맞춰 대상의 옆면에 충격을 표시한다.
        const lateral = Math.abs(dz) >= Math.abs(dx) ? radius * 0.8 : 0;
        const depth = Math.sqrt(radius * radius - lateral * lateral);
        this.swing = new HarvestSwing({
            targetId: target?.id ?? null,
            kind: target?.kind ?? null,
            aim: { x: dx / length, z: dz / length },
            contact: {
                x: this.player.x + dx - (dx / length) * depth - (dz / length) * lateral,
                z: this.player.z + dz - (dz / length) * depth + (dx / length) * lateral,
            },
            advance: Math.max(0, length - radius - clearing.strikeReach),
        });
    }
    update(dt, input) {
        if (this.finished || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, 0.05);
        this.player.moving = false;
        const x = Number.isFinite(input.x) ? input.x : 0;
        const z = Number.isFinite(input.z) ? input.z : 0;
        const length = Math.hypot(x, z);
        if (!input.working)
            this.forestWorkConsumed = false;
        if (input.interact)
            this.startForestInteraction();
        if (input.weakStrike)
            this.startWeakStrike();
        if (!this.slam.active &&
            !this.rush.active &&
            !this.weakStrike &&
            !this.forest.action) {
            if (input.slam)
                this.energy.request('slam');
            else if (input.rush)
                this.energy.request('rush');
            if (!this.swing || this.swing.canMove) {
                const skill = this.energy.spendRequested();
                if (skill) {
                    this.swing = null;
                    if (skill === 'slam')
                        this.slam.begin(this.player);
                    else
                        this.rush.begin(length > 0 ? { x, z } : facingVectors[this.player.facing]);
                }
            }
        }
        if (length > 0)
            this.swing?.releaseForMovement();
        if (this.rush.active) {
            this.updateRush(dt, { x, z });
        }
        else if (!this.slam.active &&
            !this.weakStrike &&
            !this.forest.action &&
            (!this.swing || this.swing.releasedForMovement)) {
            if (length > 0) {
                this.player.facing = facingFor({ x, z });
                this.move({ x: x / length, z: z / length }, clearing.speed * this.speedMultiplier * dt);
            }
            if (input.working &&
                !this.forestWorkConsumed &&
                !this.swing &&
                !this.forest.target(this.player))
                this.startSwing();
        }
        this.updateForest(dt);
        this.updateSwing(dt);
        this.updateWeakStrike(dt);
        this.updateLargeObjects(dt);
        const strike = this.slam.update(dt);
        if (strike)
            this.strikeGround(strike);
        this.updateFalls(dt);
        if (this.groveUnlocked &&
            !this.groveDiscovered &&
            this.player.x >= groveLayout.discoveryX) {
            this.groveDiscovered = true;
            this.groveEvents.push('grove-found');
        }
        this.discovery.update(dt, this.player);
        this.loot.update(dt, this.player, this.discovery.snapshot.logs);
        for (const event of this.loot.takeEvents()) {
            if (event.type === 'pickup') {
                if (event.material === 'wood')
                    this.wood += event.amount;
                else
                    this.stone += event.amount;
            }
            this.lootEvents.push(event);
        }
    }
    updateRush(dt, input) {
        this.rush.steer(input);
        // 충돌 직후 남은 프레임부터 반동으로 전환해 프레임 속도에 따른 연타를 막는다.
        for (let remaining = dt; remaining > 1e-9 && this.rush.active;) {
            const action = this.rush.snapshot;
            const step = Math.min(remaining, action.remaining, 0.005);
            const movement = this.rush.displacement(step, clearing.speed);
            const distance = Math.hypot(movement.x, movement.z);
            this.player.facing = facingFor(action.heading);
            if (distance > 0)
                this.move({ x: movement.x / distance, z: movement.z / distance }, distance);
            this.rush.update(step);
            remaining -= step;
        }
    }
    move(direction, distance) {
        // 빠른 이동도 작은 간격으로 판정해 얇은 잡목과 물가를 뚫지 않는다.
        const steps = Math.ceil(distance / 0.04);
        for (let i = 0; i < steps; i++) {
            for (const axis of ['x', 'z']) {
                if (direction[axis] === 0)
                    continue;
                const next = { x: this.player.x, z: this.player.z };
                next[axis] += (direction[axis] * distance) / steps;
                if (this.rush.canStrike) {
                    this.strikeRush(next, direction);
                    if (!this.rush.canStrike)
                        return;
                }
                if (this.canWalk(next)) {
                    this.player[axis] = next[axis];
                    this.player.moving = true;
                }
            }
        }
    }
    strikeRush(point, aim) {
        const reach = clearing.playerRadius + rushRules.contactMargin;
        if (this.forest.blocks(point)) {
            this.rush.rebound(aim);
            return;
        }
        for (const large of [this.gate, this.giantTree]) {
            if (large.blocks(point, this.fragmentMotion) ||
                (large.obstacle.health > 0 &&
                    Math.hypot(large.placement.x - point.x, large.placement.z - point.z) <=
                        large.placement.radius + reach)) {
                const item = large.obstacle;
                this.impacts.push({
                    ...item,
                    source: 'rush',
                    removed: false,
                    aim,
                    contact: point,
                });
                this.rush.rebound(aim);
                return;
            }
        }
        for (const item of this.obstacles) {
            const radius = obstacleRadius(item);
            if (item.health <= 0 ||
                Math.hypot(item.x - point.x, item.z - point.z) > radius + reach)
                continue;
            const contact = {
                x: item.x - aim.x * radius,
                z: item.z - aim.z * radius,
            };
            if (item.kind === 'brush' || item.health <= rushRules.damage)
                this.destroyObstacle(item, { aim, contact, source: 'rush' });
            else {
                item.health -= rushRules.damage;
                this.impacts.push({
                    ...item,
                    aim,
                    contact,
                    removed: false,
                    source: 'rush',
                });
                this.rush.rebound(aim);
                return;
            }
        }
        for (const item of this.loot.snapshot)
            if (item.kind === 'crate' &&
                Math.hypot(item.x - point.x, item.z - point.z) <=
                    reach + streamLootRules.crateRadius)
                this.loot.openCrate(item.id);
    }
    updateSwing(dt) {
        const swing = this.swing;
        if (!swing)
            return;
        if (!swing.releasedForMovement)
            this.player.moving = false;
        const hit = swing.update(dt);
        if (hit) {
            if (hit.targetId !== null &&
                this.hitLarge(hit.targetId, 'normal', hit.aim, hit.contact)) {
                swing.pause(clearing.hitStop);
            }
            if (hit.kind === 'crate' && this.strikeCrate(hit))
                swing.pause(clearing.breakStop);
            const target = hit.kind === 'crate'
                ? undefined
                : this.obstacles.find((item) => item.id === hit.targetId);
            if (target && target.health <= 0 && this.discovery.canPush(target.id)) {
                this.discovery.pushLog(target.id, hit.aim);
                this.impacts.push({
                    ...target,
                    removed: false,
                    action: 'push',
                    aim: hit.aim,
                    contact: hit.contact,
                });
            }
            if (target && target.health > 0) {
                const removed = target.health === 1;
                if (removed)
                    this.destroyObstacle(target, {
                        aim: hit.aim,
                        contact: hit.contact,
                        source: 'normal',
                    });
                else {
                    target.health--;
                    this.impacts.push({
                        ...target,
                        removed: false,
                        aim: hit.aim,
                        contact: hit.contact,
                    });
                }
                swing.pause(removed ? clearing.breakStop : clearing.hitStop);
            }
        }
        if (swing.finished)
            this.swing = null;
    }
    strikeCrate(swing) {
        const crate = this.loot.snapshot.find((item) => item.id === swing.targetId && item.kind === 'crate');
        if (!crate)
            return false;
        // 준비 동작 동안 흘러간 짧은 거리는 허용하되 멀어진 상자를 원격으로 열지 않는다.
        if (Math.hypot(crate.x - this.player.x, crate.z - this.player.z) >
            clearing.reach + streamLootRules.crateRadius + 0.18)
            return false;
        return this.loot.openCrate(crate.id);
    }
    collect(target) {
        const { kind } = target;
        const reward = obstacleTypes[kind].reward *
            (target.id >= layout.length ? groveLayout.yieldMultiplier : 1);
        if (kind === 'rock')
            this.stone += reward;
        else
            this.wood += reward;
    }
    destroyObstacle(target, hit) {
        if (target.health <= 0)
            return;
        target.health = 0;
        this.collect(target);
        if (hit.source === 'normal')
            this.energy.recordHarvest();
        if (target.id === discoveryLayout.source.id) {
            this.discovery.openSpring();
            this.loot.release();
        }
        if (target.kind === 'tree') {
            this.discovery.fellTree(target.id, target, hit.aim, obstacleTypes.tree.scale);
            this.falls.push({
                fall: new TreeFall(target, hit.aim, obstacleTypes.tree.scale),
                source: hit.source,
            });
        }
        this.impacts.push({ ...target, ...hit, removed: true });
    }
    strikeGround(origin) {
        let cleared = 0;
        for (const large of [this.gate, this.giantTree]) {
            const item = large.obstacle;
            if (item.health <= 0 ||
                !slamReaches(origin, item, large.placement.radius))
                continue;
            const dx = item.x - origin.x, dz = item.z - origin.z, size = Math.hypot(dx, dz) || 1;
            this.hitLarge(item.id, 'slam', { x: dx / size, z: dz / size }, item);
            if (large.obstacle.health === 0)
                cleared++;
        }
        for (const item of this.obstacles) {
            if (item.health <= 0 || !slamReaches(origin, item, obstacleRadius(item)))
                continue;
            const dx = item.x - origin.x;
            const dz = item.z - origin.z;
            const length = Math.hypot(dx, dz);
            const aim = length > 0.001
                ? { x: dx / length, z: dz / length }
                : facingVectors[this.player.facing];
            this.destroyObstacle(item, {
                aim,
                contact: { x: item.x, z: item.z },
                source: 'slam',
            });
            cleared++;
        }
        for (const item of this.loot.snapshot)
            if (item.kind === 'crate' &&
                slamReaches(origin, item, streamLootRules.crateRadius))
                this.loot.openCrate(item.id);
        this.slamImpacts.push({ ...origin, cleared });
    }
    updateFalls(dt) {
        for (let i = this.falls.length - 1; i >= 0; i--) {
            const { fall, source } = this.falls[i];
            if (fall.update(dt)) {
                for (const item of this.obstacles) {
                    if (item.kind !== 'brush' ||
                        item.health <= 0 ||
                        !fall.hits(item, obstacleTypes.brush.radius))
                        continue;
                    this.destroyObstacle(item, {
                        source,
                        aim: fall.aim,
                        contact: { x: item.x, z: item.z },
                    });
                }
            }
            if (fall.finished)
                this.falls.splice(i, 1);
        }
    }
    get harvestables() {
        return [...this.obstacles, this.gate.obstacle, this.giantTree.obstacle];
    }
    setReducedMotion(reduced) {
        this.fragmentMotion = reduced ? 'reduced' : 'full';
    }
    weakTarget() {
        return [this.gate, this.giantTree].find((item) => item.weakFrom(this.player, facingVectors[this.player.facing]));
    }
    get canWeakStrike() {
        return (this.weakStrikeUnlocked &&
            !this.finished &&
            !this.swing &&
            !this.slam.active &&
            !this.rush.active &&
            !this.weakStrike &&
            !this.forest.action &&
            this.energy.canUse('weakStrike') &&
            !!this.weakTarget());
    }
    startWeakStrike() {
        if (!this.canWeakStrike)
            return;
        const target = this.weakTarget();
        if (!this.energy.spend('weakStrike'))
            return;
        const { x, z, radius } = target.placement;
        const dx = x - this.player.x, dz = z - this.player.z, distance = Math.hypot(dx, dz);
        const aim = { x: dx / distance, z: dz / distance };
        this.player.facing = facingFor(aim);
        this.weakStrike = new WeakStrike({
            targetId: target.placement.id,
            aim,
            contact: { x: x - aim.x * radius, z: z - aim.z * radius },
        });
    }
    updateWeakStrike(dt) {
        const action = this.weakStrike;
        if (!action)
            return;
        if (action.update(dt)) {
            const { targetId, aim, contact } = action.snapshot;
            this.hitLarge(targetId, 'weakStrike', aim, contact);
        }
        if (action.finished)
            this.weakStrike = null;
    }
    hitLarge(id, source, aim, contact) {
        const large = [this.gate, this.giantTree].find((item) => item.placement.id === id);
        if (!large)
            return false;
        const hit = large.hit(source, aim);
        if (!hit)
            return false;
        const item = large.obstacle;
        this.impacts.push({ ...item, source, aim, contact, removed: hit.removed });
        if (!hit.removed)
            return true;
        if (source === 'normal')
            this.energy.recordHarvest();
        if (large === this.gate) {
            this.stone += large.placement.reward;
            this.groveUnlocked = true;
            this.groveEvents.push('grove-opened');
        }
        else
            this.wood += large.placement.reward;
        return true;
    }
    updateLargeObjects(dt) {
        this.gate.update(dt);
        if (this.giantTree.update(dt)) {
            for (const item of this.obstacles) {
                if (item.kind !== 'brush' ||
                    item.health <= 0 ||
                    !this.giantTree.clearsBrush(item, obstacleRadius(item)))
                    continue;
                this.destroyObstacle(item, {
                    source: this.giantTree.destructionSource ?? 'normal',
                    aim: this.giantTree.fallHeading,
                    contact: item,
                });
            }
        }
        // 조각의 표시와 충돌 시간을 맞추고 움직이는 조각 안에 선 캐릭터를 밀어낸다.
        for (const shape of this.gate.shapes(this.fragmentMotion)) {
            if (shape.kind !== 'polygon')
                continue;
            const next = pushOutsidePolygon({
                point: this.player,
                vertices: shape.vertices,
                radius: clearing.playerRadius,
            });
            this.player.x = next.x;
            this.player.z = next.z;
        }
    }
    startForestInteraction() {
        if (this.swing ||
            this.slam.active ||
            this.rush.active ||
            this.weakStrike ||
            this.forest.action)
            return;
        const target = this.forest.target(this.player);
        if (!target)
            return;
        this.forestWorkConsumed = true;
        if (target === 'hollow' &&
            this.forest.hollow.snapshot.phase === 'claimed') {
            this.forestEvents.push('hollow-empty');
            return;
        }
        if (!this.forest.begin(target, this.player))
            return;
        this.player.moving = false;
        this.player.facing =
            target === 'boulder'
                ? this.forest.boulder.snapshot.direction === 'east'
                    ? 'right'
                    : 'front'
                : 'back';
    }
    updateForest(dt) {
        const action = this.forest.action;
        // 고목의 자루를 꺼내는 첫 부분만 입구 쪽으로 가까이 선다.
        if (action?.kind === 'inspect' && action.progress < 0.3) {
            const anchor = {
                x: forestHollow.x,
                z: forestHollow.z + forestHollow.radius + clearing.playerRadius + 0.2,
            };
            const distance = Math.hypot(anchor.x - this.player.x, anchor.z - this.player.z);
            if (distance > 0)
                this.move({
                    x: (anchor.x - this.player.x) / distance,
                    z: (anchor.z - this.player.z) / distance,
                }, Math.min(distance, clearing.speed * dt));
        }
        const { segment, reward, events } = this.forest.update(dt);
        for (const event of events) {
            if (event === 'logging-yard-route-opened')
                this.groveEvents.push(event);
            else
                this.forestEvents.push(event);
        }
        if (reward) {
            this.wood += reward.wood;
            this.stone += reward.stone;
        }
        if (!segment)
            return;
        const size = Math.hypot(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
        const aim = size > 0
            ? {
                x: (segment.to.x - segment.from.x) / size,
                z: (segment.to.z - segment.from.z) / size,
            }
            : { x: 0, z: 1 };
        // 미리보기와 같은 선분·반경으로 판정하고 일반 자원의 보상만 지급한다.
        for (const item of this.obstacles) {
            if (item.health <= 0 ||
                segmentDistance(item, segment) >
                    boulderRules.radius + obstacleRadius(item))
                continue;
            this.destroyObstacle(item, { source: 'boulder', aim, contact: item });
        }
        this.avoidRollingBoulder(segment);
    }
    avoidRollingBoulder(segment) {
        const radius = boulderRules.radius + clearing.playerRadius;
        if (segmentDistance(this.player, segment) >= radius)
            return;
        const rock = this.forest.boulder.snapshot;
        const sides = [-1, 1].map((side) => rock.direction === 'south'
            ? { x: rock.x + side * (radius + 0.04), z: this.player.z }
            : { x: this.player.x, z: rock.z + side * (radius + 0.04) });
        sides.sort((a, b) => Math.hypot(a.x - this.player.x, a.z - this.player.z) -
            Math.hypot(b.x - this.player.x, b.z - this.player.z));
        const safe = sides.find((point) => this.canWalk(point));
        if (safe) {
            this.player.x = safe.x;
            this.player.z = safe.z;
        }
    }
    takeForestEvents() {
        const events = this.forestEvents;
        this.forestEvents = [];
        return events;
    }
    cancelSkillRequest() {
        this.energy.cancelRequest();
    }
    stopRush() {
        this.rush.reset();
    }
    takeSlams() {
        const events = this.slamImpacts;
        this.slamImpacts = [];
        return events;
    }
    takeLootEvents() {
        const events = this.lootEvents;
        this.lootEvents = [];
        return events;
    }
    takeDiscoveries() {
        const events = [...this.discovery.takeEvents(), ...this.groveEvents];
        this.groveEvents = [];
        return events;
    }
    takeImpacts() {
        const events = this.impacts;
        this.impacts = [];
        return events;
    }
    get snapshot() {
        const selected = this.swing && !this.swing.releasedForMovement
            ? this.swing.target
            : this.target();
        const target = selected?.kind === 'crate'
            ? undefined
            : this.harvestables.find((item) => item.id === selected?.id);
        const floatingItems = this.loot.snapshot;
        const crate = selected?.kind === 'crate'
            ? floatingItems.find((item) => item.id === selected.id)
            : undefined;
        return {
            forest: this.forest.snapshot(this.player, this.obstacles, obstacleRadius),
            grove: {
                unlocked: this.groveUnlocked,
                discovered: this.groveDiscovered,
                inside: this.groveUnlocked && this.player.x >= groveLayout.discoveryX,
            },
            player: { ...this.player },
            obstacles: this.harvestables.map((item) => ({ ...item })),
            targetId: !this.slam.active &&
                !this.rush.active &&
                !this.weakStrike &&
                !this.forest.action &&
                !this.forest.target(this.player) &&
                target &&
                (target.health > 0 || this.discovery.canPush(target.id))
                ? target.id
                : null,
            swing: this.swing && !this.swing.releasedForMovement
                ? this.swing.snapshot
                : null,
            wood: this.wood,
            stone: this.stone,
            removed: this.harvestables.filter(({ health }) => health === 0).length -
                Number(this.gate.rock.broken && this.gate.destructionSource === null) -
                this.initialRemoved,
            total: this.harvestables.length -
                this.initialRemoved -
                Number(this.gate.rock.broken && this.gate.destructionSource === null),
            discovery: this.discovery.snapshot,
            largeObjects: { gate: this.gate.rock, tree: this.giantTree.tree },
            weakStrike: {
                unlocked: this.weakStrikeUnlocked,
                targetId: this.weakTarget()?.placement.id ?? null,
                ready: this.canWeakStrike,
                action: this.weakStrike?.snapshot ?? null,
            },
            energy: this.energy.snapshot,
            slam: {
                ready: this.energy.canUse('slam') &&
                    !this.rush.active &&
                    !this.slam.active &&
                    !this.weakStrike &&
                    !this.forest.action,
                action: this.slam.snapshot,
            },
            rush: {
                ready: this.energy.canUse('rush') &&
                    !this.slam.active &&
                    !this.rush.active &&
                    !this.weakStrike &&
                    !this.forest.action,
                action: this.rush.snapshot,
            },
            floatingItems,
            crateTargetId: this.slam.active ||
                this.rush.active ||
                this.forest.action ||
                this.forest.target(this.player)
                ? null
                : (crate?.id ?? null),
        };
    }
}
