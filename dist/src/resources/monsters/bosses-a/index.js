import { resourceUrl } from '../../catalog/resource-url.js';
import generation from '../../../../resources/map-bosses-a-generation.json' with { type: 'json' };
function element(id, type) {
    const item = document.getElementById(id);
    if (!(item instanceof type))
        throw new Error(`검토 요소가 없습니다: ${id}`);
    return item;
}
class OriginalReview {
    images = new Map();
    events = new AbortController();
    profile = element('profile', HTMLSelectElement);
    background = element('background', HTMLSelectElement);
    crab = element('crab', HTMLSelectElement);
    zoom = element('zoom', HTMLSelectElement);
    comparison = element('comparison', HTMLCanvasElement);
    nativeComparison = element('native-comparison', HTMLCanvasElement);
    cards = [];
    monsters = generation.monsters.slice(0, 3);
    disposed = false;
    async start() {
        for (const profile of generation.pcProfiles)
            this.profile.append(new Option(profile.id, profile.id));
        const container = element('originals', HTMLElement);
        const paths = new Set(generation.comparisonReferences.map((item) => item.frame.localPath));
        for (const monster of this.monsters)
            for (const attempt of monster.attempts) {
                if (!attempt.localPath || !attempt.width || !attempt.height)
                    continue;
                paths.add(attempt.localPath);
                const article = document.createElement('article'), title = document.createElement('h3'), canvas = document.createElement('canvas'), note = document.createElement('p'), link = document.createElement('a');
                title.textContent = `${monster.name} · 후보 ${attempt.attempt}`;
                canvas.dataset.source = attempt.localPath;
                note.textContent = `${attempt.width}×${attempt.height}px · ${attempt.paletteSize}색 · ${attempt.selection ?? '검토 대기'}`;
                link.textContent = '원본 PNG';
                link.href = this.url(attempt.localPath);
                article.append(title, canvas, note, link);
                container.append(article);
                this.cards.push({
                    canvas,
                    frame: {
                        localPath: attempt.localPath,
                        width: attempt.width,
                        height: attempt.height,
                        pivot: { x: attempt.width / 2, y: 0 },
                    },
                });
            }
        await Promise.all([...paths].map(async (path) => {
            const image = new Image();
            image.src = this.url(path);
            await image.decode();
            if (!this.disposed)
                this.images.set(path, image);
        }));
        if (this.disposed)
            return;
        const { signal } = this.events;
        for (const control of [this.profile, this.background, this.crab, this.zoom])
            control.addEventListener('change', this.render, { signal });
        window.addEventListener('resize', this.render, { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            signal,
            once: true,
        });
        this.render();
        element('status', HTMLParagraphElement).textContent =
            `3종 · 무변형 원본 ${this.cards.length}개 · 유료 생성 5회 · 모션 0개`;
    }
    url(path) {
        return resourceUrl(path).href;
    }
    context(canvas, width, height) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas가 없습니다.');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = false;
        context.fillStyle =
            this.background.value === 'dark' ? '#1e302a' : '#f6f0de';
        context.fillRect(0, 0, width, height);
        return context;
    }
    render = () => {
        if (this.disposed)
            return;
        const profile = generation.pcProfiles.find((item) => item.id === this.profile.value);
        if (!profile)
            return;
        const scale = profile.projectedCssPixelsPerNativePixelAtScaleOne;
        const entries = generation.comparisonReferences.map((item) => ({
            name: item.name,
            frame: item.frame,
            displayScale: item.displayScale,
        }));
        for (const monster of this.monsters) {
            let frame = monster.previewCandidate;
            if (monster.id === 'ferry-claw-crab') {
                const attempt = monster.attempts.find((item) => item.attempt === Number(this.crab.value));
                if (attempt?.localPath && attempt.width && attempt.height)
                    frame = {
                        localPath: attempt.localPath,
                        width: attempt.width,
                        height: attempt.height,
                        pivot: {
                            x: attempt.width / 2,
                            y: attempt.visibleBounds
                                ? attempt.height -
                                    attempt.visibleBounds.y -
                                    attempt.visibleBounds.height
                                : 0,
                        },
                    };
            }
            if (frame)
                entries.push({
                    name: monster.id === 'ferry-claw-crab'
                        ? `${monster.name} · 후보 ${this.crab.value}`
                        : monster.name,
                    frame,
                    displayScale: monster.previewDisplayScale ?? 1,
                });
        }
        this.drawComparison({
            canvas: this.nativeComparison,
            entries: entries.map((item) => ({ ...item, displayScale: 1 })),
            scale: Number(this.zoom.value),
        });
        this.drawComparison({ canvas: this.comparison, entries, scale });
        this.comparison.dataset.profile = profile.id;
        this.comparison.dataset.pixelScale = String(scale);
        const zoom = Number(this.zoom.value), size = 128 * zoom + 32;
        element('originals', HTMLElement).style.setProperty('--card-size', `${size + 30}px`);
        for (const card of this.cards) {
            const context = this.context(card.canvas, size, size), image = this.images.get(card.frame.localPath);
            if (image)
                context.drawImage(image, Math.round((size - card.frame.width * zoom) / 2), Math.round((size - card.frame.height * zoom) / 2), card.frame.width * zoom, card.frame.height * zoom);
            card.canvas.dataset.zoom = String(zoom);
        }
    };
    drawComparison({ canvas, entries, scale, }) {
        const widths = entries.map((item) => Math.max(154, item.frame.width * item.displayScale * scale + 18));
        const width = Math.max(canvas.parentElement?.clientWidth ?? 1200, widths.reduce((a, b) => a + b, 0) + 50);
        const height = Math.ceil(Math.max(...entries.map((item) => item.frame.height * item.displayScale)) *
            scale +
            100), ground = height - 54;
        const context = this.context(canvas, width, height);
        context.fillStyle =
            this.background.value === 'dark' ? '#c0c8b6' : '#617258';
        context.fillRect(0, ground, width, 1);
        const gap = (width - widths.reduce((a, b) => a + b, 0)) / (entries.length + 1);
        let left = gap;
        context.textAlign = 'center';
        context.font = '15px system-ui';
        for (const [index, item] of entries.entries()) {
            const span = widths[index] ?? 154, center = left + span / 2, pixelScale = scale * item.displayScale, frame = item.frame;
            const x = center - frame.pivot.x * pixelScale, y = ground - (frame.height - frame.pivot.y) * pixelScale;
            const image = this.images.get(frame.localPath);
            if (image)
                context.drawImage(image, canvas === this.nativeComparison ? Math.round(x) : x, canvas === this.nativeComparison ? Math.round(y) : y, frame.width * pixelScale, frame.height * pixelScale);
            context.fillStyle =
                this.background.value === 'dark' ? '#eee6cd' : '#25392f';
            context.fillText(item.name, center, ground + 31);
            left += span + gap;
        }
    }
    dispose() {
        this.disposed = true;
        this.events.abort();
        this.images.clear();
    }
}
void new OriginalReview().start().catch((error) => {
    element('status', HTMLParagraphElement).textContent =
        error instanceof Error ? error.message : '원본을 표시할 수 없습니다.';
});
