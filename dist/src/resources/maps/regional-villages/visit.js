import { facingFor } from '../../characters/ataho/facing.js';
import { dojoLayout, } from '../../facilities/dojo/dojo-layout.js';
import { villageGatePosts, villageShoreRocks, } from './maps.js';
import { insideVillageLand, insideFootprint } from './ground.js';
export const villageRules = {
    speed: 4.6,
    radius: dojoLayout.actor.radius,
    interactionDistance: 1.7,
    fireDuration: 15,
    bellDuration: 3,
};
function touches(point, area) {
    return (Math.hypot(Math.max(0, Math.abs(point.x - area.x) - area.width / 2), Math.max(0, Math.abs(point.z - area.z) - area.depth / 2)) < villageRules.radius);
}
export function villageCanWalk(map, point) {
    // 이어진 바닥 전체에서 발 반경을 검사해 해안과 부두의 접합부를 막지 않는다.
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const sample = {
            x: point.x + Math.cos(angle) * villageRules.radius,
            z: point.z + Math.sin(angle) * villageRules.radius,
        };
        if (!insideVillageLand(map, sample) &&
            !map.decks.some((area) => insideFootprint(sample, area)))
            return false;
    }
    if ([...map.buildings, ...map.furniture].some((building) => touches(point, building)))
        return false;
    for (const circle of [
        map.pool,
        map.hearth,
        ...map.solids,
        ...villageGatePosts(map),
        ...villageShoreRocks(map),
    ]) {
        if (circle &&
            Math.hypot(point.x - circle.x, point.z - circle.z) <
                circle.radius + villageRules.radius)
            return false;
    }
    return true;
}
/** 방문 중 이동·시설 확인·지역 연출을 소유한다. 본게임의 경제·저장과 연결하지 않는다. */
export class VillageVisit {
    map;
    position;
    facing = 'front';
    moving = false;
    visited = new Set();
    notice = null;
    noticeTime = 0;
    noticePoint = null;
    fire = 0;
    bell = 0;
    constructor(map) {
        this.map = map;
        this.position = { ...map.spawn };
    }
    get snapshot() {
        const nearby = this.map.points
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            villageRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0];
        return {
            player: { ...this.position, facing: this.facing, moving: this.moving },
            nearby: nearby?.id ?? null,
            visited: [...this.visited],
            notice: this.notice,
            noticePoint: this.noticePoint,
            fire: this.fire,
            bell: this.bell,
            springOpened: this.visited.has('spring'),
        };
    }
    stop() {
        this.moving = false;
    }
    walk(delta, input) {
        this.stop();
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const length = Math.hypot(input.x, input.z);
        if (!length)
            return;
        this.facing = facingFor(input);
        const previous = this.position;
        const distance = Math.min(delta, 0.05) * villageRules.speed;
        const steps = Math.ceil(distance / 0.05);
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
        this.moving =
            Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                0.00001;
    }
    move(point) {
        if (villageCanWalk(this.map, point))
            this.position = point;
    }
    interact() {
        const point = this.map.points.find((p) => p.id === this.snapshot.nearby);
        if (!point)
            return false;
        this.visited.add(point.id);
        this.notice = point.description;
        this.noticePoint = point.id;
        this.noticeTime = 6;
        if (point.effect === 'fire')
            this.fire = villageRules.fireDuration;
        if (point.effect === 'bell')
            this.bell = villageRules.bellDuration;
        this.facing = 'front';
        this.stop();
        return true;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime) {
            this.notice = null;
            this.noticePoint = null;
        }
        this.fire = Math.max(0, this.fire - step);
        this.bell = Math.max(0, this.bell - step);
    }
}
