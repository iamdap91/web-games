import { segmentDistance } from '../../../prototypes/forest-interactions/rolling-boulder.js';
export function insideFootprint(point, area) {
    return (Math.abs(point.x - area.x) <= area.width / 2 &&
        Math.abs(point.z - area.z) <= area.depth / 2);
}
/** 같은 해안선·눈 둔덕 안쪽을 표시와 보행이 공유한다. */
export function insideVillageLand(map, point) {
    let inside = false;
    for (let i = 0, j = map.boundary.length - 1; i < map.boundary.length; j = i++) {
        const a = map.boundary[i], b = map.boundary[j];
        if (a.z > point.z !== b.z > point.z &&
            point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x)
            inside = !inside;
    }
    return inside;
}
export function villagePathDistance(map, point) {
    let distance = -Infinity;
    for (const path of map.paths) {
        const radius = Math.min(path.width, path.depth) / 2;
        const x = path.width / 2 - radius, z = path.depth / 2 - radius;
        distance = Math.max(distance, radius -
            segmentDistance(point, {
                from: { x: path.x - x, z: path.z - z },
                to: { x: path.x + x, z: path.z + z },
            }));
    }
    for (const plaza of map.plazas)
        distance = Math.max(distance, plaza.radius - Math.hypot(point.x - plaza.x, point.z - plaza.z));
    return distance;
}
export function villageShoreDistance(map, point) {
    return Math.min(...map.boundary.map((from, i) => segmentDistance(point, {
        from,
        to: map.boundary[(i + 1) % map.boundary.length],
    })));
}
