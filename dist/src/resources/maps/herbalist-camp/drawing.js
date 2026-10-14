import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
/** 로컬 이미지·픽셀 카메라·깊이 정렬의 수명을 소유한다. */
export class CampDrawing {
    canvas;
    map;
    ready;
    context;
    images = new Map();
    motions;
    width = 1;
    height = 1;
    dpr = 1;
    disposed = false;
    frameIndex = 0;
    motion = 'stand-back';
    order = [];
    constructor(canvas, map) {
        this.canvas = canvas;
        this.map = map;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('2D Canvas를 사용할 수 없습니다.');
        this.context = context;
        const hero = manifest.assets.find((asset) => asset.id === 'ai/tiger-hero');
        if (!hero)
            throw new Error('승인된 아타호 리소스가 없습니다.');
        this.motions = new Map(Object.entries(hero.animations).filter(([name]) => /^stand($|-)|^move($|-)/.test(name)));
        const paths = new Set([
            ...map.tileLayers.map((layer) => layer.imagePath),
            ...map.objects.map((object) => object.imagePath),
            ...[...this.motions.values()].flatMap((motion) => motion.frames.map((frame) => frame.localPath)),
        ]);
        this.ready = Promise.all([...paths].map((path) => this.loadImage(path))).then(() => undefined);
        this.resize();
    }
    get diagnostics() {
        return {
            motion: this.motion,
            frameIndex: this.frameIndex,
            depthOrder: [...this.order],
        };
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.dpr = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.context.imageSmoothingEnabled = false;
    }
    render(state, overview) {
        if (this.disposed)
            return;
        const c = this.context;
        const mapWidth = this.map.width * this.map.tileSize;
        const mapHeight = this.map.height * this.map.tileSize;
        const scale = overview
            ? Math.min((this.width - 20) / mapWidth, (this.height - 20) / mapHeight)
            : 1.5;
        const center = (position, length, viewport) => {
            const half = viewport / scale / 2;
            return length <= half * 2
                ? length / 2
                : Math.max(half, Math.min(length - half, position));
        };
        const cameraX = overview
            ? mapWidth / 2
            : center(state.position.x, mapWidth, this.width);
        const cameraY = overview
            ? mapHeight / 2
            : center(state.position.y, mapHeight, this.height);
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.fillStyle = '#243c35';
        c.fillRect(0, 0, this.width, this.height);
        c.translate(Math.round(this.width / 2 - cameraX * scale), Math.round(this.height / 2 - cameraY * scale));
        c.scale(scale, scale);
        for (const layer of this.map.tileLayers) {
            const image = this.images.get(layer.imagePath);
            if (image)
                c.drawImage(image, layer.x, layer.y, layer.width, layer.height);
        }
        for (const object of this.map.objects.filter((object) => object.layer === 'ground'))
            this.drawObject(object);
        const layers = this.map.objects
            .filter((object) => object.layer === 'depth')
            .map((object) => ({
            id: object.id,
            y: object.y,
            draw: () => this.drawObject(object),
        }));
        layers.push({
            id: 'ataho',
            y: state.position.y,
            draw: () => this.drawHero(state),
        });
        layers.sort((a, b) => a.y - b.y);
        this.order = layers.map((layer) => layer.id);
        layers.forEach((layer) => layer.draw());
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    drawObject(object) {
        const image = this.images.get(object.imagePath);
        if (!image)
            return;
        this.context.drawImage(image, Math.round(object.x - object.pivot.x), Math.round(object.y - object.pivot.y), object.width, object.height);
    }
    drawHero(state) {
        const suffix = state.facing === 'front' ? '' : `-${state.facing}`;
        this.motion = `${state.moving ? 'move' : 'stand'}${suffix}`;
        const animation = this.motions.get(this.motion);
        if (!animation?.frames.length)
            return;
        // 실제 이동 거리와 연결하므로 벽에 막혔을 때 보행 프레임도 멈춘다.
        this.frameIndex = state.moving
            ? Math.floor((state.distance * animation.frames.length) / 64) %
                animation.frames.length
            : 0;
        const frame = animation.frames[this.frameIndex];
        if (!frame)
            return;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const c = this.context;
        c.fillStyle = '#18382950';
        c.beginPath();
        c.ellipse(Math.round(state.position.x), Math.round(state.position.y), 12, 5, 0, 0, Math.PI * 2);
        c.fill();
        this.drawFrame(frame, image, state);
    }
    drawFrame(frame, image, state) {
        // 아타호의 기존 피벗은 이미지 왼쪽 아래를 기준으로 보관된다.
        this.context.drawImage(image, Math.round(state.position.x - frame.pivot.x), Math.round(state.position.y - (frame.height - frame.pivot.y)), frame.width, frame.height);
    }
    loadImage(path) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (!this.disposed)
                    this.images.set(path, image);
                resolve();
            };
            image.onerror = () => reject(new Error(`야영지 리소스 로딩 실패: ${path}`));
            image.src = resourceUrl(path).href;
        });
    }
    dispose() {
        this.disposed = true;
        this.images.clear();
    }
}
