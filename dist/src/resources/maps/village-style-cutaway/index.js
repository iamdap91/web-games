import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { CutawayDrawing } from './drawing.js';
import { CutawayVillage, cutawayFacilities, cutawayEdges, cutawayNodes, } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
class CutawayScreen {
    village = new CutawayVillage();
    canvas = required('canvas');
    drawing = new CutawayDrawing(this.canvas);
    events = new AbortController();
    resize;
    keys = new Set();
    previous = 0;
    raf = 0;
    ready = false;
    paused = false;
    overview = true;
    disposed = false;
    facade = false;
    constructor() {
        this.resize = new ResizeObserver(() => this.drawing.resize());
        this.resize.observe(this.canvas);
        this.drawing.resize();
        this.overview = this.canvas.getBoundingClientRect().width >= 600;
        const options = { signal: this.events.signal };
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (!this.paused)
                this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
        }, options);
        this.canvas.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if ([
                'w',
                'a',
                's',
                'd',
                'arrowup',
                'arrowdown',
                'arrowleft',
                'arrowright',
                ' ',
            ].includes(key))
                event.preventDefault();
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === ' ' && !this.paused)
                this.village.interact();
            if (key === 'r' && !this.paused)
                this.village.toggleRestored();
            if (key === 'm' && !this.paused)
                this.overview = !this.overview;
            if (key === 'escape')
                this.togglePause();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.keys.clear(), options);
        const bind = (id, action) => required(id).addEventListener('click', action, options);
        bind('#restore', () => {
            if (!this.paused)
                this.village.toggleRestored();
        });
        bind('#reset', () => {
            if (!this.paused)
                this.village.reset();
        });
        bind('#interact', () => {
            if (!this.paused)
                this.village.interact();
        });
        bind('#overview', () => {
            if (!this.paused)
                this.overview = !this.overview;
        });
        bind('#facade', () => {
            if (!this.paused)
                this.facade = !this.facade;
        });
        bind('#pause', () => this.togglePause());
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        Object.defineProperty(window, 'villageStyleCutaway', {
            value: Object.freeze(Object.defineProperties({}, {
                ready: { get: () => this.ready, enumerable: true },
                snapshot: { get: () => this.village.snapshot, enumerable: true },
                paused: { get: () => this.paused, enumerable: true },
                overview: { get: () => this.overview, enumerable: true },
                disposed: { get: () => this.disposed, enumerable: true },
                diagnostics: {
                    get: () => ({
                        pipeline: 'Canvas2D layered cutaway',
                        facade: this.facade,
                        floorHeight: 4,
                        floorCount: 3,
                        corridors: cutawayEdges.length,
                        stairs: cutawayEdges.filter(([a, b]) => cutawayNodes[a]?.z !== cutawayNodes[b]?.z).length,
                        position: this.village.snapshot.position,
                        floor: this.village.snapshot.floor,
                        nearby: this.village.snapshot.nearby,
                    }),
                    enumerable: true,
                },
                screenPositions: {
                    get: () => cutawayFacilities.map((facility) => ({
                        ...facility,
                        approach: { x: facility.x, z: facility.z },
                        screen: this.drawing.project(facility),
                    })),
                    enumerable: true,
                },
                project: {
                    value: (point) => this.drawing.project(point),
                    enumerable: true,
                },
            })),
            writable: false,
            configurable: false,
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
                error instanceof Error ? error.message : '그림 로딩 실패';
        });
    }
    togglePause() {
        this.paused = !this.paused;
        this.keys.clear();
    }
    frame(time) {
        if (this.disposed)
            return;
        const delta = this.previous
            ? Math.min(0.04, (time - this.previous) / 1000)
            : 0;
        this.previous = time;
        if (!this.paused)
            this.village.update(delta, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')),
                z: Number(this.keys.has('w') || this.keys.has('arrowup')) -
                    Number(this.keys.has('s') || this.keys.has('arrowdown')),
            });
        this.drawing.render(this.village.snapshot, {
            overview: this.overview,
            facade: this.facade,
        });
        this.refresh();
        this.raf = requestAnimationFrame((next) => this.frame(next));
    }
    refresh() {
        const state = this.village.snapshot;
        required('#status').textContent = state.message;
        const button = required('#interact');
        button.disabled = !state.nearby || this.paused;
        const names = {
            hearth: '화덕에 장작 넣기',
            dojo: state.restored ? '복구 전 도장 보기' : '도장 복구하기',
            refuge: '다락 차 마시기',
        };
        button.textContent = state.nearby
            ? `${names[state.nearby]} · Space`
            : '같은 층의 시설에 다가가세요';
        required('#restore').textContent = state.restored
            ? '복구 전 보기 · R'
            : '도장 복구 · R';
        required('#overview').textContent = this.overview
            ? '가까이 걷기 · M'
            : '전체 조망 · M';
        required('#facade').textContent = this.facade ? '단면 열기' : '외벽 비교';
        required('#facade').setAttribute('aria-pressed', String(this.facade));
        required('#restore').setAttribute('aria-pressed', String(state.restored));
        required('#overview').setAttribute('aria-pressed', String(this.overview));
        required('#pause').textContent = this.paused ? '계속 걷기' : '멈춤 · Esc';
        required('#pause').setAttribute('aria-pressed', String(this.paused));
        required('#paused').hidden = !this.paused;
        required('#visited').textContent =
            `화덕 ${state.visited.includes('hearth') ? '●' : '○'} · 도장 ${state.visited.includes('dojo') ? '●' : '○'} · 다락 ${state.visited.includes('refuge') ? '●' : '○'}`;
        required('#floor').textContent = state.onStairs
            ? '계단을 오르는 중'
            : `${state.floor + 1}층 복도`;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.events.abort();
        this.resize.disconnect();
        this.keys.clear();
        this.drawing.dispose();
    }
}
new CutawayScreen();
