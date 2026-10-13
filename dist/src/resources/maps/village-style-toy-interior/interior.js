import { groundHeight } from './layout.js';
export const toyRoom = { x: 0, z: -5.2, width: 5.2, depth: 3.2 };
export const roomFurniture = [
    { x: -1.25, z: -5.25, width: 1.1, depth: 0.8 },
    { x: 0, z: -6.35, width: 1.3, depth: 0.4 },
];
export function insideToyRoom(p) {
    return Math.abs(p.x) < 2.4 && Math.abs(p.z + 5.2) < 1.4;
}
export function toyRoomPassable(p) {
    const x = Math.abs(p.x), z = p.z + 5.2;
    if (x > 2.9 || Math.abs(z) > 1.9)
        return true;
    if (x > 2.15 || z < -1.18)
        return false;
    if (z > 1.18 && x > 0.49)
        return false;
    return !roomFurniture.some((b) => Math.hypot(Math.max(0, Math.abs(p.x - b.x) - b.width / 2), Math.max(0, Math.abs(p.z - b.z) - b.depth / 2)) < 0.3);
}
export function toyResident(time) {
    return {
        x: 1.25 + Math.sin(time * 0.65) * 0.25,
        z: -5.25 + Math.cos(time * 0.65) * 0.22,
    };
}
export function toyWalkHeight(p) {
    const floor = groundHeight(toyRoom) + 0.26;
    if (insideToyRoom(p))
        return floor;
    if (Math.abs(p.x) < 0.5 && p.z >= -3.8 && p.z <= -3.1) {
        const t = Math.min(1, Math.max(0, (-3.1 - p.z) / 0.7));
        return groundHeight(p) * (1 - t) + floor * t;
    }
    return groundHeight(p);
}
