import { treeShape } from '../../rendering/tree-shape.js';
import { treeFallDuration } from './tree-fall.js';
export const discoveryLayout = {
    source: { id: 10, x: -6.4, z: -5.2, radius: 0.9 },
    channel: { z: -5.2, halfWidth: 0.85, minX: -11, maxX: 11 },
    flowDuration: 2.8,
    bridgeWidth: 0.82,
    bankMargin: 0.2,
};
const clamp = (value) => Math.max(0, Math.min(1, value));
export function streamFill(x, age) {
    if (age === null)
        return 0;
    const { source, channel, flowDuration } = discoveryLayout;
    const maxDistance = Math.max(source.x - channel.minX, channel.maxX - source.x);
    const arrival = (Math.abs(x - source.x) / maxDistance) * (flowDuration - 0.3);
    return clamp((age - arrival) / 0.3);
}
/** 쓰러진 통나무의 방향 전환·착지와 다리 통행 범위를 소유한다. */
class TreeBridge {
    id;
    origin;
    bankLimitX;
    age = 0;
    duration = treeFallDuration;
    heading;
    previousHeading;
    announced = false;
    length;
    constructor(id, origin, direction, scale, bankLimitX) {
        this.id = id;
        this.origin = origin;
        this.bankLimitX = bankLimitX;
        this.heading = Math.atan2(direction.z, direction.x);
        this.previousHeading = this.heading;
        this.length =
            (treeShape.crowns.at(-1).y + treeShape.crownHeight / 2) * scale;
    }
    get ready() {
        return this.age >= this.duration;
    }
    get aim() {
        return { x: Math.cos(this.heading), z: Math.sin(this.heading) };
    }
    get spanning() {
        const { channel, bankMargin } = discoveryLayout;
        const end = {
            x: this.origin.x + this.aim.x * this.length,
            z: this.origin.z + this.aim.z * this.length,
        };
        return (this.origin.z >= channel.z + channel.halfWidth + bankMargin &&
            end.z <= channel.z - channel.halfWidth - bankMargin &&
            Math.abs(end.x) <= this.bankLimitX);
    }
    restoreSettled() {
        this.age = this.duration;
        this.previousHeading = this.heading;
        this.announced = this.spanning;
    }
    push(direction) {
        if (!this.ready || this.spanning)
            return;
        this.previousHeading = this.heading;
        const target = Math.atan2(direction.z, direction.x);
        this.heading += Math.atan2(Math.sin(target - this.heading), Math.cos(target - this.heading));
        this.age = 0;
        this.duration = 0.38;
    }
    update(dt) {
        this.age = Math.min(this.duration, this.age + dt);
        if (!this.ready || !this.spanning || this.announced)
            return false;
        this.announced = true;
        return true;
    }
    supports(point) {
        if (!this.ready || !this.spanning)
            return false;
        const dx = point.x - this.origin.x;
        const dz = point.z - this.origin.z;
        const along = dx * this.aim.x + dz * this.aim.z;
        const across = Math.abs(dx * this.aim.z - dz * this.aim.x);
        // 몸 전체보다 발 디딜 폭을 사용해 통나무 위에서 정밀 조작을 강요하지 않는다.
        return (along >= -0.3 &&
            along <= this.length + 0.3 &&
            across <= discoveryLayout.bridgeWidth / 2);
    }
    get snapshot() {
        const progress = clamp(this.age / this.duration);
        const eased = progress * progress * (3 - 2 * progress);
        const angle = this.previousHeading + (this.heading - this.previousHeading) * eased;
        return {
            id: this.id,
            origin: this.origin,
            aim: { x: Math.cos(angle), z: Math.sin(angle) },
            length: this.length,
            progress: this.duration === treeFallDuration ? progress : 1,
            ready: this.ready,
            spanning: this.spanning,
        };
    }
}
/** 샘물 발견과 물길을 건너는 작은 진행을 소유한다. */
export class ClearingDiscovery {
    bankLimitX;
    springAge = null;
    logs = new Map();
    crossed = false;
    events = [];
    constructor(bankLimitX) {
        this.bankLimitX = bankLimitX;
    }
    openSpring() {
        if (this.springAge !== null)
            return;
        this.springAge = 0;
        this.events.push('spring-opened');
    }
    fellTree(id, origin, direction, scale) {
        this.logs.set(id, new TreeBridge(id, { x: origin.x, z: origin.z }, direction, scale, this.bankLimitX));
    }
    restore(progress, trees) {
        this.reset();
        this.springAge = progress.springOpened
            ? discoveryLayout.flowDuration + 1
            : null;
        this.crossed = progress.flowerBankReached;
        for (const saved of progress.fallenTrees) {
            const tree = trees.find((tree) => tree.id === saved.id);
            if (!tree)
                continue;
            const log = new TreeBridge(tree.id, { ...tree.origin }, saved.direction, tree.scale, this.bankLimitX);
            log.restoreSettled();
            this.logs.set(tree.id, log);
        }
    }
    canPush(id) {
        const log = this.logs.get(id);
        return !!log && log.ready && !log.spanning;
    }
    pushLog(id, direction) {
        this.logs.get(id)?.push(direction);
    }
    canWalk(point, radius) {
        const channel = discoveryLayout.channel;
        if (Math.abs(point.z - channel.z) >= channel.halfWidth + radius)
            return true;
        return [...this.logs.values()].some((log) => log.supports(point));
    }
    update(dt, player) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        if (this.springAge !== null)
            this.springAge = Math.min(discoveryLayout.flowDuration + 1, this.springAge + dt);
        for (const log of this.logs.values())
            if (log.update(dt))
                this.events.push('bridge-ready');
        if (!this.crossed &&
            player.z <
                discoveryLayout.channel.z -
                    discoveryLayout.channel.halfWidth -
                    discoveryLayout.bankMargin) {
            this.crossed = true;
            this.events.push('bank-reached');
        }
    }
    takeEvents() {
        const events = this.events;
        this.events = [];
        return events;
    }
    get snapshot() {
        return {
            springAge: this.springAge,
            logs: [...this.logs.values()].map((log) => log.snapshot),
            crossed: this.crossed,
        };
    }
    reset() {
        this.springAge = null;
        this.logs.clear();
        this.crossed = false;
        this.events = [];
    }
}
