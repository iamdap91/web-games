import { facingFor } from '../../characters/ataho/facing.js';
export const campActorRadius = 9;
const walkingSpeed = 96;
const footSamples = Array.from({ length: 8 }, (_, index) => ({
    x: Math.cos((index * Math.PI) / 4) * campActorRadius,
    y: Math.sin((index * Math.PI) / 4) * campActorRadius,
}));
function inRect(point, rect) {
    return (point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height);
}
function touchesRect(point, rect) {
    const x = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
    const y = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
    return Math.hypot(point.x - x, point.y - y) < campActorRadius;
}
/** 네 꼭짓점의 물 비중을 보간해 dual-grid 타일의 둥근 둑과 판정을 맞춘다. */
export function isCampWater(map, point) {
    const tx = point.x / map.tileSize;
    const ty = point.y / map.tileSize;
    const column = Math.min(map.width - 1, Math.max(0, Math.floor(tx)));
    const row = Math.min(map.height - 1, Math.max(0, Math.floor(ty)));
    const fx = Math.max(0, Math.min(1, tx - column));
    const fy = Math.max(0, Math.min(1, ty - row));
    const water = (x, y) => Number(map.terrain[y]?.[x] === 'water');
    return (water(column, row) * (1 - fx) * (1 - fy) +
        water(column + 1, row) * fx * (1 - fy) +
        water(column, row + 1) * (1 - fx) * fy +
        water(column + 1, row + 1) * fx * fy >=
        0.5);
}
export function isCampWalkable(map, position) {
    const width = map.width * map.tileSize;
    const height = map.height * map.tileSize;
    if (position.x < campActorRadius ||
        position.y < campActorRadius ||
        position.x > width - campActorRadius ||
        position.y > height - campActorRadius)
        return false;
    if (map.objects.some((object) => object.footprint && touchesRect(position, object.footprint)))
        return false;
    return [{ x: 0, y: 0 }, ...footSamples].every((offset) => {
        const point = { x: position.x + offset.x, y: position.y + offset.y };
        return (!isCampWater(map, point) ||
            map.bridges.some((bridge) => inRect(point, bridge)));
    });
}
/** 아타호의 발밑 보행과 발견 상태를 소유하며 화면·시간 루프에는 의존하지 않는다. */
export class HerbalistCamp {
    map;
    position;
    facing = 'back';
    moving = false;
    distance = 0;
    visited = new Set();
    message = '흙길을 따라 야영지에 들른 뒤, 다리 너머 약초밭을 찾아보세요.';
    constructor(map) {
        this.map = map;
        if (!isCampWalkable(map, map.spawn))
            throw new Error('맵 입구에 걸을 공간이 없습니다.');
        this.position = { ...map.spawn };
    }
    get snapshot() {
        return {
            position: { ...this.position },
            facing: this.facing,
            moving: this.moving,
            distance: this.distance,
            nearby: this.nearby(),
            visited: [...this.visited],
            message: this.message,
        };
    }
    update(delta, direction) {
        this.moving = false;
        const magnitude = Math.hypot(direction.x, direction.y);
        if (magnitude > 0 && delta > 0) {
            const heading = {
                x: direction.x / magnitude,
                y: direction.y / magnitude,
            };
            this.facing = facingFor({ x: heading.x, z: heading.y });
            const length = walkingSpeed * delta;
            // 큰 프레임 간격에도 좁은 나무나 둑을 건너뛰지 않게 발 반경보다 작게 나눈다.
            const count = Math.ceil(length / (campActorRadius / 2));
            for (let index = 0; index < count; index += 1) {
                const previous = this.position;
                const dx = (heading.x * length) / count;
                const dy = (heading.y * length) / count;
                const horizontal = { x: this.position.x + dx, y: this.position.y };
                if (isCampWalkable(this.map, horizontal))
                    this.position = horizontal;
                const vertical = { x: this.position.x, y: this.position.y + dy };
                if (isCampWalkable(this.map, vertical))
                    this.position = vertical;
                const moved = Math.hypot(this.position.x - previous.x, this.position.y - previous.y);
                this.distance += moved;
                if (moved > 0.001)
                    this.moving = true;
            }
        }
        const nearby = this.nearby();
        if (nearby && !this.visited.has(nearby.id)) {
            this.visited.add(nearby.id);
            this.message = `${nearby.label}에 도착했어요. Space나 살펴보기를 누르면 가까이 볼 수 있어요.`;
        }
    }
    inspect() {
        const nearby = this.nearby();
        this.message = nearby
            ? nearby.text
            : '모닥불이나 약초밭 가까이에서 살펴보세요.';
    }
    reset() {
        this.position = { ...this.map.spawn };
        this.facing = 'back';
        this.moving = false;
        this.message = '숲길 입구로 돌아왔어요.';
    }
    nearby() {
        return (this.map.landmarks.find((landmark) => Math.hypot(this.position.x - landmark.x, this.position.y - landmark.y) <= landmark.radius) ?? null);
    }
}
