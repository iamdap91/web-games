import { clearingAtmosphere, recolorClearingMaterial, } from './clearing-palette.js';
import { rpgView, rpgCameraBounds, } from '../../games/tiger-rpg/presentation-contracts.js';
import { clearingCameraPose, clearingCameraX, clearingScreenUpY, projectClearingPoint, } from './clearing-camera.js';
import { createClearingLandscape } from './clearing-landscape.js';
import { SpriteTextures } from '../../rendering/sprite-textures.js';
import { RushScene } from './rush-scene.js';
import { RushTrail } from './rush-trail.js';
import { rushRules } from './harvest-rush.js';
import { GroundSlamScene } from './ground-slam-scene.js';
import { slamMotion } from './ground-slam.js';
import * as THREE from 'three';
import { workMotion } from './work-motion.js';
import { HarvestTree } from './harvest-tree.js';
import { DiscoveryScene, bridgeElevation } from './discovery-scene.js';
import { discoveryLayout } from './clearing-discovery.js';
import { StreamLootScene } from './stream-loot-scene.js';
import { streamLootRules } from './stream-loot.js';
import { HarvestDrops } from './harvest-drops.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ResourceOutlinePass } from '../../rendering/resource-outline-pass.js';
import { EnvironmentResources, setResourceOutline, } from '../../rendering/environment-resources.js';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AnimationPlayer, } from '../../resources/preview/animation-player.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { clearing, obstacleTypes, obstacleRadius, } from './world.js';
export class ClearingScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 100);
    renderer;
    composer;
    outlinePass;
    outputPass = new OutputPass();
    cube = new THREE.BoxGeometry(1, 1, 1);
    resources = new EnvironmentResources({
        recolor: recolorClearingMaterial,
    });
    rushTrail = new RushTrail();
    rushEffects = new RushScene();
    groundSlam = new GroundSlamScene();
    drops = new HarvestDrops(this.resources);
    streamLoot = new StreamLootScene(this.resources);
    discovery = new DiscoveryScene(this.resources);
    textures = new SpriteTextures();
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
    flash = new THREE.Group();
    flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffedba,
        transparent: true,
        depthWrite: false,
    });
    flashAt = -100;
    shakeAt = -100;
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
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.background = new THREE.Color(clearingAtmosphere.background);
        this.composer = new EffectComposer(this.renderer);
        this.outlinePass = new ResourceOutlinePass(this.scene, this.camera, this.scene.background);
        for (const { id, recommendedPixelSize } of outlineGroups)
            this.outlinePass.setPixelSize(id, recommendedPixelSize);
        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.outputPass);
        this.composer.addPass(this.outlinePass.smoothingPass);
        this.scene.fog = new THREE.Fog(clearingAtmosphere.background, 42, 72);
        const ambient = new THREE.HemisphereLight(clearingAtmosphere.sky, clearingAtmosphere.shade, clearingAtmosphere.skyStrength);
        ambient.layers.enableAll();
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(clearingAtmosphere.sunlight, clearingAtmosphere.sunStrength);
        sun.layers.enableAll();
        sun.position.set(-9, 19, 8);
        sun.castShadow = true;
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
        this.camera.position.set(0, clearingCameraPose.height, clearingCameraPose.targetZ + clearingCameraPose.depth);
        this.camera.lookAt(0, 0, clearingCameraPose.targetZ);
        this.scene.add(createClearingLandscape(this.resources, state.obstacles));
        this.scene.add(this.discovery.group, this.streamLoot.group, this.groundSlam.group, this.rushTrail.group, this.rushEffects.group);
        for (const obstacle of state.obstacles)
            this.buildObstacle(obstacle);
        this.actor.layers.set(resourceLayers.character);
        this.actor.scale.y = 1 / clearingScreenUpY;
        setResourceOutline(this.shadow, 'ground');
        this.targetRing.layers.set(resourceLayers.effects);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.62;
        this.targetRing.rotation.x = -Math.PI / 2;
        this.scene.add(this.actor, this.shadow, this.targetRing, this.flash, this.drops.group);
        for (let i = 0; i < 6; i++) {
            const ray = new THREE.Mesh(this.cube, this.flashMaterial);
            const angle = (i * Math.PI) / 3;
            ray.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
            ray.scale.set(0.2, 0.055, 0.025);
            ray.rotation.z = angle;
            ray.layers.set(resourceLayers.effects);
            this.flash.add(ray);
        }
        this.flash.quaternion.copy(this.camera.quaternion);
        const ataho = manifest.assets.find((asset) => asset.id === 'hwanse/ataho');
        if (!ataho)
            throw new Error('아타호 모션 정보를 찾을 수 없어요.');
        const motions = new Map();
        for (const [name, animation] of Object.entries(ataho.animations))
            if (name.startsWith('stand') || name.startsWith('move'))
                motions.set(name, animation);
        for (const name of [
            'battle-ready',
            'battle-arm',
            'crouch',
            'tiger-fist',
            'turn-kick',
            'sweep-kick',
        ]) {
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
        await this.textures.load(this.framePaths, '아타호 이미지가 없어요. 로컬 보행·주먹·발차기 리소스를 확인해 주세요.');
    }
    box(parent, x, y, z, width, height, depth, color, appearance) {
        const mesh = new THREE.Mesh(this.cube, this.resources.material(appearance.surface, color));
        setResourceOutline(mesh, appearance.outline);
        mesh.position.set(x, y, z);
        mesh.scale.set(width, height, depth);
        mesh.castShadow = height > 0.1;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    buildObstacle(item) {
        const group = new THREE.Group();
        const cracks = new THREE.Group();
        group.position.set(item.x, 0, item.z);
        const radius = obstacleRadius(item);
        const tree = item.kind === 'tree' ? new HarvestTree(this.resources) : null;
        if (tree) {
            if (item.health === 0)
                tree.restoreFallen();
            group.add(tree.group);
        }
        else if (item.kind === 'brush') {
            group.add(this.resources.createBrush());
        }
        else {
            const rock = this.resources.createRock({
                radius,
                rotation: item.id * 0.71,
                ...(item.id === discoveryLayout.source.id ? { color: 0x879389 } : {}),
            });
            group.add(rock);
            for (let i = 0; i < 3; i++) {
                const crack = this.box(cracks, -0.14 + (i % 2) * 0.1, rock.position.y + (i - 1) * rock.scale.y * 0.3, rock.scale.z * (0.8 - i * 0.08), 0.035, rock.scale.y * 0.4, 0.025, 0x59635b, { surface: 'stone', outline: 'rock' });
                crack.rotation.z = i % 2 ? -0.7 : 0.55;
                crack.castShadow = false;
            }
        }
        group.add(cracks);
        const patch = new THREE.Mesh(new THREE.CircleGeometry(radius + 0.25, 9), this.resources.material('earth', 0xa6a17a));
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(item.x, 0.022, item.z);
        setResourceOutline(patch, 'ground');
        patch.receiveShadow = true;
        patch.visible = false;
        this.scene.add(group, patch);
        this.props.set(item.id, {
            group,
            cracks,
            patch,
            tree,
            hitAt: -100,
            aim: { x: 0, z: 1 },
            removed: false,
        });
    }
    addImpacts(events) {
        for (const event of events) {
            if (event.source === 'rush' && !event.removed)
                this.rushEffects.strike(event.contact, event.aim, this.actor.position.y);
            this.drops.spawn(event);
            const prop = this.props.get(event.id);
            if (prop) {
                prop.hitAt = this.elapsed;
                prop.aim = event.aim;
                prop.removed = event.removed;
                if (event.action !== 'push')
                    prop.tree?.strike({ direction: event.aim, removed: event.removed });
            }
            this.flashAt = this.elapsed;
            const lowKick = event.aim.z >= Math.abs(event.aim.x);
            this.flash.position.set(event.contact.x, lowKick ? 0.55 : 0.85, event.contact.z);
            if (event.removed)
                this.shakeAt = this.elapsed;
            const count = event.action === 'push'
                ? 6
                : event.kind === 'tree'
                    ? event.removed
                        ? 34
                        : 12
                    : event.removed
                        ? 22
                        : 7;
            for (let i = 0; i < count; i++) {
                const angle = i * 2.4 + event.id;
                const color = event.kind !== 'rock'
                    ? i % 2
                        ? 0x88975f
                        : 0xb9925b
                    : i % 2
                        ? 0xaaa389
                        : 0xe0d4a6;
                const surface = event.kind === 'rock' ? 'stone' : i % 2 ? 'leaves' : 'wood';
                const mesh = new THREE.Mesh(this.cube, this.resources.material(surface, color));
                setResourceOutline(mesh, event.kind);
                const leaf = event.action !== 'push' && event.kind !== 'rock' && i % 2 === 1;
                const size = event.removed ? 0.12 + (i % 3) * 0.06 : 0.08;
                const origin = new THREE.Vector3(event.x +
                    (event.kind === 'tree' && leaf ? Math.cos(angle) * 0.65 : 0), leaf ? (event.kind === 'tree' ? 2.2 + (i % 3) * 0.3 : 0.95) : 0.55, event.z +
                    (event.kind === 'tree' && leaf ? Math.sin(angle) * 0.65 : 0));
                mesh.position.copy(origin);
                mesh.scale.setScalar(i % 3 ? 0.1 : 0.17);
                this.scene.add(mesh);
                this.chips.push({
                    mesh,
                    origin,
                    velocity: new THREE.Vector3(Math.cos(angle) * (1 + (i % 3)) + event.aim.x * 1.4, 2 + (i % 3), Math.sin(angle) * (1 + (i % 2)) + event.aim.z * 1.4),
                    born: this.elapsed,
                    life: (leaf ? (event.kind === 'tree' ? 1.5 : 0.9) : 0.5) + (i % 4) * 0.1,
                    size,
                    leaf,
                });
            }
        }
    }
    addSlams(events, state) {
        for (const event of events) {
            this.groundSlam.strike(event, bridgeElevation(event, state.discovery.logs));
            this.flashAt = this.elapsed;
            this.flash.position.set(event.x, this.actor.position.y + 0.12, event.z + 0.18);
        }
    }
    addLootEvents(events) {
        for (const event of events) {
            if (event.type === 'pickup')
                this.drops.collect(event);
            else {
                this.streamLoot.open(event);
                this.flashAt = this.elapsed;
                this.flash.position.set(event.x, 0.4, event.z);
                this.shakeAt = this.elapsed;
            }
        }
    }
    reset() {
        this.drops.reset();
        this.groundSlam.reset();
        this.rushTrail.reset();
        this.rushEffects.reset();
        this.discovery.reset();
        this.streamLoot.reset();
        for (const chip of this.chips)
            this.scene.remove(chip.mesh);
        this.chips.length = 0;
        for (const prop of this.props.values()) {
            prop.hitAt = -100;
            prop.removed = false;
            prop.tree?.reset();
        }
        this.flashAt = -100;
        this.shakeAt = -100;
    }
    render(state, dt) {
        if (this.disposed)
            return;
        this.resize();
        this.elapsed += dt;
        this.updateActor(state, dt);
        this.rushTrail.update(this.actor, !!state.rush.action && !state.rush.action.recoil && state.player.moving, dt);
        this.rushEffects.update({
            action: state.rush.action,
            player: state.player,
            moving: state.player.moving,
            elevation: bridgeElevation(state.player, state.discovery.logs),
        }, dt);
        this.groundSlam.update(state.slam, state.player, bridgeElevation(state.player, state.discovery.logs), dt);
        this.drops.update(dt, this.actor.position);
        this.streamLoot.update(state.floatingItems, dt);
        this.discovery.update(state.discovery, state.obstacles.find((item) => item.id === discoveryLayout.source.id), dt);
        for (const item of state.obstacles) {
            const prop = this.props.get(item.id);
            if (prop.tree) {
                prop.tree.update(dt, { camera: this.camera, actor: this.actor });
                prop.patch.visible = prop.tree.fallen;
                continue;
            }
            const age = this.elapsed - prop.hitAt;
            const breaking = prop.removed && age < 0.18;
            prop.group.visible = item.health > 0 || breaking;
            prop.patch.visible =
                item.health <= 0 && item.id !== discoveryLayout.source.id;
            prop.cracks.visible =
                item.kind === 'rock' && item.health < obstacleTypes.rock.health;
            prop.cracks.scale.setScalar(item.health === 1 ? 1.3 : 1);
            const bend = age < 0.32 ? Math.sin(age * 24) * Math.exp(-age * 9) : 0;
            prop.group.position.set(item.x + prop.aim.x * bend * 0.1, 0, item.z + prop.aim.z * bend * 0.1);
            const tilt = item.kind === 'brush' ? (breaking ? age * 5 : bend * 0.4) : bend * 0.06;
            prop.group.rotation.set(prop.aim.z * tilt, 0, -prop.aim.x * tilt);
            prop.group.scale.setScalar(breaking ? Math.max(0, 1 - age / 0.18) : 1);
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
            chip.mesh.position.y = Math.max(0.06, chip.mesh.position.y - (chip.leaf ? 2.8 : 5) * age * age);
            chip.mesh.rotation.set(age * 5, age * 4, age * 2);
            const size = chip.size * Math.min(1, (chip.life - age) * 6);
            chip.mesh.scale.set(size, chip.leaf ? size * 0.25 : size, size);
        }
        const target = state.obstacles.find((item) => item.id === state.targetId);
        const crate = state.floatingItems.find((item) => item.id === state.crateTargetId);
        const highlighted = target ?? crate;
        this.targetRing.visible = !!highlighted;
        if (highlighted) {
            this.targetRing.position.set(highlighted.x, target ? 0.035 : -0.045, highlighted.z);
            this.targetRing.scale.setScalar((target ? obstacleRadius(target) : streamLootRules.crateRadius) + 0.22);
        }
        const flashAge = this.elapsed - this.flashAt;
        this.flash.visible = flashAge < 0.16;
        this.flash.scale.setScalar(0.8 + flashAge * 5);
        this.flashMaterial.opacity = Math.max(0, 1 - flashAge / 0.16);
        const shakeAge = this.elapsed - this.shakeAt;
        const shake = this.groundSlam.shake +
            (shakeAge < 0.18
                ? Math.sin(shakeAge * 110) * 0.065 * (1 - shakeAge / 0.18)
                : 0);
        const followX = clearingCameraX({
            playerX: state.player.x,
            halfWidth: this.camera.right,
        });
        this.camera.position.set(followX + shake, clearingCameraPose.height + shake * 0.4, clearingCameraPose.targetZ + clearingCameraPose.depth);
        this.camera.layers.set(resourceLayers.environment);
        // 종류별 패스가 같은 그림자를 쓰도록 전체 장면의 그림자는 프레임당 한 번 갱신한다.
        if (dt > 0)
            this.renderer.shadowMap.needsUpdate = true;
        this.composer.render(dt);
        const background = this.scene.background;
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.scene.background = null;
        this.camera.layers.set(resourceLayers.character);
        this.camera.layers.enable(resourceLayers.effects);
        this.renderer.render(this.scene, this.camera);
        this.camera.layers.set(resourceLayers.environment);
        this.scene.background = background;
        this.renderer.autoClear = true;
    }
    updateActor(state, dt) {
        const { player, swing } = state;
        const rush = state.rush.action;
        const recoil = rush?.recoil;
        const recoilLift = recoil ? Math.sin(recoil.progress * Math.PI) * 0.18 : 0;
        const suffix = player.facing === 'front' ? '' : `-${player.facing}`;
        const motion = `${player.moving ? 'move' : 'stand'}${suffix}`;
        if (this.motion !== motion) {
            this.animation.play(motion);
            this.motion = motion;
        }
        this.animation.update(dt * (rush ? rushRules.speedMultiplier : 1));
        const work = swing ? workMotion(swing.progress, player.facing) : null;
        const slam = state.slam.action
            ? slamMotion(state.slam.action.elapsed)
            : null;
        const frame = slam
            ? this.workAnimations.get(slam.motion).frames[slam.frameIndex]
            : work?.pose
                ? this.workAnimations.get(work.pose.motion).frames[work.pose.frameIndex]
                : this.animation.currentFrame.frame;
        if (this.frame !== frame) {
            this.actor.geometry.dispose();
            this.actor.geometry = new THREE.PlaneGeometry(frame.width / rpgView.actorPixelsPerUnit, frame.height / rpgView.actorPixelsPerUnit);
            this.actor.geometry.translate((frame.width / 2 - frame.pivot.x) / rpgView.actorPixelsPerUnit, frame.height / rpgView.actorPixelsPerUnit / 2, 0);
            this.actorMaterial.map = this.textures.get(frame.localPath) ?? null;
            this.actorMaterial.needsUpdate = true;
            this.frame = frame;
        }
        const extension = work?.extension ?? 0;
        const advance = (swing?.advance ?? 0) * extension - (work?.coil ?? 0) * 0.05;
        this.actor.scale.set((slam ? player.facing === 'left' : work?.mirror) ? -1 : 1, (slam?.squash ??
            (recoil
                ? 0.88 + Math.sin(recoil.progress * Math.PI) * 0.15
                : rush
                    ? 0.93
                    : 1 - extension * 0.09)) / clearingScreenUpY, 1);
        this.actor.rotation.set(recoil
            ? -recoil.aim.z * 0.15
            : rush
                ? rush.heading.z * 0.13
                : (swing?.aim.z ?? 0) * extension * 0.1, 0, recoil
            ? recoil.aim.x * 0.18
            : rush
                ? -rush.heading.x * 0.15
                : -(swing?.aim.x ?? 0) * extension * 0.08);
        this.actor.position.set(player.x + (swing?.aim.x ?? 0) * advance, 0.035 +
            bridgeElevation(player, state.discovery.logs) +
            (slam?.lift ?? recoilLift), player.z + (swing?.aim.z ?? 0) * advance);
        this.shadow.scale.set(1 - (slam?.lift ?? recoilLift) * 0.15, 0.62, 1);
        this.shadow.position.set(this.actor.position.x, 0.028 + bridgeElevation(player, state.discovery.logs), this.actor.position.z);
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
        this.outlinePass.setPixelRatio(dpr);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(this.width, this.height);
        Object.assign(this.camera, rpgCameraBounds({ width: this.width, height: this.height }));
        this.camera.updateProjectionMatrix();
    }
    project(point) {
        this.camera.updateMatrixWorld();
        return projectClearingPoint({
            point,
            camera: this.camera,
            width: this.width,
            height: this.height,
        });
    }
    get speakerAnchor() {
        if (this.disposed || !this.frame)
            return null;
        // 실제 동작의 높이·회전·통나무 위 높이까지 따라가되 화자를 화면 가장자리로 옮기지 않는다.
        const head = new THREE.Vector3(0, this.frame.height / rpgView.actorPixelsPerUnit, 0);
        this.actor.localToWorld(head);
        return this.project(head);
    }
    get exitMarker() {
        return this.project(new THREE.Vector3(clearing.exit.x, 0, clearing.exit.z));
    }
    get diagnostics() {
        return {
            frame: this.frame?.localPath,
            actorHeight: this.actor.position.y,
            pixelRatio: this.renderer.getPixelRatio(),
            viewport: { width: this.width, height: this.height },
            cameraView: {
                left: this.camera.left,
                right: this.camera.right,
                top: this.camera.top,
                bottom: this.camera.bottom,
                centerX: this.camera.position.x,
            },
            speakerAnchor: this.speakerAnchor,
            particles: this.chips.length,
            rushEffects: this.rushEffects.diagnostics,
            drops: this.drops.diagnostics,
            impactVisible: this.flash.visible,
            characterPixelated: false,
            resourceStyle: 'shared-broad',
            trees: [...this.props].flatMap(([id, prop]) => prop.tree ? [{ id, ...prop.tree.diagnostics }] : []),
            outlines: Object.fromEntries(outlineGroups.map(({ id, recommendedPixelSize }) => [
                id,
                recommendedPixelSize,
            ])),
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.drops.dispose();
        this.groundSlam.dispose();
        this.rushTrail.dispose();
        this.rushEffects.dispose();
        this.discovery.dispose();
        this.streamLoot.dispose();
        for (const prop of this.props.values())
            prop.tree?.dispose();
        const geometries = new Set([this.cube]);
        const materials = new Set();
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
        geometries.forEach((geometry) => {
            if (!this.resources.ownsGeometry(geometry))
                geometry.dispose();
        });
        materials.forEach((material) => {
            if (!this.resources.ownsMaterial(material))
                material.dispose();
        });
        this.resources.dispose();
        this.textures.dispose();
        this.outlinePass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
