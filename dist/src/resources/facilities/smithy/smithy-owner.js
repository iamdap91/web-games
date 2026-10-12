import * as THREE from 'three';
import { basecampLayout } from '../../maps/basecamp/basecamp-layout.js';
import { dojoLayout } from '../dojo/dojo-layout.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
/** 장인 한 명의 정지 스프라이트·발 그림자·복구 단계별 표시와 전용 자원을 소유한다. */
export class SmithyOwner {
    root = new THREE.Group();
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({
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
    textures = new SpriteTextures();
    frame;
    level = 0;
    loaded = false;
    disposed = false;
    constructor(options) {
        const { frame, verticalScale, displayScale } = options;
        this.frame = frame;
        const pixels = dojoLayout.actor.pixelsPerUnit;
        const geometry = new THREE.PlaneGeometry(frame.width / pixels, frame.height / pixels);
        geometry.translate((frame.width / 2 - frame.pivot.x) / pixels, (frame.height / 2 - frame.pivot.y) / pixels, 0);
        this.sprite = new THREE.Mesh(geometry, this.material);
        this.sprite.layers.set(resourceLayers.character);
        this.sprite.rotation.y = dojoLayout.cameraYaw;
        this.sprite.scale.set(displayScale, verticalScale * displayScale, 1);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.65;
        this.shadow.position.y = 0.003;
        this.root.add(this.sprite, this.shadow);
        const offset = basecampLayout.placements.smithy;
        // 남쪽 입구의 보행 폭을 비우고, 작업대와 물통 앞의 빈 마당에 세운다.
        this.root.position.set(offset.x - 9.4, 0.055, offset.z + 5.1);
        this.root.visible = false;
    }
    async load() {
        await this.textures.load([this.frame.localPath], '대장간 장인의 로컬 AI 스프라이트를 확인해 주세요.');
        if (this.disposed)
            return;
        this.material.map = this.textures.get(this.frame.localPath) ?? null;
        this.material.needsUpdate = true;
        this.loaded = true;
        this.setLevel(this.level);
    }
    setLevel(level) {
        if (this.disposed)
            return;
        this.level = level;
        this.root.visible = this.loaded && level >= 1;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.root.visible = false;
        this.sprite.geometry.dispose();
        this.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
        this.textures.dispose();
        this.root.clear();
    }
}
