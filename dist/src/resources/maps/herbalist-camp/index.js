import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { HerbalistCamp } from './camp.js';
import { CampDrawing } from './drawing.js';
import { loadCampMap } from './map-data.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
/** 입력·DOM·루프는 이 화면이 소유하고 맵 보행은 HerbalistCamp에 맡긴다. */
class CampScreen {
    canvas = required('#scene');
    events = new AbortController();
    observer;
    keys = new Set();
    camp;
    drawing;
    touchDirection = { x: 0, y: 0 };
    raf = 0;
    previousTime = 0;
    ready = false;
    disposed = false;
    paused = false;
    overview = true;
    lastStatus = '';
    constructor() {
        this.observer = new ResizeObserver(() => {
            this.drawing?.resize();
            if (this.camp)
                this.drawing?.render(this.camp.snapshot, this.overview);
        });
        this.observer.observe(this.canvas);
        this.bindEvents();
        this.publishDiagnostics();
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        void this.load();
    }
    async load() {
        try {
            const map = await loadCampMap();
            if (this.disposed)
                return;
            this.camp = new HerbalistCamp(map);
            this.drawing = new CampDrawing(this.canvas, map);
            await this.drawing.ready;
            if (this.disposed)
                return;
            this.ready = true;
            for (const button of document.querySelectorAll('button'))
                button.disabled = false;
            this.refreshUi();
            this.raf = requestAnimationFrame((time) => this.frame(time));
        }
        catch (error) {
            if (this.disposed)
                return;
            required('#status').textContent =
                error instanceof Error ? error.message : '야영지를 준비하지 못했어요.';
        }
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if ([
                'arrowup',
                'arrowdown',
                'arrowleft',
                'arrowright',
                'w',
                'a',
                's',
                'd',
                ' ',
            ].includes(key))
                event.preventDefault();
            if (!this.ready)
                return;
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === ' ' && !this.paused)
                this.camp?.inspect();
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'escape')
                this.togglePause();
            this.refreshUi();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.clearInput(), options);
        const click = (id, action) => required(id).addEventListener('click', () => {
            action();
            this.refreshUi();
            this.canvas.focus({ preventScroll: true });
        }, options);
        click('#inspect', () => {
            if (!this.paused)
                this.camp?.inspect();
        });
        click('#overview', () => {
            this.overview = !this.overview;
        });
        click('#reset', () => {
            this.clearInput();
            this.camp?.reset();
        });
        click('#pause', () => this.togglePause());
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus({ preventScroll: true }), options);
        for (const button of document.querySelectorAll('[data-direction]')) {
            const direction = button.dataset.direction;
            const vector = direction === 'up'
                ? { x: 0, y: -1 }
                : direction === 'down'
                    ? { x: 0, y: 1 }
                    : direction === 'left'
                        ? { x: -1, y: 0 }
                        : { x: 1, y: 0 };
            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                if (!this.ready || this.paused)
                    return;
                button.setPointerCapture(event.pointerId);
                this.touchDirection = vector;
            }, options);
            const release = () => {
                this.touchDirection = { x: 0, y: 0 };
            };
            button.addEventListener('pointerup', release, options);
            button.addEventListener('pointercancel', release, options);
            button.addEventListener('lostpointercapture', release, options);
        }
    }
    clearInput() {
        this.keys.clear();
        this.touchDirection = { x: 0, y: 0 };
    }
    togglePause() {
        this.paused = !this.paused;
        this.clearInput();
    }
    frame(time) {
        if (this.disposed || !this.camp || !this.drawing)
            return;
        const delta = this.previousTime
            ? Math.min(0.04, (time - this.previousTime) / 1000)
            : 0;
        this.previousTime = time;
        if (!this.paused)
            this.camp.update(delta, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')) +
                    this.touchDirection.x,
                y: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup')) +
                    this.touchDirection.y,
            });
        this.drawing.render(this.camp.snapshot, this.overview);
        this.refreshUi();
        this.raf = requestAnimationFrame((next) => this.frame(next));
    }
    refreshUi() {
        if (!this.camp)
            return;
        const state = this.camp.snapshot;
        const status = this.paused
            ? '잠시 쉬는 중이에요. 계속 걷기를 누르면 이어집니다.'
            : state.message;
        if (this.lastStatus !== status) {
            required('#status').textContent = status;
            this.lastStatus = status;
        }
        required('#inspect').textContent = state.nearby
            ? `${state.nearby.label} 살펴보기`
            : '근처 살펴보기';
        required('#inspect').disabled = this.paused;
        required('#overview').textContent = this.overview
            ? '가까이 걷기 · M'
            : '전체 조망 · M';
        required('#overview').setAttribute('aria-pressed', String(this.overview));
        required('#pause').textContent = this.paused ? '계속 걷기' : '잠시 멈춤';
        required('#pause').setAttribute('aria-pressed', String(this.paused));
        required('#pause-overlay').hidden = !this.paused;
        required('#visited').textContent = this.camp.map.landmarks
            .map((landmark) => `${landmark.label} ${state.visited.includes(landmark.id) ? '●' : '○'}`)
            .join(' · ');
    }
    publishDiagnostics() {
        const diagnostics = Object.defineProperties({}, {
            ready: { get: () => this.ready, enumerable: true },
            snapshot: { get: () => this.camp?.snapshot, enumerable: true },
            map: { get: () => this.camp?.map, enumerable: true },
            drawing: { get: () => this.drawing?.diagnostics, enumerable: true },
            paused: { get: () => this.paused, enumerable: true },
            overview: { get: () => this.overview, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
        });
        Object.defineProperty(window, 'herbalistCamp', {
            value: Object.freeze(diagnostics),
            writable: false,
            configurable: false,
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.events.abort();
        this.observer.disconnect();
        this.clearInput();
        this.drawing?.dispose();
    }
}
new CampScreen();
