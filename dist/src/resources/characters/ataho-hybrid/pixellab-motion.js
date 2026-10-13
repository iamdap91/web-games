import idleRecord from '../../../../resources/ataho-pixellab-idle.json' with { type: 'json' };
import walkRecord from '../../../../resources/ataho-pixellab-walk.json' with { type: 'json' };
import punchRecord from '../../../../resources/ataho-pixellab-punch.json' with { type: 'json' };
import kickRecord from '../../../../resources/ataho-pixellab-kick.json' with { type: 'json' };
import shoulderRecord from '../../../../resources/ataho-pixellab-shoulder.json' with { type: 'json' };
import shoulderV2Record from '../../../../resources/ataho-pixellab-shoulder-v2.json' with { type: 'json' };
import { rpgView } from '../../../games/tiger-rpg/presentation-contracts.js';
import { PixellabPlayback } from './pixellab-playback.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
const records = {
    idle: idleRecord,
    walk: walkRecord,
    punch: punchRecord,
    kick: kickRecord,
    shoulder: shoulderRecord,
    'shoulder-v2': shoulderV2Record,
};
const motionLabels = {
    idle: '정면 대기',
    walk: '걷기',
    punch: '정권지르기',
    kick: '발차기',
    shoulder: '철산고',
    'shoulder-v2': '철산고 v2',
};
function isMotionKey(value) {
    return Object.hasOwn(records, value);
}
const requestedMotion = new URL(location.href).searchParams.get('motion');
const initialMotion = document.body.dataset.labTab === 'attacks' &&
    requestedMotion &&
    ['punch', 'kick', 'shoulder', 'shoulder-v2'].includes(requestedMotion)
    ? requestedMotion
    : (document.body.dataset.motion ?? 'idle');
