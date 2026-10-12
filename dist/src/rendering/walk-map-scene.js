import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ResourceOutlinePass } from './resource-outline-pass.js';
import { SpriteTextures } from './sprite-textures.js';
import { outlineGroups, resourceLayers } from './surface-types.js';
import { clearingCameraPose, projectClearingPoint, } from '../prototypes/land-clearing/clearing-camera.js';
import { rpgCameraBounds, rpgView, } from '../games/tiger-rpg/presentation-contracts.js';
import { TrailSprite, trailMotions } from '../games/tiger-rpg/trail-sprite.js';
import { trailBounds } from '../games/tiger-rpg/trail-topology.js';
/** 보행 미리보기의 공통 렌더링과 GPU 자원 수명을 소유한다. */
export class WalkMapScene {
    canvas;
    terrain;
    scenery;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 150);
    renderer;
    composer;
    outline;
    output = new OutputPass();
    textures = new SpriteTextures();
    actor = new TrailSprite(trailMotions('ai/tiger-hero', true), this.textures, rpgView.actorPixelsPerUnit, 0.33);
    sun;
    bounds;
    width = 1;
    height = 1;
    disposed = false;
    constructor(canvas, terrain, scenery) {
        this.canvas = canvas;
        this.terrain = terrain;
        this.scenery = scenery;
        this.bounds = trailBounds(terrain);
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.scene.background = new THREE.Color(terrain.style.background);
        this.scene.fog = new THREE.Fog(terrain.style.background, 55, 100);
        const sky = new THREE.HemisphereLight(terrain.style.sky, terrain.style.shade, terrain.style.skyStrength);
        sky.layers.enableAll();
        this.sun = new THREE.DirectionalLight(terrain.style.sunlight, terrain.style.sunStrength);
        this.sun.layers.enableAll();
        this.sun.position.set(-10, 24, 5);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        Object.assign(this.sun.shadow.camera, {
            left: -40,
            right: 40,
            top: 45,
            bottom: -45,
            near: 1,
            far: 80,
        });
        this.sun.shadow.normalBias = 0.035;
        this.scene.add(sky, this.sun, this.scenery.root, this.actor.mesh, this.actor.shadow);
        this.composer = new EffectComposer(this.renderer);
        this.outline = new ResourceOutlinePass(this.scene, this.camera, this.scene.background);
        outlineGroups.forEach(({ id, recommendedPixelSize }) => this.outline.setPixelSize(id, recommendedPixelSize));
        this.composer.addPass(this.outline);
        this.composer.addPass(this.output);
        this.composer.addPass(this.outline.smoothingPass);
        this.renderer.shadowMap.needsUpdate = true;
    }
    async load() {
        await Promise.all([
            this.scenery.load(),
            this.textures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '아타호 답사 리소스를 불러오지 못했어요.'),
        ]);
    }
    render(state, delta, options) {
        if (this.disposed)
            return;
        this.resize(options.overview);
        const x = options.overview
            ? (this.bounds.minX + this.bounds.maxX) / 2
            : state.player.x;
        const z = options.overview
            ? (this.bounds.minZ + this.bounds.maxZ) / 2
            : THREE.MathUtils.clamp(state.player.z + 2, this.bounds.minZ + 4, this.bounds.maxZ - 3);
        this.camera.position.set(x, clearingCameraPose.height, z + clearingCameraPose.depth);
        this.camera.lookAt(x, 0, z);
        const suffix = state.player.facing === 'front' ? '' : `-${state.player.facing}`;
        this.actor.update(state.player, options.motion ?? `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        if (this.scenery.update(state, delta, this.camera, options))
            this.renderer.shadowMap.needsUpdate = true;
        this.camera.layers.set(resourceLayers.environment);
        this.composer.render(delta);
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
    resize(overview) {
        const bounds = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        if (this.width !== bounds.width ||
            this.height !== bounds.height ||
            this.renderer.getPixelRatio() !== dpr) {
            this.width = Math.max(1, bounds.width);
            this.height = Math.max(1, bounds.height);
            this.renderer.setPixelRatio(dpr);
            this.renderer.setSize(this.width, this.height, false);
            this.composer.setPixelRatio(dpr);
            this.composer.setSize(this.width, this.height);
            this.outline.setPixelRatio(dpr);
        }
        // 정사각형에 가까운 데스크톱 창에서도 넓은 지도 양끝을 자르지 않는다.
        const halfHeight = Math.max((this.bounds.maxZ - this.bounds.minZ) * 0.3 + 4.2, (((this.bounds.maxX - this.bounds.minX) / 2 + 2.5) * this.height) /
            this.width);
        Object.assign(this.camera, overview
            ? {
                left: (-halfHeight * this.width) / this.height,
                right: (halfHeight * this.width) / this.height,
                top: halfHeight,
                bottom: -halfHeight,
            }
            : rpgCameraBounds({ width: this.width, height: this.height }));
        this.camera.updateProjectionMatrix();
    }
    project(point, y = 1.1) {
        this.camera.updateMatrixWorld();
        return projectClearingPoint({
            point: new THREE.Vector3(point.x, y, point.z),
            camera: this.camera,
            width: this.width,
            height: this.height,
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
        this.outline.dispose();
        this.outline.smoothingPass.dispose();
        this.output.dispose();
        this.composer.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
