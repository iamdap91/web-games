import { facingFor, } from '../overdrive-battle/combatant.js';
import { RollingBoulder, boulderRules, segmentDistance, } from './rolling-boulder.js';
import { VineCurtain, vineLayout } from './vine-curtain.js';
import { HollowTree, hollowLayout } from './hollow-tree.js';
export const forestRules = {
    playerRadius: 0.3,
    speed: 4,
    minX: -8,
    maxX: 8,
    minZ: -7,
    maxZ: 6.5,
};
export const forestTargets = [
    { id: 0, kind: 'brush', x: -4, z: 0, radius: 0.48 },
    { id: 1, kind: 'rock', x: -4, z: 1.9, radius: 0.6 },
    { id: 2, kind: 'brush', x: -4, z: 3.7, radius: 0.48 },
    { id: 3, kind: 'rock', x: -2.2, z: -2, radius: 0.6 },
    { id: 4, kind: 'brush', x: -0.4, z: -2, radius: 0.48 },
    { id: 5, kind: 'brush', x: -1.4, z: 2.7, radius: 0.48 },
];
/** 이번 체험의 위치·획득량·발견을 소유하고 각 상호작용의 결과를 연결한다. */
export class ForestWorld {
    player;
    facing = 'front';
    moving = false;
    boulder = new RollingBoulder();
    vine;
    hollow = new HollowTree();
    destroyed = new Map();
    wood = 0;
    stone = 0;
    elapsed = 0;
    chainCount = 0;
    chainHitAt = null;
    chainCompletedAt = null;
    discovered = false;
    discoveredAt = null;
    message = '바위를 밀어 길을 열거나, 오른쪽 덩굴을 걷어 보자.';
    constructor(trial = 'rolling') {
        this.player =
            trial === 'rolling'
                ? { x: -4, z: -3.7 }
                : trial === 'vine'
                    ? { x: 4, z: 0.5 }
                    : { x: 4.8, z: -3 };
        this.vine = new VineCurtain(trial === 'hollow');
        if (trial === 'vine')
            this.message = '덩굴 너머에서 희미한 빛이 새어 나온다.';
        if (trial === 'hollow') {
            this.discovered = true;
            this.message = '고목의 구멍 안에 낡은 천 조각이 보인다.';
        }
    }
    get snapshot() {
        const pushDirection = this.boulder.directionFrom(this.player);
        const rock = this.boulder.snapshot;
        const vine = this.vine.snapshot;
        const hollow = this.hollow.snapshot;
        const action = rock.pushProgress !== null
            ? { kind: 'push', progress: rock.pushProgress }
            : vine.cutProgress !== null
                ? { kind: 'cut', progress: vine.cutProgress }
                : hollow.phase === 'searching'
                    ? { kind: 'inspect', progress: hollow.progress }
                    : null;
        let target = null;
        if (action)
            target =
                action.kind === 'push'
                    ? 'rock'
                    : action.kind === 'cut'
                        ? 'vine'
                        : 'hollow';
        else if (pushDirection)
            target = 'rock';
        else if (!this.vine.snapshot.opened &&
            this.player.z > vineLayout.z &&
            Math.abs(this.player.x - vineLayout.x) < vineLayout.halfWidth &&
            Math.hypot(this.player.x - vineLayout.x, this.player.z - vineLayout.z) <
                1.9)
            target = 'vine';
        else if (this.vine.snapshot.passable &&
            Math.hypot(this.player.x - hollowLayout.x, this.player.z - hollowLayout.z) < 1.9 &&
            this.player.z > hollowLayout.z)
            target = 'hollow';
        return {
            player: { ...this.player, moving: this.moving, facing: this.facing },
            rock: this.boulder.snapshot,
            vine: this.vine.snapshot,
            hollow: this.hollow.snapshot,
            targets: forestTargets.map((t) => ({
                ...t,
                destroyedAt: this.destroyed.get(t.id) ?? null,
            })),
            target,
            pushDirection,
            action,
            canInteract: action === null &&
                target !== null &&
                !(target === 'hollow' && hollow.phase === 'claimed'),
            previewTargets: pushDirection
                ? forestTargets
                    .filter((t) => !this.destroyed.has(t.id) &&
                    segmentDistance(t, {
                        from: boulderRules.start,
                        to: boulderRules.ends[pushDirection],
                    }) <=
                        boulderRules.radius + t.radius)
                    .map((t) => t.id)
                : [],
            chain: {
                count: this.chainCount,
                lastHitAt: this.chainHitAt,
                completedAt: this.chainCompletedAt,
            },
            materials: { wood: this.wood, stone: this.stone },
            message: this.message,
            elapsed: this.elapsed,
            discovered: this.discovered,
            discoveredAt: this.discoveredAt,
        };
    }
    interact() {
        const state = this.snapshot;
        if (state.action)
            return false;
        const target = state.target;
        if (target === 'rock' && this.boulder.push(this.player)) {
            this.facing =
                this.boulder.snapshot.direction === 'east' ? 'right' : 'front';
            this.chainCount = 0;
            this.chainHitAt = null;
            this.chainCompletedAt = null;
            this.message = '힘을 실어 바위를 밀어낸다…';
        }
        else if (target === 'vine' && this.vine.cut()) {
            this.facing = 'back';
            this.message = '엉킨 덩굴을 걷어낸다…';
        }
        else if (target === 'hollow') {
            this.facing = 'back';
            if (!this.hollow.inspect()) {
                this.message = '고목 안은 이제 비어 있다.';
                return false;
            }
            this.message = '안쪽에 낡은 채집 자루가 있다…';
        }
        else
            return false;
        this.moving = false;
        return true;
    }
    returnRock() {
        if (Math.hypot(this.player.x - boulderRules.start.x, this.player.z - boulderRules.start.z) <
            boulderRules.radius + forestRules.playerRadius) {
            this.message = '바위가 돌아올 자리를 비워 줘.';
            return false;
        }
        if (!this.boulder.returnToStart())
            return false;
        this.message = '바위만 되돌렸다. 반대쪽에서도 밀어 보자.';
        return true;
    }
    update(delta, input = { x: 0, z: 0 }) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        this.elapsed += delta;
        const busy = this.snapshot.action !== null;
        const oldVine = this.vine.snapshot;
        const previousRock = this.boulder.snapshot;
        if (this.hollow.snapshot.phase === 'searching' &&
            this.hollow.snapshot.progress < 0.3) {
            this.approachHollow(Math.min(delta, hollowLayout.inspectSeconds * 0.3));
        }
        this.vine.update(delta);
        if (this.vine.snapshot.hits > oldVine.hits)
            this.message = this.vine.snapshot.opened
                ? '덩굴 사이로 숨은 공터가 드러난다…'
                : '덩굴이 끊어지며 안쪽 빛이 더 선명해진다.';
        const reward = this.hollow.update(delta);
        if (reward) {
            this.wood += reward.wood;
            this.stone += reward.stone;
            this.message = '옛 채집꾼이 남긴 자루를 발견했다. 목재 +2 · 돌 +2';
        }
        const segment = this.boulder.update(delta);
        if (segment)
            for (const target of forestTargets) {
                if (this.destroyed.has(target.id) ||
                    segmentDistance(target, segment) > boulderRules.radius + target.radius)
                    continue;
                this.destroyed.set(target.id, this.elapsed);
                this.chainCount++;
                this.chainHitAt = this.elapsed;
                if (target.kind === 'brush')
                    this.wood++;
                else
                    this.stone++;
                this.message =
                    this.chainCount > 1
                        ? `${this.chainCount}연쇄! 길이 열린다.`
                        : '첫 장애물이 부서졌다.';
            }
        if (segment &&
            previousRock.phase !== 'stopped' &&
            this.boulder.snapshot.phase === 'stopped') {
            this.chainCompletedAt = this.elapsed;
            this.message =
                this.chainCount > 0
                    ? `${this.chainCount}곳을 한 번에 정리했다.`
                    : '이미 정리된 길이다. 바위를 되돌려 다른 쪽도 밀어 보자.';
        }
        if (segment)
            this.avoidRollingBoulder(segment);
        this.moving = false;
        const length = Math.hypot(input.x, input.z);
        if (!busy && length > 0) {
            const direction = { x: input.x / length, z: input.z / length };
            this.facing = facingFor(direction);
            // 큰 프레임과 대각선 이동도 얇은 장막·줄기를 건너뛰지 못한다.
            const steps = Math.ceil(delta / 0.025);
            for (let i = 0; i < steps; i++) {
                const distance = (forestRules.speed * delta) / steps;
                for (const axis of ['x', 'z']) {
                    const next = {
                        ...this.player,
                        [axis]: this.player[axis] + direction[axis] * distance,
                    };
                    if (this.canStand(next)) {
                        this.moving ||= direction[axis] !== 0;
                        this.player = next;
                    }
                }
            }
        }
        if (!this.discovered &&
            this.vine.snapshot.passable &&
            this.player.x > vineLayout.pocket.minX &&
            this.player.x < vineLayout.pocket.maxX &&
            this.player.z < -1.5) {
            this.discovered = true;
            this.discoveredAt = this.elapsed;
            this.message = '작은 공터를 찾았다. 오래된 고목에 무언가 남아 있다.';
        }
    }
    approachHollow(delta) {
        const anchor = {
            x: hollowLayout.x,
            z: hollowLayout.z + hollowLayout.radius + forestRules.playerRadius + 0.2,
        };
        const distance = Math.hypot(anchor.x - this.player.x, anchor.z - this.player.z);
        if (distance === 0)
            return;
        const amount = Math.min(distance, delta * forestRules.speed);
        const next = {
            x: this.player.x + ((anchor.x - this.player.x) * amount) / distance,
            z: this.player.z + ((anchor.z - this.player.z) * amount) / distance,
        };
        if (this.canStand(next))
            this.player = next;
    }
    avoidRollingBoulder(segment) {
        const radius = boulderRules.radius + forestRules.playerRadius;
        if (segmentDistance(this.player, segment) >= radius)
            return;
        const rock = this.boulder.snapshot;
        const sides = [-1, 1].map((side) => rock.direction === 'south'
            ? { x: rock.x + side * (radius + 0.025), z: this.player.z }
            : { x: this.player.x, z: rock.z + side * (radius + 0.025) });
        sides.sort((a, b) => Math.hypot(a.x - this.player.x, a.z - this.player.z) -
            Math.hypot(b.x - this.player.x, b.z - this.player.z));
        const safe = sides.find((point) => this.canStand(point));
        if (safe)
            this.player = safe;
    }
    canStand(point) {
        const r = forestRules.playerRadius;
        if (point.x < forestRules.minX + r ||
            point.x > forestRules.maxX - r ||
            point.z < forestRules.minZ + r ||
            point.z > forestRules.maxZ - r)
            return false;
        const rock = this.boulder.snapshot;
        if (Math.hypot(point.x - rock.x, point.z - rock.z) <
            r + boulderRules.radius)
            return false;
        if (Math.hypot(point.x - hollowLayout.x, point.z - hollowLayout.z) <
            r + hollowLayout.radius)
            return false;
        if (forestTargets.some((t) => !this.destroyed.has(t.id) &&
            Math.hypot(point.x - t.x, point.z - t.z) < r + t.radius))
            return false;
        const p = vineLayout.pocket;
        const nearPocket = point.x > p.minX - r &&
            point.x < p.maxX + r &&
            point.z > p.minZ - r &&
            point.z < p.maxZ + r;
        if (!nearPocket)
            return true;
        if (!this.vine.snapshot.passable)
            return false;
        // 입구 외의 숲 테두리는 장막을 걷은 뒤에도 남는다.
        if (Math.abs(point.z - p.maxZ) < r &&
            Math.abs(point.x - vineLayout.x) > vineLayout.halfWidth - r)
            return false;
        if (Math.abs(point.x - p.minX) < r ||
            Math.abs(point.x - p.maxX) < r ||
            Math.abs(point.z - p.minZ) < r)
            return false;
        return true;
    }
}
