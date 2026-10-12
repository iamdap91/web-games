import * as THREE from 'three';
import { dojoConversation } from './dojo-conversation.js';
import { dojoLayout } from './dojo-layout.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
/** 앉은 주인의 로컬 스프라이트·발 그림자·화자 머리 위치와 전용 자원을 소유한다. */
export class DojoOwner {
    root = new THREE.Group();
    shadow = new THREE.Mesh(new THREE.CircleGeometry(dojoConversation.ownerRadius, 24), new THREE.MeshBasicMaterial({
        color: 0x374132,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
    }));
    material = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    sprite;
    headAnchor = new THREE.Object3D();
    textures = new SpriteTextures();
    frame;
    disposed = false;
    constructor(options) {
        const { frame, verticalScale, displayScale } = options;
        this.frame = frame;
        const pixels = dojoLayout.actor.pixelsPerUnit;
        const geometry = new THREE.PlaneGeometry(frame.width / pixels, frame.height / pixels);
        // 투명 여백을 포함한 메타데이터의 발 원점을 월드 위치에 맞춘다.
        geometry.translate((frame.width / 2 - frame.pivot.x) / pixels, (frame.height / 2 - frame.pivot.y) / pixels, 0);
        this.sprite = new THREE.Mesh(geometry, this.material);
        this.sprite.layers.set(resourceLayers.character);
        this.sprite.rotation.y = dojoLayout.cameraYaw;
        this.sprite.scale.set(displayScale, verticalScale * displayScale, 1);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.65;
        this.shadow.position.y = 0.003;
        this.headAnchor.position.y =
            ((frame.height - frame.pivot.y) / pixels) * this.sprite.scale.y;
        this.root.add(this.sprite, this.shadow, this.headAnchor);
        const { x, y, z } = dojoConversation.owner;
        this.root.position.set(x, y + 0.025, z);
        this.root.visible = false;
    }
    async load() {
        await this.textures.load([this.frame.localPath], '도장 주인의 로컬 AI 스프라이트를 확인해 주세요.');
        if (this.disposed)
            return;
        this.material.map = this.textures.get(this.frame.localPath) ?? null;
        this.material.needsUpdate = true;
        this.root.visible = true;
    }
    get head() {
        return this.headAnchor.getWorldPosition(new THREE.Vector3());
    }
    face(target) {
        // 카메라를 향한 평면의 가로축으로 상대 위치를 비교하고, 대화 밖에서는 원래 방향을 쓴다.
        const horizontal = target
            ? (target.x - this.root.position.x) * Math.cos(this.sprite.rotation.y) -
                (target.z - this.root.position.z) * Math.sin(this.sprite.rotation.y)
            : 0;
        this.sprite.scale.x =
            Math.abs(this.sprite.scale.x) * (horizontal < 0 ? -1 : 1);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.sprite.geometry.dispose();
        this.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
        this.textures.dispose();
        this.root.clear();
    }
}
