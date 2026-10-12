import { spritePickDistance } from './battle-picking.js';
import { isMonsterId, monsterDefinition, } from './monster-catalog.js';
import { monsterAnimations, monsterNativeFacing, monsterAttackPlan, } from './monster-motions.js';
import { yeonmukAssetId, yeonmukBattleAnimations, } from '../../resources/characters/yeonmuk/yeonmuk-visual.js';
import { yeonmukVfxAnimations } from '../../resources/effects/yeonmuk/yeonmuk-vfx.js';
import { PartyEffects } from './party-effects.js';
import { mapStyles } from '../../rendering/map-art-direction.js';
import { SpriteTextures } from '../../rendering/sprite-textures.js';
import { ResourceOutlinePass } from '../../rendering/resource-outline-pass.js';
import { setResourceOutline } from '../../resources/environment/environment-resources.js';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import { BattleArena } from './battle-arena.js';
import { SkillEffects } from './skill-effects.js';
import { sweepRadius } from './battle-skills.js';
import { elementRules, } from './element-interactions.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { BattleSprite, cameraHeight, cameraDepth } from './battle-sprite.js';
import { actionPosition, } from './world.js';
import { overdriveIntro } from './overdrive-intro.js';
import { barragePose, tigerBarrageRules } from './tiger-barrage.js';
const assetIds = {
    yeonmuk: yeonmukAssetId,
    ataho: 'ai/tiger-hero',
    slime: 'ai/slime',
    yeti: 'ai/yeti',
    mushroom: 'ai/mushroom-spirit',
    wolf: 'ai/forest-wolf',
    boar: 'ai/armored-boar',
};
const atahoMotions = new Set([
    'drink',
    'hiccup',
    'crouch',
    'attack1',
    'battle-kick',
    'somersault',
    'flying-kick',
    'battle-ready',
    'straight-punch',
    'tiger-fist',
    'overdrive-charge',
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
    'move-front-left',
    'move-front-right',
    'move-back-left',
    'move-back-right',
]);
// 계약의 좌표를 그리는 형상만 소유하며 충돌이나 이동 판정에는 사용하지 않는다.
function clearInteractionGroup(group) {
    const geometries = new Set();
    const materials = new Set();
    group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
            geometries.add(object.geometry);
            if (Array.isArray(object.material))
                object.material.forEach((material) => materials.add(material));
            else
                materials.add(object.material);
        }
    });
    group.clear();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
}
function interactionRing(group, point, radius, color, fill = false) {
    const mesh = new THREE.Mesh(fill
        ? new THREE.CircleGeometry(radius, 48)
        : new THREE.RingGeometry(Math.max(0, radius - 0.035), radius, 48), new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: fill ? 0.16 : 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(point.x, 0.065, point.z);
    mesh.layers.set(resourceLayers.effects);
    group.add(mesh);
}
function interactionPath(group, path, color) {
    if (path.length < 2)
        return;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.map((point) => new THREE.Vector3(point.x, 0.075, point.z))), new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        dashSize: 0.15,
        gapSize: 0.07,
        depthWrite: false,
    }));
    line.computeLineDistances();
    line.layers.set(resourceLayers.effects);
    group.add(line);
}
export class BattleScene {
    canvas;
    effects;
    skillEffects = new SkillEffects();
    areaMarker = new THREE.Group();
    interactionPreview = new THREE.Group();
    fireFields = new THREE.Group();
    fieldGroups = new Map();
    indicators = new Map();
    displacements = new Map();
    fieldDisplacements = new Map();
    previewKey = '';
    fieldsKey = '';
    iceSparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xa4e6ff,
        transparent: true,
        depthWrite: false,
    });
    fireSparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xffb367,
        transparent: true,
        depthWrite: false,
    });
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    pointerRay = new THREE.Raycaster();
    affectedRings = new Map();
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-11, 11, 8, -8, 0.1, 100);
    renderer;
    composer;
    outlinePass;
    outputPass = new OutputPass();
    arena;
    style;
    sparkGeometry = new THREE.BoxGeometry(1, 1, 1);
    textures = new SpriteTextures();
    partyEffects;
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
    healingMaterial = new THREE.MeshBasicMaterial({
        color: 0x76efb2,
        transparent: true,
        depthWrite: false,
    });
    sunlight = new THREE.DirectionalLight(mapStyles.battle.sunlight, mapStyles.battle.sunStrength);
    ambient = new THREE.HemisphereLight(mapStyles.battle.sky, mapStyles.battle.shade, mapStyles.battle.skyStrength);
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
        // 현재 전투의 지역 적 구성에서 배경 톤만 선택한다. 전투 판정·배치는 그대로 사용한다.
        this.style = state.enemies.some((enemy) => enemy.kind === 'mushroom')
            ? mapStyles.mushroom
            : state.enemies.some((enemy) => enemy.kind === 'wolf' || enemy.kind === 'boar')
                ? mapStyles.deepForest
                : state.enemies.some((enemy) => enemy.kind === 'yeti')
                    ? mapStyles.ridge
                    : mapStyles.battle;
        this.partyEffects = new PartyEffects(this.textures, state.companion ? yeonmukVfxAnimations() : new Map());
        this.arena = new BattleArena(this.style);
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
        this.scene.background = new THREE.Color(this.style.background);
        this.composer = new EffectComposer(this.renderer);
        this.outlinePass = new ResourceOutlinePass(this.scene, this.camera, this.scene.background);
        for (const { id, recommendedPixelSize } of outlineGroups)
            this.outlinePass.setPixelSize(id, recommendedPixelSize);
        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.outputPass);
        this.composer.addPass(this.outlinePass.smoothingPass);
        this.scene.fog = new THREE.Fog(this.style.background, 39, 62);
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
        this.scene.add(this.ring, this.aura, this.skillEffects.group, this.interactionPreview, this.fireFields);
        if (state.interactions)
            for (const enemy of state.enemies) {
                const root = new THREE.Group();
                const ice = new THREE.Group();
                const ember = new THREE.Group();
                for (let index = 0; index < 3; index++) {
                    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshBasicMaterial({
                        color: 0xa4e6ff,
                        transparent: true,
                        opacity: 0.78,
                        depthWrite: false,
                    }));
                    const angle = (index / 3) * Math.PI * 2;
                    crystal.position.set(Math.cos(angle) * (enemy.radius + 0.1), 0.45 + index * 0.14, Math.sin(angle) * (enemy.radius + 0.1));
                    crystal.scale.y = 1.5;
                    ice.add(crystal);
                    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({
                        color: index === 1 ? 0xffdc92 : 0xff9b55,
                        transparent: true,
                        opacity: 0.92,
                        depthWrite: false,
                    }));
                    flame.position.set((index - 1) * 0.18, 0.8 + (index === 1 ? 0.13 : 0), 0);
                    flame.scale.y = 1.6;
                    ember.add(flame);
                }
                root.add(ice, ember);
                root.traverse((object) => object.layers.set(resourceLayers.effects));
                this.indicators.set(enemy.id, { root, ice, ember });
                this.scene.add(root);
            }
        const areaEdge = new THREE.MeshBasicMaterial({
            color: 0xff5267,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const areaFill = areaEdge.clone();
        areaFill.opacity = 0.14;
        const rim = new THREE.Mesh(new THREE.RingGeometry(0.982, 1, 96), areaEdge);
        const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 96), areaFill);
        rim.rotation.x = fill.rotation.x = -Math.PI / 2;
        const center = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.045), areaEdge);
        const cross = center.clone();
        cross.rotation.y = Math.PI / 2;
        this.areaMarker.add(fill, rim, center, cross);
        this.areaMarker.traverse((object) => object.layers.set(resourceLayers.effects));
        this.areaMarker.visible = false;
        this.scene.add(this.areaMarker, this.partyEffects.group);
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
        for (const kind of new Set([
            state.player,
            ...(state.companion ? [state.companion] : []),
            ...state.enemies,
        ].map((fighter) => fighter.kind))) {
            if (isMonsterId(kind)) {
                const animations = monsterAnimations(kind);
                monsterNativeFacing(kind);
                monsterAttackPlan(kind);
                this.animations.set(kind, new Map(animations));
                continue;
            }
            if (kind === 'yeonmuk') {
                this.animations.set(kind, new Map(yeonmukBattleAnimations()));
                continue;
            }
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
        for (const fighter of [
            state.player,
            ...(state.companion ? [state.companion] : []),
            ...state.enemies,
        ]) {
            const sprite = new BattleSprite(this.animations.get(fighter.kind), this.textures, fighter);
            setResourceOutline(sprite.shadow, 'ground');
            this.fighters.set(fighter.id, sprite);
            this.scene.add(sprite.group, sprite.shadow);
        }
    }
    async load() {
        const paths = new Set([...this.animations.values()].flatMap((motions) => [...motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))));
        for (const path of this.partyEffects.paths)
            paths.add(path);
        await Promise.all([
            this.arena.load(),
            this.textures.load(paths, '전투 이미지를 불러오지 못했어요. 이 전투의 로컬 캐릭터 리소스를 확인해 주세요.'),
        ]);
    }
    addImpacts(impacts) {
        this.skillEffects.addImpacts(impacts);
        this.partyEffects.addImpacts(impacts);
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
                const mesh = new THREE.Mesh(this.sparkGeometry, impact.interaction === 'ice-shards'
                    ? this.iceSparkMaterial
                    : impact.interaction === 'fire'
                        ? this.fireSparkMaterial
                        : impact.barrage
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
    addInteractionEvents(events) {
        for (const event of events) {
            if (event.kind === 'displace' &&
                event.from &&
                event.to &&
                !this.effects.reducedMotion) {
                const motion = { from: event.from, to: event.to, elapsed: 0 };
                if (event.fieldId !== undefined)
                    this.fieldDisplacements.set(event.fieldId, motion);
                else
                    for (const id of event.enemyIds)
                        this.displacements.set(id, { ...motion });
            }
            if (event.kind !== 'shatter' && event.kind !== 'collision')
                continue;
            if (this.effects.reducedMotion)
                continue;
            const count = event.kind === 'shatter' ? 8 : 4;
            for (let index = 0; index < count; index++) {
                const angle = (index / count) * Math.PI * 2;
                const mesh = new THREE.Mesh(this.sparkGeometry, event.kind === 'shatter' ? this.iceSparkMaterial : this.sparkMaterial);
                mesh.layers.set(resourceLayers.effects);
                const origin = new THREE.Vector3(event.point.x, 0.65, event.point.z);
                mesh.position.copy(origin);
                this.scene.add(mesh);
                this.sparks.push({
                    mesh,
                    origin,
                    velocity: new THREE.Vector3(Math.cos(angle) * 2.2, 1.8, Math.sin(angle) * 2.2),
                    age: 0,
                    life: 0.45,
                });
            }
        }
    }
    visualPoint(motions, id, fallback) {
        const motion = motions.get(id);
        if (!motion)
            return fallback;
        const mix = 1 - Math.pow(1 - Math.min(1, motion.elapsed / 0.3), 3);
        return {
            x: motion.from.x + (motion.to.x - motion.from.x) * mix,
            z: motion.from.z + (motion.to.z - motion.from.z) * mix,
        };
    }
    renderInteractions(state, preview, dt) {
        for (const motions of [this.displacements, this.fieldDisplacements])
            for (const [id, motion] of motions) {
                motion.elapsed += dt;
                if (motion.elapsed >= 0.3)
                    motions.delete(id);
            }
        const fields = state.interactions?.fields ?? [];
        const fieldsKey = JSON.stringify(fields);
        if (fieldsKey !== this.fieldsKey) {
            this.fieldsKey = fieldsKey;
            clearInteractionGroup(this.fireFields);
            this.fieldGroups.clear();
            for (const field of fields) {
                const group = new THREE.Group();
                interactionRing(group, { x: 0, z: 0 }, field.radius, 0xff9b55, true);
                interactionRing(group, { x: 0, z: 0 }, field.radius, 0xffb96a);
                this.fireFields.add(group);
                this.fieldGroups.set(field.id, group);
            }
        }
        for (const field of fields) {
            const point = this.visualPoint(this.fieldDisplacements, field.id, field.center);
            this.fieldGroups.get(field.id)?.position.set(point.x, 0, point.z);
        }
        for (const enemy of state.enemies) {
            const indicator = this.indicators.get(enemy.id);
            if (!indicator)
                continue;
            const point = this.visualPoint(this.displacements, enemy.id, enemy);
            indicator.root.position.set(point.x, 0, point.z);
            indicator.ice.visible =
                enemy.health > 0 &&
                    !!state.interactions?.frozen.some((entry) => entry.enemyId === enemy.id);
            indicator.ember.visible =
                enemy.health > 0 &&
                    !!state.interactions?.embers.some((entry) => entry.enemyId === enemy.id);
        }
        const previewKey = JSON.stringify([
            preview,
            preview
                ? state.enemies.map(({ id, x, z, radius }) => ({ id, x, z, radius }))
                : null,
        ]);
        if (previewKey === this.previewKey)
            return;
        this.previewKey = previewKey;
        clearInteractionGroup(this.interactionPreview);
        if (!preview)
            return;
        const fighter = (id) => state.enemies.find((enemy) => enemy.id === id);
        for (const move of preview.moves) {
            const color = move.blockedBy ? 0xffcb8b : 0xb4f0d8;
            interactionPath(this.interactionPreview, move.path, color);
            interactionRing(this.interactionPreview, move.to, (fighter(move.enemyId)?.radius ?? 0.4) + 0.1, color);
            if (move.blockedBy) {
                const size = 0.15;
                interactionPath(this.interactionPreview, [
                    { x: move.to.x - size, z: move.to.z - size },
                    { x: move.to.x + size, z: move.to.z + size },
                ], 0xffa883);
                interactionPath(this.interactionPreview, [
                    { x: move.to.x - size, z: move.to.z + size },
                    { x: move.to.x + size, z: move.to.z - size },
                ], 0xffa883);
            }
        }
        if (preview.action === 'attack' &&
            preview.center &&
            state.interactions?.frozen.some((entry) => preview.targetIds.includes(entry.enemyId)))
            interactionRing(this.interactionPreview, preview.center, elementRules.shardRadius, 0xa4e6ff);
        for (const id of preview.shardTargetIds) {
            const enemy = fighter(id);
            if (enemy)
                interactionRing(this.interactionPreview, enemy, enemy.radius + 0.15, 0xa4e6ff);
        }
        for (const id of preview.spreadTargetIds) {
            const enemy = fighter(id);
            if (enemy)
                interactionRing(this.interactionPreview, preview.moves.find((move) => move.enemyId === id)?.to ?? enemy, enemy.radius + 0.15, 0xffb96a);
        }
        for (const pair of preview.collisionPairs) {
            const a = preview.moves.find((move) => move.enemyId === pair[0])?.to ??
                fighter(pair[0]);
            const b = fighter(pair[1]);
            if (a && b)
                interactionPath(this.interactionPreview, [a, b], 0xffa883);
        }
        for (const move of preview.fieldMoves) {
            interactionPath(this.interactionPreview, [move.from, move.to], 0xffb96a);
        }
        // 이동 후 병합이나 개수 제한으로 사라지는 장판은 도착 범위로 그리지 않는다.
        for (const field of preview.fieldResults)
            interactionRing(this.interactionPreview, field.center, field.radius, 0xffb96a);
    }
    projectFieldLabel(field) {
        return this.project(this.visualPoint(this.fieldDisplacements, field.id, field.center), 0.1);
    }
    addHealings(healings) {
        for (const healing of healings) {
            this.fighters.get(healing.sourceId)?.castHeal(healing);
            this.fighters.get(healing.targetId)?.heal();
            if (this.effects.reducedMotion)
                continue;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const mesh = new THREE.Mesh(this.sparkGeometry, this.healingMaterial);
                mesh.layers.set(1);
                const origin = new THREE.Vector3(healing.x + Math.cos(angle) * 0.35, 0.3, healing.z + Math.sin(angle) * 0.35);
                mesh.position.copy(origin);
                this.scene.add(mesh);
                this.sparks.push({
                    mesh,
                    origin,
                    velocity: new THREE.Vector3(0, 3.4, 0),
                    age: 0,
                    life: 0.55,
                });
            }
        }
    }
    reset() {
        this.skillEffects.reset();
        this.partyEffects.reset();
        this.displacements.clear();
        this.fieldDisplacements.clear();
        clearInteractionGroup(this.interactionPreview);
        clearInteractionGroup(this.fireFields);
        this.fieldGroups.clear();
        this.previewKey = this.fieldsKey = '';
        this.indicators.forEach(({ ice, ember }) => {
            ice.visible = ember.visible = false;
        });
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
        this.renderInteractions(state, selection.preview, motionDt);
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
            this.style.sunStrength *
                (1 - this.driveMix * 0.375) *
                (1 - presence * 0.72);
        this.ambient.intensity = this.style.skyStrength * (1 - presence * 0.7);
        for (const fighter of [
            state.player,
            ...(state.companion ? [state.companion] : []),
            ...state.enemies,
        ])
            this.fighters.get(fighter.id).render(fighter, {
                phase: state.phase,
                phaseTime: state.phaseTime,
                action: state.action,
                guarding: fighter.id === 0
                    ? state.guarding
                    : fighter.kind === 'yeonmuk' && state.companionGuarding,
                dt: motionDt,
                reducedMotion: this.effects.reducedMotion,
                barrage: state.barrage,
                returning: fighter.id === 0 ? state.returning : null,
                drunken: fighter.id === 0 && state.drunken.turns > 0,
                preparing: (state.healer?.enemyId === fighter.id && state.healer.ready) ||
                    (state.boar?.enemyId === fighter.id && state.boar.ready) ||
                    state.monsterStates.some((monster) => monster.enemyId === fighter.id && monster.ready),
                visualPoint: this.displacements.has(fighter.id)
                    ? this.visualPoint(this.displacements, fighter.id, fighter)
                    : null,
                frozen: !!state.interactions?.frozen.some((entry) => entry.enemyId === fighter.id),
                healing: (state.healer?.enemyId === fighter.id &&
                    state.healer.targetId !== null) ||
                    state.monsterStates.some((monster) => monster.enemyId === fighter.id &&
                        monster.healingTargetId !== null),
            });
        this.partyEffects.render(state, motionDt, this.effects.reducedMotion);
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
        this.areaMarker.scale.setScalar(selection.areaRadius ?? sweepRadius);
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
        this.arena.face(this.camera);
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
        const sprite = this.fighters.get(enemy.id);
        const anchor = sprite?.staggerLabelAnchor();
        if (anchor)
            return this.project(anchor, anchor.y);
        const height = Math.max(enemy.kind === 'yeti' ? 3.7 : 2.15, sprite?.labelHeight() ?? 0);
        return this.project(this.visualPoint(this.displacements, enemy.id, enemy), height);
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
            if (isMonsterId(enemy.kind) &&
                monsterDefinition(enemy.kind).grade !== 'normal') {
                const corners = this.fighters.get(enemy.id)?.selectionCorners() ?? [];
                const distance = spritePickDistance({ x, z: y }, corners.map((point) => this.project(point, point.y)));
                if (distance < best) {
                    best = distance;
                    id = enemy.id;
                }
                continue;
            }
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
            partyEffects: this.partyEffects.diagnostics,
            fighterFrames: [...this.fighters].map(([id, sprite]) => ({
                id,
                ...sprite.diagnostics,
            })),
            visualDisplacements: [...this.displacements].map(([id, motion]) => ({
                id,
                elapsed: motion.elapsed,
                point: this.visualPoint(this.displacements, id, motion.to),
            })),
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        clearInteractionGroup(this.interactionPreview);
        clearInteractionGroup(this.fireFields);
        this.displacements.clear();
        this.fieldDisplacements.clear();
        this.arena.dispose();
        this.scene.remove(this.skillEffects.group);
        this.skillEffects.dispose();
        this.scene.remove(this.partyEffects.group);
        this.partyEffects.dispose();
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
        this.healingMaterial.dispose();
        this.iceSparkMaterial.dispose();
        this.fireSparkMaterial.dispose();
        this.outlinePass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
