import * as THREE from 'three';
import { workMotion } from './work-motion.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPixelMaterial, villageColors as colors, } from '../mountain-village/pixel-style.js';
import { AnimationPlayer, } from '../../resources/preview/animation-player.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { clearing, obstacleTypes, } from './world.js';
const pixelsPerUnit = 32;
const screenUpY = 25 / Math.hypot(21, 25);
export class ClearingScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 100);
    renderer;
    composer;
    pixelPass;
    outputPass = new OutputPass();
    depthMaterial = new THREE.MeshDepthMaterial({
        colorWrite: false,
    });
    cube = new THREE.BoxGeometry(1, 1, 1);
    stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
    materials = new Map();
    textures = new Map();
    actorMaterial = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    actor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.actorMaterial);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.43, 24), new THREE.MeshBasicMaterial({
        color: 0x344435,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    }));
    targetRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 32), new THREE.MeshBasicMaterial({
        color: 0xffe6a0,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    tool = new THREE.Group();
    toolArm = new THREE.Group();
    axe = new THREE.Group();
    pickaxe = new THREE.Group();
    props = new Map();
    chips = [];
    animation;
    workAnimations = new Map();
    framePaths;
    frame = null;
    motion = '';
    elapsed = 0;
    width = 0;
    height = 0;
    disposed = false;
    constructor(canvas, state) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.composer = new EffectComposer(this.renderer);
        this.pixelPass = new RenderPixelatedPass(2, this.scene, this.camera);
        this.pixelPass.normalEdgeStrength = 0;
        this.pixelPass.depthEdgeStrength = 0.2;
        this.composer.addPass(this.pixelPass);
        this.composer.addPass(this.outputPass);
        this.scene.background = new THREE.Color(0xb8c9aa);
        this.scene.fog = new THREE.Fog(0xb8c9aa, 42, 76);
        const ambient = new THREE.HemisphereLight(0xfff2d7, 0x617554, 2);
        // 선명한 레이어의 도구에도 배경과 같은 조명이 도달해야 한다.
        ambient.layers.enable(1);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffe5b4, 2.1);
        sun.position.set(-9, 19, 8);
        sun.castShadow = true;
        sun.layers.enable(1);
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, {
            left: -18,
            right: 18,
            top: 18,
            bottom: -18,
            near: 1,
            far: 55,
        });
        sun.shadow.normalBias = 0.035;
        this.scene.add(sun);
        this.camera.position.set(0, 21, 24);
        this.camera.lookAt(0, 0, -1);
        this.buildGround();
        for (const obstacle of state.obstacles)
            this.buildObstacle(obstacle);
        this.actor.layers.set(1);
        this.actor.scale.y = 1 / screenUpY;
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.62;
        this.targetRing.rotation.x = -Math.PI / 2;
        this.scene.add(this.actor, this.shadow, this.targetRing, this.tool);
        this.tool.add(this.toolArm);
        this.toolArm.add(this.axe, this.pickaxe);
        for (const head of [this.axe, this.pickaxe])
            this.box(head, 0, 0.42, 0, 0.075, 0.88, 0.075, colors.wood);
        this.box(this.axe, 0.14, 0.82, 0, 0.4, 0.28, 0.1, 0xc2c9bd);
        this.box(this.axe, 0.33, 0.82, 0, 0.055, 0.33, 0.12, 0xe7e4d0);
        this.box(this.pickaxe, 0, 0.84, 0, 0.85, 0.12, 0.12, 0xaab8b4);
        // Group의 레이어는 자식에 상속되지 않으므로 실제 도구 메시까지 옮긴다.
        this.tool.traverse((object) => object.layers.set(1));
        const ataho = manifest.assets.find((asset) => asset.id === 'hwanse/ataho');
        if (!ataho)
            throw new Error('아타호 모션 정보를 찾을 수 없어요.');
        const motions = new Map();
        for (const [name, animation] of Object.entries(ataho.animations))
            if (name.startsWith('stand') || name.startsWith('move'))
                motions.set(name, animation);
        for (const name of ['battle-arm', 'crouch']) {
            const animation = ataho.animations[name];
            if (!animation)
                throw new Error(`아타호 작업 모션이 없습니다: ${name}`);
            this.workAnimations.set(name, animation);
        }
        this.animation = new AnimationPlayer(motions, 'stand');
        this.framePaths = [
            ...new Set([...motions.values(), ...this.workAnimations.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))),
        ];
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
            throw new Error('아타호 이미지가 없어요. 로컬 보행·팔 올리기·웅크리기 리소스를 확인해 주세요.');
    }
    material(color) {
        let material = this.materials.get(color);
        if (!material) {
            material = createPixelMaterial(color);
            this.materials.set(color, material);
        }
        return material;
    }
    box(parent, x, y, z, width, height, depth, color) {
        const mesh = new THREE.Mesh(this.cube, this.material(color));
        mesh.position.set(x, y, z);
        mesh.scale.set(width, height, depth);
        mesh.castShadow = height > 0.1;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    tree(x, z, size) {
        this.box(this.scene, x, 0.65, z, 0.23, 1.3, 0.23, colors.wood);
        for (let i = 0; i < 3; i++) {
            const mesh = new THREE.Mesh(new THREE.ConeGeometry((1.2 - i * 0.22) * size, 1.6 * size, 7), this.material([0x607955, 0x738953, 0x88975f][i]));
            mesh.position.set(x, (1.4 + i * 0.65) * size, z);
            mesh.castShadow = true;
            this.scene.add(mesh);
        }
    }
    buildGround() {
        this.box(this.scene, 0, -0.65, 0, clearing.width + 2, 1.2, clearing.depth + 2, colors.earth);
        this.box(this.scene, 0, -0.025, 0, clearing.width + 2, 0.05, clearing.depth + 2, colors.grass);
        this.box(this.scene, 0, 0.008, 6.5, 2.2, 0.016, 4.6, colors.path);
        // 울타리를 이동 경계 바깥에 놓아 공터의 끝을 눈으로 확인할 수 있게 한다.
        for (let x = -clearing.width / 2; x <= clearing.width / 2; x += 2) {
            for (const z of [-clearing.depth / 2 - 0.2, clearing.depth / 2 + 0.2]) {
                if (z > 0 && Math.abs(x) < 2)
                    continue;
                this.box(this.scene, x, 0.36, z, 0.11, 0.72, 0.11, colors.wood);
                if (x < clearing.width / 2 && !(z > 0 && x === -2))
                    this.box(this.scene, x + 1, 0.42, z, 2, 0.08, 0.06, colors.wood);
            }
        }
        for (const x of [-clearing.width / 2 - 0.2, clearing.width / 2 + 0.2])
            for (let z = -clearing.depth / 2; z <= clearing.depth / 2; z += 2) {
                this.box(this.scene, x, 0.36, z, 0.11, 0.72, 0.11, colors.wood);
                if (z < clearing.depth / 2)
                    this.box(this.scene, x, 0.42, z + 1, 0.06, 0.08, 2, colors.wood);
            }
        for (let i = 0; i < 11; i++)
            this.tree(-12 + i * 2.4, -9.1 - (i % 2) * 0.8, 0.8 + (i % 3) * 0.13);
        this.tree(-11.1, -3, 1.1);
        this.tree(11.1, -1, 1.05);
        for (let i = 0; i < 72; i++) {
            const x = -9.2 + ((i * 5.71) % 18.4);
            const z = -7.2 + ((i * 3.39) % 14.4);
            if (Math.abs(x) < 1.25 && z > 4)
                continue;
            this.box(this.scene, x, 0.035, z, 0.09, 0.07, 0.2, i % 4 ? 0x81965d : 0xc2b67b);
        }
        this.box(this.scene, -1.65, 0.45, 6, 0.1, 0.9, 0.1, colors.wood);
        this.box(this.scene, -1.65, 0.8, 6, 0.85, 0.42, 0.12, 0xb18b59);
    }
    buildObstacle(item) {
        const group = new THREE.Group();
        const cracks = new THREE.Group();
        group.position.set(item.x, 0, item.z);
        const radius = obstacleTypes[item.kind].radius;
        if (item.kind === 'brush') {
            for (let i = 0; i < 3; i++) {
                const branch = this.box(group, (i - 1) * 0.14, 0.38, 0, 0.08, 0.76, 0.08, colors.wood);
                branch.rotation.z = (i - 1) * -0.3;
                const leaves = new THREE.Mesh(this.stoneGeometry, this.material([0x607955, 0x738953, 0x88975f][i]));
                leaves.position.set((i - 1) * 0.18, 0.67 + (i % 2) * 0.2, (i - 1) * 0.06);
                leaves.scale.set(0.35, 0.33, 0.34);
                leaves.castShadow = true;
                group.add(leaves);
            }
        }
        else {
            const rock = new THREE.Mesh(this.stoneGeometry, this.material(colors.stone));
            rock.position.y = 0.39;
            rock.rotation.y = item.id * 0.71;
            rock.scale.set(radius, 0.58, radius);
            rock.castShadow = true;
            rock.receiveShadow = true;
            group.add(rock);
            for (let i = 0; i < 3; i++) {
                const crack = this.box(cracks, -0.14 + (i % 2) * 0.1, 0.33 + i * 0.17, 0.52 - i * 0.05, 0.035, 0.23, 0.025, 0x59635b);
                crack.rotation.z = i % 2 ? -0.7 : 0.55;
                crack.castShadow = false;
            }
        }
        group.add(cracks);
        const patch = new THREE.Mesh(new THREE.CircleGeometry(radius + 0.25, 9), this.material(0xa6a17a));
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(item.x, 0.022, item.z);
        patch.receiveShadow = true;
        patch.visible = false;
        this.scene.add(group, patch);
        this.props.set(item.id, { group, cracks, patch, hitAt: -100 });
    }
    addImpacts(events) {
        for (const event of events) {
            const prop = this.props.get(event.id);
            if (prop)
                prop.hitAt = this.elapsed;
            const count = event.removed ? 16 : 6;
            for (let i = 0; i < count; i++) {
                const angle = i * 2.4 + event.id;
                const color = event.kind === 'brush'
                    ? i % 2
                        ? 0x88975f
                        : 0xb9925b
                    : i % 2
                        ? 0xaaa389
                        : 0xe0d4a6;
                const mesh = new THREE.Mesh(this.cube, this.material(color));
                const origin = new THREE.Vector3(event.x, 0.55, event.z);
                mesh.position.copy(origin);
                mesh.scale.setScalar(i % 3 ? 0.1 : 0.17);
                this.scene.add(mesh);
                this.chips.push({
                    mesh,
                    origin,
                    velocity: new THREE.Vector3(Math.cos(angle) * (1 + (i % 3)), 2 + (i % 3), Math.sin(angle) * (1 + (i % 2))),
                    born: this.elapsed,
                    life: 0.45 + (i % 4) * 0.1,
                });
            }
        }
    }
    reset() {
        for (const chip of this.chips)
            this.scene.remove(chip.mesh);
        this.chips.length = 0;
        for (const prop of this.props.values())
            prop.hitAt = -100;
    }
    render(state, dt) {
        if (this.disposed)
            return;
        this.resize();
        this.elapsed += dt;
        this.updateActor(state, dt);
        for (const item of state.obstacles) {
            const prop = this.props.get(item.id);
            const age = this.elapsed - prop.hitAt;
            prop.group.visible = item.health > 0;
            prop.patch.visible = item.health <= 0;
            prop.cracks.visible =
                item.kind === 'rock' && item.health < obstacleTypes.rock.health;
            prop.group.position.x =
                item.x +
                    (age < 0.24 ? Math.sin(age * 70) * 0.07 * (1 - age / 0.24) : 0);
            prop.group.rotation.z =
                item.kind === 'brush' && age < 0.24 ? Math.sin(age * 35) * 0.12 : 0;
        }
        for (let i = this.chips.length - 1; i >= 0; i--) {
            const chip = this.chips[i];
            const age = this.elapsed - chip.born;
            if (age >= chip.life) {
                this.scene.remove(chip.mesh);
                this.chips.splice(i, 1);
                continue;
            }
            chip.mesh.position.copy(chip.origin).addScaledVector(chip.velocity, age);
            chip.mesh.position.y = Math.max(0.06, chip.mesh.position.y - 5 * age * age);
            chip.mesh.rotation.set(age * 5, age * 4, age * 2);
            chip.mesh.scale.setScalar(0.13 * Math.min(1, (chip.life - age) * 6));
        }
        const target = state.obstacles.find((item) => item.id === state.targetId && item.health > 0);
        this.targetRing.visible = !!target;
        if (target) {
            this.targetRing.position.set(target.x, 0.035, target.z);
            this.targetRing.scale.setScalar(obstacleTypes[target.kind].radius + 0.22);
        }
        this.camera.layers.set(0);
        this.composer.render(dt);
        const background = this.scene.background;
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.scene.background = null;
        this.renderer.clearDepth();
        this.shadow.visible = false;
        this.scene.overrideMaterial = this.depthMaterial;
        this.renderer.render(this.scene, this.camera);
        this.scene.overrideMaterial = null;
        this.shadow.visible = true;
        this.camera.layers.set(1);
        this.renderer.render(this.scene, this.camera);
        this.camera.layers.set(0);
        this.scene.background = background;
        this.renderer.autoClear = true;
    }
    updateActor(state, dt) {
        const { player, swing } = state;
        const suffix = player.facing === 'front' ? '' : `-${player.facing}`;
        const motion = `${player.moving ? 'move' : 'stand'}${suffix}`;
        if (this.motion !== motion) {
            this.animation.play(motion);
            this.motion = motion;
        }
        this.animation.update(dt);
        const work = swing ? workMotion(swing.progress, player.facing) : null;
        const frame = work?.pose
            ? this.workAnimations.get(work.pose.motion).frames[work.pose.frameIndex]
            : this.animation.currentFrame.frame;
        if (this.frame !== frame) {
            this.actor.geometry.dispose();
            this.actor.geometry = new THREE.PlaneGeometry(frame.width / pixelsPerUnit, frame.height / pixelsPerUnit);
            this.actor.geometry.translate((frame.width / 2 - frame.pivot.x) / pixelsPerUnit, frame.height / pixelsPerUnit / 2, 0);
            this.actorMaterial.map = this.textures.get(frame.localPath) ?? null;
            this.actorMaterial.needsUpdate = true;
            this.frame = frame;
        }
        // 발 기준점을 고정하고 상체만 작게 숙여 타격에 무게를 싣는다.
        const effort = work?.effort ?? 0;
        this.actor.scale.set(work?.mirror ? -1 : 1, (1 - effort * 0.045) / screenUpY, 1);
        this.actor.rotation.set((swing?.aim.z ?? 0) * effort * 0.06, 0, -(swing?.aim.x ?? 0) * effort * 0.045);
        this.actor.position.set(player.x, 0.035, player.z);
        this.shadow.position.set(player.x, 0.028, player.z);
        this.tool.visible = !!swing;
        if (swing && work) {
            const hand = new THREE.Vector3((work.hand.x - frame.pivot.x) / pixelsPerUnit, (frame.height - work.hand.y) / pixelsPerUnit, player.facing === 'back' ? -0.08 : 0.08);
            this.actor.updateMatrixWorld(true);
            this.tool.position.copy(this.actor.localToWorld(hand));
            this.tool.rotation.y = Math.atan2(swing.aim.x, swing.aim.z);
            this.toolArm.position.set(0, 0, 0);
            this.toolArm.rotation.x = work.angle;
            this.axe.visible = swing.kind === 'brush';
            this.pickaxe.visible = swing.kind === 'rock';
        }
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (this.width === bounds.width &&
            this.height === bounds.height &&
            this.renderer.getPixelRatio() === dpr)
            return;
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.width, this.height, false);
        this.pixelPass.setPixelSize(2 * dpr);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(this.width, this.height);
        const aspect = this.width / this.height;
        const halfHeight = Math.max(9.1, 12.3 / aspect);
        Object.assign(this.camera, {
            left: -halfHeight * aspect,
            right: halfHeight * aspect,
            top: halfHeight,
            bottom: -halfHeight,
        });
        this.camera.updateProjectionMatrix();
    }
    get diagnostics() {
        return {
            frame: this.frame?.localPath,
            pixelRatio: this.renderer.getPixelRatio(),
            particles: this.chips.length,
            toolVisible: this.tool.visible,
            characterPixelated: false,
            toolPixelated: false,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        const geometries = new Set([
            this.cube,
            this.stoneGeometry,
        ]);
        const materials = new Set(this.materials.values());
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                if (Array.isArray(object.material))
                    object.material.forEach((material) => materials.add(material));
                else
                    materials.add(object.material);
            }
            if (object instanceof THREE.DirectionalLight)
                object.shadow.dispose();
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.textures.forEach((texture) => texture.dispose());
        this.depthMaterial.dispose();
        this.pixelPass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
