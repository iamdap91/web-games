export const horizonRoom = { x: -6, z: -19, w: 3.1, d: 2.8 };
export const horizonFurniture = {
    x: -6.9,
    z: -19.4,
    w: 0.75,
    d: 0.65,
};
export function insideHorizonRoom(p) {
    return Math.abs(p.x + 6) < 1.4 && Math.abs(p.z + 19) < 1.3;
}
export function horizonRoomOpen(p) {
    return insideHorizonRoom(p) || Math.hypot(p.x + 6, p.z + 17.35) < 2.1;
}
export function canWalkRoom(p) {
    const dx = Math.abs(p.x + 6), dz = p.z + 19;
    if (dx > 1.9 || Math.abs(dz) > 1.75)
        return true;
    if (dx > 1.1 || dz < -0.95)
        return false;
    if (dz > 0.95 && dx > 0.52)
        return false;
    return (Math.hypot(Math.max(0, Math.abs(p.x - horizonFurniture.x) - horizonFurniture.w / 2), Math.max(0, Math.abs(p.z - horizonFurniture.z) - horizonFurniture.d / 2)) >= 0.3);
}
export function horizonResident(time) {
    return {
        x: -5.45 + Math.sin(time * 0.5) * 0.15,
        z: -19.25 + Math.cos(time * 0.5) * 0.15,
    };
}
