/** 기존 공터 동쪽에 이어지는 안전 채집 구역. 그림과 통행 판정이 같은 형태를 쓴다. */
export const groveLayout = {
    title: '바람숲',
    corridor: { x: 10.1, z: 3.5, width: 3.2, depth: 2.8 },
    room: { x: 14.5, z: 2.4, width: 7, depth: 7.2 },
    trail: { x: 15.8, z: -2.1, width: 3.4, depth: 4.2 },
    sign: { x: 9.2, z: 3.3 },
    discoveryX: 11.5,
    yieldMultiplier: 2,
    resources: [
        { kind: 'brush', x: 13.3, z: 1.1 },
        { kind: 'brush', x: 15.3, z: -2.2 },
        { kind: 'brush', x: 16.6, z: -2.2 },
        { kind: 'rock', x: 12.9, z: 5.2 },
        { kind: 'brush', x: 14.6, z: 4.8 },
        { kind: 'rock', x: 16.7, z: 4.7 },
    ],
};
export const groveRightEdge = groveLayout.room.x + groveLayout.room.width / 2;
export function insideGrove(point, margin = 0) {
    return [groveLayout.corridor, groveLayout.room, groveLayout.trail].some((area) => Math.abs(point.x - area.x) <= area.width / 2 - margin &&
        Math.abs(point.z - area.z) <= area.depth / 2 - margin);
}
