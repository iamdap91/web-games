import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { WindowVillageDrawing } from './drawing.js';
import { buildings, fixtures, WindowVillage, } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
/** 화면은 이벤트와 루프의 수명을 소유하고 입력을 보행 객체에 전달한다. */
class WindowVillageScreen {
    village = new WindowVillage();
    canvas = required('#scene');
    drawing = new WindowVillageDrawing(this.canvas);
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
        for (const b of buildings)
            click(`#${b.id}`, () => this.village.approach(b.id));
        click('#fixture', () => {
            const fixture = fixtures.find((f) => f.room === this.village.snapshot.inside);
            if (fixture)
                this.village.walkTo(fixture);
        });
        click('#exit', () => this.village.exit());
        click('#interact', () => this.village.interact());
        click('#light', () => this.drawing.changeLight());
        click('#overview', () => {
            this.overview = !this.overview;
        }, true);
        click('#reset', () => this.village.returnToEntrance());
        click('#pause', () => this.togglePause(), true);
        click('#png', () => {
            const anchor = document.createElement('a');
            anchor.download = '창빛-이어지는-마을.png';
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
            const vertical = Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                Number(this.keys.has('w') || this.keys.has('arrowup'));
            this.village.update(delta, { x: horizontal, z: vertical });
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
            ? '시설 이용 · Space'
            : '문 열기 · Space';
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 거리';
    }
    publishDiagnostics() {
        Object.defineProperty(window, 'villageStyleWindowVillage', {
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
                        transition: this.village.snapshot.transition,
                    }),
                },
                screenPositions: {
                    get: () => [
                        ...buildings.map((b) => ({
                            ...b,
                            z: b.z + 0.8,
                            type: 'door',
                        })),
                        ...fixtures.map((f) => ({ ...f, type: 'fixture' })),
                    ].map((f) => ({
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
new WindowVillageScreen();
