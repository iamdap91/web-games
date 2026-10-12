import { yeonmukMotions, yeonmukDisplayScale, yeonmukMotion, } from '../../characters/yeonmuk/yeonmuk-motions.js';
import { TownLifeResources } from '../../props/town-life/town-life-resources.js';
import { townLifePose } from '../../props/town-life/town-life-pose.js';
import { townLifeTiming, } from '../../../games/tiger-rpg/town-life.js';
import { alignCameraToPixelGrid } from '../../../rendering/pixel-camera.js';
import { basecampLayout } from '../../maps/basecamp/basecamp-layout.js';
import { BasecampLandscape } from '../../maps/basecamp/basecamp-landscape.js';
import { BasecampCamera } from '../../../rendering/basecamp-camera.js';
import { BasecampAtmosphere } from '../../maps/basecamp/basecamp-atmosphere.js';
import { FacilityHighlightPass } from '../../../rendering/facility-highlight-pass.js';
import { dojoConversation } from '../dojo/dojo-conversation.js';
import { DojoOwner } from '../dojo/dojo-owner.js';
import { SmithyOwner } from '../smithy/smithy-owner.js';
import { DojoCharacter } from './character.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TownHallResources } from '../town-hall/town-hall-resources.js';
import { townHallLayout, } from '../town-hall/town-hall-layout.js';
import { DojoResources } from '../dojo/dojo-resources.js';
import { KitchenResources } from '../kitchen/kitchen-resources.js';
import { SmithyResources } from '../smithy/smithy-resources.js';
import { smithyLayout } from '../smithy/smithy-layout.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import { dojoLayout } from '../dojo/dojo-layout.js';
import { EnvironmentResources } from '../../environment/environment-resources.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
export const dojoViews = ['village', 'hall', 'dojo', 'smithy'];
/** 마을 외형과 선명한 인물을 합성한다. 게임 추적은 비교 뷰어에서 명시적으로 분리한다. */
export class DojoScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 500);
    // 세로 화면의 넓은 직교 시야에서도 바닥이 카메라 뒤로 잘리지 않게 거리를 둔다.
    cameraOffset = new THREE.Vector3(Math.sin(dojoLayout.cameraYaw) * 140, 100, Math.cos(dojoLayout.cameraYaw) * 140);
    renderer;
    composer;
    pixelPass;
    highlightPass;
    outputPass = new OutputPass();
    depthMaterial = new THREE.MeshDepthMaterial({
        colorWrite: false,
    });
    hall = new TownHallResources();
    dojo = new DojoResources();
    kitchen = new KitchenResources();
    smithy = new SmithyResources();
    environment = new EnvironmentResources();
    landscape = new BasecampLandscape(this.environment);
    lifeResources;
    lifeState = null;
    kitchenLevel = 0;
    actor;
    companion;
    owner;
    smithyOwner;
    gameCamera;
    sun = new THREE.DirectionalLight();
    sky = new THREE.HemisphereLight();
    atmosphere;
    dialogue = false;
    highlightedFacility = null;
    repairReveal = false;
    snapCamera = true;
    reducedMotion = false;
    screenUp = new THREE.Vector3();
    focus = new THREE.Vector3(basecampLayout.grounds.x, 0.5, 1.2);
    view = 'village';
    width = 0;
    height = 0;
    dpr = 0;
    zoom = 1;
    disposed = false;
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.background = new THREE.Color(0xd9ddca);
        this.composer = new EffectComposer(this.renderer);
        this.pixelPass = new RenderPixelatedPass(1.5, this.scene, this.camera);
        this.pixelPass.normalEdgeStrength = 0;
        this.pixelPass.depthEdgeStrength = 0.14;
        this.composer.addPass(this.pixelPass);
        this.highlightPass = options.play
            ? new FacilityHighlightPass(this.scene, this.camera)
            : null;
        if (this.highlightPass) {
            this.highlightPass.setPixelSize(this.pixelPass.pixelSize);
            this.composer.addPass(this.highlightPass);
        }
        this.composer.addPass(this.outputPass);
        this.scene.add(this.sky);
        this.sun.position.set(-10, 20, 12);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        Object.assign(this.sun.shadow.camera, {
            left: -32,
            right: 25,
            top: 23,
            bottom: -23,
            near: 1,
            far: 60,
        });
        this.sun.shadow.normalBias = 0.035;
        this.scene.add(this.sun, this.dojo.root, this.kitchen.root, this.smithy.root, this.hall.root);
        for (const [name, resource] of [
            ['dojo', this.dojo],
            ['smithy', this.smithy],
            ['kitchen', this.kitchen],
        ]) {
            const offset = basecampLayout.placements[name];
            resource.root.position.set(offset.x, 0, offset.z);
        }
        this.scene.add(this.landscape.root);
        this.lifeResources = options.play ? new TownLifeResources() : null;
        if (this.lifeResources)
            this.scene.add(this.lifeResources.root);
        this.atmosphere = new BasecampAtmosphere({
            roots: [
                this.landscape.root,
                this.hall.root,
                this.dojo.root,
                this.kitchen.root,
                this.smithy.root,
            ],
            sky: this.sky,
            sun: this.sun,
            background: this.scene.background,
        });
        this.camera.position.copy(this.focus).add(this.cameraOffset);
        this.camera.lookAt(this.focus);
        this.screenUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.gameCamera = options.play
            ? new BasecampCamera(options.play.verticalSpan, 100 / this.cameraOffset.length())
            : null;
        const ataho = manifest.assets.find((asset) => asset.id === 'ai/tiger-hero');
        if (!ataho)
            throw new Error('아타호 모션 정보를 찾지 못했어요.');
        const motions = new Map();
        for (const [name, animation] of Object.entries(ataho.animations)) {
            if (name.startsWith('stand') ||
                name.startsWith('move') ||
                (options.play &&
                    [
                        'sit',
                        'eat',
                        'crouch',
                        'gather-down',
                        'town-chop',
                        'town-stoke',
                        'battle-ready',
                        'tiger-fist',
                        'turn-kick',
                        'work-ready',
                    ].includes(name)))
                motions.set(name, animation);
        }
        this.actor = new DojoCharacter(motions, 1 / this.screenUp.y);
        this.companion = options.companion
            ? new DojoCharacter(yeonmukMotions(), 1 / this.screenUp.y, yeonmukDisplayScale, 'frame-pivot')
            : null;
        if (this.companion) {
            this.companion.root.visible = false;
            this.scene.add(this.companion.root);
        }
        if (this.gameCamera) {
            const resource = manifest.assets.find((asset) => asset.id === 'ai/dojo-owner');
            const frame = resource?.animations.stand?.frames[0];
            if (!frame || !resource?.displayScale)
                throw new Error('도장 주인의 AI 리소스 정보를 찾지 못했어요.');
            this.owner = new DojoOwner({
                frame,
                verticalScale: 1 / this.screenUp.y,
                displayScale: resource.displayScale,
            });
            const smithyResource = manifest.assets.find((asset) => asset.id === 'ai/smithy-owner');
            const smithyFrame = smithyResource?.animations.stand?.frames[0];
            if (!smithyFrame || !smithyResource?.displayScale)
                throw new Error('대장간 장인의 AI 리소스 정보를 찾지 못했어요.');
            this.smithyOwner = new SmithyOwner({
                frame: smithyFrame,
                verticalScale: 1 / this.screenUp.y,
                displayScale: smithyResource.displayScale,
            });
        }
        else {
            this.owner = null;
            this.smithyOwner = null;
        }
        this.scene.add(this.actor.root);
        if (this.owner)
            this.scene.add(this.owner.root);
        if (this.smithyOwner)
            this.scene.add(this.smithyOwner.root);
    }
    async load() {
        await Promise.all([
            this.landscape.load(),
            this.smithy.load(),
            this.hall.load(),
            this.kitchen.load(),
            this.lifeResources?.load(),
            this.actor.load(),
            this.companion?.load(),
            this.owner?.load(),
            this.smithyOwner?.load(),
        ]);
    }
    setTownLife(state, kitchenLevel) {
        if (this.lifeState?.repairs.path !== state.repairs.path ||
            state.action?.kind === 'chop')
            this.renderer.shadowMap.needsUpdate = true;
        this.lifeState = state;
        this.kitchenLevel = kitchenLevel;
        this.lifeResources?.update(state, kitchenLevel);
        this.kitchen.setHearthWarmth(state.warmth / townLifeTiming.warmth);
    }
    setDialogue(blocked) {
        if (this.dialogue === blocked)
            return;
        this.dialogue = blocked;
        // 초기 배치·크기 변경은 즉시 맞추고 대화 모드 전환만 보간한다.
        this.snapCamera ||= this.reducedMotion;
    }
    setRepairReveal(active) {
        if (this.repairReveal === active)
            return;
        this.repairReveal = active;
        this.snapCamera ||= this.reducedMotion;
    }
    setReducedMotion(reduced) {
        this.reducedMotion = reduced;
        if (reduced)
            this.snapCamera = true;
    }
    setStage(stage) {
        this.dojo.setStage(stage);
        this.syncFacilityHighlight();
        // 상태별 처마와 마루가 달라지므로 전환할 때만 정적 그림자를 다시 만든다.
        this.renderer.shadowMap.needsUpdate = true;
    }
    setExpeditionSupplies(visible) {
        this.landscape.setExpeditionSupplies(visible);
        this.renderer.shadowMap.needsUpdate = true;
    }
    setZoom(zoom) {
        this.zoom = Math.min(1.5, Math.max(0.85, zoom));
        this.width = 0;
    }
    setLoggingRoute(opened) {
        this.landscape.setLoggingRoute(opened);
        this.renderer.shadowMap.needsUpdate = true;
    }
    setKitchenStage(stage) {
        this.kitchen.setStage(stage);
        this.landscape.setKitchenSupplies(stage !== 'weathered');
        this.syncFacilityHighlight();
        this.renderer.shadowMap.needsUpdate = true;
    }
    setHallLevel(level) {
        this.hall.setLevel(level);
        this.atmosphere.setLevel(level);
        this.renderer.shadowMap.needsUpdate = true;
    }
    setSmithyLevel(level) {
        this.smithy.setLevel(level);
        this.smithyOwner?.setLevel(level);
        this.syncFacilityHighlight();
        this.renderer.shadowMap.needsUpdate = true;
    }
    setHighlightedFacility(facility) {
        if (this.highlightedFacility === facility)
            return;
        this.highlightedFacility = facility;
        this.syncFacilityHighlight();
    }
    syncFacilityHighlight() {
        if (!this.highlightPass)
            return;
        const structure = this.highlightedFacility
            ? this[this.highlightedFacility].interactionStructure
            : undefined;
        this.highlightPass.selectedObjects = structure ? [structure] : [];
        this.highlightPass.enabled = !!structure;
    }
    setView(view) {
        this.view = view;
        const focus = {
            village: { x: basecampLayout.grounds.x, z: 1.2 },
            hall: {
                x: townHallLayout.building.x,
                z: townHallLayout.building.z + 2.6,
            },
            dojo: { x: basecampLayout.placements.dojo.x, z: -0.4 },
            smithy: {
                x: smithyLayout.yard.x + basecampLayout.placements.smithy.x,
                z: smithyLayout.yard.z + basecampLayout.placements.smithy.z,
            },
        }[view];
        this.focus.set(focus.x, 0.5, focus.z);
        this.camera.position.copy(this.focus).add(this.cameraOffset);
        this.camera.lookAt(this.focus);
        this.width = 0;
    }
    render(player, dt, companion = null) {
        if (this.disposed)
            return;
        this.resize();
        if (this.gameCamera) {
            const target = this.repairReveal
                ? { x: basecampLayout.placements.dojo.x, z: 0.5 }
                : this.dialogue
                    ? dojoConversation.focus
                    : player;
            const point = this.gameCamera.follow(target, {
                aspect: this.width / Math.max(1, this.height),
                delta: dt,
                snap: this.snapCamera,
            });
            this.snapCamera = false;
            this.focus.set(point.x, 0.7, point.z);
            this.camera.position.copy(this.focus).add(this.cameraOffset);
            this.camera.lookAt(this.focus);
            // 확대 전 배경의 실제 렌더 크기에 맞춰 이음매가 프레임마다 다시 잘리지 않게 한다.
            alignCameraToPixelGrid(this.camera, {
                width: (this.width * this.dpr) / this.pixelPass.pixelSize,
                height: (this.height * this.dpr) / this.pixelPass.pixelSize,
            });
        }
        const suffix = player.facing === 'front' ? '' : `-${player.facing}`;
        const lifePose = this.lifeState?.action
            ? townLifePose(this.lifeState.action)
            : null;
        this.actor.render({
            x: player.x,
            y: player.y,
            z: player.z,
            motion: `${player.moving ? 'move' : 'stand'}${suffix}`,
            delta: dt,
            ...lifePose,
        });
        if (this.companion) {
            this.companion.root.visible = companion !== null;
            if (companion)
                this.companion.render({
                    x: companion.x,
                    y: companion.y,
                    z: companion.z,
                    motion: yeonmukMotion(companion),
                    delta: dt,
                });
        }
        this.landscape.face(this.camera);
        this.smithy.face(this.camera);
        this.hall.face(this.camera);
        this.kitchen.face(this.camera);
        this.lifeResources?.face(this.camera);
        this.owner?.face(this.dialogue ? player : null);
        this.kitchen.update(dt);
        this.smithy.update(dt);
        this.camera.layers.set(resourceLayers.environment);
        this.composer.render(dt);
        this.renderActor();
    }
    renderActor() {
        const background = this.scene.background;
        try {
            this.renderer.setRenderTarget(null);
            this.renderer.autoClear = false;
            this.renderer.clearDepth();
            this.scene.background = null;
            this.actor.shadow.visible = false;
            if (this.companion)
                this.companion.shadow.visible = false;
            if (this.owner)
                this.owner.shadow.visible = false;
            if (this.smithyOwner)
                this.smithyOwner.shadow.visible = false;
            this.scene.overrideMaterial = this.depthMaterial;
            this.renderer.render(this.scene, this.camera);
            this.scene.overrideMaterial = null;
            this.camera.layers.set(resourceLayers.character);
            this.renderer.render(this.scene, this.camera);
            // 김과 연기는 배경·캐릭터의 깊이를 보존한 채 마지막에 합성한다.
            this.camera.layers.set(resourceLayers.effects);
            this.renderer.render(this.scene, this.camera);
        }
        finally {
            this.scene.background = background;
            this.scene.overrideMaterial = null;
            this.actor.shadow.visible = true;
            if (this.companion)
                this.companion.shadow.visible = true;
            if (this.owner)
                this.owner.shadow.visible = true;
            if (this.smithyOwner)
                this.smithyOwner.shadow.visible = true;
            this.camera.layers.set(resourceLayers.environment);
            this.renderer.autoClear = true;
        }
    }
    resize() {
        const { width, height } = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (width === this.width && height === this.height && dpr === this.dpr)
            return;
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(width, height);
        this.pixelPass.setPixelSize(1.5 * dpr);
        this.highlightPass?.setPixelSize(this.pixelPass.pixelSize);
        const aspect = width / Math.max(height, 1);
        const framing = {
            village: { height: 14.6, width: 25.3 },
            hall: { height: 9.5, width: 10.8 },
            dojo: { height: 7.1, width: 8.9 },
            smithy: { height: 5.1, width: 6 },
        }[this.view];
        const halfHeight = this.gameCamera
            ? this.gameCamera.verticalSpan / 2
            : Math.max(framing.height, framing.width / aspect) / this.zoom;
        this.snapCamera = true;
        Object.assign(this.camera, {
            left: -halfHeight * aspect,
            right: halfHeight * aspect,
            top: halfHeight,
            bottom: -halfHeight,
        });
        this.camera.updateProjectionMatrix();
    }
    projectPoint(point) {
        const projected = new THREE.Vector3(point.x, point.y, point.z).project(this.camera);
        return {
            x: ((projected.x + 1) * this.width) / 2,
            y: ((1 - projected.y) * this.height) / 2,
            visible: Math.abs(projected.x) < 0.95 &&
                Math.abs(projected.y) < 0.9 &&
                Math.abs(projected.z) <= 1,
        };
    }
    getSpeakerHead(speaker) {
        if (this.disposed)
            return null;
        const actor = speaker === 'ataho'
            ? this.actor
            : speaker === 'yeonmuk'
                ? this.companion?.root.visible
                    ? this.companion
                    : null
                : this.owner;
        return actor ? this.projectPoint(actor.head) : null;
    }
    get diagnostics() {
        return {
            ...this.actor.diagnostics,
            atahoHead: this.getSpeakerHead('ataho'),
            ownerHead: this.getSpeakerHead('dojo-owner'),
            highlightedFacility: this.highlightPass?.enabled
                ? this.highlightedFacility
                : null,
            cameraFocus: { x: this.focus.x, z: this.focus.z },
            verticalSpan: this.camera.top - this.camera.bottom,
            cameraMode: this.gameCamera ? 'follow' : 'preview',
            zoom: this.zoom,
            textures: this.renderer.info.memory.textures,
            geometries: this.renderer.info.memory.geometries,
            townLife: this.lifeState,
            kitchenLevel: this.kitchenLevel,
            kitchen: this.kitchen.diagnostics,
            smithy: this.smithy.diagnostics,
            view: this.view,
            hall: this.hall.diagnostics,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.hall.dispose();
        this.dojo.dispose();
        this.kitchen.dispose();
        this.smithy.dispose();
        this.lifeResources?.dispose();
        this.landscape.dispose();
        this.environment.dispose();
        this.actor.dispose();
        this.companion?.dispose();
        this.owner?.dispose();
        this.smithyOwner?.dispose();
        this.sun.shadow.dispose();
        this.depthMaterial.dispose();
        this.pixelPass.dispose();
        this.highlightPass?.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
