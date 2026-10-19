import * as THREE from 'three';
import { NaturalScenery } from './natural-scenery.js';
// 두 겹의 불규칙한 외곽을 만들어 어느 쪽 길을 걸어도 평지 끝이 바로 드러나지 않는다.
const frame = [
    { x: -24.0, z: -16.8, spread: 3.8 },
    { x: -15.5, z: -17.6, spread: 3.1, canopy: true },
    { x: -6.0, z: -18.1, spread: 3.6 },
    { x: 5.8, z: -17.1, spread: 3.0 },
    { x: 15.2, z: -18.0, spread: 3.5, canopy: true },
    { x: 24.3, z: -16.4, spread: 4.0 },
    { x: -21.5, z: -11.5, spread: 2.1 },
    { x: -25.0, z: -8.2, spread: 3.3 },
    { x: -20.3, z: -5.1, spread: 1.8 },
    { x: -24.1, z: -1.2, spread: 3.2, canopy: true },
    { x: -20.5, z: 2.8, spread: 1.8 },
    { x: -24.7, z: 5.7, spread: 3.3 },
    { x: -21.0, z: 9.8, spread: 2.0 },
    { x: -25.0, z: 12.4, spread: 3.9 },
    { x: 21.2, z: -11.0, spread: 2.2 },
    { x: 25.0, z: -8.8, spread: 3.6 },
    { x: 20.4, z: -5.0, spread: 1.7 },
    { x: 24.4, z: -0.8, spread: 3.3, canopy: true },
    { x: 20.5, z: 3.0, spread: 1.9 },
    { x: 24.7, z: 6.7, spread: 3.5 },
    { x: 21.6, z: 10.3, spread: 2.1 },
    { x: 25.0, z: 13.2, spread: 4.0 },
    { x: -14.5, z: 14.5, spread: 3.0 },
    { x: -6.4, z: 13.4, spread: 2.4 },
    { x: 2.5, z: 14.2, spread: 2.8 },
    { x: 11.1, z: 13.8, spread: 2.9 },
    { x: 17.1, z: 14.5, spread: 2.7 },
];
function twig(kit, point, y, reach, seed, charred) {
    const direction = seed * 2.4;
    const from = new THREE.Vector3(point.x, y + 0.2, point.z);
    const to = new THREE.Vector3(point.x + Math.cos(direction) * reach, y + 0.025, point.z + Math.sin(direction) * reach);
    kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        from,
        from
            .clone()
            .lerp(to, 0.52)
            .add(new THREE.Vector3(0, 0.07, 0)),
        to,
    ]), 7, charred ? 0.11 : 0.075, 5, false), charred ? 'basalt' : 'bark', { x: 0, y: 0, z: 0 });
}
function woodedFrame(kit, nature, ground, cluster, index, spread) {
    const y = ground.terrainHeight(cluster);
    const front = cluster.z > 8;
    const snow = ground.region === 'bear';
    const water = ground.waterDistance(cluster) < 0.4;
    if (cluster.canopy && !water) {
        nature.pine({ ...cluster, y }, 4.3 + (index % 3) * 0.35, {
            snow,
            seed: index * 13,
        });
        if (snow)
            nature.rock({ x: cluster.x - 0.4, y: y + 0.15, z: cluster.z + 0.45 }, { x: spread * 0.65, y: 0.45, z: spread * 0.55 }, { snow: true, seed: index });
        else
            nature.shrub({ x: cluster.x + 0.35, y, z: cluster.z + 0.4 }, 0.85, {
                seed: index,
            });
        return;
    }
    const height = front ? 0.32 + (index % 2) * 0.1 : 0.65 + (index % 3) * 0.36;
    nature.rock({ ...cluster, y: y + height * 0.48 }, { x: spread, y: height, z: spread * (front ? 0.67 : 0.55) }, { moss: !snow, snow, seed: index * 11 });
    if (index % 2 === 0 && !water) {
        const shoulder = {
            x: cluster.x + Math.sin(index * 2.3) * spread * 0.45,
            z: cluster.z + spread * 0.45,
        };
        const radius = Math.min(front ? 0.78 : 1.1, spread * 0.5);
        if (ground.distance(shoulder) > radius + 2.8)
            nature.shrub({ ...shoulder, y: ground.terrainHeight(shoulder) }, radius, {
                snow,
                seed: index * 5,
            });
    }
    if (!snow && index % 5 === 1 && !water)
        twig(kit, cluster, y, spread * 0.62, index, false);
}
function burnedFrame(kit, nature, ground, cluster, index, spread) {
    const y = ground.terrainHeight(cluster);
    const front = cluster.z > 8;
    const height = front ? 0.38 : 0.8 + (index % 4) * 0.4;
    nature.rock({ ...cluster, y: y + height * 0.5 }, { x: spread, y: height, z: spread * 0.58 }, { kind: 'basalt', seed: index * 9 });
    if (index % 3 === 0)
        nature.rock({ x: cluster.x - spread * 0.32, y: y + 0.1, z: cluster.z + spread * 0.4 }, { x: spread * 0.52, y: 0.25, z: spread * 0.42 }, { kind: 'ash', seed: index + 4 });
    if (cluster.canopy) {
        const lean = index % 2 ? -0.32 : 0.28;
        const trunk = kit.mesh(new THREE.CylinderGeometry(0.14, 0.29, 2.5, 7), 'bark', { x: cluster.x + spread * 0.35, y: y + 1.25, z: cluster.z - 0.25 });
        trunk.rotation.z = lean;
        twig(kit, cluster, y + 0.15, spread * 0.7, index, true);
    }
}
function gardenFrame(nature, ground, cluster, index, spread) {
    const y = ground.terrainHeight(cluster);
    const front = cluster.z > 8;
    const water = ground.waterDistance(cluster) < 0.4;
    if (cluster.canopy && !water) {
        nature.bamboo({ ...cluster, y }, 4.1 + (index % 3) * 0.45, {
            seed: index * 17,
        });
        return;
    }
    if (index % 3 === 0 || water) {
        const height = front ? 0.28 : 0.5 + (index % 2) * 0.25;
        nature.rock({ ...cluster, y: y + height * 0.48 }, { x: spread, y: height, z: spread * 0.58 }, { moss: true, seed: index * 7 });
    }
    if (!water) {
        const radius = Math.min(front ? 0.9 : 1.3, spread * 0.65);
        nature.shrub({ ...cluster, y }, radius, { seed: index * 5 });
        const satellite = {
            x: cluster.x + spread * 0.48,
            z: cluster.z + spread * 0.24,
        };
        if (index % 2 === 0 && ground.distance(satellite) > 3.3)
            nature.shrub({ ...satellite, y: ground.terrainHeight(satellite) }, 0.5, {
                seed: index + 31,
            });
    }
}
/** 여덟 지도 밖의 풍경을 연결하며 길과 명소 안쪽의 모형은 소유하지 않는다. */
export function buildTrailBackdrop(kit, ground) {
    const nature = new NaturalScenery(kit);
    frame.forEach((cluster, index) => {
        const distance = ground.distance(cluster);
        if (distance <= 2.8)
            return;
        const spread = Math.min(cluster.spread, distance - 2.85);
        if (spread < 0.65)
            return;
        if (ground.region === 'armadillo')
            burnedFrame(kit, nature, ground, cluster, index, spread);
        else if (ground.region === 'mantis')
            gardenFrame(nature, ground, cluster, index, spread);
        else
            woodedFrame(kit, nature, ground, cluster, index, spread);
    });
}
