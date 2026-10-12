import { vineLayout } from '../forest-interactions/vine-curtain.js';
import { hollowLayout } from '../forest-interactions/hollow-tree.js';
/** 개척 이후 구역 안의 운반길·지름길·벌목터 배치를 그림과 통행에서 공유한다. */
export const forestClearingLayout = {
    title: '잊힌 벌목터',
    room: { x: 24.6, z: 0.1, width: 9.2, depth: 10.6 },
    entrance: { x: 19.1, z: 3.5, width: 4.8, depth: 2.8 },
    origin: { x: 12.8, z: -3.3 },
    approach: { x: 16.8, z: -4, width: 2.3, depth: 2.2 },
    connector: { x: 20.6, z: -4.9, width: 4, depth: 4.4 },
    eastExit: { z: -2.9, halfWidth: 1.15 },
    transportPath: [
        { x: 17.1, z: 3.5 },
        { x: 20.6, z: 3.5 },
        { x: 20.6, z: -2 },
    ],
    shortcutPath: [
        { x: 16.8, z: -3.2 },
        { x: 16.8, z: -6.2 },
        { x: 21.8, z: -6.2 },
        { x: 21.8, z: -3.6 },
    ],
    route: {
        start: { x: 22, z: -2 },
        ends: { south: { x: 22, z: 4.1 }, east: { x: 27.8, z: -2 } },
    },
    resources: [
        { id: 200, kind: 'brush', x: 22, z: 0 },
        { id: 201, kind: 'rock', x: 23.8, z: -2 },
        { id: 202, kind: 'brush', x: 22, z: 1.9 },
        { id: 203, kind: 'rock', x: 25.4, z: -2 },
        { id: 204, kind: 'brush', x: 22, z: 3.6 },
        { id: 205, kind: 'rock', x: 27, z: -2 },
    ],
};
export const forestVine = {
    ...vineLayout,
    x: vineLayout.x + forestClearingLayout.origin.x,
    z: vineLayout.z + forestClearingLayout.origin.z,
    pocket: {
        minX: vineLayout.pocket.minX + forestClearingLayout.origin.x,
        maxX: vineLayout.pocket.maxX + forestClearingLayout.origin.x,
        minZ: vineLayout.pocket.minZ + forestClearingLayout.origin.z,
        maxZ: vineLayout.pocket.maxZ + forestClearingLayout.origin.z,
    },
    eastExit: {
        ...forestClearingLayout.eastExit,
        z: forestClearingLayout.eastExit.z + forestClearingLayout.origin.z,
    },
};
export const forestHollow = {
    ...hollowLayout,
    x: hollowLayout.x + forestClearingLayout.origin.x,
    z: hollowLayout.z + forestClearingLayout.origin.z,
};
export const forestRightEdge = forestClearingLayout.room.x + forestClearingLayout.room.width / 2;
function insideArea(point, area, margin) {
    return (Math.abs(point.x - area.x) <= area.width / 2 - margin &&
        Math.abs(point.z - area.z) <= area.depth / 2 - margin);
}
export function insideLoggingYard(point) {
    return insideArea(point, forestClearingLayout.room, 0);
}
export function insideForestClearing(point, margin = 0) {
    const pocket = forestVine.pocket;
    return ([
        forestClearingLayout.room,
        forestClearingLayout.entrance,
        forestClearingLayout.approach,
        forestClearingLayout.connector,
    ].some((area) => insideArea(point, area, margin)) ||
        (point.x >= pocket.minX + margin &&
            point.x <= pocket.maxX - margin &&
            point.z >= pocket.minZ + margin &&
            point.z <= pocket.maxZ - margin));
}