function selectedFrameIndices(record) {
    if ('playbackFrameIndices' in record.preview)
        return record.preview.playbackFrameIndices;
    return record.frames
        .map((_, index) => index)
        .slice(record.preview.firstPlaybackFrame);
}
function element(selector) {
    const result = document.querySelector(selector);
    if (!result)
        throw new Error(`비교 화면 요소가 없어요: ${selector}`);
    return result;
}
async function loadImage(path) {
    const result = new Image();
    result.src = new URL(`../../../../../${path}`, import.meta.url).href;
    await result.decode();
    return result;
}
/** 원화와 생성 결과에 동일한 입력 캔버스 위치와 배율을 적용한다. */
function drawStage(stage, image, options) {
    const { canvas, context } = stage;
    const { record } = options;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = options.dark ? '#28342e' : '#e7e4d9';
    context.fillRect(0, 0, width, height);
    context.fillStyle = options.dark ? '#2e3b33' : '#eeece2';
    for (let y = 0; y < height; y += 24)
        for (let x = 0; x < width; x += 24)
            if ((x / 24 + y / 24) % 2 === 0)
                context.fillRect(x, y, 24, 24);
    const floor = height - 38;
    context.strokeStyle = options.dark ? '#6d806f' : '#a6b09a';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(20, floor + 0.5);
    context.lineTo(width - 20, floor + 0.5);
    context.stroke();
    const { placement, canvasSize } = record.input;
    const scale = options.displayHeight / placement.height;
    const left = width / 2 - (canvasSize.width * scale) / 2;
    const top = floor - record.preview.footY * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.save();
    if (options.mirrored) {
        context.translate(width, 0);
        context.scale(-1, 1);
    }
    if (options.original) {
        const rect = record.input.sourceRect;
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height, left + placement.x * scale, top + placement.y * scale, placement.width * scale, placement.height * scale);
    }
    else
        context.drawImage(image, left, top, canvasSize.width * scale, canvasSize.height * scale);
    context.restore();
}
/** 입력·표시·루프와 등록한 이벤트의 수명을 소유한다. */
class PixellabMotionComparison {
    events = new AbortController();
    motionKey = isMotionKey(initialMotion)
        ? initialMotion
        : 'idle';
    record = records[this.motionKey];
    frameIndices = selectedFrameIndices(this.record);
    includeAllFrames = false;
    playback = new PixellabPlayback(this.frameIndices.length, this.record.preview.frameDurationSeconds);
    loadVersion = 0;
    stages;
    observer;
    images = null;
    frameRequest = 0;
    previousTime = 0;
    disposed = false;
    displayHeight = 240;
    dark = false;
    mirrored = false;
    constructor() {
        registerEmbeddedScene(this.dispose);
        this.stages = ['original', 'input', 'generated'].map((id) => {
            const canvas = element(`#${id}`);
            const context = canvas.getContext('2d');
            if (!context)
                throw new Error('비교할 캔버스를 준비하지 못했어요.');
            return { canvas, context };
        });
        this.observer = new ResizeObserver(() => this.draw());
        this.stages.forEach(({ canvas }) => this.observer.observe(canvas));
        window.addEventListener('pagehide', (event) => {
            // 뒤로 가기로 복원될 페이지는 브라우저가 루프를 일시 정지한다.
            if (event.persisted)
                this.previousTime = 0;
            else
                this.dispose();
        }, { signal: this.events.signal });
    }
    async start() {
        this.bindInput();
        await this.loadMotion(this.motionKey);
        if (!this.disposed)
            this.frameRequest = requestAnimationFrame(this.tick);
    }
    async loadMotion(key) {
        const version = ++this.loadVersion;
        const record = records[key];
        this.motionKey = key;
        this.record = record;
        const indices = this.includeAllFrames
            ? record.frames.map((_, index) => index)
            : selectedFrameIndices(record);
        this.images = null;
        document.body.dataset.ready = 'false';
        element('#controls').disabled = true;
        element('#status').textContent =
            `${motionLabels[key]} 그림을 준비 중이에요.`;
        try {
            const [original, input, frames] = await Promise.all([
                loadImage(record.source.localPath),
                loadImage(record.input.localPath),
                Promise.all(indices.map((index) => loadImage(record.frames[index].localPath))),
            ]);
            if (this.disposed || version !== this.loadVersion)
                return;
            this.images = { original, input, frames };
            this.frameIndices = indices;
            this.playback = new PixellabPlayback(frames.length, record.preview.frameDurationSeconds);
            this.playback.setSpeed(Number(element('#speed').value));
            this.previousTime = 0;
            element('#timeline').max = String(frames.length - 1);
            element('#controls').disabled = false;
            const title = document.querySelector('#motion-title');
            if (title)
                title.textContent = `PixelLab ${motionLabels[key]}`;
            document.body.dataset.ready = 'true';
            document.body.dataset.motionKey = key;
            const choice = document.querySelector('#motion-choice');
            if (choice)
                choice.value = key;
            const impact = document.querySelector('#impact-pose');
            if (impact)
                impact.hidden = !('impactFrameIndex' in record.preview);
            this.draw();
        }
        catch (error) {
            if (this.disposed || version !== this.loadVersion)
                return;
            element('#status').textContent =
                error instanceof Error ? error.message : '그림을 불러오지 못했어요.';
            this.dispose();
        }
    }
    dispose = () => {
        this.disposed = true;
        cancelAnimationFrame(this.frameRequest);
        this.observer.disconnect();
        this.events.abort();
    };
    bindInput() {
        const options = { signal: this.events.signal };
        document.querySelector('#impact-pose')?.addEventListener('click', () => {
            if (!('impactFrameIndex' in this.record.preview))
                return;
            const index = this.frameIndices.indexOf(this.record.preview.impactFrameIndex);
            if (index >= 0)
                this.playback.seek(index);
            this.draw();
        }, options);
        document.querySelector('#raw-frames')?.addEventListener('change', (event) => {
            this.includeAllFrames = event.currentTarget.checked;
            void this.loadMotion(this.motionKey);
        }, options);
        document
            .querySelector('#motion-choice')
            ?.addEventListener('change', (event) => {
            const key = event.currentTarget.value;
            if (isMotionKey(key))
                void this.loadMotion(key);
        }, options);
        document.querySelector('#restart')?.addEventListener('click', () => {
            this.playback.seek(0);
            this.playback.togglePause();
            this.previousTime = 0;
            this.draw();
        }, options);
        element('#pause').addEventListener('click', () => {
            this.playback.togglePause();
            this.draw();
        }, options);
        element('#timeline').addEventListener('input', (event) => {
            this.playback.seek(Number(event.currentTarget.value));
            this.draw();
        }, options);
        element('#size').addEventListener('change', (event) => {
            const value = event.currentTarget.value;
            this.displayHeight =
                value === 'game'
                    ? 720 * rpgView.actorScreenHeightRatio
                    : value === '112'
                        ? 112
                        : 240;
            this.draw();
        }, options);
        element('#speed').addEventListener('change', (event) => this.playback.setSpeed(Number(event.currentTarget.value)), options);
        element('#background').addEventListener('change', (event) => {
            this.dark = event.currentTarget.value === 'dark';
            this.draw();
        }, options);
        document.querySelector('#facing')?.addEventListener('change', (event) => {
            this.mirrored =
                event.currentTarget.value === 'left';
            this.draw();
        }, options);
        window.addEventListener('keydown', (event) => {
            if (event.repeat ||
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLSelectElement ||
                event.target instanceof HTMLButtonElement)
                return;
            if (event.code === 'Space') {
                event.preventDefault();
                this.playback.togglePause();
            }
            else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault();
                this.playback.seek(this.playback.snapshot.index +
                    (event.code === 'ArrowLeft' ? -1 : 1));
            }
            this.draw();
        }, options);
        document.addEventListener('visibilitychange', () => {
            this.previousTime = 0;
        }, options);
    }
    tick = (now) => {
        const delta = this.previousTime
            ? Math.min(0.05, (now - this.previousTime) / 1000)
            : 0;
        this.previousTime = now;
        this.playback.update(delta);
        this.draw();
        this.frameRequest = requestAnimationFrame(this.tick);
    };
    draw() {
        if (!this.images)
            return;
        const { index, paused } = this.playback.snapshot;
        const record = this.record;
        const images = [
            this.images.original,
            this.images.input,
            this.images.frames[index],
        ];
        this.stages.forEach((stage, position) => drawStage(stage, images[position], {
            record,
            original: position === 0,
            displayHeight: this.displayHeight,
            dark: this.dark,
            mirrored: this.mirrored,
        }));
        element('#pause').textContent = paused
            ? '재생 · Space'
            : '일시정지 · Space';
        element('#timeline').value = String(index);
        const sourceIndex = this.frameIndices[index];
        const frame = record.frames[sourceIndex];
        const label = 'label' in frame
            ? frame.label
            : sourceIndex === 0
                ? '입력 자세'
                : `생성 ${sourceIndex} / ${record.frames.length - 1}`;
        element('#frame-label').textContent = label;
        element('#status').textContent =
            `${label} · ${paused ? '정지' : '재생'} · ${this.displayHeight.toFixed(1)}px`;
        document.body.dataset.frameIndex = String(index);
        document.body.dataset.sourceFrameIndex = String(sourceIndex);
        document.body.dataset.facing = this.mirrored
            ? 'left'
            : this.motionKey === 'idle'
                ? 'front'
                : 'right';
        document.body.dataset.paused = String(paused);
        document.body.dataset.displayHeight = String(this.displayHeight);
        document.body.dataset.frameMode = this.includeAllFrames
            ? 'raw'
            : 'selected';
    }
}
void new PixellabMotionComparison().start();
