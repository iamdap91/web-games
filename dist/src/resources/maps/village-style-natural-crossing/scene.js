import { travelHeight, highBridgeHeight, } from './crossing.js';
import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import { groundHeight, naturalPlaces } from './layout.js';
import { NaturalScenery } from './scenery.js';
/** 낮은 실제 렌더 해상도와 발 접지·가림·카메라 수명을 소유한다. */
export class NaturalScene {
    canvas;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 120);
    textures = new SpriteTextures();
    actor = new TrailSprite(trailMotions('ai/tiger-hero', true), this.textures, 30, 0.33);
    scenery = new NaturalScenery();
    sun = new THREE.DirectionalLight(0xffeac2, 2.3);
    raycaster = new THREE.Raycaster();
    marker = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.56, 24), new THREE.MeshBasicMaterial({ color: 0xffe6a5, side: THREE.DoubleSide }));
    width = 1;
    height = 1;
    disposed = false;
    renderCount = 0;
    layer = 'ground';
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.scene.background = new THREE.Color(0xb8c5a3);
        this.scene.fog = new THREE.Fog(0xb8c5a3, 45, 85);
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
        this.sun.shadow.normalBias = 0.04;
        const sky = new THREE.HemisphereLight(0xd5e4d4, 0x5f6954, 2.1);
        sky.layers.enableAll();
        this.sun.layers.enableAll();
        this.scene.add(this.scenery.root, this.actor.mesh, this.actor.shadow, this.sun, sky, this.marker);
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
        this.layer = state.player.layer ?? 'ground';
        this.resize(overview);
        const units = (this.camera.right - this.camera.left) / this.canvas.width;
        // 저해상도 한 픽셀에 카메라를 맞춰 미세한 좌우 이동의 무늬 흔들림을 줄인다.
        const x = Math.round((overview ? 0 : THREE.MathUtils.clamp(state.player.x, -6, 6)) / units) * units;
        const z = Math.round((overview ? 0 : THREE.MathUtils.clamp(state.player.z - 2, -6, 5)) /
            units) * units;
        this.camera.position.set(x, overview ? 25 : 18, z + (overview ? 22 : 18));
        this.camera.lookAt(x, 0.5, z);
        this.camera.updateMatrixWorld();
        const facing = cardinalFacing(state.player.facing);
        const suffix = facing === 'front' ? '' : `-${facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        // 카메라를 향해 기울이면 머리가 뒤편 건축에 교차하므로 인물판은 수직을 유지한다.
        const cameraDepth = overview ? 22 : 18;
        const cameraHeight = (overview ? 25 : 18) - 0.5;
        this.actor.mesh.scale.y =
            Math.hypot(cameraDepth, cameraHeight) / cameraDepth;
        this.actor.mesh.rotation.set(0, 0, 0);
        this.actor.mesh.position.y = state.player.y + 0.035;
        this.actor.shadow.position.y = state.player.y + 0.025;
        this.scenery.update(state, delta);
        const nearby = naturalPlaces.find((place) => place.id === state.nearby);
        this.marker.visible = !!nearby;
        if (nearby)
            this.marker.position.set(nearby.x, groundHeight(nearby) + 0.035, nearby.z);
        this.renderer.render(this.scene, this.camera);
    }
    resize(overview) {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const scale = this.width < 600 ? 2 : 3;
        const w = Math.max(1, Math.floor(this.width / scale)), h = Math.max(1, Math.floor(this.height / scale));
        if (this.canvas.width !== w || this.canvas.height !== h)
            this.renderer.setSize(w, h, false);
        const halfHeight = overview
            ? Math.max(16.5, (16.5 * this.height) / this.width)
            : Math.max(8.6, (6.8 * this.height) / this.width);
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
        const layered = [];
        this.scenery.root.traverse((n) => {
            if (n.userData.walkLayer &&
                (this.layer !== 'low' || n.userData.walkLayer === 'low'))
                layered.push(n);
        });
        const hit = this.raycaster.intersectObjects(layered, false)[0];
        if (hit)
            return {
                x: hit.point.x,
                z: hit.point.z,
                layer: hit.object.userData.walkLayer,
            };
        const ray = this.raycaster.ray;
        let previousDistance = 0;
        for (let i = 0; i < 240; i++) {
            const distance = i * 0.3;
            const point = ray.at(distance, new THREE.Vector3());
            if (point.y <= groundHeight({ x: point.x, z: point.z })) {
                let low = previousDistance, high = distance;
                for (let j = 0; j < 12; j++) {
                    const middle = (low + high) / 2, q = ray.at(middle, new THREE.Vector3());
                    if (q.y > groundHeight({ x: q.x, z: q.z }))
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
        const projected = new THREE.Vector3(point.x, travelHeight(point), point.z).project(this.camera);
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
            bridgeHeight: highBridgeHeight,
            actorTop: this.actor.mesh.position.y +
                this.actor.mesh.geometry.parameters.height * this.actor.mesh.scale.y,
            layer: this.layer,
            actorY: this.actor.mesh.position.y,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scenery.dispose();
        this.actor.dispose();
        this.textures.dispose();
        this.marker.geometry.dispose();
        this.marker.material.dispose();
        this.sun.shadow.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
