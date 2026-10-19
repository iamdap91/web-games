import * as THREE from 'three';
import { emberJourneyPlaces as places } from './ember-journey-layout.js';
import { NaturalScenery } from './natural-scenery.js';
export function buildEmberJourney(kit, ground) {
    new EmberJourneyScenery(kit, ground).build();
}
/** 바닥과 용암은 공통 지면에 맡기고 길옆 작업 시설과 퇴석의 수명은 kit에 모은다. */
class EmberJourneyScenery {
    kit;
    ground;
    nature;
    constructor(kit, ground) {
        this.kit = kit;
        this.ground = ground;
        this.nature = new NaturalScenery(kit);
    }
    build() {
        this.road();
        this.relay();
        this.bridge();
        this.crane();
        this.ridge();
        this.observatory();
        this.workyard();
        this.cart();
        this.gate();
        this.landscape();
    }
    group(point, angle = 0) {
        const group = new THREE.Group();
        group.position.set(point.x, this.ground.terrainHeight(point), point.z);
        group.rotation.y = angle;
        this.kit.root.add(group);
        return group;
    }
    clear(point, radius) {
        return (this.ground.distance(point) > radius + 0.35 &&
            this.ground.waterDistance(point) > -0.2);
    }
    rock(point, scale, seed, kind = 'basalt') {
        if (!this.clear(point, Math.max(scale.x, scale.z) * 1.24))
            return;
        this.nature.rock({ ...point, y: this.ground.terrainHeight(point) + scale.y * 0.55 }, scale, { kind, seed });
    }
    beam(parent, from, to, radius = 0.075, kind = 'wood') {
        const delta = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const beam = this.kit.mesh(new THREE.CylinderGeometry(radius * 0.87, radius, delta.length(), 6), kind, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
        }, parent);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
    road() {
        for (const [x, z, seed] of [
            [-30.6, 18.7, 101],
            [-25.9, 23.4, 102],
            [-19.2, 23.3, 103],
            [-14.5, 18.8, 104],
            [-24.8, 16.1, 105],
        ])
            this.rock({ x, z }, { x: 1.1, y: 0.42, z: 0.72 }, seed);
        const marker = this.group({ x: -24.3, z: 23.5 }, -0.15);
        this.kit.box({ x: 0, y: 0.66, z: 0 }, { x: 0.48, y: 1.32, z: 0.37 }, 'basalt', marker);
        for (let i = 0; i < 3; i++) {
            const slash = this.kit.box({ x: -0.11 + i * 0.1, y: 0.87 - i * 0.11, z: 0.191 }, { x: 0.035, y: 0.25, z: 0.015 }, 'ash', marker);
            slash.rotation.z = -0.44;
        }
    }
    relay() {
        const group = this.group(places.relay.model, -0.12);
        this.kit.box({ x: 0, y: 0.12, z: 0 }, { x: 3.6, y: 0.24, z: 2.9 }, 'basalt', group);
        this.kit.box({ x: 0.75, y: 0.78, z: -1.12 }, { x: 1.4, y: 1.22, z: 0.17 }, 'bark', group);
        for (const [x, z, height] of [
            [-1.45, -1.1, 2.05],
            [1.45, -1.1, 1.65],
            [-1.45, 1.1, 1.4],
        ])
            this.beam(group, { x, y: 0.18, z }, { x: x + 0.07, y: height, z: z + 0.03 }, 0.13, 'bark');
        this.beam(group, { x: -1.5, y: 2.0, z: -1.1 }, { x: 1.5, y: 1.64, z: -1.1 }, 0.11);
        for (let i = 0; i < 6; i++) {
            const board = this.kit.box({ x: -1.3 + i * 0.52, y: 1.71 - i * 0.15, z: -0.35 }, { x: 0.47, y: 0.12, z: 2.1 - (i % 2) * 0.3 }, 'bark', group);
            board.rotation.x = 0.24;
            board.rotation.z = -0.28;
        }
        this.kit.box({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1.6, y: 0.14, z: 0.78 }, 'wood', group);
        for (const x of [-0.1, 1.1])
            this.kit.box({ x, y: 0.28, z: 0.5 }, { x: 0.13, y: 0.42, z: 0.61 }, 'wood', group);
        this.kit.mesh(new THREE.CylinderGeometry(0.31, 0.26, 0.52, 8), 'wood', { x: -0.65, y: 0.5, z: 0.55 }, group);
        this.beam(group, { x: -1.5, y: 0.25, z: 1.3 }, { x: 0.8, y: 0.27, z: 1.7 }, 0.085, 'bark');
        this.rock({ x: -26, z: 10.5 }, { x: 1.1, y: 0.32, z: 0.78 }, 120, 'ash');
        this.rock({ x: -25.9, z: 13.7 }, { x: 0.8, y: 0.42, z: 0.62 }, 121);
    }
    bridge() {
        const { area, center } = places.bridge;
        const length = area.maxX - area.minX;
        const width = area.maxZ - area.minZ;
        const count = 9;
        for (let i = 0; i < count; i++) {
            const halfX = length / count / 2 + 0.008;
            const halfZ = width / 2;
            const chip = 0.09 + (i % 3) * 0.025;
            const shape = new THREE.Shape();
            shape.moveTo(-halfX + chip, -halfZ);
            shape.lineTo(halfX - chip, -halfZ);
            shape.lineTo(halfX, -halfZ + chip);
            shape.lineTo(halfX, halfZ - chip);
            shape.lineTo(halfX - chip, halfZ);
            shape.lineTo(-halfX + chip, halfZ);
            shape.lineTo(-halfX, halfZ - chip);
            shape.lineTo(-halfX, -halfZ + chip);
            shape.closePath();
            const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: 0.18,
                bevelEnabled: false,
            });
            geometry.rotateX(-Math.PI / 2);
            this.kit.mesh(geometry, 'basalt', {
                x: area.minX + ((i + 0.5) / count) * length,
                y: -0.125,
                z: center.z,
            });
        }
        for (const z of [area.minZ - 0.2, area.maxZ + 0.2]) {
            for (const x of [area.minX + 0.22, center.x, area.maxX - 0.22]) {
                this.kit.box({ x, y: 0.3, z }, { x: 0.24, y: 0.6, z: 0.24 }, 'basalt');
                this.kit.box({ x, y: 0.62, z }, { x: 0.34, y: 0.08, z: 0.35 }, 'ash');
            }
            this.beam(this.kit.root, { x: area.minX + 0.2, y: 0.55, z }, { x: area.maxX - 0.2, y: 0.55, z }, 0.052, 'bark');
        }
        for (const [x, z, seed] of [
            [-14.4, 6.7, 130],
            [-3.2, 7.4, 131],
            [-14.2, -1.1, 132],
            [-4.0, -1.7, 133],
        ])
            this.rock({ x, z }, { x: 0.92, y: 0.64, z: 0.68 }, seed);
    }
    crane() {
        const group = this.group(places.quarry.model, -0.13);
        for (const x of [-1.65, 1.65]) {
            this.kit.box({ x, y: 0.17, z: 0 }, { x: 0.64, y: 0.34, z: 0.7 }, 'basalt', group);
            this.beam(group, { x, y: 0.24, z: 0 }, { x: x * 0.92, y: 3.45, z: -0.03 }, 0.18);
            this.beam(group, { x, y: 0.2, z: -1.18 }, { x: x * 0.95, y: 2.9, z: 0 }, 0.1);
        }
        this.kit.box({ x: 0, y: 3.5, z: 0 }, { x: 4.15, y: 0.32, z: 0.42 }, 'wood', group);
        for (const side of [-1, 1])
            this.beam(group, { x: side * 1.6, y: 1.9, z: 0 }, { x: side * 0.45, y: 3.36, z: 0 }, 0.095);
        const pulley = this.kit.mesh(new THREE.TorusGeometry(0.29, 0.065, 6, 15), 'basalt', { x: 0, y: 3.15, z: 0.29 }, group);
        pulley.rotation.y = 0.12;
        this.beam(group, { x: 0, y: 3.15, z: 0.29 }, { x: 0, y: 0.85, z: 0.29 }, 0.026, 'rope');
        this.kit.box({ x: 0, y: 0.44, z: 0.2 }, { x: 1.1, y: 0.7, z: 0.86 }, 'basalt', group);
        for (const x of [-0.39, 0.39])
            this.beam(group, { x, y: 0.12, z: 0.2 }, { x, y: 0.85, z: 0.2 }, 0.034, 'rope');
        for (const [x, z, seed] of [
            [3.4, 9.1, 141],
            [4.4, 11.2, 142],
            [10.8, 8.9, 143],
            [12.4, 9.7, 144],
        ])
            this.rock({ x, z }, { x: 0.85, y: 0.27, z: 0.59 }, seed);
    }
    ridge() {
        for (const [x, z, width, height, seed] of [
            [-5.9, -11.8, 1.5, 0.64, 151],
            [-2.0, -16.7, 1.35, 0.55, 152],
            [3.4, -18.8, 1.65, 0.74, 153],
            [10.7, -18.2, 1.25, 0.46, 154],
            [9.9, -9.8, 0.75, 0.68, 155],
            [0.4, -8.5, 0.7, 0.34, 156],
        ]) {
            this.rock({ x, z }, { x: width, y: height, z: width * 0.64 }, seed);
            this.rock({ x: x + 0.7, z: z + 0.35 }, { x: width * 0.55, y: 0.18, z: 0.49 }, seed + 30, 'ash');
        }
        // 높은 작업 벽 대신 깨진 작은 기둥과 낮은 쇄석의 층으로 채석장을 둘러싼다.
        for (const [x, z, height] of [
            [11.5, -10.0, 1.3],
            [12.5, -8.6, 1.65],
            [12.6, -12.8, 0.9],
        ]) {
            if (!this.clear({ x, z }, 0.65))
                continue;
            const column = this.kit.mesh(new THREE.CylinderGeometry(0.44, 0.57, height, 6), 'basalt', {
                x,
                y: this.ground.terrainHeight({ x, z }) + height / 2,
                z,
            });
            column.rotation.set(0.04, z * 0.2, -0.055);
        }
    }
    observatory() {
        const group = this.group(places.observatory.model, -Math.PI / 2);
        this.kit.box({ x: 0, y: 0.13, z: 0 }, { x: 1.8, y: 0.26, z: 2.3 }, 'basalt', group);
        for (const [x, z] of [
            [-0.48, -0.45],
            [0.48, -0.45],
            [0, 0.55],
        ])
            this.beam(group, { x, y: 0.23, z }, { x: 0, y: 1.28, z: 0 }, 0.055, 'wood');
        const tube = this.kit.mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 10), 'basalt', { x: 0, y: 1.45, z: -0.15 }, group);
        tube.rotation.x = Math.PI / 2 - 0.12;
        for (const z of [-0.8, 0.55]) {
            const band = this.kit.mesh(new THREE.TorusGeometry(z < 0 ? 0.2 : 0.23, 0.032, 5, 12), 'wood', { x: 0, y: 1.45, z }, group);
            band.rotation.x = 0.12;
        }
        this.rock({ x: 31.7, z: 5.0 }, { x: 1.0, y: 0.43, z: 0.65 }, 161, 'ash');
        this.rock({ x: 32.2, z: -1.0 }, { x: 1.1, y: 0.59, z: 0.77 }, 162);
    }
    workyard() {
        const group = this.group(places.workyard.model, 0.1);
        this.kit.box({ x: 0, y: 0.96, z: 0 }, { x: 2.8, y: 0.18, z: 1.25 }, 'wood', group);
        for (const x of [-1.1, 1.1])
            for (const z of [-0.42, 0.42])
                this.beam(group, { x, y: 0.05, z }, { x, y: 0.87, z }, 0.085);
        this.beam(group, { x: -1.1, y: 0.3, z: 0 }, { x: 1.1, y: 0.3, z: 0 }, 0.07);
        this.kit.box({ x: -0.45, y: 1.16, z: 0.02 }, { x: 0.75, y: 0.22, z: 0.57 }, 'basalt', group);
        this.beam(group, { x: 0.15, y: 1.1, z: 0.12 }, { x: 0.87, y: 1.12, z: 0.2 }, 0.035, 'wood');
        this.kit.box({ x: 0.84, y: 1.15, z: 0.2 }, { x: 0.16, y: 0.16, z: 0.4 }, 'basalt', group);
        for (let i = 0; i < 3; i++)
            this.kit.box({ x: -0.05 + i * 0.2, y: 1.08, z: -0.31 }, { x: 0.055, y: 0.07, z: 0.32 }, 'basalt', group);
        for (let i = 0; i < 3; i++)
            this.rock({ x: 23 + i * 0.4, z: -15.1 + (i % 2) * 0.28 }, { x: 0.56, y: 0.22 + i * 0.05, z: 0.42 }, 171 + i);
    }
    cart() {
        const group = this.group({ x: -4.9, z: -8.2 }, 0.4);
        this.kit.box({ x: 0, y: 0.55, z: 0 }, { x: 1.35, y: 0.14, z: 1.85 }, 'wood', group);
        for (const x of [-0.64, 0.64]) {
            this.kit.box({ x, y: 0.84, z: 0 }, { x: 0.12, y: 0.5, z: 1.85 }, 'wood', group);
            for (const z of [-0.61, 0.61]) {
                const wheel = this.kit.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.13, 9), 'basalt', { x: x * 1.16, y: 0.31, z }, group);
                wheel.rotation.z = Math.PI / 2;
            }
        }
        for (const z of [-0.86, 0.86])
            this.kit.box({ x: 0, y: 0.76, z }, { x: 1.3, y: 0.34, z: 0.12 }, 'bark', group);
        for (const x of [-0.48, 0.48])
            this.beam(group, { x, y: 0.47, z: 0.85 }, { x, y: 0.41, z: 1.65 }, 0.052);
        const sign = this.group({ x: 1.6, z: -0.4 }, 0.25);
        this.beam(sign, { x: 0, y: 0, z: 0 }, { x: 0.04, y: 1.06, z: 0 }, 0.06, 'bark');
        this.kit.box({ x: 0, y: 0.91, z: 0 }, { x: 0.9, y: 0.27, z: 0.12 }, 'wood', sign);
    }
    gate() {
        const group = this.group(places.gate.model);
        for (const side of [-1, 1]) {
            const x = side * 3.5;
            this.kit.box({ x, y: 0.25, z: 0 }, { x: 0.82, y: 0.5, z: 0.84 }, 'basalt', group);
            this.beam(group, { x, y: 0.32, z: 0 }, { x: x + side * 0.06, y: 3.15, z: 0 }, 0.22, 'bark');
            this.beam(group, { x: x + side * 0.05, y: 1.95, z: 0 }, { x: side * 1.9, y: 3.04, z: 0 }, 0.1);
        }
        const lintel = this.kit.box({ x: 0, y: 3.22, z: 0 }, { x: 7.9, y: 0.43, z: 0.62 }, 'wood', group);
        lintel.rotation.z = -0.018;
        this.kit.box({ x: 0.2, y: 2.81, z: 0.06 }, { x: 1.7, y: 0.55, z: 0.22 }, 'basalt', group);
        for (const x of [-0.48, 0.7])
            this.beam(group, { x, y: 3.1, z: 0.05 }, { x, y: 2.99, z: 0.05 }, 0.025, 'rope');
        for (const [x, z, seed] of [
            [22.2, -24.3, 181],
            [29.9, -24.6, 182],
            [30.3, -20.7, 183],
        ])
            this.rock({ x, z }, { x: 1.0, y: 0.42, z: 0.72 }, seed);
    }
    landscape() {
        for (let row = 0; row < 9; row++)
            for (let column = 0; column < 11; column++) {
                const seed = row * 29 + column * 17 + 210;
                const x = -34 + column * 6.6 + Math.sin(seed * 1.73) * 1.5;
                const z = -29 + row * 6.8 + Math.cos(seed * 2.11) * 1.3;
                const width = 0.9 + (0.5 + Math.sin(seed) * 0.5) * 1.1;
                const height = 0.24 + ((row + column) % 4) * 0.17;
                this.rock({ x, z }, { x: width, y: height, z: width * 0.65 }, seed);
                if ((row + column) % 2 === 0)
                    this.rock({ x: x + 1.1, z: z + 0.6 }, { x: width * 0.64, y: 0.2, z: 0.5 }, seed + 11, 'ash');
                if (seed % 5 === 0)
                    this.charredBranch({ x: x - 0.4, z: z + 1.5 }, seed);
            }
        // 큰 벽으로 길을 감싸지 않고 낮은 퇴석 군집 사이로 다음 작업 구역이 보이게 한다.
        for (let i = 0; i < 24; i++) {
            const x = -2.8 + Math.sin(i * 2.4) * 4.2;
            const z = -16.5 + Math.cos(i * 1.7) * 3.4;
            this.rock({ x, z }, { x: 0.22 + (i % 3) * 0.11, y: 0.12, z: 0.25 }, 400 + i, i % 4 ? 'basalt' : 'ash');
        }
    }
    charredBranch(point, seed) {
        if (!this.clear(point, 1.7))
            return;
        const group = this.group(point, seed * 0.7);
        this.beam(group, { x: 0, y: 0.02, z: 0 }, { x: 0.48, y: 0.12, z: 1.5 }, 0.075, 'bark');
        this.beam(group, { x: 0.19, y: 0.07, z: 0.6 }, { x: -0.4, y: 0.43, z: 0.92 }, 0.035, 'bark');
    }
}
