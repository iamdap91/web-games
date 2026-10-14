import rawData from './preview-data.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { PixellabPlayback } from '../ataho-hybrid/pixellab-playback.js';
const data = rawData;
function element(selector) {
    const found = document.querySelector(selector);
    if (!found)
        throw new Error(`비교 화면 요소가 없어요: ${selector}`);
    return found;
}
async function createCard(track, root, version) {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.track = track.id;
    article.dataset.version = version;
    article.hidden = true;
    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = track.label;
    const method = document.createElement('p');
    method.className = 'method';
    method.textContent = track.method;
    header.append(title, method);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', track.label);
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('Canvas2D를 시작하지 못했어요.');
    const metadata = document.createElement('p');
    metadata.className = 'metadata';
    const observation = document.createElement('p');
    observation.className = 'observation';
    observation.textContent = track.observation;
    const footer = document.createElement('footer');
    const original = document.createElement('a');
    original.textContent = '표시 중인 원본 PNG ↗';
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    footer.append(original);
    article.append(header, canvas, metadata, observation, footer);
    root.append(article);
    const images = await Promise.all(track.frames.map(async (frame) => {
        const image = new Image();
        image.src = resourceUrl(frame.localPath).href;
        await image.decode();
        return image;
    }));
    return {
        track,
        version,
        article,
        images,
        canvas,
        context,
        metadata,
        original,
    };
}
const jointPairs = [
    ['NECK', 'NOSE'],
    ['NECK', 'RIGHT SHOULDER'],
    ['NECK', 'LEFT SHOULDER'],
    ['RIGHT SHOULDER', 'RIGHT ELBOW'],
    ['RIGHT ELBOW', 'RIGHT ARM'],
    ['LEFT SHOULDER', 'LEFT ELBOW'],
    ['LEFT ELBOW', 'LEFT ARM'],
    ['RIGHT SHOULDER', 'RIGHT HIP'],
    ['LEFT SHOULDER', 'LEFT HIP'],
    ['RIGHT HIP', 'LEFT HIP'],
    ['RIGHT HIP', 'RIGHT KNEE'],
    ['RIGHT KNEE', 'RIGHT LEG'],
    ['LEFT HIP', 'LEFT KNEE'],
    ['LEFT KNEE', 'LEFT LEG'],
];
/** 프레임마다 위치를 맞추지 않고 입력 그림의 발 기준과 배율을 유지한다. */
function drawCard(card, options) {
    const index = options.index % card.track.frames.length;
    const frame = card.track.frames[index];
    const image = card.images[index];
    if (!frame || !image)
        return;
    const { canvas, context } = card;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = options.dark ? '#24312c' : '#e8e6d9';
    context.fillRect(0, 0, width, height);
    context.fillStyle = options.dark ? '#2b3a33' : '#f1efe5';
    for (let y = 0; y < height; y += 16)
        for (let x = 0; x < width; x += 16)
            if ((x / 16 + y / 16) % 2 === 0)
                context.fillRect(x, y, 16, 16);
    const requestedScale = options.scaleMode === 'height'
        ? 112 / card.track.subjectHeight
        : Number(options.scaleMode);
    const rect = frame.sourceRect ?? {
        x: 0,
        y: 0,
        width: frame.width,
        height: frame.height,
    };
    const maxWidth = Math.max(...card.track.frames.map((item) => item.sourceRect?.width ?? item.width));
    const maxHeight = Math.max(...card.track.frames.map((item) => item.sourceRect?.height ?? item.height));
    const scale = Math.min(requestedScale, (width - 24) / maxWidth, (height - 52) / maxHeight);
    const floor = height - 28;
    context.strokeStyle = options.dark ? '#91a88d' : '#88997e';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(12, floor + 0.5);
    context.lineTo(width - 12, floor + 0.5);
    context.stroke();
    const left = width / 2 - (frame.anchor.x - rect.x) * scale;
    const top = floor - (frame.anchor.y - rect.y) * scale;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, left, top, rect.width * scale, rect.height * scale);
    if (options.skeleton) {
        const joints = new Map(options.skeleton.map((joint) => [joint.label, joint]));
        context.strokeStyle = '#ff495e';
        context.fillStyle = '#ffe771';
        context.lineWidth = 1.5;
        const point = (joint) => ({
            x: left + (joint.x * frame.width - rect.x) * scale,
            y: top + (joint.y * frame.height - rect.y) * scale,
        });
        for (const [from, to] of jointPairs) {
            const a = joints.get(from);
            const b = joints.get(to);
            if (!a || !b)
                continue;
            const p = point(a);
            const q = point(b);
            context.beginPath();
            context.moveTo(p.x, p.y);
            context.lineTo(q.x, q.y);
            context.stroke();
        }
        for (const joint of joints.values()) {
            const p = point(joint);
            context.beginPath();
            context.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
            context.fill();
        }
    }
    card.metadata.textContent = `${frame.width} × ${frame.height}px · ${scale.toFixed(2)}배 · ${index + 1} / ${card.track.frames.length}`;
    card.original.href = resourceUrl(frame.localPath).href;
    canvas.dataset.frame = String(index);
}
class PixelTestsScreen {
    events = new AbortController();
    playback = new PixellabPlayback(8, 0.14);
    playbackSteps = 8;
    version = element('#version');
    scale = element('#scale');
    background = element('#background');
    pause = element('#pause');
    seek = element('#seek');
    frame = element('#frame');
    bones = element('#bones');
    cards = [];
    animationFrame = 0;
    previousTime = 0;
    disposed = false;
    ready = false;
    observer = new ResizeObserver(() => this.draw());
    constructor() {
        const { signal } = this.events;
        this.pause.addEventListener('click', () => {
            this.playback.togglePause();
            this.draw();
        }, { signal });
        element('#restart').addEventListener('click', () => {
            this.playback.seek(0);
            this.playback.togglePause();
            this.draw();
        }, { signal });
        this.seek.addEventListener('input', () => {
            this.playback.seek(Number(this.seek.value));
            this.draw();
        }, { signal });
        element('#speed').addEventListener('change', (event) => {
            this.playback.setSpeed(Number(event.currentTarget.value));
        }, { signal });
        for (const control of [
            this.version,
            this.scale,
            this.background,
            this.bones,
        ])
            control.addEventListener('change', () => this.draw(), { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        registerEmbeddedScene(() => this.dispose());
        Object.defineProperty(window, 'atahoPixelTests', {
            configurable: true,
            get: () => this.snapshot,
        });
        void this.load();
    }
    async load() {
        try {
            const appearances = element('#appearance');
            const motion = element('#motion');
            this.cards = await Promise.all([
                ...data.appearances.map((track) => createCard(track, appearances, 'original')),
                ...data.motions.map((track) => createCard(track, motion, 'original')),
                ...data.recommended.appearances.map((track) => createCard(track, appearances, 'recommended')),
                ...data.recommended.motions.map((track) => createCard(track, motion, 'recommended')),
            ]);
            if (this.disposed)
                return;
            element('#art').src = resourceUrl(data.artPath).href;
            for (const record of data.records) {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = resourceUrl(record.path).href;
                link.textContent = record.label;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                item.append(link);
                element('#records').append(item);
            }
            this.ready = true;
            this.draw();
            this.pause.disabled = false;
            element('#restart').disabled = false;
            for (const card of this.cards)
                this.observer.observe(card.canvas);
            this.animationFrame = requestAnimationFrame((time) => this.tick(time));
        }
        catch (error) {
            if (this.disposed)
                return;
            element('#status').textContent =
                `그림을 불러오지 못했어요. ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    tick(time) {
        if (this.disposed)
            return;
        this.playback.update(this.previousTime ? Math.min(0.1, (time - this.previousTime) / 1000) : 0);
        this.previousTime = time;
        this.draw();
        this.animationFrame = requestAnimationFrame((next) => this.tick(next));
    }
    draw() {
        if (!this.ready || this.disposed)
            return;
        const selected = this.version.value === 'recommended' ? data.recommended : data;
        const selectedSkeleton = selected.skeletons;
        const steps = Math.max(...selected.motions.map((track) => track.frames.length));
        if (steps !== this.playbackSteps) {
            this.playbackSteps = steps;
            this.playback = new PixellabPlayback(steps, 0.14);
            this.playback.setSpeed(Number(element('#speed').value));
        }
        const current = this.playback.snapshot;
        this.seek.max = String(this.playbackSteps - 1);
        this.seek.value = String(current.index);
        this.frame.value = `${current.index + 1} / ${this.playbackSteps}`;
        this.pause.textContent = current.paused ? '재생' : '일시정지';
        this.bones.disabled = selectedSkeleton.length === 0;
        this.bones.title = this.bones.disabled
            ? '공식 템플릿은 관절 좌표를 공개하지 않습니다.'
            : '';
        element('#status').textContent =
            this.version.value === 'recommended'
                ? '스타일 참조 생성 · 원화 재현 변환 · 공식 Skeleton 템플릿의 결과입니다. 1차 시험과 전환해 비교하세요.'
                : '1차 시험의 원본 결과입니다. 권장 설정 재시험으로 전환해 비교할 수 있습니다.';
        for (const card of this.cards) {
            card.article.hidden = card.version !== this.version.value;
            if (card.article.hidden)
                continue;
            drawCard(card, {
                index: card.track.id === 'skeleton-input' ||
                    selected.appearances.some((track) => track.id === card.track.id)
                    ? 0
                    : Math.min(card.track.frames.length - 1, Math.floor((current.index * card.track.frames.length) /
                        this.playbackSteps)),
                scaleMode: this.scale.value,
                dark: this.background.value === 'dark',
                skeleton: card.track.id === 'skeleton' && this.bones.checked
                    ? selected.skeletons[current.index]
                    : undefined,
            });
        }
    }
    get snapshot() {
        return {
            ready: this.ready,
            disposed: this.disposed,
            ...this.playback.snapshot,
            version: this.version.value,
            scale: this.scale.value,
            background: this.background.value,
            bones: this.bones.checked,
            frames: this.cards
                .filter((card) => card.version === this.version.value)
                .map((card) => ({
                id: card.track.id,
                count: card.track.frames.length,
                displayed: Number(card.canvas.dataset.frame),
            })),
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        cancelAnimationFrame(this.animationFrame);
        this.events.abort();
        this.observer.disconnect();
    }
}
new PixelTestsScreen();
