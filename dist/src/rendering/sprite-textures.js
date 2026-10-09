import * as THREE from 'three';
/** 한 화면에서 쓰는 스프라이트 텍스처의 로딩·필터·수명을 소유한다. */
export class SpriteTextures {
    textures = new Map();
    disposed = false;
    async load(paths, errorMessage) {
        const loader = new THREE.TextureLoader();
        const results = await Promise.allSettled(Array.from(paths, async (path) => {
            const texture = await loader.loadAsync(new URL(`../../../${path}`, import.meta.url).href);
            if (this.disposed) {
                texture.dispose();
                return;
            }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            this.textures.set(path, texture);
        }));
        if (results.some((result) => result.status === 'rejected'))
            throw new Error(errorMessage);
    }
    get(path) {
        return this.textures.get(path);
    }
    dispose() {
        this.disposed = true;
        this.textures.forEach((texture) => texture.dispose());
        this.textures.clear();
    }
}
