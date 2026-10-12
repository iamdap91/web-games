import { kitchenLayout } from '../../facilities/kitchen/kitchen-layout.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import * as THREE from 'three';
import { basecampBoundary, basecampForestGate, basecampForestPath, basecampExpeditionGate, basecampExpeditionExit, isBasecampExitEdge, basecampExpeditionSign, basecampTrees, basecampLayout, } from './basecamp-layout.js';
import { groundGeometry } from '../../../rendering/ground-geometry.js';
import { villageColors } from '../../../rendering/pixel-material.js';
import { townHallLayout } from '../../facilities/town-hall/town-hall-layout.js';
import { smithyLayout } from '../../facilities/smithy/smithy-layout.js';
const pathHeight = 0.014;
/** 마을 지형·길·주변 경관과 전용 geometry를 소유한다. 공통 재질·나무는 빌려 쓴다. */
export class BasecampLandscape {
    resources;
    root = new THREE.Group();
    sprites = new MapSpriteResources();
    expeditionSupplies = new THREE.Group();
    kitchenSupplies = new THREE.Group();
    loggingTraces = new THREE.Group();
    loggingCarts = {
        weathered: new THREE.Group(),
        ready: new THREE.Group(),
    };
    lanternMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd276,
    });
    geometries = new Set();
    cube = this.own(new THREE.BoxGeometry(1, 1, 1));
    hill = this.own(new THREE.DodecahedronGeometry(1, 1));
    constructor(resources) {
        this.resources = resources;
        this.root.add(this.sprites.root, this.kitchenSupplies, this.loggingTraces);
        this.loggingTraces.visible = false;
        this.kitchenSupplies.visible = false;
        this.buildTerrain();
        this.buildPaths();
        this.buildSurroundings();
        this.buildLivingGround();
        this.buildMapDetails();
        this.buildExpeditionSign();
        this.buildExpeditionSupplies();
        this.buildLoggingCarts();
    }
    own(geometry) {
        this.geometries.add(geometry);
        return geometry;
    }
    mesh(geometry, kind, color) {
        const mesh = new THREE.Mesh(geometry, this.resources.material(kind, color));
        mesh.receiveShadow = true;
        this.root.add(mesh);
        return mesh;
    }
    patch(x, z, width, depth, color, y = 0.006) {
        const contour = Array.from({ length: 11 }, (_, i) => {
            const angle = (i / 11) * Math.PI * 2;
            const spread = 0.86 + Math.sin(i * 2.3 + x + z * 0.5) * 0.13;
            return { x: Math.cos(angle) * spread, z: Math.sin(angle) * spread };
        });
        const patch = this.mesh(this.own(groundGeometry(contour)), 'grass', color);
        patch.position.set(x, y, z);
        patch.scale.set(width, 1, depth);
        patch.rotation.y = Math.sin(x + z) * 0.4;
    }
    buildTerrain() {
        const background = this.mesh(this.own(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2)), 'grass', 0x71835c);
        background.position.y = -0.36;
        const ground = this.mesh(this.own(groundGeometry(basecampBoundary)), 'grass', villageColors.grass);
        ground.position.y = -0.003;
        // 같은 윤곽의 비탈은 보행 한계를 설명하며 두 출구의 통로는 비워 둔다.
        for (let i = 0; i < basecampBoundary.length; i++) {
            const a = basecampBoundary[i], b = basecampBoundary[(i + 1) % basecampBoundary.length];
            if (isBasecampExitEdge(a, b))
                continue;
            const outer = (p) => {
                const spread = 1.075 + Math.sin(p.x * 0.73 + p.z) * 0.025;
                return [
                    basecampLayout.grounds.x + (p.x - basecampLayout.grounds.x) * spread,
                    p.z < -8 ? 0.95 + Math.sin(p.x) * 0.25 : p.z > 10 ? 0.26 : 0.58,
                    1.5 + (p.z - 1.5) * (spread + 0.025),
                ];
            };
            const foot = (p) => [
                basecampLayout.grounds.x + (p.x - basecampLayout.grounds.x) * 1.23,
                -0.35,
                1.5 + (p.z - 1.5) * 1.26,
            ];
            const c = outer(a), d = outer(b), e = foot(a), f = foot(b);
            const points = [
                a.x,
                -0.02,
                a.z,
                b.x,
                -0.02,
                b.z,
                ...c,
                b.x,
                -0.02,
                b.z,
                ...d,
                ...c,
                ...c,
                ...d,
                ...e,
                ...d,
                ...f,
                ...e,
            ];
            const geometry = this.own(new THREE.BufferGeometry());
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
            geometry.computeVertexNormals();
            this.mesh(geometry, 'grass', i % 4 === 0 ? 0x92916c : 0x8b9c68);
        }
        // 큰 지형의 색 덩어리는 외곽까지 이어져 사각 바닥 단면을 남기지 않는다.
        const groundPatches = [
            [-15, -8, 10, 4.6, 0x8f9c69],
            [10, -7, 8, 4, 0x8a9a66],
            [-8, 6.5, 5.4, 4, 0x92a36d],
            [8.5, 9.2, 7, 3.3, 0x9eaa75],
            [-22, 8, 4, 5, 0x8a9a63],
            [14, 1, 4.5, 7, 0x93a270],
        ];
        for (const [index, [x, z, w, d, color]] of groundPatches.entries()) {
            // 겹치는 색 패치는 길보다 낮은 범위 안에서 높이를 나눈다.
            this.patch(x, z, w, d, color, 0.004 + index * 0.001);
        }
        for (let i = 0; i < 7; i++) {
            const mound = this.mesh(this.hill, 'grass', [0x657955, 0x74845b, 0x7d8b62][i % 3]);
            mound.position.set(-30 + i * 10.5, -1.6, -22 - (i % 3) * 3.1);
            mound.scale.set(10 + (i % 3) * 2, 4 + (i % 2) * 1.5, 7.5);
            mound.rotation.y = i * 0.9;
        }
    }
    path(points, halfWidth, color) {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)));
        const samples = curve.getPoints(42);
        const vertices = [];
        const left = [], right = [];
        for (let i = 0; i < samples.length; i++) {
            const p = samples[i];
            const direction = curve.getTangent(i / (samples.length - 1));
            const width = halfWidth * (1 + Math.sin(i * 1.4) * 0.055);
            const y = pathHeight -
                Math.min(0.36, Math.max(0, basecampForestGate.z - p.z) * 0.08) -
                Math.min(0.36, Math.max(0, p.z - basecampExpeditionExit.endZ) * 0.08);
            const leftPoint = {
                x: p.x - direction.z * width,
                z: p.z + direction.x * width,
            };
            const rightPoint = {
                x: p.x + direction.z * width,
                z: p.z - direction.x * width,
            };
            left.push(leftPoint);
            right.push(rightPoint);
            vertices.push(leftPoint.x, y, leftPoint.z, rightPoint.x, y, rightPoint.z);
        }
        const indices = [];
        for (let i = 0; i < samples.length - 1; i++) {
            const a = i * 2;
            indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        const geometry = this.own(new THREE.BufferGeometry());
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        this.mesh(geometry, 'path', color);
        return { left, right };
    }
    buildPaths() {
        const { path } = townHallLayout;
        const mainPath = this.path([
            { x: 0, z: 7.7 },
            { x: path.x, z: 11.4 },
            { x: basecampExpeditionGate.x, z: basecampExpeditionExit.z },
            { x: basecampExpeditionGate.x, z: basecampExpeditionExit.endZ },
            { x: 0, z: 25 },
        ], path.width / 2, villageColors.path);
        this.path([
            { x: -4.8, z: 4 },
            { x: -8.4, z: 3.9 },
            { x: -12.3, z: 4.4 },
            { x: basecampLayout.placements.dojo.x, z: 3.7 },
        ], 0.88, 0xb9ab83);
        this.path(basecampForestPath, basecampForestGate.width / 2, 0xb9ab83);
        const smithy = basecampLayout.placements.smithy;
        const smithyPathColor = 0xb6a582;
        const smithyPath = this.path([
            { x: -3.2, z: 12.3 },
            { x: -4.8, z: 12.5 },
            { x: -8, z: 12.4 },
            {
                x: smithy.x + smithyLayout.entrance.x,
                z: smithy.z + smithyLayout.entrance.z,
            },
        ], 0.8, smithyPathColor);
        // 중앙길의 실제 가장자리를 공유해 갈림길에 겹친 면이나 틈이 생기지 않게 한다.
        const junction = this.mesh(this.own(groundGeometry([
            ...mainPath.left.filter(({ z }) => z >= 11 && z <= 13.5),
            smithyPath.right[0],
            smithyPath.left[0],
        ])), 'path', smithyPathColor);
        junction.position.y = pathHeight;
        this.path([
            { x: 5.4, z: 4.5 },
            { x: 7.2, z: 4.6 },
            { x: 9.4, z: 5.3 },
        ], 0.68, 0xb9ad89);
    }
    tree(x, z, size) {
        const tree = this.resources.createTree(size);
        tree.position.set(x, z < -13 ? 0.25 : 0, z);
        tree.rotation.y = x * 0.19;
        this.root.add(tree);
    }
    buildExpeditionSign() {
        const { x, z } = basecampExpeditionSign;
        const post = this.mesh(this.cube, 'wood', 0x675039);
        post.position.set(x, 0.52, z);
        post.scale.set(0.16, 1.04, 0.16);
        post.castShadow = true;
        const board = this.mesh(this.cube, 'wood', 0x9c8053);
        board.position.set(x, 1.02, z);
        board.scale.set(0.95, 0.32, 0.13);
        board.rotation.z = -0.05;
        board.castShadow = true;
    }
    setExpeditionSupplies(visible) {
        this.expeditionSupplies.visible = visible;
    }
    setLoggingRoute(opened) {
        this.loggingCarts.weathered.visible = !opened;
        this.loggingCarts.ready.visible = opened;
        this.loggingTraces.visible = opened;
    }
    buildLoggingCarts() {
        const wheel = this.own(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 9));
        for (const [stage, cart] of Object.entries(this.loggingCarts)) {
            const ready = stage === 'ready';
            // 남쪽 출구의 동쪽 잔디에 두어 기존 통로·이정표·생활 소품을 피한다.
            cart.name = `logging-cart-${stage}`;
            cart.position.set(6.1, 0, 12.15);
            cart.rotation.y = ready ? -0.12 : -0.35;
            cart.visible = !ready;
            this.root.add(cart);
            const wood = ready ? 0x8c7959 : 0x716e59;
            const frame = ready ? 0x5f5542 : 0x59584c;
            const box = (x, y, z, width, height, depth, color = wood) => {
                const mesh = new THREE.Mesh(this.cube, this.resources.material('wood', color));
                mesh.position.set(x, y, z);
                mesh.scale.set(width, height, depth);
                mesh.castShadow = mesh.receiveShadow = true;
                cart.add(mesh);
                return mesh;
            };
            box(0, 0.28, 0, 1.45, 0.1, 0.11, frame);
            for (const side of [-1, 1]) {
                const rim = new THREE.Mesh(wheel, this.resources.material('wood', frame));
                rim.position.set(side * 0.63, 0.29, 0);
                rim.rotation.z = Math.PI / 2;
                rim.castShadow = rim.receiveShadow = true;
                cart.add(rim);
                box(side * 0.47, 0.39, 0.06, 0.1, 0.11, 1.35, frame);
                const handle = box(side * 0.39, 0.31, -0.89, 0.075, 0.075, 0.85, frame);
                handle.rotation.x = 0.15;
                for (const z of [-0.52, 0.64]) {
                    box(side * 0.5, ready ? 0.7 : 0.56, z, 0.07, ready ? 0.51 : 0.24, 0.07, frame);
                }
                if (ready)
                    box(side * 0.5, 0.9, 0.06, 0.07, 0.09, 1.25, frame);
            }
            // 개척 변화는 빈 수레의 정돈으로만 표현한다. 채집 재료를 따로 쌓지 않는다.
            for (let i = 0; i < 5; i++) {
                if (!ready && i === 2)
                    continue;
                const plank = box(-0.4 + i * 0.2, 0.47, 0.06, 0.18, 0.07, 1.18);
                if (!ready && i % 2 === 0)
                    plank.rotation.y = 0.12;
            }
            const support = box(0, 0.11, -0.91, 0.78, 0.17, 0.21, frame);
            support.rotation.y = ready ? 0 : -0.22;
            if (!ready) {
                const loose = box(0.17, 0.075, 0.95, 0.12, 0.055, 0.72);
                loose.rotation.y = 0.55;
            }
        }
    }
    buildExpeditionSupplies() {
        // 표지판의 기존 발 위치 판정 안에 쌓아 귀환 통로를 새로 막지 않는다.
        const { x, z } = basecampExpeditionSign;
        this.expeditionSupplies.position.set(x, 0, z);
        this.expeditionSupplies.visible = false;
        this.root.add(this.expeditionSupplies);
        const bundle = this.mesh(this.own(new THREE.CylinderGeometry(0.115, 0.115, 0.42, 8)), 'wood', 0x8c968d);
        bundle.rotation.z = Math.PI / 2;
        bundle.position.set(0, 0.16, 0.02);
        this.expeditionSupplies.add(bundle);
        this.sprites.add('bedroll', {
            x: 0,
            z: 0.11,
            y: 0.075,
            width: 0.42,
            parent: this.expeditionSupplies,
        });
        const flask = this.mesh(this.own(new THREE.SphereGeometry(1, 6, 4)), 'earth', 0xb4a887);
        flask.scale.set(0.055, 0.14, 0.055);
        flask.position.set(0.14, 0.23, -0.07);
        this.expeditionSupplies.add(flask);
        this.sprites.add('travel-flask', {
            x: 0.14,
            z: 0.03,
            y: 0.1,
            width: 0.15,
            parent: this.expeditionSupplies,
        });
        this.sprites.add('rope', {
            x: -0.1,
            z: -0.08,
            y: 0.04,
            width: 0.19,
            depth: 0.13,
            kind: 'ground',
            parent: this.expeditionSupplies,
        });
        const light = new THREE.Mesh(this.cube, this.lanternMaterial);
        light.position.set(0, 1.47, 0);
        light.scale.set(0.22, 0.3, 0.22);
        this.expeditionSupplies.add(light);
        for (const y of [1.29, 1.64]) {
            const frame = new THREE.Mesh(this.cube, this.resources.material('wood', 0x514936));
            frame.position.set(0, y, 0);
            frame.scale.set(0.3, 0.06, 0.3);
            this.expeditionSupplies.add(frame);
        }
    }
    rock(x, z, size) {
        const rock = this.resources.createRock({
            radius: size,
            color: 0x90957c,
            rotation: x * 0.7 + z,
        });
        rock.position.x = x;
        rock.position.z = z;
        this.root.add(rock);
    }
    buildSurroundings() {
        for (const tree of basecampTrees)
            this.tree(tree.x, tree.z, tree.size);
        // 뒤는 높고 조밀하게, 앞은 낮고 성기게 두어 아타호와 산길을 가리지 않는다.
        for (let i = 0; i < 17; i++) {
            const x = -28 + i * 3.6 + Math.sin(i * 1.9) * 0.75;
            const z = -15.8 - (i % 4) * 1.25 + Math.cos(i * 2.3) * 0.8;
            // 출구 너머 길의 방향이 보이도록 뒤쪽 수목을 비운다.
            if (x > -18 && x < -10)
                continue;
            this.tree(x, z, 1.05 + (i % 3) * 0.24);
            if (i % 3 === 0)
                this.tree(x + 1.2, z - 5.2, 1.6);
        }
        for (const side of [-1, 1]) {
            for (let i = 0; i < 6; i++) {
                this.tree(side < 0 ? -27 - (i % 2) : 22 + (i % 3), -8 + i * 3.2 + Math.sin(i * 1.7) * 0.8, 0.9 + (i % 3) * 0.17);
            }
        }
        for (let i = 0; i < basecampBoundary.length; i++) {
            const a = basecampBoundary[i], b = basecampBoundary[(i + 1) % basecampBoundary.length];
            if (isBasecampExitEdge(a, b))
                continue;
            const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
            const steps = Math.max(1, Math.floor(length / 2.5));
            for (let j = 0; j < steps; j++) {
                const t = (j + 0.35 + Math.sin(i * 1.7) * 0.15) / steps;
                const outward = 0.75 + ((i + j) % 3) * 0.55;
                const x = a.x + dx * t + (dz / length) * outward;
                const z = a.z + dz * t - (dx / length) * outward;
                if ((i + j) % 5 === 0) {
                    this.rock(x, z, 0.6 + (i % 3) * 0.18);
                    this.rock(x + (dz / length) * 0.8 + 0.4, z - (dx / length) * 0.8, 0.36);
                }
                else if ((i + j) % 3 !== 0) {
                    for (let k = 0; k < 2; k++) {
                        const bush = this.resources.createBrush();
                        bush.position.set(x + k * 0.45, 0.12, z + k * 0.3);
                        bush.scale.setScalar((z > 10 ? 0.58 : 1.0) + k * 0.12);
                        bush.rotation.y = i + j;
                        this.root.add(bush);
                    }
                }
            }
        }
        for (const side of [-1, 1]) {
            for (let i = 0; i < 9; i++) {
                this.tree(side * (8 + (i % 4) * 6) + Math.sin(i * 2) * 1.4, 26 + Math.floor(i / 4) * 6 + (i % 3), 1.05 + (i % 3) * 0.2);
            }
            for (let i = 0; i < 5; i++) {
                const x = side * (3.5 + i * 2.4), z = 18.6 + (i % 3) * 0.6;
                this.patch(x, z, 2.2, 1.6, 0x7a8c60, -0.33 + i * 0.002);
                if (i > 2)
                    this.tree(x + side * 1.6, z + 3.6, 0.64);
            }
        }
    }
    buildLivingGround() {
        // 수련마당·작업장·식사터에는 통행 가능한 낮은 흔적만 더한다.
        this.patch(-20.1, 4.6, 2.8, 2.2, 0x8e8965, 0.027);
        this.patch(-15.8, 7.2, 3.5, 1.2, 0x8a8d6c, 0.028);
        this.patch(11.8, 6.4, 3.5, 1.3, 0xa4a477, 0.029);
        for (let i = 0; i < 22; i++) {
            const angle = i * 2.4;
            const x = -15.7 + Math.cos(angle) * (2.8 + (i % 3) * 0.18);
            const z = 9.8 + Math.sin(angle) * 2.8;
            const pebble = this.mesh(this.cube, 'stone', i % 3 ? 0xa49a80 : 0x706f60);
            pebble.position.set(x, 0.026, z);
            pebble.scale.set(0.09 + (i % 2) * 0.09, 0.03, 0.12);
            pebble.rotation.y = angle;
        }
        for (let i = 0; i < 72; i++) {
            const x = -22 + ((i * 7.13) % 39), z = -10 + ((i * 4.61) % 22);
            // 광장·시설·주요 통로에는 풀을 놓지 않는다.
            if ((Math.abs(x) < 6.7 && z > -10) ||
                (x < -10 && z > -6) ||
                (x > -15 && x < -9 && z < 2.5) ||
                (x > 8 && z > -3 && z < 7) ||
                (z > 2.5 && z < 5.6))
                continue;
            this.sprites.add(i % 4 === 0 ? 'fern' : 'grass', {
                x,
                z,
                width: i % 4 === 0 ? 0.48 : 0.3,
            });
            if (i % 5 === 0)
                this.sprites.add('dry-leaves', {
                    x: x + 0.4,
                    z: z + 0.15,
                    width: 0.42,
                    depth: 0.27,
                    kind: 'ground',
                });
        }
    }
    buildMapDetails() {
        for (const [i, tree] of basecampTrees.entries()) {
            this.sprites.add('root-grass', {
                x: tree.x + 0.38,
                z: tree.z + 0.2,
                width: 0.72,
                depth: 0.46,
                kind: 'ground',
            });
            if (i % 2 === 0)
                this.sprites.add('moss', {
                    x: tree.x - 0.42,
                    z: tree.z + 0.38,
                    width: 0.7,
                    depth: 0.46,
                    kind: 'ground',
                });
        }
        for (const [i, point] of [
            { x: 14.8, z: 7 },
            { x: 15.5, z: 8 },
            { x: -19.5, z: 11.7 },
            { x: -20.2, z: 10.5 },
        ].entries())
            this.sprites.add(i % 2 ? 'herb' : 'flowers', { ...point, width: 0.38 });
        this.sprites.add('wood-chips', {
            x: 5.5,
            z: 12.45,
            width: 0.7,
            depth: 0.44,
            kind: 'ground',
            parent: this.loggingTraces,
        });
        this.sprites.add('sawdust', {
            x: 6.7,
            z: 12.6,
            width: 0.85,
            depth: 0.5,
            kind: 'ground',
            parent: this.loggingTraces,
        });
        const offset = basecampLayout.placements.kitchen;
        const table = {
            x: offset.x + kitchenLayout.table.x,
            z: offset.z + kitchenLayout.table.z,
        };
        const tableY = kitchenLayout.table.height + 0.04;
        this.sprites.add('vegetables', {
            x: table.x + 0.85,
            z: table.z + 0.06,
            y: tableY + 0.03,
            parent: this.kitchenSupplies,
            width: 0.48,
        });
        this.sprites.add('cloth', {
            x: table.x + 0.13,
            z: table.z - 0.05,
            y: tableY + 0.03,
            parent: this.kitchenSupplies,
            width: 0.47,
            depth: 0.3,
            kind: 'ground',
        });
        this.sprites.add('dry-herbs', {
            x: table.x - 0.22,
            z: table.z - 0.12,
            y: tableY + 0.03,
            parent: this.kitchenSupplies,
            width: 0.35,
        });
        this.sprites.add('grain', {
            x: table.x - 0.92,
            z: table.z + 0.11,
            y: tableY + 0.03,
            parent: this.kitchenSupplies,
            width: 0.34,
            depth: 0.22,
            kind: 'ground',
        });
        // 포대는 기존 식탁 장애물 위에 놓고 낮은 입체 몸체에 앞면 이미지를 덧댄다.
        const sack = this.mesh(this.own(new THREE.SphereGeometry(1, 6, 4)), 'earth', 0xa79875);
        sack.position.set(table.x - 1.1, tableY + 0.2, table.z - 0.13);
        sack.scale.set(0.22, 0.24, 0.2);
        sack.castShadow = true;
        this.kitchenSupplies.add(sack);
        this.sprites.add('sack', {
            x: table.x - 1.1,
            z: table.z + 0.1,
            y: tableY + 0.03,
            parent: this.kitchenSupplies,
            width: 0.42,
        });
    }
    setKitchenSupplies(visible) {
        this.kitchenSupplies.visible = visible;
    }
    async load() {
        await this.sprites.load();
    }
    face(camera) {
        this.sprites.face(camera);
    }
    dispose() {
        this.sprites.dispose();
        this.geometries.forEach((geometry) => geometry.dispose());
        this.lanternMaterial.dispose();
        this.geometries.clear();
        this.root.clear();
    }
}
