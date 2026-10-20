import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { connectStudioScene, redirectToStudio, studioMode, } from '../../cutscenes/studio/bridge.js';
import { loadCutAssets } from './assets.js';
import { cuts, drawCut } from './catalog.js';
import { exportCutGif } from './export.js';
import { CutPlayer } from './player.js';
import { CutSurfaces } from './surfaces.js';
function element(id, kind) {
    const value = document.getElementById(id);
    if (!(value instanceof kind))
        throw new Error(`화면 요소가 없습니다: ${id}`);
    return value;
}
/** 입력·실행 루프·보조 판·다운로드의 수명을 이 화면이 함께 정리한다. */
class CutScreen {
    assets;
    surfaces;
    events = new AbortController();
    player = new CutPlayer();
    canvas = element('stage', HTMLCanvasElement);
    context = this.canvas.getContext('2d');
    list = element('cuts', HTMLElement);
    seek = element('seek', HTMLInputElement);
    play = element('play', HTMLButtonElement);
    status = element('status', HTMLOutputElement);
    download = element('download', HTMLAnchorElement);
    current = cuts.find((c) => c.id === location.hash.slice(1)) ?? cuts[0];
    frameId = 0;
    last = 0;
    disposed = false;
    exporting = null;
    downloadUrl = null;
    studio;
    constructor(assets, surfaces) {
        this.assets = assets;
        this.surfaces = surfaces;
        if (!this.context)
            throw new Error('Canvas를 준비할 수 없습니다.');
        if (cuts.length !== 10 || new Set(cuts.map((c) => c.id)).size !== 10)
            throw new Error('서로 다른 10개 컷이 필요합니다.');
        const { signal } = this.events;
        cuts.forEach((cut, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.cut = cut.id;
            const number = document.createElement('span');
            number.textContent = String(index + 1).padStart(2, '0');
            const title = document.createElement('strong');
            title.textContent = cut.title;
            const note = document.createElement('small');
            note.textContent = `${cut.kind} · ${cut.duration.toFixed(2)}초`;
            button.append(number, title, note);
            button.addEventListener('click', () => this.select(cut), { signal });
            this.list.append(button);
        });
        this.play.addEventListener('click', () => {
            this.player.toggle();
            this.render();
        }, { signal });
        element('restart', HTMLButtonElement).addEventListener('click', () => {
            this.player.restart();
            this.render();
        }, { signal });
        for (const [id, direction] of [
            ['previous', -1],
            ['next', 1],
        ])
            element(id, HTMLButtonElement).addEventListener('click', () => this.step(direction), { signal });
        for (const [id, direction] of [
            ['frame-back', -1],
            ['frame-next', 1],
        ])
            element(id, HTMLButtonElement).addEventListener('click', () => this.seekFrame(direction), { signal });
        this.seek.addEventListener('input', () => {
            this.player.seek(Number(this.seek.value));
            this.render();
        }, { signal });
        element('speed', HTMLSelectElement).addEventListener('change', (event) => {
            if (event.currentTarget instanceof HTMLSelectElement)
                this.player.speed(Number(event.currentTarget.value));
        }, { signal });
        window.addEventListener('keydown', (event) => {
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLSelectElement ||
                event.target instanceof HTMLTextAreaElement)
                return;
            if (event.code === 'Space') {
                event.preventDefault();
                this.player.toggle();
                this.render();
            }
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault();
                this.seekFrame((event.code === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 5 : 1));
            }
            if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
                event.preventDefault();
                this.step(event.code === 'ArrowUp' ? -1 : 1);
            }
        }, { signal });
        window.addEventListener('hashchange', () => {
            const cut = cuts.find((c) => c.id === location.hash.slice(1));
            if (cut && cut !== this.current)
                this.select(cut);
        }, { signal });
        element('png', HTMLButtonElement).addEventListener('click', () => this.savePng(), { signal });
        element('gif', HTMLButtonElement).addEventListener('click', () => {
            void this.export();
        }, { signal });
        element('cancel', HTMLButtonElement).addEventListener('click', () => this.exporting?.abort(), { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        document.addEventListener('visibilitychange', () => {
            this.last = 0;
        }, { signal });
        for (const id of ['play', 'restart', 'png', 'gif'])
            element(id, HTMLButtonElement).disabled = false;
        this.status.textContent = '준비 완료 · 무음';
        this.select(this.current);
        this.studio = connectStudioScene('selected', {
            snapshot: () => {
                const state = this.player.snapshot;
                return {
                    itemId: this.current.id,
                    title: this.current.title,
                    description: this.current.description,
                    timeMs: state.time * 1000,
                    durationMs: state.duration * 1000,
                    playing: state.playing,
                    beats: this.current.beats.map((beat) => ({
                        timeMs: beat.time * 1000,
                        label: beat.label,
                    })),
                    loop: element('loop', HTMLInputElement).checked,
                    exporting: this.exporting !== null,
                    exportStatus: this.status.textContent ?? '',
                };
            },
            select: (id) => {
                const cut = cuts.find((entry) => entry.id === id);
                if (cut)
                    this.select(cut);
            },
            toggle: () => {
                this.player.toggle();
                this.render();
            },
            restart: () => {
                this.player.restart();
                this.render();
            },
            seek: (timeMs) => {
                this.player.seek(timeMs / 1000);
                this.render();
            },
            speed: (rate) => {
                element('speed', HTMLSelectElement).value = String(rate);
                this.player.speed(rate);
            },
            loop: (enabled) => {
                element('loop', HTMLInputElement).checked = enabled;
            },
            gif: () => void this.export(),
            png: () => this.savePng(),
            cancelExport: () => this.exporting?.abort(),
        });
        this.frameId = requestAnimationFrame((time) => this.tick(time));
    }
    select(cut) {
        this.exporting?.abort();
        this.current = cut;
        this.player.select(cut.duration);
        this.seek.max = String(cut.duration);
        history.replaceState(null, '', `#${cut.id}`);
        element('cut-title', HTMLElement).textContent = cut.title;
        element('cut-kind', HTMLElement).textContent = cut.kind;
        element('counter', HTMLOutputElement).textContent =
            `${String(cuts.indexOf(cut) + 1).padStart(2, '0')} / 10`;
        element('description', HTMLElement).textContent = cut.description;
        for (const button of this.list.querySelectorAll('button'))
            button.setAttribute('aria-pressed', String(button.dataset.cut === cut.id));
        const beats = element('beats', HTMLElement);
        beats.replaceChildren();
        for (const beat of cut.beats) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${beat.time.toFixed(2)}s ${beat.label}`;
            button.addEventListener('click', () => {
                this.player.seek(beat.time);
                this.render();
            }, { signal: this.events.signal });
            beats.append(button);
        }
        this.render();
    }
    step(direction) {
        this.select(cuts[(cuts.indexOf(this.current) + direction + cuts.length) % cuts.length]);
    }
    seekFrame(direction) {
        this.player.seek(this.player.snapshot.time + direction / 24);
        this.render();
    }
    render() {
        if (!this.context || this.disposed)
            return;
        const state = this.player.snapshot;
        drawCut(this.context, this.current, {
            time: state.time,
            assets: this.assets,
            surfaces: this.surfaces,
        });
        this.seek.value = String(state.time);
        this.canvas.dataset.cut = this.current.id;
        this.canvas.dataset.time = state.time.toFixed(4);
        this.canvas.dataset.playing = String(state.playing);
        element('time', HTMLOutputElement).textContent =
            `${state.time.toFixed(3)} / ${state.duration.toFixed(3)} s`;
        this.play.textContent = state.playing ? '정지' : '재생';
    }
    tick(time) {
        if (this.disposed)
            return;
        const delta = this.last ? Math.min(0.08, (time - this.last) / 1000) : 0;
        this.last = time;
        const playing = this.player.snapshot.playing;
        if (this.player.advance(delta)) {
            if (!studioMode && element('sequence', HTMLInputElement).checked) {
                this.step(1);
                this.player.restart();
            }
            else if (element('loop', HTMLInputElement).checked)
                this.player.restart();
        }
        if (playing)
            this.render();
        this.frameId = requestAnimationFrame((next) => this.tick(next));
    }
    save(blob, name) {
        if (this.downloadUrl)
            URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(blob);
        this.download.href = this.downloadUrl;
        this.download.download = name;
        this.download.hidden = false;
        this.download.click();
    }
    savePng() {
        const cutId = this.current.id;
        const timeMs = Math.round(this.player.snapshot.time * 1000);
        this.canvas.toBlob((blob) => {
            if (blob && !this.disposed)
                this.save(blob, `anime-${cutId}-${timeMs}ms.png`);
        });
    }
    async export() {
        if (this.exporting)
            return;
        this.player.pause();
        this.render();
        const cut = this.current, controller = new AbortController();
        this.exporting = controller;
        element('gif', HTMLButtonElement).disabled = true;
        element('cancel', HTMLButtonElement).hidden = false;
        try {
            const blob = await exportCutGif(cut, this.assets, controller.signal, (percent) => {
                this.status.textContent = `${cut.title} GIF ${percent}%`;
            });
            controller.signal.throwIfAborted();
            this.save(blob, `anime-${cut.id}.gif`);
            this.status.textContent = 'GIF 저장 완료 · 640×360 · 24fps';
        }
        catch (error) {
            if (controller.signal.aborted)
                this.status.textContent = '저장을 취소했습니다.';
            else
                this.status.textContent =
                    error instanceof Error ? error.message : 'GIF 저장 실패';
        }
        finally {
            this.exporting = null;
            if (!this.disposed) {
                element('gif', HTMLButtonElement).disabled = false;
                element('cancel', HTMLButtonElement).hidden = true;
            }
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.events.abort();
        this.studio?.dispose();
        cancelAnimationFrame(this.frameId);
        this.exporting?.abort();
        this.surfaces.dispose();
        if (this.downloadUrl)
            URL.revokeObjectURL(this.downloadUrl);
    }
}
async function start() {
    if (redirectToStudio('selected'))
        return;
    const lifecycle = new AbortController();
    let disposed = false;
    let screen;
    let surfaces;
    const dispose = () => {
        disposed = true;
        screen?.dispose();
        if (!screen)
            surfaces?.dispose();
        lifecycle.abort();
    };
    registerEmbeddedScene(dispose);
    window.addEventListener('pagehide', dispose, {
        once: true,
        signal: lifecycle.signal,
    });
    try {
        surfaces = new CutSurfaces();
        const [assets] = await Promise.all([loadCutAssets(), surfaces.prepare()]);
        if (!disposed)
            screen = new CutScreen(assets, surfaces);
    }
    catch (error) {
        surfaces?.dispose();
        if (disposed)
            return;
        lifecycle.abort();
        const output = element('error', HTMLElement);
        output.hidden = false;
        output.textContent =
            error instanceof Error ? error.message : '원본을 불러오지 못했습니다.';
        element('status', HTMLOutputElement).textContent = '준비 실패';
    }
}
void start();
