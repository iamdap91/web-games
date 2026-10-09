import { SpriteTextures } from '../../rendering/sprite-textures.js';
import { ResourceOutlinePass } from '../../rendering/resource-outline-pass.js';
import { setResourceOutline } from '../../rendering/environment-resources.js';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import { BattleArena } from './battle-arena.js';
import { SkillEffects } from './skill-effects.js';
import { sweepRadius } from './battle-skills.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { BattleSprite, cameraHeight, cameraDepth } from './battle-sprite.js';
import { actionPosition } from './world.js';
import { overdriveIntro } from './overdrive-intro.js';
import { barragePose, tigerBarrageRules } from './tiger-barrage.js';
const assetIds = {
    ataho: 'hwanse/ataho',
    slime: 'mob/0210100.img',
    yeti: 'mob/6300000.img',
};
const arenaLighting = {
    background: 0x91a47e,
    sunlight: 2.1,
    ambient: 2,
};
const atahoMotions = new Set([
    'drink',
    'hiccup',
    'crouch',
    'attack1',
    'battle-kick',
    'somersault',
    'battle-ready',
    'tiger-fist',
    'turn-kick',
    'sweep-kick',
    'hit1',
    'guard',
    'die1',
    'victory',
    'move',
    'move-back',
    'move-left',
    'move-right',
]);
export class BattleScene {
    canvas;
    effects;
    skillEffects = new SkillEffects();
    areaMarker = new THREE.Group();
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    pointerRay = new THREE.Raycaster();
    affectedRings = new Map();
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-11, 11, 8, -8, 0.1, 100);
    renderer;
    composer;
    outlinePass;
    outputPass = new OutputPass();
    arena = new BattleArena();
    sparkGeometry = new THREE.BoxGeometry(1, 1, 1);
    textures = new SpriteTextures();
    animations = new Map();
    fighters = new Map();
    ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 48), new THREE.MeshBasicMaterial({
        color: 0xff4f5b,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    aura = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.73, 48), new THREE.MeshBasicMaterial({
        color: 0xffc66f,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    sparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe8a6,
        transparent: true,
        depthWrite: false,
    });
    skillSparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xbaf4e8,
        transparent: true,
        depthWrite: false,
    });
    rageSparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6379,
        transparent: true,
        depthWrite: false,
    });
    sparks = [];
    sunlight = new THREE.DirectionalLight(0xffe5b4, arenaLighting.sunlight);
    ambient = new THREE.HemisphereLight(0xfff2d7, 0x617554, arenaLighting.ambient);
    halo;
    elapsed = 0;
    shake = 0;
    driveMix = 0;
    width = 0;
    height = 0;
    disposed = false;
    constructor(canvas, state, effects) {
        this.canvas = canvas;
        this.effects = effects;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        // 배경 물체와 광원 위치는 고정이므로 종류별 렌더링이 같은 그림자를 재사용한다.
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.background = new THREE.Color(arenaLighting.background);
        this.composer = new EffectComposer(this.renderer);
        this.outlinePass = new ResourceOutlinePass(this.scene, this.camera, this.scene.background);
        for (const { id, recommendedPixelSize } of outlineGroups)
            this.outlinePass.setPixelSize(id, recommendedPixelSize);
        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.outputPass);
        this.composer.addPass(this.outlinePass.smoothingPass);
        this.scene.fog = new THREE.Fog(arenaLighting.background, 39, 62);
        this.ambient.layers.enableAll();
        this.scene.add(this.ambient);
        this.sunlight.layers.enableAll();
        this.sunlight.position.set(-8, 17, 7);
        this.sunlight.castShadow = true;
        this.sunlight.shadow.mapSize.set(1024, 1024);
        Object.assign(this.sunlight.shadow.camera, {
            left: -16,
            right: 16,
            top: 15,
            bottom: -15,
            near: 1,
            far: 55,
        });
        this.sunlight.shadow.normalBias = 0.04;
        this.scene.add(this.sunlight);
        this.halo = new THREE.PointLight(0xff9b3c, 0, 12, 1);
        this.halo.layers.enableAll();
        this.scene.add(this.halo);
        this.camera.position.set(0, cameraHeight, cameraDepth);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.arena.root);
        this.ring.rotation.x = this.aura.rotation.x = -Math.PI / 2;
        this.ring.layers.set(resourceLayers.effects);
        this.aura.layers.set(resourceLayers.effects);
        this.scene.add(this.ring, this.aura, this.skillEffects.group);
        const areaEdge = new THREE.MeshBasicMaterial({
            color: 0xff5267,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const areaFill = areaEdge.clone();
        areaFill.opacity = 0.14;
        const rim = new THREE.Mesh(new THREE.RingGeometry(sweepRadius - 0.055, sweepRadius, 96), areaEdge);
        const fill = new THREE.Mesh(new THREE.CircleGeometry(sweepRadius, 96), areaFill);
        rim.rotation.x = fill.rotation.x = -Math.PI / 2;
        const center = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.045), areaEdge);
        const cross = center.clone();
        cross.rotation.y = Math.PI / 2;
        this.areaMarker.add(fill, rim, center, cross);
        this.areaMarker.traverse((object) => object.layers.set(resourceLayers.effects));
        this.areaMarker.visible = false;
        this.scene.add(this.areaMarker);
        for (const enemy of state.enemies) {
            const ring = new THREE.Mesh(this.ring.geometry, this.ring.material.clone());
            ring.material.color.setHex(0xff8c8c);
            ring.material.opacity = 0.8;
            ring.layers.set(resourceLayers.effects);
            ring.rotation.x = -Math.PI / 2;
            ring.visible = false;
            this.affectedRings.set(enemy.id, ring);
            this.scene.add(ring);
        }
        for (const kind of new Set([state.player, ...state.enemies].map((fighter) => fighter.kind))) {
            const asset = manifest.assets.find((item) => item.id === assetIds[kind]);
            if (!asset)
                throw new Error(`캐릭터 정보가 없습니다: ${kind}`);
            const motions = new Map();
            for (const [key, value] of Object.entries(asset.animations)) {
                if (kind !== 'ataho' || atahoMotions.has(key))
                    motions.set(key, value);
            }
            this.animations.set(kind, motions);
        }
        for (const fighter of [state.player, ...state.enemies]) {
            const sprite = new BattleSprite(this.animations.get(fighter.kind), this.textures, fighter);
            setResourceOutline(sprite.shadow, 'ground');
            this.fighters.set(fighter.id, sprite);
            this.scene.add(sprite.group, sprite.shadow);
        }
    }
    async load() {
        const paths = new Set([...this.animations.values()].flatMap((motions) => [...motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))));
        await this.textures.load(paths, '전투 이미지를 불러오지 못했어요. 이 전투의 로컬 캐릭터 리소스를 확인해 주세요.');
    }
    addImpacts(impacts) {
        this.skillEffects.addImpacts(impacts);
        for (const impact of impacts) {
            this.fighters.get(impact.targetId)?.hit(impact);
            if (!impact.drive)
                this.shake = Math.max(this.shake, impact.barrage
                    ? impact.barrage.final
                        ? 0.42
                        : 0.025
                    : impact.critical
                        ? 0.22
                        : impact.heavy
                            ? 0.18
                            : 0.09);
            const particles = this.effects.reducedMotion
                ? 0
                : impact.drive
                    ? impact.drive.finisher
                        ? 10
                        : 3
                    : impact.barrage
                        ? impact.barrage.final
                            ? 26
                            : 4
                        : impact.heavy
                            ? 18
                            : 9;
            for (let i = 0; i < particles; i++) {
                const angle = i * 2.4;
                const mesh = new THREE.Mesh(this.sparkGeometry, impact.barrage
                    ? this.rageSparkMaterial
                    : impact.technique
                        ? this.skillSparkMaterial
                        : this.sparkMaterial);
                mesh.layers.set(1);
                const origin = new THREE.Vector3(impact.x, 0.8, impact.z);
                mesh.position.copy(origin);
                this.scene.add(mesh);
                this.sparks.push({
                    mesh,
                    origin,
                    velocity: new THREE.Vector3(Math.cos(angle) * 3.5, Math.sin(angle) * 3 + 1, Math.sin(angle * 1.3) * 1.8),
                    age: 0,
                    life: impact.heavy ? 0.38 : 0.23,
                });
            }
        }
    }
    reset() {
        this.skillEffects.reset();
        this.areaMarker.visible = false;
        this.affectedRings.forEach((ring) => {
            ring.visible = false;
        });
        this.fighters.forEach((fighter) => fighter.reset());
        this.sparks.forEach((spark) => this.scene.remove(spark.mesh));
        this.sparks.length = 0;
        this.shake = this.driveMix = 0;
    }
    render(state, dt, selection, feedback) {
        if (this.disposed)
            return;
        this.resize();
        const impactHold = state.phase === 'breaking' &&
            state.phaseTime >= overdriveIntro.impactAt &&
            state.phaseTime < overdriveIntro.burstAt;
        const motionDt = state.hitStopped || impactHold ? 0 : dt;
        this.elapsed += motionDt;
        this.shake = Math.max(0, this.shake - dt);
        const drive = state.phase === 'breaking' ||
            state.phase === 'overdrive' ||
            state.phase === 'ultimate';
        if (drive) {
            this.halo.color.setHex(state.phase === 'ultimate' ? 0xf02b4c : 0xff9b3c);
            this.aura.material.color.setHex(state.phase === 'ultimate' ? 0xff6379 : 0xffc66f);
        }
        this.driveMix += (Number(drive) - this.driveMix) * Math.min(1, dt * 7);
        const impactAge = state.phaseTime - overdriveIntro.impactAt;
        const burstAge = state.phaseTime - overdriveIntro.burstAt;
        const ultimatePresence = state.barrage
            ? Math.min(1, state.barrage.elapsed / tigerBarrageRules.dashAt) *
                (1 -
                    Math.max(0, (state.barrage.elapsed - tigerBarrageRules.finalAt) /
                        (tigerBarrageRules.duration - tigerBarrageRules.finalAt)))
            : 0;
        const presence = state.phase === 'breaking'
            ? Math.min(1, state.phaseTime / overdriveIntro.chargeEnd) *
                (1 -
                    Math.max(0, burstAge / (overdriveIntro.duration - overdriveIntro.burstAt)))
            : ultimatePresence;
        const introShake = state.phase === 'breaking' && impactAge >= 0
            ? Math.max(Math.max(0, 1 - impactAge / 0.14) * 0.32, burstAge >= 0 ? Math.max(0, 1 - burstAge / 0.28) * 0.46 : 0)
            : 0;
        const shakeTime = state.phase === 'breaking' ? state.phaseTime : this.elapsed;
        const shift = this.effects.reducedMotion
            ? 0
            : Math.sin(shakeTime * 91) * Math.max(this.shake, introShake) * 0.45;
        const focus = this.effects.reducedMotion
            ? 0
            : Math.max(presence * 0.12, feedback.zoom);
        this.camera.zoom = 1 + focus;
        this.camera.updateProjectionMatrix();
        const focusPoint = state.barrage
            ? {
                x: (state.barrage.destination.x + state.barrage.target.x) / 2,
                z: (state.barrage.destination.z + state.barrage.target.z) / 2,
            }
            : state.phase === 'overdrive' || feedback.strikes.length > 0
                ? feedback.focus
                : state.player;
        const kick = this.effects.reducedMotion ? { x: 0, z: 0 } : feedback.kick;
        this.camera.position.set(shift + focusPoint.x * focus + kick.x, cameraHeight + shift * 0.4, cameraDepth + focusPoint.z * focus + kick.z);
        const heroPoint = state.barrage
            ? barragePose(state.barrage).point
            : state.action?.driveBeat !== undefined
                ? actionPosition(state.action)
                : state.player;
        this.halo.position.set(heroPoint.x, 2.5, heroPoint.z);
        this.halo.intensity = this.driveMix * 13 + presence * 12;
        this.sunlight.intensity =
            arenaLighting.sunlight *
                (1 - this.driveMix * 0.375) *
                (1 - presence * 0.72);
        this.ambient.intensity = arenaLighting.ambient * (1 - presence * 0.7);
        for (const fighter of [state.player, ...state.enemies])
            this.fighters.get(fighter.id).render(fighter, {
                phase: state.phase,
                phaseTime: state.phaseTime,
                action: state.action,
                guarding: fighter.id === 0 && state.guarding,
                dt: motionDt,
                reducedMotion: this.effects.reducedMotion,
                barrage: state.barrage,
                returning: fighter.id === 0 ? state.returning : null,
                drunken: fighter.id === 0 && state.drunken.turns > 0,
            });
        const target = state.enemies.find((enemy) => enemy.id === state.targetId && enemy.health > 0);
        this.ring.visible =
            !!target &&
                ((state.phase === 'command' &&
                    selection.selectingTarget &&
                    !selection.areaCenter) ||
                    state.phase === 'overdrive');
        if (target) {
            this.ring.position.set(target.x, 0.046, target.z);
            this.ring.scale.setScalar(target.radius + 0.3 + Math.sin(this.elapsed * 4) * 0.025);
        }
        for (const enemy of state.enemies) {
            const ring = this.affectedRings.get(enemy.id);
            ring.visible =
                selection.selectingTarget &&
                    (selection.areaCenter !== null || enemy.id !== state.targetId) &&
                    selection.affectedIds.includes(enemy.id) &&
                    enemy.health > 0;
            ring.position.set(enemy.x, 0.046, enemy.z);
            ring.scale.setScalar(enemy.radius + 0.3);
        }
        this.areaMarker.visible =
            state.phase === 'command' && selection.areaCenter !== null;
        if (selection.areaCenter)
            this.areaMarker.position.set(selection.areaCenter.x, 0.045, selection.areaCenter.z);
        this.skillEffects.render(dt, this.effects.reducedMotion);
        this.aura.material.opacity = this.driveMix * 0.8;
        this.aura.position.set(heroPoint.x, 0.047, heroPoint.z);
        this.aura.scale.setScalar(1.15 + Math.sin(this.elapsed * 11) * 0.12);
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.age += motionDt;
            if (spark.age >= spark.life) {
                this.scene.remove(spark.mesh);
                this.sparks.splice(i, 1);
                continue;
            }
            spark.mesh.position
                .copy(spark.origin)
                .addScaledVector(spark.velocity, spark.age);
            spark.mesh.position.y -= spark.age * spark.age * 4;
            spark.mesh.scale.set(0.05, 0.24 * (1 - spark.age / spark.life), 0.05);
            spark.mesh.rotation.set(0, 0, i + spark.age * 8);
        }
        this.camera.layers.set(resourceLayers.environment);
        this.composer.render(dt);
        const background = this.scene.background;
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.scene.background = null;
        // 배경 윤곽 패스가 남긴 깊이에 캐릭터와 전투 표식을 겹쳐 가림을 맞춘다.
        this.camera.layers.set(resourceLayers.character);
        this.camera.layers.enable(resourceLayers.effects);
        this.renderer.render(this.scene, this.camera);
        this.camera.layers.set(resourceLayers.environment);
        this.scene.background = background;
        this.renderer.autoClear = true;
    }
    project(point, height = 0) {
        const projected = new THREE.Vector3(point.x, height, point.z).project(this.camera);
        return {
            x: ((projected.x + 1) * this.width) / 2,
            z: ((1 - projected.y) * this.height) / 2,
        };
    }
    projectEnemyLabel(enemy) {
        const anchor = this.fighters.get(enemy.id)?.staggerLabelAnchor();
        return anchor
            ? this.project(anchor, anchor.y)
            : this.project(enemy, enemy.kind === 'yeti' ? 3.7 : 2.15);
    }
    groundAt(point) {
        if (this.width <= 0 || this.height <= 0)
            return null;
        this.camera.updateMatrixWorld();
        this.pointerRay.setFromCamera(new THREE.Vector2((point.x / this.width) * 2 - 1, 1 - (point.z / this.height) * 2), this.camera);
        const hit = this.pointerRay.ray.intersectPlane(this.groundPlane, new THREE.Vector3());
        return hit ? { x: hit.x, z: hit.z } : null;
    }
    pickGround(client) {
        const bounds = this.canvas.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0)
            return null;
        return this.groundAt({
            x: ((client.x - bounds.left) * this.width) / bounds.width,
            z: ((client.y - bounds.top) * this.height) / bounds.height,
        });
    }
    moveGroundPoint(point, offset) {
        const screen = this.project(point);
        return this.groundAt({ x: screen.x + offset.x, z: screen.z + offset.z });
    }
    pick(client, state) {
        const bounds = this.canvas.getBoundingClientRect();
        const x = client.x - bounds.left;
        const y = client.y - bounds.top;
        let best = Infinity;
        let id = null;
        for (const enemy of state.enemies) {
            if (enemy.health <= 0)
                continue;
            const feet = this.project(enemy);
            const head = this.project(enemy, enemy.kind === 'yeti' ? 3 : 1.6);
            if (y < head.z - 18 ||
                y > feet.z + 12 ||
                Math.abs(x - feet.x) > (enemy.kind === 'yeti' ? 65 : 45))
                continue;
            const distance = Math.hypot(x - feet.x, y - (head.z + feet.z) / 2);
            if (distance < best) {
                best = distance;
                id = enemy.id;
            }
        }
        return id;
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        if (bounds.width === this.width &&
            bounds.height === this.height &&
            this.renderer.getPixelRatio() === dpr)
            return;
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.width, this.height, false);
        this.outlinePass.setPixelRatio(dpr);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(this.width, this.height);
        const aspect = this.width / this.height;
        const halfHeight = Math.max(6.1, 7.8 / aspect);
        // 전투를 조금 위로 잡아 캐릭터 발밑 명령창과 하단 상태창 공간을 남긴다.
        const hudOffset = halfHeight * 0.18;
        Object.assign(this.camera, {
            left: -halfHeight * aspect,
            right: halfHeight * aspect,
            top: halfHeight - hudOffset,
            bottom: -halfHeight - hudOffset,
        });
        this.camera.updateProjectionMatrix();
    }
    get diagnostics() {
        return {
            pixelRatio: this.renderer.getPixelRatio(),
            particles: this.sparks.length,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.arena.dispose();
        this.scene.remove(this.skillEffects.group);
        this.skillEffects.dispose();
        this.fighters.forEach((fighter) => {
            this.scene.remove(fighter.group, fighter.shadow);
            fighter.dispose();
        });
        const geometries = new Set([this.sparkGeometry]);
        const materials = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                if (Array.isArray(object.material))
                    object.material.forEach((material) => materials.add(material));
                else
                    materials.add(object.material);
            }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.textures.dispose();
        this.sunlight.shadow.dispose();
        this.sparkMaterial.dispose();
        this.rageSparkMaterial.dispose();
        this.skillSparkMaterial.dispose();
        this.outlinePass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
