import { litBrightness, } from './lighting.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { limitedPalette, paletteIndex, pixelSize } from './palette.js';
import { buildings, places, trees, riverCenter, } from './village.js';
const point = (p) => ({
    x: Math.round(p.x * 8),
    y: Math.round(22 + p.z * 6),
});
const paletteRgb = limitedPalette.map((color) => {
    const rgb = Number.parseInt(color.slice(1), 16);
    return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
});
/** Canvas의 벡터 보간 없이 각 정수 픽셀을 두 색 중 하나로 기록한다. */
class PixelRaster {
    surface = null;
    lights = [];
    setLights(lights) {
        this.lights = lights;
    }
    setSurface(surface) {
        this.surface = surface;
    }
    pixels = new Uint8Array(pixelSize.width * pixelSize.height);
    capture() {
        return this.pixels.slice();
    }
    restore(source) {
        this.pixels.set(source);
    }
    colorAt(x, y) {
        return this.pixels[y * pixelSize.width + x];
    }
    get memoryBytes() {
        return this.pixels.byteLength;
    }
    dispose() {
        this.pixels = new Uint8Array(0);
    }
    clear(value) {
        this.pixels.fill(value);
    }
    dot(x, y, light) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= pixelSize.width || y >= pixelSize.height)
            return;
        const brightness = this.surface && this.lights.length
            ? litBrightness(light, x, y, this.surface, this.lights)
            : light;
        this.pixels[y * pixelSize.width + x] = paletteIndex(brightness, x, y);
    }
    rect(x, y, w, h, light) {
        for (let py = Math.round(y); py < Math.round(y + h); py++)
            for (let px = Math.round(x); px < Math.round(x + w); px++)
                this.dot(px, py, light);
    }
    ellipse(x, y, rx, ry, light) {
        for (let py = Math.ceil(y - ry); py <= Math.floor(y + ry); py++) {
            const half = rx * Math.sqrt(Math.max(0, 1 - ((py - y) / ry) ** 2));
            this.rect(Math.ceil(x - half), py, Math.floor(half * 2) + 1, 1, light);
        }
    }
    polygon(points, light) {
        const low = Math.ceil(Math.min(...points.map((p) => p.y))), high = Math.floor(Math.max(...points.map((p) => p.y)));
        for (let y = low; y <= high; y++) {
            const cuts = [];
            for (let i = 0; i < points.length; i++) {
                const a = points[i], b = points[(i + 1) % points.length];
                if ((a.y <= y && b.y <= y) || (a.y > y && b.y > y))
                    continue;
                cuts.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
            }
            cuts.sort((a, b) => a - b);
            for (let i = 0; i + 1 < cuts.length; i += 2)
                this.rect(Math.ceil(cuts[i]), y, Math.floor(cuts[i + 1]) - Math.ceil(cuts[i]) + 1, 1, light);
        }
    }
    line(a, b, light, width = 1) {
        const count = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
        for (let i = 0; i <= count; i++)
            this.rect(a.x + ((b.x - a.x) * i) / count, a.y + ((b.y - a.y) * i) / count, width, width, light);
    }
    image() {
        const image = new ImageData(pixelSize.width, pixelSize.height);
        for (let i = 0; i < this.pixels.length; i++) {
            const value = this.pixels[i];
            if (value > 1)
                continue;
            const rgb = paletteRgb[value];
            image.data.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
        }
        return image;
    }
}
export class LimitedDrawing {
    canvas;
    ready;
    raster = new PixelRaster();
    terrain = new Uint8Array(pixelSize.width * pixelSize.height);
    lowCanvas = document.createElement('canvas');
    layerCanvas = document.createElement('canvas');
    context;
    lowContext;
    layerContext;
    images = new Map();
    pending = new Set();
    motions;
    cssWidth = 1;
    cssHeight = 1;
    dpr = 1;
    camera = { x: 24, z: 16.5 };
    scale = 1;
    disposed = false;
    environmentColorCount = 0;
    lastLighting = {};
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas를 사용할 수 없습니다.');
        this.context = context;
        for (const c of [this.lowCanvas, this.layerCanvas]) {
            c.width = pixelSize.width;
            c.height = pixelSize.height;
        }
        const low = this.lowCanvas.getContext('2d'), layer = this.layerCanvas.getContext('2d');
        if (!low || !layer)
            throw new Error('픽셀 버퍼를 만들 수 없습니다.');
        this.lowContext = low;
        this.layerContext = layer;
        const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!hero)
            throw new Error('승인된 아타호가 없습니다.');
        this.motions = new Map(Object.entries(hero.animations).filter(([key]) => [
            'stand',
            'stand-left',
            'stand-right',
            'stand-back',
            'move',
            'move-left',
            'move-right',
            'move-back',
        ].includes(key)));
        this.ready = Promise.all([...this.motions.values()]
            .flatMap((m) => m.frames)
            .map((frame) => this.load(frame))).then(() => undefined);
        this.drawTerrain();
        this.terrain = this.raster.capture();
        this.environmentColorCount = new Set(this.terrain).size;
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.cssWidth = Math.max(1, bounds.width);
        this.cssHeight = Math.max(1, bounds.height);
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = Math.round(this.cssWidth * this.dpr);
        this.canvas.height = Math.round(this.cssHeight * this.dpr);
        this.context.imageSmoothingEnabled = false;
    }
    origin() {
        const center = point(this.camera);
        return {
            x: Math.round((this.cssWidth / 2 - center.x * this.scale) * this.dpr) /
                this.dpr,
            y: Math.round((this.cssHeight / 2 - center.y * this.scale) * this.dpr) /
                this.dpr,
        };
    }
    project(p) {
        const source = point(p), origin = this.origin();
        return {
            x: origin.x + source.x * this.scale,
            y: origin.y + source.y * this.scale,
        };
    }
    pointerToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect(), origin = this.origin();
        return {
            x: (clientX - rect.left - origin.x) / (8 * this.scale),
            z: ((clientY - rect.top - origin.y) / this.scale - 22) / 6,
        };
    }
    get diagnostics() {
        return {
            ...this.lastLighting,
            palette: [...limitedPalette],
            environmentColorCount: this.environmentColorCount,
            environmentPixels: { ...pixelSize },
            dither: '4×4 Bayer ordered, 16 thresholds',
            ditherThresholds: 16,
            cssWidth: this.cssWidth,
            cssHeight: this.cssHeight,
            backingWidth: this.canvas.width,
            backingHeight: this.canvas.height,
            dpr: this.dpr,
            pixelScale: this.scale,
            devicePixelBlock: this.scale * this.dpr,
            worldAnchoredDither: true,
            imageCount: this.images.size,
            terrainCaches: this.disposed ? 0 : 1,
            cachedPixelBytes: this.terrain.byteLength + this.raster.memoryBytes,
            disposed: this.disposed,
        };
    }
    render(state, overview) {
        if (this.disposed)
            return;
        const desiredScale = overview
            ? Math.min(this.cssWidth / pixelSize.width, this.cssHeight / pixelSize.height)
            : Math.max(2.2, Math.min(3.5, this.cssHeight / 140));
        // 화면 픽셀 정수 배수로 확대해 카메라 이동에도 디더의 픽셀 폭을 고정한다.
        this.scale = Math.max(1 / this.dpr, Math.floor(desiredScale * this.dpr) / this.dpr);
        this.camera = overview
            ? { x: 24, z: 16.5 }
            : { x: state.position.x, z: state.position.z - 2.5 };
        const lamp = point({ x: state.lampSide === 'left' ? 10 : 21, z: 16 });
        const lights = state.lighting
            ? [{ x: lamp.x, y: lamp.y - 30, strength: 1.1 }]
            : [];
        if (state.lighting && state.fireSeconds > 0) {
            const fire = point(places[0]);
            lights.push({ x: fire.x, y: fire.y - 10, strength: 0.7 });
        }
        this.raster.setLights(lights);
        this.lastLighting = {
            lighting: state.lighting,
            lampSide: state.lampSide,
            surfaceLightCount: lights.length,
            lampPixel: lamp,
        };
        const layers = buildings.map((b) => ({
            z: b.z + b.d / 2,
            draw: () => this.house(b, state.restored),
        }));
        for (const t of trees)
            layers.push({ z: t.z, draw: () => this.tree(t.x, t.z, t.size) });
        layers.push({ z: 20.8, draw: () => this.hearth(state) }, { z: 5.3, draw: () => this.refuge(state) }, { z: 18.5, draw: () => this.laundry(state.elapsed) }, { z: 25.5, draw: () => this.fence(17.8, 25.5, 4) });
        layers.sort((a, b) => a.z - b.z);
        this.raster.restore(this.terrain);
        this.drawWater(state.elapsed);
        this.raster.rect(lamp.x - 1, lamp.y - 27, 2, 27, 0);
        this.raster.rect(lamp.x - 4, lamp.y - 33, 8, 9, 0);
        this.raster.rect(lamp.x - 2, lamp.y - 31, 4, 5, state.lighting ? 1 : 0.3);
        for (const p of state.route.filter((_, i) => i % 4 === 0)) {
            const s = point(p);
            this.raster.dot(s.x, s.y, 0);
            this.raster.dot(s.x + 1, s.y, 0);
        }
        for (const layer of layers)
            if (layer.z < state.position.z)
                layer.draw();
        const environmentColors = new Set(this.raster.capture());
        this.lowContext.putImageData(this.raster.image(), 0, 0);
        this.drawHero(state);
        this.raster.clear(255);
        for (const layer of layers)
            if (layer.z >= state.position.z)
                layer.draw();
        for (const value of this.raster.capture())
            if (value < 2)
                environmentColors.add(value);
        this.environmentColorCount = environmentColors.size;
        this.layerContext.putImageData(this.raster.image(), 0, 0);
        this.lowContext.drawImage(this.layerCanvas, 0, 0);
        this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.context.fillStyle = limitedPalette[0];
        this.context.fillRect(0, 0, this.cssWidth, this.cssHeight);
        const origin = this.origin();
        this.context.imageSmoothingEnabled = false;
        this.context.drawImage(this.lowCanvas, origin.x, origin.y, Math.round(pixelSize.width * this.scale), Math.round(pixelSize.height * this.scale));
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const image of this.pending) {
            image.onload = null;
            image.onerror = null;
            image.src = '';
        }
        this.pending.clear();
        this.images.clear();
        this.terrain = new Uint8Array(0);
        this.raster.dispose();
        for (const canvas of [this.lowCanvas, this.layerCanvas, this.canvas]) {
            canvas.width = 0;
            canvas.height = 0;
        }
    }
    load(frame) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            this.pending.add(image);
            image.onload = () => {
                this.pending.delete(image);
                if (!this.disposed)
                    this.images.set(frame.localPath, image);
                image.onload = image.onerror = null;
                resolve();
            };
            image.onerror = () => {
                this.pending.delete(image);
                reject(new Error(`아타호 프레임을 읽지 못했어요: ${frame.localPath}`));
            };
            image.src = new URL(`../../../../${frame.localPath}`, document.baseURI).href;
        });
    }
    drawTerrain() {
        const p = this.raster;
        p.clear(0);
        p.polygon([
            { x: 14, y: 40 },
            { x: 63, y: 28 },
            { x: 235, y: 30 },
            { x: 354, y: 48 },
            { x: 370, y: 173 },
            { x: 340, y: 208 },
            { x: 194, y: 223 },
            { x: 41, y: 208 },
            { x: 12, y: 156 },
        ], 0.81);
        // 큰 면을 나누고 길의 무지와 풀밭 디더 밀도로 명암을 구별한다.
        p.ellipse(98, 168, 72, 38, 0.9);
        p.ellipse(224, 95, 95, 49, 0.65);
        p.ellipse(325, 183, 41, 26, 0.57);
        const roads = [
            [
                { x: 23.5, z: 29 },
                { x: 23.5, z: 20 },
                { x: 16, z: 20 },
                { x: 16, z: 15.8 },
            ],
            [
                { x: 16, z: 20 },
                { x: 12, z: 23 },
                { x: 4, z: 23 },
                { x: 4, z: 8 },
                { x: 11, z: 5.5 },
                { x: 35, z: 7.3 },
            ],
            [
                { x: 23.5, z: 20 },
                { x: 24, z: 9 },
                { x: 28, z: 7 },
                { x: 35, z: 7.3 },
            ],
            [
                { x: 23.5, z: 21 },
                { x: 45, z: 21 },
            ],
            [
                { x: 23.5, z: 19.4 },
                { x: 32, z: 18.3 },
            ],
        ];
        for (const road of roads)
            for (let i = 0; i + 1 < road.length; i++) {
                const a = point(road[i]), b = point(road[i + 1]), length = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
                for (let t = 0; t <= length; t++) {
                    const x = a.x + ((b.x - a.x) * t) / length, y = a.y + ((b.y - a.y) * t) / length;
                    p.ellipse(x, y, 9, 5, 1);
                }
            }
        for (let z = 9; z < 31; z += 0.15) {
            const s = point({ x: riverCenter(z), z });
            p.rect(s.x - 16, s.y, 32, 2, 0);
            p.rect(s.x - 11, s.y, 22, 2, 0.16);
        }
        for (let i = 0; i < 70; i++) {
            const x = 20 + ((i * 73) % 339), y = 43 + ((i * 47) % 158);
            if (this.raster.colorAt(x, y) !== 1 || Math.abs(x - 188) < 13)
                continue;
            p.line({ x, y }, { x: x - 2, y: y - 3 }, 0);
            p.line({ x, y }, { x: x + 2, y: y - 4 }, 0);
        }
        const bridge = point({ x: riverCenter(21), z: 21 });
        p.rect(bridge.x - 25, bridge.y - 9, 50, 18, 0);
        p.rect(bridge.x - 24, bridge.y - 7, 48, 14, 1);
        for (let x = bridge.x - 20; x < bridge.x + 24; x += 5)
            p.rect(x, bridge.y - 7, 1, 14, 0);
        this.fence(17.8, 25.5, 4);
        const well = point({ x: 23.5, z: 19.5 });
        p.ellipse(well.x, well.y, 7, 4, 0);
        p.ellipse(well.x, well.y - 2, 6, 3, 1);
        p.ellipse(well.x, well.y - 2, 4, 2, 0);
        for (const s of [
            { x: 21, z: 24 },
            { x: 26, z: 23 },
        ]) {
            const q = point(s);
            p.rect(q.x, q.y - 9, 2, 9, 0);
            p.rect(q.x - 2, q.y - 12, 6, 4, 0);
            p.rect(q.x, q.y - 11, 2, 2, 1);
        }
    }
    drawWater(elapsed) {
        const p = this.raster;
        for (let z = 10; z < 29; z += 1.7) {
            if (Math.abs(z - 21) < 1.5)
                continue;
            const s = point({ x: riverCenter(z), z });
            const offset = Math.floor(elapsed * 2 + z) % 7;
            p.rect(s.x - 6 + offset, s.y, 5, 1, 1);
            p.rect(s.x - 1 - offset, s.y + 2, 3, 1, 1);
        }
    }
    house(b, restored) {
        const p = this.raster, s = point(b), w = Math.round(b.w * 8), depth = Math.round(b.d * 6), wall = b.kind === 'dojo' ? 25 : 22;
        p.ellipse(s.x + 5, s.y + depth / 2 + 2, w / 2 + 7, 7, 0.35);
        p.rect(s.x - w / 2, s.y - wall, w, wall + depth / 2, 0);
        p.setSurface({ normal: { x: 0, y: 0, z: 1 }, texture: 'brick' });
        p.rect(s.x - w / 2 + 2, s.y - wall + 2, w - 4, wall + depth / 2 - 3, 0.92);
        for (let y = s.y - wall + 3; y < s.y + depth / 2 - 2; y += 6) {
            p.rect(s.x - w / 2 + 2, y, w - 4, 1, 0.3);
            for (let x = s.x - w / 2 + 3 + (Math.floor(y / 6) % 2) * 5; x < s.x + w / 2 - 2; x += 10)
                p.rect(x, y, 1, 6, 0.3);
        }
        p.setSurface({ normal: { x: 0.7, y: 0, z: 0.7 }, texture: 'brick' });
        p.rect(s.x + w / 2 - 12, s.y - wall + 2, 10, wall + depth / 2 - 3, 0.43);
        p.setSurface(null);
        for (let x = s.x - w / 2 + 5; x < s.x + w / 2 - 12; x += 16)
            p.rect(x, s.y - wall + 2, 2, wall + depth / 2 - 3, 0);
        p.rect(s.x - 8, s.y - 8, 16, depth / 2 + 6, 0);
        if (b.kind !== 'dojo' || restored) {
            p.rect(s.x - 5, s.y - 6, 10, depth / 2 + 3, 0.4);
            p.rect(s.x, s.y - 6, 1, depth / 2 + 3, 1);
        }
        for (const offset of [-w / 2 + 9, w / 2 - 23]) {
            p.rect(s.x + offset, s.y - 13, 10, 8, 0);
            p.rect(s.x + offset + 2, s.y - 11, 6, 4, 1);
            p.rect(s.x + offset + 5, s.y - 12, 1, 6, 0);
        }
        const roof = [
            { x: s.x - w / 2 - 6, y: s.y - wall + 1 },
            { x: s.x - w / 2 + 11, y: s.y - wall - depth - 5 },
            { x: s.x + w / 2 - 9, y: s.y - wall - depth - 5 },
            { x: s.x + w / 2 + 6, y: s.y - wall + 1 },
        ];
        p.setSurface({ normal: { x: 0, y: -0.6, z: 0.8 }, texture: 'tile' });
        p.polygon(roof, 0);
        p.polygon(roof.map((q) => ({ x: q.x, y: q.y - 2 })), 0.5);
        for (let y = s.y - wall - depth + 1; y < s.y - wall - 3; y += 5) {
            const inset = Math.max(0, (s.y - wall - y) / 2);
            p.line({ x: s.x - w / 2 - 3 + inset, y }, { x: s.x + w / 2 + 3 - inset, y }, 1);
            for (let x = s.x - w / 2 + inset + 3; x < s.x + w / 2 - inset; x += 9)
                p.rect(x, y - 2, 1, 2, 1);
        }
        p.setSurface(null);
        p.rect(s.x - w / 2 - 7, s.y - wall - 2, w + 14, 3, 0);
        if (b.kind === 'dojo') {
            p.rect(s.x - 12, s.y - 23, 24, 10, 0);
            p.rect(s.x - 10, s.y - 21, 20, 6, 1);
            p.rect(s.x - 6, s.y - 20, 2, 4, 0);
            p.rect(s.x + 3, s.y - 20, 2, 4, 0);
            p.rect(s.x - 8, s.y - 18, 16, 1, 0);
            if (!restored) {
                p.polygon([
                    { x: s.x - 20, y: s.y - wall - 2 },
                    { x: s.x - 7, y: s.y - wall - 10 },
                    { x: s.x - 4, y: s.y - wall + 2 },
                ], 1);
                p.line({ x: s.x - 14, y: s.y - 3 }, { x: s.x - 20, y: s.y + depth / 2 }, 0, 2);
            }
            else {
                p.rect(s.x - 29, s.y - 16, 5, 8, 0);
                p.rect(s.x - 28, s.y - 14, 3, 4, 1);
                p.rect(s.x + 23, s.y - 16, 5, 8, 0);
                p.rect(s.x + 24, s.y - 14, 3, 4, 1);
                const d = point({ x: 21, z: 15.6 });
                p.rect(d.x - 1, d.y - 13, 3, 13, 0);
                p.rect(d.x - 5, d.y - 9, 11, 2, 0);
                p.ellipse(d.x, d.y - 14, 3, 3, 0);
            }
        }
        else if (b.kind === 'tea') {
            p.rect(s.x - 29, s.y - 10, 59, 3, 0);
            p.rect(s.x - 30, s.y - 8, 60, 6, 1);
            for (let x = s.x - 30; x < s.x + 30; x += 7)
                p.rect(x, s.y - 8, 3, 6, 0);
            p.rect(s.x - 25, s.y - 6, 2, 22, 0);
            p.rect(s.x + 25, s.y - 6, 2, 22, 0);
            p.rect(s.x + 12, s.y + 17, 15, 3, 0);
            p.rect(s.x + 17, s.y + 13, 5, 4, 0);
            p.rect(s.x + 18, s.y + 12, 3, 1, 1);
        }
        else {
            p.rect(s.x - 12, s.y - wall - depth - 9, 7, 12, 0);
            p.rect(s.x - 13, s.y - wall - depth - 10, 9, 3, 1);
        }
    }
    tree(x, z, size) {
        const p = this.raster, s = point({ x, z }), r = size * 7;
        p.ellipse(s.x + 4, s.y + 1, r, 4, 0.3);
        p.rect(s.x - 2, s.y - 15, 4, 16, 0);
        p.line({ x: s.x, y: s.y - 8 }, { x: s.x - 6, y: s.y - 17 }, 0, 2);
        p.ellipse(s.x, s.y - 22, r, r, 0);
        p.ellipse(s.x - r * 0.45, s.y - 21, r * 0.6, r * 0.68, 0);
        p.ellipse(s.x + r * 0.45, s.y - 18, r * 0.65, r * 0.65, 0);
        p.ellipse(s.x - 3, s.y - 26, r * 0.6, r * 0.55, 0.2);
        p.line({ x: s.x - r + 5, y: s.y - 24 }, { x: s.x - r + 7, y: s.y - 27 }, 1, 2);
        p.line({ x: s.x + 3, y: s.y - 34 }, { x: s.x + 6, y: s.y - 31 }, 1);
    }
    hearth(state) {
        const p = this.raster, s = point(places[0]);
        p.ellipse(s.x + 2, s.y + 2, 18, 6, 0.35);
        p.ellipse(s.x, s.y - 8, 14, 15, 0);
        p.setSurface({ normal: { x: 0, y: 0, z: 1 }, texture: 'brick' });
        p.ellipse(s.x, s.y - 9, 12, 13, 0.65);
        p.setSurface(null);
        p.rect(s.x - 7, s.y - 7, 14, 9, 0);
        p.ellipse(s.x, s.y - 7, 7, 5, 0);
        p.rect(s.x - 4, s.y - 26, 8, 10, 0);
        p.rect(s.x - 5, s.y - 28, 10, 3, 1);
        p.rect(s.x - 19, s.y + 1, 9, 2, 0);
        p.rect(s.x - 18, s.y - 2, 9, 2, 0);
        p.ellipse(s.x + 13, s.y + 9, 6, 3, 0);
        p.ellipse(s.x + 13, s.y + 8, 5, 2, 1);
        p.line({ x: s.x + 11, y: s.y + 6 }, { x: s.x + 10, y: s.y + 8 }, 0);
        p.line({ x: s.x + 15, y: s.y + 6 }, { x: s.x + 14, y: s.y + 8 }, 0);
        if (state.fireSeconds > 0) {
            const flicker = Math.floor(state.elapsed * 8) % 3;
            p.polygon([
                { x: s.x - 4, y: s.y },
                { x: s.x - 3, y: s.y - 5 - flicker },
                { x: s.x, y: s.y - 3 },
                { x: s.x + 3, y: s.y - 8 + flicker },
                { x: s.x + 4, y: s.y },
            ], 1);
            for (let i = 0; i < 4; i++) {
                const y = s.y - 32 - ((Math.floor(state.elapsed * 7) + i * 7) % 26);
                p.ellipse(s.x + Math.sin(i + state.elapsed) * 4, y, 3 + i, 2, 0.4);
            }
        }
    }
    refuge(state) {
        const p = this.raster, s = point(places[2]);
        p.rect(s.x - 15, s.y - 7, 30, 3, 0);
        p.rect(s.x - 15, s.y - 3, 30, 3, 0);
        p.rect(s.x - 12, s.y, 2, 6, 0);
        p.rect(s.x + 10, s.y, 2, 6, 0);
        p.rect(s.x - 9, s.y - 8, 6, 2, 1);
        p.rect(s.x - 8, s.y - 11, 4, 3, 0);
        if (state.visited.includes('refuge')) {
            p.rect(s.x + 5, s.y - 11, 4, 3, 0);
            p.rect(s.x + 6, s.y - 10, 2, 1, 1);
        }
    }
    laundry(elapsed) {
        const p = this.raster, a = point({ x: 9, z: 18.5 }), b = point({ x: 12, z: 18.5 });
        p.rect(a.x, a.y - 21, 2, 23, 0);
        p.rect(b.x, b.y - 20, 2, 22, 0);
        p.line({ x: a.x, y: a.y - 19 }, { x: b.x, y: b.y - 18 }, 0);
        for (let i = 0; i < 3; i++) {
            const sway = Math.floor(Math.sin(elapsed * 2 + i));
            p.rect(a.x + 3 + i * 6 + sway, a.y - 17, 5, 7, i % 2 ? 0.25 : 1);
            p.rect(a.x + 3 + i * 6 + sway, a.y - 10, 5, 1, 0);
        }
    }
    fence(x, z, width) {
        const p = this.raster, s = point({ x, z }), w = Math.round(width * 8);
        p.rect(s.x - w / 2, s.y - 7, w, 2, 0);
        p.rect(s.x - w / 2, s.y - 3, w, 2, 0);
        for (let offset = -w / 2; offset <= w / 2; offset += 8)
            p.rect(s.x + offset, s.y - 9, 2, 10, 0);
    }
    drawHero(state) {
        const d = state.direction, suffix = Math.abs(d.x) > Math.abs(d.z)
            ? d.x < 0
                ? '-left'
                : '-right'
            : d.z < 0
                ? '-back'
                : '';
        const motion = this.motions.get(`${state.moving ? 'move' : 'stand'}${suffix}`), frames = motion?.frames;
        const frame = frames?.[state.moving ? Math.floor(state.steps * 3) % frames.length : 0];
        if (!frame)
            return;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const s = point(state.position), size = 0.5;
        // 원본 RGBA·프레임 비율·발바닥 기준 pivot y를 유지하고 환경만 두 색으로 제한한다.
        this.lowContext.imageSmoothingEnabled = false;
        this.lowContext.drawImage(image, s.x - frame.pivot.x * size, s.y - (frame.height - frame.pivot.y) * size, frame.width * size, frame.height * size);
    }
}
