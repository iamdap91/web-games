import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { connectStudioScene, studioMode } from '../studio/bridge.js';
import { CutscenePlayer, sceneWidth, sceneHeight, } from './playback.js';
function element(id, type) {
    const value = document.getElementById(id);
    if (!(value instanceof type))
        throw new Error(`컷씬 화면 요소가 없습니다: ${id}`);
    return value;
}
/** 입력·표시·프레임 루프를 연결하고 등록한 이벤트와 관찰자를 함께 정리한다. */
export class CutsceneScreen {
    definition;
    player;
    studioConnection;
    events = new AbortController();
    canvas = element('scene', HTMLCanvasElement);
    ctx = this.canvas.getContext('2d');
    play = element('play', HTMLButtonElement);
    restart = element('restart', HTMLButtonElement);
    start = element('start', HTMLButtonElement);
    scrub = element('scrub', HTMLInputElement);
    speed = element('speed', HTMLSelectElement);
    reducedMotion = element('reduced-motion', HTMLInputElement);
    status = element('status', HTMLParagraphElement);
    loading = element('loading', HTMLDivElement);
    cutButtons = [];
    observer = new ResizeObserver(() => this.resize());
    assets = null;
    frameId = 0;
    lastFrameMs = 0;
    disposed = false;
    gifRange;
    exporting = null;
    exportStatus = '';
    gifUrl = null;
    gifFileName = null;
    constructor(definition) {
        this.definition = definition;
        this.player = new CutscenePlayer(definition.cuts);
        const cuts = definition.cuts;
        const durationMs = this.player.durationMs;
        this.gifRange = { startMs: 0, endMs: durationMs };
        this.scrub.max = String(durationMs);
        this.reducedMotion.checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const signal = this.events.signal;
        for (const button of [this.play, this.start])
            button.addEventListener('click', () => this.toggle(), { signal });
        this.restart.addEventListener('click', () => this.restartPlayback(), {
            signal,
        });
        this.scrub.addEventListener('input', () => this.seek(Number(this.scrub.value)), { signal });
        this.speed.addEventListener('change', () => {
            this.player.setSpeed(Number(this.speed.value));
        }, { signal });
        this.reducedMotion.addEventListener('change', () => this.render(), {
            signal,
        });
        for (const cut of cuts) {
            const button = document.createElement('button');
            button.disabled = true;
            button.innerHTML = `${cut.label}<small>${(cut.startMs / 1000).toFixed(2)}초</small>`;
            button.addEventListener('click', () => this.seek(cut.startMs + (cut.previewMs ?? 150)), { signal });
            element('cuts', HTMLElement).append(button);
            this.cutButtons.push(button);
        }
        window.addEventListener('keydown', (event) => {
            if (event.target instanceof Element &&
                event.target.closest('input,select,button,a,summary'))
                return;
            if (event.code === 'Space') {
                event.preventDefault();
                if (!event.repeat)
                    this.toggle();
            }
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault();
                this.seek(this.player.snapshot().elapsedMs +
                    (event.code === 'ArrowLeft' ? -80 : 80));
            }
        }, { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.player.pause();
                this.render();
            }
        }, { signal });
        window.addEventListener('blur', () => {
            if (studioMode)
                return;
            this.player.pause();
            this.render();
        }, { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        this.observer.observe(this.canvas);
        this.resize();
        this.studioConnection = connectStudioScene(definition.studio.source, {
            snapshot: () => this.studioSnapshot(),
            select: (id) => {
                if (id === 'full-cutscene')
                    this.seek(0);
            },
            toggle: () => this.toggle(),
            restart: () => this.restartPlayback(),
            seek: (timeMs) => this.seek(timeMs),
            speed: (rate) => {
                if (!this.exporting)
                    this.player.setSpeed(rate);
            },
            reduced: (enabled) => {
                if (this.exporting)
                    return;
                this.reducedMotion.checked = enabled;
                this.render();
            },
            ...(definition.gif
                ? {
                    gif: () => void this.saveGif(),
                    gifRange: (range) => this.setGifRange(range),
                    cancelExport: () => this.exporting?.abort(),
                }
                : {}),
        });
        void this.load();
    }
    async load() {
        try {
            const assets = await this.definition.load();
            if (this.disposed)
                return;
            this.assets = assets;
            for (const control of [
                this.play,
                this.restart,
                this.start,
                this.scrub,
                ...this.cutButtons,
            ])
                control.disabled = false;
            this.loading.hidden = true;
            this.render();
            this.frameId = requestAnimationFrame(this.tick);
        }
        catch (error) {
            if (this.disposed)
                return;
            const message = error instanceof Error ? error.message : '그림을 불러오지 못했습니다.';
            this.loading.textContent = message;
            this.status.textContent = message;
        }
    }
    resize() {
        const ratio = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(sceneWidth * ratio);
        this.canvas.height = Math.round(sceneHeight * ratio);
        this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.render();
    }
    studioSnapshot() {
        const snapshot = this.player.snapshot();
        return {
            itemId: 'full-cutscene',
            title: this.definition.studio.title,
            description: this.definition.studio.description,
            timeMs: snapshot.elapsedMs,
            durationMs: this.player.durationMs,
            playing: snapshot.playing,
            loading: this.assets === null,
            beats: this.definition.cuts.map((cut) => ({
                timeMs: cut.startMs + (cut.previewMs ?? 150),
                label: cut.label,
            })),
            reducedMotion: this.reducedMotion.checked,
            ...(this.definition.gif
                ? {
                    gifRange: this.gifRange,
                    exporting: this.exporting !== null,
                    exportStatus: this.exportStatus,
                    ...(this.gifUrl && this.gifFileName
                        ? {
                            exportDownload: {
                                url: this.gifUrl,
                                fileName: this.gifFileName,
                            },
                        }
                        : {}),
                }
                : {}),
        };
    }
    restartPlayback() {
        if (!this.assets || this.exporting)
            return;
        this.player.restart();
        this.lastFrameMs = 0;
        this.render();
    }
    toggle() {
        if (!this.assets || this.exporting)
            return;
        if (this.player.snapshot().playing) {
            this.player.pause();
        }
        else {
            this.player.play();
            this.lastFrameMs = 0;
        }
        this.render();
    }
    seek(timeMs) {
        if (!this.assets || this.exporting)
            return;
        this.player.pause();
        this.player.seek(timeMs);
        this.render();
    }
    tick = (now) => {
        if (this.disposed)
            return;
        const before = this.player.snapshot().elapsedMs;
        const delta = this.lastFrameMs === 0 ? 0 : Math.min(now - this.lastFrameMs, 100);
        this.lastFrameMs = now;
        this.player.advance(delta);
        const after = this.player.snapshot();
        if (after.playing || before !== after.elapsedMs)
            this.render();
        this.frameId = requestAnimationFrame(this.tick);
    };
    setGifRange(range) {
        if (this.exporting)
            return;
        const duration = this.player.durationMs;
        const startMs = Math.max(0, Math.min(duration, Math.round(range.startMs)));
        const endMs = Math.max(0, Math.min(duration, Math.round(range.endMs)));
        if (endMs <= startMs) {
            this.exportStatus = 'GIF 끝 시각은 시작 시각보다 뒤여야 합니다.';
            return;
        }
        this.gifRange = { startMs, endMs };
        this.exportStatus = '';
        this.clearGifDownload();
    }
    clearGifDownload() {
        if (this.gifUrl)
            URL.revokeObjectURL(this.gifUrl);
        this.gifUrl = null;
        this.gifFileName = null;
    }
    async saveGif() {
        const assets = this.assets;
        const settings = this.definition.gif;
        if (!assets || !settings || this.exporting || this.disposed)
            return;
        const previous = this.player.snapshot();
        const controller = new AbortController();
        const range = this.gifRange;
        this.clearGifDownload();
        this.exporting = controller;
        this.exportStatus = 'GIF를 준비하고 있습니다.';
        this.player.pause();
        this.lastFrameMs = 0;
        this.render();
        try {
            // GIF를 지원하지 않는 다른 컷씬은 인코더를 불러오지 않는다.
            const { exportCutsceneGif } = await import('./gif-export.js');
            controller.signal.throwIfAborted();
            const blob = await exportCutsceneGif({
                definition: this.definition,
                assets,
                range,
                reducedMotion: this.reducedMotion.checked,
                signal: controller.signal,
                progress: (frame, total) => {
                    this.exportStatus = `GIF 저장 중 · ${frame} / ${total}프레임`;
                    this.status.textContent = this.exportStatus;
                },
            });
            if (this.disposed)
                return;
            this.gifUrl = URL.createObjectURL(blob);
            const full = range.startMs === 0 && range.endMs === this.player.durationMs;
            this.gifFileName = `${settings.fileName}${full ? '' : `-${range.startMs}-${range.endMs}`}.gif`;
            this.exportStatus = `GIF 준비 완료 · 640×360 · ${(range.startMs / 1000).toFixed(3)}–${(range.endMs / 1000).toFixed(3)}초 · ${full ? '12.5' : '25'}fps`;
        }
        catch (error) {
            if (this.disposed)
                return;
            this.exportStatus = controller.signal.aborted
                ? 'GIF 저장을 취소했습니다.'
                : error instanceof Error
                    ? error.message
                    : 'GIF를 저장하지 못했습니다.';
        }
        finally {
            if (this.exporting === controller)
                this.exporting = null;
            if (!this.disposed) {
                if (previous.playing && !document.hidden)
                    this.player.play();
                this.lastFrameMs = 0;
                this.render();
            }
        }
    }
    render() {
        if (!this.ctx || !this.assets)
            return;
        for (const control of [
            this.play,
            this.restart,
            this.start,
            this.scrub,
            this.speed,
            this.reducedMotion,
            ...this.cutButtons,
        ])
            control.disabled = this.exporting !== null;
        const snapshot = this.player.snapshot();
        const durationMs = this.player.durationMs;
        const cuts = this.definition.cuts;
        this.definition.draw(this.ctx, snapshot, this.assets, {
            reducedMotion: this.reducedMotion.checked,
        });
        this.canvas.dataset.cut = snapshot.cut.id;
        this.canvas.dataset.elapsedMs = String(Math.round(snapshot.elapsedMs));
        this.canvas.dataset.playing = String(snapshot.playing);
        this.canvas.dataset.action = this.definition.action(snapshot);
        this.play.textContent = snapshot.playing
            ? '일시정지'
            : snapshot.ended
                ? '다시 재생'
                : '재생';
        this.start.hidden =
            snapshot.playing || (snapshot.elapsedMs > 0 && !snapshot.ended);
        this.start.innerHTML = `<span aria-hidden="true">▶</span> ${snapshot.ended ? '다시 감상' : '컷씬 재생'}`;
        this.scrub.value = String(snapshot.elapsedMs);
        element('time', HTMLOutputElement).value =
            `${(snapshot.elapsedMs / 1000).toFixed(2)} / ${(durationMs / 1000).toFixed(2)}초`;
        const cutName = element('cut-name', HTMLOutputElement);
        if (cutName.value !== snapshot.cut.label)
            cutName.value = snapshot.cut.label;
        this.cutButtons.forEach((button, i) => button.setAttribute('aria-current', String(cuts[i].id === snapshot.cut.id)));
        const status = snapshot.playing
            ? '재생 중'
            : snapshot.ended
                ? '감상 완료 · 다시 재생할 수 있습니다.'
                : snapshot.elapsedMs === 0
                    ? '준비 완료 · 재생을 눌러 감상하세요.'
                    : '일시정지 · 컷을 선택하거나 시간을 옮겨볼 수 있습니다.';
        const currentStatus = this.exportStatus || status;
        if (this.status.textContent !== currentStatus)
            this.status.textContent = currentStatus;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.exporting?.abort();
        this.clearGifDownload();
        cancelAnimationFrame(this.frameId);
        this.studioConnection.dispose();
        this.events.abort();
        this.observer.disconnect();
        this.assets = null;
    }
}
export function mountCutscene(definition) {
    const screen = new CutsceneScreen(definition);
    registerEmbeddedScene(() => screen.dispose());
}
