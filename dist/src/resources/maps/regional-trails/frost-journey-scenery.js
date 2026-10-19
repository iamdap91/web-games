import * as THREE from 'three';
import { frostJourneyPlaces as places } from './frost-journey-layout.js';
import { NaturalScenery } from './natural-scenery.js';
/** 바닥·수면은 공통 지면에 맡기고, 눈솔숲과 설산 모형의 리듬을 만든다. */
export function buildFrostJourney(kit, ground) {
    new FrostJourneyScenery(kit, ground).build();
}
class FrostJourneyScenery {
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
        this.cabin();
        this.cairn();
        this.returnPass();
        this.ridge();
        this.valley();
        this.lakeLookout();
        this.battlePass();
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
        for (const side of [-1, 1]) {
            const fence = this.group({ x: point.x + side * 3.5, z: point.z + 0.5 });
            for (const z of [-1.4, 1.4]) {
                this.pole(fence, { x: 0, y: 0, z }, { x: 0.03, y: 0.87, z }, 0.1);
                this.kit.box({ x: 0, y: 0.91, z }, { x: 0.28, y: 0.12, z: 0.3 }, 'snow', fence);
            }
            this.pole(fence, { x: 0, y: 0.55, z: -1.5 }, { x: 0.02, y: 0.58, z: 1.5 }, 0.09);
            this.snowRock({ x: point.x + side * 4.5, z: point.z - 1.5 }, { x: 0.86, y: 0.35, z: 0.64 }, 200 + side);
        }
        const marker = this.group({ x: point.x + 3.7, z: point.z - 3.7 });
        this.kit.box({ x: 0, y: 0.45, z: 0 }, { x: 0.55, y: 0.9, z: 0.46 }, 'stone', marker).rotation.z = -0.08;
        this.snowLump(marker, { x: 0.02, y: 0.94, z: 0 }, { x: 0.4, y: 0.13, z: 0.34 });
        this.directionSign({ x: places.fork.x + 2, z: places.fork.z + 4 });
    }
    stoneBridge() {
        const { area, center } = places.bridge;
        const width = area.maxX - area.minX;
        const length = area.maxZ - area.minZ;
        const rows = 8;
        // 상판 높이는 공통 bridge 발 높이와 같은 0.055로 맞춘다.
        for (let row = 0; row < rows; row++) {
            const z = area.minZ + ((row + 0.5) / rows) * length;
            for (let col = 0; col < 3; col++) {
                const x = area.minX + ((col + 0.5) / 3) * width;
                const slab = this.kit.box({ x, y: 0.005, z }, { x: width / 3 - 0.014, y: 0.1, z: length / rows - 0.012 }, 'stone');
                slab.rotation.y = Math.sin(row * 3.1 + col) * 0.003;
            }
        }
        for (const x of [area.minX - 0.2, area.maxX + 0.2]) {
            for (let index = 0; index < 5; index++) {
                const z = area.minZ + (index / 4) * length;
                const height = 0.58 + Math.sin((index / 4) * Math.PI) * 0.14;
                this.kit.box({ x, y: height / 2 - 0.07, z }, { x: 0.37, y: height, z: 0.35 }, 'stone');
                this.snowLump(this.kit.root, { x: x - 0.02, y: height - 0.03, z }, { x: 0.26, y: 0.09, z: 0.24 });
                if (index < 4) {
                    const nextZ = area.minZ + ((index + 1) / 4) * length;
                    this.pole(this.kit.root, { x, y: height - 0.21, z }, { x, y: height - 0.18, z: nextZ }, 0.11, 'stone');
                }
            }
        }
        for (const side of [-1, 1]) {
            this.snowRock({ x: center.x + side * 5.1, z: area.maxZ + 2.5 }, { x: 1.15, y: 0.54, z: 0.87 }, 230 + side);
            this.snowRock({ x: center.x + side * 6.5, z: area.minZ - 2.6 }, { x: 0.74, y: 0.31, z: 0.62 }, 240 + side);
        }
    }
    cabin() {
        // 산장은 길 서쪽에 두고 열린 처마가 동쪽 방문점을 향하게 한다.
        const group = this.group(places.cabin.model, Math.PI / 2);
        for (const x of [-1.45, 0, 1.45])
            for (const z of [-1.18, 1.18])
                this.nature.rock({ x, y: 0.17, z }, { x: 0.44, y: 0.25, z: 0.35 }, { snow: true, seed: 250 + x * 10 + z, parent: group });
        this.kit.box({ x: 0, y: 0.26, z: 0 }, { x: 3.55, y: 0.18, z: 3.1 }, 'wood', group);
        for (let row = 0; row < 7; row++) {
            const y = 0.45 + row * 0.255;
            for (const x of [-1.62, 1.62])
                this.pole(group, { x, y, z: -1.65 }, { x: x + 0.025, y: y + 0.012, z: 1.65 }, 0.16, 'bark');
            this.pole(group, { x: -1.84, y, z: -1.43 }, { x: 1.84, y: y + 0.018, z: -1.43 }, 0.16, 'bark');
            for (const side of [-1, 1])
                this.pole(group, { x: side * 0.53, y, z: 1.43 }, { x: side * 1.82, y: y + 0.014, z: 1.43 }, 0.16, 'bark');
        }
        this.kit.box({ x: 0, y: 1.06, z: 1.48 }, { x: 0.89, y: 1.55, z: 0.11 }, 'wood', group);
        for (const x of [-0.28, 0, 0.28])
            this.kit.box({ x, y: 1.06, z: 1.55 }, { x: 0.018, y: 1.43, z: 0.018 }, 'bark', group);
        this.kit.mesh(new THREE.TorusGeometry(0.06, 0.014, 4, 9), 'rope', { x: 0.26, y: 1.05, z: 1.59 }, group);
        for (const x of [-1.07, 1.07])
            this.window(group, x, 1.35, 1.61);
        const gable = new THREE.Shape();
        gable.moveTo(-1.72, 0);
        gable.lineTo(0, 0.9);
        gable.lineTo(1.72, 0);
        gable.closePath();
        for (const z of [-1.46, 1.41])
            this.kit.mesh(new THREE.ExtrudeGeometry(gable, {
                depth: 0.07,
                bevelEnabled: false,
            }), 'wood', { x: 0, y: 2.1, z }, group);
        this.roof(group, 2.15, 4.35, 3.95, 1.12);
        this.kit.box({ x: 0, y: 0.13, z: 1.93 }, { x: 2.8, y: 0.18, z: 0.7 }, 'wood', group);
        for (const x of [-1.4, 1.4])
            this.pole(group, { x, y: 0.2, z: 1.97 }, { x, y: 2.2, z: 1.97 }, 0.085);
        for (let index = 0; index < 3; index++)
            this.kit.box({ x: -0.95, y: 2.85 + index * 0.35, z: -0.76 }, { x: 0.57 - index * 0.03, y: 0.38, z: 0.53 }, 'stone', group);
        this.snowLump(group, { x: -0.94, y: 3.75, z: -0.75 }, { x: 0.43, y: 0.13, z: 0.39 });
        for (let index = 0; index < 6; index++) {
            const y = 0.29 + Math.floor(index / 3) * 0.25;
            this.pole(group, { x: 2.04, y, z: -0.82 + (index % 3) * 0.28 }, { x: 2.04, y: y + 0.01, z: 0.27 + (index % 3) * 0.28 }, 0.13, 'bark');
        }
        this.snowRock({ x: places.cabin.model.x - 2.5, z: places.cabin.model.z + 2.1 }, { x: 1.08, y: 0.48, z: 0.81 }, 260);
    }
    cairn() {
        const point = places.cairn.model;
        const group = this.group(point);
        let y = 0;
        for (let index = 0; index < 6; index++) {
            const radius = 0.78 - index * 0.105;
            const height = 0.22 - index * 0.014;
            this.nature.rock({
                x: Math.sin(index * 2.6) * 0.075,
                y: y + height * 0.7,
                z: Math.cos(index * 1.9) * 0.07,
            }, { x: radius, y: height, z: radius * 0.78 }, { snow: true, seed: 270 + index * 4, parent: group });
            y += height * 1.58;
        }
        this.pole(group, { x: 0.72, y: 0.08, z: -0.18 }, { x: 0.75, y: 2.02, z: -0.22 }, 0.05);
        this.cloth(group, { x: 1.01, y: 1.59, z: -0.2 }, 0.56, 0.46);
        for (const [dx, dz, scale] of [
            [-1.25, -1.22, 0.52],
            [1.34, 0.92, 0.39],
            [0.71, -1.68, 0.62],
        ])
            this.snowRock({ x: point.x + dx, z: point.z + dz }, { x: scale, y: scale * 0.5, z: scale * 0.74 }, 290 + Math.round(dx * 8));
    }
    returnPass() {
        const point = {
            x: places.returnPass.x + 3.3,
            z: places.returnPass.z + 0.3,
        };
        this.directionSign(point);
        const fallen = { x: -5.5, z: -0.5 };
        if (this.clear(fallen, 1.1)) {
            const group = this.group(fallen, -0.32);
            this.pole(group, { x: -1.2, y: 0.19, z: 0 }, { x: 1.2, y: 0.22, z: 0.08 }, 0.2, 'bark');
            this.pole(group, { x: 0.4, y: 0.23, z: 0 }, { x: 0.91, y: 0.56, z: -0.36 }, 0.055, 'bark');
            this.snowLump(group, { x: -0.35, y: 0.34, z: 0.02 }, { x: 0.87, y: 0.12, z: 0.25 });
        }
    }
    ridge() {
        const shelter = this.group({ x: -16.1, z: -13.0 }, -0.22);
        for (const x of [-1.25, 1.25]) {
            this.pole(shelter, { x, y: 0, z: 0 }, { x: x + 0.06, y: 1.65, z: 0 }, 0.11);
            this.snowLump(shelter, { x: x + 0.06, y: 1.7, z: 0 }, { x: 0.17, y: 0.08, z: 0.17 });
        }
        for (const y of [0.35, 1.47])
            this.pole(shelter, { x: -1.25, y, z: 0 }, { x: 1.25, y: y + 0.03, z: 0 }, 0.075);
        this.cloth(shelter, { x: -0.02, y: 0.97, z: 0.04 }, 2.25, 0.86);
        for (const [x, z, sx, sy, sz] of [
            [-18.8, -9.1, 1.65, 1.6, 1.14],
            [-19.6, -14.8, 2.0, 2.6, 1.4],
            [-17.4, -18.7, 2.25, 1.9, 1.35],
            [-14.9, -23.1, 1.42, 0.92, 1.12],
        ])
            this.snowRock({ x, z }, { x: sx, y: sy, z: sz }, Math.round(x * 13 + z));
    }
    valley() {
        // 골짜기는 낮은 돌과 뿌리로 비워 두어 높은 서쪽 능선과 대비한다.
        for (const [x, z, sx, sy, sz] of [
            [3.7, -12.0, 0.87, 0.3, 0.66],
            [4.0, -14.0, 0.58, 0.22, 0.45],
            [11.3, -10.2, 0.74, 0.38, 0.61],
            [0.0, -16.0, 1.07, 0.42, 0.72],
            [1.2, -17.2, 0.52, 0.2, 0.4],
        ])
            this.snowRock({ x, z }, { x: sx, y: sy, z: sz }, Math.round(x * 5 - z * 11));
        this.root({ x: 3.7, z: -9.8 }, -1.15);
        this.root({ x: 0.7, z: -18.1 }, 0.3);
        this.snowShrub({ x: 3.6, z: -15.2 }, 0.68, 330);
        this.snowShrub({ x: 11.4, z: -8.8 }, 0.73, 331);
    }
    lakeLookout() {
        const railing = this.group({ x: 7.5, z: places.lookout.z }, 0.1);
        for (const z of [-2.3, 0, 2.3]) {
            this.pole(railing, { x: 0, y: 0, z }, { x: -0.04, y: 0.8, z }, 0.09);
            this.snowLump(railing, { x: -0.04, y: 0.84, z }, { x: 0.18, y: 0.08, z: 0.18 });
        }
        for (const y of [0.37, 0.71])
            this.pole(railing, { x: 0, y, z: -2.35 }, { x: 0, y: y + 0.02, z: 2.35 }, 0.045, 'rope');
        for (const [x, z, height, lean] of [
            [24.7, -14.7, 1.9, -0.12],
            [25.0, -16.5, 2.8, 0.14],
            [24.5, -19.1, 1.5, -0.2],
            [19.6, -29.1, 2.1, -0.08],
            [17.8, -29.9, 1.25, 0.2],
        ]) {
            const point = { x, z };
            if (!this.clear(point, 0.85))
                continue;
            const shard = this.kit.mesh(new THREE.ConeGeometry(0.52, height, 5), 'ice', { x, y: this.ground.terrainHeight(point) + height / 2, z });
            shard.rotation.z = lean;
            this.snowShrub({ x: x + 0.65, z: z + 0.1 }, 0.4, Math.round(x * 7 + z));
        }
        this.snowRock({ x: 9, z: -28.8 }, { x: 1.6, y: 0.8, z: 1.05 }, 350);
        this.snowRock({ x: 13.4, z: -29.4 }, { x: 1.0, y: 0.42, z: 0.77 }, 351);
    }
    battlePass() {
        const point = places.battlePass.model;
        const gate = this.group(point);
        for (const side of [-1, 1]) {
            const x = side * 3.1;
            for (let row = 0; row < 4; row++) {
                const stone = this.kit.box({
                    x: x + Math.sin(row * 1.9 + side) * 0.08,
                    y: 0.28 + row * 0.53,
                    z: 0,
                }, { x: 0.69 - row * 0.045, y: 0.55, z: 0.73 - row * 0.03 }, 'stone', gate);
                stone.rotation.y = Math.sin(row * 2.6 + side) * 0.07;
            }
            this.snowLump(gate, { x, y: 2.2, z: 0 }, { x: 0.51, y: 0.15, z: 0.48 });
            this.pole(gate, { x: x + side * 0.75, y: 0.08, z: -0.3 }, { x: x + side * 0.81, y: 2.7, z: -0.25 }, 0.055);
            this.cloth(gate, { x: x + side * 1.13, y: 2.14, z: -0.25 }, 0.72, 0.75);
            const wall = this.group({ x: point.x + side * 5.7, z: point.z - 0.12 });
            for (let row = 0; row < 2; row++)
                for (let column = 0; column < 3; column++) {
                    if (row === 1 && column === (side < 0 ? 0 : 2))
                        continue;
                    this.kit.box({ x: (column - 1) * 0.74 + row * 0.12, y: 0.23 + row * 0.44, z: 0 }, { x: 0.7, y: 0.44, z: 0.52 }, 'stone', wall);
                }
            this.snowLump(wall, { x: 0.18, y: 0.93, z: 0 }, { x: 0.88, y: 0.13, z: 0.4 });
        }
        for (const [x, z, angle] of [
            [0.6, -27.4, -0.25],
            [0.9, -28.3, 0.2],
            [-0.5, -29.4, -0.15],
        ])
            this.pawPrint({ x, z }, angle);
    }
    landscape() {
        // 숲은 입구와 산장에 모으고, 능선·빙호에서는 낮은 눈바위로 시야를 연다.
        const pines = [
            [-12.6, 30.4, 5.7],
            [-15.0, 26.6, 6.3],
            [-15.6, 20.8, 5.1],
            [-0.1, 29.6, 4.8],
            [1.7, 25.2, 5.6],
            [0.7, 20.0, 5.2],
            [-17.5, 17.9, 5.5],
            [-11.7, 18.1, 4.0],
            [-0.2, 17.4, 4.3],
            [-18.1, 9.8, 5.3],
            [-19.7, 5.5, 6.2],
            [-20.1, 0.4, 5.8],
            [-19.3, -4.4, 5.2],
            [-16.0, -4.6, 3.9],
            [-14.1, 9.8, 4.6],
            [15.5, 8.9, 4.4],
            [18.3, 5.4, 5.4],
            [18.8, -1.3, 4.9],
            [16.5, -6.6, 3.8],
            [-3.8, -11.6, 3.9],
            [-4.6, -17.1, 3.0],
            [-22.4, -7.1, 4.4],
            [-23.0, -18.3, 4.0],
            [-15.4, -25.8, 3.7],
            [26.3, -8.8, 4.2],
            [27.0, -23.8, 3.8],
            [21.6, -31.3, 3.6],
            [-9.6, -31.5, 4.1],
            [-6.2, -35.0, 3.7],
            [8.6, -34.5, 3.8],
        ];
        pines.forEach(([x, z, height], index) => {
            this.snowPine({ x, z }, height, 400 + index * 9);
            if (index < 19)
                this.snowPine({ x: x + (index % 2 ? -2.05 : 2.15), z: z - 1.7 }, height * 0.67, 700 + index * 5);
        });
        const rocks = [
            [-13.5, 32.0, 1.1, 0.45, 0.83],
            [0.5, 32.1, 0.87, 0.37, 0.67],
            [-15.6, 15.5, 1.25, 0.63, 0.82],
            [3.8, 17.9, 1.1, 0.46, 0.85],
            [6.0, 17.8, 0.61, 0.27, 0.48],
            [-17.3, 9.1, 1.25, 0.65, 0.96],
            [-20.1, -1.6, 1.4, 0.78, 0.93],
            [-16.8, -5.5, 0.94, 0.41, 0.76],
            [-6.2, 3.9, 0.67, 0.3, 0.51],
            [3.0, 3.5, 0.76, 0.27, 0.55],
            [17.0, -3.5, 1.3, 0.57, 0.9],
            [18.6, -4.7, 0.64, 0.32, 0.53],
            [-5.5, -13.7, 0.93, 0.54, 0.74],
            [-2.9, -18.9, 0.72, 0.33, 0.58],
            [-11.2, -24.2, 1.44, 0.67, 1.12],
            [-9.7, -25.5, 0.73, 0.35, 0.58],
            [1.1, -20.0, 0.6, 0.25, 0.47],
            [6.8, -27.5, 1.05, 0.43, 0.76],
            [-5.0, -28.0, 1.5, 0.74, 1.0],
            [5.4, -31.6, 1.17, 0.55, 0.85],
        ];
        rocks.forEach(([x, z, sx, sy, sz], index) => this.snowRock({ x, z }, { x: sx, y: sy, z: sz }, 850 + index * 7));
        // 높은 후경도 보행 지면을 올리지 않고 길 바깥의 눈바위 모형으로 겹친다.
        for (const [x, z, sx, sy, sz] of [
            [-24.0, -10.8, 3.6, 4.1, 2.4],
            [-23.0, -21.0, 3.1, 3.5, 2.0],
            [-16.0, -36.0, 4.6, 5.9, 2.8],
            [-5.0, -38.3, 4.0, 6.7, 3.1],
            [7.0, -38.0, 4.1, 5.3, 3.0],
            [18.0, -35.8, 4.6, 5.6, 3.0],
            [28.3, -29.3, 3.0, 3.4, 2.1],
        ])
            this.snowRock({ x, z }, { x: sx, y: sy, z: sz }, Math.round(x * 3 - z * 9));
        for (const [x, z, radius] of [
            [-11.5, 31.4, 0.68],
            [-1.1, 26.0, 0.58],
            [-12.8, 22.2, 0.72],
            [-1.8, 21.5, 0.54],
            [-11.0, 10.5, 0.61],
            [2.4, 10.4, 0.55],
            [-18.7, -2.8, 0.76],
            [-14.9, -6.0, 0.63],
            [15.8, 5.2, 0.66],
            [15.4, -5.1, 0.6],
            [-13.8, -19.9, 0.65],
            [-6.7, -23.8, 0.57],
            [-1.2, -15.1, 0.52],
            [2.0, -13.5, 0.59],
            [11.5, -7.5, 0.49],
            [5.3, -28.8, 0.59],
            [-5.7, -32.7, 0.7],
            [10.3, -32.0, 0.61],
        ])
            this.snowShrub({ x, z }, radius, Math.round(x * 17 + z * 11));
    }
    clear(point, radius) {
        if (this.ground.distance(point) < radius + 0.25)
            return false;
        if (this.ground.waterDistance(point) < radius * 0.75)
            return false;
        for (const reserve of [places.cabin.model, places.cairn.model])
            if (Math.hypot(point.x - reserve.x, point.z - reserve.z) < radius + 2.2)
                return false;
        return true;
    }
    snowPine(point, height, seed) {
        if (!this.clear(point, height * 0.3 + 0.35))
            return;
        this.nature.pine({ ...point, y: this.ground.terrainHeight(point) }, height, { snow: true, seed });
        this.snowShrub({ x: point.x + 0.65, z: point.z + 0.42 }, 0.56, seed + 20);
    }
    snowShrub(point, radius, seed) {
        if (!this.clear(point, radius * 0.85))
            return;
        this.nature.shrub({ ...point, y: this.ground.terrainHeight(point) }, radius, { snow: true, seed });
    }
    snowRock(point, scale, seed) {
        if (!this.clear(point, Math.max(scale.x, scale.z) * 1.1))
            return;
        this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + scale.y * 0.25 }, scale, { snow: true, seed });
    }
    root(point, angle) {
        const points = [0, 0.55, 1.1, 1.7].map((length) => {
            const p = {
                x: point.x + Math.cos(angle) * length,
                z: point.z + Math.sin(angle) * length + Math.sin(length * 2.2) * 0.13,
            };
            return {
                ...p,
                y: this.ground.terrainHeight(p) + 0.045 + (1.7 - length) * 0.04,
            };
        });
        if (points.some((p) => this.ground.distance(p) < 0.5 || this.ground.waterDistance(p) < 0.3))
            return;
        this.kit.rootBranch(points, 0.06);
    }
    directionSign(point) {
        if (this.ground.distance(point) < 0.45)
            return;
        const group = this.group(point);
        this.pole(group, { x: 0, y: 0, z: 0 }, { x: 0.03, y: 1.5, z: 0 }, 0.075);
        for (const [y, side] of [
            [1.21, -1],
            [0.94, 1],
        ]) {
            const arrow = this.kit.box({ x: side * 0.19, y, z: 0.03 }, { x: 0.84, y: 0.19, z: 0.11 }, 'wood', group);
            arrow.rotation.z = side * 0.08;
            const head = this.kit.mesh(new THREE.ConeGeometry(0.16, 0.33, 3), 'wood', { x: side * 0.72, y, z: 0.04 }, group);
            head.rotation.z = (-side * Math.PI) / 2;
        }
        this.snowLump(group, { x: 0.02, y: 1.56, z: 0 }, { x: 0.17, y: 0.08, z: 0.16 });
    }
    pole(parent, from, to, radius, kind = 'wood') {
        const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const pole = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.87, radius, direction.length(), 7), kind, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
        }, parent);
        pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }
    snowLump(parent, point, scale) {
        this.nature.rock(point, scale, {
            kind: 'snow',
            snow: true,
            seed: Math.round(point.x * 11 + point.z * 7),
            parent,
        });
    }
    window(parent, x, y, z) {
        this.kit.box({ x, y, z }, { x: 0.57, y: 0.62, z: 0.07 }, 'ice', parent);
        for (const dx of [-0.32, 0, 0.32])
            this.kit.box({ x: x + dx, y, z: z + 0.04 }, { x: 0.055, y: 0.7, z: 0.06 }, 'wood', parent);
        for (const dy of [-0.34, 0, 0.34])
            this.kit.box({ x, y: y + dy, z: z + 0.04 }, { x: 0.7, y: 0.055, z: 0.06 }, 'wood', parent);
        this.snowLump(parent, { x, y: y + 0.41, z: z + 0.04 }, { x: 0.44, y: 0.085, z: 0.16 });
    }
    roof(parent, y, width, depth, rise) {
        for (const [kind, overhang, lift] of [
            ['wood', 0, 0],
            ['snow', 0.14, 0.11],
        ]) {
            const positions = [], uv = [], indices = [];
            const columns = 10, rows = 8;
            for (let row = 0; row <= rows; row++)
                for (let column = 0; column <= columns; column++) {
                    const x = (column / columns - 0.5) * (width + overhang);
                    const z = (row / rows - 0.5) * (depth + overhang);
                    const slope = Math.max(0, 1 - Math.abs(x) / ((width + overhang) / 2));
                    const ripple = kind === 'snow'
                        ? Math.sin(x * 2.8 + z * 3.1) * 0.025 + Math.cos(z * 4.1) * 0.018
                        : 0;
                    positions.push(x, y + rise * slope + lift + ripple, z);
                    uv.push(column / columns, row / rows);
                }
            for (let row = 0; row < rows; row++)
                for (let column = 0; column < columns; column++) {
                    const a = row * (columns + 1) + column, b = a + columns + 1;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            const surface = new THREE.Mesh(geometry, kind === 'snow'
                ? this.nature.surface('snow', 1.02)
                : this.kit.material('wood'));
            surface.castShadow = surface.receiveShadow = true;
            parent.add(surface);
        }
        for (const z of [-depth / 2 - 0.035, depth / 2 + 0.035])
            for (const side of [-1, 1])
                this.pole(parent, { x: (side * width) / 2, y: y + 0.01, z }, { x: 0, y: y + rise, z }, 0.065);
        for (let index = 0; index < 7; index++) {
            const x = -width * 0.4 + index * width * 0.13;
            const height = 0.13 + (index % 3) * 0.07;
            const icicle = this.kit.mesh(new THREE.ConeGeometry(0.035, height, 5), 'ice', {
                x,
                y: y + rise * (1 - Math.abs(x) / (width / 2)) - height / 2,
                z: depth / 2 + 0.04,
            }, parent);
            icicle.rotation.z = Math.PI;
        }
    }
    cloth(parent, point, width, height) {
        const geometry = new THREE.PlaneGeometry(width, height, 7, 3);
        const positions = geometry.getAttribute('position');
        for (let index = 0; index < positions.count; index++) {
            const x = positions.getX(index), y = positions.getY(index);
            positions.setZ(index, Math.sin(x * 5.1 + y * 2.7) * 0.07);
            if (y < -height * 0.49)
                positions.setY(index, y + (Math.sin(x * 8.2) + 1) * 0.08);
        }
        geometry.computeVertexNormals();
        const cloth = new THREE.Mesh(geometry, this.kit.material('cloth'));
        cloth.position.set(point.x, point.y, point.z);
        cloth.name = 'trail-foliage';
        cloth.castShadow = cloth.receiveShadow = true;
        parent.add(cloth);
    }
    pawPrint(point, angle) {
        const group = this.group(point, angle);
        for (const [x, z, radius] of [
            [0, 0.03, 0.15],
            [-0.13, -0.17, 0.065],
            [0, -0.22, 0.07],
            [0.13, -0.17, 0.065],
        ]) {
            const print = new THREE.Mesh(new THREE.CircleGeometry(radius, 9), this.nature.surface('basalt', 0.88));
            print.position.set(x, 0.012, z);
            print.rotation.x = -Math.PI / 2;
            print.castShadow = false;
            print.receiveShadow = true;
            group.add(print);
        }
    }
}
