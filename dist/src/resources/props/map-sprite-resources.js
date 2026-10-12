import * as THREE from 'three';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { SpriteTextures } from '../../rendering/sprite-textures.js';
import { resourceLayers } from '../../rendering/surface-types.js';
/** 지도 소품 이미지와 배치·카메라 보정·GPU 수명을 소유한다. 충돌·보상·채집 규칙은 소유하지 않는다. */
export class MapSpriteResources {
    root = new THREE.Group();
    geometry = new THREE.PlaneGeometry(1, 1);
    textures = new SpriteTextures();
    frames = new Map();
    entries = [];
    direction = new THREE.Vector3();
    disposed = false;
    constructor() {
        for (const id of [
            'ai/forest-quiet-scenery',
            'ai/quiet-map-details',
            'ai/quiet-facility-details',
            'ai/expedition-details',
        ]) {
            const asset = manifest.assets.find((entry) => entry.id === id);
            if (!asset)
                throw new Error(`지도 소품 리소스가 없습니다: ${id}`);
            for (const [key, animation] of Object.entries(asset.animations)) {
                const frame = animation?.frames[0];
                if (frame)
                    this.frames.set(key, frame);
            }
        }
        this.root.visible = false;
    }
    add(key, placement) {
        const frame = this.frames.get(key);
        if (!frame)
            throw new Error(`지도 소품 프레임이 없습니다: ${key}`);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(this.geometry, material);
        const kind = placement.kind ?? 'upright';
        const height = placement.depth ?? (placement.width * frame.height) / frame.width;
        const baseY = placement.y ?? 0.045;
        mesh.position.set(placement.x, baseY + (kind === 'ground' ? 0 : height / 2), placement.z);
        mesh.scale.set(placement.width, height, 1);
        if (kind === 'ground')
            mesh.rotation.x = -Math.PI / 2;
        // 작은 장식도 지형·인물의 깊이를 이어받고 원본 도트 크기를 보존한다.
        mesh.layers.set(resourceLayers.effects);
        (placement.parent ?? this.root).add(mesh);
        this.entries.push({ mesh, path: frame.localPath, baseY, height, kind });
        return mesh;
    }
    async load() {
        await this.textures.load(new Set(this.entries.map((entry) => entry.path)), '지도 소품 이미지가 없어요. 로컬 quiet-map-details와 forest-quiet-ai 리소스를 확인해 주세요.');
        if (this.disposed)
            return;
        for (const { mesh, path } of this.entries) {
            mesh.material.visible = true;
            mesh.material.map = this.textures.get(path) ?? null;
            mesh.material.needsUpdate = true;
        }
        this.root.visible = true;
    }
    face(camera) {
        camera.getWorldDirection(this.direction);
        const angle = Math.atan2(-this.direction.x, -this.direction.z);
        const screenUp = Math.hypot(this.direction.x, this.direction.z);
        for (const entry of this.entries) {
            if (entry.kind !== 'upright')
                continue;
            entry.mesh.rotation.y = angle;
            entry.mesh.scale.y = entry.height / Math.max(0.1, screenUp);
            entry.mesh.position.y = entry.baseY + entry.mesh.scale.y / 2;
        }
    }
    dispose() {
        this.disposed = true;
        for (const { mesh } of this.entries) {
            mesh.removeFromParent();
            mesh.material.dispose();
        }
        this.root.removeFromParent();
        this.root.clear();
        this.entries.length = 0;
        this.textures.dispose();
        this.geometry.dispose();
    }
}
