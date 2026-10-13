import { toyWalkHeight } from './interior.js';
import { RoomResident } from './resident.js';
import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import { cameraYaw, groundHeight, toyPlaces, } from './layout.js';
import { ToyScenery } from './scenery.js';
/** 실제 DPR의 매끈한 렌더와 발 접지·가림·카메라 수명을 소유한다. */
export class ToyScene {
    canvas;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 120);
    textures = new SpriteTextures();
    actor = new TrailSprite(trailMotions('ai/tiger-hero', true), this.textures, 34, 0.3, 'frame-pivot');
    resident = new RoomResident();
    scenery = new ToyScenery();
    sun = new THREE.DirectionalLight(0xfff0d7, 2.7);
    raycaster = new THREE.Raycaster();
    marker = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.56, 24), new THREE.MeshBasicMaterial({ color: 0xffe6a5, side: THREE.DoubleSide }));
    width = 1;
    height = 1;
    disposed = false;
    renderCount = 0;
    animationTime = 0;
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
        this.scene.background = new THREE.Color(0xeee1c9);
        this.scene.fog = new THREE.Fog(0xeee1c9, 45, 85);
        this.sun.position.set(-12, 24, 12);
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
        this.sun.shadow.normalBias = 0.025;
        this.sun.shadow.radius = 4;
        this.sun.shadow.intensity = 0.6;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        const sky = new THREE.HemisphereLight(0xeaf4f3, 0x947860, 2.3);
        sky.layers.enableAll();
        this.sun.layers.enableAll();
        this.scene.add(this.scenery.root, this.actor.mesh, this.actor.shadow, this.resident.mesh, this.resident.shadow, this.sun, sky, this.marker);
        this.camera.layers.enableAll();
        this.marker.rotation.x = -Math.PI / 2;
    }
    async load() {
        await this.textures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '아타호 리소스를 불러오지 못했어요.');
    }
    render(state, delta, overview) {
        if (this.disposed)
            return;
        this.renderCount++;
        this.animationTime += delta;
        this.resize(overview);
        const x = overview ? 0 : THREE.MathUtils.clamp(state.player.x, -5, 5);
        const z = overview ? 0 : THREE.MathUtils.clamp(state.player.z - 2, -5, 4);
        const depth = overview ? 24 : 20;
        this.camera.position.set(x + Math.sin(cameraYaw) * depth, overview ? 28 : 23, z + Math.cos(cameraYaw) * depth);
        this.camera.lookAt(x, 0.5, z);
        this.camera.updateMatrixWorld();
        const facing = cardinalFacing(state.player.facing);
        const suffix = facing === 'front' ? '' : `-${facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        // 카메라를 향해 기울이면 머리가 뒤편 건축에 교차하므로 인물판은 수직을 유지한다.
        const cameraDepth = overview ? 24 : 20;
        const cameraHeight = (overview ? 28 : 23) - 0.5;
        this.actor.mesh.scale.y =
            Math.hypot(cameraDepth, cameraHeight) / cameraDepth;
        this.actor.mesh.rotation.set(0, cameraYaw, 0);
        this.actor.mesh.position.y = state.player.y + 0.035;
        this.actor.shadow.position.y = state.player.y + 0.025;
        this.resident.update(state.resident, 'stand-left', delta);
        this.resident.mesh.rotation.set(0, cameraYaw, 0);
        this.resident.mesh.scale.y = this.actor.mesh.scale.y;
        this.resident.mesh.position.y = toyWalkHeight({ x: 0, z: -5.2 }) + 0.035;
        this.resident.shadow.position.y = toyWalkHeight({ x: 0, z: -5.2 }) + 0.025;
        this.scenery.update(state, delta);
        const nearby = toyPlaces.find((place) => place.id === state.nearby);
        this.marker.visible = !!nearby;
        if (nearby)
            this.marker.position.set(nearby.x, groundHeight(nearby) + 0.035, nearby.z);
        this.renderer.render(this.scene, this.camera);
    }
    resize(overview) {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const w = Math.round(this.width), h = Math.round(this.height);
        if (Math.abs(this.canvas.width / this.renderer.getPixelRatio() - w) > 1 ||
            Math.abs(this.canvas.height / this.renderer.getPixelRatio() - h) > 1)
            this.renderer.setSize(w, h, false);
        const halfHeight = overview
            ? Math.max(15.5, (18.5 * this.height) / this.width)
            : Math.max(8.2, (6.4 * this.height) / this.width);
        Object.assign(this.camera, {
            left: (-halfHeight * this.width) / this.height,
            right: (halfHeight * this.width) / this.height,
            top: halfHeight,
            bottom: -halfHeight,
        });
        this.camera.updateProjectionMatrix();
    }
    groundFromPointer(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, (-(clientY - bounds.top) / bounds.height) * 2 + 1);
        this.raycaster.setFromCamera(ndc, this.camera);
        // 같은 높이 함수를 역으로 따라가므로 언덕에서도 화면 입력과 발 위치가 일치한다.
        const ray = this.raycaster.ray;
        let previousDistance = 0;
        for (let i = 0; i < 240; i++) {
            const distance = i * 0.3;
            const point = ray.at(distance, new THREE.Vector3());
            if (point.y <= toyWalkHeight({ x: point.x, z: point.z })) {
                let low = previousDistance, high = distance;
                for (let j = 0; j < 12; j++) {
                    const middle = (low + high) / 2, q = ray.at(middle, new THREE.Vector3());
                    if (q.y > toyWalkHeight({ x: q.x, z: q.z }))
                        low = middle;
                    else
                        high = middle;
                }
                const hit = ray.at((low + high) / 2, new THREE.Vector3());
                return { x: hit.x, z: hit.z };
            }
            previousDistance = distance;
        }
        return null;
    }
    project(point) {
        const projected = new THREE.Vector3(point.x, toyWalkHeight(point), point.z).project(this.camera);
        return {
            x: ((projected.x + 1) * this.width) / 2,
            y: ((1 - projected.y) * this.height) / 2,
        };
    }
    get diagnostics() {
        return {
            renderCount: this.renderCount,
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            actorY: this.actor.mesh.position.y,
            animationTime: this.animationTime,
            roomOpen: this.scenery.roomOpen,
            spriteWidth: this.actor.mesh.geometry.parameters.width,
            spriteHeight: this.actor.mesh.geometry.parameters.height,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scenery.dispose();
        this.actor.dispose();
        this.resident.dispose();
        this.textures.dispose();
        this.marker.geometry.dispose();
        this.marker.material.dispose();
        this.sun.shadow.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
