import { surveyRadius } from './point-models.js';
import { atlasStructures, atlasHotSpring, atlasDeckRules, atlasMillWheel, } from './architecture.js';
import { facingFor } from '../../characters/ataho/facing.js';
import { dojoLayout, } from '../../facilities/dojo/dojo-layout.js';
import { trailGroundDistance } from '../../../games/tiger-rpg/trail-topology.js';
import { trailDistance, trailRules, } from '../../../games/tiger-rpg/trail-layout.js';
import { segmentDistance } from '../../../prototypes/forest-interactions/rolling-boulder.js';
export function atlasCanWalk(map, point, access) {
    const radius = dojoLayout.actor.radius;
    if (trailGroundDistance(map, point, access) < 0)
        return false;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        if (trailGroundDistance(map, {
            x: point.x + Math.cos(angle) * radius,
            z: point.z + Math.sin(angle) * radius,
        }, access) < -0.0000001)
            return false;
    }
    if (map.obstacles.some((obstacle) => trailDistance(point, obstacle) < radius + obstacle.radius))
        return false;
    if (map.walls.some((wall) => segmentDistance(point, wall) < wall.width / 2 + radius))
        return false;
    if (map.id === 'snow' &&
        trailDistance(point, atlasHotSpring) < atlasHotSpring.radius + radius)
        return false;
    if (map.id === 'mill') {
        const dx = Math.max(0, Math.abs(point.x - atlasMillWheel.x) -
            atlasMillWheel.radius -
            atlasMillWheel.rim);
        const dz = Math.max(0, Math.abs(point.z - atlasMillWheel.z) - atlasMillWheel.depth / 2);
        if (Math.hypot(dx, dz) < radius)
            return false;
    }
    if (atlasStructures(map.id).some((object) => {
        if (object.kind === 'rock')
            return trailDistance(point, object) < object.radius + radius;
        if (object.occupancy !== 'solid')
            return false;
        const dx = Math.max(0, Math.abs(point.x - object.x) - object.width / 2);
        const dz = Math.max(0, Math.abs(point.z - object.z) - object.depth / 2);
        return Math.hypot(dx, dz) < radius;
    }))
        return false;
    for (const bridge of map.bridges) {
        if (bridge.shortcut && !access.shortcutOpened)
            continue;
        const dx = bridge.to.x - bridge.from.x, dz = bridge.to.z - bridge.from.z, length = Math.hypot(dx, dz);
        const px = point.x - bridge.from.x, pz = point.z - bridge.from.z;
        const along = (px * dx + pz * dz) / length, side = Math.abs((px * dz - pz * dx) / length);
        const gap = atlasDeckRules.span * atlasDeckRules.postGap;
        const post = Math.round(along / gap) * gap;
        if (post >= 0 &&
            post < length &&
            Math.hypot(along - post, side - bridge.width / 2) <
                radius + atlasDeckRules.postWidth * Math.SQRT1_2)
            return false;
    }
    return !map.points.some((target) => trailDistance(point, target) < radius + surveyRadius(target));
}
/** 답사 방문의 입력·조사·경로 개방을 소유한다. 본게임의 완료·보상·저장과 연결하지 않는다. */
export class AtlasVisit {
    map;
    position;
    facing = 'front';
    moving = false;
    surveyed = new Set();
    shortcutOpened;
    opening;
    action = null;
    notice = null;
    noticeTime = 0;
    returned = false;
    constructor(map, progress) {
        this.map = map;
        this.position = { ...map.spawn };
        progress?.surveyed.forEach((id) => {
            if (map.points.some((p) => p.id === id))
                this.surveyed.add(id);
        });
        this.shortcutOpened = progress?.shortcutOpened === true;
        this.opening = this.shortcutOpened ? 1 : 0;
    }
    get snapshot() {
        const target = this.map.points
            .filter((p) => !this.surveyed.has(p.id))
            .sort((a, b) => trailDistance(this.position, a) - trailDistance(this.position, b))[0];
        return {
            player: { ...this.position, facing: this.facing, moving: this.moving },
            surveyed: [...this.surveyed],
            shortcutOpened: this.shortcutOpened,
            opening: this.opening,
            nearby: target &&
                trailDistance(this.position, target) <= trailRules.interactionDistance
                ? target.id
                : null,
            action: this.action
                ? { point: this.action.point, progress: this.action.elapsed / 0.85 }
                : null,
            notice: this.notice,
            canReturn: trailDistance(this.position, this.map.entrance) <=
                trailRules.exitInteractionDistance,
            complete: this.map.points
                .filter((p) => p.kind !== 'cache')
                .every((p) => this.surveyed.has(p.id)) && this.shortcutOpened,
            returned: this.returned,
        };
    }
    stop() {
        this.moving = false;
    }
    walk(delta, input) {
        this.stop();
        if (this.action ||
            this.returned ||
            !Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const length = Math.hypot(input.x, input.z);
        if (!length)
            return;
        this.facing = facingFor(input);
        const previous = this.position;
        const distance = Math.min(delta, 0.05) * trailRules.walkSpeed;
        const steps = Math.ceil(distance / 0.06);
        for (let i = 0; i < steps; i++) {
            this.move({
                x: this.position.x + ((input.x / length) * distance) / steps,
                z: this.position.z,
            });
            this.move({
                x: this.position.x,
                z: this.position.z + ((input.z / length) * distance) / steps,
            });
        }
        this.moving = trailDistance(previous, this.position) > 0.00001;
    }
    move(point) {
        if (atlasCanWalk(this.map, point, { shortcutOpened: this.shortcutOpened }))
            this.position = point;
    }
    interact() {
        const { nearby } = this.snapshot;
        if (!nearby ||
            this.action ||
            this.returned ||
            (this.opening > 0 && !this.shortcutOpened))
            return false;
        this.action = { point: nearby, elapsed: 0 };
        this.facing = 'front';
        this.stop();
        return true;
    }
    update(delta) {
        if (this.returned || !Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
        if (this.surveyed.has(this.map.shortcut.point) && !this.shortcutOpened) {
            this.opening = Math.min(1, this.opening + step / 0.8);
            if (this.opening === 1)
                this.shortcutOpened = true;
        }
        if (!this.action)
            return;
        this.action.elapsed += step;
        if (this.action.elapsed < 0.85)
            return;
        const point = this.map.points.find((p) => p.id === this.action?.point);
        this.surveyed.add(point.id);
        this.action = null;
        this.notice = point.description;
        this.noticeTime = 4;
    }
    returnToEntrance() {
        if (this.action ||
            !this.snapshot.canReturn ||
            (this.opening > 0 && !this.shortcutOpened))
            return false;
        this.stop();
        this.returned = true;
        this.notice = this.snapshot.complete
            ? '답사를 마쳤다. 다음 방문에도 열린 길을 이용할 수 있다.'
            : '답사 기록을 가지고 입구로 돌아왔다.';
        return true;
    }
}
