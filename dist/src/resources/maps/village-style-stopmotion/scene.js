import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { stopmotionEntrance, stopmotionCrates, stopmotionBench, stopmotionHeight, stopmotionHouses, stopmotionPaths, stopmotionPlaces, stopmotionRules, } from './layout.js';
import { paintTexture, cardTexture } from './model-art.js';
import { ModelCadence } from './cadence.js';
export const stopmotionCameraYaw = Math.atan2(10, 28);
/** 모형·표시 박자·GPU 자원을 소유하며 연속 보행 상태를 받아 표시한다. */
export class StopmotionScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 120);
    renderer;
    spriteTextures = new SpriteTextures();
    actor = new TrailSprite(new Map([...trailMotions('ai/tiger-hero', true)].filter(([name]) => /^(stand|move)(-(back|left|right))?$/.test(name))), this.spriteTextures, 30, 0.32);
    textures = new Set();
    materials = new Map();
    before = new THREE.Group();
    after = new THREE.Group();
    signs = [];
    plants = [];
    flame = new THREE.Group();
    smoke = [];
    badges = [];
    fireLight = new THREE.PointLight(0xfcc160, 1, 5);
    clock = new ModelCadence();
    target = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 24), new THREE.MeshBasicMaterial({ color: 0xab5d35, side: THREE.DoubleSide }));
    raycaster = new THREE.Raycaster();
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -stopmotionRules.groundY);
    width = 1;
    height = 1;
    disposed = false;
    renderCount = 0;
    lastDisplayFrame = -1;
    lastCadence = true;
    lastState = null;
    lastView = { overview: false, cadence: true };
    pose = { signTilt: 0, flameScale: 1, smokeHeight: 0, badgeTilt: 0 };
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
        this.scene.background = new THREE.Color(0x9d9c84);
        const sun = new THREE.DirectionalLight(0xffe8ba, 3);
        sun.position.set(-16, 28, 17);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.normalBias = 0.035;
        Object.assign(sun.shadow.camera, {
            left: -23,
            right: 23,
            top: 23,
            bottom: -23,
            near: 1,
            far: 80,
        });
        this.scene.add(sun, new THREE.HemisphereLight(0xfff0d2, 0x5e6655, 2));
        this.scene.children.forEach((child) => child.layers.enableAll());
        this.camera.layers.enableAll();
        this.buildBoard();
        this.buildVillage();
        this.scene.add(this.actor.mesh, this.actor.shadow, this.before, this.after, this.flame, this.fireLight, this.target);
        this.fireLight.position.set(-5.3, 1.3, 3.2);
        this.flame.position.set(-5.3, 0.89, 3.2);
        this.target.rotation.x = -Math.PI / 2;
        this.target.visible = false;
    }
    painted(color, edge = false) {
        const key = color + (edge ? 'edge' : 'paint');
        const cached = this.materials.get(key);
        if (cached)
            return cached;
        const texture = paintTexture(color, edge);
        this.textures.add(texture);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            side: THREE.DoubleSide,
            flatShading: true,
        });
        this.materials.set(key, material);
        return material;
    }
    box(parent, x, y, z, w, h, d, color, edge = false, wobble = 0) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        if (wobble) {
            const p = geometry.getAttribute('position');
            for (let i = 0; i < p.count; i++) {
                const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
                p.setXYZ(i, px + (py > 0 ? Math.sign(pz) * wobble : 0), py + Math.sign(px) * wobble * 0.35, pz + (py > 0 ? Math.sign(px) * wobble * 0.7 : 0));
            }
            geometry.computeVertexNormals();
        }
        const mesh = new THREE.Mesh(geometry, this.painted(color, edge));
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    card(parent, kind, w, h, x, y, z, label = '') {
        const texture = cardTexture(kind, label);
        this.textures.add(texture);
        // 실루엣의 투명 경계도 불투명 조각과 같은 깊이 판정을 쓴다.
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
            map: texture,
            alphaTest: 0.5,
            roughness: 1,
            side: THREE.DoubleSide,
        }));
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    buildBoard() {
        const table = new THREE.Mesh(new THREE.BoxGeometry(70, 0.2, 70), new THREE.MeshStandardMaterial({ color: 0x929481, roughness: 1 }));
        table.position.y = -1.0;
        table.receiveShadow = true;
        this.scene.add(table);
        // 팝업 책이 아닌, 잘라 쌓은 골판지 작업판. 앞 단면의 물결이 그대로 보인다.
        this.box(this.scene, 0, -0.49, 0, 23.6, 0.9, 25.5, '#ad8b5f', true, 0.13);
        this.box(this.scene, 0, -0.04, 0, 23.2, 0.16, 25.1, '#858762', false, 0.08);
        for (const path of stopmotionPaths)
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1], b = path[i];
                if (!a || !b)
                    continue;
                const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
                const mesh = this.box(this.scene, (a.x + b.x) / 2, 0.072, (a.z + b.z) / 2, 1.55, 0.035, length + 0.2, '#c3ac80');
                mesh.rotation.y = Math.atan2(dx, dz);
                for (let j = 0; j < length; j += 0.65) {
                    const t = j / length;
                    const patch = this.box(this.scene, a.x + dx * t + Math.cos(j) * 0.1, 0.102, a.z + dz * t, 0.35, 0.025, 0.23, j % 2 < 1 ? '#b9a074' : '#d5bf8b');
                    patch.rotation.y = j * 2.1;
                }
            }
        for (let i = 0; i < 16; i++) {
            const x = -10.8 + i * 1.43;
            this.box(this.scene, x, 0.12, 11.7, 0.9, 0.11, 0.42, i % 3 ? '#ccb98e' : '#bbaa7c', true);
        }
        // 포장 흔적을 가볍게 남겨 실물 모형의 작업 무대를 만든다.
        for (const x of [-11.55, 11.55])
            for (let z = -11; z < 11; z += 2.4)
                this.box(this.scene, x, 0.1, z, 0.18, 0.035, 1.25, '#ddcba2');
    }
    house(house, parent, broken = false) {
        const g = new THREE.Group();
        g.position.set(house.x, 0.09, house.z);
        parent.add(g);
        const { width: w, depth: d, height: h } = house;
        this.box(g, 0, 0.1, 0, w + 0.28, 0.25, d + 0.24, '#ac8c60', true, 0.05);
        this.box(g, 0, h / 2, 0, w, h, d, house.color, false, 0.13);
        // 노출된 원재료의 모서리와 잘못 붙인 테이프는 실제 두께를 드러낸다.
        for (const x of [-w / 2, w / 2])
            this.box(g, x, h * 0.51, d / 2 + 0.018, 0.16, h * 0.94, 0.09, '#b49666', true);
        for (let i = 0; i < 3; i++) {
            const tape = this.box(g, (i - 1) * w * 0.25, h * 0.85, d / 2 + 0.085, 0.57, 0.14, 0.025, '#d5bd86');
            tape.rotation.z = (i - 1) * 0.2;
        }
        const roof = new THREE.Group();
        roof.position.set(0, h + 0.13, 0);
        roof.rotation.z = broken ? -0.09 : 0.023;
        g.add(roof);
        for (const side of [-1, 1]) {
            if (broken && side === 1)
                continue;
            const panel = this.box(roof, side * w * 0.26, 0.21, 0, w * 0.62, 0.2, d + 0.66, '#9b7350', true, 0.04);
            panel.rotation.z = -side * 0.35;
            const paint = this.box(roof, side * w * 0.26, 0.33, 0, w * 0.61, 0.05, d + 0.68, house.kind === 'dojo' ? '#77774b' : '#596e61');
            paint.rotation.z = -side * 0.35;
            for (let i = 0; i < 4; i++) {
                const strip = this.box(roof, side * w * 0.26, 0.37, -d / 2 + (i * d) / 3, w * 0.6, 0.018, 0.08, '#b7a47b');
                strip.rotation.z = -side * 0.35;
            }
        }
        if (broken) {
            const fallen = this.box(g, w * 0.33, 0.55, d * 0.1, w * 0.43, 0.24, d * 0.8, '#a08958', true);
            fallen.rotation.z = 0.6;
        }
        this.box(g, -w * 0.24, h * 0.9, -d * 0.22, 0.65, 1.65, 0.66, house.color, true, 0.07);
        this.card(g, 'door', 0.82, h * 0.55, 0, h * 0.28, d / 2 + 0.16);
        for (const x of [-w * 0.32, w * 0.32]) {
            this.card(g, 'window', w * 0.24, 0.85, x, h * 0.55, d / 2 + 0.16);
            this.box(g, x, h * 0.55 - 0.42, d / 2 + 0.26, w * 0.3, 0.14, 0.25, '#b0a479', true);
        }
        const sign = new THREE.Group();
        sign.position.set(0, h * 0.83, d / 2 + 0.33);
        g.add(sign);
        this.card(sign, 'sign', Math.min(w * 0.66, 2.4), 0.6, 0, 0, 0, broken ? '道 場 …' : house.name);
        this.signs.push(sign);
        this.box(g, 0, h * 0.96, d / 2 + 0.25, 0.08, 0.35, 0.09, '#67503b');
        if (house.kind === 'dojo' && !broken) {
            for (const x of [-2.1, 2.1]) {
                const lantern = this.box(g, x, 2.05, d / 2 + 0.3, 0.45, 0.58, 0.45, '#dca052', false, 0.04);
                lantern.rotation.z = x * 0.03;
            }
        }
    }
    tree(x, z, scale) {
        const g = new THREE.Group();
        g.position.set(x, 0.09, z);
        this.scene.add(g);
        this.box(g, 0, 0.12, 0, 0.73 * scale, 0.2, 0.56 * scale, '#a68859', true, 0.04);
        for (const angle of [0, 0.95]) {
            const plane = this.card(g, 'plant', 2.0 * scale, 2.25 * scale, 0, 1.15 * scale, 0);
            plane.rotation.y = angle;
        }
        this.plants.push(g);
    }
    buildVillage() {
        for (const h of stopmotionHouses) {
            if (h.kind === 'dojo') {
                this.house(h, this.before, true);
                this.house(h, this.after);
            }
            else
                this.house(h, this.scene);
        }
        const ramp = this.box(this.scene, 1, 0.18, -3.9, 5, 0.17, 1.4, '#c4a67e', true);
        ramp.rotation.x = 0.18;
        this.box(this.scene, -5.3, 0.45, 3.2, 1.2, 0.74, 1.12, '#b38155', true, 0.05);
        this.box(this.scene, -5.3, 0.85, 3.2, 1.1, 0.11, 1.05, '#685346');
        for (const angle of [0, 0.8]) {
            const flame = this.card(this.flame, 'fire', 1.0, 1.45, 0, 0.68, 0);
            flame.rotation.y = angle;
        }
        for (let i = 0; i < 3; i++) {
            const puff = this.card(this.scene, 'smoke', 1, 0.75, 0, 0, 0);
            this.smoke.push(puff);
        }
        for (const [x, z, s] of [
            [-9.3, 8.8, 1.1],
            [-9.9, -7.8, 1.2],
            [-2.4, -10.2, 0.85],
            [2.8, -10.2, 1.0],
            [9.3, -8.7, 1.15],
            [8.6, -5.4, 0.72],
            [4.8, -7.8, 0.58],
            [9.7, 7.9, 0.9],
            [-8.6, 4.9, 0.65],
        ])
            this.tree(x, z, s);
        this.box(this.scene, stopmotionBench.x, 0.53, stopmotionBench.z, stopmotionBench.width, 0.23, stopmotionBench.depth, '#ae7650', true, 0.04);
        const back = this.box(this.scene, 8.1, 0.95, -7.28, 1.75, 0.85, 0.2, '#bc9364', true, 0.05);
        back.rotation.z = -0.05;
        for (const x of [7.5, 8.7])
            this.box(this.scene, x, 0.27, -7.03, 0.24, 0.55, 0.52, '#8b7053');
        for (const place of stopmotionPlaces) {
            const badge = new THREE.Group();
            badge.position.set(place.x + 0.57, 0.08, place.z + 0.62);
            this.scene.add(badge);
            this.box(badge, 0, 0.4, 0, 0.075, 0.82, 0.08, '#8e704f');
            this.card(badge, 'sign', 1.12, 0.36, 0, 0.81, 0, place.id === 'hearth' ? '火' : place.id === 'dojo' ? '道 場' : '쉼');
            this.badges.push(badge);
        }
        const welcome = new THREE.Group();
        welcome.position.set(2.1, 0.06, 8.5);
        this.scene.add(welcome);
        this.box(welcome, 0, 0.5, 0, 0.12, 1.05, 0.16, '#7e6244', true);
        this.card(welcome, 'sign', 1.65, 0.6, 0, 1.05, 0, '골목 →');
        for (const { x, z, width, depth } of stopmotionCrates) {
            this.box(this.scene, x, 0.4, z, width - 0.1, 0.72, depth - 0.1, '#c4a267', true, 0.04);
            this.box(this.scene, x, 0.82, z, width, 0.1, depth, '#aa7555');
        }
        for (let i = 0; i < 5; i++) {
            const bucket = this.box(this.scene, -7.5 + i * 0.4, 0.39, 2.1, 0.27, 0.56, 0.29, ['#ac5e3d', '#6a8a80', '#b99d44'][i % 3] ?? '#ac5e3d');
            bucket.rotation.z = (i - 2) * 0.025;
        }
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '승인된 아타호 보행 그림을 불러오지 못했어요.');
    }
    render(state, delta, view) {
        if (this.disposed)
            return;
        const { overview, cadence } = view;
        this.lastState = state;
        this.lastView = { ...view };
        this.resize();
        this.renderCount++;
        const aspect = this.width / this.height;
        const half = overview
            ? Math.max(12.5, 16 / aspect)
            : aspect < 1
                ? 7.9
                : 10.6;
        Object.assign(this.camera, {
            left: -half * aspect,
            right: half * aspect,
            top: half,
            bottom: -half,
        });
        this.camera.updateProjectionMatrix();
        const follow = !overview && aspect < 1, cx = follow ? state.position.x * 0.72 : 0, cz = follow ? state.position.z * 0.72 - 1.2 : 0;
        this.camera.position.set(cx + 10, 22, cz + 28);
        this.camera.lookAt(cx, 0.7, cz);
        this.camera.updateMatrixWorld();
        const suffix = state.position.facing === 'front' ? '' : `-${state.position.facing}`;
        this.actor.update(state.position, `${state.position.moving ? 'move' : 'stand'}${suffix}`, delta);
        this.actor.mesh.rotation.set(0, stopmotionCameraYaw, 0);
        this.actor.mesh.scale.y =
            Math.hypot(Math.hypot(10, 28), 21.3) / Math.hypot(10, 28);
        this.actor.mesh.position.y = state.position.y + 0.035;
        this.actor.shadow.position.y = state.position.y + 0.02;
        this.before.visible = !state.restored;
        this.after.visible = state.restored;
        this.clock.advance(delta, cadence);
        const seconds = this.clock.snapshot.time;
        const frame = this.clock.snapshot.frame;
        if (!cadence ||
            frame !== this.lastDisplayFrame ||
            cadence !== this.lastCadence) {
            const flameScale = 1 + Math.sin(seconds * 16) * 0.12;
            this.signs.forEach((sign, i) => {
                sign.rotation.z = Math.sin(seconds * 2.4 + i) * 0.045;
            });
            this.flame.scale.setScalar((state.fireSeconds > 0 ? 1 : 0.38) * flameScale);
            this.fireLight.intensity =
                state.fireSeconds > 0 ? 4.5 + Math.sin(seconds * 16) * 0.7 : 0.6;
            this.smoke.forEach((puff, i) => {
                const phase = (seconds * 0.45 + i / 3) % 1;
                puff.position.set(-5.3 + phase * 0.45, 1.35 + phase * 2.1, 3.2);
                puff.scale.setScalar((state.fireSeconds > 0 ? 1 : 0.45) * (0.65 + phase * 0.65));
                puff.rotation.set(0, stopmotionCameraYaw, Math.sin(seconds * 3 + i) * 0.18);
            });
            this.plants.forEach((plant, i) => {
                plant.rotation.z = Math.sin(seconds * 1.7 + i) * 0.02;
            });
            this.badges.forEach((badge, i) => {
                badge.rotation.z = Math.sin(seconds * 3.2 + i) * 0.06;
            });
            this.pose = {
                signTilt: this.signs[0]?.rotation.z ?? 0,
                flameScale: this.flame.scale.x,
                smokeHeight: this.smoke[0]?.position.y ?? 0,
                badgeTilt: this.badges[0]?.rotation.z ?? 0,
            };
            this.lastDisplayFrame = frame;
            this.lastCadence = cadence;
        }
        this.renderer.render(this.scene, this.camera);
    }
    /** 멈춘 표시를 보관하고 창 크기가 바뀐 경우에만 다시 투영한다. */
    refreshPausedSize() {
        if (this.disposed || !this.lastState)
            return;
        const bounds = this.canvas.getBoundingClientRect();
        const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        if (width === this.width &&
            height === this.height &&
            this.canvas.width === Math.floor(width * ratio) &&
            this.canvas.height === Math.floor(height * ratio))
            return;
        this.render(this.lastState, 0, this.lastView);
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.floor(this.width * dpr), h = Math.floor(this.height * dpr);
        if (this.canvas.width !== w || this.canvas.height !== h)
            this.renderer.setSize(w, h, false);
    }
    pick(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, 1 - ((clientY - bounds.top) / bounds.height) * 2), this.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floor, new THREE.Vector3());
        if (!hit)
            return null;
        let high = this.raycaster.ray.origin.distanceTo(hit), low = Math.max(0, high - 2);
        for (let i = 0; i < 24; i++) {
            const middle = (low + high) / 2, point = this.raycaster.ray.at(middle, new THREE.Vector3());
            if (point.y > stopmotionHeight(point))
                low = middle;
            else
                high = middle;
        }
        const point = this.raycaster.ray.at((low + high) / 2, new THREE.Vector3());
        return { x: point.x, z: point.z };
    }
    mark(point) {
        this.target.visible = !!point;
        if (point)
            this.target.position.set(point.x, stopmotionHeight(point) + 0.04, point.z);
    }
    project(point) {
        const p = new THREE.Vector3(point.x, stopmotionHeight(point), point.z).project(this.camera);
        return {
            x: ((p.x + 1) * this.width) / 2,
            y: ((1 - p.y) * this.height) / 2,
        };
    }
    get screenPositions() {
        return [...stopmotionPlaces, { id: 'entrance', ...stopmotionEntrance }].map((place) => ({
            id: place.id,
            world: { x: place.x, z: place.z },
            screen: this.project(place),
        }));
    }
    get diagnostics() {
        const sample = this.clock.snapshot;
        return {
            renderCount: this.renderCount,
            displayFrame: sample.frame,
            displayTime: sample.time,
            cadence: sample.stepped ? '12fps' : 'continuous',
            pose: { ...this.pose },
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            actorWidth: this.actor.mesh.geometry.parameters.width,
            actorHeight: this.actor.mesh.geometry.parameters.height,
            actorScaleY: this.actor.mesh.scale.y,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.remove(this.actor.mesh, this.actor.shadow);
        this.actor.dispose();
        this.spriteTextures.dispose();
        const geometries = new Set(), materials = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight)
                object.dispose();
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                (Array.isArray(object.material)
                    ? object.material
                    : [object.material]).forEach((material) => materials.add(material));
            }
        });
        this.textures.forEach((texture) => texture.dispose());
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
