import * as THREE from 'three';
import { groundHeight, voxelRules, voxelTrees, voxelLinkTopology, voxelLink, } from './layout.js';
const colors = {
    grass: 0x91ad69,
    earth: 0x826648,
    stone: 0xb7b7a1,
    path: 0xdacda7,
    wood: 0x73533e,
    wall: 0xf0d6a5,
    roof: 0x476c68,
    leaf: 0x557e48,
};
/** 일정 단위의 각진 메시와 작은 고정 도트 간판을 합성한다. 실제 볼륨 복셀 엔진은 아니다. */
export class VoxelScenery {
    root = new THREE.Group();
    box = new THREE.BoxGeometry(1, 1, 1);
    materials = new Map();
    batches = new Map();
    isolatedWorkshop = new THREE.Group();
    connectedWorkshop = new THREE.Group();
    storageClosed = new THREE.Group();
    storageOpen = new THREE.Group();
    connection = new THREE.Group();
    linkStage = 0;
    restored = new THREE.Group();
    ruined = new THREE.Group();
    fire = new THREE.Group();
    smoke = [];
    fireLight = new THREE.PointLight(0xffa04a, 0, 7, 2);
    wheel = new THREE.Group();
    flags = [];
    textures = [];
    elapsed = 0;
    constructor() {
        this.root.add(this.restored, this.ruined, this.fire, this.fireLight, this.wheel);
        this.fireLight.position.set(-5, 1.5, 3);
        this.land();
        this.dojo();
        this.workshop();
        this.linkedStorage();
        this.hearth();
        this.shelter();
        for (const [x, z, s] of voxelTrees)
            this.tree(x, z, s);
        this.flowers();
        this.flush();
    }
    material(color) {
        let m = this.materials.get(color);
        if (!m) {
            m = new THREE.MeshLambertMaterial({ color });
            this.materials.set(color, m);
        }
        return m;
    }
    block(parent, color, x, y, z, w, h, d) {
        let batch = this.batches.get(parent);
        if (!batch) {
            batch = new Map();
            this.batches.set(parent, batch);
        }
        let matrices = batch.get(color);
        if (!matrices) {
            matrices = [];
            batch.set(color, matrices);
        }
        matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)));
    }
    loose(parent, color, x, y, z, w, h, d) {
        const mesh = new THREE.Mesh(this.box, this.material(color));
        mesh.position.set(x, y, z);
        mesh.scale.set(w, h, d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    flush() {
        for (const [parent, colors] of this.batches)
            for (const [color, matrices] of colors) {
                const mesh = new THREE.InstancedMesh(this.box, this.material(color), matrices.length);
                matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.computeBoundingSphere();
                parent.add(mesh);
            }
        this.batches.clear();
    }
    land() {
        // 수로 밖 땅은 실제 두께를 보여 모형의 잘린 단면을 만든다.
        this.block(this.root, colors.earth, -3.45, -0.88, 0, 20.1, 2.16, 27);
        this.block(this.root, colors.earth, 10.95, -0.88, 0, 5.1, 2.16, 27);
        this.block(this.root, colors.grass, -3.45, 0.13, 0, 20.1, 0.14, 27);
        this.block(this.root, colors.grass, 10.95, 0.13, 0, 5.1, 0.14, 27);
        this.block(this.root, 0x61a6a1, 7.5, -0.05, 0, 1.8, 0.18, 27);
        for (let z = -13.05; z < 13.1; z += 0.9) {
            for (const x of [6.45, 8.55])
                this.block(this.root, 0xaaa98e, x, 0.29, z, 0.45, 0.18, 0.85);
            if (Math.round(z * 10) % 3 === 0)
                this.block(this.root, 0x9ed3c5, 7.5, -0.01, z, 1.2, 0.035, 0.14);
        }
        const paths = [
            { x: 0, z: 7, w: 2.7, d: 13 },
            { x: -3, z: 2, w: 6.3, d: 2.7 },
            { x: 1, z: -0.5, w: 2.7, d: 5.4 },
            { x: 4.2, z: 3, w: 6.3, d: 2.25 },
            { x: 10.1, z: -2.2, w: 2.7, d: 13.5 },
            { x: 6, z: -9, w: 9, d: 1.8 },
            { x: 3, z: 8, w: 6.3, d: 2.25 },
        ];
        for (let x = -13.275; x < 13.5; x += 0.45)
            for (let z = -13.275; z < 13.5; z += 0.45) {
                if (!paths.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2) ||
                    Math.abs(x - 7.5) < 1.15 ||
                    groundHeight({ x, z }) > 0.2)
                    continue;
                this.block(this.root, Math.round(x * 10 + z * 10) % 4 === 0 ? 0xc8bc94 : colors.path, x, 0.215, z, 0.43, 0.035, 0.43);
            }
        // 도장 단상의 막힌 면과 실제 걸을 수 있는 두 계단을 구분한다.
        for (let x = -2.775; x < 4.2; x += 0.45)
            for (let z = -9.775; z < -4.5; z += 0.45)
                this.block(this.root, colors.stone, x, 0.65, z, 0.445, 0.9, 0.445);
        for (let i = 0; i < 6; i++) {
            const z = -2 - (i + 0.5) * (2.5 / 6), h = (i + 1) * voxelRules.step;
            this.block(this.root, 0xcac6b0, 1, 0.2 + h / 2, z, 2.7, h, 2.5 / 6);
            const x = 4.2 + (i + 0.5) * (2 / 6), eh = (6 - i) * voxelRules.step;
            this.block(this.root, 0xcac6b0, x, 0.2 + eh / 2, -6.55, 2 / 6, eh, 2.7);
        }
        for (const z of [3, -9])
            this.bridge(z, z === 3 ? 2.25 : 1.8);
        for (let x = -12.6; x < -3.8; x += 0.45)
            for (let y = 0; y < 2; y++)
                this.block(this.root, Math.round(x * 10) % 2 ? 0xaaa997 : 0xbdb9a5, x, 0.45 + y * 0.3, -5.8, 0.43, 0.29, 0.45);
        for (const z of [8.3, 10.5]) {
            this.block(this.root, colors.wood, -1.85, 1.2, z, 0.27, 2, 0.27);
            this.block(this.root, colors.wood, 1.85, 1.2, z, 0.27, 2, 0.27);
        }
        this.block(this.root, colors.wood, 0, 2.3, 10.5, 4.5, 0.45, 0.5);
        this.block(this.root, 0x6e7b61, 0, 2.6, 10.5, 5, 0.18, 0.75);
        for (const [x, z] of [
            [-10.8, -11.5],
            [-9.9, -11.7],
            [-11.5, -11.2],
            [11.4, 9.8],
        ]) {
            this.block(this.root, 0xb1b5a0, x, 0.4, z, 0.9, 0.45, 0.9);
            this.block(this.root, 0x9da38e, x + 0.15, 0.78, z, 0.6, 0.45, 0.6);
        }
    }
    bridge(z, depth) {
        this.block(this.root, colors.wood, 7.5, 0.27, z, 3.6, 0.26, depth);
        for (let x = 5.85; x <= 9.15; x += 0.3)
            this.block(this.root, 0xb58b62, x, 0.385, z, 0.275, 0.03, depth);
        for (const side of [-1, 1]) {
            for (const x of [5.9, 7.5, 9.1])
                this.block(this.root, colors.wood, x, 0.65, z + side * (depth / 2 + 0.02), 0.18, 0.75, 0.18);
            this.block(this.root, 0x8e694b, 7.5, 0.89, z + side * (depth / 2 + 0.02), 3.6, 0.18, 0.18);
        }
    }
    dojo() {
        const building = new THREE.Group();
        building.position.set(0.6, 1.1, -7.25);
        this.root.add(building);
        this.block(building, colors.wall, 0, 1.1, 0, 5.4, 2.2, 3.6);
        for (const x of [-2.475, -0.9, 0.9, 2.475])
            this.block(building, colors.wood, x, 1.15, 1.82, 0.225, 2.3, 0.225);
        for (const z of [-1.65, 1.65])
            this.block(building, colors.wood, 0, 2.15, z, 5.85, 0.3, 0.3);
        this.block(building, 0x493b30, 0, 0.85, 1.82, 1.35, 1.7, 0.1);
        for (const x of [-1.8, 1.8]) {
            this.block(building, 0x667b73, x, 1.22, 1.86, 0.9, 0.9, 0.1);
            for (let i = -1; i <= 1; i++)
                this.block(building, 0xc2ad81, x + i * 0.27, 1.22, 1.93, 0.09, 0.99, 0.09);
        }
        this.sign(building, 0, 1.95, 1.99, 0xebe2b9, 0x7d4136);
        // 복구가 도장의 부피와 실루엣을 바꾸므로 단순 재색칠과 구별된다.
        this.restored.position.copy(building.position);
        this.ruined.position.copy(building.position);
        for (const parent of [this.restored, this.ruined])
            for (let row = 0; row < 10; row++) {
                const z = (row - 4.5) * 0.45, y = 2.45 + (4.5 - Math.abs(row - 4.5)) * 0.27;
                for (let column = 0; column < 15; column++) {
                    if (parent === this.ruined &&
                        ((column > 3 && column < 9 && row > 3 && row < 8) ||
                            (column > 11 && row < 3)))
                        continue;
                    const x = (column - 7) * 0.45;
                    const tint = (column + row) % 5 === 0
                        ? parent === this.ruined
                            ? 0x879078
                            : 0x5a8075
                        : parent === this.ruined
                            ? 0x65736a
                            : colors.roof;
                    this.block(parent, tint, x, y, z, 0.44, 0.18, 0.44);
                }
            }
        for (let row = 0; row < 5; row++)
            this.block(this.ruined, colors.wood, 0, 2.4 + row * 0.25, (row - 2) * 0.45, 5.6, 0.14, 0.15);
        this.block(this.restored, 0x344e4e, 0, 3.75, 0, 7.2, 0.27, 0.32);
        for (const x of [-2.65, 2.65]) {
            this.block(this.restored, 0x665239, x, 1.35, 2.35, 0.18, 2.7, 0.18);
            const flag = this.loose(this.restored, 0xbf604b, x + 0.27, 2.05, 2.35, 0.54, 0.9, 0.09);
            this.flags.push(flag);
            this.block(this.restored, 0xffd588, x, 1.8, 2.2, 0.45, 0.6, 0.45);
        }
        for (const x of [-2.25, 3.1]) {
            this.block(this.restored, 0x89643e, x, 0.72, 2.25, 0.36, 1.2, 0.36);
            this.block(this.restored, 0xaa8356, x, 1.2, 2.25, 0.65, 0.65, 0.65);
            this.block(this.restored, 0x795636, x, 1, 2.25, 1.2, 0.18, 0.18);
        }
        for (let i = 0; i < 7; i++)
            this.block(this.ruined, 0x6f7b67, -1.8 + i * 0.65, 0.13, 2.1 + (i % 2) * 0.35, 0.45, 0.18, 0.45);
    }
    workshop() {
        const p = new THREE.Group();
        p.position.set(-9, 0.2, 3.1);
        this.root.add(p);
        p.add(this.isolatedWorkshop, this.connectedWorkshop);
        this.block(this.isolatedWorkshop, colors.wall, 0, 1, 0, 3.6, 2, 4.05);
        this.passageShell(this.connectedWorkshop, 0, 0, colors.wall);
        for (const x of [-1.65, 1.65])
            this.block(p, colors.wood, x, 1, 2.03, 0.27, 2.1, 0.27);
        for (let row = 0; row < 11; row++)
            for (let c = 0; c < 10; c++)
                this.block(p, (c + row) % 5 === 0 ? 0x889168 : 0x68755b, (c - 4.5) * 0.45, 2.05 + (5 - Math.abs(row - 5)) * 0.18, (row - 5) * 0.45, 0.44, 0.17, 0.44);
        this.block(this.isolatedWorkshop, 0x684f37, 0, 0.8, 2.06, 0.9, 1.6, 0.1);
        this.sign(p, -1.05, 1.4, 2.09, 0xdfbd79, 0x525f40);
        // 야외 공방은 건물 앞과 옆을 걷는 이유가 된다.
        this.block(this.root, 0x99744e, -6.4, 0.88, 0.3, 2.2, 0.18, 1);
        for (const x of [-7.2, -5.6])
            this.block(this.root, colors.wood, x, 0.56, 0.3, 0.2, 0.7, 0.75);
        for (let i = 0; i < 4; i++) {
            this.block(this.root, 0xe1cda4, -7.1 + i * 0.42, 1.05, 0.3, 0.28, 0.15, 0.65);
            this.block(this.root, 0x8e6140, -6.9 + i * 0.4, 0.42, 5.6, 0.33, 0.44, 0.65);
        }
        for (let i = 0; i < 4; i++)
            this.block(this.root, 0xb77f4b, -10.7, 0.39 + i * 0.14, 6.1, 0.8, 0.14, 0.45);
        this.block(this.root, 0x47736a, -6.85, 0.5, 1.3, 0.6, 0.6, 0.6);
        this.block(this.root, 0x2f5c5a, -6.85, 0.85, 1.3, 0.45, 0.15, 0.45);
    }
    passageShell(parent, x, z, color) {
        for (const side of [-1, 1])
            this.block(parent, color, x + side * 1.8, 1.2, z, 0.18, 2, 4.05);
        for (const end of [-1, 1]) {
            for (const side of [-1, 1])
                this.block(parent, color, x + side * 1.27, 1.2, z + end * 2.025, 1.06, 2, 0.18);
            this.block(parent, colors.wood, x, 2.1, z + end * 2.025, 1.48, 0.25, 0.22);
        }
    }
    linkedStorage() {
        this.root.add(this.storageClosed, this.storageOpen, this.connection);
        this.block(this.storageClosed, colors.wall, voxelLink.x, 1.2, voxelLink.storageZ, 3.6, 2, 4.05);
        this.passageShell(this.storageOpen, voxelLink.x, voxelLink.storageZ, colors.wall);
        for (const parent of [this.storageClosed, this.storageOpen]) {
            for (let row = 0; row < 11; row++)
                for (let col = 0; col < 10; col++)
                    this.block(parent, colors.roof, voxelLink.x + (col - 4.5) * 0.45, 2.25 + (5 - Math.abs(row - 5)) * 0.18, voxelLink.storageZ + (row - 5) * 0.45, 0.44, 0.17, 0.44);
        }
        for (let z = -3.4; z < 5.6; z += 0.45) {
            this.block(this.connection, colors.path, voxelLink.x, 0.235, z, 1.4, 0.07, 0.44);
            for (const x of [-10.95, -7.05])
                this.block(this.connection, colors.wood, x, 2.25, z, 0.25, 0.18, 0.44);
        }
        for (const x of [-9.5, -8.5])
            this.block(this.connection, 0xf2c36c, x, 0.255, 1.075, 0.12, 0.03, 0.9);
    }
    get connectionDiagnostics() {
        return voxelLinkTopology(this.linkStage);
    }
    hearth() {
        for (let layer = 0; layer < 4; layer++)
            for (let x = 0; x < 4; x++)
                for (let z = 0; z < 4; z++) {
                    if (layer < 2 && z === 3 && (x === 1 || x === 2))
                        continue;
                    this.block(this.root, (layer + x + z) % 3 === 0 ? 0xc58f63 : 0xa6714c, -5 + (x - 1.5) * 0.45, 0.425 + layer * 0.45, 3 + (z - 1.5) * 0.45, 0.44, 0.44, 0.44);
                }
        this.block(this.root, 0x8e6245, -5.45, 2.4, 2.7, 0.9, 1.35, 0.9);
        this.block(this.root, 0x6d5a44, -5.45, 3.05, 2.7, 1.15, 0.18, 1.15);
        this.block(this.root, 0x413a2f, -5, 0.64, 3.69, 0.82, 0.72, 0.05);
        for (let i = 0; i < 5; i++)
            this.loose(this.fire, i % 2 ? 0xffd076 : 0xed8342, -5 + (i - 2) * 0.14, 0.58 + (i % 3) * 0.1, 3.76, 0.14, 0.26 + (i % 2) * 0.15, 0.09);
        for (let i = 0; i < 7; i++) {
            const mesh = this.loose(this.root, 0xc9cbb8, -5.45, 3.3 + i * 0.4, 2.7, 0.3, 0.3, 0.3);
            this.smoke.push(mesh);
        }
        for (let i = 0; i < 6; i++)
            this.block(this.root, 0x957043, -3.3, 0.4 + (i % 2) * 0.22, 3.8 + Math.floor(i / 2) * 0.4, 0.75, 0.2, 0.35);
    }
    shelter() {
        this.block(this.root, colors.path, 10.8, 0.23, -8.8, 3.6, 0.06, 2.7);
        this.block(this.root, 0xb89463, 11, 0.7, -8.9, 1.6, 0.18, 0.8);
        for (const x of [10.4, 11.6])
            this.block(this.root, colors.wood, x, 0.45, -8.9, 0.18, 0.5, 0.65);
        this.block(this.root, 0xecd4a1, 11.2, 0.86, -8.9, 0.18, 0.18, 0.18);
        this.block(this.root, 0x836449, 9.1, 1.1, -9.7, 0.24, 1.8, 0.24);
        this.block(this.root, 0x836449, 10.9, 1.1, -9.7, 0.24, 1.8, 0.24);
        this.block(this.root, 0xc6a578, 10, 2.05, -9.7, 2.7, 0.2, 1.35);
        // 수로의 물레방아는 각진 조각을 돌려 움직이는 미니어처 느낌을 준다.
        this.wheel.position.set(8.45, 0.8, -6.6);
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const mesh = this.loose(this.wheel, 0x976d47, 0, Math.cos(angle) * 0.65, Math.sin(angle) * 0.65, 0.25, 0.3, 0.3);
            mesh.rotation.x = -angle;
        }
        this.loose(this.wheel, 0x664932, 0, 0, 0, 0.45, 0.16, 1.7);
        this.loose(this.wheel, 0x664932, 0, 0, 0, 0.45, 1.7, 0.16);
    }
    tree(x, z, s) {
        const base = groundHeight({ x, z });
        this.block(this.root, colors.wood, x, base + 1.05 * s, z, 0.45 * s, 2.1 * s, 0.45 * s);
        const layers = [
            { y: 1.6, w: 2.25 },
            { y: 2.05, w: 3.15 },
            { y: 2.5, w: 2.7 },
            { y: 2.95, w: 1.8 },
            { y: 3.4, w: 0.9 },
        ];
        for (const l of layers) {
            const count = Math.round(l.w / 0.45);
            for (let i = 0; i < count; i++)
                for (let j = 0; j < count; j++) {
                    if (count > 4 &&
                        ((i === 0 && j === 0) || (i === count - 1 && j === count - 1)))
                        continue;
                    this.block(this.root, (i + j) % 7 === 0 ? 0x779453 : colors.leaf, x + (i - (count - 1) / 2) * 0.45 * s, base + l.y * s, z + (j - (count - 1) / 2) * 0.45 * s, 0.445 * s, 0.45 * s, 0.445 * s);
                }
        }
    }
    flowers() {
        for (let i = 0; i < 60; i++) {
            const x = -12 + ((i * 7.3) % 24), z = -12 + ((i * 5.7) % 24);
            if (Math.abs(x - 7.5) < 1.7 ||
                Math.hypot(x, z - 7) < 3 ||
                groundHeight({ x, z }) > 0.2)
                continue;
            this.block(this.root, 0x6c8b48, x, 0.36, z, 0.09, 0.32, 0.09);
            this.block(this.root, i % 4 ? 0xe7bc68 : 0xdd7b62, x, 0.52, z, 0.27, 0.09, 0.27);
        }
    }
    sign(parent, x, y, z, background, ink) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = `#${background.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 32, 16);
        ctx.fillStyle = `#${ink.toString(16).padStart(6, '0')}`;
        ctx.fillRect(1, 1, 30, 1);
        ctx.fillRect(1, 14, 30, 1);
        for (const offset of [7, 17, 25]) {
            ctx.fillRect(offset, 4, 2, 8);
            ctx.fillRect(offset - 3, 6, 8, 2);
            ctx.fillRect(offset - 2, 10, 6, 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        this.textures.push(texture);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.675), new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 }));
        mesh.position.set(x, y, z);
        parent.add(mesh);
    }
    update(state, delta) {
        this.elapsed += delta;
        this.linkStage = state.linkStage;
        this.isolatedWorkshop.visible = state.linkStage < 2;
        this.connectedWorkshop.visible = state.linkStage === 2;
        this.storageClosed.visible = state.linkStage === 1;
        this.storageOpen.visible = state.linkStage === 2;
        this.connection.visible = state.linkStage === 2;
        this.restored.visible = state.restored;
        this.ruined.visible = !state.restored;
        this.fire.visible = state.fire > 0;
        this.fire.scale.y = 1 + Math.sin(this.elapsed * 9) * 0.12;
        this.fireLight.intensity =
            state.fire > 0 ? 14 + Math.sin(this.elapsed * 9) * 2 : 0;
        for (let i = 0; i < this.smoke.length; i++) {
            const m = this.smoke[i];
            if (!m)
                continue;
            m.visible = state.fire > 0;
            const age = (this.elapsed * 0.45 + i * 0.14) % 1;
            m.position.set(-5.45 + age * 0.4, 3.2 + age * 2.2, 2.7 - age * 0.3);
            m.scale.setScalar(0.16 + age * 0.28);
        }
        this.wheel.rotation.x = this.elapsed * 0.65;
        for (const f of this.flags)
            f.rotation.y = Math.sin(this.elapsed * 2) * 0.12;
    }
    dispose() {
        this.root.traverse((o) => {
            if (o instanceof THREE.Mesh) {
                if (o.geometry !== this.box)
                    o.geometry.dispose();
                if (![...this.materials.values()].includes(o.material)) {
                    if (Array.isArray(o.material))
                        o.material.forEach((m) => m.dispose());
                    else
                        o.material.dispose();
                }
                if (o instanceof THREE.InstancedMesh)
                    o.dispose();
            }
        });
        this.box.dispose();
        for (const m of this.materials.values())
            m.dispose();
        for (const t of this.textures)
            t.dispose();
        this.root.clear();
    }
}
