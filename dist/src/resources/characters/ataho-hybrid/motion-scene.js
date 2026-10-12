import * as THREE from 'three';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { straightPunchFrames, turnKickFrames } from '../ataho/combat-frames.js';
import { strikeFrame } from '../ataho/motion-frame.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { hybridPose } from './hybrid-pose.js';
import { comparisonRules } from './motion-preview.js';
import { drawHybrid } from './rig-drawing.js';
const screenUp = Math.cos(Math.PI / 6);
const textureSize = { width: 256, height: 160, footY: 144, resolution: 3 };
function heroMotion(name) {
    const hero = manifest.assets.find((asset) => asset.id === 'ai/tiger-hero');
    const animation = hero?.animations[name];
    if (!animation?.frames.length)
        throw new Error(`비교할 아타호 모션이 없어요: ${name}`);
    return animation;
}
const motions = {
    idle: heroMotion('stand'),
    walk: heroMotion('move'),
    punch: heroMotion('straight-punch'),
    kick: heroMotion('turn-kick'),
};
export async function loadHybridImages() {
    const image = async (filename) => {
        const result = new Image();
        result.src = new URL(`../../../../../public/assets/maplestory/ataho-nonpixel-ai/20261012/${filename}.png`, import.meta.url).href;
        await result.decode();
        return result;
    };
    const [front, parts, punch, kick] = await Promise.all([
        image('front-01'),
        image('parts-01'),
        image('punch-contact-01'),
        image('kick-contact-01'),
    ]);
    return { front, parts, punch, kick };
}
export async function loadFrameTextures() {
    const textures = new SpriteTextures();
    try {
        await textures.load(new Set(Object.values(motions).flatMap((motion) => motion.frames.map((frame) => frame.localPath))), '현재 아타호의 비교 프레임을 불러오지 못했어요.');
    }
    catch (error) {
        textures.dispose();
        throw error;
    }
    return textures;
}
function frameFor(snapshot) {
    const { motion } = snapshot;
    const animation = motions[motion];
    let index = 0;
    if (motion === 'walk')
        index =
            Math.floor((snapshot.time % comparisonRules.walkCycle) / 0.12) %
                animation.frames.length;
    else if (motion === 'punch' || motion === 'kick')
        index = strikeFrame(motion === 'punch' ? straightPunchFrames : turnKickFrames, {
            time: snapshot.time,
            ...comparisonRules.attacks[motion],
            endAt: comparisonRules.attacks[motion].duration,
        });
    return { frame: animation.frames[index], index };
}
/** 한 비교 칸의 카메라·그림 판·배경과 WebGL 리소스 수명을 소유한다. */
export class MotionScene {
    host;
    variant;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-180, 180, 120, -120, 1, 2000);
    character = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        alphaTest: 0.04,
        transparent: true,
        side: THREE.DoubleSide,
    }));
    shadow;
    target = new THREE.Group();
    impact;
    composition = document.createElement('canvas');
    context;
    canvasTexture;
    frame = null;
    displayHeight = 240;
    showBones = false;
    resizeObserver;
    constructor(host, variant) {
        this.host = host;
        this.variant = variant;
        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.setAttribute('aria-label', variant.kind === 'frame'
            ? '현재 프레임 모션 비교 장면'
            : '비도트 하이브리드 모션 비교 장면');
        host.append(this.renderer.domElement);
        this.scene.background = new THREE.Color('#e2dfd4');
        this.character.scale.y = 1 / screenUp;
        this.composition.width = textureSize.width * textureSize.resolution;
        this.composition.height = textureSize.height * textureSize.resolution;
        const context = this.composition.getContext('2d');
        if (!context)
            throw new Error('비도트 그림을 합성할 캔버스를 만들지 못했어요.');
        this.context = context;
        this.canvasTexture = new THREE.CanvasTexture(this.composition);
        this.canvasTexture.colorSpace = THREE.SRGBColorSpace;
        this.canvasTexture.minFilter = THREE.LinearFilter;
        this.canvasTexture.magFilter = THREE.LinearFilter;
        this.canvasTexture.generateMipmaps = false;
        if (variant.kind === 'hybrid') {
            this.character.geometry.dispose();
            this.character.geometry = new THREE.PlaneGeometry(textureSize.width, textureSize.height);
            this.character.geometry.translate(0, textureSize.footY - textureSize.height / 2, 0);
            this.character.material.map = this.canvasTexture;
        }
        this.scene.add(this.character);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ color: '#c7c4b7' }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        this.scene.add(ground);
        const grid = new THREE.GridHelper(800, 40, '#a4a394', '#b3b2a4');
        grid.position.y = 0.01;
        this.scene.add(grid);
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({
            color: '#645f4c',
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
        }));
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.set(24, 12, 1);
        this.shadow.position.y = 0.03;
        this.scene.add(this.shadow);
        const post = new THREE.Mesh(new THREE.BoxGeometry(10, 28, 10), new THREE.MeshBasicMaterial({ color: '#6e796c' }));
        post.position.set(-28, 14, 22);
        this.scene.add(post);
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(14, 66, 14), new THREE.MeshBasicMaterial({ color: '#96785d' }));
        trunk.position.y = 33;
        const band = new THREE.Mesh(new THREE.BoxGeometry(15, 6, 15), new THREE.MeshBasicMaterial({ color: '#d5bc92' }));
        band.position.y = 61;
        this.target.add(trunk, band);
        this.target.position.set(70, 0, 0);
        this.scene.add(this.target);
        this.impact = new THREE.Mesh(new THREE.RingGeometry(5, 6, 24), new THREE.MeshBasicMaterial({
            color: '#fff4bd',
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        this.impact.position.set(66, 64 / screenUp, 3);
        this.impact.scale.y = 1 / screenUp;
        this.scene.add(this.impact);
        const focus = new THREE.Vector3(0, 69 / screenUp, 0);
        this.camera.position
            .copy(focus)
            .add(new THREE.Vector3(0, 300, 300 / Math.tan(Math.PI / 6)));
        this.camera.lookAt(focus);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
    }
    setDisplayHeight(height) {
        this.displayHeight = height;
        this.resize();
    }
    setBones(showBones) {
        this.showBones = showBones;
    }
    draw(snapshot) {
        let detail;
        if (this.variant.kind === 'frame') {
            const { frame, index } = frameFor(snapshot);
            if (frame !== this.frame) {
                const scale = comparisonRules.characterHeight / 63;
                this.character.geometry.dispose();
                this.character.geometry = new THREE.PlaneGeometry(frame.width * scale, frame.height * scale);
                this.character.geometry.translate((frame.width / 2 - frame.pivot.x) * scale, (frame.height * scale) / 2, 0);
                this.character.material.map =
                    this.variant.textures.get(frame.localPath) ?? null;
                this.character.material.needsUpdate = true;
                this.frame = frame;
            }
            detail = `프레임 ${index + 1} / ${motions[snapshot.motion].frames.length}`;
            this.host.dataset.frameIndex = String(index);
        }
        else {
            const pose = hybridPose(snapshot);
            this.context.resetTransform();
            this.context.clearRect(0, 0, this.composition.width, this.composition.height);
            this.context.scale(textureSize.resolution, textureSize.resolution);
            this.context.translate(textureSize.width / 2, textureSize.footY - comparisonRules.characterHeight);
            drawHybrid(this.context, this.variant.images, pose, this.showBones);
            this.canvasTexture.needsUpdate = true;
            detail =
                pose.attachment === 'rig'
                    ? '부위 움직임'
                    : `${pose.attachment === 'punch' ? '정권' : '발차기'} 그림 교체`;
            this.host.dataset.attachment = pose.attachment;
        }
        this.character.scale.x = snapshot.facing;
        this.character.position.set(snapshot.x, 0.06, 0);
        this.shadow.position.x = snapshot.x;
        const hit = snapshot.impactAge >= 0 && snapshot.impactAge < 0.18;
        this.impact.visible = hit;
        this.impact.material.opacity = hit ? 1 - snapshot.impactAge / 0.18 : 0;
        this.impact.scale.setScalar(1 + Math.max(0, snapshot.impactAge) * 22);
        this.impact.scale.y /= screenUp;
        this.target.rotation.z = hit ? Math.sin(snapshot.impactAge * 55) * 0.07 : 0;
        this.renderer.render(this.scene, this.camera);
        this.host.dataset.motion = snapshot.motion;
        this.host.dataset.time = snapshot.time.toFixed(4);
        this.host.dataset.x = snapshot.x.toFixed(4);
        this.host.dataset.frozen = String(snapshot.frozen);
        const foot = new THREE.Vector3(snapshot.x, 0.06, 0).project(this.camera);
        this.host.dataset.footX = String(((foot.x + 1) * this.host.clientWidth) / 2);
        this.host.dataset.footY = String(((1 - foot.y) * this.host.clientHeight) / 2);
        return detail;
    }
    dispose() {
        this.resizeObserver.disconnect();
        this.canvasTexture.dispose();
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh ||
                object instanceof THREE.LineSegments) {
                object.geometry.dispose();
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                materials.forEach((material) => material.dispose());
            }
        });
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
    resize() {
        const width = this.host.clientWidth;
        const height = this.host.clientHeight;
        if (!width || !height)
            return;
        this.renderer.setSize(width, height);
        const viewHeight = (comparisonRules.characterHeight * height) / this.displayHeight;
        this.camera.top = viewHeight / 2;
        this.camera.bottom = -viewHeight / 2;
        this.camera.right = (viewHeight * width) / height / 2;
        this.camera.left = -this.camera.right;
        this.camera.updateProjectionMatrix();
    }
}
