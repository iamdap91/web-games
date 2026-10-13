import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import { forestPlaces, rootHeight } from './layout.js';
import { ForestScenery } from './scenery.js';
/** 카메라 투영과 원본 RGBA 접지, 입출력의 같은 곡면을 담당한다. */
export class ForestScene {
    canvas;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 120);
    textures = new SpriteTextures();
    motions = new Map([...trailMotions('ai/tiger-hero', true)].filter(([id]) => /^(stand|move)(-(back|left|right))?$/.test(id)));
    actor = new TrailSprite(this.motions, this.textures, 38, 0.26, 'frame-pivot');
    scenery = new ForestScenery();
    sun = new THREE.DirectionalLight(0xffe4b2, 2.0);
    raycaster = new THREE.Raycaster();
    width = 1;
    height = 1;
    renderCount = 0;
    disposed = false;
    correction = 1;
    yaw = 0;
    lastState = null;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
            preserveDrawingBuffer: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.scene.background = new THREE.Color(0x9ca98c);
        this.scene.fog = new THREE.Fog(0x9ca98c, 39, 76);
        this.sun.position.set(-12, 25, 12);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        Object.assign(this.sun.shadow.camera, {
            left: -22,
            right: 22,
            top: 22,
            bottom: -22,
            near: 1,
            far: 70,
        });
        this.sun.shadow.normalBias = 0.035;
        this.sun.layers.enableAll();
        const sky = new THREE.HemisphereLight(0xd0d8ba, 0x484e3c, 1.4);
        sky.layers.enableAll();
        this.camera.layers.enableAll();
        this.scene.add(this.scenery.root, this.actor.mesh, this.actor.shadow, this.sun, sky);
    }
    async load() {
        await this.textures.load(new Set([...this.motions.values()].flatMap((m) => m.frames.map((f) => f.localPath))), '승인된 아타호 프레임을 불러오지 못했어요.');
    }
    render(state, delta, options) {
        if (this.disposed)
            return;
        this.lastState = state;
        this.renderCount++;
        this.resize(options);
        const units = (this.camera.right - this.camera.left) / this.canvas.width;
        const x = Math.round((options.overview
            ? 0
            : THREE.MathUtils.clamp(state.player.x, -4, 4)) / units) * units, z = Math.round((options.overview
            ? -0.3
            : THREE.MathUtils.clamp(state.player.z, -2, 2)) / units) * units;
        const dx = options.overview ? 19 : 10, dz = options.overview ? 23 : 21, dy = options.overview ? 27 : 21;
        this.camera.position.set(x + dx, dy, z + dz);
        this.camera.lookAt(x, 0.5, z);
        this.camera.updateMatrixWorld();
        const facing = cardinalFacing(state.player.facing), suffix = facing === 'front' ? '' : `-${facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        const depth = Math.hypot(dx, dz);
        this.correction = Math.hypot(depth, dy - 0.5) / depth;
        this.yaw = Math.atan2(dx, dz);
        this.actor.mesh.rotation.set(0, this.yaw, 0);
        this.actor.mesh.scale.y = this.correction;
        this.actor.mesh.position.y = state.player.y + 0.03;
        this.actor.shadow.position.y = state.player.y + 0.022;
        this.scenery.update(state, delta);
        this.renderer.render(this.scene, this.camera);
    }
    resize(options) {
        const box = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, box.width);
        this.height = Math.max(1, box.height);
        const w = Math.max(1, Math.floor(this.width / 2)), h = Math.max(1, Math.floor(this.height / 2));
        if (this.canvas.width !== w || this.canvas.height !== h)
            this.renderer.setSize(w, h, false);
        const half = options.overview
            ? Math.max(10.5, (11.5 * this.height) / this.width)
            : Math.max(6.5, (7.3 * this.height) / this.width);
        Object.assign(this.camera, {
            left: (-half * this.width) / this.height,
            right: (half * this.width) / this.height,
            top: half,
            bottom: -half,
        });
        this.camera.updateProjectionMatrix();
    }
    groundFromPointer(clientX, clientY) {
        const box = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - box.left) / box.width) * 2 - 1, (-(clientY - box.top) / box.height) * 2 + 1), this.camera);
        const point = this.raycaster.intersectObjects([
            this.scenery.ground,
            ...(this.lastState?.shortcut === 'open'
                ? [this.scenery.bridgeGround]
                : []),
        ], false)[0]?.point;
        return point ? { x: point.x, z: point.z } : null;
    }
    project(point) {
        const p = new THREE.Vector3(point.x, rootHeight(point), point.z).project(this.camera);
        return Object.freeze({
            x: ((p.x + 1) * this.width) / 2,
            y: ((1 - p.y) * this.height) / 2,
        });
    }
    get screenPositions() {
        return Object.freeze(Object.fromEntries(forestPlaces.map((p) => [p.id, this.project(p)])));
    }
    get diagnostics() {
        const frame = this.actor.animation.currentFrame.frame;
        return Object.freeze({
            ...this.scenery.diagnostics,
            renderCount: this.renderCount,
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            cssWidth: this.width,
            cssHeight: this.height,
            devicePixelRatio: devicePixelRatio,
            actorY: this.actor.mesh.position.y,
            groundY: this.lastState?.player.y ?? null,
            actorYaw: this.yaw,
            actorPitch: this.actor.mesh.rotation.x,
            actorPitchCorrection: this.correction,
            actorFrame: Object.freeze({
                width: frame.width,
                height: frame.height,
                pivot: Object.freeze({ ...frame.pivot }),
                path: frame.localPath,
            }),
            actorFrameCount: [...this.motions.values()].reduce((n, m) => n + m.frames.length, 0),
            actorFrameIndex: this.actor.animation.currentFrame.index,
            actorOriginalRgba: true,
            worldAxes: 'x/y/z; y = height',
            geometryAndMovementUseSameHeight: true,
            clickUsesRootMesh: true,
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scenery.dispose();
        this.actor.dispose();
        this.textures.dispose();
        this.sun.shadow.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
