import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { modularPlaces, modularRules, modularTopology, } from './layout.js';
export const modularCameraYaw = Math.atan2(11, 27);
/** 인접 표에서 외벽과 지붕을 다시 만들며, 간판은 건물 로컬 면에만 붙인다. */
export class ModularScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 100);
    renderer;
    spriteTextures = new SpriteTextures();
    actor = new TrailSprite(new Map([...trailMotions('ai/tiger-hero', true)].filter(([name]) => /^(stand|move)(-(back|left|right))?$/.test(name))), this.spriteTextures, 32, 0.25, 'frame-pivot');
    buildings = new THREE.Group();
    flame = new THREE.Group();
    smoke = [];
    fireLight = new THREE.PointLight(0xffb958, 1, 6);
    textures = new Set();
    target = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.25, 24), new THREE.MeshBasicMaterial({ color: 0x345f6c, side: THREE.DoubleSide }));
    raycaster = new THREE.Raycaster();
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -modularRules.groundY);
    stage = null;
    rebuilds = 0;
    width = 1;
    height = 1;
    disposed = false;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.background = new THREE.Color(0xaecfd4);
        const sun = new THREE.DirectionalLight(0xfff5dd, 2.7);
        sun.position.set(-12, 25, 14);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.normalBias = 0.04;
        Object.assign(sun.shadow.camera, {
            left: -15,
            right: 15,
            top: 15,
            bottom: -15,
            near: 1,
            far: 70,
        });
        this.scene.add(sun, new THREE.HemisphereLight(0xe8f6ed, 0x80949e, 2.1));
        this.camera.layers.enableAll();
        this.scene.children.forEach((child) => child.layers.enableAll());
        this.buildHarbor();
        this.scene.add(this.buildings, this.actor.mesh, this.actor.shadow, this.flame, this.fireLight, this.target);
        this.target.rotation.x = -Math.PI / 2;
        this.target.visible = false;
        this.fireLight.position.set(-5.8, 1.1, 4.45);
        this.rebuild(0);
    }
    material(color, map) {
        return new THREE.MeshStandardMaterial({
            color,
            map: map ?? null,
            roughness: 0.95,
            side: THREE.DoubleSide,
        });
    }
    box(parent, x, y, z, w, h, d, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    texture(width, height, draw) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('간판을 그릴 수 없어요.');
        draw(context);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        this.textures.add(texture);
        return texture;
    }
    sign(parent, text, x, y, z, w = 1.3, h = 0.36) {
        const map = this.texture(160, 48, (c) => {
            c.fillStyle = '#314e58';
            c.fillRect(0, 0, 160, 48);
            c.fillStyle = '#fff1c9';
            c.fillRect(4, 4, 152, 40);
            c.fillStyle = '#355867';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.font = 'bold 21px serif';
            c.fillText(text, 80, 25);
            for (let i = 8; i < 155; i += 10) {
                c.fillStyle = '#e0b78d';
                c.fillRect(i, 5, 3, 2);
            }
        });
        const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.material(0xffffff, map));
        card.material.alphaTest = 0.5;
        card.position.set(x, y, z);
        card.castShadow = true;
        parent.add(card);
    }
    buildHarbor() {
        this.box(this.scene, 0, -0.75, 0, 70, 0.15, 70, 0x86b9c5);
        this.box(this.scene, 0, -0.35, 0, 17.9, 0.65, 17.7, 0xadb2a1);
        this.box(this.scene, 0, 0.015, 0, 17.6, 0.08, 17.4, 0xf1dfb2);
        const paving = this.texture(64, 64, (c) => {
            c.fillStyle = '#f0ddac';
            c.fillRect(0, 0, 64, 64);
            c.strokeStyle = '#e1cc98';
            c.lineWidth = 1;
            for (let y = 0; y < 64; y += 16) {
                c.beginPath();
                c.moveTo(0, y);
                c.lineTo(64, y);
                c.stroke();
                for (let x = y % 32 ? 8 : 0; x < 64; x += 16) {
                    c.beginPath();
                    c.moveTo(x, y);
                    c.lineTo(x, y + 16);
                    c.stroke();
                }
            }
            c.fillStyle = '#ead7a3';
            for (let i = 0; i < 13; i++)
                c.fillRect((i * 23) % 63, (i * 17) % 63, 3, 2);
        });
        paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
        paving.repeat.set(6, 6);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(17.55, 17.35), this.material(0xffffff, paving));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = modularRules.groundY;
        ground.receiveShadow = true;
        this.scene.add(ground);
        for (let i = 0; i < 27; i++) {
            this.box(this.scene, -8.65 + i * 0.66, -0.1, 8.7, 0.62, 0.28, 0.16, 0xc0b998);
            this.box(this.scene, -8.65 + i * 0.66, -0.1, -8.7, 0.62, 0.28, 0.16, 0xc0b998);
        }
        for (let i = 0; i < 10; i++)
            for (const side of [-1, 1]) {
                const ripple = this.box(this.scene, side * (10.2 + (i % 3) * 1.5), -0.645, -10 + i * 2.3, 0.7 + (i % 2) * 0.6, 0.01, 0.035, 0xa9d7de);
                ripple.rotation.y = ((i % 3) - 1) * 0.15;
            }
        for (let i = 0; i < 7; i++)
            this.box(this.scene, 0, 0.08, 7.3 - i * 0.62, 0.44, 0.015, 0.34, 0xc9b58c);
        for (let i = 0; i < 9; i++)
            this.box(this.scene, -0.55 - i * 0.54, 0.08, 4.45, 0.36, 0.016, 0.38, 0xc9b58c);
        this.box(this.scene, -5.8, 0.37, 4.45, 0.83, 0.62, 0.83, 0xb99679);
        this.box(this.scene, -5.8, 0.71, 4.45, 0.9, 0.08, 0.85, 0x65716b);
        for (let i = 0; i < 3; i++) {
            const shape = new THREE.Shape();
            shape.moveTo(-0.15, 0);
            shape.quadraticCurveTo(-0.38, 0.4, 0, 0.9);
            shape.quadraticCurveTo(0.38, 0.2, 0.15, 0);
            shape.closePath();
            const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.material([0xffb957, 0xf78443, 0xffe3a0][i] ?? 0xffb957));
            mesh.position.set((i - 1) * 0.16, i * 0.06, 0);
            mesh.rotation.y = (i - 1) * 0.65;
            this.flame.add(mesh);
        }
        this.flame.position.set(-5.8, 0.75, 4.45);
        for (let i = 0; i < 4; i++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), this.material(0xd6d4c7));
            puff.material.transparent = true;
            puff.material.opacity = 0.45;
            puff.material.depthWrite = false;
            this.scene.add(puff);
            this.smoke.push(puff);
        }
        this.sign(this.scene, '茶', -5.8, 1.13, 4.89, 0.57, 0.28);
        for (const [x, z] of [
            [-7.5, 6.7],
            [7.5, 6.7],
            [-7.4, -7],
            [7.4, -7],
        ]) {
            if (x === undefined || z === undefined)
                continue;
            this.box(this.scene, x, 0.5, z, 0.12, 0.9, 0.12, 0x795e46);
            const tree = new THREE.Mesh(new THREE.SphereGeometry(0.65, 7, 5), this.material(0x83a997));
            tree.position.set(x, 1.3, z);
            tree.castShadow = true;
            this.scene.add(tree);
            this.box(this.scene, x, 0.2, z, 0.9, 0.29, 0.9, 0xcdac85);
        }
        const bench = new THREE.Group();
        bench.position.set(0, 0, -3.38);
        this.scene.add(bench);
        this.box(bench, 0, 0.5, 0, 1.4, 0.1, 0.45, 0xc79768);
        this.box(bench, 0, 0.86, -0.25, 1.4, 0.58, 0.08, 0xc79768);
        for (const x of [-0.5, 0.5])
            this.box(bench, x, 0.28, 0, 0.1, 0.48, 0.4, 0x7d8070);
        this.sign(bench, '쉼', 0, 0.94, 0.2, 0.45, 0.25);
    }
    wall(parent, cell, side) {
        const front = side === 'south' || side === 'north';
        const map = this.texture(64, 80, (c) => {
            c.fillStyle = '#fff8e3';
            c.fillRect(0, 0, 64, 80);
            c.fillStyle = '#e9dec1';
            for (let row = 0; row < 5; row++)
                for (let col = 0; col < 5; col++)
                    c.fillRect((col * 17 + (row % 2) * 8) % 64, row * 18, 12, 2);
            c.fillStyle = '#8aa7ae';
            c.fillRect(18, 19, 28, 26);
            c.fillStyle = '#304f59';
            c.fillRect(21, 22, 22, 20);
            c.fillStyle = '#e9c084';
            c.fillRect(23, 24, 8, 7);
            c.fillRect(34, 24, 7, 7);
            c.fillRect(23, 34, 8, 6);
            c.fillRect(34, 34, 7, 6);
            c.fillStyle = '#f8e8c3';
            c.fillRect(14, 45, 36, 4);
            c.fillStyle = '#b1bea2';
            c.fillRect(19, 47, 26, 5);
            if (side === 'south') {
                c.fillStyle = '#9b7a62';
                c.fillRect(25, 62, 15, 18);
                c.fillStyle = '#e1b587';
                c.fillRect(29, 66, 7, 14);
            }
        });
        const material = this.material(cell.color, map);
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(modularRules.cell, 2.95), material);
        wall.position.set(front ? 0 : side === 'east' ? 1.3 : -1.3, 1.535, front ? (side === 'south' ? 1.3 : -1.3) : 0);
        wall.rotation.y =
            side === 'south'
                ? 0
                : side === 'north'
                    ? Math.PI
                    : side === 'east'
                        ? Math.PI / 2
                        : -Math.PI / 2;
        wall.castShadow = wall.receiveShadow = true;
        parent.add(wall);
        this.box(parent, wall.position.x, 0.24, wall.position.z, front ? 2.6 : 0.07, 0.36, front ? 0.07 : 2.6, 0xcfbd96);
    }
    roof(parent, cell) {
        this.box(parent, 0, 3.07, 0, 2.6, 0.12, 2.6, 0xb46149);
        this.box(parent, 0, 3.23, 0, 2.1, 0.28, 2.1, 0xc67a59);
        for (const side of cell.roofSides) {
            const front = side === 'south' || side === 'north';
            const eave = this.box(parent, front ? 0 : side === 'east' ? 1.2 : -1.2, 3.15, front ? (side === 'south' ? 1.2 : -1.2) : 0, front ? 2.7 : 0.42, 0.12, front ? 0.42 : 2.7, 0xcf8964);
            if (front)
                eave.rotation.x = side === 'south' ? 0.48 : -0.48;
            else
                eave.rotation.z = side === 'east' ? 0.48 : -0.48;
            for (let i = 0; i < 7; i++) {
                const tile = this.box(parent, front ? -1.12 + i * 0.37 : side === 'east' ? 1.24 : -1.24, 3.23, front ? (side === 'south' ? 1.24 : -1.24) : -1.12 + i * 0.37, front ? 0.025 : 0.3, 0.018, front ? 0.3 : 0.025, 0xe1a07c);
                if (front)
                    tile.rotation.x = eave.rotation.x;
                else
                    tile.rotation.z = eave.rotation.z;
            }
        }
    }
    clearBuildings() {
        this.buildings.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                materials.forEach((material) => material.dispose());
            }
        });
        this.buildings.clear();
        this.textures.forEach((texture) => {
            if (texture.userData.module) {
                texture.dispose();
                this.textures.delete(texture);
            }
        });
    }
    rebuild(stage) {
        this.clearBuildings();
        const oldTextures = new Set(this.textures);
        for (const cell of modularTopology(stage).cells) {
            const group = new THREE.Group();
            group.position.set(cell.x, modularRules.groundY, cell.z);
            this.buildings.add(group);
            if (cell.arch) {
                const shape = new THREE.Shape();
                shape.moveTo(-1.3, 0);
                shape.lineTo(-1.3, 3);
                shape.lineTo(1.3, 3);
                shape.lineTo(1.3, 0);
                shape.lineTo(0.85, 0);
                shape.lineTo(0.85, 1.7);
                shape.quadraticCurveTo(0.85, 2.6, 0, 2.6);
                shape.quadraticCurveTo(-0.85, 2.6, -0.85, 1.7);
                shape.lineTo(-0.85, 0);
                shape.closePath();
                const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
                    depth: 2.6,
                    bevelEnabled: false,
                    curveSegments: 12,
                }), this.material(cell.color));
                mesh.position.z = -1.3;
                mesh.castShadow = mesh.receiveShadow = true;
                group.add(mesh);
                for (const x of [-1.1, 1.1])
                    this.box(group, x, 0.25, 0, 0.39, 0.5, 2.64, 0xdacda9);
                this.sign(group, '虎 도장', 0, 2.88, 1.32, 1.65, 0.32);
            }
            else {
                for (const side of cell.walls)
                    this.wall(group, cell, side);
                if (cell.col === 0 && cell.row === 0)
                    this.sign(group, '虎 도장', 0, 2.5, 1.32, 1.65, 0.32);
                if (cell.col === -2 && cell.row === 1)
                    this.sign(group, '찻 집', 0, 2.5, 1.32, 1.3, 0.32);
                if (cell.col === 2 && cell.row === 1)
                    this.sign(group, '항구 여관', 0, 2.5, 1.32, 1.5, 0.32);
            }
            this.roof(group, cell);
        }
        if (modularTopology(stage).courtyard) {
            for (const x of [-0.74, 0.74])
                for (let i = 0; i < 5; i++) {
                    this.box(this.buildings, x, 0.11, -2 + i * 0.19, 0.24, 0.12, 0.22, 0x86a86a);
                    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), this.material(i % 2 ? 0xf1b386 : 0xfcdb87));
                    flower.position.set(x, 0.27, -2 + i * 0.19);
                    this.buildings.add(flower);
                }
            for (let i = 0; i < 7; i++)
                this.box(this.buildings, 0, 0.08, -1.65 - i * 0.28, 0.42, 0.015, 0.19, 0xd9c697);
        }
        this.textures.forEach((texture) => {
            if (!oldTextures.has(texture))
                texture.userData.module = true;
        });
        this.stage = stage;
        this.rebuilds++;
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '승인된 아타호 그림을 불러오지 못했어요.');
    }
    render(state, delta, overview) {
        if (this.disposed)
            return;
        this.resize();
        if (state.stage !== this.stage)
            this.rebuild(state.stage);
        const aspect = this.width / this.height;
        const half = overview
            ? Math.max(11.3, 12 / aspect)
            : aspect < 1
                ? 7.2
                : 9.6;
        Object.assign(this.camera, {
            left: -half * aspect,
            right: half * aspect,
            top: half,
            bottom: -half,
        });
        this.camera.updateProjectionMatrix();
        const follow = !overview && aspect < 1, cx = follow ? state.player.x * 0.7 : 0, cz = follow ? state.player.z * 0.7 - 0.8 : 0;
        this.camera.position.set(cx + 11, 22, cz + 27);
        this.camera.lookAt(cx, 0.75, cz);
        this.camera.updateMatrixWorld();
        const suffix = state.player.facing === 'front' ? '' : `-${state.player.facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        this.actor.mesh.rotation.set(0, modularCameraYaw, 0);
        this.actor.mesh.scale.y =
            Math.hypot(Math.hypot(11, 27), 21.25) / Math.hypot(11, 27);
        this.actor.mesh.position.y = state.player.y + 0.035;
        this.actor.shadow.position.y = state.player.y + 0.02;
        this.flame.scale.setScalar((state.fire > 0 ? 1 : 0.25) * (1 + Math.sin(state.elapsed * 11) * 0.07));
        this.fireLight.intensity = state.fire > 0 ? 2.2 : 0.2;
        this.smoke.forEach((puff, i) => {
            const progress = (state.elapsed * 0.35 + i / 4) % 1;
            puff.visible = state.fire > 0;
            puff.position.set(-5.8 + Math.sin(progress * 3) * 0.25, 1.1 + progress * 2.2, 4.45);
            puff.scale.setScalar(0.7 + progress * 1.5);
            puff.material.opacity = (1 - progress) * 0.45;
        });
        this.renderer.render(this.scene, this.camera);
    }
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
        if (width === this.width && height === this.height)
            return;
        this.width = width;
        this.height = height;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(width, height, false);
    }
    mark(point) {
        this.target.visible = !!point;
        if (point)
            this.target.position.set(point.x, 0.085, point.z);
    }
    pick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, 1 - ((clientY - rect.top) / rect.height) * 2), this.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floor, new THREE.Vector3());
        return hit ? { x: hit.x, z: hit.z } : null;
    }
    project(point) {
        const p = new THREE.Vector3(point.x, modularRules.groundY, point.z).project(this.camera);
        return {
            x: ((p.x + 1) * this.width) / 2,
            y: ((1 - p.y) * this.height) / 2,
        };
    }
    get screenPositions() {
        return modularPlaces.map((place) => ({
            id: place.id,
            world: { x: place.x, z: place.z },
            ...this.project(place),
        }));
    }
    get diagnostics() {
        const topology = modularTopology(this.stage ?? 0);
        let meshes = 0;
        this.buildings.traverse((child) => {
            if (child instanceof THREE.Mesh)
                meshes++;
        });
        return {
            stage: this.stage,
            rebuilds: this.rebuilds,
            modules: topology.cells.length,
            sharedWalls: topology.sharedWalls,
            exteriorWalls: topology.exteriorWalls,
            arches: topology.arches,
            courtyard: topology.courtyard,
            geometrySignature: topology.signature,
            moduleMeshes: meshes,
            sourceActor: 'ai/tiger-hero',
            actorYawOnly: true,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                materials.forEach((material) => material.dispose());
            }
        });
        this.textures.forEach((texture) => texture.dispose());
        this.spriteTextures.dispose();
        this.actor.dispose();
        this.renderer.dispose();
    }
}
