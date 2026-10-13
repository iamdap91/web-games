import * as THREE from 'three';
import { normalPixels } from '../village-style-lit2d/normal.js';
const colors = {
    bark: ['#564c36', '#766748', '#95845a', '#a99a69'],
    root: ['#9b8059', '#b39a6b', '#c7b486', '#d9c89c'],
    moss: ['#354f3e', '#46634b', '#607b56', '#819064'],
    stone: ['#6a6b55', '#868a6a', '#a7a989', '#c0b797'],
    cap: ['#765441', '#986a51', '#ba8e6a', '#d5bd8d'],
};
function noise(seed) {
    const n = Math.sin(seed * 73.17 + 19.31) * 43758.5453;
    return n - Math.floor(n);
}
/** 사진 대신 작성한 껍질 홈·돌 높이장이 같은 UV의 albedo/normal에 들어간다. */
export function surfaceHeight(kind, x, y) {
    if (kind === 'root')
        return 1.8 * Math.sin(x * 0.17 + Math.sin(y * 0.065) * 0.7);
    if (kind === 'bark')
        return (3.6 * Math.sin(x * 0.31 + Math.sin(y * 0.085) * 1.7) +
            1.5 * Math.sin(x * 0.9 + y * 0.055));
    if (kind === 'stone')
        return (4 * Math.cos(x * 0.12) * Math.sin(y * 0.15) + 2 * Math.cos((x + y) * 0.38));
    if (kind === 'moss')
        return 2 * Math.sin(x * 0.21) * Math.sin(y * 0.19);
    return 1.2 * Math.sin(x * 0.17) * Math.cos(y * 0.18);
}
function canvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
}
function context(c) {
    const value = c.getContext('2d');
    if (!value)
        throw new Error('소재판 Canvas를 만들 수 없어요.');
    return value;
}
export class ForestMaterials {
    textures = [];
    surfaces = new Map();
    canvases = [];
    normalEnabled = true;
    surface(kind) {
        const existing = this.surfaces.get(kind);
        if (existing)
            return existing;
        const albedo = canvas(96, 96), normal = canvas(96, 96), c = context(albedo), heights = new Float32Array(96 * 96), tones = colors[kind];
        for (let y = 0; y < 96; y++)
            for (let x = 0; x < 96; x++)
                heights[y * 96 + x] = surfaceHeight(kind, x, y);
        const block = kind === 'root' || kind === 'moss' ? 4 : 2;
        for (let y = 0; y < 96; y += block)
            for (let x = 0; x < 96; x += block) {
                const h = surfaceHeight(kind, x, y), n = noise(x + y * 91), value = Math.max(0, Math.min(3, Math.floor((h + 6) / 4 +
                    n * (kind === 'root' || kind === 'moss' ? 0.12 : 0.7))));
                c.fillStyle = tones[value];
                c.fillRect(x, y, block, block);
                if (kind === 'cap' &&
                    noise(Math.floor(x / 8) + Math.floor(y / 8) * 89) > 0.89) {
                    c.fillStyle = '#d6c999';
                    c.fillRect(x, y, block, block);
                }
                if (kind === 'bark' && n > 0.95) {
                    c.fillStyle = '#728056';
                    c.fillRect(x, y, block, block);
                }
            }
        context(normal).putImageData(new ImageData(normalPixels(heights, 96, 96), 96, 96), 0, 0);
        const map = this.texture(albedo, { repeat: true, color: true }), normalMap = this.texture(normal, { repeat: true, color: false });
        const material = new THREE.MeshStandardMaterial({
            map,
            normalMap,
            normalScale: new THREE.Vector2(0.6, 0.6),
            roughness: 1,
            metalness: 0,
        });
        this.surfaces.set(kind, material);
        return material;
    }
    foliage(kind) {
        const c = canvas(64, 96), ctx = context(c);
        if (kind === 'leaf') {
            ctx.fillStyle = '#496145';
            for (let i = 0; i < 10; i++) {
                const x = 8 + noise(i) * 48, y = 15 + noise(i + 29) * 63;
                ctx.beginPath();
                ctx.ellipse(x, y, 7 + noise(i + 30) * 6, 4, noise(i + 12) * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = i % 2 ? '#8a9b64' : '#617d51';
                ctx.fillRect(x - 5, y - 1, 10, 2);
                ctx.fillStyle = '#496145';
            }
        }
        else {
            for (let i = 0; i < 18; i++) {
                const x = i * 3.5, y = 5 + noise(i + 6) * 25, h = 35 + noise(i + 19) * 50;
                ctx.fillStyle = i % 3 === 0 ? '#839357' : '#526d43';
                ctx.fillRect(x, y, 3, h);
                for (let j = 0; j < 7; j++) {
                    ctx.fillStyle = j % 2 ? '#6d814a' : '#91a361';
                    ctx.fillRect(x - 2, y + (j * h) / 7, 7, 4);
                }
            }
        }
        return new THREE.MeshLambertMaterial({
            map: this.texture(c, { repeat: false, color: true }),
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });
    }
    texture(c, options) {
        this.canvases.push(c);
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        if (options.repeat) {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
        }
        t.colorSpace = options.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        this.textures.push(t);
        return t;
    }
    setNormal(enabled) {
        this.normalEnabled = enabled;
        this.surfaces.forEach((m) => m.normalScale.setScalar(enabled ? 0.6 : 0));
    }
    get diagnostics() {
        return Object.freeze({
            normalEnabled: this.normalEnabled,
            surfaceKinds: Object.freeze([...this.surfaces.keys()]),
            textureCount: this.textures.length,
            materialPixels: 96,
        });
    }
    dispose() {
        this.textures.forEach((t) => t.dispose());
        this.surfaces.forEach((m) => m.dispose());
        this.canvases.forEach((c) => {
            c.width = 1;
            c.height = 1;
        });
        this.textures.length = 0;
        this.surfaces.clear();
    }
}
