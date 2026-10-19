import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { samples, drawSample } from './catalog.js';
import { exportGif } from './export.js';
import { ShowcasePlayer } from './player.js';
import { categories, height, width, } from './types.js';
function element(id, kind) {
    const value = document.getElementById(id);
    if (!(value instanceof kind))
        throw new Error(`화면 요소가 없습니다: ${id}`);
    return value;
}
/** 선택·입력·Canvas·실행 루프·내보내기의 수명을 소유한다. */
class ShowcaseScreen {
    events = new AbortController();
    player = new ShowcasePlayer();
    canvas = element('stage', HTMLCanvasElement);
    baseline = element('baseline', HTMLCanvasElement);
    context = this.canvas.getContext('2d');
    baseContext = this.baseline.getContext('2d');
    search = element('search', HTMLInputElement);
    categoryNav = element('categories', HTMLElement);
    list = element('sample-list', HTMLElement);
    seek = element('seek', HTMLInputElement);
    play = element('play', HTMLButtonElement);
    compare = element('compare', HTMLInputElement);
    reduced = element('reduced', HTMLInputElement);
    loop = element('loop', HTMLInputElement);
    sequence = element('sequence', HTMLInputElement);
    exportButton = element('export', HTMLButtonElement);
    exportStatus = element('export-status', HTMLOutputElement);
    cancel = element('cancel', HTMLButtonElement);
    observer = new ResizeObserver(() => this.resize());
    urls = new Set();
    category = 'all';
    current = samples.find((s) => `#${s.id}` === location.hash) ?? samples[0];
    filtered = samples;
    frameId = 0;
    lastTime = 0;
    disposed = false;
    exporting = null;
    constructor() {
        if (!this.context || !this.baseContext)
            throw new Error('Canvas를 준비할 수 없습니다.');
        if (samples.length !== 90 || new Set(samples.map((s) => s.id)).size !== 90)
            throw new Error('견본 목록은 서로 다른 90개여야 합니다.');
        for (const category of categories)
            if (samples.filter((s) => s.category === category.id).length !==
                category.count)
                throw new Error(`분류 수가 맞지 않습니다: ${category.name}`);
        this.reduced.checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const signal = this.events.signal;
        for (const category of [
            { id: 'all', name: '전체 견본', count: 90 },
            ...categories,
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.category = category.id;
            button.setAttribute('aria-pressed', String(category.id === this.category));
            const name = document.createElement('span');
            name.textContent = category.name;
            const count = document.createElement('small');
            count.textContent = String(category.count);
            button.append(name, count);
            this.categoryNav.append(button);
        }
        this.categoryNav.addEventListener('click', (event) => {
            const button = event.target instanceof Element
                ? event.target.closest('button[data-category]')
                : null;
            const id = button?.dataset.category;
            if (id === 'all' || categories.some((c) => c.id === id)) {
                this.category = id;
                this.filter();
            }
        }, { signal });
        this.search.addEventListener('input', () => this.filter(), { signal });
        this.list.addEventListener('click', (event) => {
            const button = event.target instanceof Element
                ? event.target.closest('button[data-sample]')
                : null;
            const sample = samples.find((s) => s.id === button?.dataset.sample);
            if (sample)
                this.select(sample);
        }, { signal });
        this.play.addEventListener('click', () => {
            this.player.toggle();
            this.render();
        }, { signal });
        element('restart', HTMLButtonElement).addEventListener('click', () => this.player.restart(), { signal });
        element('next', HTMLButtonElement).addEventListener('click', () => this.step(1), { signal });
        element('previous', HTMLButtonElement).addEventListener('click', () => this.step(-1), { signal });
        element('speed', HTMLSelectElement).addEventListener('change', (event) => {
            const input = event.currentTarget;
            if (input instanceof HTMLSelectElement)
                this.player.speed(Number(input.value));
        }, { signal });
        this.seek.addEventListener('input', () => {
            this.player.seek(Number(this.seek.value));
            this.render();
        }, { signal });
        element('key', HTMLButtonElement).addEventListener('click', () => {
            this.player.seek(this.current.previewMs ?? 1900);
            this.render();
        }, { signal });
        this.compare.addEventListener('change', () => {
            const figure = this.baseline.closest('figure');
            if (figure instanceof HTMLElement)
                figure.hidden = !this.compare.checked;
            element('stages', HTMLElement).classList.toggle('comparing', this.compare.checked);
            this.resize();
        }, { signal });
        this.reduced.addEventListener('change', () => {
            this.exporting?.abort();
            this.render();
        }, { signal });
        this.exportButton.addEventListener('click', () => void this.saveGif(), {
            signal,
        });
        this.cancel.addEventListener('click', () => this.exporting?.abort(), {
            signal,
        });
        window.addEventListener('hashchange', () => {
            const sample = samples.find((s) => `#${s.id}` === location.hash);
            if (sample && sample.id !== this.current.id) {
                this.category = 'all';
                this.search.value = '';
                this.filtered = samples;
                this.select(sample);
                this.filter();
            }
        }, { signal });
        window.addEventListener('keydown', (event) => {
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLSelectElement ||
                (event.target instanceof HTMLElement &&
                    event.target.isContentEditable) ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey)
                return;
            if (event.code === 'Space') {
                if (event.repeat ||
                    (event.target instanceof Element &&
                        event.target.closest('button, a, summary')))
                    return;
                event.preventDefault();
                this.player.toggle();
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                const direction = event.key === 'ArrowRight' ? 1 : -1;
                if (event.shiftKey)
                    this.player.seek(this.player.snapshot.timeMs + direction * 100);
                else
                    this.step(direction);
            }
        }, { signal });
        window.addEventListener('pagehide', () => this.dispose(), { signal });
        this.observer.observe(this.canvas);
        this.observer.observe(this.baseline);
        this.filter();
        this.describe();
        this.resize();
        this.frameId = requestAnimationFrame((time) => this.tick(time));
    }
    filter() {
        const query = this.search.value.trim().toLocaleLowerCase();
        this.filtered = samples.filter((s) => (this.category === 'all' || s.category === this.category) &&
            (!query ||
                `${s.name} ${s.description} ${s.distinction}`
                    .toLocaleLowerCase()
                    .includes(query)));
        this.list.replaceChildren();
        for (const sample of this.filtered) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.sample = sample.id;
            button.setAttribute('aria-current', String(sample.id === this.current.id));
            const number = document.createElement('small');
            number.textContent = String(samples.indexOf(sample) + 1).padStart(2, '0');
            const name = document.createElement('span');
            name.textContent = sample.name;
            button.append(number, name);
            this.list.append(button);
        }
        for (const button of this.categoryNav.querySelectorAll('button'))
            button.setAttribute('aria-pressed', String(button.dataset.category === this.category));
        element('list-title', HTMLElement).textContent =
            categories.find((c) => c.id === this.category)?.name ?? '전체 견본';
        element('count', HTMLElement).textContent = String(this.filtered.length);
        element('empty', HTMLElement).hidden = this.filtered.length !== 0;
        for (const id of ['previous', 'next'])
            element(id, HTMLButtonElement).disabled = this.filtered.length < 2;
        if (this.filtered.length && !this.filtered.includes(this.current))
            this.select(this.filtered[0]);
    }
    select(sample) {
        this.exporting?.abort();
        this.current = sample;
        this.player.select();
        if (location.hash !== `#${sample.id}`)
            history.replaceState(null, '', `#${sample.id}`);
        for (const button of this.list.querySelectorAll('button'))
            button.setAttribute('aria-current', String(button.dataset.sample === sample.id));
        this.describe();
        this.render();
    }
    describe() {
        const sample = this.current;
        const category = categories.find((c) => c.id === sample.category);
        element('sample-title', HTMLElement).textContent = sample.name;
        element('category-label', HTMLElement).textContent = category.name;
        element('ordinal', HTMLOutputElement).textContent =
            `${String(samples.indexOf(sample) + 1).padStart(2, '0')} / 90`;
        element('description', HTMLElement).textContent = sample.description;
        element('distinction', HTMLElement).textContent = sample.distinction;
    }
    step(direction) {
        if (!this.filtered.length)
            return;
        const index = Math.max(0, this.filtered.indexOf(this.current));
        this.select(this.filtered[(index + direction + this.filtered.length) % this.filtered.length]);
    }
    resize() {
        if (this.disposed)
            return;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        for (const canvas of [this.canvas, this.baseline]) {
            const box = canvas.getBoundingClientRect();
            if (box.width < 1)
                continue;
            const w = Math.round(box.width * ratio), h = Math.round((w * height) / width);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
        }
        this.render();
    }
    render() {
        if (this.disposed || !this.context || !this.baseContext)
            return;
        const snapshot = this.player.snapshot;
        for (const [canvas, ctx, enhanced] of [
            [this.canvas, this.context, true],
            [this.baseline, this.baseContext, false],
        ]) {
            if (!enhanced && !this.compare.checked)
                continue;
            ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
            drawSample(ctx, this.current, {
                timeMs: snapshot.timeMs,
                enhanced,
                reducedMotion: this.reduced.checked,
            });
            canvas.dataset.sample = this.current.id;
            canvas.dataset.category = this.current.category;
            canvas.dataset.timeMs = String(Math.round(snapshot.timeMs));
            canvas.dataset.playing = String(snapshot.playing);
            canvas.dataset.reducedMotion = String(this.reduced.checked);
        }
        this.seek.value = String(snapshot.timeMs);
        element('time', HTMLOutputElement).textContent =
            `${(snapshot.timeMs / 1000).toFixed(2)} / 4.20초`;
        element('stage-time', HTMLOutputElement).textContent =
            `${(snapshot.timeMs / 1000).toFixed(2)}s`;
        this.play.textContent = snapshot.playing ? '일시정지' : '재생';
    }
    tick(now) {
        if (this.disposed)
            return;
        const ended = this.player.advance(this.lastTime ? Math.min(100, now - this.lastTime) : 0);
        this.lastTime = now;
        if (ended) {
            if (this.sequence.checked) {
                this.step(1);
                this.player.restart();
            }
            else if (this.loop.checked)
                this.player.restart();
        }
        try {
            this.render();
        }
        catch (error) {
            this.player.pause();
            const box = element('error', HTMLElement);
            box.hidden = false;
            box.textContent = error instanceof Error ? error.message : String(error);
            return;
        }
        this.frameId = requestAnimationFrame((time) => this.tick(time));
    }
    async saveGif() {
        if (this.exporting || this.disposed)
            return;
        const controller = new AbortController();
        this.player.pause();
        this.render();
        this.exporting = controller;
        this.exportButton.disabled = true;
        this.cancel.hidden = false;
        try {
            const blob = await exportGif({
                sample: this.current,
                reducedMotion: this.reduced.checked,
                signal: controller.signal,
                progress: (percent) => {
                    if (!this.disposed)
                        this.exportStatus.textContent = `${percent}%`;
                },
            });
            if (this.disposed || controller.signal.aborted)
                return;
            for (const previous of this.urls)
                URL.revokeObjectURL(previous);
            this.urls.clear();
            const url = URL.createObjectURL(blob);
            this.urls.add(url);
            const link = document.createElement('a');
            link.href = url;
            link.download = `anime-${this.current.id}.gif`;
            link.click();
            this.exportStatus.textContent = 'GIF 저장 완료 · 640×360 · 20fps';
        }
        catch (error) {
            if (!this.disposed)
                this.exportStatus.textContent = controller.signal.aborted
                    ? '저장을 취소했습니다.'
                    : error instanceof Error
                        ? error.message
                        : String(error);
        }
        finally {
            if (this.exporting === controller)
                this.exporting = null;
            if (!this.disposed) {
                this.exportButton.disabled = false;
                this.cancel.hidden = true;
            }
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.events.abort();
        this.exporting?.abort();
        this.observer.disconnect();
        cancelAnimationFrame(this.frameId);
        for (const url of this.urls)
            URL.revokeObjectURL(url);
        this.urls.clear();
    }
}
const screen = new ShowcaseScreen();
registerEmbeddedScene(() => screen.dispose());
