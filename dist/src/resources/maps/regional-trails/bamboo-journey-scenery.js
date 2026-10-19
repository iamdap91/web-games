import * as THREE from 'three';
import { bambooJourneyPlaces as places } from './bamboo-journey-layout.js';
import { NaturalScenery } from './natural-scenery.js';
/** 같은 지면 위에 두 갈래 풍경을 잇고, 바닥과 수면은 TrailTerrain에 맡긴다. */
export function buildBambooJourney(kit, ground) {
    new BambooJourneyScenery(kit, ground).build();
}
class BambooJourneyScenery {
    kit;
    ground;
    nature;
    constructor(kit, ground) {
        this.kit = kit;
        this.ground = ground;
        this.nature = new NaturalScenery(kit);
    }
    build() {
        this.entrance();
        this.bridge();
        this.shrine();
        this.pavilion();
        this.steppingStones();
        this.trainingGate();
        this.forecourt();
        this.shortcut();
        this.landscape();
    }
    group(point, angle = 0) {
        const group = new THREE.Group();
        group.position.set(point.x, this.ground.terrainHeight(point), point.z);
        group.rotation.y = angle;
        this.kit.root.add(group);
        return group;
    }
    entrance() {
        const point = places.entrance;
        // 입구의 하늘을 열어 두고 낮은 울타리로 안쪽 분기에 시선을 이끈다.
        for (const side of [-1, 1]) {
            const group = this.group({ x: point.x + side * 2.75, z: point.z + 0.2 });
            this.fence(group, 1.6, 0.72);
            this.nature.rock({
                x: point.x + side * 3.4,
                y: this.ground.terrainHeight({
                    x: point.x + side * 3.4,
                    z: point.z + 0.6,
                }) + 0.14,
                z: point.z + 0.6,
            }, { x: 0.62, y: 0.32, z: 0.48 }, { moss: true, seed: 710 + side });
        }
        const fork = this.group({
            x: places.fork.x + 3.4,
            z: places.fork.z + 1.8,
        });
        this.pole(fork, { x: 0, y: 0, z: 0 }, { x: 0.04, y: 1.28, z: 0 }, 0.07);
        this.arrow(fork, { x: -0.24, y: 1.07, z: 0 }, -1);
        this.arrow(fork, { x: 0.27, y: 0.81, z: 0.04 }, 1);
        this.fern({ x: point.x + 3.5, z: point.z - 0.4 }, 0.76, 720);
    }
    bridge() {
        const { area } = places.bridge;
        const width = area.maxX - area.minX;
        const length = area.maxZ - area.minZ;
        const count = Math.ceil(length / 0.34);
        // 서쪽 개울은 동서로 흐르므로 난간은 통행 방향인 남북을 따라 놓는다.
        for (let i = 0; i < count; i++) {
            const z = area.minZ + ((i + 0.5) / count) * length;
            const board = this.kit.box({ x: places.bridge.center.x, y: 0.0275, z }, { x: width, y: 0.055, z: length / count - 0.012 }, 'wood');
            board.rotation.y = Math.sin(i * 2.8) * 0.003;
        }
        for (const x of [area.minX - 0.17, area.maxX + 0.17]) {
            for (let i = 0; i < 3; i++) {
                const z = area.minZ + (i / 2) * length;
                this.pole(this.kit.root, { x, y: -0.13, z }, { x: x + 0.018, y: 0.73 + (i % 2) * 0.04, z }, 0.075);
                const tie = this.kit.mesh(new THREE.TorusGeometry(0.083, 0.018, 4, 8), 'rope', { x, y: 0.56, z });
                tie.rotation.x = Math.PI / 2;
            }
            this.curve(this.kit.root, [
                { x, y: 0.61, z: area.minZ },
                { x: x + 0.025, y: 0.49, z: places.bridge.center.z },
                { x, y: 0.61, z: area.maxZ },
            ], 0.026, 'rope');
        }
        this.rock({ x: area.minX - 1.8, z: area.maxZ + 1.7 }, { x: 1.05, y: 0.57, z: 0.76 }, 730);
        this.rock({ x: area.maxX + 2.2, z: area.minZ - 1.9 }, { x: 0.75, y: 0.38, z: 0.53 }, 731);
    }
    shrine() {
        // 사당의 열린 면이 동쪽 방문점을 바라보게 회전한다.
        const group = this.group(places.shrine.model, Math.PI / 2);
        this.plinth(group, 2.55, 2.15, 0.28);
        this.kit.box({ x: 0, y: 1.0, z: -0.15 }, { x: 1.83, y: 1.52, z: 1.5 }, 'wood', group);
        for (const x of [-0.91, 0.91]) {
            this.pole(group, { x, y: 0.25, z: 0.75 }, { x: x + 0.018, y: 1.97, z: 0.75 }, 0.085);
            this.kit.box({ x, y: 1.3, z: 0.78 }, { x: 0.11, y: 0.1, z: 0.09 }, 'rope', group);
        }
        this.kit.box({ x: 0, y: 1.11, z: 0.622 }, { x: 1.3, y: 1.12, z: 0.065 }, 'bark', group);
        this.kit.box({ x: 0, y: 0.52, z: 1.02 }, { x: 1.66, y: 0.13, z: 0.53 }, 'wood', group);
        this.gableRoof(group, { x: 0, y: 2.02, z: 0 }, 3.1, 2.55, 0.64);
        this.cloth(group, { x: 0, y: 1.51, z: 0.88 }, 0.72, 0.63);
        for (const x of [-0.95, 0.95])
            this.lantern(group, { x, y: 1.61, z: 0.95 }, 0.64);
        const offering = this.kit.mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.11, 9), 'stone', { x: 0, y: 0.65, z: 1.06 }, group);
        offering.receiveShadow = true;
        this.rock({ x: places.shrine.model.x - 3.2, z: places.shrine.model.z + 1.5 }, { x: 0.8, y: 0.56, z: 0.69 }, 741);
        this.fern({ x: places.shrine.model.x - 2.4, z: places.shrine.model.z - 2.8 }, 0.84, 742);
    }
    pavilion() {
        const group = this.group(places.pavilion.model);
        this.plinth(group, 3.3, 2.72, 0.17);
        for (const x of [-1.28, 1.28])
            for (const z of [-1.02, 1.02]) {
                this.kit.box({ x, y: 0.22, z }, { x: 0.27, y: 0.35, z: 0.28 }, 'stone', group);
                this.pole(group, { x, y: 0.23, z }, { x: x + 0.025, y: 2.34, z }, 0.09);
            }
        this.hipRoof(group, { x: 0, y: 2.23, z: 0 }, 1.9, 1.48, 1.03);
        for (const x of [-1.28, 1.28])
            this.pole(group, { x, y: 2.21, z: -1.02 }, { x, y: 2.21, z: 1.02 }, 0.075);
        for (const z of [-1.02, 1.02])
            this.pole(group, { x: -1.28, y: 2.21, z }, { x: 1.28, y: 2.21, z }, 0.075);
        // 동쪽은 물가를 바라보는 시야와 방문점 주변의 여백을 남긴다.
        this.kit.box({ x: -1.0, y: 0.5, z: 0 }, { x: 0.38, y: 0.13, z: 1.85 }, 'wood', group);
        for (const z of [-0.68, 0.68])
            this.kit.box({ x: -1.0, y: 0.3, z }, { x: 0.27, y: 0.42, z: 0.17 }, 'wood', group);
        this.lantern(group, { x: 0, y: 2.03, z: -0.07 }, 0.88);
        this.fern({ x: places.pavilion.model.x - 1.7, z: places.pavilion.model.z + 2.4 }, 0.69, 751);
        this.rock({ x: places.pavilion.model.x - 3.6, z: places.pavilion.model.z + 2.4 }, { x: 0.76, y: 0.35, z: 0.63 }, 752);
    }
    steppingStones() {
        const { area } = places.steppingStones;
        const length = area.maxZ - area.minZ;
        const count = Math.ceil(length / 1.25);
        for (let i = 0; i < count; i++) {
            const z = area.minZ + ((i + 0.5) / count) * length;
            this.slab(area, z, length / count - 0.05, 760 + i);
        }
        // 수면을 새로 덮지 않고, 길 바깥의 작은 수련 잎만 물 위에 띄운다.
        const pond = places.pond;
        for (const [offsetX, offsetZ, scale] of [
            [1.8, -3.0, 0.42],
            [2.25, -3.45, 0.28],
            [10.0, -10.2, 0.5],
            [10.45, -9.55, 0.29],
            [2.0, -11.8, 0.38],
            [9.4, -4.8, 0.34],
            [1.4, -7.2, 0.45],
            [9.8, -12.4, 0.36],
        ]) {
            const x = pond.minX + offsetX;
            const z = pond.maxZ + offsetZ;
            if (this.ground.waterDistance({ x, z }) > -0.4)
                continue;
            const leaf = new THREE.Mesh(lilyGeometry(scale), this.nature.surface('leaf', 0.95));
            leaf.position.set(x, -0.058, z);
            leaf.rotation.y = x * 1.7 + z;
            leaf.receiveShadow = true;
            this.kit.root.add(leaf);
        }
    }
    trainingGate() {
        const group = this.group(places.trainingGate.model);
        for (const x of [-2.22, 2.22]) {
            this.kit.box({ x, y: 0.25, z: 0 }, { x: 0.57, y: 0.5, z: 0.62 }, 'stone', group);
            this.pole(group, { x, y: 0.22, z: 0 }, { x: x - Math.sign(x) * 0.055, y: 2.83, z: 0.035 }, 0.17);
            this.lantern(group, { x: x - Math.sign(x) * 0.39, y: 2.2, z: 0.15 }, 0.8);
        }
        this.curve(group, [
            { x: -2.85, y: 2.81, z: 0 },
            { x: 0, y: 2.66, z: 0 },
            { x: 2.85, y: 2.84, z: 0 },
        ], 0.18, 'wood');
        this.gableRoof(group, { x: 0, y: 3.0, z: 0 }, 6.0, 1.47, 0.52);
        this.kit.box({ x: 0, y: 2.62, z: 0.28 }, { x: 1.13, y: 0.43, z: 0.14 }, 'bark', group);
        for (const x of [-0.29, 0.07, 0.34]) {
            const stroke = this.kit.box({ x, y: 2.62, z: 0.36 }, { x: 0.046, y: 0.23, z: 0.017 }, 'wood', group);
            stroke.rotation.z = -0.26;
        }
        // 울타리는 문 좌우에만 붙여 합류로를 가로막지 않는다.
        for (const side of [-1, 1]) {
            const fence = this.group({
                x: places.trainingGate.model.x + side * 4.4,
                z: places.trainingGate.model.z - 0.25,
            });
            this.fence(fence, 2.5, 1.15);
        }
        this.rock({
            x: places.trainingGate.model.x - 4.5,
            z: places.trainingGate.model.z - 1.6,
        }, { x: 1.25, y: 0.71, z: 0.85 }, 781);
        this.rock({
            x: places.trainingGate.model.x + 4.5,
            z: places.trainingGate.model.z - 1.6,
        }, { x: 0.92, y: 0.47, z: 0.7 }, 782);
    }
    shortcut() {
        const point = { x: places.shortcut.x - 0.7, z: places.shortcut.z + 3.6 };
        const group = this.group(point);
        this.kit.box({ x: 0, y: 0.48, z: 0 }, { x: 1.5, y: 0.12, z: 0.38 }, 'wood', group);
        for (const x of [-0.5, 0.5])
            this.pole(group, { x, y: 0, z: 0 }, { x, y: 0.45, z: 0 }, 0.075);
        this.fern({ x: places.shortcut.x + 1.5, z: places.shortcut.z + 4.4 }, 0.63, 790);
        this.rock({ x: places.shortcut.x + 2.9, z: places.shortcut.z + 5.0 }, { x: 0.55, y: 0.24, z: 0.42 }, 791);
    }
    forecourt() {
        const point = places.forecourt;
        // 앞뜰에서는 높은 나무 대신 낮은 돌과 고사리로 문까지의 시야를 연다.
        for (const [dx, dz, radius] of [
            [-5.8, 0.4, 0.88],
            [-5.0, -3.5, 0.67],
            [5.3, -3.6, 0.62],
            [4.7, 3.9, 0.7],
        ])
            this.fern({ x: point.x + dx, z: point.z + dz }, radius, 800 + Math.round(dx * 3 + dz));
        this.rock({ x: point.x - 5.6, z: point.z - 0.8 }, { x: 1.0, y: 0.32, z: 0.73 }, 810);
        this.rock({ x: point.x + 5.4, z: point.z - 3.8 }, { x: 0.62, y: 0.26, z: 0.48 }, 811);
    }
    landscape() {
        const grove = places.grove;
        // 굽이 양옆과 굽이 안쪽의 장막이 다음 개울을 한 번에 드러내지 않게 한다.
        const deepGrove = [
            [-5.3, 5.5, 6.7],
            [-5.7, 0.5, 6.2],
            [-4.9, -4.2, 5.9],
            [-8.5, -3.0, 5.2],
            [-3.7, 9.2, 5.8],
            [2.8, 8.8, 5.6],
            [13.4, 6.4, 5.1],
            [4.1, -0.1, 4.1],
            [6.3, 0.4, 4.4],
            [9.8, 1.2, 4.7],
            [13.1, 0.3, 5.4],
        ];
        deepGrove.forEach(([dx, dz, height], i) => this.bamboo({ x: grove.x + dx, z: grove.z + dz }, height, 820 + i * 7));
        // 남쪽 근경은 낮게 남기고, 높은 덩어리는 진행 방향의 북쪽과 측면에 둔다.
        const groups = [
            [-17.5, 27.5, 2.6],
            [-4.7, 27.0, 2.1],
            [-28.8, -3.4, 6.0],
            [-25.5, -2.2, 5.5],
            [-27.0, -10.9, 5.5],
            [-25.2, -16.2, 5.0],
            [-21.0, -19.8, 4.8],
            [-11.3, -20.3, 5.4],
            [-8.5, -16.8, 4.2],
            [-14.0, -2.1, 6.1],
            [-12.5, -1.3, 5.8],
            [-1.3, 8.3, 5.7],
            [-5.0, -16.8, 5.3],
            [-0.2, -14.2, 4.8],
            [-1.4, -20.7, 4.0],
            [31.5, 1.7, 4.8],
            [32.6, -5.5, 5.2],
            [32.8, -14.3, 5.3],
            [27.8, -23.1, 5.0],
            [21.1, -27.8, 4.5],
            [14.7, -28.4, 4.6],
            [-1.6, -32.3, 5.2],
            [8.7, -33.5, 5.0],
            [13.0, -32.0, 5.2],
        ];
        groups.forEach(([x, z, height], i) => this.bamboo({ x, z }, height, 940 + i * 7));
        // 물가와 수련문 앞뜰은 고사리와 낮은 돌로 이어 넓어진 시야를 유지한다.
        const lowPlants = [
            [-17.2, 24.0, 0.94],
            [-6.2, 23.4, 0.77],
            [-14.5, 28.5, 0.83],
            [-29.2, 17.0, 1.06],
            [-29.0, 6.3, 0.9],
            [-16.3, 15.1, 0.56],
            [-16.0, 4.8, 0.69],
            [-10.4, 13.9, 0.74],
            [-4.0, 9.8, 0.85],
            [-25.7, -6.5, 0.81],
            [-23.1, -14.2, 0.88],
            [-20.4, -18.4, 0.7],
            [-14.0, -18.4, 0.91],
            [-8.4, -15.7, 0.66],
            [-5.1, -15.8, 0.72],
            [0.9, 3.2, 0.78],
            [4.0, 2.4, 0.64],
            [7.3, -10.9, 0.7],
            [7.5, -14.0, 0.55],
            [12.2, -0.5, 0.54],
            [20.2, -0.6, 0.6],
            [24.4, -4.7, 0.58],
            [23.3, -14.1, 0.62],
            [28.9, -10.4, 0.84],
            [27.0, -19.2, 0.79],
            [18.8, -24.9, 0.82],
            [10.9, -26.2, 0.58],
            [0.2, -25.7, 0.76],
            [2.0, -31.2, 0.88],
            [10.8, -31.8, 0.87],
        ];
        lowPlants.forEach(([x, z, radius], i) => this.fern({ x, z }, radius, 1180 + i));
        for (const [x, z, sx, sy, sz] of [
            [-27.7, 15.2, 1.55, 0.9, 1.1],
            [-26.5, 16.4, 0.74, 0.41, 0.64],
            [-16.3, 11.6, 0.78, 0.42, 0.63],
            [-15.0, 12.0, 0.43, 0.24, 0.36],
            [-13.3, 1.5, 1.1, 0.52, 0.74],
            [-24.6, -13.8, 1.2, 0.62, 0.82],
            [-11.5, -19.1, 1.45, 0.65, 0.95],
            [-9.8, -19.8, 0.58, 0.3, 0.52],
            [7.8, -11.9, 0.63, 0.25, 0.51],
            [20.8, -1.2, 0.73, 0.29, 0.53],
            [29.3, -12.0, 1.37, 0.72, 0.95],
            [30.5, -13.3, 0.68, 0.38, 0.59],
            [19.7, -25.8, 1.16, 0.49, 0.79],
            [11.0, -32.3, 1.2, 0.54, 0.8],
        ])
            this.rock({ x, z }, { x: sx, y: sy, z: sz }, Math.round(x * 11 + z * 7));
        for (const [x, z, angle] of [
            [-25.0, 17.9, -0.5],
            [-14.7, 11.2, 0.6],
            [-26.2, -9.4, 0.9],
            [-10.7, -18.6, -0.5],
            [1.2, -13.9, 1.1],
        ])
            this.root({ x, z }, angle);
    }
    bamboo(point, height, seed) {
        if (!this.clear(point, height * 0.31 + 0.4))
            return;
        this.nature.bamboo({ ...point, y: this.ground.terrainHeight(point) }, height, { seed });
        this.fern({ x: point.x + 0.8, z: point.z + 0.2 }, 0.69 + (seed % 3) * 0.12, seed + 40);
    }
    clear(point, radius) {
        if (this.ground.distance(point) < radius + 0.2)
            return false;
        if (this.ground.waterDistance(point) < radius * 0.7)
            return false;
        for (const reserve of [places.shrine.model, places.pavilion.model])
            if (Math.hypot(point.x - reserve.x, point.z - reserve.z) < radius + 2.15)
                return false;
        return true;
    }
    fern(point, radius, seed) {
        if (!this.clear(point, radius * 0.84))
            return;
        this.nature.shrub({ ...point, y: this.ground.terrainHeight(point) }, radius, { seed });
    }
    rock(point, scale, seed) {
        if (!this.clear(point, Math.max(scale.x, scale.z) * 1.1))
            return;
        this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + scale.y * 0.25 }, scale, { moss: true, seed });
    }
    root(point, angle) {
        const offsets = [0, 0.58, 1.2, 1.8];
        const points = offsets.map((length) => {
            const p = {
                x: point.x + Math.cos(angle) * length,
                z: point.z + Math.sin(angle) * length + Math.sin(length * 2) * 0.18,
            };
            return {
                ...p,
                y: this.ground.terrainHeight(p) + 0.035 + (1.8 - length) * 0.025,
            };
        });
        if (points.some((p) => this.ground.distance(p) < 0.65 || this.ground.waterDistance(p) < 0.3))
            return;
        this.kit.rootBranch(points, 0.065);
    }
    pole(parent, from, to, radius, kind = 'wood') {
        const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const pole = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.86, radius, direction.length(), 7), kind, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
        }, parent);
        pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }
    curve(parent, points, radius, kind) {
        this.kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, p.z))), 10, radius, 6, false), kind, { x: 0, y: 0, z: 0 }, parent);
    }
    fence(parent, width, height) {
        for (const x of [-width / 2, width / 2])
            this.pole(parent, { x, y: 0, z: 0 }, { x: x + 0.025, y: height + 0.14, z: 0 }, 0.065, 'bamboo');
        for (const y of [height * 0.35, height * 0.83])
            this.pole(parent, { x: -width / 2, y, z: 0 }, { x: width / 2, y: y + 0.025, z: 0 }, 0.045, 'bamboo');
        for (let i = 1; i <= 4; i++) {
            const x = -width / 2 + (width * i) / 5;
            this.pole(parent, { x, y: 0.14, z: 0 }, { x: x + 0.04, y: height, z: 0 }, 0.029, 'bamboo');
        }
    }
    arrow(parent, point, direction) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.43, -0.1);
        shape.lineTo(0.18, -0.1);
        shape.lineTo(0.18, -0.19);
        shape.lineTo(0.48, 0);
        shape.lineTo(0.18, 0.19);
        shape.lineTo(0.18, 0.1);
        shape.lineTo(-0.43, 0.1);
        shape.closePath();
        const arrow = this.kit.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.075, bevelEnabled: false }), 'wood', point, parent);
        if (direction < 0)
            arrow.rotation.z = Math.PI;
    }
    plinth(parent, width, depth, height) {
        const geometry = new THREE.BoxGeometry(width, height, depth, 3, 1, 3);
        const positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), z = positions.getZ(i);
            positions.setX(i, x + Math.sin(z * 3.2 + x * 1.7) * 0.025);
            positions.setZ(i, z + Math.sin(x * 4.3 - z) * 0.028);
        }
        geometry.computeVertexNormals();
        const stone = new THREE.Mesh(geometry, this.nature.surface('stone', 0.93));
        stone.position.y = height / 2;
        stone.castShadow = stone.receiveShadow = true;
        parent.add(stone);
    }
    gableRoof(parent, point, width, depth, rise) {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0.05);
        shape.quadraticCurveTo(-width * 0.23, 0.03, 0, rise);
        shape.quadraticCurveTo(width * 0.23, 0.03, width / 2, 0.05);
        shape.lineTo(width / 2, -0.09);
        shape.quadraticCurveTo(width * 0.23, -0.11, 0, rise - 0.14);
        shape.quadraticCurveTo(-width * 0.23, -0.11, -width / 2, -0.09);
        shape.closePath();
        this.kit.mesh(new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: false,
            curveSegments: 5,
        }), 'bamboo', { x: point.x, y: point.y, z: point.z - depth / 2 }, parent);
        this.pole(parent, { x: point.x, y: point.y + rise + 0.015, z: point.z - depth / 2 - 0.07 }, { x: point.x, y: point.y + rise + 0.015, z: point.z + depth / 2 + 0.07 }, 0.065, 'wood');
        for (const side of [-1, 1])
            this.curve(parent, [
                {
                    x: point.x + (side * width) / 2,
                    y: point.y + 0.05,
                    z: point.z + depth / 2 + 0.025,
                },
                {
                    x: point.x + side * width * 0.26,
                    y: point.y + rise * 0.34,
                    z: point.z + depth / 2 + 0.025,
                },
                { x: point.x, y: point.y + rise, z: point.z + depth / 2 + 0.025 },
            ], 0.055, 'wood');
    }
    hipRoof(parent, point, halfWidth, halfDepth, rise) {
        const corners = [
            { x: halfWidth, z: halfDepth },
            { x: -halfWidth, z: halfDepth },
            { x: -halfWidth, z: -halfDepth },
            { x: halfWidth, z: -halfDepth },
        ];
        const vertices = [], uv = [], indices = [];
        for (let face = 0; face < 4; face++) {
            const a = corners[face], b = corners[(face + 1) % 4];
            const start = vertices.length / 3;
            for (let row = 0; row <= 5; row++)
                for (let col = 0; col <= 5; col++) {
                    const t = row / 5, s = col / 5;
                    vertices.push(((1 - s) * a.x + s * b.x) * t, Math.pow(1 - t, 1.15) * rise + Math.pow(t, 5) * 0.13, ((1 - s) * a.z + s * b.z) * t);
                    uv.push(s, t);
                }
            for (let row = 0; row < 5; row++)
                for (let col = 0; col < 5; col++) {
                    const i = start + row * 6 + col;
                    indices.push(i, i + 1, i + 6, i + 1, i + 7, i + 6);
                }
        }
        const topCount = vertices.length / 3;
        const topIndices = [...indices];
        for (let i = 0; i < topCount; i++) {
            vertices.push(vertices[i * 3], vertices[i * 3 + 1] - 0.12, vertices[i * 3 + 2]);
            uv.push(uv[i * 2], uv[i * 2 + 1]);
        }
        for (let i = 0; i < topIndices.length; i += 3)
            indices.push(topIndices[i] + topCount, topIndices[i + 2] + topCount, topIndices[i + 1] + topCount);
        for (let face = 0; face < 4; face++)
            for (let col = 0; col < 5; col++) {
                const a = face * 36 + 30 + col, b = a + 1;
                indices.push(a, a + topCount, b, b, a + topCount, b + topCount);
            }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        this.kit.mesh(geometry, 'bamboo', point, parent);
        for (const corner of corners)
            this.curve(parent, [
                { x: point.x, y: point.y + rise + 0.015, z: point.z },
                {
                    x: point.x + corner.x * 0.58,
                    y: point.y + rise * 0.32,
                    z: point.z + corner.z * 0.58,
                },
                { x: point.x + corner.x, y: point.y + 0.145, z: point.z + corner.z },
            ], 0.052, 'wood');
    }
    cloth(parent, point, width, height) {
        const geometry = new THREE.PlaneGeometry(width, height, 5, 4);
        const positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i);
            positions.setZ(i, Math.cos(x * 13) * 0.035 + (height / 2 - y) * 0.05);
        }
        geometry.computeVertexNormals();
        const cloth = this.kit.mesh(geometry, 'cloth', point, parent);
        this.kit.material('cloth').side = THREE.DoubleSide;
        cloth.castShadow = false;
    }
    lantern(parent, point, scale) {
        const group = new THREE.Group();
        group.position.set(point.x, point.y, point.z);
        group.scale.setScalar(scale);
        parent.add(group);
        this.kit.mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.33, 8), 'cloth', { x: 0, y: 0, z: 0 }, group);
        for (const y of [-0.19, 0.19])
            this.kit.mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 8), 'wood', { x: 0, y, z: 0 }, group);
        this.pole(group, { x: 0, y: 0.22, z: 0 }, { x: 0, y: 0.43, z: 0 }, 0.017, 'rope');
    }
    slab(area, z, depth, seed) {
        const width = area.maxX - area.minX + Math.sin(seed * 0.7) * 0.1;
        // 디딤 폭을 유지하고 닳은 모서리와 작은 돌 틈으로 긴 평판을 나눈다.
        const shape = new THREE.Shape();
        const halfX = width / 2, halfZ = depth / 2;
        const outline = [
            [-halfX + 0.24, -halfZ],
            [halfX - 0.26, -halfZ],
            [halfX + 0.015, -halfZ + 0.29],
            [halfX, halfZ - 0.26],
            [halfX - 0.25, halfZ],
            [-halfX + 0.23, halfZ],
            [-halfX - 0.015, halfZ - 0.26],
            [-halfX, -halfZ + 0.28],
        ];
        outline.forEach(([x, dz], i) => {
            const px = x + Math.sin(seed + i * 2.9) * 0.018;
            if (i === 0)
                shape.moveTo(px, -dz);
            else
                shape.lineTo(px, -dz);
        });
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.105,
            bevelEnabled: false,
        });
        geometry.rotateX(-Math.PI / 2);
        const stone = new THREE.Mesh(geometry, this.nature.surface('stone', 0.87 + (seed % 3) * 0.06));
        stone.position.set(places.steppingStones.center.x + Math.sin(seed) * 0.025, -0.05, z);
        stone.rotation.y = Math.sin(seed * 1.7) * 0.008;
        stone.receiveShadow = true;
        this.kit.root.add(stone);
    }
}
function lilyGeometry(radius) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 0; i <= 18; i++) {
        const angle = 0.23 + (i / 18) * (Math.PI * 2 - 0.46);
        const r = radius * (0.96 + Math.sin(i * 1.7) * 0.035);
        shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 0.82);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
}
