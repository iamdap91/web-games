import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { LineDrawing } from './drawing.js';
import { LineVillage, linePlaces } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`마을 화면 요소가 없습니다: ${selector}`);
    return element;
}
/** DOM 입력과 그리기 수명만 연결하며, 게임 규칙은 LineVillage에 둔다. */
class LineScreen {
    village = new LineVillage();
    canvas = required('#scene');
    drawing = new LineDrawing(this.canvas);
    events = new AbortController();
    resizeObserver;
    keys = new Set();
    touchDirection = { x: 0, z: 0 };
    ready = false;
    paused = false;
    overview = true;
    disposed = false;
    raf = 0;
    previousTime = 0;
    lastStatus = '';
    constructor() {
        this.resizeObserver = new ResizeObserver(() => this.drawing.resize());
        this.resizeObserver.observe(this.canvas);
        this.drawing.resize();
        this.overview = this.canvas.getBoundingClientRect().width > 600;
        this.bind();
        this.publish();
        this.refresh();
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
                error instanceof Error ? error.message : '마을을 읽지 못했어요.';
        });
    }
    bind() {
        const options = { signal: this.events.signal };
        window.addEventListener('keydown', (event) => {
            if (document.activeElement !== this.canvas)
                return;
            const key = event.key.toLowerCase();
            if ([
                'w',
                'a',
                's',
                'd',
                'arrowup',
                'arrowleft',
                'arrowdown',
                'arrowright',
                ' ',
            ].includes(key))
                event.preventDefault();
            if (key === 'escape' && !event.repeat) {
                this.togglePause();
                this.refresh();
                return;
            }
            if (this.paused)
                return;
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === ' ')
                this.village.interact();
            if (key === 'r')
                this.village.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
            this.refresh();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        const release = () => {
            this.keys.clear();
            this.touchDirection = { x: 0, z: 0 };
        };
        window.addEventListener('blur', release, options);
        this.canvas.addEventListener('blur', release, options);
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (!this.paused)
                this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
            this.refresh();
        }, options);
        for (const [id, action] of [
            ['#restore', () => this.village.toggleRestored()],
            [
                '#overview',
                () => {
                    this.overview = !this.overview;
                },
            ],
            ['#reset', () => this.village.reset()],
            ['#interact', () => this.village.interact()],
        ])
            required(id).addEventListener('click', () => {
                if (!this.paused)
                    action();
                this.refresh();
            }, options);
        required('#pause').addEventListener('click', () => {
            this.togglePause();
            this.refresh();
        }, options);
        for (const button of document.querySelectorAll('[data-direction]')) {
            const direction = button.dataset.direction;
            const vector = direction === 'up'
                ? { x: 0, z: -1 }
                : direction === 'down'
                    ? { x: 0, z: 1 }
                    : direction === 'left'
                        ? { x: -1, z: 0 }
                        : { x: 1, z: 0 };
            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                if (this.paused)
                    return;
                button.setPointerCapture(event.pointerId);
                this.touchDirection = vector;
            }, options);
            const stop = () => {
                this.touchDirection = { x: 0, z: 0 };
            };
            button.addEventListener('pointerup', stop, options);
            button.addEventListener('pointercancel', stop, options);
            button.addEventListener('lostpointercapture', stop, options);
        }
    }
    togglePause() {
        this.paused = !this.paused;
        this.keys.clear();
        this.touchDirection = { x: 0, z: 0 };
    }
    frame(time) {
        if (this.disposed)
            return;
        const delta = this.previousTime
            ? Math.min(0.04, (time - this.previousTime) / 1000)
            : 0;
        this.previousTime = time;
        if (!this.paused)
            this.village.update(delta, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')) +
                    this.touchDirection.x,
                z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup')) +
                    this.touchDirection.z,
            });
        this.drawing.render(this.village.snapshot, this.overview);
        this.refresh();
        this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    refresh() {
        const state = this.village.snapshot, status = this.paused
            ? '잠깐 쉬어가요. 모든 움직임과 불빛이 멈춰있어요.'
            : state.message;
        if (status !== this.lastStatus) {
            required('#status').textContent = status;
            this.lastStatus = status;
        }
        required('#restore').textContent = state.restored
            ? '선화로 보기'
            : '색 돌려주기';
        required('#restore').setAttribute('aria-pressed', String(state.restored));
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 조망';
        required('#overview').setAttribute('aria-pressed', String(this.overview));
        required('#pause').textContent = this.paused ? '계속 걷기' : '잠시 멈춤';
        required('#pause').setAttribute('aria-pressed', String(this.paused));
        required('#interact').textContent =
            state.nearby === 'hearth'
                ? '장작 넣기'
                : state.nearby === 'dojo'
                    ? state.restored
                        ? '선화로 보기'
                        : '도장 고치기'
                    : state.nearby === 'refuge'
                        ? '정원 살펴보기'
                        : '근처 살펴보기';
        required('#visited').textContent =
            `화덕 ${state.visited.includes('hearth') ? '●' : '○'} · 도장 ${state.visited.includes('dojo') ? '●' : '○'} · 정원 ${state.visited.includes('refuge') ? '●' : '○'}`;
        for (const button of document.querySelectorAll('button:not(#pause)'))
            button.disabled = this.paused;
        required('#pause-overlay').hidden = !this.paused;
    }
    publish() {
        const diagnostics = Object.defineProperties({}, {
            ready: { get: () => this.ready, enumerable: true },
            snapshot: { get: () => this.village.snapshot, enumerable: true },
            paused: { get: () => this.paused, enumerable: true },
            overview: { get: () => this.overview, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
            diagnostics: { get: () => this.drawing.diagnostics, enumerable: true },
            screenPositions: {
                get: () => Object.fromEntries(Object.entries(linePlaces).map(([name, point]) => [
                    name,
                    { world: { ...point }, screen: this.drawing.project(point) },
                ])),
                enumerable: true,
            },
            project: {
                value: (point) => this.drawing.project(point),
                enumerable: true,
            },
        });
        Object.defineProperty(window, 'villageStyleLine', {
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
        this.resizeObserver.disconnect();
        this.keys.clear();
        this.touchDirection = { x: 0, z: 0 };
        this.drawing.dispose();
    }
}
new LineScreen();
