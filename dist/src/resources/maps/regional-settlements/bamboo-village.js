import * as THREE from 'three';
import { NaturalScenery } from '../regional-trails/natural-scenery.js';
const buildings = [
    {
        id: 'teahouse',
        x: -8.5,
        z: -5.2,
        width: 5.4,
        depth: 4.2,
        height: 2.6,
        roof: 'bamboo',
        wall: 'earth',
    },
    {
        id: 'bamboo-workshop',
        x: 8.5,
        z: -5.5,
        width: 5,
        depth: 4,
        height: 2.5,
        roof: 'bamboo',
        wall: 'wood',
    },
    {
        id: 'inn',
        x: -9.5,
        z: 4.5,
        width: 5.8,
        depth: 4.2,
        height: 3.2,
        roof: 'tile',
        wall: 'wood',
    },
    {
        id: 'herbal-supply',
        x: 9.5,
        z: 4.5,
        width: 4.8,
        depth: 3.7,
        height: 2.5,
        roof: 'slate',
        wall: 'earth',
    },
    {
        id: 'wind-rest',
        x: 0,
        z: -12,
        width: 4.3,
        depth: 3.3,
        height: 2.4,
        roof: 'bamboo',
        wall: 'wood',
    },
    {
        id: 'west-home',
        x: -15,
        z: -11.5,
        width: 4.3,
        depth: 3.8,
        height: 2.4,
        roof: 'thatch',
        wall: 'wood',
    },
    {
        id: 'east-home',
        x: 15,
        z: -11,
        width: 4,
        depth: 3.6,
        height: 2.3,
        roof: 'tile',
        wall: 'earth',
    },
];
const bambooClumps = [
    [-22.0, -11.8, 5.3],
    [-21.5, -4.6, 4.7],
    [-21.8, 3.9, 4.2],
    [-20.7, 10.6, 3.6],
    [-16.3, 15.3, 2.5],
    [-16.7, -17.2, 5.0],
    [-9.2, -16.3, 4.4],
    [-3.6, -18.2, 4.9],
    [4.2, -18.3, 5.1],
    [10.5, -17.0, 4.5],
    [18.9, -16.9, 4.9],
    [22.1, -9.0, 5.2],
    [21.7, -1.5, 4.6],
    [21.9, 6.2, 3.9],
    [19.6, 12.2, 3.2],
    [15.4, 15.8, 2.5],
];
const gardenStones = [
    [-6.2, -14.4, 0.67],
    [-5.2, -15.0, 0.36],
    [7.7, -14.9, 0.74],
    [8.5, -15.4, 0.4],
    [-19.2, 1.0, 0.62],
    [18.9, 9.7, 0.55],
];
const definition = {
    name: '바람대숲 차향마을',
    description: '차방과 죽세공방이 작은 광장을 바라보고, 낮은 담장 사이로 여관과 대나무 정원이 이어지는 생활 마을.',
    start: { x: 0, z: 12 },
    areas: [
        { minX: -4.6, maxX: 4.6, minZ: -3.8, maxZ: 4.8 },
        { minX: -10.1, maxX: -6.8, minZ: -2.9, maxZ: -0.6 },
        { minX: 6.9, maxX: 10.1, minZ: -3.0, maxZ: -0.8 },
    ],
    paths: [
        {
            width: 3.5,
            points: [
                { x: 0, z: 15.5 },
                { x: 0.4, z: 9 },
                { x: 0, z: 2 },
            ],
        },
        {
            width: 3.2,
            points: [
                { x: 0, z: 0 },
                { x: -4.8, z: -0.7 },
                { x: -8.5, z: -2.1 },
                { x: -12.5, z: -3.5 },
                { x: -15, z: -8.6 },
            ],
        },
        {
            width: 3.2,
            points: [
                { x: 0, z: 0 },
                { x: 4.9, z: -0.6 },
                { x: 8.5, z: -2.5 },
                { x: 12.4, z: -3.8 },
                { x: 15, z: -8.2 },
            ],
        },
        {
            width: 3,
            points: [
                { x: 0, z: 1 },
                { x: -1.8, z: -5 },
                { x: 0, z: -9.35 },
            ],
        },
        {
            width: 3,
            points: [
                { x: 0, z: 4 },
                { x: -4.8, z: 6.3 },
                { x: -9.5, z: 7.6 },
                { x: -15, z: 9.5 },
                { x: -17, z: 3.5 },
                { x: -17, z: -5 },
                { x: -15, z: -8.6 },
            ],
        },
        {
            width: 3,
            points: [
                { x: 0, z: 4 },
                { x: 5, z: 6.6 },
                { x: 9.5, z: 7.35 },
                { x: 15, z: 9.5 },
                { x: 17, z: 3.5 },
                { x: 17, z: -5 },
                { x: 15, z: -8.2 },
            ],
        },
        {
            width: 2.8,
            points: [
                { x: -15, z: -8.6 },
                { x: -9, z: -9.4 },
                { x: 0, z: -9.35 },
                { x: 9, z: -8.7 },
                { x: 15, z: -8.2 },
            ],
        },
    ],
    landmarks: [
        {
            id: 'teahouse',
            name: '대숲 차방',
            position: { x: -8.5, z: -2.1 },
            description: '흙벽 차방 앞에 찻그릇과 낮은 의자가 놓여 있다. 광장 건너로 대나무를 엮는 작업장이 보인다.',
            kind: 'view',
        },
        {
            id: 'bamboo-workshop',
            name: '바람 죽세공방',
            position: { x: 8.5, z: -2.5 },
            description: '잘라 둔 대통과 엮던 바구니가 마당에 남아 있다. 옆길은 작은 주거 골목과 바람쉼터로 이어진다.',
            kind: 'view',
        },
        {
            id: 'inn',
            name: '차향 여관',
            position: { x: -9.5, z: 7.6 },
            description: '기와를 얹은 큰 목조 여관. 짐을 내려놓은 손님 곁으로 남쪽 출구와 차방 광장이 이어진다.',
            kind: 'view',
        },
        {
            id: 'herbal-supply',
            name: '이슬 약초보급소',
            position: { x: 9.5, z: 7.35 },
            description: '약초와 작은 여행 보따리가 처마 앞에 놓여 있다. 뒤편 골목으로 죽세공방까지 돌아갈 수 있다.',
            kind: 'view',
        },
        {
            id: 'wind-rest',
            name: '바람종 쉼터',
            position: { x: 0, z: -9.35 },
            description: '대나무 정원 사이의 작은 쉼집. 나무 그늘과 바람종을 지나면 양옆 주거 골목이 다시 만난다.',
            kind: 'view',
        },
        {
            id: 'exit',
            name: '남쪽 대숲 출구',
            position: { x: 0, z: 15.5 },
            description: '짧은 대나무 울타리 사이로 마을길이 바깥 숲길에 이어진다.',
            kind: 'view',
        },
    ],
    ground: 'grass',
    sky: 0xcfdcc6,
    shade: 0x6b8064,
    sun: 0xffe5b7,
    camera: { x: 0, y: 35, z: 35, targetX: 0, targetZ: 0, span: 28 },
};
export const bambooVillage = {
    region: 'mantis',
    title: '바람대숲 차향마을',
    subtitle: '차방 · 죽세공 · 대나무 정원',
    description: '따뜻한 흙벽과 청록 처마가 작은 광장을 둘러싼다. 차향과 죽세공 작업 흔적을 따라 마을의 샛길을 걸어본다.',
    definition,
    buildings,
    props: [
        { key: 'bowl', x: -4.05, z: 2.7, width: 0.44, y: 0.66 },
        { key: 'jar-lid', x: -4.5, z: 2.8, width: 0.3, y: 0.66 },
        { key: 'basket', x: 13.8, z: -0.4, width: 0.72, y: 0.86 },
        { key: 'bamboo-tubes', x: 12.3, z: -1.1, width: 1.35 },
        { key: 'wood-chips', x: 13.1, z: 0.7, width: 0.92 },
        { key: 'rope', x: 14.3, z: 0.9, width: 0.56 },
        { key: 'herb', x: 11.2, z: 7.2, width: 0.7 },
        { key: 'dry-herbs', x: 7.8, z: 7.1, width: 0.76 },
        { key: 'sack', x: 11.4, z: 7.8, width: 0.65 },
        { key: 'bedroll', x: -11.3, z: 7.5, width: 0.8 },
        { key: 'travel-flask', x: -10.9, z: 8.0, width: 0.42 },
        { key: 'notices', x: -11.4, z: 6.95, width: 0.56, y: 0.16 },
        { key: 'flowers', x: 3.3, z: -8.0, width: 0.85 },
        { key: 'fern', x: -4.9, z: -12.0, width: 0.88 },
        { key: 'grain-trays', x: -13.4, z: -8.9, width: 0.84 },
        { key: 'vegetables', x: 13.6, z: -8.4, width: 0.78 },
    ],
    // 실제 마을 생활 묶음의 정면 주민을 소박한 차방·보급소·여관에 재사용한다.
    residents: [
        { key: 'village-cook', x: -7.0, z: -1.8, height: 1.9 },
        { key: 'herbalist', x: 10.9, z: 7.2, height: 1.9 },
        { key: 'hearth-keeper', x: -8.0, z: 7.5, height: 1.9 },
    ],
    solids: [
        ...bambooClumps.map(([x, z]) => ({ x, z, radius: 0.46 })),
        ...gardenStones.map(([x, z, radius]) => ({ x, z, radius: radius * 1.05 })),
        { x: -4.1, z: 2.8, radius: 0.95 },
        { x: 13.9, z: -0.4, radius: 1.05 },
        { x: 5.5, z: -13.6, radius: 0.8 },
        { x: -4.2, z: 14.7, radius: 1.0 },
        { x: 4.2, z: 14.7, radius: 1.0 },
    ],
};
export function buildBambooVillage(kit, ground) {
    new BambooVillageScenery(kit, ground).build();
}
class BambooVillageScenery {
    kit;
    ground;
    nature;
    constructor(kit, ground) {
        this.kit = kit;
        this.ground = ground;
        this.nature = new NaturalScenery(kit);
    }
    build() {
        this.teaTable();
        this.craftYard();
        this.windChimes();
        this.entrance();
        this.gardens();
    }
    group(point) {
        const group = new THREE.Group();
        group.position.set(point.x, this.ground.terrainHeight(point), point.z);
        this.kit.root.add(group);
        return group;
    }
    teaTable() {
        const group = this.group({ x: -4.1, z: 2.8 });
        this.kit.mesh(new THREE.CylinderGeometry(0.66, 0.64, 0.12, 12), 'wood', { x: 0, y: 0.6, z: 0 }, group);
        this.pole(group, { x: 0, y: 0.05, z: 0 }, { x: 0, y: 0.55, z: 0 }, 0.14);
        for (const side of [-1, 1]) {
            this.kit.mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.12, 9), 'bamboo', { x: side * 0.82, y: 0.36, z: 0 }, group);
            this.pole(group, { x: side * 0.82, y: 0.03, z: 0 }, { x: side * 0.82, y: 0.3, z: 0 }, 0.085);
        }
    }
    craftYard() {
        const group = this.group({ x: 13.9, z: -0.4 });
        this.kit.box({ x: 0, y: 0.81, z: 0 }, { x: 1.8, y: 0.12, z: 0.92 }, 'wood', group);
        for (const x of [-0.68, 0.68])
            for (const z of [-0.31, 0.31])
                this.pole(group, { x, y: 0, z }, { x: x + 0.025, y: 0.76, z }, 0.055);
        for (let i = 0; i < 7; i++)
            this.pole(group, { x: -0.72 + i * 0.19, y: 0.895, z: -0.32 }, { x: -0.61 + i * 0.19, y: 0.895, z: 0.31 }, 0.017);
        for (let i = 0; i < 4; i++) {
            const ring = this.kit.mesh(new THREE.TorusGeometry(0.28 + i * 0.015, 0.014, 4, 14), 'bamboo', { x: -0.33, y: 0.92 + i * 0.055, z: 0.01 }, group);
            ring.rotation.x = Math.PI / 2;
        }
    }
    windChimes() {
        const group = this.group({ x: 5.5, z: -13.6 });
        for (const x of [-0.66, 0.66])
            this.pole(group, { x, y: 0, z: 0 }, { x: x + 0.02, y: 2.15, z: 0 }, 0.055);
        this.pole(group, { x: -0.8, y: 2.13, z: 0 }, { x: 0.8, y: 2.16, z: 0 }, 0.05);
        const chimes = new THREE.Group();
        chimes.position.y = 2.08;
        chimes.name = 'trail-foliage';
        group.add(chimes);
        for (let i = 0; i < 5; i++) {
            const x = -0.36 + i * 0.18;
            const length = 0.31 + (i % 3) * 0.09;
            this.pole(chimes, { x, y: 0, z: 0 }, { x, y: -0.19, z: 0 }, 0.009, 'rope');
            this.kit.mesh(new THREE.CylinderGeometry(0.027, 0.032, length, 7), 'bamboo', { x, y: -0.19 - length / 2, z: 0 }, chimes);
        }
        this.kit.box({ x: 0.1, y: -0.8, z: 0 }, { x: 0.12, y: 0.23, z: 0.015 }, 'cloth', chimes);
    }
    entrance() {
        for (const side of [-1, 1]) {
            const group = this.group({ x: side * 4.2, z: 14.7 });
            for (const x of [-0.9, 0.9])
                this.pole(group, { x, y: 0, z: 0 }, { x: x + 0.02, y: 0.88, z: 0 }, 0.045);
            for (const y of [0.32, 0.68])
                this.pole(group, { x: -1, y, z: 0 }, { x: 1, y: y + 0.02, z: 0 }, 0.032);
        }
    }
    gardens() {
        bambooClumps.forEach(([x, z, height], i) => {
            const point = { x, z };
            // 통행선 밖에 고정한 군집을 충돌 목록과 같은 좌표로 모두 그린다.
            this.nature.bamboo({ ...point, y: this.ground.terrainHeight(point) }, height, { seed: 700 + i * 11 });
        });
        gardenStones.forEach(([x, z, radius], i) => {
            const point = { x, z };
            this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + 0.12 }, { x: radius, y: radius * 0.42, z: radius * 0.77 }, { moss: true, seed: 900 + i * 7 });
        });
        for (const [x, z, radius] of [
            [-5.1, -12.7, 0.69],
            [-5.0, -14.4, 0.51],
            [8.7, -13.3, 0.64],
            [10.3, -14.8, 0.68],
            [-18.4, 6.0, 0.73],
            [19.5, 1.5, 0.78],
            [-12.9, 13.9, 0.79],
            [11.5, 13.8, 0.74],
        ]) {
            const point = { x, z };
            if (!this.clear(point, radius * 0.75))
                continue;
            this.nature.shrub({ ...point, y: this.ground.terrainHeight(point) }, radius, { seed: Math.round(x * 17 + z * 11) });
        }
    }
    clear(point, radius) {
        if (this.ground.distance(point) < radius + 0.2)
            return false;
        for (const building of buildings) {
            const dx = Math.max(0, Math.abs(point.x - building.x) - building.width / 2);
            const dz = Math.max(0, Math.abs(point.z - building.z) - building.depth / 2);
            if (Math.hypot(dx, dz) < radius + 0.5)
                return false;
        }
        return true;
    }
    pole(parent, from, to, radius, kind = 'bamboo') {
        const delta = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const mesh = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.87, radius, delta.length(), 6), kind, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
        }, parent);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
}
