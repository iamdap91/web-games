import { rockForm, rockRingVertices } from './rock-form.js';
import * as THREE from 'three';
import { rockRules } from './world.js';
const rings = rockForm.rings;
/** 균열을 붙이는 면의 높이별 깊이를 바위 형상과 함께 정의한다. */
export function faceDepth(y) {
    for (let index = 1; index < rings.length; index++) {
        const lower = rings[index - 1];
        const upper = rings[index];
        if (y > upper.y)
            continue;
        const progress = (y - lower.y) / (upper.y - lower.y);
        return (rockRules.radius *
            Math.cos(Math.PI / 8) *
            (lower.scale + (upper.scale - lower.scale) * progress));
    }
    return rockRules.radius * Math.cos(Math.PI / 8) * rings.at(-1).scale;
}
/** 두 조각의 원래 경계가 맞물리도록 같은 다면체를 절반씩 잘라 만든다. */
export function rockHalf(sign) {
    const points = rings.map((ring) => rockRingVertices(ring).map((vertex) => new THREE.Vector3(vertex.x, vertex.y, vertex.z)));
    const triangles = [];
    for (let level = 1; level < rings.length; level++)
        for (let index = 0; index < 8; index++) {
            const next = (index + 1) % 8;
            const a = points[level - 1][index];
            const b = points[level - 1][next];
            const c = points[level][next];
            const d = points[level][index];
            triangles.push([a, b, c], [a, c, d]);
        }
    for (const [level, winding] of [
        [0, -1],
        [rings.length - 1, 1],
    ])
        for (let index = 0; index < 8; index++) {
            const center = new THREE.Vector3(0, rings[level].y, 0);
            const edge = [points[level][index], points[level][(index + 1) % 8]];
            triangles.push(winding < 0 ? [center, edge[1], edge[0]] : [center, ...edge]);
        }
    const positions = [];
    const add = (a, b, c) => positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (const triangle of triangles) {
        const clipped = [];
        for (let index = 0; index < triangle.length; index++) {
            const a = triangle[index];
            const b = triangle[(index + 1) % triangle.length];
            const insideA = a.x * sign >= 0;
            const insideB = b.x * sign >= 0;
            if (insideA)
                clipped.push(a);
            if (insideA !== insideB)
                clipped.push(a.clone().lerp(b, -a.x / (b.x - a.x)));
        }
        for (let index = 1; index + 1 < clipped.length; index++)
            add(clipped[0], clipped[index], clipped[index + 1]);
    }
    const middle = new THREE.Vector3(0, rockRules.height / 2, 0);
    const edge = [
        ...rings.map((ring) => new THREE.Vector3(0, ring.y, faceDepth(ring.y))),
        ...[...rings]
            .reverse()
            .map((ring) => new THREE.Vector3(0, ring.y, -faceDepth(ring.y))),
    ];
    for (let index = 0; index < edge.length; index++) {
        const a = edge[index];
        const b = edge[(index + 1) % edge.length];
        if (sign < 0)
            add(middle, b, a);
        else
            add(middle, a, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    // 본게임 돌 재질이 쓰는 평면 무늬 좌표를 유지한다.
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from({ length: positions.length / 3 }, (_, index) => [
        positions[index * 3] / rockRules.radius,
        positions[index * 3 + 1] / rockRules.height,
    ]).flat(), 2));
    return geometry;
}
