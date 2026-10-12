import * as THREE from 'three';
import { trailBounds, trailGroundDistance } from './trail-topology.js';
/** 길과 공터를 하나의 면으로 잘라 합류부의 겹친 바닥·이음매를 없앤다. 호출자가 GPU 자원을 정리한다. */
export function trailGroundGeometry(layout, margin, access) {
    const bounds = trailBounds(layout), step = 0.28;
    const columns = Math.ceil((bounds.maxX - bounds.minX + 2) / step), rows = Math.ceil((bounds.maxZ - bounds.minZ + 2) / step);
    const samples = [];
    for (let z = 0; z <= rows; z++) {
        const row = [];
        for (let x = 0; x <= columns; x++) {
            const point = {
                x: bounds.minX - 1 + x * step,
                z: bounds.minZ - 1 + z * step,
            };
            row.push({
                ...point,
                distance: trailGroundDistance(layout, point, access) + margin,
            });
        }
        samples.push(row);
    }
    const vertices = [];
    for (let z = 0; z < rows; z++)
        for (let x = 0; x < columns; x++) {
            const a = samples[z][x], b = samples[z][x + 1], c = samples[z + 1][x + 1], d = samples[z + 1][x];
            for (const triangle of [
                [a, c, b],
                [a, d, c],
            ]) {
                const polygon = [];
                for (let i = 0; i < 3; i++) {
                    const from = triangle[i], to = triangle[(i + 1) % 3];
                    if (from.distance >= 0)
                        polygon.push(from);
                    if (from.distance >= 0 !== to.distance >= 0) {
                        const t = from.distance / (from.distance - to.distance);
                        polygon.push({
                            x: from.x + (to.x - from.x) * t,
                            z: from.z + (to.z - from.z) * t,
                        });
                    }
                }
                for (let i = 1; i < polygon.length - 1; i++)
                    for (const point of [polygon[0], polygon[i], polygon[i + 1]])
                        vertices.push(point.x, 0, point.z);
            }
        }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
}
