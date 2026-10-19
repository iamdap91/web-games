import * as THREE from 'three';
import { smoothRange } from './trail-ground.js';
function noise(x, z) {
    return (Math.sin(x * 0.69 + Math.sin(z * 0.47)) * 0.42 +
        Math.cos(z * 1.13 - x * 0.23) * 0.24 +
        Math.sin(x * 2.17 + z * 1.83) * 0.09);
}
/** 지면·물가의 색면과 재질, 보행과 같은 거리장의 윤곽을 그린다. */
export class TrailTerrain {
    root = new THREE.Group();
    textures = [];
    canvases = [];
    overlay;
    waterMaterial;
    material;
    ground;
    tones;
    soilBounds;
    fieldBounds;
    constructor(options) {
        this.ground = options.ground;
        const bounds = this.ground.bounds;
        const extent = {
            minX: Math.floor(bounds.minX),
            maxX: Math.ceil(bounds.maxX),
            minZ: Math.floor(bounds.minZ),
            maxZ: Math.ceil(bounds.maxZ),
        };
        const overview = this.ground.definition.camera;
        const overviewDepth = ((overview.span / 1.6) *
            Math.hypot(overview.y, overview.z - overview.targetZ)) /
            overview.y;
        // 전체 지도 시야가 넓어져도 지면 평판의 직선 끝이 화면에 드러나지 않게 한다.
        this.soilBounds =
            this.ground.variant === 'seamless'
                ? {
                    minX: Math.min(extent.minX - 20, overview.targetX - overview.span - 4),
                    maxX: Math.max(extent.maxX + 20, overview.targetX + overview.span + 4),
                    minZ: Math.min(extent.minZ - 16, overview.targetZ - overviewDepth - 6),
                    maxZ: Math.max(extent.maxZ + 16, overview.targetZ + overviewDepth + 6),
                }
                : { minX: -36, maxX: 36, minZ: -27, maxZ: 27 };
        this.fieldBounds =
            this.ground.variant === 'seamless'
                ? {
                    minX: extent.minX - 2,
                    maxX: extent.maxX + 2,
                    minZ: extent.minZ - 2,
                    maxZ: extent.maxZ + 2,
                }
                : { minX: -20, maxX: 20, minZ: -17, maxZ: 17 };
        const tones = {
            boar: { base: 0x8c9866, shade: 0x52694e, path: 0xc0a47b, edge: 0x9a986d },
            bear: { base: 0xe1e8df, shade: 0x9cb6c0, path: 0xc7d3cc, edge: 0xd8e0d8 },
            armadillo: {
                base: 0x6d6660,
                shade: 0x414a49,
                path: 0xa18a72,
                edge: 0x82796b,
            },
            mantis: {
                base: 0x84996b,
                shade: 0x486852,
                path: 0xbda77f,
                edge: 0x969970,
            },
        };
        const regionTones = tones[this.ground.region];
        // 넓은 설원에서도 통행로를 읽을 수 있도록 다져진 눈의 푸른 그늘을 남긴다.
        this.tones =
            this.ground.variant === 'seamless' && this.ground.region === 'bear'
                ? { ...regionTones, path: 0xa6bbc0, edge: 0xc1d0d0 }
                : regionTones;
        const grain = this.texture([0xf3f0e7, 0x9f9c8c, 0xffffff], 491);
        this.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            map: grain,
            bumpMap: grain,
            bumpScale: 0.025,
            roughness: 0.98,
        });
        const soil = new THREE.Mesh(this.groundGeometry(), this.material);
        soil.receiveShadow = true;
        this.root.add(soil);
        this.waterMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: this.ground.region === 'bear' ? 0.46 : 0.32,
            metalness: 0.12,
        });
        if (this.ground.region === 'armadillo') {
            this.waterMaterial.emissive.setHex(0xd95d28);
            this.waterMaterial.emissiveIntensity = 0.8;
        }
        const water = new THREE.Mesh(this.clippedGeometry((p) => this.ground.waterDistance(p), () => -0.065, true), this.waterMaterial);
        water.receiveShadow = true;
        this.root.add(water);
        this.overlay = new THREE.Mesh(this.clippedGeometry((p) => this.ground.distance(p), (p) => this.ground.heightAt(p) + 0.04, false), new THREE.MeshBasicMaterial({
            color: 0xe8c779,
            opacity: 0.17,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        this.overlay.visible = false;
        this.root.add(this.overlay);
        this.styleModels(options.kit);
        this.addWaterGlints();
    }
    groundGeometry() {
        const positions = [], colors = [], uv = [], indices = [];
        const bounds = this.soilBounds;
        const segmentsX = Math.ceil((bounds.maxX - bounds.minX) / 0.5), segmentsZ = Math.ceil((bounds.maxZ - bounds.minZ) / 0.5);
        for (let iz = 0; iz <= segmentsZ; iz++)
            for (let ix = 0; ix <= segmentsX; ix++) {
                const x = bounds.minX + ix * 0.5, z = bounds.minZ + iz * 0.5;
                const point = { x, z };
                positions.push(x, this.ground.terrainHeight(point), z);
                const color = this.groundColor(point);
                colors.push(color.r, color.g, color.b);
                uv.push(x / 5, z / 5);
            }
        for (let iz = 0; iz < segmentsZ; iz++)
            for (let ix = 0; ix < segmentsX; ix++) {
                const a = iz * (segmentsX + 1) + ix, b = a + segmentsX + 1;
                indices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }
    groundColor(point) {
        const d = this.ground.distance(point), n = noise(point.x, point.z);
        const base = new THREE.Color(this.tones.shade).lerp(new THREE.Color(this.tones.base), 0.67 + n * 0.09);
        const wear = 1 - smoothRange(-0.22, 0.25, d + n * 0.15);
        const shoulder = 1 - smoothRange(-0.12, 0.75, d + noise(point.z, point.x) * 0.22);
        base.lerp(new THREE.Color(this.tones.edge), shoulder * 0.63);
        base.lerp(new THREE.Color(this.tones.path), wear * (0.88 + n * 0.1));
        const water = this.ground.waterDistance(point);
        if (water < 1.15 && wear < 0.9) {
            const wet = this.ground.region === 'bear'
                ? 0x8faeb8
                : this.ground.region === 'armadillo'
                    ? 0x55504c
                    : 0x6a8062;
            base.lerp(new THREE.Color(wet), (1 - smoothRange(0, 1.15, Math.max(0, water))) * 0.55);
        }
        // 드문 이끼와 빛의 색을 넓게 섞어 단색 평판 느낌을 줄인다.
        const light = Math.sin(point.x * 0.18 + point.z * 0.13) * 0.015 + n * 0.01;
        return base.offsetHSL(0, 0, light);
    }
    clippedGeometry(field, height, water) {
        const positions = [], colors = [], uv = [];
        const append = (p) => {
            positions.push(p.x, height(p), p.z);
            uv.push(p.x / 4, p.z / 4);
            const depth = smoothRange(0, 2.0, -this.ground.waterDistance(p));
            const edge = this.ground.region === 'armadillo'
                ? 0xf2a654
                : this.ground.region === 'bear'
                    ? 0xb5d6dc
                    : 0x9bb8a3;
            const deep = this.ground.region === 'armadillo'
                ? 0xc85527
                : this.ground.region === 'bear'
                    ? 0x6395b0
                    : 0x3d827d;
            const color = new THREE.Color(edge)
                .lerp(new THREE.Color(deep), depth * 0.75 + 0.14)
                .offsetHSL(0, 0, noise(p.x * 2, p.z * 2) * 0.025);
            colors.push(color.r, color.g, color.b);
        };
        const triangle = (a, b, c) => {
            const input = [a, b, c];
            const clipped = [];
            for (let i = 0; i < input.length; i++) {
                const p = input[i], q = input[(i + 1) % input.length];
                if (p.distance <= 0)
                    clipped.push(p);
                if (p.distance < 0 !== q.distance < 0) {
                    const t = p.distance / (p.distance - q.distance);
                    clipped.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
                }
            }
            for (let i = 1; i < clipped.length - 1; i++) {
                append(clipped[0]);
                append(clipped[i]);
                append(clipped[i + 1]);
            }
        };
        const step = 0.35;
        for (let z = this.fieldBounds.minZ; z < this.fieldBounds.maxZ; z += step)
            for (let x = this.fieldBounds.minX; x < this.fieldBounds.maxX; x += step) {
                const vertex = (px, pz) => ({
                    x: px,
                    z: pz,
                    distance: field({ x: px, z: pz }),
                });
                const a = vertex(x, z), b = vertex(x, z + step), c = vertex(x + step, z), d = vertex(x + step, z + step);
                triangle(a, b, c);
                triangle(c, b, d);
            }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        if (water)
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        return geometry;
    }
    texture(tones, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('이동맵 소재를 그릴 수 없습니다.');
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        const css = tones.map((tone) => `#${tone.toString(16).padStart(6, '0')}`);
        ctx.fillStyle = css[0];
        ctx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 65; i++) {
            ctx.globalAlpha = 0.04 + random() * 0.075;
            ctx.fillStyle = css[(i % 2) + 1];
            ctx.beginPath();
            ctx.ellipse(random() * 128, random() * 128, 3 + random() * 17, 2 + random() * 8, random() * 3.14, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 260; i++) {
            ctx.globalAlpha = 0.09 + random() * 0.1;
            ctx.fillStyle = css[(i % 2) + 1];
            ctx.fillRect(Math.floor(random() * 64) * 2, Math.floor(random() * 64) * 2, 1 + random() * 3, 1 + random() * 2);
        }
        ctx.globalAlpha = 1;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.canvases.push(canvas);
        this.textures.push(texture);
        return texture;
    }
    styleModels(kit) {
        const tones = {
            earth: [0xa48e6c, 0xc0a77c, 0x776e52],
            grass: [0x7e8d60, 0xa2aa79, 0x526c50],
            stone: [0x9b9e8c, 0xc1c2a7, 0x737f73],
            bark: [0x78674c, 0xa29166, 0x454f3d],
            moss: [0x788952, 0xa6ad73, 0x476647],
            wood: [0x9b815c, 0xc1a379, 0x675b45],
            cloth: [0x809b8c, 0xb5b8a0, 0x596c61],
            snow: [0xd8e4df, 0xf3eee2, 0xa1bfca],
            ice: [0x9bbcc7, 0xd2e2df, 0x729baa],
            basalt: [0x656363, 0x99928b, 0x39494a],
            lava: [0xeb8f43, 0xf4c378, 0xaf542e],
            ash: [0x897b6a, 0xb09b7d, 0x5b5e55],
            bamboo: [0x809267, 0xadb785, 0x4f7154],
            leaf: [0x5d8158, 0x99a36d, 0x345a49],
            rope: [0xafa177, 0xd0c29b, 0x82795d],
        };
        for (const [key, palette] of Object.entries(tones)) {
            const kind = key, material = kit.material(kind), map = this.texture(palette, key.length * 379 + 17);
            material.map = material.bumpMap = map;
            material.bumpScale = kind === 'snow' ? 0.014 : 0.035;
            material.color.setHex(0xffffff);
            material.flatShading = kind === 'basalt';
            material.roughness = kind === 'ice' ? 0.43 : 0.96;
            material.needsUpdate = true;
        }
    }
    addWaterGlints() {
        const positions = [];
        const bounds = this.ground.variant === 'seamless'
            ? this.ground.bounds
            : { minX: -18, maxX: 18, minZ: -15, maxZ: 15 };
        const count = this.ground.variant === 'seamless' ? 225 : 75;
        for (let i = 0; i < count; i++) {
            const x = bounds.minX + ((i * 7.731) % (bounds.maxX - bounds.minX)), z = bounds.minZ + ((i * 13.17) % (bounds.maxZ - bounds.minZ));
            if (this.ground.waterDistance({ x, z }) > -0.3)
                continue;
            const w = 0.18 + (i % 4) * 0.12;
            positions.push(x - w, -0.048, z, x + w, -0.048, z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: this.ground.region === 'armadillo' ? 0xffd793 : 0xd2e3cb,
            transparent: true,
            opacity: 0.25,
        });
        this.root.add(new THREE.LineSegments(geometry, material));
    }
    togglePaths() {
        this.overlay.visible = !this.overlay.visible;
        return this.overlay.visible;
    }
    dispose() {
        this.root.traverse((object) => {
            if (object instanceof THREE.Mesh ||
                object instanceof THREE.LineSegments) {
                object.geometry.dispose();
                for (const material of Array.isArray(object.material)
                    ? object.material
                    : [object.material])
                    material.dispose();
            }
        });
        this.textures.forEach((texture) => texture.dispose());
        this.canvases.forEach((canvas) => {
            canvas.width = canvas.height = 1;
        });
        this.root.clear();
    }
}
