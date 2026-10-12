import * as THREE from 'three';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { drawDriveStrikes } from '../../../prototypes/overdrive-battle/overdrive-strikes.js';
import { CombatPreview, combatPose, combatPreviewRules, } from './combat-preview.js';
// 현재 전투의 21:25 카메라와 1.18배 스프라이트를 유지하고, 길이만 도트 단위로 표시한다.
const cameraHeight = 21;
const cameraDepth = 25;
const screenUp = cameraDepth / Math.hypot(cameraHeight, cameraDepth);
const { spriteScale, contactPixel, destinationX } = combatPreviewRules;
const contactPoint = {
    x: destinationX + (contactPixel.x - contactPixel.pivotX) * spriteScale,
    y: contactPixel.fromBottom * spriteScale,
};
function kickMotion() {
    const hero = manifest.assets.find((asset) => asset.id === 'ai/tiger-hero');
    const animation = hero?.animations['turn-kick'];
    if (!animation?.frames.length)
        throw new Error('회전 강타에 쓰는 아타호 프레임이 없어요.');
    return animation;
}
/** 한쪽의 그림 판·깊이·원본 금빛 타격 효과와 WebGL 수명을 소유한다. */
class CombatScene {
    host;
    variant;
    animation;
    textures;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-130, 130, 90, -90, 1, 1800);
    character = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide }));
    shapes = new Map();
    target = new THREE.Group();
    targetMaterial = new THREE.MeshBasicMaterial({
        color: '#b59660',
    });
    shadow;
    overlay = document.createElement('canvas');
    context;
    resizeObserver;
    projection = new THREE.Vector3();
    displayedFrame = null;
    width = 260;
    height = 180;
    constructor(host, variant, animation, textures) {
        this.host = host;
        this.variant = variant;
        this.animation = animation;
        this.textures = textures;
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        // 도트 해상도와 CSS 확대를 나누므로 고밀도 화면에서도 같은 도트 격자를 쓴다.
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.className = 'combat-scene-canvas';
        this.renderer.domElement.setAttribute('aria-label', variant === 'baseline'
            ? '현재 회전 강타 표현'
            : '표시 박자와 발 궤적을 더한 회전 강타');
        Object.assign(this.renderer.domElement.style, {
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated',
        });
        this.overlay.className = 'combat-scene-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        Object.assign(this.overlay.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            imageRendering: 'pixelated',
        });
        const context = this.overlay.getContext('2d');
        if (!context) {
            this.renderer.dispose();
            throw new Error('타격 궤적을 표시할 캔버스를 만들지 못했어요.');
        }
        this.context = context;
        host.append(this.renderer.domElement, this.overlay);
        this.scene.background = new THREE.Color('#253c36');
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshBasicMaterial({ color: '#304b3f' }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        const grid = new THREE.GridHelper(640, 32, '#3b5849', '#365444');
        grid.position.y = 0.01;
        this.scene.add(ground, grid, this.character);
        this.character.scale.set(spriteScale, spriteScale / screenUp, spriteScale);
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
            color: '#12281f',
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
        }));
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.set(19, 9, 1);
        this.shadow.position.y = 0.025;
        this.scene.add(this.shadow);
        this.addTargetPart(16, 57, 14, 28.5, this.targetMaterial);
        const rimMaterial = new THREE.MeshBasicMaterial({ color: '#e0c988' });
        this.addTargetPart(18, 5, 16, 55, rimMaterial);
        this.addTargetPart(18, 4, 16, 30, rimMaterial);
        const darkMaterial = new THREE.MeshBasicMaterial({ color: '#745e3d' });
        this.addTargetPart(22, 7, 20, 3.5, darkMaterial);
        for (const y of [13, 22, 41, 48])
            this.addTargetPart(8, 1, 15, y, darkMaterial);
        this.target.position.set(contactPoint.x + 8, 0, 0);
        this.scene.add(this.target);
        const focus = new THREE.Vector3(-35, 35 / screenUp, 0);
        this.camera.position
            .copy(focus)
            .add(new THREE.Vector3(0, cameraHeight * 10, cameraDepth * 10));
        this.camera.lookAt(focus);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
    }
    draw(snapshot, frame) {
        const pose = combatPose(snapshot, {
            variant: this.variant,
            timing: frame.settings.timing,
        });
        const sprite = this.animation.frames[pose.frameIndex];
        this.showFrame(sprite);
        this.character.position.set(pose.x, 0.06, 0);
        this.shadow.position.x = pose.x;
        const reactionAge = snapshot.impactCount
            ? snapshot.actionTime - combatPreviewRules.contactAt
            : -1;
        const reaction = reactionAge >= 0 ? Math.pow(Math.max(0, 1 - reactionAge / 0.28), 2) : 0;
        this.target.rotation.z = frame.settings.reducedMotion
            ? 0
            : -reaction * 0.035;
        this.targetMaterial.color.set(reactionAge >= 0 && reactionAge < 0.09 ? '#e9c27a' : '#b59660');
        this.renderer.render(this.scene, this.camera);
        this.context.resetTransform();
        this.context.clearRect(0, 0, this.width, this.height);
        const strikeActive = snapshot.impactAge >= 0 && snapshot.impactAge < 0.3;
        if (strikeActive)
            this.drawOriginalStrike(snapshot, frame.settings.reducedMotion);
        const trailActive = this.variant === 'enhanced' &&
            frame.settings.trails &&
            !frame.settings.reducedMotion &&
            snapshot.impactAge >= 0 &&
            snapshot.impactAge < 0.095;
        if (trailActive)
            this.drawFootTrail(snapshot.impactAge);
        if (frame.settings.guides)
            this.drawGuides(pose);
        this.drawPhase(pose, snapshot);
        this.host.dataset.time = snapshot.time.toFixed(4);
        this.host.dataset.actionTime = snapshot.actionTime.toFixed(4);
        this.host.dataset.frameIndex = String(pose.frameIndex);
        this.host.dataset.impactCount = String(snapshot.impactCount);
        this.host.dataset.contact = String(snapshot.impactCount === 1);
        this.host.dataset.frozen = String(snapshot.frozen);
        this.host.dataset.x = pose.x.toFixed(4);
        this.host.dataset.trailActive = String(trailActive);
        this.host.dataset.strikeActive = String(strikeActive);
        this.host.dataset.phase = pose.phase;
        const foot = this.project(pose.x, 0);
        const contact = this.project(contactPoint.x, contactPoint.y);
        const cssScaleX = this.host.clientWidth / this.width;
        const cssScaleY = this.host.clientHeight / this.height;
        this.host.dataset.footX = (foot.x * cssScaleX).toFixed(2);
        this.host.dataset.footY = (foot.y * cssScaleY).toFixed(2);
        this.host.dataset.contactX = (contact.x * cssScaleX).toFixed(2);
        this.host.dataset.contactY = (contact.y * cssScaleY).toFixed(2);
    }
    dispose() {
        this.resizeObserver.disconnect();
        const geometries = new Set(this.shapes.values());
        const materials = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh ||
                object instanceof THREE.LineSegments) {
                geometries.add(object.geometry);
                const items = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                items.forEach((material) => materials.add(material));
            }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.overlay.remove();
    }
    showFrame(frame) {
        if (frame === this.displayedFrame)
            return;
        let shape = this.shapes.get(frame);
        if (!shape) {
            shape = new THREE.PlaneGeometry(frame.width, frame.height);
            shape.translate(frame.width / 2 - frame.pivot.x, frame.height / 2 - frame.pivot.y, 0);
            this.shapes.set(frame, shape);
        }
        if (!this.displayedFrame)
            this.character.geometry.dispose();
        this.character.geometry = shape;
        this.character.material.map = this.textures.get(frame.localPath) ?? null;
        this.character.material.needsUpdate = true;
        this.displayedFrame = frame;
    }
    addTargetPart(width, height, depth, y, material) {
        const part = new THREE.Mesh(new THREE.BoxGeometry(width, height / screenUp, depth), material);
        part.position.y = y / screenUp;
        this.target.add(part);
    }
    resize() {
        const cssWidth = this.host.clientWidth;
        const cssHeight = this.host.clientHeight;
        if (!cssWidth || !cssHeight)
            return;
        const scale = Math.max(1, Math.floor(cssHeight / 150));
        this.width = Math.max(1, Math.round(cssWidth / scale));
        this.height = Math.max(1, Math.round(cssHeight / scale));
        this.renderer.setSize(this.width, this.height, false);
        this.overlay.width = this.width;
        this.overlay.height = this.height;
        this.camera.left = -this.width / 2;
        this.camera.right = this.width / 2;
        this.camera.top = this.height / 2;
        this.camera.bottom = -this.height / 2;
        this.camera.updateProjectionMatrix();
    }
    project(x, y) {
        this.projection.set(x, y / screenUp + 0.06, 0.1).project(this.camera);
        return {
            x: ((this.projection.x + 1) * this.width) / 2,
            y: ((1 - this.projection.y) * this.height) / 2,
        };
    }
    drawOriginalStrike(snapshot, reducedMotion) {
        const impact = {
            x: contactPoint.x,
            z: 0,
            targetId: 1,
            damage: 26,
            heavy: true,
            defeated: false,
            guarded: false,
            aim: { x: 1, z: 0 },
            drive: { beat: 4, finisher: 'sweep', primary: true },
        };
        drawDriveStrikes(this.context, {
            strikes: [{ impact, age: snapshot.impactAge, duration: 0.3 }],
            zoom: 0,
            dim: 0,
            kick: { x: 0, z: 0 },
            focus: { x: 0, z: 0 },
        }, {
            width: this.width,
            height: this.height,
            reducedMotion,
            project: (point) => this.project(point.x, contactPoint.y),
        });
    }
    footTrailPoints() {
        // 마지막 준비 그림과 접촉 그림의 발끝을 도트 좌표로 지정한 비교용 보조 궤적이다.
        return [
            { time: 0.126, x: 34, pivot: 25, y: 6 },
            { time: 0.145, x: 37, pivot: 20, y: 11 },
            {
                time: combatPreviewRules.contactAt,
                x: contactPixel.x,
                pivot: contactPixel.pivotX,
                y: contactPixel.fromBottom,
            },
        ].map((point) => {
            const advance = Math.pow(point.time / combatPreviewRules.contactAt, 3);
            const origin = combatPreviewRules.originX;
            const x = origin +
                (destinationX - origin) * advance +
                (point.x - point.pivot) * spriteScale;
            return this.project(x, point.y * spriteScale);
        });
    }
    traceFootPath(points) {
        const [start, middle, end] = points;
        if (!start || !middle || !end)
            return;
        this.context.beginPath();
        this.context.moveTo(start.x, start.y);
        this.context.quadraticCurveTo(middle.x, middle.y, end.x, end.y);
    }
    drawFootTrail(age) {
        const context = this.context;
        const fade = Math.pow(1 - age / 0.095, 1.5);
        const points = this.footTrailPoints();
        context.save();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.globalAlpha = fade * 0.8;
        this.traceFootPath(points);
        context.strokeStyle = '#d99a38';
        context.lineWidth = 5;
        context.stroke();
        context.globalAlpha = fade;
        context.strokeStyle = '#fff3bf';
        context.lineWidth = 1.6;
        context.stroke();
        context.restore();
    }
    drawGuides(pose) {
        const context = this.context;
        const points = this.footTrailPoints();
        const foot = this.project(pose.x, 0);
        const contact = this.project(contactPoint.x, contactPoint.y);
        context.save();
        context.strokeStyle = '#a6cbb2';
        context.lineWidth = 0.75;
        context.setLineDash([2, 3]);
        this.traceFootPath(points);
        context.stroke();
        context.setLineDash([]);
        for (const point of points) {
            context.fillStyle = '#c3d9b9';
            context.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 3, 3);
        }
        context.strokeStyle = '#f3d88e';
        context.beginPath();
        context.arc(contact.x, contact.y, 5, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.moveTo(foot.x - 4, foot.y);
        context.lineTo(foot.x + 4, foot.y);
        context.moveTo(foot.x, foot.y - 4);
        context.lineTo(foot.x, foot.y + 4);
        context.stroke();
        context.restore();
    }
    drawPhase(pose, snapshot) {
        const context = this.context;
        context.save();
        context.font = '10px sans-serif';
        context.fillStyle = '#d1d8c4';
        context.fillText(`${pose.phase}${snapshot.frozen ? ' · 타격 정지' : ''}`, 9, 17);
        context.font = '8px monospace';
        context.fillStyle = '#95ad9e';
        context.fillText(`${(snapshot.time * 1000).toFixed(0).padStart(3, '0')} ms / 500 ms`, 9, 29);
        context.restore();
    }
}
export class CombatComparison {
    scenes;
    textures;
    preview = new CombatPreview();
    constructor(scenes, textures) {
        this.scenes = scenes;
        this.textures = textures;
    }
    draw(frame) {
        this.preview.update(frame.delta);
        const snapshot = this.preview.snapshot;
        this.scenes.forEach((scene) => scene.draw(snapshot, frame));
    }
    attack() {
        this.preview.attack();
    }
    seek(progress) {
        this.preview.seek(progress);
    }
    reset() {
        this.preview.reset();
    }
    get progress() {
        return this.preview.progress;
    }
    get finished() {
        return this.preview.finished;
    }
    dispose() {
        this.scenes.forEach((scene) => scene.dispose());
        this.textures.dispose();
    }
}
export async function createCombatComparison(hosts) {
    const animation = kickMotion();
    const textures = new SpriteTextures();
    const scenes = [];
    try {
        await textures.load(new Set(animation.frames.map((frame) => frame.localPath)), '회전 강타의 기존 도트 그림을 불러오지 못했어요.');
        scenes.push(new CombatScene(hosts.baseline, 'baseline', animation, textures));
        scenes.push(new CombatScene(hosts.enhanced, 'enhanced', animation, textures));
        return new CombatComparison(scenes, textures);
    }
    catch (error) {
        scenes.forEach((scene) => scene.dispose());
        textures.dispose();
        throw error;
    }
}
