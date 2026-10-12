import { dojoLayout } from '../../resources/facilities/dojo/dojo-layout.js';
import { segmentDistance } from '../../prototypes/forest-interactions/rolling-boulder.js';
import { trailDistance } from './trail-layout.js';
/** 길과 공터의 합집합. 합류부에 벽을 만들지 않고 그림도 같은 거리장을 사용한다. */
export function trailGroundDistance(layout, point, options = { shortcutOpened: true }) {
    let distance = -Infinity;
    for (const route of layout.routes) {
        if (route.shortcut && !options.shortcutOpened)
            continue;
        for (let i = 1; i < route.points.length; i++) {
            distance = Math.max(distance, route.halfWidth -
                segmentDistance(point, {
                    from: route.points[i - 1],
                    to: route.points[i],
                }));
        }
    }
    for (const clearing of layout.clearings)
        distance = Math.max(distance, clearing.radius - trailDistance(point, clearing));
    return Math.min(distance, point.z - (layout.entrance.z - 0.6));
}
/** 발 반경을 포함한 보행 영역. 열린 길의 합류부는 영역 전체에서 판정한다. */
export function trailCanOccupy(layout, point, access) {
    const radius = dojoLayout.actor.radius;
    if (trailGroundDistance(layout, point, access) < -0.0000001)
        return false;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        if (trailGroundDistance(layout, {
            x: point.x + Math.cos(angle) * radius,
            z: point.z + Math.sin(angle) * radius,
        }, access) < -0.0000001)
            return false;
    }
    if (layout.obstacles.some((obstacle) => trailDistance(point, obstacle) < obstacle.radius + radius))
        return false;
    if (layout.encounters.some((enemy) => !access.cleared.includes(enemy.id) &&
        trailDistance(point, enemy) < enemy.radius + radius))
        return false;
    return !layout.gates.some((gate) => !access.cleared.includes(gate.encounter) &&
        segmentDistance(point, gate) < radius + 0.08);
}
export function trailBounds(layout) {
    const points = layout.routes.flatMap((route) => route.points.map((point) => ({ ...point, radius: route.halfWidth })));
    points.push(...layout.clearings);
    return {
        minX: Math.min(...points.map((p) => p.x - p.radius)),
        maxX: Math.max(...points.map((p) => p.x + p.radius)),
        minZ: Math.min(...points.map((p) => p.z - p.radius)),
        maxZ: Math.max(...points.map((p) => p.z + p.radius)),
    };
}
/** 갈라진 길에서도 같은 지형 거리장으로 문양 장막의 가로 범위를 맞춘다. */
export function trailHorizontalSpan(layout, z) {
    const bounds = trailBounds(layout);
    let min = Infinity, max = -Infinity;
    for (let x = bounds.minX; x <= bounds.maxX; x += 0.05) {
        if (trailGroundDistance(layout, { x, z }) < 0)
            continue;
        min = Math.min(min, x);
        max = Math.max(max, x);
    }
    return min === Infinity
        ? null
        : { x: (min + max) / 2, halfWidth: (max - min) / 2 };
}
