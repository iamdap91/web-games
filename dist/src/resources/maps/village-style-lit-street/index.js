import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { LitStreetDrawing } from './drawing.js';
import { facilities, LitStreet } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
/** 화면은 이벤트와 루프의 수명을 소유하고 입력을 보행 객체에 전달한다. */
class LitStreetScreen {
    village = new LitStreet();
    canvas = required('#scene');
    drawing = new LitStreetDrawing(this.canvas);
    events = new AbortController();
    resizeObserver;
    keys = new Set();
    raf = 0;
    previousTime = 0;
    ready = false;
    paused = false;
    overview = false;
    disposed = false;
    constructor() {
        this.resizeObserver = new ResizeObserver(() => {
            if (this.disposed)
                return;
            this.drawing.resize();
            if (this.ready)
                this.render();
        });
        this.resizeObserver.observe(this.canvas);
        this.drawing.resize();
        this.bindEvents();
        this.publishDiagnostics();
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        this.drawing.ready
            .then(() => {
            if (this.disposed)
                return;
            this.ready = true;
            this.render();
            this.raf = requestAnimationFrame((time) => this.frame(time));
        })
            .catch((error) => {
            if (!this.disposed)
                required('#status').textContent =
                    error instanceof Error ? error.message : '리소스 로딩 실패';
        });
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        window.addEventListener('keydown', (event) => {
            if (document.activeElement !== this.canvas || !this.ready)
                return;
            const key = event.key.toLowerCase();
            if ([
                'arrowleft',
                'arrowright',
                'arrowup',
                'arrowdown',
                'w',
                'a',
                's',
                'd',
                ' ',
            ].includes(key))
                event.preventDefault();
            if (key === 'escape' && !event.repeat) {
                this.togglePause();
                return;
            }
            if (this.paused)
                return;
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === 'w' || key === 'arrowup')
                this.village.changeFloor(1);
            if (key === 's' || key === 'arrowdown')
                this.village.changeFloor(-1);
            if (key === ' ')
                this.village.interact();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.keys.clear(), options);
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (!this.paused && this.ready)
                this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
        }, options);
        const click = (selector, action, allowedWhenPaused = false) => {
            required(selector).addEventListener('click', () => {
                if (this.disposed ||
                    !this.ready ||
                    (this.paused && !allowedWhenPaused))
                    return;
                action();
                this.render();
                this.canvas.focus({ preventScroll: true });
            }, options);
        };
        for (const f of facilities)
            click(`#${f.id}`, () => this.village.walkTo(f));
        click('#interact', () => this.village.interact());
        click('#light', () => this.drawing.changeLight());
        click('#overview', () => {
            this.overview = !this.overview;
        }, true);
        click('#reset', () => this.village.returnToEntrance());
        click('#pause', () => this.togglePause(), true);
        click('#png', () => {
            const anchor = document.createElement('a');
            anchor.download = '등불-아래-거리.png';
            anchor.href = this.canvas.toDataURL('image/png');
            anchor.click();
        }, true);
    }
    togglePause() {
        if (this.disposed)
            return;
        this.paused = !this.paused;
        this.keys.clear();
        this.previousTime = 0;
        required('#pause').textContent = this.paused ? '계속 걷기' : '잠시 멈춤';
        required('#pause-overlay').hidden = !this.paused;
    }
    frame(time) {
        if (this.disposed)
            return;
        const delta = this.previousTime
            ? Math.min(0.04, (time - this.previousTime) / 1000)
            : 0;
        this.previousTime = time;
        if (!this.paused) {
            const horizontal = Number(this.keys.has('d') || this.keys.has('arrowright')) -
                Number(this.keys.has('a') || this.keys.has('arrowleft'));
            this.village.update(delta, horizontal);
            this.render();
        }
        this.raf = requestAnimationFrame((next) => this.frame(next));
    }
    render() {
        this.drawing.render(this.village.snapshot, this.overview);
        const state = this.village.snapshot;
        required('#status').textContent = state.message;
        required('#visited').textContent =
            `공방 ${state.worked ? '✓' : '○'} · 수리 ${state.repaired ? '✓' : '○'} · 수련 ${state.trained ? '✓' : '○'} · 차 ${state.tea ? '✓' : '○'}`;
        required('#interact').textContent = state.inside
            ? '함께하기 · Space'
            : '들어가기 · Space';
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 거리';
    }
    publishDiagnostics() {
        Object.defineProperty(window, 'villageStyleLitStreet', {
            value: Object.freeze(Object.defineProperties({}, {
                ready: { get: () => this.ready },
                snapshot: { get: () => this.village.snapshot },
                paused: { get: () => this.paused },
                overview: { get: () => this.overview },
                disposed: { get: () => this.disposed },
                diagnostics: {
                    get: () => ({
                        ...this.drawing.diagnostics,
                        inside: this.village.snapshot.inside,
                        floor: this.village.snapshot.position.z,
                    }),
                },
                screenPositions: {
                    get: () => facilities.map((f) => ({
                        ...f,
                        ...this.drawing.project(f),
                        world: { x: f.x, z: f.z },
                    })),
                },
                project: {
                    value: (point) => this.drawing.project(point),
                },
            })),
            configurable: false,
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        cancelAnimationFrame(this.raf);
        this.events.abort();
        this.resizeObserver.disconnect();
        this.keys.clear();
        this.drawing.dispose();
    }
}
new LitStreetScreen();
