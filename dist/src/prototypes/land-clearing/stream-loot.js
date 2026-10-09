import { streamLootIds } from './clearing-progress.js';
import { discoveryLayout } from './clearing-discovery.js';
export const streamLootRules = {
    speed: 1.05,
    pickupReach: 1.3,
    crateRadius: 0.34,
    branchRadius: 0.15,
    delays: [0.8, 1.7, 2.6, 3.8],
    crateReward: { wood: 2, stone: 2 },
};
/** 한 번 흘러나오는 물건의 이동·걸림·획득과 상자 보상을 소유한다. */
export class StreamLoot {
    bankLimitX;
    age = null;
    items = [];
    events = [];
    constructor(bankLimitX) {
        this.bankLimitX = bankLimitX;
    }
    release() {
        if (this.age !== null)
            return;
        this.age = 0;
        this.items = streamLootIds.map((id) => ({
            id,
            releaseAt: streamLootRules.delays[id],
            kind: id === 3 ? 'crate' : 'branch',
            x: discoveryLayout.source.x + 0.35,
            z: discoveryLayout.channel.z + 0.22 + ((id % 3) - 1) * 0.12,
            caught: null,
            collected: false,
        }));
    }
    restore({ springOpened, claimedLoot, }) {
        this.reset();
        if (!springOpened)
            return;
        this.release();
        this.age = Math.max(...streamLootRules.delays);
        for (const item of this.items) {
            item.collected = claimedLoot.some((id) => id === item.id);
            item.x = this.shoreX(item.id);
            item.z = this.shoreZ(item.id);
            item.caught = 'bank';
        }
    }
    get claimedLoot() {
        return this.items.filter((item) => item.collected).map((item) => item.id);
    }
    shoreX(id) {
        return this.bankLimitX - 1.6 + id * 0.4;
    }
    shoreZ(id) {
        return discoveryLayout.channel.z + 0.22 + ((id % 3) - 1) * 0.12 + 0.34;
    }
    active(item) {
        return this.age !== null && this.age >= item.releaseAt && !item.collected;
    }
    bridgeStop(item, nextX, logs) {
        let stop = null;
        const radius = item.kind === 'crate'
            ? streamLootRules.crateRadius
            : streamLootRules.branchRadius;
        for (const log of logs) {
            if (!log.ready || !log.spanning || Math.abs(log.aim.z) < 0.001)
                continue;
            const along = (item.z - log.origin.z) / log.aim.z;
            if (along < 0 || along > log.length)
                continue;
            const center = log.origin.x + along * log.aim.x;
            const margin = (discoveryLayout.bridgeWidth / 2 + radius) / Math.abs(log.aim.z);
            const entry = center - margin;
            // 프레임 사이에 통나무를 통과하거나 물건 위로 다리가 착지해도 한 번 잡힌다.
            if (nextX >= entry &&
                item.x <= center + margin &&
                (stop === null || entry < stop))
                stop = entry;
        }
        return stop;
    }
    update(dt, player, logs) {
        if (this.age === null || !Number.isFinite(dt) || dt <= 0)
            return;
        const before = this.age;
        this.age += dt;
        for (const item of this.items) {
            if (!this.active(item))
                continue;
            if (item.caught === null) {
                const activeTime = this.age - Math.max(before, item.releaseAt);
                const shoreX = this.shoreX(item.id);
                const nextX = Math.min(shoreX, item.x + streamLootRules.speed * activeTime);
                const stop = this.bridgeStop(item, nextX, logs);
                if (stop !== null) {
                    item.x = stop;
                    item.caught = 'bridge';
                }
                else {
                    item.x = nextX;
                    const nearShore = Math.max(0, Math.min(1, (item.x - (shoreX - 1.5)) / 1.5));
                    item.z = this.shoreZ(item.id) - (1 - nearShore) * 0.34;
                    if (item.x >= shoreX)
                        item.caught = 'bank';
                }
            }
            if (item.kind === 'branch' &&
                Math.hypot(player.x - item.x, player.z - item.z) <=
                    streamLootRules.pickupReach) {
                item.collected = true;
                this.events.push({
                    type: 'pickup',
                    id: item.id,
                    x: item.x,
                    z: item.z,
                    material: 'wood',
                    amount: 1,
                });
            }
        }
    }
    openCrate(id) {
        const item = this.items.find((item) => item.id === id && item.kind === 'crate' && this.active(item));
        if (!item)
            return false;
        item.collected = true;
        this.events.push({ type: 'opened', id, x: item.x, z: item.z });
        for (const material of ['wood', 'stone'])
            this.events.push({
                type: 'pickup',
                id,
                x: item.x,
                z: item.z,
                material,
                amount: streamLootRules.crateReward[material],
            });
        return true;
    }
    get snapshot() {
        return this.items
            .filter((item) => this.active(item))
            .map(({ id, kind, x, z, caught }) => ({ id, kind, x, z, caught }));
    }
    takeEvents() {
        const events = this.events;
        this.events = [];
        return events;
    }
    reset() {
        this.age = null;
        this.items = [];
        this.events = [];
    }
}
