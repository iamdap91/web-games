import { RollingBoulder, boulderRules, segmentDistance, } from '../forest-interactions/rolling-boulder.js';
import { VineCurtain } from '../forest-interactions/vine-curtain.js';
import { HollowTree } from '../forest-interactions/hollow-tree.js';
import { forestClearingLayout, forestVine, forestHollow, insideLoggingYard, } from './forest-clearing-layout.js';
import { clearing } from './clearing-rules.js';
/** 상호작용 상태만 합성한다. 보상·플레이어·자원 파괴는 ClearingWorld의 책임이다. */
export class ForestGimmicks {
    boulder = new RollingBoulder(forestClearingLayout.route);
    vine;
    hollow;
    elapsed = 0;
    constructor(progress) {
        this.vine = new VineCurtain(progress?.vineOpened === true);
        this.hollow = new HollowTree(progress?.hollowClaimed === true);
    }
    get action() {
        const rock = this.boulder.snapshot;
        const vine = this.vine.snapshot;
        const hollow = this.hollow.snapshot;
        return rock.pushProgress !== null
            ? { kind: 'push', progress: rock.pushProgress }
            : vine.cutProgress !== null
                ? { kind: 'cut', progress: vine.cutProgress }
                : hollow.phase === 'searching'
                    ? { kind: 'inspect', progress: hollow.progress }
                    : null;
    }
    target(player) {
        if (this.action)
            return null;
        if (this.boulder.directionFrom(player))
            return 'boulder';
        if (!this.vine.snapshot.opened &&
            player.z > forestVine.z &&
            Math.abs(player.x - forestVine.x) < forestVine.halfWidth &&
            Math.hypot(player.x - forestVine.x, player.z - forestVine.z) < 1.9)
            return 'vine';
        if (this.vine.snapshot.passable &&
            player.z > forestHollow.z &&
            Math.hypot(player.x - forestHollow.x, player.z - forestHollow.z) < 1.9)
            return 'hollow';
        return null;
    }
    begin(target, player) {
        if (this.target(player) !== target)
            return false;
        if (target === 'boulder')
            return this.boulder.push(player);
        if (target === 'vine')
            return this.vine.cut();
        return this.hollow.inspect();
    }
    update(delta) {
        this.elapsed += delta;
        const vine = this.vine.snapshot;
        const rock = this.boulder.snapshot;
        this.vine.update(delta);
        const reward = this.hollow.update(delta);
        const segment = this.boulder.update(delta);
        const events = [];
        if (!vine.passable && this.vine.snapshot.passable)
            events.push('logging-yard-route-opened');
        if (reward)
            events.push('hollow-claimed');
        if (rock.phase !== 'stopped' && this.boulder.snapshot.phase === 'stopped')
            events.push('roll-completed');
        return { segment, reward, events };
    }
    blocks(point) {
        const r = clearing.playerRadius;
        const rock = this.boulder.snapshot;
        if (Math.hypot(point.x - rock.x, point.z - rock.z) <
            r + boulderRules.radius ||
            Math.hypot(point.x - forestHollow.x, point.z - forestHollow.z) <
                r + forestHollow.radius)
            return true;
        const p = forestVine.pocket;
        const near = point.x > p.minX - r &&
            point.x < p.maxX + r &&
            point.z > p.minZ - r &&
            point.z < p.maxZ + r;
        if (!near)
            return false;
        if (!this.vine.snapshot.passable)
            return true;
        return ((Math.abs(point.z - p.maxZ) < r &&
            Math.abs(point.x - forestVine.x) > forestVine.halfWidth - r) ||
            Math.abs(point.x - p.minX) < r ||
            (Math.abs(point.x - p.maxX) < r &&
                Math.abs(point.z - forestVine.eastExit.z) >
                    forestVine.eastExit.halfWidth - r) ||
            Math.abs(point.z - p.minZ) < r);
    }
    snapshot(player, obstacles, radiusFor) {
        const direction = this.boulder.directionFrom(player);
        return {
            insideLoggingYard: insideLoggingYard(player),
            rock: this.boulder.snapshot,
            vine: this.vine.snapshot,
            hollow: this.hollow.snapshot,
            elapsed: this.elapsed,
            action: this.action,
            target: this.target(player),
            pushDirection: direction,
            previewTargets: direction
                ? obstacles
                    .filter((item) => item.health > 0 &&
                    segmentDistance(item, {
                        from: forestClearingLayout.route.start,
                        to: forestClearingLayout.route.ends[direction],
                    }) <=
                        boulderRules.radius + radiusFor(item))
                    .map((item) => item.id)
                : [],
        };
    }
}
