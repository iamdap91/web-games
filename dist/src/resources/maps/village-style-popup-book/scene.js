import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import { bookBuildings, bookBridges, bookCourts, bookEntrance, bookPlaces, bookRules, } from './layout.js';
/** 실제 얇은 카드의 힌지를 돌리고 종이 조립층만 12fps로 표시한다. */
export class BookScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 130);
    renderer;
    textures = new SpriteTextures();
    actor = new TrailSprite(trailMotions('ai/tiger-hero', true), this.textures, 32, 0.3, 'frame-pivot');
    paperTextures = [];
    assemblies = [];
    bridgeHinges = [];
    decorations = [];
    raycaster = new THREE.Raycaster();
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bookRules.ground);
    sun = new THREE.DirectionalLight(0xfff0d5, 2.2);
    width = 1;
    height = 1;
    disposed = false;
    frames = 0;
    modelFrame = -1;
    modelChanges = 0;
    yaw = Math.atan2(9, 27);
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.background = new THREE.Color(0xc6b79b);
        this.sun.position.set(-14, 24, 15);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        Object.assign(this.sun.shadow.camera, {
            left: -24,
            right: 24,
            top: 20,
            bottom: -20,
            near: 1,
            far: 80,
        });
        this.sun.shadow.normalBias = 0.02;
        this.camera.layers.enableAll();
        this.sun.layers.enableAll();
        this.scene.add(this.sun, new THREE.HemisphereLight(0xf5e8ce, 0x8b7a65, 1.8));
        this.buildBook();
        bookBuildings.forEach((building) => this.assemblies.push(this.buildAssembly(building)));
        bookBridges.forEach((bridge) => this.buildBridge(bridge));
        this.scene.add(this.actor.mesh, this.actor.shadow);
    }
    material(color, map) {
        return new THREE.MeshStandardMaterial({
            color,
            map: map ?? null,
            roughness: 1,
            side: THREE.DoubleSide,
        });
    }
    box(parent, size, position, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.material(color));
        mesh.position.set(...position);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    ink(label, color = '#5b716e', facade = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const c = canvas.getContext('2d');
        if (!c)
            throw new Error('종이 인쇄판을 만들지 못했습니다.');
        c.fillStyle = '#f0e4cb';
        c.fillRect(0, 0, 256, 256);
        c.fillStyle = color;
        if (facade) {
            c.fillRect(12, 30, 232, 226);
            c.fillStyle = '#e9dcc1';
            c.fillRect(20, 38, 216, 210);
            c.strokeStyle = color;
            c.lineWidth = 7;
            c.strokeRect(39, 106, 47, 56);
            c.strokeRect(170, 106, 47, 56);
            c.beginPath();
            c.moveTo(62, 108);
            c.lineTo(62, 160);
            c.moveTo(193, 108);
            c.lineTo(193, 160);
            c.stroke();
            c.fillStyle = '#565d55';
            c.fillRect(104, 162, 48, 94);
            c.fillStyle = '#d4c29d';
            c.fillRect(110, 168, 36, 82);
            c.fillStyle = color;
            c.fillRect(32, 57, 192, 30);
            c.fillStyle = '#fff0d1';
            c.font = 'bold 19px sans-serif';
            c.textAlign = 'center';
            c.fillText(label, 128, 79);
        }
        else {
            c.strokeStyle = '#b09a75';
            c.lineWidth = 3;
            c.setLineDash([8, 6]);
            c.strokeRect(8, 8, 240, 240);
            c.fillStyle = color;
            c.font = 'bold 23px sans-serif';
            c.textAlign = 'center';
            c.fillText(label, 128, 135);
        }
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        this.paperTextures.push(t);
        return t;
    }
    card(parent, size, at, texture) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), this.material(0xffffff, texture));
        m.position.set(...at);
        m.castShadow = m.receiveShadow = true;
        parent.add(m);
        return m;
    }
    buildBook() {
        this.box(this.scene, [35.5, 0.32, 18], [2, -0.7, 0.5], 0x6d7876);
        for (let i = 0; i < 5; i++)
            this.box(this.scene, [35.1 - i * 0.04, 0.04, 17.6 - i * 0.03], [2, -0.52 + i * 0.055, 0.5], i % 2 ? 0xddcfb0 : 0xf4e4bd);
        for (const [i, court] of bookCourts.entries()) {
            this.box(this.scene, [court.width, 0.28, court.depth], [court.x, 0.01, court.z], 0xe7d7b6);
            const label = this.card(this.scene, [court.width - 0.15, court.depth - 0.15], [court.x, bookRules.ground + 0.004, court.z], this.ink(['공방의 장', '수련의 장', '쉼터의 장'][i] ?? ''));
            label.rotation.x = -Math.PI / 2;
            // 페이지 가장자리만 점선으로 강조해 넓은 바탕을 차분하게 남긴다.
            for (let j = 0; j < 10; j++)
                this.box(this.scene, [0.24, 0.02, 0.05], [
                    court.x - court.width / 2 + 0.5 + (j * (court.width - 1)) / 10,
                    0.19,
                    court.z + court.depth / 2 - 0.2,
                ], 0xb6a480);
            const bookmark = this.card(this.scene, [2, 0.65], [court.x, 0.19, court.z + court.depth / 2 - 1], this.ink(`0${i + 1} · ${['제본', '수련', '귀환'][i] ?? ''}`));
            bookmark.rotation.x = -Math.PI / 2;
        }
        this.box(this.scene, [0.65, 0.06, 3], [bookEntrance.x, -0.3, 8.8], 0xb97965);
        const locations = [
            [-11, -5],
            [-5, -5],
            [0, -5.7],
            [6.1, 2.4],
            [11, -5.3],
            [16, 4.8],
        ];
        for (const [i, [x, z]] of locations.entries()) {
            const pivot = new THREE.Group();
            pivot.position.set(x, bookRules.ground, z);
            this.scene.add(pivot);
            const tree = new THREE.Shape();
            tree.moveTo(-0.6, 0);
            tree.lineTo(-0.65, 1.15);
            tree.lineTo(-0.32, 1.8);
            tree.lineTo(0, 2.2);
            tree.lineTo(0.6, 1.5);
            tree.lineTo(0.55, 0);
            tree.closePath();
            const mesh = new THREE.Mesh(new THREE.ShapeGeometry(tree), this.material(i % 2 ? 0x8f9b82 : 0xa9aa87));
            mesh.position.y = 0.18;
            mesh.castShadow = true;
            pivot.add(mesh);
            this.box(pivot, [0.12, 0.6, 0.07], [0, 0.3, 0], 0x8c7c62);
            this.decorations.push(pivot);
            this.box(this.scene, [1.25, 0.025, 0.55], [x, 0.18, z], 0xd0b68b);
        }
    }
    buildAssembly(b) {
        const root = new THREE.Group();
        root.position.set(b.x, bookRules.ground, b.z);
        this.scene.add(root);
        const front = new THREE.Group();
        front.position.z = b.depth / 2;
        root.add(front);
        const facade = this.card(front, [b.width, b.height], [0, b.height / 2, 0.035], this.ink(b.label, b.color, true));
        this.box(front, [b.width, b.height, 0.035], [0, b.height / 2, 0], 0xf1e1be);
        facade.renderOrder = 1;
        const sides = [];
        for (const sign of [-1, 1]) {
            const hinge = new THREE.Group();
            hinge.position.set((sign * b.width) / 2, 0, b.depth / 2);
            root.add(hinge);
            this.box(hinge, [0.035, b.height, b.depth], [0, b.height / 2, -b.depth / 2], 0xe9d4ae);
            sides.push(hinge);
        }
        const roof = [];
        for (const sign of [-1, 1]) {
            const hinge = new THREE.Group();
            hinge.position.set((sign * b.width) / 2, b.height, 0);
            front.add(hinge);
            this.box(hinge, [b.width / 2 + 0.3, 0.055, b.depth + 0.35], [-sign * (b.width / 4 + 0.15), 0, -b.depth / 2], b.color);
            roof.push(hinge);
        }
        const tabs = new THREE.Group();
        root.add(tabs);
        for (const sign of [-1, 1])
            this.box(tabs, [0.5, 0.03, 0.7], [(sign * b.width) / 2, 0.02, b.depth / 2 + 0.17], 0xf5e7c7);
        return { front, sides, roof, tabs };
    }
    buildBridge(b) {
        const hinges = [];
        for (const side of [-1, 1]) {
            const hinge = new THREE.Group();
            hinge.position.set(b.x + (side * b.width) / 2, bookRules.ground, b.z);
            this.scene.add(hinge);
            const center = (-side * b.width) / 4;
            this.box(hinge, [b.width / 2, 0.055, b.depth], [center, 0, 0], 0xf0dbb0);
            for (let i = 0; i < 4; i++)
                this.box(hinge, [0.026, 0.01, b.depth - 0.16], [center - b.width / 4 + 0.16 + i * 0.37, 0.034, 0], 0xb79669);
            for (const z of [-b.depth / 2, b.depth / 2])
                this.box(hinge, [b.width / 2, 0.22, 0.045], [center, 0.13, z], 0xbfa783);
            hinges.push(hinge);
        }
        this.bridgeHinges.push(hinges);
    }
    async load() {
        await this.textures.load(new Set([...this.actor.motions.values()].flatMap((a) => a.frames.map((f) => f.localPath))), '아타호 원본 프레임 로딩 실패');
    }
    render(state, delta, options) {
        if (this.disposed)
            return;
        this.frames++;
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const renderSize = this.renderer.getSize(new THREE.Vector2());
        if (renderSize.x !== Math.round(this.width) ||
            renderSize.y !== Math.round(this.height))
            this.renderer.setSize(Math.round(this.width), Math.round(this.height), false);
        const aspect = this.width / this.height, half = options.overview
            ? Math.max(10, 20 / aspect)
            : aspect < 1
                ? 8.5
                : Math.max(9.4, 19 / aspect);
        Object.assign(this.camera, {
            left: -half * aspect,
            right: half * aspect,
            top: half,
            bottom: -half,
        });
        this.camera.updateProjectionMatrix();
        const follow = !options.overview && aspect < 1, cx = follow ? state.player.x : 2, cz = follow ? state.player.z * 0.6 : 0.5;
        this.camera.position.set(cx + 9, 24, cz + 27);
        this.camera.lookAt(cx, 0.8, cz);
        this.camera.updateMatrixWorld();
        const frame = Math.floor((state.modelTime + 1e-9) * 12);
        if (frame !== this.modelFrame) {
            this.modelFrame = frame;
            this.modelChanges++;
        }
        this.assemblies.forEach((assembly, i) => {
            const progress = i === 2 ? state.folds[1] : (state.folds[i] ?? 0), shown = progress >= 1
                ? 1
                : Math.floor(progress * bookRules.foldDuration * 12) /
                    (bookRules.foldDuration * 12), ease = shown * shown * (3 - 2 * shown);
            assembly.front.rotation.x = (-Math.PI / 2) * (1 - ease);
            assembly.sides.forEach((side, j) => {
                side.rotation.y = (((j === 0 ? -1 : 1) * Math.PI) / 2) * (1 - ease);
            });
            assembly.roof.forEach((roof, j) => {
                roof.rotation.z = (j === 0 ? 1 : -1) * (0.35 + 0.25 * ease);
            });
        });
        this.bridgeHinges.forEach((hinges, i) => {
            const p = state.folds[i] ?? 0, shown = p >= 1
                ? 1
                : Math.floor(p * bookRules.foldDuration * 12) /
                    (bookRules.foldDuration * 12);
            hinges.forEach((hinge, j) => {
                hinge.rotation.z = (((j === 0 ? 1 : -1) * Math.PI) / 2) * (1 - shown);
            });
        });
        this.decorations.forEach((decor, i) => {
            decor.rotation.z = Math.sin(state.modelTime * 1.8 + i) * 0.028;
        });
        if (!options.freezeActor) {
            const facing = cardinalFacing(state.player.facing);
            this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${facing === 'front' ? '' : `-${facing}`}`, delta);
        }
        this.actor.mesh.rotation.set(0, this.yaw, 0);
        this.actor.mesh.scale.y =
            Math.hypot(Math.hypot(9, 27), 23.2) / Math.hypot(9, 27);
        this.actor.mesh.position.y = bookRules.ground + 0.025;
        this.actor.shadow.position.y = bookRules.ground + 0.016;
        this.renderer.render(this.scene, this.camera);
    }
    movementToWorld(input) {
        return {
            x: input.x * Math.cos(this.yaw) + input.z * Math.sin(this.yaw),
            z: -input.x * Math.sin(this.yaw) + input.z * Math.cos(this.yaw),
        };
    }
    pick(clientX, clientY) {
        const b = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - b.left) / b.width) * 2 - 1, 1 - ((clientY - b.top) / b.height) * 2), this.camera);
        const p = this.raycaster.ray.intersectPlane(this.floor, new THREE.Vector3());
        return p ? { x: p.x, z: p.z } : null;
    }
    project(p) {
        const v = new THREE.Vector3(p.x, bookRules.ground, p.z).project(this.camera);
        return {
            x: ((v.x + 1) * this.width) / 2,
            y: ((1 - v.y) * this.height) / 2,
        };
    }
    get diagnostics() {
        const frame = this.actor.animation.currentFrame.frame;
        return Object.freeze({
            renderCount: this.frames,
            modelFrame: this.modelFrame,
            modelChanges: this.modelChanges,
            cadence: 12,
            actorWidth: frame.width,
            actorHeight: frame.height,
            actorPivot: Object.freeze({ ...frame.pivot }),
            depthTest: true,
            disposed: this.disposed,
        });
    }
    get screenPositions() {
        return [
            ...bookPlaces,
            { id: 'entrance', label: '제본 입구', ...bookEntrance },
        ].map((p) => Object.freeze({
            id: p.id,
            label: p.label,
            world: Object.freeze({ x: p.x, z: p.z }),
            screen: Object.freeze(this.project(p)),
        }));
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.remove(this.actor.mesh, this.actor.shadow);
        this.actor.dispose();
        this.textures.dispose();
        const geometries = new Set(), materials = new Set();
        this.scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
                geometries.add(o.geometry);
                (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
            }
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        this.paperTextures.forEach((t) => t.dispose());
        this.sun.shadow.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.scene.clear();
    }
}
