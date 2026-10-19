import * as THREE from 'three';
import { TrailSprite } from '../../../games/tiger-rpg/trail-sprite.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { rpgCameraBounds, rpgView, } from '../../../games/tiger-rpg/presentation-contracts.js';
import { clearingCameraPose, clearingScreenUpY, } from '../../../prototypes/land-clearing/clearing-camera.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { MapKit } from '../../../prototypes/boar-turn-battle/map-kit.js';
import { TrailTerrain } from './trail-terrain.js';
import { TrailDressing } from './trail-dressing.js';
import { buildTrailBackdrop } from './trail-backdrop.js';
import { buildTrailMap } from './trail-maps.js';
function atahoMotions() {
    const asset = manifest.assets.find((asset) => asset.id === 'ai/ataho-v2');
    if (!asset)
        throw new Error('아타호 v2 리소스가 없습니다.');
    const motions = new Map();
    for (const direction of [
        'south',
        'south-east',
        'east',
        'north-east',
        'north',
        'north-west',
        'west',
        'south-west',
    ]) {
        const standName = direction === 'south' ? 'stand' : `stand-${direction}`;
        const stand = asset.animations[standName];
        const walk = asset.animations[`walking-3-${direction}`];
        if (!stand?.frames.length || !walk?.frames.length)
            throw new Error(`아타호 v2 보행 방향이 없습니다: ${direction}`);
        motions.set(standName, stand);
        motions.set(`move-${direction}`, walk);
    }
    return motions;
}
/** 인게임·전체 시야와 캐릭터 합성, 지역 지형의 GPU 수명을 맡는다. */
export class TrailScene {
    canvas;
    ground;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-23, 23, 14, -14, 0.1, 140);
    renderer;
    kit = new MapKit();
    textures = new SpriteTextures();
    actor = new TrailSprite(atahoMotions(), this.textures, rpgView.actorPixelsPerUnit, 0.33, 'frame-pivot');
    sun;
    raycaster = new THREE.Raycaster();
    pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    target = new THREE.Vector3();
    markers = [];
    terrain;
    dressing;
    disposed = false;
    modelFrame = -1;
    view;
    definition;
    position;
    constructor(canvas, ground, viewMode, art) {
        this.canvas = canvas;
        this.ground = ground;
        this.definition = ground.definition;
        this.position = this.definition.start;
        this.view = viewMode;
        const definition = this.definition, view = definition.camera;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.actor.mesh.material.toneMapped = false;
        this.actor.mesh.material.fog = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.scene.background = new THREE.Color(definition.sky);
        this.scene.fog = new THREE.Fog(definition.sky, 43, 88);
        this.scene.add(new THREE.HemisphereLight(definition.sky, definition.shade, 1.8));
        this.sun = new THREE.DirectionalLight(definition.sun, 2.4);
        this.sun.position.set(-14, 28, 17);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        Object.assign(this.sun.shadow.camera, {
            left: -25,
            right: 25,
            top: 25,
            bottom: -25,
            near: 1,
            far: 90,
        });
        this.sun.shadow.normalBias = 0.025;
        this.sun.shadow.radius = 3;
        this.sun.layers.enableAll();
        this.camera.position.set(view.x, view.y, view.z);
        this.target.set(view.targetX, 0, view.targetZ);
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld(true);
        this.camera.layers.enableAll();
        if (art)
            art.build(this.kit, ground);
        else
            buildTrailMap(this.kit, ground);
        if (!art && ground.variant !== 'seamless')
            buildTrailBackdrop(this.kit, ground);
        this.terrain = new TrailTerrain({ kit: this.kit, ground });
        this.dressing = art
            ? art.dress(this.kit, ground)
            : new TrailDressing({ kit: this.kit, ground });
        this.scene.add(this.kit.root, this.kit.foreground, this.sun, this.sun.target, this.actor.mesh, this.actor.shadow, this.terrain.root, this.dressing.root);
        // 수직 원화가 납작해지지 않도록 카메라의 세로 투영을 보정한다.
        this.actor.mesh.scale.y =
            Math.hypot(view.y, view.z - view.targetZ) / (view.z - view.targetZ);
        this.actor.shadow.scale.y = 0.62;
        for (const landmark of definition.landmarks) {
            const mesh = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 24), new THREE.MeshBasicMaterial({
                color: landmark.kind === 'battle' ? 0xdba76c : 0xe2d7ad,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
                depthWrite: false,
            }));
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(landmark.position.x, ground.heightAt(landmark.position) + 0.022, landmark.position.z);
            this.scene.add(mesh);
            this.markers.push({ mesh, id: landmark.id });
        }
        this.resize();
    }
    async load() {
        const paths = new Set([...this.actor.motions.values()].flatMap((m) => m.frames.map((f) => f.localPath)));
        await Promise.all([
            this.textures.load(paths, '아타호의 보행 리소스를 불러오지 못했습니다.'),
            this.dressing.load(),
        ]);
    }
    resize() {
        if (this.disposed)
            return;
        const rect = this.canvas.getBoundingClientRect(), aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
        const span = this.definition.camera.span;
        const halfWidth = Math.max(span, (span * aspect) / 1.6);
        Object.assign(this.camera, this.view === 'game'
            ? rpgCameraBounds({ width: rect.width, height: rect.height })
            : {
                left: -halfWidth,
                right: halfWidth,
                top: halfWidth / aspect,
                bottom: -halfWidth / aspect,
            });
        this.camera.updateProjectionMatrix();
        if (this.ground.variant === 'seamless') {
            const overview = this.view === 'overview';
            const extent = overview ? Math.max(25, span * 1.15) : 25;
            Object.assign(this.sun.shadow.camera, {
                left: -extent,
                right: extent,
                top: extent,
                bottom: -extent,
            });
            this.sun.shadow.camera.updateProjectionMatrix();
            // 전체보기 카메라가 멀어져도 지도 전체가 안개 속에 묻히지 않게 한다.
            const fog = this.scene.fog;
            if (fog instanceof THREE.Fog) {
                const pose = this.definition.camera;
                const distance = Math.hypot(pose.y, pose.z - pose.targetZ);
                fog.near = overview ? distance * 0.9 : 43;
                fog.far = overview ? distance * 1.7 : 88;
            }
        }
        this.updateCamera();
        this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
        this.renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false);
    }
    draw(snapshot, delta, seconds) {
        if (this.disposed)
            return;
        this.position = snapshot;
        this.updateCamera();
        const motion = snapshot.moving
            ? `move-${snapshot.facing}`
            : snapshot.facing === 'south'
                ? 'stand'
                : `stand-${snapshot.facing}`;
        this.actor.update(snapshot, motion, delta);
        this.canvas.dataset.motion = motion;
        this.canvas.dataset.frame = String(this.actor.animation.currentFrame.index);
        const height = this.ground.heightAt(snapshot);
        this.actor.mesh.position.y = height + 0.035;
        this.actor.shadow.position.y = height + 0.015;
        this.dressing.face(this.camera);
        this.dressing.update(seconds, snapshot, this.view);
        const modelFrame = Math.floor(seconds * 12);
        this.canvas.dataset.modelFrame = String(modelFrame);
        // 멈춘 상태의 시야 전환·입구 복귀도 새 빛의 범위로 그림자를 다시 만든다.
        if (modelFrame !== this.modelFrame ||
            (delta === 0 && this.ground.variant === 'seamless')) {
            this.renderer.shadowMap.needsUpdate = true;
            this.modelFrame = modelFrame;
        }
        for (const marker of this.markers) {
            marker.mesh.material.color.setHex(snapshot.visited.includes(marker.id) ? 0x93bf9e : 0xe1c18b);
            marker.mesh.material.opacity =
                0.66 + Math.sin((Math.floor(seconds * 12) / 12) * 2.4) * 0.12;
        }
        this.renderer.render(this.scene, this.camera);
        this.renderer.shadowMap.autoUpdate = false;
    }
    setView(view) {
        this.view = view;
        this.resize();
    }
    updateCamera() {
        const pose = this.definition.camera;
        if (this.view === 'game') {
            const targetZ = THREE.MathUtils.clamp(this.position.z + 2, (this.ground.variant === 'seamless'
                ? this.ground.bounds.minZ
                : Math.min(...this.definition.areas.map((area) => area.minZ))) + 4, (this.ground.variant === 'seamless'
                ? this.ground.bounds.maxZ
                : Math.max(...this.definition.areas.map((area) => area.maxZ))) - 3);
            this.camera.position.set(this.position.x, clearingCameraPose.height, targetZ + clearingCameraPose.depth);
            this.target.set(this.position.x, 0, targetZ);
            this.actor.mesh.scale.y = 1 / clearingScreenUpY;
        }
        else {
            this.camera.position.set(pose.x, pose.y, pose.z);
            this.target.set(pose.targetX, 0, pose.targetZ);
            this.actor.mesh.scale.y =
                Math.hypot(pose.y, pose.z - pose.targetZ) / (pose.z - pose.targetZ);
        }
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld(true);
        // 넓어진 연결 구역에서도 같은 방향의 빛과 가까운 지면 그림자를 유지한다.
        if (this.ground.variant === 'seamless') {
            const focus = this.view === 'game'
                ? this.position
                : { x: pose.targetX, z: pose.targetZ };
            this.sun.position.set(focus.x - 14, 28, focus.z + 17);
            this.sun.target.position.set(focus.x, 0, focus.z);
            this.sun.target.updateMatrixWorld(true);
        }
    }
    togglePaths() {
        return this.terrain.togglePaths();
    }
    pick(clientX, clientY) {
        const r = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2), this.camera);
        this.pickPlane.constant = 0;
        const point = this.raycaster.ray.intersectPlane(this.pickPlane, new THREE.Vector3());
        if (!point)
            return null;
        for (let i = 0; i < 2; i++) {
            this.pickPlane.constant = -this.ground.heightAt(point);
            this.raycaster.ray.intersectPlane(this.pickPlane, point);
        }
        return { x: point.x, z: point.z };
    }
    project(point) {
        const p = new THREE.Vector3(point.x, this.ground.heightAt(point) + 0.06, point.z).project(this.camera), r = this.canvas.getBoundingClientRect();
        return { x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.dressing.dispose();
        this.kit.dispose();
        this.terrain.dispose();
        this.actor.dispose();
        this.textures.dispose();
        this.sun.shadow.dispose();
        for (const marker of this.markers) {
            marker.mesh.geometry.dispose();
            marker.mesh.material.dispose();
        }
        this.scene.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
