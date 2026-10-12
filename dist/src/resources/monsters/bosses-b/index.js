import { resourceUrl } from '../../catalog/resource-url.js';
import generation from '../../../../resources/map-bosses-b-generation.json' with { type: 'json' };
function element(id, type) {
    const found = document.getElementById(id);
    if (!(found instanceof type))
        throw new Error(`화면 요소가 없습니다: ${id}`);
    return found;
}
const profiles = {
    '1366x768': { width: 1366, height: 768 },
    '1920x1080': { width: 1920, height: 1080 },
};
class OriginalComparison {
    canvas = element('comparison', HTMLCanvasElement);
    stage = element('stage', HTMLDivElement);
    mode = element('scale-mode', HTMLSelectElement);
    profile = element('viewport', HTMLSelectElement);
    map = element('map', HTMLSelectElement);
    events = new AbortController();
    observer = new ResizeObserver(() => this.requestRender());
    images = new Map();
    pendingFrame = null;
    references = generation.comparisonReferences.map((reference) => ({
        id: reference.id,
        name: reference.name,
        frame: reference.frame,
        displayScale: reference.displayScale,
        mapId: null,
        mapName: '',
        grade: '기존',
    }));
    originals = generation.creatures.flatMap((creature) => {
        if (!('originalFrame' in creature) || !creature.originalFrame)
            return [];
        return [
            {
                id: creature.id,
                name: creature.name,
                frame: creature.originalFrame,
                displayScale: creature.previewDisplayScale,
                mapId: creature.mapId,
                mapName: creature.mapName,
                grade: creature.tier === 'boss' ? '보스' : '중간보스',
            },
        ];
    });
    async start() {
        const maps = new Map(this.originals.map((sprite) => [sprite.mapId, sprite.mapName]));
        this.map.replaceChildren(...[...maps].map(([id, name]) => new Option(name, id ?? '')));
        const query = new URL(location.href).searchParams;
        if (query.get('mode') === 'battle')
            this.mode.value = 'battle';
        if (query.get('viewport') === '1920x1080')
            this.profile.value = '1920x1080';
        const requestedMap = query.get('map');
        if (requestedMap && maps.has(requestedMap))
            this.map.value = requestedMap;
        await Promise.all([...this.references, ...this.originals].map(async (sprite) => {
            const image = new Image();
            image.src = resourceUrl(sprite.frame.localPath).href;
            await image.decode();
            this.images.set(sprite.id, image);
        }));
        this.showOriginals();
        const { signal } = this.events;
        for (const select of [this.mode, this.profile, this.map])
            select.addEventListener('change', this.requestRender, { signal });
        window.addEventListener('pagehide', this.handlePageHide, { signal });
        this.observer.observe(this.stage);
        this.render();
        element('status', HTMLParagraphElement).textContent =
            `승인 원본 ${this.originals.length}종 · 실제 모션은 별도 재생 화면에서 확인할 수 있습니다.`;
    }
    showOriginals() {
        const gallery = element('originals', HTMLDivElement);
        for (const sprite of this.originals) {
            const figure = document.createElement('figure');
            const image = new Image();
            image.src = resourceUrl(sprite.frame.localPath).href;
            image.alt = `${sprite.name} 무변형 원본`;
            image.width = sprite.frame.width;
            image.height = sprite.frame.height;
            const caption = document.createElement('figcaption');
            const title = document.createElement('strong');
            title.textContent = `${sprite.name} · ${sprite.frame.width}px`;
            const link = document.createElement('a');
            link.href = image.src;
            link.textContent = '원본 PNG';
            caption.append(title, link);
            figure.append(image, caption);
            gallery.append(figure);
        }
    }
    requestRender = () => {
        if (this.pendingFrame !== null)
            return;
        this.pendingFrame = requestAnimationFrame(() => {
            this.pendingFrame = null;
            this.render();
        });
    };
    render() {
        const profile = profiles[this.profile.value] ?? profiles['1366x768'];
        const mode = this.mode.value === 'battle' ? 'battle' : 'native';
        const width = Math.max(640, Math.floor(this.stage.getBoundingClientRect().width));
        const height = Math.max(480, profile.height - 128);
        const dpr = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('비교 캔버스를 준비할 수 없습니다.');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = false;
        context.fillStyle = '#263a33';
        context.fillRect(0, 0, width, height);
        // 전투 카메라의 평상시 투영과 같은 배율이며, 고해상도 그림을 축소하지 않는다.
        const projection = generation.previewProjection;
        const halfHeight = Math.max(projection.minHalfHeight, projection.minHalfWidth / (profile.width / profile.height));
        const pixelsPerNative = profile.height / (2 * halfHeight * projection.battlePixelsPerUnit);
        const firstFloor = Math.round(height * 0.33);
        const secondFloor = height - 70;
        this.drawRow(context, this.references, firstFloor, width, pixelsPerNative, mode);
        const chosen = this.originals.filter((sprite) => sprite.mapId === this.map.value);
        this.drawRow(context, chosen, secondFloor, width, pixelsPerNative, mode);
        context.fillStyle = '#c6d1b5';
        context.font = '13px system-ui';
        context.textAlign = 'left';
        context.fillText('현재 아타호와 일반 몬스터', 18, 24);
        context.fillText(this.map.selectedOptions[0]?.textContent ?? '', 18, firstFloor + 80);
        this.canvas.dataset.mode = mode;
        this.canvas.dataset.profile = this.profile.value;
        this.canvas.dataset.nativeScale = String(pixelsPerNative * projection.heroDisplayScale);
        element('scale-description', HTMLParagraphElement).textContent =
            mode === 'native'
                ? '모든 원본을 아타호와 같은 픽셀 배율로 표시합니다. 원본 도트의 굵기와 체형을 비교하세요.'
                : '전투 카탈로그의 개체별 배율을 적용합니다. 발 기준은 같고, 최종 전투 배치 크기를 비교할 수 있습니다.';
    }
    drawRow(context, sprites, floor, width, pixelsPerNative, mode) {
        context.strokeStyle = '#76917b';
        context.beginPath();
        context.moveTo(16, floor + 0.5);
        context.lineTo(width - 16, floor + 0.5);
        context.stroke();
        for (const [index, sprite] of sprites.entries()) {
            const image = this.images.get(sprite.id);
            if (!image)
                continue;
            const scale = pixelsPerNative *
                (mode === 'native'
                    ? generation.previewProjection.heroDisplayScale
                    : sprite.displayScale);
            const x = (width / sprites.length) * (index + 0.5);
            const frame = sprite.frame;
            context.fillStyle = '#10261b66';
            context.beginPath();
            context.ellipse(x, floor + 3, frame.width * scale * 0.22, 5, 0, 0, Math.PI * 2);
            context.fill();
            context.drawImage(image, x - frame.pivot.x * scale, floor - (frame.height - frame.pivot.y) * scale, frame.width * scale, frame.height * scale);
            context.strokeStyle = '#e4ca8a';
            context.beginPath();
            context.moveTo(x - 4, floor);
            context.lineTo(x + 4, floor);
            context.moveTo(x, floor - 4);
            context.lineTo(x, floor + 4);
            context.stroke();
            context.fillStyle = '#f4e5bd';
            context.font = '14px system-ui';
            context.textAlign = 'center';
            context.fillText(`${sprite.grade} · ${sprite.name}`, x, floor + 26);
            context.fillStyle = '#b9c9ae';
            context.font = '12px system-ui';
            context.fillText(`${frame.width}×${frame.height} · ${scale.toFixed(2)} CSS px / dot`, x, floor + 45);
        }
    }
    handlePageHide = (event) => {
        if (event.persisted)
            return;
        this.events.abort();
        this.observer.disconnect();
        if (this.pendingFrame !== null)
            cancelAnimationFrame(this.pendingFrame);
    };
}
void new OriginalComparison().start().catch((error) => {
    element('status', HTMLParagraphElement).textContent =
        error instanceof Error
            ? error.message
            : '원본 비교 화면을 준비하지 못했습니다.';
});
