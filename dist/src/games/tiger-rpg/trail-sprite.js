import * as THREE from 'three';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { setResourceOutline } from '../../resources/environment/environment-resources.js';
import { resourceLayers } from '../../rendering/surface-types.js';
import { clearingScreenUpY } from '../../prototypes/land-clearing/clearing-camera.js';
import { AnimationPlayer, } from '../../resources/preview/animation-player.js';
/** 보행·대기만 재생한다. 실제 전투의 공격 연출은 전투 화면이 소유한다. */
export class TrailSprite {
    motions;
    textures;
    pixelsPerUnit;
    footAnchor;
    mesh;
    shadow;
    animation;
    frame = null;
    motion = '';
    constructor(motions, textures, pixelsPerUnit, shadowRadius, footAnchor = 'bottom') {
        this.motions = motions;
        this.textures = textures;
        this.pixelsPerUnit = pixelsPerUnit;
        this.footAnchor = footAnchor;
        this.animation = new AnimationPlayer(motions, 'stand');
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide }));
        this.mesh.layers.set(resourceLayers.character);
        this.mesh.scale.y = 1 / clearingScreenUpY;
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(shadowRadius, 20), new THREE.MeshBasicMaterial({
            color: 0x344435,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
        }));
        this.shadow.rotation.x = -Math.PI / 2;
        setResourceOutline(this.shadow, 'ground');
    }
    update(position, motion, delta) {
        if (this.motion !== motion) {
            this.motion = motion;
            this.animation.play(motion);
        }
        this.animation.update(delta);
        const frame = this.animation.currentFrame.frame;
        if (frame !== this.frame) {
            this.mesh.geometry.dispose();
            this.mesh.geometry = new THREE.PlaneGeometry(frame.width / this.pixelsPerUnit, frame.height / this.pixelsPerUnit);
            this.mesh.geometry.translate((frame.width / 2 - frame.pivot.x) / this.pixelsPerUnit, (frame.height / 2 -
                (this.footAnchor === 'frame-pivot' ? frame.pivot.y : 0)) /
                this.pixelsPerUnit, 0);
            this.mesh.material.map = this.textures.get(frame.localPath) ?? null;
            this.mesh.material.needsUpdate = true;
            this.frame = frame;
        }
        this.mesh.position.set(position.x, 0.035, position.z);
        this.shadow.position.set(position.x, 0.022, position.z);
    }
    get head() {
        return new THREE.Vector3(this.mesh.position.x, 0.035 +
            ((this.frame?.height ?? 64) -
                (this.footAnchor === 'frame-pivot'
                    ? (this.frame?.pivot.y ?? 0)
                    : 0)) /
                this.pixelsPerUnit /
                clearingScreenUpY, this.mesh.position.z);
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
    }
}
export function trailMotions(id, walking) {
    const asset = manifest.assets.find((asset) => asset.id === id);
    if (!asset)
        throw new Error(`산길 캐릭터 정보가 없습니다: ${id}`);
    return new Map(Object.entries(asset.animations).filter(([name]) => name === 'stand' ||
        (walking &&
            (name.startsWith('stand-') ||
                name.startsWith('move') ||
                ['crouch', 'straight-punch', 'gather-down'].includes(name)))));
}
