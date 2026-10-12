import * as THREE from 'three';
import { segmentDistance } from '../../../prototypes/forest-interactions/rolling-boulder.js';
const clearingFloors = {
    wetland: 0x96a187,
    quarry: 0xb29c82,
    ruins: 0x9aab91,
    snow: 0xdbdfd6,
    coast: 0xc9bda0,
    bamboo: 0x9eab88,
    canyon: 0xbea28a,
    mill: 0x9dab90,
    garden: 0xb7b297,
    caldera: 0xa0a399,
};
/** 합쳐진 지형의 정점색으로만 식생과 발자취를 구분해 겹친 바닥의 깜빡임을 만들지 않는다. */
export function colorAtlasSurface(geometry, map, access) {
    const positions = geometry.getAttribute('position'), colors = [];
    const paths = map.routes.filter((r) => access.shortcutOpened || !r.shortcut);
    for (let i = 0; i < positions.count; i++) {
        const p = { x: positions.getX(i), z: positions.getZ(i) };
        let routeDistance = Infinity;
        for (const route of paths)
            for (let j = 1; j < route.points.length; j++) {
                routeDistance = Math.min(routeDistance, segmentDistance(p, {
                    from: route.points[j - 1],
                    to: route.points[j],
                }) / route.halfWidth);
            }
        const paved = map.id === 'ruins' && Math.abs(p.x) < 5.5 && p.z > 5 && p.z < 16;
        const cave = map.id === 'coast' && p.x > 3.5 && p.z > 9;
        const floor = new THREE.Color(paved ? 0xa9afa4 : cave ? 0x8e9590 : clearingFloors[map.id]);
        const path = new THREE.Color(cave ? 0x999d94 : map.style.ground.path);
        const t = 1 - THREE.MathUtils.smoothstep(routeDistance, 0.32, 0.9);
        floor.lerp(path, t);
        colors.push(floor.r, floor.g, floor.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}
