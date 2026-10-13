import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { LitDrawing } from './drawing.js';
import { LitVisit, places } from './visit.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소 없음: ${selector}`);
    return element;
}
class LitVillageScreen {
    canvas = required('#scene');
    drawing = new LitDrawing(this.canvas);
    visit = new LitVisit();
    events = new AbortController();
    observer;
    keys = new Set();
    ready = false;
    paused = false;
    overview = true;
    disposed = false;
    raf = 0;
    previousTime = 0;
    constructor() {
        this.observer = new ResizeObserver(() => this.drawing.resize());
        this.observer.observe(this.canvas);
        this.drawing.resize();
        this.bindEvents();
        this.publish();
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        this.drawing.ready
            .then(() => {
            if (this.disposed)
                return;
            this.ready = true;
            this.raf = requestAnimationFrame((t) => this.frame(t));
        })
            .catch((error) => {
            required('#status').textContent =
                error instanceof Error
                    ? error.message
                    : '리소스를 불러오지 못했어요.';
        });
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        const controlKeys = [
            'w',
            'a',
            's',
            'd',
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            ' ',
        ];
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (controlKeys.includes(key))
                event.preventDefault();
            if (this.paused) {
                if (key === 'escape' && !event.repeat)
                    this.togglePause();
                return;
            }
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === ' ')
                this.visit.interact();
            if (key === 'r')
                this.visit.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'escape')
                this.togglePause();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.keys.clear(), options);
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (!this.paused)
                this.visit.navigate(this.drawing.pointer(event.clientX, event.clientY));
        }, options);
        const button = (id, action) => {
            required(id).addEventListener('click', () => {
                if (!this.paused)
                    action();
            }, options);
        };
        button('#restore', () => this.visit.toggleRestored());
        button('#overview', () => {
            this.overview = !this.overview;
        });
        button('#reset', () => this.visit.reset());
        button('#interact', () => this.visit.interact());
        button('#normal', () => this.visit.toggleNormal());
        button('#light', () => this.visit.changeLight());
        button('#light-motion', () => this.visit.toggleLightMovement());
        required('#pause').addEventListener('click', () => this.togglePause(), options);
    }
    togglePause() {
        this.paused = !this.paused;
        this.keys.clear();
    }
    frame(time) {
        if (this.disposed)
            return;
        const dt = this.previousTime
            ? Math.min(0.04, (time - this.previousTime) / 1000)
            : 0;
        this.previousTime = time;
        if (!this.paused)
            this.visit.update(dt, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')),
                z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup')),
            });
        this.drawing.render(this.visit.snapshot, this.overview);
        this.refresh();
        this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    refresh() {
        const state = this.visit.snapshot;
        required('#status').textContent = this.paused
            ? '시간과 보행, 등불을 잠시 멈췄어요.'
            : state.message;
        required('#restore').textContent = state.restored
            ? '복구 전 보기'
            : '도장 복구';
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 조망';
        required('#pause').textContent = this.paused ? '계속 걷기' : '잠시 멈춤';
        required('#normal').textContent = state.normalEnabled
            ? '요철 조명 켜짐'
            : '평평한 조명';
        required('#light').textContent =
            `등불 위치: ${['중앙', '왼쪽', '오른쪽'][state.lightPosition]}`;
        required('#light-motion').textContent = state.lightMoving
            ? '등불 움직임 켜짐'
            : '등불 움직임 꺼짐';
        required('#interact').textContent =
            state.nearby === 'hearth'
                ? '장작 넣기 · Space'
                : state.nearby === 'dojo'
                    ? '도장 살펴보기 · Space'
                    : state.nearby === 'rest'
                        ? '쉼터 살펴보기 · Space'
                        : '근처 살펴보기 · Space';
        required('#visited').textContent =
            `화덕 ${state.visited.includes('hearth') ? '●' : '○'} · 도장 ${state.visited.includes('dojo') ? '●' : '○'} · 쉼터 ${state.visited.includes('rest') ? '●' : '○'}`;
        for (const [id, value] of [
            ['#restore', state.restored],
            ['#overview', this.overview],
            ['#pause', this.paused],
            ['#normal', state.normalEnabled],
            ['#light-motion', state.lightMoving],
        ])
            required(id).setAttribute('aria-pressed', String(value));
        required('#pause-overlay').hidden = !this.paused;
    }
    publish() {
        const api = Object.defineProperties({ project: (point) => this.drawing.project(point) }, {
            ready: { get: () => this.ready, enumerable: true },
            snapshot: { get: () => this.visit.snapshot, enumerable: true },
            paused: { get: () => this.paused, enumerable: true },
            overview: { get: () => this.overview, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
            diagnostics: {
                get: () => ({
                    ...this.drawing.diagnostics,
                    normalEnabled: this.visit.snapshot.normalEnabled,
                }),
                enumerable: true,
            },
            screenPositions: {
                get: () => places.map((place) => ({
                    ...place,
                    ...this.drawing.project(place),
                    world: { x: place.x, z: place.z },
                })),
                enumerable: true,
            },
        });
        Object.defineProperty(window, 'villageStyleLit2d', {
            value: Object.freeze(api),
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
        this.keys.clear();
        this.drawing.dispose();
    }
}
new LitVillageScreen();
