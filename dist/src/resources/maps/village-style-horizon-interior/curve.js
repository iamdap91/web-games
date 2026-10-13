export const horizonRadius = 18;
/** 보행은 평면에 남기고 표시만 같은 원통 표면으로 옮긴다. */
export function bendHorizon(point, centerZ, curved) {
    if (!curved)
        return { ...point };
    const angle = (point.z - centerZ) / horizonRadius;
    return {
        x: point.x,
        y: (horizonRadius + point.y) * Math.cos(angle) - horizonRadius,
        z: centerZ + (horizonRadius + point.y) * Math.sin(angle),
    };
}
/** 원통 앞면의 클릭 교점을 원래 보행 좌표로 되돌린다. */
export function unbendHorizon(point, centerZ, curved) {
    return {
        x: point.x,
        z: curved
            ? centerZ +
                Math.atan2(point.z - centerZ, point.y + horizonRadius) * horizonRadius
            : point.z,
    };
}
export function horizonNormal(z, centerZ, curved) {
    const angle = curved ? (z - centerZ) / horizonRadius : 0;
    return { x: 0, y: Math.cos(angle), z: Math.sin(angle) };
}
