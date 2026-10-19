import * as THREE from 'three';
import { NaturalScenery } from './natural-scenery.js';
import { pineJourneyPlaces as places } from './pine-journey-layout.js';
/** 지면·물은 공유 Terrain이, 소나무·작업집·교량 모형은 MapKit이 소유한다. */
export function buildPineJourney(kit, ground) {
    new PineJourneyScenery(kit, ground).build();
}
class PineJourneyScenery {
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
        this.stoneBridge();
        this.waterside();
        this.watermill();
        this.loggingYard();
        this.returnTrail();
        this.farBank();
        this.ridge();
        this.battleGate();
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
        const p = places.entrance;
        for (const side of [-1, 1]) {
            const point = { x: p.x + side * 3.5, z: p.z + 0.4 };
            const group = this.group(point);
            this.pole(group, { x: 0, y: 0, z: 0 }, { x: side * 0.045, y: 1.14, z: 0 }, 0.09);
            this.pole(group, { x: 0, y: 0.7, z: 0 }, { x: side * 1.3, y: 0.61, z: 0.08 }, 0.065);
            this.rock({ x: point.x + side * 0.8, z: point.z + 0.3 }, { x: 0.84, y: 0.42, z: 0.66 }, 40 + side);
        }
        const sign = this.group({
            x: places.bridge.center.x - 6.9,
            z: places.bridge.area.minZ - 2.3,
        });
        this.pole(sign, { x: 0, y: 0, z: 0 }, { x: 0.03, y: 1.16, z: 0 }, 0.075);
        for (const [y, direction] of [
            [0.95, -1],
            [0.72, 1],
        ]) {
            const board = this.kit.box({ x: direction * 0.22, y, z: 0 }, { x: 0.87, y: 0.18, z: 0.1 }, 'wood', sign);
            board.rotation.z = direction * 0.1;
        }
    }
    stoneBridge() {
        const { area } = places.bridge;
        const length = area.maxZ - area.minZ;
        const width = area.maxX - area.minX;
        const count = Math.ceil(length / 0.8);
        for (let row = 0; row < count; row++) {
            const z = area.minZ + ((row + 0.5) / count) * length;
            for (const side of [-1, 1])
                this.stoneSlab({ x: places.bridge.center.x + side * width * 0.25, z }, width / 2 + 0.025, length / count + 0.018, 100 + row * 3 + side);
        }
        // 얕은 석교의 윗면은 평평하게 두고, 두꺼운 측석과 낮은 난간으로 무게를 준다.
        for (const x of [area.minX - 0.18, area.maxX + 0.18]) {
            for (let i = 0; i < 6; i++) {
                const z = area.minZ + ((i + 0.5) / 6) * length;
                this.stoneBox({ x, y: 0.2 + Math.sin(i * 2.2) * 0.008, z }, { x: 0.35, y: 0.42, z: length / 6 - 0.035 }, i % 2 === 0 ? 0.92 : 0.99);
            }
            for (let i = 0; i < 4; i++) {
                const z = area.minZ + (i / 3) * length;
                this.stoneBox({ x, y: 0.42, z }, { x: 0.36, y: 0.84, z: 0.38 }, 0.95);
                this.nature.rock({ x, y: 0.83, z }, { x: 0.25, y: 0.07, z: 0.25 }, { moss: true, seed: 140 + i });
            }
            this.stoneBox({ x, y: 0.64, z: places.bridge.center.z }, { x: 0.23, y: 0.13, z: length + 0.1 }, 0.99);
        }
        this.rock({ x: area.minX - 2.3, z: area.maxZ - 0.8 }, { x: 1.26, y: 0.63, z: 0.94 }, 150);
        this.fern({ x: area.maxX + 1.8, z: area.minZ - 1.7 }, 0.73, 151);
    }
    waterside() {
        const p = places.waterside.model;
        this.nature.rock({ ...p, y: this.ground.terrainHeight(p) + 0.34 }, { x: 1.34, y: 0.55, z: 0.93 }, { moss: true, seed: 170 });
        for (const [dx, dz, scale] of [
            [1.8, 0.6, 0.46],
            [-1.65, 0.9, 0.55],
            [1.3, 1.6, 0.31],
        ]) {
            const point = { x: p.x + dx, z: p.z + dz };
            if (this.ground.distance(point) < scale + 0.25)
                continue;
            this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + scale * 0.32 }, { x: scale, y: scale * 0.48, z: scale * 0.77 }, { moss: true, seed: 176 + Math.round(dx * 5) });
        }
        this.fern({ x: p.x - 1.2, z: p.z - 1.8 }, 0.56, 183);
    }
    watermill() {
        const p = places.mill.model;
        const group = this.group(p);
        this.stoneBox({ x: 0, y: 0.14, z: 0 }, { x: 3.3, y: 0.28, z: 2.8 }, 0.93, group);
        this.kit.box({ x: 0, y: 1.22, z: 0 }, { x: 3.1, y: 1.96, z: 2.56 }, 'wood', group);
        for (const x of [-1.53, 1.53])
            for (const z of [-1.28, 1.28])
                this.pole(group, { x, y: 0.21, z }, { x: x + 0.027, y: 2.48, z }, 0.11, 'bark');
        for (const y of [0.48, 1.13, 1.91])
            this.kit.box({ x: 0, y, z: 1.3 }, { x: 3.14, y: 0.065, z: 0.08 }, 'bark', group);
        // 열린 방문점은 작업집 서쪽에 두어 지붕이 주인공 앞을 가리지 않는다.
        this.kit.box({ x: -1.57, y: 0.96, z: -0.1 }, { x: 0.06, y: 1.38, z: 0.82 }, 'bark', group);
        for (const z of [-0.95, 0.87]) {
            this.kit.box({ x: -1.59, y: 1.54, z }, { x: 0.06, y: 0.5, z: 0.48 }, 'bark', group);
            this.pole(group, { x: -1.64, y: 1.31, z }, { x: -1.64, y: 1.76, z }, 0.024);
        }
        this.roof(group, 2.35, 4.0, 3.4, 0.77);
        this.kit.box({ x: -1.85, y: 0.38, z: -0.1 }, { x: 0.45, y: 0.14, z: 1.1 }, 'wood', group);
        const support = new THREE.Group();
        const wheelAngle = 0.5;
        const wheelRadius = 1.19;
        const rimThickness = 0.1;
        const waterY = -0.065;
        // 외곽 테가 수면 아래로 조금 잠기게 하고, 물레 면은 사선 카메라에 열어 둔다.
        support.position.set(p.x + 2.3, waterY + wheelRadius + rimThickness - 0.055, p.z + 2.9);
        support.rotation.y = wheelAngle;
        this.kit.root.add(support);
        this.pole(support, { x: 0, y: 0, z: -2.1 }, { x: 0, y: 0, z: 0.4 }, 0.1, 'bark');
        // 새 축 방향에 맞춘 고정 받침은 물가 위에서 집과 물레를 이어 준다.
        for (const side of [-1, 1]) {
            const localX = side * 0.33;
            const localZ = -1.45;
            const point = {
                x: support.position.x +
                    Math.cos(wheelAngle) * localX +
                    Math.sin(wheelAngle) * localZ,
                z: support.position.z -
                    Math.sin(wheelAngle) * localX +
                    Math.cos(wheelAngle) * localZ,
            };
            this.pole(this.kit.root, { ...point, y: this.ground.terrainHeight(point) }, { ...point, y: support.position.y + 0.16 }, 0.085);
        }
        this.pole(support, { x: -0.44, y: 0.12, z: -1.45 }, { x: 0.44, y: 0.12, z: -1.45 }, 0.09);
        const wheel = new THREE.Group();
        wheel.name = 'trail-waterwheel';
        support.add(wheel);
        for (const radius of [wheelRadius, 0.94])
            this.kit.mesh(new THREE.TorusGeometry(radius, radius > 1 ? rimThickness : 0.052, 6, 24), 'wood', { x: 0, y: 0, z: 0 }, wheel);
        const hub = this.kit.mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.05, 8), 'bark', { x: 0, y: 0, z: -0.1 }, wheel);
        hub.rotation.x = Math.PI / 2;
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const spoke = this.kit.box({ x: Math.cos(angle) * 0.6, y: Math.sin(angle) * 0.6, z: 0 }, { x: 1.11, y: 0.085, z: 0.13 }, 'wood', wheel);
            spoke.rotation.z = angle;
            const paddle = this.kit.box({
                x: Math.cos(angle) * wheelRadius,
                y: Math.sin(angle) * wheelRadius,
                z: 0,
            }, { x: 0.12, y: 0.35, z: 0.52 }, i % 4 === 0 ? 'moss' : 'wood', wheel);
            paddle.rotation.z = angle;
        }
        this.fern({ x: p.x - 1.9, z: p.z + 1.6 }, 0.68, 210);
        this.rock({ x: p.x + 3.6, z: p.z - 0.2 }, { x: 0.87, y: 0.42, z: 0.64 }, 211);
    }
    loggingYard() {
        const p = places.loggingYard.model;
        const group = this.group(p);
        for (const x of [-1.26, 1.26])
            for (const z of [-0.98, 0.98])
                this.pole(group, { x, y: 0, z }, { x: x - 0.035, y: z < 0 ? 1.97 : 1.8, z }, 0.09, 'bark');
        this.kit.box({ x: 0, y: 0.78, z: 0 }, { x: 2.8, y: 0.15, z: 1.55 }, 'wood', group);
        // 일부만 남은 지붕과 기울어진 판자가 오래된 벌목 시설을 드러낸다.
        for (let i = 0; i < 5; i++) {
            const plank = this.kit.box({ x: -1.24 + i * 0.35, y: 1.96 + i * 0.025, z: -0.2 }, { x: 0.3, y: 0.095, z: 2.45 - (i % 2) * 0.3 }, 'bark', group);
            plank.rotation.z = 0.06;
        }
        this.pole(group, { x: -1.3, y: 1.7, z: 1.0 }, { x: 1.3, y: 1.75, z: 1.0 }, 0.075);
        for (const [dx, dz, radius, length, lift] of [
            [-0.4, 2.6, 0.27, 2.6, 0],
            [-0.2, 3.1, 0.24, 2.4, 0],
            [-0.3, 2.85, 0.23, 2.45, 0.43],
            [1.2, -2.2, 0.21, 2.15, 0],
        ])
            this.log({ x: p.x + dx, z: p.z + dz }, radius, length, dx * 0.06, lift);
        for (const point of [
            { x: p.x - 1.6, z: p.z - 2.5 },
            { x: p.x + 1.5, z: p.z + 3.8 },
        ])
            this.stump(point, 0.36);
        this.fern({ x: p.x - 2.4, z: p.z + 1.2 }, 0.91, 230);
        this.fern({ x: p.x + 1.2, z: p.z - 3.5 }, 0.62, 231);
    }
    returnTrail() {
        const p = places.shortcut;
        this.rock({ x: p.x - 3.4, z: p.z + 2.0 }, { x: 0.91, y: 0.48, z: 0.69 }, 250);
        this.fern({ x: p.x + 3.5, z: p.z - 1.0 }, 0.82, 251);
        this.root({ x: p.x + 2.9, z: p.z - 2.3 }, 0.75, 1.6);
        this.root({ x: p.x - 3.4, z: p.z + 0.9 }, -1.6, 1.45);
    }
    farBank() {
        const p = places.farBank;
        const group = this.group({ x: p.x + 3.1, z: p.z + 1.9 }, -0.3);
        this.kit.box({ x: 0, y: 0.41, z: 0 }, { x: 1.72, y: 0.13, z: 0.4 }, 'wood', group);
        for (const x of [-0.6, 0.6])
            this.pole(group, { x, y: 0, z: 0 }, { x, y: 0.4, z: 0 }, 0.085);
        this.rock({ x: p.x - 3.9, z: p.z + 2.0 }, { x: 1.15, y: 0.37, z: 0.8 }, 270);
        this.fern({ x: p.x + 3.7, z: p.z - 0.7 }, 0.72, 271);
    }
    ridge() {
        const p = places.ridge;
        // 길 바깥의 비대칭 암반만 높이고 실제 통행면에는 높이 차를 만들지 않는다.
        for (const [dx, dz, sx, sy, sz] of [
            [-3.8, 3.7, 1.9, 2.1, 1.3],
            [4.8, -1.0, 1.7, 2.35, 1.3],
            [-5.3, 4.8, 0.9, 0.83, 0.75],
            [5.5, -3.1, 1.1, 0.97, 0.88],
        ])
            this.rock({ x: p.x + dx, z: p.z + dz }, { x: sx, y: sy, z: sz }, 290 + Math.round(dx * 9 + dz));
        for (let i = 0; i < 3; i++) {
            const point = { x: p.x + 3.9 - i * 0.2, z: p.z - 3.0 - i * 1.6 };
            if (!this.clear(point, 0.3))
                continue;
            const y = this.ground.terrainHeight(point);
            this.pole(this.kit.root, { ...point, y }, { x: point.x + 0.03, y: y + 0.88, z: point.z }, 0.075);
            if (i < 2)
                this.pole(this.kit.root, { ...point, y: y + 0.59 }, { x: point.x - 0.11, y: y + 0.52, z: point.z - 0.8 }, 0.05);
        }
    }
    battleGate() {
        const p = places.battleGate.model;
        const group = this.group(p);
        for (const x of [-2.52, 2.52]) {
            for (let row = 0; row < 4; row++)
                this.stoneBox({ x: x + Math.sin(row * 2.3) * 0.018, y: 0.3 + row * 0.57, z: 0 }, { x: 0.66, y: 0.56, z: 0.74 }, row % 2 ? 0.94 : 0.99, group);
            this.stoneBox({ x, y: 2.38, z: 0 }, { x: 0.9, y: 0.21, z: 0.95 }, 0.94, group);
        }
        this.pole(group, { x: -3.0, y: 2.57, z: 0 }, { x: 2.85, y: 2.52, z: -0.025 }, 0.13, 'bark');
        this.kit.box({ x: -0.12, y: 2.32, z: 0.18 }, { x: 1.0, y: 0.36, z: 0.12 }, 'wood', group);
        for (const side of [-1, 1])
            for (let i = 0; i < 3; i++)
                this.rock({ x: p.x + side * (4.2 + i * 1.1), z: p.z - 0.4 - (i % 2) * 0.2 }, { x: 0.75, y: 0.68 - i * 0.12, z: 0.65 }, 320 + i + side * 4);
    }
    landscape() {
        // 근경은 낮게 두고 숲의 굽이와 계곡 안쪽에 큰 소나무가 겹치게 모은다.
        const pines = [
            [18.5, 19.5, 6.0],
            [22.5, 21.0, 5.5],
            [7.0, 26.4, 2.9],
            [2.5, 12.5, 5.5],
            [5.6, 12.5, 5.8],
            [10.5, 14.0, 5.8],
            [-12.8, 11.0, 6.0],
            [-11.5, 17.8, 5.6],
            [-7.1, 20.9, 5.5],
            [-13.7, 16.5, 6.0],
            [-16.9, 11.1, 5.6],
            [-24.4, 9.1, 6.2],
            [-29.7, 4.2, 5.4],
            [-29.6, -4.1, 5.9],
            [-30.5, -12.7, 5.7],
            [-26.4, -17.9, 5.2],
            [-21.3, -21.7, 6.1],
            [-13.9, -23.0, 5.2],
            [-8.4, -23.0, 4.6],
            [-12.5, -9.5, 4.7],
            [-8.5, -13.5, 4.2],
            [-2.0, -10.3, 5.4],
            [4.2, -12.3, 5.5],
            [0.9, -16.2, 4.5],
            [20.4, -11.6, 5.8],
            [25.8, -9.0, 5.1],
            [30.3, -3.8, 5.5],
            [30.8, 3.6, 4.6],
            [28.5, 13.7, 4.1],
            [20.0, 16.9, 3.1],
            [17.5, -22.5, 5.4],
            [9.9, -25.3, 5.1],
            [4.9, -31.4, 5.3],
            [-5.9, -32.8, 5.5],
            [-11.8, -29.4, 5.0],
        ];
        pines.forEach(([x, z, height], i) => {
            const point = { x, z };
            if (!this.clear(point, height * 0.34 + 0.25))
                return;
            this.nature.pine({ ...point, y: this.ground.terrainHeight(point) }, height, { seed: 400 + i * 11 });
            if (i % 2 === 0)
                this.fern({ x: x + 1.1, z: z - 0.3 }, 0.85, 500 + i);
        });
        for (const [x, z, radius] of [
            [17.3, 27.1, 0.9],
            [8.2, 27.4, 0.85],
            [11.5, 13.6, 0.8],
            [-2.8, 21.5, 1.0],
            [-11.8, 12.9, 0.82],
            [-15.4, 7.1, 0.7],
            [-18.9, -2.7, 0.65],
            [-24.0, -4.6, 0.88],
            [-25.8, -14.7, 0.9],
            [-20.8, -15.8, 0.72],
            [-13.8, -12.3, 0.67],
            [-5.3, -13.1, 0.82],
            [4.2, -9.9, 0.57],
            [10.4, -1.0, 0.65],
            [14.7, 2.2, 0.78],
            [25.0, 4.9, 0.66],
            [27.2, -4.7, 0.94],
            [18.5, -14.9, 0.81],
            [12.8, -23.0, 0.86],
            [4.4, -23.9, 0.71],
            [-7.0, -24.6, 0.83],
        ])
            this.fern({ x, z }, radius, 560 + Math.round(x * 5 + z));
        for (const [x, z, sx, sy, sz] of [
            [-16.3, 14.7, 1.5, 0.9, 1.05],
            [-17.7, 15.4, 0.69, 0.4, 0.57],
            [-21.3, 5.0, 1.2, 0.61, 0.87],
            [-26.3, -4.5, 1.5, 0.88, 1.04],
            [-22.8, -18.4, 1.4, 0.75, 0.96],
            [-6.0, -21.4, 1.1, 0.5, 0.79],
            [9.8, 12.9, 1.2, 0.49, 0.92],
            [25.2, 11.1, 1.45, 0.63, 1.0],
            [28.6, -6.4, 1.3, 0.7, 0.94],
            [18.6, -20.7, 1.5, 0.8, 1.05],
        ])
            this.rock({ x, z }, { x: sx, y: sy, z: sz }, Math.round(x * 13 + z * 5));
        for (const [x, z, angle] of [
            [-11.7, 14.0, 0.5],
            [-20.9, -13.4, -0.7],
            [-5.0, -12.2, 0.4],
            [17.8, -19.3, -1.6],
        ])
            this.root({ x, z }, angle, 1.7);
    }
    clear(point, radius) {
        if (this.ground.distance(point) < radius + 0.2)
            return false;
        if (this.ground.waterDistance(point) < radius * 0.7)
            return false;
        for (const model of [places.mill.model, places.loggingYard.model])
            if (Math.hypot(point.x - model.x, point.z - model.z) < radius + 2.4)
                return false;
        return true;
    }
    fern(point, radius, seed) {
        if (!this.clear(point, radius * 0.83))
            return;
        this.nature.shrub({ ...point, y: this.ground.terrainHeight(point) }, radius, { seed });
    }
    rock(point, scale, seed) {
        if (!this.clear(point, Math.max(scale.x, scale.z) * 1.1))
            return;
        this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + scale.y * 0.25 }, scale, { moss: true, seed });
    }
    root(point, angle, length) {
        const points = [0, 0.34, 0.72, 1].map((t) => {
            const p = {
                x: point.x + Math.cos(angle) * length * t,
                z: point.z + Math.sin(angle) * length * t + Math.sin(t * 4) * 0.14,
            };
            return { ...p, y: this.ground.terrainHeight(p) + 0.04 + (1 - t) * 0.045 };
        });
        if (points.some((p) => this.ground.distance(p) < 0.7 || this.ground.waterDistance(p) < 0.3))
            return;
        this.kit.rootBranch(points, 0.065);
    }
    pole(parent, from, to, radius, kind = 'wood') {
        const delta = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const mesh = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.83, radius, delta.length(), 7), kind, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
        }, parent);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
    stoneBox(position, size, shade, parent = this.kit.root) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), this.nature.surface('stone', shade));
        mesh.position.set(position.x, position.y, position.z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
    }
    stoneSlab(point, width, depth, seed) {
        const shape = new THREE.Shape();
        const outline = [
            [-width / 2 + 0.045, -depth / 2],
            [width / 2 - 0.045, -depth / 2],
            [width / 2, -depth / 2 + 0.045],
            [width / 2, depth / 2 - 0.045],
            [width / 2 - 0.045, depth / 2],
            [-width / 2 + 0.045, depth / 2],
            [-width / 2, depth / 2 - 0.045],
            [-width / 2, -depth / 2 + 0.045],
        ];
        outline.forEach(([x, z], i) => {
            if (i === 0)
                shape.moveTo(x, -z);
            else
                shape.lineTo(x, -z);
        });
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.11,
            bevelEnabled: false,
        });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, this.nature.surface('stone', seed % 2 === 0 ? 0.95 : 0.99));
        mesh.position.set(point.x, -0.055, point.z);
        mesh.receiveShadow = true;
        this.kit.root.add(mesh);
    }
    roof(parent, y, width, depth, rise) {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0);
        shape.lineTo(0, rise);
        shape.lineTo(width / 2, 0);
        shape.lineTo(width / 2, -0.14);
        shape.lineTo(0, rise - 0.14);
        shape.lineTo(-width / 2, -0.14);
        shape.closePath();
        this.kit.mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), 'bark', { x: 0, y, z: -depth / 2 }, parent);
        for (let i = 0; i < 5; i++) {
            const x = -width * 0.4 + i * width * 0.2;
            this.pole(parent, {
                x,
                y: y + rise * (1 - Math.abs(x) / (width / 2)) + 0.035,
                z: -depth / 2,
            }, {
                x,
                y: y + rise * (1 - Math.abs(x) / (width / 2)) + 0.035,
                z: depth / 2,
            }, 0.028, 'wood');
        }
    }
    log(point, radius, length, angle, lift) {
        if (this.ground.distance(point) < radius + 0.35)
            return;
        const group = this.group(point, angle);
        const body = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.92, radius, length, 9), 'bark', { x: 0, y: radius + lift, z: 0 }, group);
        body.rotation.z = Math.PI / 2;
        for (const side of [-1, 1]) {
            const end = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.83, radius * 0.83, 0.022, 9), 'wood', { x: (side * length) / 2, y: radius + lift, z: 0 }, group);
            end.rotation.z = Math.PI / 2;
            const ring = this.kit.mesh(new THREE.TorusGeometry(radius * 0.49, 0.012, 4, 12), 'bark', { x: side * (length / 2 + 0.014), y: radius + lift, z: 0 }, group);
            ring.rotation.y = Math.PI / 2;
        }
    }
    stump(point, radius) {
        if (!this.clear(point, radius))
            return;
        const group = this.group(point);
        this.kit.mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 1.13, 0.42, 9), 'bark', { x: 0, y: 0.21, z: 0 }, group);
        this.kit.mesh(new THREE.CylinderGeometry(radius * 0.84, radius * 0.84, 0.025, 9), 'wood', { x: 0, y: 0.427, z: 0 }, group);
    }
}
