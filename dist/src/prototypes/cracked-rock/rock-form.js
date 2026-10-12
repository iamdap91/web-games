const rockHeight = 2.7;
/** 그림과 조각 충돌이 공유하는 높이별 다면체 형상이다. */
export const rockForm = {
    radius: 1.6,
    height: rockHeight,
    rings: [
        { y: 0, scale: 0.78 },
        { y: 0.5, scale: 1 },
        { y: 2, scale: 0.9 },
        { y: rockHeight, scale: 0.3 },
    ],
};
export function rockRingVertices(ring) {
    return Array.from({ length: 8 }, (_, index) => {
        const angle = Math.PI / 8 + (index * Math.PI) / 4;
        return {
            x: Math.sin(angle) * rockForm.radius * ring.scale,
            y: ring.y,
            z: Math.cos(angle) * rockForm.radius * ring.scale,
        };
    });
}
