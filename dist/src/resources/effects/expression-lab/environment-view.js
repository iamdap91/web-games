import * as THREE from 'three';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { TrailSprite } from '../../../games/tiger-rpg/trail-sprite.js';
import { EnvironmentResources } from '../../environment/environment-resources.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { mapStyles, recolorMapMaterial, } from '../../../rendering/map-art-direction.js';
import { EnvironmentPreview, environmentLayout, rampHeight, } from './environment-preview.js';
const screenUp = environmentLayout.screenUp;
const off = {
    secondary: false,
    lighting: false,
    height: false,
    reducedMotion: false,
};
const hearth = { x: -3.25, z: -1.4 };
function actorMotions() {
    const asset = manifest.assets.find((entry) => entry.id === 'ai/tiger-hero');
    if (!asset)
        throw new Error('아타호 원본 리소스 정보가 없습니다.');
    return new Map(Object.entries(asset.animations).filter(([key]) => [
        'stand',
        'stand-right',
        'stand-left',
        'stand-back',
        'move',
        'move-right',
        'move-left',
        'move-back',
    ].includes(key)));
}
function motionFor(snapshot) {
    const { x, z } = snapshot.direction;
    const facing = Math.abs(x) > Math.abs(z)
        ? x < 0
            ? '-left'
            : '-right'
        : z < 0
            ? '-back'
            : '';
    return `${snapshot.moving ? 'move' : 'stand'}${facing}`;
}
/** 같은 배치의 두 공간이 각자 표시 자원만 소유하고 이동 규칙은 Preview에 맡긴다. */
class EnvironmentView {
    host;
    enhanced;
    preview = new EnvironmentPreview();
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-7.1, 7.1, 4.5, -4.5, 0.1, 90);
    renderer;
    canvas = document.createElement('canvas');
    resources = new EnvironmentResources({
        recolor: (kind, original) => recolorMapMaterial(mapStyles.village, kind, original),
    });
    sprites = new MapSpriteResources();
    textures = new SpriteTextures();
    actor = new TrailSprite(actorMotions(), this.textures, environmentLayout.actor.pixelsPerUnit, 0.3);
    bridge = new THREE.Group();
    flatCrossing = new THREE.Group();
    leaf = new THREE.Group();
    cloth = new THREE.Group();
    flame = new THREE.Group();
    light = new THREE.PointLight(0xffbd62, 11, 5.2, 2);
    glow = new THREE.Group();
    fireflies = new THREE.Group();
    mist = new THREE.Group();
    discovery = new THREE.Group();
    guide = new THREE.Group();
    ripple;
    resizeObserver;
    guideMaterials = [];
    generatedTextures = new Set();
    width = 0;
    height = 0;
    dpr = 0;
    disposed = false;
    contextLost = false;
    constructor(host, enhanced) {
        this.host = host;
        this.enhanced = enhanced;
        this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
        this.canvas.setAttribute('aria-label', enhanced ? '추가 표현 숲길 비교 장면' : '기본 표현 숲길 비교 장면');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.camera.position.set(0, 17.3, 16 * Math.sqrt(3));
        this.camera.lookAt(0, 1.3, 0);
        this.camera.layers.enableAll();
        this.scene.background = new THREE.Color(0xc8d0bd);
        const sky = new THREE.HemisphereLight(0xdce2df, 0x667269, 1.85);
        const sun = new THREE.DirectionalLight(0xf5ead9, 2.25);
        sun.position.set(-6, 14, 7);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, {
            left: -9,
            right: 9,
            top: 8,
            bottom: -8,
            near: 1,
            far: 40,
        });
        sun.shadow.normalBias = 0.045;
        sky.layers.enableAll();
        sun.layers.enableAll();
        this.light.position.set(hearth.x, 0.6, hearth.z);
        this.light.layers.enableAll();
        this.light.castShadow = true;
        this.light.shadow.mapSize.set(256, 256);
        this.light.shadow.normalBias = 0.025;
        this.scene.add(sky, sun, this.light, this.sprites.root, this.actor.mesh, this.actor.shadow);
        this.scene.add(this.bridge, this.flatCrossing, this.leaf, this.cloth, this.flame, this.glow, this.fireflies, this.mist, this.discovery, this.guide);
        this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 28), new THREE.MeshBasicMaterial({
            color: 0xe6c376,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        this.ripple.rotation.x = -Math.PI / 2;
        this.scene.add(this.ripple);
        this.buildGround();
        this.buildBridge();
        this.buildHearth();
        this.buildScenery();
        this.buildGuides();
        this.host.append(this.canvas);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.canvas.addEventListener('webglcontextlost', this.onContextLost);
        this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
        this.resize();
    }
    async load() {
        await Promise.all([
            this.sprites.load(),
            this.textures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '아타호 비교용 대기·보행 이미지가 없습니다.'),
        ]);
        if (!this.disposed)
            this.actor.update(environmentLayout.start, 'stand-right', 0);
    }
    draw(frame) {
        if (this.disposed || this.contextLost)
            return;
        const options = this.enhanced ? frame.settings : off;
        this.preview.update(frame.delta, options);
        const state = this.preview.snapshot;
        this.resize();
        this.bridge.visible = state.options.height;
        this.flatCrossing.visible = !state.options.height;
        this.actor.update(state.position, motionFor(state), frame.delta);
        this.actor.mesh.scale.y = 1 / screenUp;
        this.actor.mesh.position.y = state.position.y + 0.035;
        this.actor.mesh.castShadow = true;
        this.actor.shadow.position.y = state.position.y + 0.018;
        this.actor.mesh.material.color.set(0xffffff);
        this.sprites.face(this.camera);
        this.leaf.rotation.z = state.leafAngle;
        this.cloth.rotation.z = -state.clothAngle;
        this.updateEffects(state);
        this.guide.visible = frame.settings.guides;
        this.updateGuides(state.options.height);
        this.updateDataset(state);
        this.renderer.render(this.scene, this.camera);
    }
    resetActor() {
        this.actor.update(environmentLayout.start, 'stand-right', 0);
        this.actor.animation.play('stand-right');
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.preview.dispose();
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
        this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
        this.actor.mesh.removeFromParent();
        this.actor.shadow.removeFromParent();
        this.actor.dispose();
        this.sprites.dispose();
        this.textures.dispose();
        const geometries = new Set();
        const materials = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                if (!this.resources.ownsGeometry(object.geometry))
                    geometries.add(object.geometry);
                for (const material of Array.isArray(object.material)
                    ? object.material
                    : [object.material]) {
                    if (!this.resources.ownsMaterial(material))
                        materials.add(material);
                }
            }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.generatedTextures.forEach((texture) => texture.dispose());
        this.resources.dispose();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight ||
                object instanceof THREE.PointLight)
                object.shadow.map?.dispose();
        });
        this.scene.clear();
        this.renderer.dispose();
        this.canvas.remove();
    }
    buildGround() {
        this.box(this.scene, { x: 0, y: -0.22, z: 0, width: 13.7, height: 0.44, depth: 7.7 }, 'earth', 0x8b8066);
        this.box(this.scene, { x: 0, y: -0.035, z: 0, width: 13.7, height: 0.07, depth: 7.7 }, 'grass', 0x98a775);
        // 길과 물줄기는 큰 색 면으로 두고 작은 소품은 가장자리에서만 밀도를 높인다.
        this.box(this.scene, { x: 0, y: 0.009, z: 0, width: 10.5, height: 0.025, depth: 1.45 }, 'path', 0xc7b48c);
        this.box(this.scene, { x: 0, y: 0.021, z: 1.9, width: 10.2, height: 0.016, depth: 0.55 }, 'path', 0xc7b48c);
        this.box(this.scene, { x: 0, y: 0.023, z: -1.65, width: 9.8, height: 0.02, depth: 0.55 }, 'path', 0xc7b48c);
        this.box(this.scene, { x: 0, y: 0.028, z: 0, width: 1.05, height: 0.025, depth: 6.1 }, 'stone', 0x7e9c98);
        for (let i = 0; i < 10; i += 1) {
            this.box(this.scene, {
                x: i % 2 ? 0.44 : -0.42,
                y: 0.051,
                z: -2.5 + i * 0.55,
                width: 0.18,
                height: 0.035,
                depth: 0.31,
            }, 'stone', 0xa4ada4);
        }
        for (let i = 0; i < 9; i += 1) {
            this.box(this.flatCrossing, {
                x: -1.65 + i * 0.41,
                y: 0.08,
                z: 0,
                width: 0.37,
                height: 0.1,
                depth: 1.14,
            }, 'wood', 0xab8358);
        }
    }
    buildBridge() {
        const bridge = environmentLayout.bridge;
        const depth = bridge.halfDepth * 2;
        const thickness = bridge.top - bridge.bottom;
        for (let i = 0; i < 13; i += 1) {
            this.box(this.bridge, {
                x: bridge.minX + 0.14 + i * 0.277,
                y: bridge.top - thickness / 2,
                z: 0,
                width: 0.256,
                height: thickness,
                depth,
            }, 'wood', i % 3 ? 0xab8358 : 0xba9566);
        }
        for (const side of [-1, 1]) {
            const run = environmentLayout.rampOuterX - bridge.maxX;
            const angle = Math.atan2(bridge.top, run) * -side;
            for (let i = 0; i < 9; i += 1) {
                const x = side * (bridge.maxX + ((i + 0.5) * run) / 9);
                const board = this.box(this.bridge, {
                    x,
                    y: (rampHeight({ x, z: 0 }) ?? 0) - 0.06,
                    z: 0,
                    width: Math.hypot(run, bridge.top) / 9 - 0.013,
                    height: 0.12,
                    depth,
                }, 'wood', 0xab8358);
                board.rotation.z = angle;
            }
            for (const z of [-0.53, 0.53]) {
                const height = bridge.top + 0.7;
                this.box(this.bridge, {
                    x: side * 1.65,
                    y: height / 2,
                    z,
                    width: 0.11,
                    height,
                    depth: 0.11,
                }, 'wood', 0x79573e);
            }
        }
        // 낮은 난간으로 위를 걷는 발과 아래를 지나는 머리가 함께 읽히게 한다.
        for (const z of [-0.54, 0.54]) {
            this.box(this.bridge, {
                x: 0,
                y: bridge.top + 0.53,
                z,
                width: 3.65,
                height: 0.065,
                depth: 0.08,
            }, 'wood', 0x79573e);
        }
    }
    buildScenery() {
        for (const [x, z, size] of [
            [-5.7, -2.9, 1.15],
            [-4.2, -3.2, 0.91],
            [4.6, -3.2, 1.08],
            [6.2, -2.4, 0.95],
            [-6.2, 2.7, 0.7],
            [6.0, 2.8, 0.75],
        ]) {
            const tree = this.resources.createTree(size);
            tree.position.set(x, 0, z);
            this.scene.add(tree);
        }
        for (const [x, z, radius] of [
            [2.0, 2.9, 0.5],
            [-4.8, 2.8, 0.31],
            [4.8, -2.6, 0.43],
            [0.95, -2.3, 0.29],
        ]) {
            const rock = this.resources.createRock({ radius });
            rock.position.x = x;
            rock.position.z = z;
            this.scene.add(rock);
        }
        this.leaf.position.set(-2.6, 0.055, 1.9);
        this.sprites.add('fern', { x: 0, z: 0, width: 1.25, parent: this.leaf });
        this.sprites.add('fern', { x: 4.9, z: 2.65, width: 1.05 });
        this.sprites.add('grass', { x: -5.2, z: 2.8, width: 1.1 });
        this.sprites.add('dry-leaves', {
            x: 2.3,
            z: -2.6,
            width: 0.7,
            kind: 'ground',
        });
        this.sprites.add('mushrooms', { x: 0.32, z: -2.1, width: 0.87 });
        this.sprites.add('herb', { x: -1.2, z: -2.3, width: 0.65 });
        this.cloth.position.set(3.15, 1.5, 1.8);
        this.box(this.scene, { x: 3.15, y: 0.8, z: 1.83, width: 0.09, height: 1.6, depth: 0.09 }, 'wood', 0x79573e);
        this.box(this.scene, { x: 3.35, y: 1.56, z: 1.83, width: 0.7, height: 0.08, depth: 0.09 }, 'wood', 0x79573e);
        const banner = this.box(this.cloth, { x: 0.23, y: -0.38, z: 0, width: 0.56, height: 0.72, depth: 0.035 }, 'wood', 0xab7957);
        const patch = this.box(this.cloth, { x: 0.23, y: -0.31, z: 0.025, width: 0.22, height: 0.27, depth: 0.012 }, 'wood', 0xd0c3a0);
        banner.castShadow = patch.castShadow = false;
        for (let i = 0; i < 7; i += 1) {
            const point = new THREE.Mesh(new THREE.SphereGeometry(i % 3 ? 0.035 : 0.045, 4, 3), new THREE.MeshBasicMaterial({
                color: i % 2 ? 0xe5d590 : 0xf2dc98,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
            }));
            this.fireflies.add(point);
        }
        const fogMask = this.createMistMask();
        for (let i = 0; i < 3; i += 1) {
            const fog = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.38), new THREE.MeshBasicMaterial({
                color: 0xd4dccb,
                map: fogMask,
                transparent: true,
                opacity: 0.065,
                depthWrite: false,
                side: THREE.DoubleSide,
            }));
            fog.position.set(-1 + i * 1.6, 0.35 + i * 0.13, -2.0 - i * 0.13);
            this.mist.add(fog);
        }
        const marker = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.16, 4), new THREE.MeshBasicMaterial({
            color: 0xe4c979,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        marker.position.set(0.32, 1.0, -2.1);
        marker.rotation.z = Math.PI / 4;
        this.discovery.add(marker);
    }
    buildHearth() {
        for (let i = 0; i < 8; i += 1) {
            const angle = (i * Math.PI) / 4;
            this.box(this.scene, {
                x: hearth.x + Math.cos(angle) * 0.31,
                y: 0.12,
                z: hearth.z + Math.sin(angle) * 0.31,
                width: 0.23,
                height: 0.22,
                depth: 0.22,
            }, 'stone', 0xaaa389);
        }
        for (const rotation of [-0.65, 0.65]) {
            const log = this.box(this.scene, {
                x: hearth.x,
                y: 0.09,
                z: hearth.z,
                width: 0.56,
                height: 0.15,
                depth: 0.13,
            }, 'wood', 0x79573e);
            log.rotation.y = rotation;
        }
        const coal = new THREE.Mesh(new THREE.CircleGeometry(0.23, 8), new THREE.MeshBasicMaterial({ color: 0xaf6943 }));
        coal.rotation.x = -Math.PI / 2;
        coal.position.set(hearth.x, 0.14, hearth.z);
        this.scene.add(coal);
        for (const [x, z, height, color] of [
            [-0.1, 0, 0.43, 0xf4ae5e],
            [0.08, 0.04, 0.32, 0xe78a48],
            [0, 0.08, 0.28, 0xffd982],
        ]) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, height, 4), new THREE.MeshBasicMaterial({ color }));
            flame.position.set(hearth.x + x, 0.19 + height / 2, hearth.z + z);
            this.flame.add(flame);
        }
        for (const [radius, opacity] of [
            [1.1, 0.075],
            [0.75, 0.09],
            [0.44, 0.12],
        ]) {
            const halo = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({
                color: 0xffbc65,
                transparent: true,
                opacity,
                depthWrite: false,
            }));
            halo.rotation.x = -Math.PI / 2;
            halo.position.set(hearth.x, 0.04 + (1.1 - radius) * 0.005, hearth.z);
            this.glow.add(halo);
        }
    }
    createMistMask() {
        const width = 64;
        const height = 16;
        const pixels = new Uint8Array(width * height * 4);
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const offset = (y * width + x) * 4;
                pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
                pixels[offset + 3] = Math.round(255 *
                    Math.sin((x / (width - 1)) * Math.PI) *
                    Math.sin((y / (height - 1)) * Math.PI) ** 2);
            }
        }
        const texture = new THREE.DataTexture(pixels, width, height);
        texture.magFilter = texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        this.generatedTextures.add(texture);
        return texture;
    }
    buildGuides() {
        for (const color of [0x876948, 0x4f7b6a]) {
            const material = new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
            });
            this.guideMaterials.push(material);
            this.guide.add(new THREE.Line(new THREE.BufferGeometry(), material));
        }
    }
    updateGuides(height) {
        if (!this.guide.visible)
            return;
        const upper = [-5.2, -4, -1.8, 0, 1.8, 4, 5.2].map((x) => new THREE.Vector3(x, height
            ? (Math.abs(x) <= 1.8
                ? environmentLayout.bridge.top
                : (rampHeight({ x, z: 0 }) ?? 0)) + 0.035
            : 0.12, Math.abs(x) > 4 ? 1.5 : 0));
        const lower = [
            new THREE.Vector3(-5.2, 0.055, 1.5),
            new THREE.Vector3(-4.4, 0.055, 1.9),
            new THREE.Vector3(0, 0.055, 1.9),
            new THREE.Vector3(0, 0.055, -1.65),
            new THREE.Vector3(4.4, 0.055, -1.65),
            new THREE.Vector3(5.2, 0.055, 1.5),
        ];
        for (const [index, points] of [upper, lower].entries()) {
            const line = this.guide.children[index];
            if (line instanceof THREE.Line)
                line.geometry.setFromPoints(points);
        }
    }
    updateEffects(state) {
        const light = state.options.lighting;
        const time = state.options.reducedMotion ? 0 : state.time;
        this.light.visible =
            this.flame.visible =
                this.glow.visible =
                    this.mist.visible =
                        light;
        this.light.intensity =
            8.3 +
                (state.options.reducedMotion
                    ? 0
                    : Math.sin(time * 8) * 0.7 + Math.sin(time * 13) * 0.4);
        this.flame.children.forEach((flame, index) => {
            flame.scale.y = 0.9 + Math.sin(time * 7 + index * 2) * 0.13;
        });
        const discovered = state.discovered && state.options.height;
        this.discovery.visible = discovered;
        this.discovery.children[0].position.y =
            1 + (state.options.reducedMotion ? 0 : Math.sin(time * 2.4) * 0.07);
        this.fireflies.visible = light || discovered;
        this.fireflies.children.forEach((point, index) => {
            const spread = discovered
                ? 1.1 + Math.min(1, state.discoveryAge) * 0.7
                : 0.7;
            point.position.set(0.3 + Math.sin(index * 2.1 + time * 0.46) * spread, 0.45 + (index % 3) * 0.2 + Math.cos(index + time) * 0.07, -2 + Math.cos(index * 1.3 + time * 0.38) * 0.48);
            if (point instanceof THREE.Mesh &&
                point.material instanceof THREE.MeshBasicMaterial)
                point.material.opacity = state.options.reducedMotion
                    ? 0.75
                    : 0.5 + Math.sin(time * 1.8 + index) * 0.35;
        });
        this.mist.children.forEach((mist, index) => {
            mist.position.x = -1 + index * 1.6 + Math.sin(time * 0.18 + index) * 0.28;
        });
        const pulse = state.options.secondary &&
            state.pulseAge < 0.6 &&
            !state.options.reducedMotion;
        this.ripple.visible = pulse;
        this.ripple.position.set(state.position.x, 0.065, state.position.z);
        this.ripple.scale.setScalar(0.4 + state.pulseAge * 3.2);
        this.ripple.material.opacity = Math.max(0, 0.28 - state.pulseAge * 0.47);
        if (light) {
            const distance = Math.hypot(state.position.x - hearth.x, state.position.z - hearth.z);
            this.actor.mesh.material.color.lerp(new THREE.Color(0xffe0b2), Math.max(0, 1 - distance / 3) * 0.22);
        }
    }
    updateDataset(state) {
        Object.assign(this.host.dataset, {
            x: state.position.x.toFixed(3),
            y: state.position.y.toFixed(3),
            z: state.position.z.toFixed(3),
            route: state.route,
            routeFinished: String(state.routeFinished),
            discovered: String(state.discovered),
            secondary: String(state.options.secondary),
            lighting: String(state.options.lighting),
            height: String(state.options.height),
            time: state.time.toFixed(4),
            leafAngle: state.leafAngle.toFixed(4),
            clothAngle: state.clothAngle.toFixed(4),
            pulseAge: state.pulseAge.toFixed(4),
        });
    }
    resize() {
        if (this.disposed)
            return;
        const width = Math.max(1, Math.floor(this.host.clientWidth));
        const height = Math.max(1, Math.floor(this.host.clientHeight));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (width === this.width && height === this.height && dpr === this.dpr)
            return;
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
        const aspect = width / height;
        const halfWidth = Math.max(7.1, 4.15 * aspect);
        const halfHeight = halfWidth / aspect;
        Object.assign(this.camera, {
            left: -halfWidth,
            right: halfWidth,
            top: halfHeight,
            bottom: -halfHeight,
        });
        this.camera.updateProjectionMatrix();
    }
    box(parent, position, kind, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(position.width, position.height, position.depth), this.resources.material(kind, color));
        mesh.position.set(position.x, position.y, position.z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    onContextLost = (event) => {
        event.preventDefault();
        this.contextLost = true;
        this.host.dataset.error =
            '그래픽 연결이 끊겼어요. 복구를 기다리는 중입니다.';
    };
    onContextRestored = () => {
        this.contextLost = false;
        delete this.host.dataset.error;
    };
}
export class EnvironmentComparison {
    baseline;
    enhanced;
    constructor(baseline, enhanced) {
        this.baseline = baseline;
        this.enhanced = enhanced;
    }
    draw(frame) {
        this.baseline.draw(frame);
        this.enhanced.draw(frame);
    }
    setMovement(direction) {
        this.baseline.preview.setMovement(direction);
        this.enhanced.preview.setMovement(direction);
    }
    followRoute(route) {
        this.baseline.preview.followRoute(route);
        this.enhanced.preview.followRoute(route);
        this.baseline.resetActor();
        this.enhanced.resetActor();
    }
    pulse() {
        this.baseline.preview.pulse();
        this.enhanced.preview.pulse();
    }
    reset() {
        this.baseline.preview.reset();
        this.enhanced.preview.reset();
        this.baseline.resetActor();
        this.enhanced.resetActor();
    }
    dispose() {
        this.baseline.dispose();
        this.enhanced.dispose();
    }
}
export async function createEnvironmentComparison(hosts) {
    const baseline = new EnvironmentView(hosts.baseline, false);
    let enhanced;
    try {
        enhanced = new EnvironmentView(hosts.enhanced, true);
    }
    catch (error) {
        baseline.dispose();
        throw error;
    }
    const comparison = new EnvironmentComparison(baseline, enhanced);
    const results = await Promise.allSettled([baseline.load(), enhanced.load()]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') {
        comparison.dispose();
        throw failure.reason;
    }
    return comparison;
}
