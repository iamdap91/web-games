import * as THREE from 'three';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import { AnimationPlayer, } from '../../preview/animation-player.js';
import { dojoLayout } from '../dojo/dojo-layout.js';
/** 마을 인물 하나의 모션·수직 스프라이트·발 그림자와 전용 자원을 소유한다. */
export class DojoCharacter {
    motions;
    displayScale;
    footAnchor;
    root = new THREE.Group();
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({
        color: 0x374132,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
    }));
    material = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    mealMaterial = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    mealSprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mealMaterial);
    mealFrame = null;
    seatedMeal = false;
    player;
    textures = new SpriteTextures();
    frame = null;
    motion = 'stand';
    renderedFrame = 0;
    constructor(motions, verticalScale, displayScale = 1, footAnchor = 'bottom') {
        this.motions = motions;
        this.displayScale = displayScale;
        this.footAnchor = footAnchor;
        this.player = new AnimationPlayer(motions, 'stand');
        this.sprite.layers.set(resourceLayers.character);
        this.sprite.rotation.y = dojoLayout.cameraYaw;
        this.sprite.scale.y = verticalScale;
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.65;
        this.mealSprite.layers.set(resourceLayers.character);
        this.mealSprite.rotation.y = this.sprite.rotation.y;
        this.mealSprite.scale.y = verticalScale;
        this.mealSprite.visible = false;
        this.root.add(this.sprite, this.mealSprite, this.shadow);
    }
    async load() {
        const paths = new Set([...this.motions.values()].flatMap((motion) => motion.frames.map((frame) => frame.localPath)));
        await this.textures.load(paths, '마을 인물의 로컬 스프라이트를 확인해 주세요.');
    }
    render(options) {
        if (this.motion !== options.motion) {
            this.player.play(options.motion);
            this.motion = options.motion;
        }
        this.player.update(options.delta);
        const frame = (options.frameIndex === undefined
            ? undefined
            : this.motions.get(options.motion)?.frames[options.frameIndex]) ??
            this.player.currentFrame.frame;
        this.renderedFrame = options.frameIndex ?? this.player.currentFrame.index;
        const pixels = dojoLayout.actor.pixelsPerUnit / this.displayScale;
        const seatedMeal = options.mealFrameIndex !== undefined;
        const seatedLegHeight = 17;
        if (this.frame !== frame || this.seatedMeal !== seatedMeal) {
            this.material.map = this.textures.get(frame.localPath) ?? null;
            this.material.needsUpdate = true;
            this.sprite.geometry.dispose();
            this.sprite.geometry = new THREE.PlaneGeometry(frame.width / pixels, (seatedMeal ? seatedLegHeight : frame.height) / pixels);
            // 메타데이터의 원점을 발 위치로 통일한다. 프레임의 투명 여백도 함께 보존한다.
            this.sprite.geometry.translate((frame.width / 2 - frame.pivot.x) / pixels, ((seatedMeal ? seatedLegHeight : frame.height) / 2 -
                (this.footAnchor === 'frame-pivot' ? frame.pivot.y : 0)) /
                pixels, 0);
            if (seatedMeal) {
                // 앉은 하반신을 유지하고 식사 모션의 상반신만 이어 다리가 다시 서지 않게 한다.
                const uv = this.sprite.geometry.getAttribute('uv');
                for (let i = 0; i < uv.count; i++)
                    uv.setY(i, (uv.getY(i) * seatedLegHeight) / frame.height);
            }
            this.frame = frame;
            this.seatedMeal = seatedMeal;
        }
        this.sprite.scale.x = options.facing === 'right' ? -1 : 1;
        this.sprite.position.set(options.x, options.y + 0.035, options.z);
        this.shadow.position.set(options.x, options.y + 0.028, options.z);
        const mealFrame = options.mealFrameIndex === undefined
            ? undefined
            : this.motions.get('eat')?.frames[options.mealFrameIndex];
        this.mealSprite.visible = !!mealFrame;
        if (mealFrame) {
            if (this.mealFrame !== mealFrame) {
                const upperHeight = frame.height - seatedLegHeight;
                this.mealMaterial.map = this.textures.get(mealFrame.localPath) ?? null;
                this.mealMaterial.needsUpdate = true;
                this.mealSprite.geometry.dispose();
                this.mealSprite.geometry = new THREE.PlaneGeometry(mealFrame.width / pixels, upperHeight / pixels);
                this.mealSprite.geometry.translate((mealFrame.width / 2 - mealFrame.pivot.x) / pixels, (seatedLegHeight + upperHeight / 2) / pixels, 0);
                const uv = this.mealSprite.geometry.getAttribute('uv');
                for (let i = 0; i < uv.count; i++)
                    uv.setY(i, 1 - ((1 - uv.getY(i)) * upperHeight) / mealFrame.height);
                this.mealFrame = mealFrame;
            }
            this.mealSprite.position.copy(this.sprite.position);
            this.mealSprite.scale.x = this.sprite.scale.x;
        }
    }
    get head() {
        return this.sprite.position
            .clone()
            .add(new THREE.Vector3(0, (((this.frame?.height ?? 64) -
            (this.footAnchor === 'frame-pivot'
                ? (this.frame?.pivot.y ?? 0)
                : 0)) /
            dojoLayout.actor.pixelsPerUnit) *
            this.displayScale *
            this.sprite.scale.y, 0));
    }
    get diagnostics() {
        return {
            motion: this.motion,
            frame: this.renderedFrame,
            seatedMeal: this.seatedMeal,
        };
    }
    dispose() {
        this.sprite.geometry.dispose();
        this.material.dispose();
        this.mealSprite.geometry.dispose();
        this.mealMaterial.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
        this.textures.dispose();
        this.root.clear();
    }
}
