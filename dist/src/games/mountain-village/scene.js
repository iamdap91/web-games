import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HouseReveal } from './house-reveal.js';
import { createPixelMaterial, villageColors as colors } from './pixel-style.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { AnimationPlayer } from '../../resources/preview/animation-player.js';
import { groundHeight, actorSize, bridgeRails, stairWalls, houses, trees, village, } from './world.js';
// 픽셀화할 배경과 원본 해상도로 표시할 스프라이트를 렌더 레이어로 구분한다.
const renderLayers = { pixelated: 0, sharp: 1 };
export class VillageScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 130);
    renderer;
    composer;
    pixelPass;
    outputPass = new OutputPass();
    occlusionMaterial = new THREE.MeshDepthMaterial({
        colorWrite: false,
    });
    pixelSize = 2;
    renderWidth = 1;
    renderHeight = 1;
    boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    materials = new Map();
    textures = new Map();
    actorMaterial = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    actor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.actorMaterial);
    revealHouse = new THREE.Group();
    houseReveal = new HouseReveal(this.revealHouse, this.actor, this.camera);
    shadow;
    ripples = [];
    focus = new THREE.Vector3();
    animations;
    framePaths;
    spritePose = 'upright';
    motion = 'stand';
    frame = null;
    disposed = false;
    elapsed = 0;
    width = 1;
    height = 1;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.info.autoReset = false;
        this.composer = new EffectComposer(this.renderer);
        this.pixelPass = new RenderPixelatedPass(this.pixelSize, this.scene, this.camera);
        // 법선 패스는 투명 PNG를 사각 면으로 보므로 깊이 윤곽만 사용한다.
        this.pixelPass.normalEdgeStrength = 0;
        this.pixelPass.depthEdgeStrength = 0.24;
        this.composer.addPass(this.pixelPass);
        this.composer.addPass(this.outputPass);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        // 지형과 광원은 고정되어 있어 그림자 지도를 매 프레임 다시 만들 필요가 없다.
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.background = new THREE.Color(0xd2d9bf);
        this.scene.fog = new THREE.Fog(0xd2d9bf, 39, 80);
        this.scene.add(new THREE.HemisphereLight(0xeff3e4, 0x778369, 1.8));
        const sunlight = new THREE.DirectionalLight(0xfff0d3, 1.8);
        sunlight.position.set(-14, 25, 10);
        sunlight.castShadow = true;
        sunlight.shadow.mapSize.set(2048, 2048);
        Object.assign(sunlight.shadow.camera, {
            left: -24,
            right: 24,
            top: 24,
            bottom: -24,
            near: 1,
            far: 65,
        });
        sunlight.shadow.normalBias = 0.025;
        sunlight.shadow.bias = -0.0002;
        this.scene.add(sunlight);
        this.buildLandscape();
        this.buildVillage();
        // 캐릭터의 접지감을 유지하도록 그림자를 지면의 타원으로 따로 그린다.
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), new THREE.MeshBasicMaterial({
            color: 0x3e4634,
            opacity: 0.25,
            transparent: true,
            depthWrite: false,
        }));
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.64;
        this.actor.layers.set(renderLayers.sharp);
        this.scene.add(this.shadow, this.actor);
        const ataho = manifest.assets.find((asset) => asset.id === 'hwanse/ataho');
        if (!ataho)
            throw new Error('아타호 모션 정보가 없습니다.');
        const motions = new Map();
        for (const [name, animation] of Object.entries(ataho.animations)) {
            if (name.startsWith('stand') || name.startsWith('move'))
                motions.set(name, animation);
        }
        this.animations = new AnimationPlayer(motions, 'stand');
        this.framePaths = [
            ...new Set([...motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))),
        ];
        this.resetCamera();
    }
    async load() {
        const loader = new THREE.TextureLoader();
        const results = await Promise.allSettled(this.framePaths.map(async (path) => {
            const texture = await loader.loadAsync(`/${path}`);
            if (this.disposed) {
                texture.dispose();
                return;
            }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            this.textures.set(path, texture);
        }));
        if (results.some((result) => result.status === 'rejected'))
            throw new Error('아타호 이미지가 없습니다. 로컬 walk-0~19.png 리소스를 확인해 주세요.');
    }
    material(color) {
        let material = this.materials.get(color);
        if (!material) {
            material = createPixelMaterial(color);
            this.materials.set(color, material);
        }
        return material;
    }
    box(x, y, z, width, height, depth, color) {
        const mesh = new THREE.Mesh(this.boxGeometry, this.material(color));
        mesh.position.set(x, y + height / 2, z);
        mesh.scale.set(width, height, depth);
        mesh.castShadow = height > 0.15;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }
    buildLandscape() {
        const banks = [
            { left: -village.width / 2, right: village.river.left },
            { left: village.river.right, right: village.width / 2 },
        ];
        for (const bank of banks) {
            const x = (bank.left + bank.right) / 2;
            const width = bank.right - bank.left;
            this.box(x, -1.3, 0, width, 1.22, village.depth, colors.earth);
            this.box(x, -0.08, 0, width, 0.08, village.depth, colors.grass);
        }
        const riverCenter = (village.river.left + village.river.right) / 2;
        const riverWidth = village.river.right - village.river.left;
        this.box(riverCenter, -1.3, 0, riverWidth, 0.9, village.depth, 0x657f76);
        const water = this.box(riverCenter, -0.27, 0, riverWidth, 0.07, village.depth, 0x7cb1af);
        water.castShadow = false;
        const terrace = village.terrace;
        this.box(terrace.x, 0, terrace.z, terrace.width, terrace.height - 0.12, terrace.depth, colors.earth);
        this.box(terrace.x, terrace.height - 0.12, terrace.z, terrace.width, 0.12, terrace.depth, 0xabb381);
        // 보행면은 연속 경사로 계산하고 계단은 작은 단으로 그려 발의 떨림을 줄인다.
        const stairs = village.stairs;
        const tread = stairs.depth / stairs.count;
        const stairsBottom = stairs.z + stairs.depth / 2;
        for (let i = 0; i < stairs.count; i++) {
            this.box(stairs.x, 0, stairsBottom - (i + 0.5) * tread, stairs.width, ((i + 0.5) * terrace.height) / stairs.count, tread, colors.stone);
        }
        for (const wall of stairWalls) {
            for (let i = 0; i < stairs.count; i++)
                this.box(wall.x, (i * terrace.height) / stairs.count, wall.z + wall.depth / 2 - (i + 0.5) * tread, wall.width, 0.48, tread, 0x8a8b70);
        }
        this.box(-3.5, 0.006, 3, 11, 0.025, 2.25, colors.path);
        this.box(-2.5, 0.008, 0.1, 2.25, 0.025, 4, colors.path);
        this.box(-6.5, 0.006, 5.2, 2, 0.025, 5.7, colors.path);
        this.box(8, 0.006, 3, 4, 0.025, 2.25, colors.path);
        this.box(9, 0.007, -0.5, 2.1, 0.025, 6.8, colors.path);
        this.box(-4.5, terrace.height + 0.006, -6.5, 6, 0.025, 2, colors.path);
        for (let i = 0; i < 26; i++) {
            const ripple = this.box(2.3 + (i % 5) * 0.51, -0.188, -11.7 + i * 0.9, 0.18 + (i % 3) * 0.15, 0.003, 0.035, 0xc3ded0);
            ripple.castShadow = false;
            this.ripples.push(ripple);
        }
        for (let i = 0; i < 16; i++) {
            for (const x of [1.87, 5.13]) {
                const z = -11 + i * 1.45;
                if (z > 1 && z < 5)
                    continue;
                this.box(x, -0.12, z, 0.26, 0.22, 0.7, 0xb1af8b);
            }
        }
    }
    buildVillage() {
        for (const house of houses)
            this.buildHouse(house, house === houses[0] ? this.revealHouse : new THREE.Group());
        for (const tree of trees) {
            const y = groundHeight(tree) ?? 0;
            this.box(tree.x, y, tree.z, 0.28 * tree.size, 1.2 * tree.size, 0.28 * tree.size, colors.wood);
            for (let i = 0; i < 3; i++) {
                const crown = new THREE.Mesh(new THREE.ConeGeometry((1.2 - i * 0.22) * tree.size, 1.8 * tree.size, 7), this.material([0x607955, 0x738953, 0x88975f][i]));
                crown.position.set(tree.x, y + (1.75 + i * 0.55) * tree.size, tree.z);
                crown.castShadow = true;
                crown.receiveShadow = true;
                this.scene.add(crown);
            }
        }
        const bridge = village.bridge;
        for (let i = 0; i < 20; i++) {
            const x = bridge.x - bridge.width / 2 + ((i + 0.5) * bridge.width) / 20;
            const height = groundHeight({ x, z: bridge.z });
            this.box(x, height - 0.1, bridge.z, bridge.width / 20 - 0.02, 0.1, bridge.depth, i % 3 ? 0xab8358 : 0xba9566);
        }
        for (const rail of bridgeRails) {
            const z = rail.z;
            for (const x of [1.2, 2.5, 4.5, 5.8])
                this.box(x, 0, z, 0.13, 0.95, 0.13, colors.wood);
            this.box(rail.x, 0.78, z, rail.width, 0.12, rail.depth, colors.wood);
            this.box(rail.x, 0.43, z, rail.width, 0.08, 0.08, colors.wood);
        }
        // 언덕의 벤치는 이동 공간을 가리지 않도록 가장자리에 놓는다.
        const bench = village.bench;
        this.box(bench.x, village.terrace.height, bench.z, bench.width, 0.45, bench.depth, colors.wood);
        this.box(bench.x, village.terrace.height + 0.4, bench.z - bench.depth / 2, bench.width, 0.65, 0.1, colors.wood);
        for (let i = 0; i < 8; i++) {
            this.box(-11.5 + i * 1.5, 2.4, -11.7, 0.12, 0.8, 0.12, colors.wood);
        }
        this.box(-6.3, 2.95, -11.7, 10.6, 0.1, 0.1, colors.wood);
        // 리소스 없이도 길과 잔디가 구분되도록 주변에 작은 풀·돌 무리를 둔다.
        for (let i = 0; i < 46; i++) {
            const x = -13 + ((i * 7.73) % 26);
            const z = -11 + ((i * 5.17) % 22);
            const y = groundHeight({ x, z });
            if (y === null ||
                Math.abs(z - 3) < 1.5 ||
                Math.abs(x + 2.5) < 2 ||
                Math.abs(x - 9) < 1.5)
                continue;
            if (houses.some((h) => Math.abs(x - h.x) < h.width / 2 + 0.5 &&
                Math.abs(z - h.z) < h.depth / 2 + 0.5))
                continue;
            this.box(x, y, z, 0.08, 0.22, 0.09, 0x71864c);
            this.box(x + 0.12, y, z + 0.04, 0.07, 0.14, 0.08, 0x7e9055);
            if (i % 4 === 0)
                this.box(x + 0.04, y + 0.17, z, 0.1, 0.08, 0.1, 0xe6c77c);
        }
    }
    buildHouse(house, group) {
        this.scene.add(group);
        const box = (...args) => {
            const mesh = this.box(...args);
            group.add(mesh);
            return mesh;
        };
        const { x, z, width, depth, height, roof } = house;
        box(x, 0, z, width, height, depth, 0xe2ceaa);
        box(x, 0, z, width + 0.16, 0.24, depth + 0.16, colors.stone);
        for (const dx of [-width / 2 + 0.08, width / 2 - 0.08]) {
            for (const dz of [-depth / 2 + 0.05, depth / 2 - 0.05])
                box(x + dx, 0.2, z + dz, 0.14, height, 0.14, colors.wood);
        }
        box(x, height - 0.25, z, width + 0.08, 0.16, depth + 0.08, colors.wood);
        box(x + 0.35, 0.23, z + depth / 2 + 0.025, 0.8, 1.5, 0.07, colors.wood);
        box(x - 1, 1.05, z + depth / 2 + 0.04, 0.65, 0.7, 0.07, 0x656b54);
        for (const offset of [-0.21, 0, 0.21])
            box(x - 1 + offset, 1.04, z + depth / 2 + 0.085, 0.055, 0.72, 0.035, colors.wood);
        box(x + 0.35, 0.03, z + depth / 2 + 0.26, 1.1, 0.1, 0.5, colors.stone);
        const w = width / 2 + 0.45;
        const d = depth / 2 + 0.4;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, d, w, 0, d, 0, 1.25, d, -w, 0, -d, w, 0, -d, 0, 1.25, -d], 3));
        geometry.setIndex([
            0, 1, 2, 5, 4, 3, 0, 2, 5, 0, 5, 3, 2, 1, 4, 2, 4, 5, 3, 4, 1, 3, 1, 0,
        ]);
        geometry.computeVertexNormals();
        const roofMesh = new THREE.Mesh(geometry, this.material(roof));
        roofMesh.position.set(x, height, z);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        group.add(roofMesh);
        box(x, height + 1.23, z, 0.14, 0.12, depth + 1, roof);
    }
    setSpritePose(pose) {
        this.spritePose = pose;
        this.houseReveal.reset();
    }
    resetCamera() {
        this.houseReveal.reset();
        this.focus.set(village.spawn.x * 0.4, 0.4, village.spawn.z * 0.3 - 1.5);
    }
    render(player, dt) {
        if (this.disposed)
            return;
        this.resize();
        this.elapsed += dt;
        const suffix = player.facing === 'front' ? '' : `-${player.facing}`;
        const motion = `${player.moving ? 'move' : 'stand'}${suffix}`;
        if (motion !== this.motion) {
            this.animations.play(motion);
            this.motion = motion;
        }
        this.animations.update(dt);
        const frame = this.animations.currentFrame.frame;
        if (this.frame !== frame) {
            this.actorMaterial.map = this.textures.get(frame.localPath) ?? null;
            this.actorMaterial.needsUpdate = true;
            this.actor.geometry.dispose();
            this.actor.geometry = new THREE.PlaneGeometry(frame.width / actorSize.pixelsPerUnit, frame.height / actorSize.pixelsPerUnit);
            this.actor.geometry.translate((frame.width / 2 - frame.pivot.x) / actorSize.pixelsPerUnit, (frame.height / 2 - frame.pivot.y) / actorSize.pixelsPerUnit, 0);
            this.frame = frame;
        }
        const smoothing = 1 - Math.exp(-dt * 4);
        this.focus.lerp(new THREE.Vector3(player.x * 0.4, player.y * 0.45 + 0.4, player.z * 0.3 - 1.5), smoothing);
        // 저해상도 픽셀 격자에 카메라만 맞춰 정지한 지형의 무늬가 기어가지 않게 한다.
        const screenUp = new THREE.Vector3(0, 25, -21).normalize();
        const pixelWidth = (this.camera.right - this.camera.left) / this.renderWidth;
        const pixelHeight = (this.camera.top - this.camera.bottom) / this.renderHeight;
        const snappedFocus = this.focus.clone();
        snappedFocus.x = Math.round(snappedFocus.x / pixelWidth) * pixelWidth;
        const vertical = snappedFocus.dot(screenUp);
        snappedFocus.addScaledVector(screenUp, Math.round(vertical / pixelHeight) * pixelHeight - vertical);
        this.camera.position.copy(snappedFocus).add(new THREE.Vector3(0, 21, 25));
        this.camera.lookAt(snappedFocus);
        this.actor.position.set(player.x, player.y + 0.04, player.z);
        if (this.spritePose === 'upright') {
            // 정사영에서 짧아지는 높이를 보정해 원본 이미지의 화면 비율을 유지한다.
            this.actor.quaternion.identity();
            this.actor.scale.y = 1 / screenUp.y;
            // 발 기준점 아래의 이미지 영역까지 지면 위에 놓는다.
            this.actor.position.y +=
                (frame.pivot.y / actorSize.pixelsPerUnit) * this.actor.scale.y;
        }
        else {
            this.actor.quaternion.copy(this.camera.quaternion);
            this.actor.scale.y = 1;
        }
        this.shadow.position.set(player.x, player.y + 0.035, player.z);
        for (const [i, ripple] of this.ripples.entries()) {
            ripple.position.z = ((i * 0.9 + this.elapsed * 0.5) % 23.5) - 11.75;
        }
        this.renderer.info.reset();
        this.scene.updateMatrixWorld(true);
        this.camera.updateMatrixWorld(true);
        this.houseReveal.update(dt);
        this.houseReveal.render(this.renderer, () => {
            this.composer.render(dt);
            this.renderSharpObjects();
        });
    }
    renderSharpObjects() {
        const background = this.scene.background;
        const overrideMaterial = this.scene.overrideMaterial;
        const autoClear = this.renderer.autoClear;
        const cameraLayers = this.camera.layers.mask;
        const shadowVisible = this.shadow.visible;
        try {
            this.renderer.setRenderTarget(null);
            this.renderer.autoClear = false;
            this.scene.background = null;
            this.renderer.clearDepth();
            // 색은 유지한 채 배경의 깊이만 다시 기록해야 건물 뒤 캐릭터가 가려진다.
            this.camera.layers.set(renderLayers.pixelated);
            this.scene.overrideMaterial = this.occlusionMaterial;
            this.shadow.visible = false;
            this.renderer.render(this.scene, this.camera);
            this.scene.overrideMaterial = overrideMaterial;
            this.shadow.visible = shadowVisible;
            this.camera.layers.set(renderLayers.sharp);
            this.renderer.render(this.scene, this.camera);
        }
        finally {
            this.scene.background = background;
            this.scene.overrideMaterial = overrideMaterial;
            this.renderer.autoClear = autoClear;
            this.camera.layers.mask = cameraLayers;
            this.shadow.visible = shadowVisible;
        }
    }
    resize() {
        const { width, height } = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (this.width === width &&
            this.height === height &&
            this.renderer.getPixelRatio() === dpr)
            return;
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.width, this.height, false);
        // DPR과 무관하게 한 도트를 CSS 2px로 유지한다.
        this.pixelPass.setPixelSize(this.pixelSize * dpr);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(this.width, this.height);
        this.renderWidth = Math.max(1, Math.floor(this.width / this.pixelSize));
        this.renderHeight = Math.max(1, Math.floor(this.height / this.pixelSize));
        this.houseReveal.resize(this.canvas.width, this.canvas.height, new THREE.Vector2(this.renderWidth, this.renderHeight));
        const aspect = this.width / this.height;
        const halfHeight = Math.max(11.8, 14 / aspect);
        this.camera.left = -halfHeight * aspect;
        this.camera.right = halfHeight * aspect;
        this.camera.top = halfHeight;
        this.camera.bottom = -halfHeight;
        this.camera.updateProjectionMatrix();
    }
    get diagnostics() {
        const feet = this.actor.position.clone().project(this.camera);
        return {
            motion: this.motion,
            frame: this.frame?.localPath,
            feet: {
                x: ((feet.x + 1) * this.width) / 2,
                y: ((1 - feet.y) * this.height) / 2,
            },
            pixelRatio: this.renderer.getPixelRatio(),
            pixelSize: this.pixelSize,
            characterPixelated: false,
            spritePose: this.spritePose,
            reveal: this.houseReveal.snapshot,
            renderSize: { width: this.renderWidth, height: this.renderHeight },
            drawCalls: this.renderer.info.render.calls,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        const geometries = new Set();
        const materials = new Set();
        this.scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh))
                return;
            geometries.add(object.geometry);
            if (Array.isArray(object.material))
                object.material.forEach((material) => materials.add(material));
            else
                materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.textures.forEach((texture) => texture.dispose());
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight)
                object.shadow.dispose();
        });
        this.houseReveal.dispose();
        this.occlusionMaterial.dispose();
        this.pixelPass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
