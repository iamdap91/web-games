import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { SideDrawing } from './drawing.js';
import { facilities, SideVillage } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
/** 화면은 입력과 수명만 연결한다. 이동·발견·시설 반응은 마을 객체가 소유한다. */
class SideVillageScreen {
    village = new SideVillage();
    canvas = required('#scene');
    drawing = new SideDrawing(this.canvas);
    events = new AbortController();
    resizeObserver;
    keys = new Set();
    raf = 0;
    previousTime = 0;
    ready = false;
    paused = false;
    overview = false;
    disposed = false;
    lastStatus = '';
    constructor() {
        this.resizeObserver = new ResizeObserver(() => this.drawing.resize());
        this.resizeObserver.observe(this.canvas);
        this.drawing.resize();
        this.bindEvents();
        this.publishDiagnostics();
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
            this.raf = requestAnimationFrame((time) => this.frame(time));
        })
            .catch((error) => {
            required('#status').textContent =
                error instanceof Error ? error.message : '리소스 로딩 실패';
        });
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        window.addEventListener('keydown', (event) => {
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
                this.village.changeLane(-1);
            if (key === 's' || key === 'arrowdown')
                this.village.changeLane(1);
            if (key === ' ')
                this.village.interact();
            if (key === 'r')
                this.village.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.keys.clear(), options);
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (!this.paused)
                this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
        }, options);
        const click = (selector, action) => required(selector).addEventListener('click', () => {
            if (!this.paused)
                action();
        }, options);
        click('#restore', () => this.village.toggleRestored());
        click('#interact', () => this.village.interact());
        click('#overview', () => {
            this.overview = !this.overview;
        });
        click('#reset', () => this.village.reset());
        required('#pause').addEventListener('click', () => this.togglePause(), options);
    }
    togglePause() {
        this.paused = !this.paused;
        this.keys.clear();
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
        }
        this.drawing.render(this.village.snapshot, this.overview);
        this.refreshUi();
        this.raf = requestAnimationFrame((next) => this.frame(next));
    }
    refreshUi() {
        const snapshot = this.village.snapshot;
        const status = `${snapshot.lane} · ${snapshot.nearbyName ? `${snapshot.nearbyName} — Space · ` : ''}${snapshot.message}`;
        if (status !== this.lastStatus) {
            required('#status').textContent = status;
            this.lastStatus = status;
        }
        required('#visited').textContent =
            `시설 ${snapshot.visited.length}/3 · 지붕 ${snapshot.rooftopFound ? '✓' : '○'}`;
        required('#restore').textContent = snapshot.restored
            ? '복구 전 보기'
            : '도장 복구';
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 거리';
    }
    publishDiagnostics() {
        const diagnostics = Object.freeze(Object.defineProperties({}, {
            ready: { get: () => this.ready },
            snapshot: { get: () => this.village.snapshot },
            paused: { get: () => this.paused },
            overview: { get: () => this.overview },
            disposed: { get: () => this.disposed },
            cameraX: { get: () => this.drawing.diagnostics.cameraX },
            layers: { get: () => this.drawing.diagnostics.layers },
            screenPositions: {
                get: () => facilities.map((facility) => ({
                    ...facility,
                    ...this.drawing.project(facility),
                    world: { x: facility.x, z: facility.z },
                })),
            },
            project: {
                value: (point) => this.drawing.project(point),
            },
        }));
        Object.defineProperty(window, 'villageStyleSide', {
            value: diagnostics,
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
        this.drawing.dispose();
    }
}
new SideVillageScreen();
