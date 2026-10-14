import rawData from './preview-data.json' with { type: 'json' };
import poses from '../../../../resources/ataho-skeleton-authored-walk-poses.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { PixellabPlayback } from '../ataho-hybrid/pixellab-playback.js';
const data = rawData;
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
function element(selector) {
    const result = document.querySelector(selector);
    if (!result)
        throw new Error('비교 화면 요소가 없어요: ' + selector);
    return result;
}
async function loadImage(path) {
    const image = new Image();
    image.src = resourceUrl(path).href;
    await image.decode();
    return image;
}
/** 모든 카드가 같은 픽셀 배율과 시계로 움직이도록 그린다. */
function drawCard(card, options) {
    const index = Math.min(card.track.frames.length - 1, Math.floor(options.phase * card.track.frames.length));
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
    context.fillStyle = '#e8eadb';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#dce0cf';
    for (let y = 0; y < height; y += 16) {
        for (let x = 0; x < width; x += 16) {
            if ((x / 16 + y / 16) % 2 === 0)
                context.fillRect(x, y, 16, 16);
        }
    }
    const ground = height - 30;
    const left = width / 2 - frame.anchor.x * options.scale;
    const top = ground - frame.anchor.y * options.scale;
    context.strokeStyle = '#85937c';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(16, ground);
    context.lineTo(width - 16, ground);
    context.stroke();
    context.imageSmoothingEnabled = false;
    context.drawImage(image, left, top, frame.width * options.scale, frame.height * options.scale);
    const joints = card.skeletons[index];
    if (options.bones && joints) {
        const points = new Map(joints.map((joint) => [joint.label, joint]));
        context.strokeStyle = '#e76c88';
        context.fillStyle = '#ffde71';
        context.lineWidth = 2;
        for (const [from, to] of jointPairs) {
            const a = points.get(from);
            const b = points.get(to);
            if (!a || !b)
                continue;
            context.strokeStyle =
                (a.z_index ?? 0) < 0 || (b.z_index ?? 0) < 0 ? '#858a8c' : '#e76c88';
            context.beginPath();
            context.moveTo(left + a.x * frame.width * options.scale, top + a.y * frame.height * options.scale);
            context.lineTo(left + b.x * frame.width * options.scale, top + b.y * frame.height * options.scale);
            context.stroke();
        }
        for (const point of joints) {
            context.fillStyle = (point.z_index ?? 0) < 0 ? '#858a8c' : '#ffde71';
            context.beginPath();
            context.arc(left + point.x * frame.width * options.scale, top + point.y * frame.height * options.scale, 2.5, 0, Math.PI * 2);
            context.fill();
        }
    }
    canvas.dataset.frameIndex = String(index);
    card.metadata.textContent =
        index +
            1 +
            ' / ' +
            card.track.frames.length +
            ' · ' +
            frame.width +
            '×' +
            frame.height +
            'px';
    card.original.href = resourceUrl(frame.localPath).href;
}
class WalkComparison {
    playback = new PixellabPlayback(8, 0.1);
    events = new AbortController();
    observer = new ResizeObserver(() => this.draw());
    pause = element('#pause');
    seek = element('#seek');
    direction = element('#direction');
    speed = element('#speed');
    scale = element('#scale');
    bones = element('#bones');
    cards = [];
    sections = new Map();
    previousTime = 0;
    animationFrame = 0;
    ready = false;
    disposed = false;
    async start() {
        const { signal } = this.events;
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        registerEmbeddedScene(() => this.dispose());
        try {
            element('#art').href = resourceUrl(data.artPath).href;
            for (const direction of data.directions) {
                const section = document.createElement('section');
                const heading = document.createElement('h2');
                heading.textContent = direction.label + ' 걷기';
                const grid = document.createElement('div');
                grid.className = 'grid';
                section.append(heading, grid);
                element('#comparisons').append(section);
                this.sections.set(direction.id, section);
                const figure = document.createElement('figure');
                const reference = await loadImage(direction.reference.localPath);
                reference.alt = direction.label + ' 공통 기준 도트';
                const caption = document.createElement('figcaption');
                caption.textContent = direction.label + ' 기준';
                figure.append(reference, caption);
                element('#references').append(figure);
                for (const track of data.tracks.filter((item) => item.direction === direction.id)) {
                    if (track.frames.length === 0)
                        throw new Error(track.label + '의 프레임이 없어요.');
                    const article = document.createElement('article');
                    article.className = 'card';
                    article.dataset.track = track.id;
                    const header = document.createElement('header');
                    const title = document.createElement('h3');
                    title.textContent = track.label;
                    const method = document.createElement('p');
                    method.textContent = track.method;
                    header.append(title, method);
                    const canvas = document.createElement('canvas');
                    canvas.setAttribute('aria-label', direction.label + ' ' + track.label);
                    const context = canvas.getContext('2d');
                    if (!context)
                        throw new Error('Canvas2D를 시작하지 못했어요.');
                    const footer = document.createElement('footer');
                    const metadata = document.createElement('span');
                    metadata.className = 'metadata';
                    const original = document.createElement('a');
                    original.textContent = '원본 PNG ↗';
                    original.target = '_blank';
                    original.rel = 'noopener noreferrer';
                    footer.append(metadata, original);
                    article.append(header, canvas, footer);
                    grid.append(article);
                    const images = await Promise.all(track.frames.map((frame) => loadImage(frame.localPath)));
                    if (this.disposed)
                        return;
                    const skeletons = track.id.startsWith('authored-')
                        ? (poses.directions.find((pose) => pose.direction === track.direction)?.keypoints ?? [])
                        : [];
                    this.cards.push({
                        track,
                        skeletons,
                        images,
                        canvas,
                        context,
                        metadata,
                        original,
                    });
                }
            }
            if (this.disposed)
                return;
            if (this.cards.length !== 6)
                throw new Error('세 방향의 두 결과가 모두 필요해요.');
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
            this.speed.addEventListener('change', () => this.playback.setSpeed(Number(this.speed.value)), { signal });
            this.direction.addEventListener('change', () => this.draw(), { signal });
            this.scale.addEventListener('change', () => this.draw(), { signal });
            this.bones.addEventListener('change', () => this.draw(), { signal });
            this.ready = true;
            this.pause.disabled = false;
            this.seek.disabled = false;
            element('#restart').disabled = false;
            for (const card of this.cards)
                this.observer.observe(card.canvas);
            element('#status').textContent =
                '세 방향 · 두 방식 준비 완료. 발 디딤, 얼굴·복장 유지와 반복 연결을 확인해 보세요.';
            this.animationFrame = requestAnimationFrame((time) => this.tick(time));
        }
        catch (error) {
            this.dispose();
            element('#status').textContent =
                '그림을 불러오지 못했어요. ' +
                    (error instanceof Error ? error.message : String(error));
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
        for (const [id, section] of this.sections) {
            section.hidden =
                this.direction.value !== 'all' && id !== this.direction.value;
        }
        const visible = this.cards.filter((card) => this.direction.value === 'all' ||
            card.track.direction === this.direction.value);
        // 생성 캔버스의 투명 여백 대신 전체 모션 외곽을 기준으로 공통 배율을 정한다.
        const frames = data.tracks.flatMap((track) => track.frames);
        const bounds = frames.map((frame) => ({
            above: frame.anchor.y - (frame.alphaBounds?.[1] ?? 0),
            below: (frame.alphaBounds?.[3] ?? frame.height) - frame.anchor.y,
            side: Math.max(frame.anchor.x - (frame.alphaBounds?.[0] ?? 0), (frame.alphaBounds?.[2] ?? frame.width) - frame.anchor.x),
        }));
        const maxAbove = Math.max(...bounds.map((bound) => bound.above));
        const maxBelow = Math.max(1, ...bounds.map((bound) => bound.below));
        const maxSide = Math.max(...bounds.map((bound) => bound.side));
        const commonScale = Math.min(Number(this.scale.value), ...visible.map((card) => Math.min((card.canvas.clientWidth / 2 - 12) / maxSide, (card.canvas.clientHeight - 42) / maxAbove, 18 / maxBelow)));
        const snapshot = this.playback.snapshot;
        for (const card of visible) {
            drawCard(card, {
                phase: snapshot.index / 8,
                scale: commonScale,
                bones: this.bones.checked,
            });
        }
        this.pause.textContent = snapshot.paused ? '재생' : '일시정지';
        this.seek.value = String(snapshot.index);
        element('#frame').textContent = snapshot.index + 1 + ' / 8';
        element('#comparisons').dataset.paused = String(snapshot.paused);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        cancelAnimationFrame(this.animationFrame);
        this.observer.disconnect();
        this.events.abort();
        this.pause.disabled = true;
        this.seek.disabled = true;
    }
}
const comparison = new WalkComparison();
void comparison.start();
