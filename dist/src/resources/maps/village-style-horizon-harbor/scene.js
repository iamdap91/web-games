import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { bendHorizon, unbendHorizon, horizonRadius, } from './curve.js';
import { horizonHouses, horizonPlaces, horizonEntrance, harborGroundHeight, harborSurfaceHeight, harborGroundSlope, harborExits, } from './layout.js';
import { grassArt, wallArt, roofArt, signArt, plantArt } from './art.js';
import { createHarborDockGeometry } from './dock-geometry.js';
/** 실제 정점을 굽혀 조명·그림자·가림도 같은 형상을 따라가게 한다. */
export class HorizonScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
    renderer;
    author = new THREE.Group();
    meshes = [];
    walkingSurfaces = [];
    bell = new THREE.Group();
    textures = new Set();
    spriteTextures = new SpriteTextures();
    actor = new TrailSprite(new Map([...trailMotions('ai/tiger-hero', true)].filter(([name]) => /^(stand|move)(-(back|left|right))?$/.test(name))), this.spriteTextures, 35, 0.32);
    raycaster = new THREE.Raycaster();
    flame = new THREE.Group();
    smoke = new THREE.Group();
    fireLight = new THREE.PointLight(0xffb15c, 0, 5);
    target = new THREE.Mesh(new THREE.RingGeometry(0.23, 0.29, 24), new THREE.MeshBasicMaterial({ color: 0xffe3a5, side: THREE.DoubleSide }));
    marker = null;
    playerGround = horizonEntrance;
    width = 1;
    height = 1;
    centerZ = 9;
    curved = true;
    overview = false;
    previousCenter = Infinity;
    previousCurved = false;
    previousSail = -1;
    frameCount = 0;
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
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.scene.background = new THREE.Color(0xb2d7df);
        this.scene.fog = new THREE.Fog(0xb2d7df, 45, 90);
        const sun = new THREE.DirectionalLight(0xffedca, 2.6);
        sun.position.set(-18, 27, 18);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.normalBias = 0.03;
        Object.assign(sun.shadow.camera, {
            left: -24,
            right: 24,
            top: 34,
            bottom: -34,
            near: 1,
            far: 100,
        });
        this.scene.add(sun, sun.target, new THREE.HemisphereLight(0xe9f5ff, 0x637951, 2), this.author);
        this.buildGround();
        this.buildVillage();
        this.bakeGeometry();
        this.scene.add(this.actor.mesh, this.actor.shadow, this.flame, this.smoke, this.fireLight, this.target, this.bell);
        this.camera.layers.enableAll();
        this.scene.children.forEach((child) => child.layers.enableAll());
        this.mesh(this.bell, new THREE.CylinderGeometry(0.23, 0.38, 0.48, 10), this.material(0xcaa656), 0, 0, 0);
        this.box(this.bell, 0, -0.29, 0, 0.08, 0.25, 0.08, 0x614b36);
        this.target.rotation.x = -Math.PI / 2;
        this.target.visible = false;
        for (let i = 0; i < 3; i++) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16 + i * 0.02, 0.65, 5), new THREE.MeshBasicMaterial({
                color: [0xf7c76c, 0xf29342, 0xffdc83][i] ?? 0xf7c76c,
            }));
            flame.position.set((i - 1) * 0.2, 0.22 + i * 0.1, 0);
            this.flame.add(flame);
        }
        for (let i = 0; i < 4; i++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({
                color: 0xfff5df,
                transparent: true,
                opacity: 0.3,
                depthWrite: false,
            }));
            this.smoke.add(puff);
        }
    }
    material(color, texture) {
        if (texture)
            this.textures.add(texture);
        return new THREE.MeshStandardMaterial({
            color,
            map: texture ?? null,
            roughness: 1,
            side: THREE.DoubleSide,
        });
    }
    mesh(parent, geometry, material, x, y, z) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    box(parent, x, y, z, w, h, d, color, texture) {
        return this.mesh(parent, new THREE.BoxGeometry(w, h, d, 2, 1, 2), this.material(color, texture), x, y, z);
    }
    card(parent, texture, w, h, x, y, z) {
        const material = this.material(0xffffff, texture);
        material.alphaTest = 0.5;
        return this.mesh(parent, new THREE.PlaneGeometry(w, h, 1, 3), material, x, y, z);
    }
    groundPatch(x, z, w, d, color, y = 0.016) {
        const patch = this.mesh(this.author, new THREE.PlaneGeometry(w, d, 3, 6), this.material(color), x, y, z);
        patch.rotation.x = -Math.PI / 2;
        patch.castShadow = false;
        return patch;
    }
    buildGround() {
        const ground = this.mesh(this.author, new THREE.PlaneGeometry(20, 32, 40, 96), this.material(0xffffff, grassArt()), 0, 0, 2);
        ground.rotation.x = -Math.PI / 2;
        ground.castShadow = false;
        ground.userData.walkSurface = true;
        const sea = this.groundPatch(0, -36, 56, 44, 0x78b6bd, -0.42);
        sea.userData.skipElevation = true;
        this.groundPatch(0, -13.5, 20, 1, 0xd9c79f, 0.004);
        // 길과 파도는 적은 수의 큰 면으로 묶어 목적지의 윤곽을 우선한다.
        for (let z = -13; z <= 14; z += 0.9) {
            this.groundPatch(0, z, 2.8, 0.91, 0xd7c6a1);
            if (Math.abs(z % 3) < 1)
                this.groundPatch(0.8, z, 0.65, 0.055, 0xc2b28c, 0.024);
        }
        for (const place of horizonPlaces.filter((place) => place.id !== 'dock'))
            this.groundPatch(place.x / 2, place.z, Math.abs(place.x) + 1.5, 1.5, 0xd7c6a1);
        const dock = this.mesh(this.author, createHarborDockGeometry(), this.material(0xb69c75), 0, 0, 0);
        dock.userData.walkSurface = true;
        for (let z = -14; z >= -22.8; z -= 0.55)
            this.groundPatch(0, z, 3.15, 0.035, 0x8d795d, 0.109);
        for (const x of [-1.48, 1.48])
            for (let z = -14.7; z >= -22.4; z -= 1.8) {
                this.box(this.author, x, -0.2, z, 0.19, 1.3, 0.19, 0x7b6852);
                if (z > -21.8)
                    this.box(this.author, x, 0.39, z - 0.85, 0.1, 0.1, 1.8, 0xd4c4a3);
            }
        for (let i = 0; i < 10; i++)
            this.groundPatch(-9 + (i % 3) * 9, -16 - i * 2, 5, 0.055, 0xa4d1ce, -0.395).userData.skipElevation = true;
    }
    house(house, damaged) {
        const group = new THREE.Group();
        group.position.set(house.x, 0, house.z);
        this.author.add(group);
        const { w, h, d } = house;
        this.box(group, 0, h / 2, 0, w, h, d, 0xffffff, wallArt(damaged ? '#b2ab94' : house.color));
        this.box(group, 0, 0.12, 0, w + 0.35, 0.24, d + 0.3, 0xb4aa89);
        const roofTexture = roofArt(damaged ? '#827c6c' : house.roof);
        for (const side of [-1, 1]) {
            const edge = side * (w / 2 + 0.28);
            // 큰 지붕 면도 같은 곡면으로 세분해 벽과 지붕 사이에 틈이 생기지 않게 한다.
            const geometry = new THREE.PlaneGeometry(1, 1, 4, 10);
            const position = geometry.getAttribute('position');
            const uv = geometry.getAttribute('uv');
            for (let i = 0; i < position.count; i++) {
                const across = uv.getX(i), depth = uv.getY(i);
                position.setXYZ(i, edge * (1 - across), h - 0.06 + across * 1.01, (depth - 0.5) * (d + 0.56));
            }
            geometry.computeVertexNormals();
            this.mesh(group, geometry, this.material(0xffffff, roofTexture), 0, 0, 0);
            const gable = new THREE.BufferGeometry();
            gable.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, h, 0, w / 2, h, 0, 0, h + 0.94, 0], 3));
            gable.computeVertexNormals();
            this.mesh(group, gable, this.material(damaged ? '#b2ab94' : house.color), 0, 0, side * (d / 2 + 0.002));
        }
        this.box(group, 0, h + 0.94, 0, 0.13, 0.13, d + 0.63, damaged ? '#827c6c' : house.roof);
        for (const x of [-w * 0.27, w * 0.27]) {
            this.box(group, x, h * 0.57, d / 2 + 0.024, 0.78, 0.72, 0.08, damaged ? 0x78745c : 0x526a61);
            this.box(group, x, h * 0.57, d / 2 + 0.075, 0.04, 0.72, 0.035, 0xe8d4aa);
            this.box(group, x, h * 0.57, d / 2 + 0.075, 0.78, 0.04, 0.035, 0xe8d4aa);
        }
        this.box(group, 0, 0.77, d / 2 + 0.025, 0.68, 1.4, 0.08, damaged ? 0x716e5d : 0x7c6650);
        this.card(group, signArt(house.name), Math.min(w * 0.7, 2.8), 0.56, 0, h * 0.84, d / 2 + 0.06);
        this.box(group, -w / 2 - 0.04, h * 0.35, 0.4, 0.11, h * 0.75, 0.11, 0xf2dfbd);
        this.box(group, w / 2 + 0.04, h * 0.35, 0.4, 0.11, h * 0.75, 0.11, 0xf2dfbd);
        if (damaged) {
            for (const angle of [-0.23, 0.23])
                this.box(group, 0, 0.85, d / 2 + 0.15, 1.3, 0.16, 0.1, 0x9e8969).rotation.z = angle;
        }
        else if (house.kind === 'inn') {
            for (const x of [-1.55, 1.55]) {
                this.box(group, x, 1, d / 2 + 0.28, 0.06, 2, 0.06, 0x765f4a);
                this.mesh(group, new THREE.SphereGeometry(0.23, 8, 8), new THREE.MeshStandardMaterial({
                    color: 0xffdb8b,
                    emissive: 0xc77324,
                    emissiveIntensity: 0.7,
                }), x, 1.55, d / 2 + 0.29);
            }
        }
        if (house.kind === 'inn') {
            this.box(group, 0, 1.7, d / 2 + 0.5, w + 0.45, 0.17, 0.9, 0x9d7958);
            this.box(group, 0, 2.1, d / 2 + 0.8, w + 0.45, 0.1, 0.1, 0xe5d3b0);
            for (const x of [-w / 2, 0, w / 2])
                this.box(group, x, 1.95, d / 2 + 0.8, 0.1, 0.6, 0.1, 0xe5d3b0);
        }
        else if (house.kind === 'market') {
            this.box(group, 0, 0.45, d / 2 + 0.8, w + 0.2, 0.7, 0.85, 0xae8961);
            this.box(group, 0, 1.7, d / 2 + 0.9, w + 0.7, 0.15, 1.8, 0xd3b875);
            for (const x of [-w / 2, w / 2])
                this.box(group, x, 0.85, d / 2 + 1.5, 0.09, 1.7, 0.09, 0x856d51);
            for (let i = 0; i < 4; i++)
                this.box(group, -1.4 + i * 0.8, 0.93, d / 2 + 0.8, 0.55, 0.25, 0.55, [0x8ca17c, 0xd1a06b, 0xbd7f69, 0x829ca0][i] ?? 0x8ca17c);
        }
        else if (house.kind === 'supply') {
            this.box(group, 1, h + 0.3, -0.6, 0.55, 1.1, 0.6, 0xa0a596);
            for (let i = 0; i < 3; i++)
                this.box(group, -w / 2 - 0.3, 0.25 + i * 0.4, d / 2, 0.6, 0.45, 0.7, 0x9f805b);
        }
        else {
            this.box(group, 0, 1.25, d / 2 + 0.1, 1.45, 2.3, 0.12, 0x6e6355);
            for (const x of [-w * 0.35, w * 0.35])
                this.box(group, x, h * 0.45, d / 2 + 0.12, 0.13, h * 0.9, 0.15, 0x877059);
            this.box(group, 0, h * 0.55, d / 2 + 0.2, w * 0.95, 0.14, 0.1, 0x877059);
        }
    }
    tree(x, z, scale) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        this.author.add(group);
        this.mesh(group, new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 2 * scale, 7), this.material(0x876949), 0, scale, 0);
        for (let i = 0; i < 3; i++)
            this.mesh(group, new THREE.SphereGeometry(scale * (0.9 - i * 0.1), 10, 8), this.material([0x78995c, 0x90ae6b, 0xa1b577][i] ?? 0x78995c), (i - 1) * 0.27, 2 * scale + i * 0.47 * scale, (i % 2) * 0.25);
    }
    buildVillage() {
        for (const house of horizonHouses)
            this.house(house, false);
        this.mesh(this.author, new THREE.CylinderGeometry(0.55, 0.65, 0.65, 10), this.material(0xab9772), -4.2, 0.33, 9.4);
        this.mesh(this.author, new THREE.CylinderGeometry(0.4, 0.52, 0.08, 10), this.material(0x594d3e), -4.2, 0.68, 9.4);
        for (const [x, z, scale] of [
            [-8, 12, 1.15],
            [8, 10, 1.25],
            [8, -5, 1],
            [-8, -9, 0.9],
            [-8, -0.5, 1.2],
        ])
            this.tree(x, z, scale);
        const leaves = plantArt(false);
        for (let i = 0; i < 12; i++)
            this.card(this.author, leaves, 0.7, 0.8, i % 2 ? 8.6 : -8.6, 0.4, -11 + i * 1.8);
        // 두 출구와 부두는 같은 중심 길에서 연결되며 바다 위 자유 보행은 막는다.
        for (const [z, text] of [
            [10, '육로 ↓ / 나루 ↑'],
            [-10, '창고 → / 부두 ↑'],
        ]) {
            this.box(this.author, -1.9, 0.75, z, 0.12, 1.5, 0.12, 0x806b52);
            this.card(this.author, signArt(text), 2.55, 0.49, -1.9, 1.3, z);
        }
        for (const x of [-0.8, 0.8])
            this.box(this.author, x, 1.1, -21.4, 0.12, 2.2, 0.12, 0x766047);
        this.box(this.author, 0, 2.2, -21.4, 1.8, 0.14, 0.15, 0x766047);
        this.card(this.author, signArt('뱃길 · 바다 전망'), 2.4, 0.5, 0, 1.8, -22.4);
        // 배는 이동 경로 밖의 바다에 놓는다. 종 신호가 돛의 상태를 바꾼다.
        this.mesh(this.author, new THREE.SphereGeometry(1, 10, 6), this.material(0x775b46), 5, -0.25, -21).scale.set(1.6, 0.65, 3.1);
        this.box(this.author, 5, 0.25, -21, 2.6, 0.18, 5, 0xc1a279);
        this.box(this.author, 5, 2.4, -21, 0.16, 4.4, 0.16, 0x68543f);
        for (const raised of [false, true]) {
            const group = new THREE.Group();
            group.userData.restoration = raised ? 'after' : 'before';
            group.userData.sail = raised;
            this.author.add(group);
            this.box(group, 5, raised ? 3.2 : 4.3, -20.9, raised ? 2.6 : 2.2, raised ? 2.1 : 0.24, 0.045, raised ? 0xf1e0b3 : 0xbfb39b);
            if (raised)
                this.card(group, signArt('해풍나루'), 1.4, 0.4, 5, 3.1, -20.84);
        }
        for (let i = 0; i < 3; i++)
            this.box(this.author, 3.5 + i * 0.65, 0.28, -13, 0.5, 0.55, 0.65, 0x9c7c59);
    }
    bakeGeometry() {
        this.author.updateMatrixWorld(true);
        const sources = [];
        this.author.traverse((object) => {
            if (object instanceof THREE.Mesh)
                sources.push(object);
        });
        for (const source of sources) {
            let restoration = null, sail = false, parent = source;
            while (parent) {
                if (parent.userData.restoration === 'before' ||
                    parent.userData.restoration === 'after')
                    restoration = parent.userData.restoration;
                if (parent.userData.sail === true)
                    sail = true;
                parent = parent.parent;
            }
            source.geometry.applyMatrix4(source.matrixWorld);
            const sourcePositions = source.geometry.getAttribute('position');
            if (!source.userData.skipElevation) {
                for (let i = 0; i < sourcePositions.count; i++)
                    sourcePositions.setY(i, sourcePositions.getY(i) +
                        harborGroundHeight({
                            x: sourcePositions.getX(i),
                            z: sourcePositions.getZ(i),
                        }));
            }
            const mesh = new THREE.Mesh(source.geometry, source.material);
            mesh.castShadow = source.castShadow;
            mesh.receiveShadow = source.receiveShadow;
            mesh.frustumCulled = false;
            this.meshes.push({
                mesh,
                original: new Float32Array(source.geometry.getAttribute('position').array),
                restoration,
                sail,
            });
            this.scene.add(mesh);
            if (source.userData.walkSurface)
                this.walkingSurfaces.push(mesh);
        }
        this.scene.remove(this.author);
        this.author.clear();
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '승인된 아타호 보행 그림을 불러오지 못했어요.');
    }
    render(state, delta, options) {
        if (this.disposed)
            return;
        const { overview, curved } = options;
        this.resize();
        this.frameCount++;
        this.curved = curved;
        this.overview = overview;
        this.playerGround = { x: state.player.x, z: state.player.z };
        this.centerZ = overview
            ? -5
            : THREE.MathUtils.clamp(state.player.z - 2, -23, 9);
        if (this.centerZ !== this.previousCenter ||
            curved !== this.previousCurved ||
            state.sail !== this.previousSail) {
            for (const { mesh, original, sail } of this.meshes) {
                const position = mesh.geometry.getAttribute('position');
                for (let i = 0; i < position.count; i++) {
                    const vertex = bendHorizon({
                        x: original[i * 3] ?? 0,
                        y: sail
                            ? 4.3 + ((original[i * 3 + 1] ?? 0) - 4.3) * state.sail
                            : (original[i * 3 + 1] ?? 0),
                        z: original[i * 3 + 2] ?? 0,
                    }, this.centerZ, curved);
                    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
                }
                position.needsUpdate = true;
                mesh.geometry.computeVertexNormals();
                mesh.geometry.computeBoundingSphere();
            }
            this.previousCenter = this.centerZ;
            this.previousCurved = curved;
            this.previousSail = state.sail;
        }
        for (const { mesh, restoration } of this.meshes)
            mesh.visible =
                restoration === 'before'
                    ? !state.restored
                    : restoration === 'after'
                        ? state.restored
                        : true;
        const aspect = this.width / this.height, cx = overview
            ? 0
            : THREE.MathUtils.clamp(state.player.x * 0.48, -3.5, 3.5);
        this.camera.aspect = aspect;
        this.camera.fov = overview ? 47 : aspect < 1 ? 62 : 43;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(cx, overview ? 51 : 8, this.centerZ + (overview ? 19 : 13));
        this.camera.lookAt(cx, overview ? -5 : 0, this.centerZ - (overview ? 1 : 2));
        this.camera.updateMatrixWorld();
        const suffix = state.player.facing === 'front' ? '' : `-${state.player.facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        const foot = bendHorizon({
            ...state.player,
            y: harborSurfaceHeight(state.player) + 0.035,
        }, this.centerZ, curved);
        this.actor.mesh.position.set(foot.x, foot.y, foot.z);
        this.actor.mesh.rotation.set(0, 0, 0);
        const forward = this.camera.getWorldDirection(new THREE.Vector3());
        this.actor.mesh.scale.y = 1 / Math.hypot(forward.x, forward.z);
        const shadow = bendHorizon({
            ...state.player,
            y: harborSurfaceHeight(state.player) + 0.018,
        }, this.centerZ, curved);
        this.actor.shadow.position.set(shadow.x, shadow.y, shadow.z);
        this.actor.shadow.rotation.x =
            -Math.PI / 2 +
                (curved ? (state.player.z - this.centerZ) / horizonRadius : 0) -
                Math.atan(harborGroundSlope(state.player));
        const hearth = bendHorizon({ x: -4.2, y: harborGroundHeight({ x: -4.2, z: 9.4 }) + 0.8, z: 9.4 }, this.centerZ, curved);
        this.flame.position.set(hearth.x, hearth.y, hearth.z);
        this.flame.rotation.x = curved ? (9.4 - this.centerZ) / horizonRadius : 0;
        this.flame.visible = state.fire > 0;
        this.flame.scale.setScalar(1 + Math.sin(state.elapsed * 15) * 0.12);
        this.fireLight.position.set(hearth.x, hearth.y + 0.4, hearth.z);
        this.fireLight.intensity =
            state.fire > 0 ? 4 + Math.sin(state.elapsed * 11) : 0;
        this.smoke.children.forEach((puff, i) => {
            const phase = (state.elapsed * 0.22 + i / 4) % 1;
            const point = bendHorizon({
                x: -4.2 + phase * 0.5,
                y: harborGroundHeight({ x: -4.2, z: 9.4 }) + 1.0 + phase * 2.5,
                z: 9.4,
            }, this.centerZ, curved);
            puff.position.set(point.x, point.y, point.z);
            puff.scale.setScalar(0.6 + phase * 1.5);
            puff.visible = state.fire > 0;
            if (puff instanceof THREE.Mesh &&
                puff.material instanceof THREE.MeshBasicMaterial)
                puff.material.opacity = (1 - phase) * 0.45;
        });
        this.target.visible = !!this.marker;
        if (this.marker) {
            const point = bendHorizon({
                ...this.marker,
                y: harborSurfaceHeight(this.marker) + 0.045,
            }, this.centerZ, curved);
            this.target.position.set(point.x, point.y, point.z);
            this.target.rotation.x =
                -Math.PI / 2 +
                    (curved ? (this.marker.z - this.centerZ) / horizonRadius : 0) -
                    Math.atan(harborGroundSlope(this.marker));
        }
        const bellFoot = bendHorizon({ x: 0, y: 1.85, z: -21.4 }, this.centerZ, curved);
        this.bell.position.set(bellFoot.x, bellFoot.y, bellFoot.z);
        this.bell.rotation.x = curved ? (-21.4 - this.centerZ) / horizonRadius : 0;
        this.bell.rotation.z =
            state.bell > 0
                ? Math.sin(state.elapsed * 13) * 0.32 * Math.min(1, state.bell / 2)
                : 0;
        this.renderer.render(this.scene, this.camera);
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const ratio = Math.min(2, window.devicePixelRatio || 1), width = Math.floor(this.width * ratio), height = Math.floor(this.height * ratio);
        if (width !== this.canvas.width || height !== this.canvas.height)
            this.renderer.setSize(width, height, false);
    }
    pick(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, 1 - ((clientY - bounds.top) / bounds.height) * 2), this.camera);
        // 고저차가 있는 실제 굽힌 바닥과 부두를 먼저 맞히고 원통 각도로 역변환한다.
        const hit = this.raycaster.intersectObjects(this.walkingSurfaces, false)[0];
        return hit ? unbendHorizon(hit.point, this.centerZ, this.curved) : null;
    }
    mark(point) {
        this.marker = point ? { ...point } : null;
    }
    project(point) {
        const bent = bendHorizon({ ...point, y: harborSurfaceHeight(point) }, this.centerZ, this.curved), projected = new THREE.Vector3(bent.x, bent.y, bent.z).project(this.camera);
        return {
            x: ((projected.x + 1) * this.width) / 2,
            y: ((1 - projected.y) * this.height) / 2,
        };
    }
    get screenPositions() {
        return [
            ...horizonPlaces,
            ...harborExits,
            { id: 'entrance', ...horizonEntrance },
        ].map((point) => ({
            id: point.id,
            world: { x: point.x, z: point.z },
            screen: this.project(point),
            visible: this.surfaceVisible(point),
        }));
    }
    get diagnostics() {
        const bounds = this.canvas.getBoundingClientRect();
        const playerFootProjection = this.project(this.playerGround);
        const sourceFrame = this.actor.animation.currentFrame.frame;
        return {
            frameCount: this.frameCount,
            radius: horizonRadius,
            curved: this.curved,
            overview: this.overview,
            centerZ: this.centerZ,
            camera: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z,
            },
            actorFoot: {
                x: this.actor.mesh.position.x,
                y: this.actor.mesh.position.y,
                z: this.actor.mesh.position.z,
            },
            actorPitch: this.actor.mesh.rotation.x,
            actorWidth: this.actor.mesh.geometry.parameters.width,
            actorHeight: this.actor.mesh.geometry.parameters.height,
            meshCount: this.meshes.length,
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            harborScreen: this.project(horizonPlaces[4]),
            harborVisible: this.surfaceVisible(horizonPlaces[4]),
            elevation: harborGroundHeight(this.playerGround),
            playerGround: { ...this.playerGround },
            playerBentGround: bendHorizon({
                ...this.playerGround,
                y: harborSurfaceHeight(this.playerGround),
            }, this.centerZ, this.curved),
            playerFootProjection,
            playerProjectionInverse: this.pick(bounds.left + playerFootProjection.x, bounds.top + playerFootProjection.y),
            sourceFrame: {
                width: sourceFrame.width,
                height: sourceFrame.height,
                pivot: { ...sourceFrame.pivot },
                localPath: sourceFrame.localPath,
            },
            actorScaleY: this.actor.mesh.scale.y,
        };
    }
    surfaceVisible(point) {
        if (!this.curved)
            return true;
        const angle = (point.z - this.centerZ) / horizonRadius;
        const surface = bendHorizon({ ...point, y: harborSurfaceHeight(point) }, this.centerZ, true);
        return (Math.cos(angle) * (this.camera.position.y - surface.y) +
            Math.sin(angle) * (this.camera.position.z - surface.z) >
            0);
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
