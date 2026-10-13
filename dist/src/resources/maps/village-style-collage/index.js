import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { CollageVillageDrawing, screenPositions } from './drawing.js';
import { CollageVillage } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
/** 화면은 입력과 그림의 수명만 소유하며 보행 판정은 마을 객체에 맡긴다. */
class CollageVillageScreen {
    village = new CollageVillage();
    canvas = required('#scene');
    drawing = new CollageVillageDrawing(this.canvas);
    events = new AbortController();
    resizeObserver;
    keys = new Set();
    touchDirection = { x: 0, z: 0 };
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
        this.overview = this.canvas.getBoundingClientRect().width >= 600;
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
                error instanceof Error
                    ? error.message
                    : '아타호를 불러오지 못했어요.';
        });
        this.refreshUi();
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        const moveKeys = [
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            'w',
            'a',
            's',
            'd',
        ];
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if ([...moveKeys, ' '].includes(key))
                event.preventDefault();
            if (this.paused) {
                if (!event.repeat && key === 'escape')
                    this.togglePause();
                return;
            }
            this.keys.add(key);
            if (event.repeat)
                return;
            if (key === ' ')
                this.village.interact();
            if (key === 'r')
                this.village.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'escape')
                this.togglePause();
            this.refreshUi();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', () => this.clearInput(), options);
        this.canvas.addEventListener('pointerdown', (event) => {
            this.canvas.focus({ preventScroll: true });
            if (this.paused)
                return;
            this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
            this.refreshUi();
        }, options);
        const click = (id, action) => {
            required(id).addEventListener('click', () => {
                if (this.paused && id !== '#pause')
                    return;
                action();
                this.refreshUi();
            }, options);
        };
        click('#interact', () => this.village.interact());
        click('#restore', () => this.village.toggleRestored());
        click('#overview', () => {
            this.overview = !this.overview;
        });
        click('#pause', () => this.togglePause());
        click('#reset', () => this.village.reset());
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
            const release = () => {
                this.touchDirection = { x: 0, z: 0 };
            };
            button.addEventListener('pointerup', release, options);
            button.addEventListener('pointercancel', release, options);
            button.addEventListener('lostpointercapture', release, options);
        }
    }
    clearInput() {
        this.keys.clear();
        this.touchDirection = { x: 0, z: 0 };
    }
    togglePause() {
        this.paused = !this.paused;
        this.clearInput();
    }
    frame(time) {
        if (this.disposed)
            return;
        const delta = this.previousTime
            ? Math.min(0.04, (time - this.previousTime) / 1000)
            : 0;
        this.previousTime = time;
        if (!this.paused) {
            this.village.update(delta, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')) +
                    this.touchDirection.x,
                z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup')) +
                    this.touchDirection.z,
            });
        }
        this.drawing.render(this.village.snapshot, this.overview);
        this.refreshUi();
        this.raf = requestAnimationFrame((next) => this.frame(next));
    }
    refreshUi() {
        const state = this.village.snapshot;
        const status = this.paused
            ? '잠시 멈췄어요. 계속 걷기를 누르면 이어집니다.'
            : state.message;
        if (status !== this.lastStatus) {
            required('#status').textContent = status;
            this.lastStatus = status;
        }
        const nearby = {
            hearth: '화덕에 불 지피기',
            dojo: state.restored ? '복구 전 보기' : '도장 고치기',
            refuge: '쉼터 살펴보기',
        };
        required('#interact').textContent = state.nearby
            ? nearby[state.nearby]
            : '근처 살펴보기';
        required('#restore').textContent = state.restored ? '복구 전' : '도장 복구';
        required('#overview').textContent = this.overview
            ? '가까이 걷기'
            : '전체 조망';
        required('#pause').textContent = this.paused ? '계속 걷기' : '잠시 멈춤';
        required('#pause').setAttribute('aria-pressed', String(this.paused));
        required('#restore').setAttribute('aria-pressed', String(state.restored));
        required('#overview').setAttribute('aria-pressed', String(this.overview));
        required('#visited').textContent =
            `화덕 ${state.visited.includes('hearth') ? '●' : '○'} · 도장 ${state.visited.includes('dojo') ? '●' : '○'} · 쉼터 ${state.discovered ? '●' : '○'}`;
        required('#pause-overlay').hidden = !this.paused;
    }
    publishDiagnostics() {
        const diagnostics = Object.defineProperties({}, {
            ready: { get: () => this.ready, enumerable: true },
            snapshot: { get: () => this.village.snapshot, enumerable: true },
            paused: { get: () => this.paused, enumerable: true },
            overview: { get: () => this.overview, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
            project: {
                value: (point) => this.drawing.project(point),
                enumerable: true,
            },
            screenPositions: { value: screenPositions, enumerable: true },
        });
        Object.defineProperty(window, 'villageStyleCollage', {
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
        this.clearInput();
        this.drawing.dispose();
    }
}
new CollageVillageScreen();
