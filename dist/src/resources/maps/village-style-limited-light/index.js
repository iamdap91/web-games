import { embeddedScene } from '../../catalog/embedded-scene.js';
import { LimitedDrawing } from './drawing.js';
import { LimitedVillage, places } from './village.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
class LimitedVillageScreen {
    village = new LimitedVillage();
    canvas = required('#scene');
    drawing = new LimitedDrawing(this.canvas);
    events = new AbortController();
    resize;
    keys = new Set();
    touch = { x: 0, z: 0 };
    raf = 0;
    previous = 0;
    ready = false;
    paused = false;
    overview = true;
    disposed = false;
    lastStatus = '';
    constructor() {
        if (embeddedScene)
            document.documentElement.classList.add('embedded-scene');
        this.overview = this.canvas.getBoundingClientRect().width >= 600;
        this.resize = new ResizeObserver(() => {
            if (this.disposed)
                return;
            this.drawing.resize();
            if (this.ready)
                this.drawing.render(this.village.snapshot, this.overview);
        });
        this.resize.observe(this.canvas);
        this.drawing.resize();
        this.bind();
        this.publish();
        this.refresh();
        this.drawing.ready
            .then(() => {
            if (this.disposed)
                return;
            this.ready = true;
            this.drawing.render(this.village.snapshot, this.overview);
            this.raf = requestAnimationFrame((t) => this.frame(t));
        })
            .catch((error) => {
            if (!this.disposed)
                required('#status').textContent =
                    error instanceof Error
                        ? error.message
                        : '아타호를 불러오지 못했어요.';
        });
    }
    bind() {
        const options = { signal: this.events.signal };
        const clear = () => {
            this.keys.clear();
            this.touch = { x: 0, z: 0 };
        };
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement)
                return;
            if (key === 'escape' && !event.repeat) {
                this.togglePause();
                return;
            }
            if (this.paused)
                return;
            if (key === ' ' && event.target instanceof HTMLButtonElement)
                return;
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
            ].includes(key)) {
                event.preventDefault();
                this.keys.add(key);
            }
            if (event.repeat)
                return;
            if (key === ' ')
                this.village.interact();
            if (key === 'r')
                this.village.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'l')
                this.village.shiftLamp();
            if (key === 'n')
                this.village.toggleLighting();
            this.refresh();
        }, options);
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), options);
        window.addEventListener('blur', clear, options);
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus({ preventScroll: true });
            this.village.walkTo(this.drawing.pointerToWorld(event.clientX, event.clientY));
        }, options);
        const click = (selector, action) => {
            required(selector).addEventListener('click', () => {
                if (this.disposed)
                    return;
                if (selector !== '#pause' && this.paused)
                    return;
                action();
                this.refresh();
            }, options);
        };
        click('#lamp', () => this.village.shiftLamp());
        click('#lighting', () => this.village.toggleLighting());
        click('#restore', () => this.village.toggleRestored());
        click('#overview', () => {
            this.overview = !this.overview;
        });
        click('#pause', () => this.togglePause());
        click('#reset', () => {
            this.village.reset();
            clear();
        });
        click('#interact', () => this.village.interact());
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
                if (this.paused)
                    return;
                event.preventDefault();
                button.setPointerCapture(event.pointerId);
                this.touch = vector;
            }, options);
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
                button.addEventListener(type, () => {
                    this.touch = { x: 0, z: 0 };
                }, options);
        }
        window.addEventListener('resource-scene-dispose', () => this.dispose(), options);
        window.addEventListener('pagehide', () => this.dispose(), {
            ...options,
            once: true,
        });
    }
    togglePause() {
        this.paused = !this.paused;
        this.keys.clear();
        this.touch = { x: 0, z: 0 };
        this.refresh();
    }
    frame(time) {
        if (this.disposed)
            return;
        const delta = this.previous
            ? Math.min(0.04, (time - this.previous) / 1000)
            : 0;
        this.previous = time;
        if (!this.paused) {
            this.village.update(delta, {
                x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')) +
                    this.touch.x,
                z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup')) +
                    this.touch.z,
            });
            this.drawing.render(this.village.snapshot, this.overview);
            this.refresh();
        }
        this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    refresh() {
        const state = this.village.snapshot;
        const status = this.paused
            ? '잠시 멈춤. 시간과 장작불도 함께 쉽니다.'
            : state.message;
        if (this.lastStatus !== status) {
            required('#status').textContent = status;
            this.lastStatus = status;
        }
        const interact = required('#interact');
        interact.textContent =
            state.nearby === 'hearth'
                ? '장작 넣기 · Space'
                : state.nearby === 'dojo'
                    ? state.restored
                        ? '복구 전 보기 · Space'
                        : '도장 고치기 · Space'
                    : state.nearby === 'refuge'
                        ? '차 한 잔 쉬기 · Space'
                        : '시설 앞에서 사용 · Space';
        interact.disabled = this.paused || !state.nearby;
        required('#lamp').textContent =
            state.lampSide === 'left' ? '등불 동쪽으로 · L' : '등불 서쪽으로 · L';
        required('#lighting').textContent = state.lighting
            ? '조명 끄기 · N'
            : '조명 켜기 · N';
        required('#lighting').setAttribute('aria-pressed', String(state.lighting));
        required('#restore').textContent = state.restored
            ? '복구 전 · R'
            : '도장 복구 · R';
        required('#overview').textContent = this.overview
            ? '가까이 걷기 · M'
            : '전체 조망 · M';
        required('#pause').textContent = this.paused
            ? '계속 걷기 · Esc'
            : '잠시 멈춤 · Esc';
        for (const selector of [
            '#restore',
            '#overview',
            '#reset',
            '#lamp',
            '#lighting',
        ])
            required(selector).disabled = this.paused;
        required('#restore').setAttribute('aria-pressed', String(state.restored));
        required('#overview').setAttribute('aria-pressed', String(this.overview));
        required('#pause').setAttribute('aria-pressed', String(this.paused));
        required('#visited').textContent =
            `화덕 ${state.visited.includes('hearth') ? '●' : '○'} / 도장 ${state.visited.includes('dojo') ? '●' : '○'} / 쉼터 ${state.visited.includes('refuge') ? '●' : '○'}`;
        required('#paused').hidden = !this.paused;
    }
    publish() {
        const api = Object.defineProperties({}, {
            ready: { get: () => this.ready, enumerable: true },
            snapshot: { get: () => this.village.snapshot, enumerable: true },
            paused: { get: () => this.paused, enumerable: true },
            overview: { get: () => this.overview, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
            diagnostics: { get: () => this.drawing.diagnostics, enumerable: true },
            project: {
                value: (point) => this.drawing.project(point),
                enumerable: true,
            },
            screenPositions: {
                get: () => Object.fromEntries(places.map((p) => [
                    p.id,
                    {
                        ...this.drawing.project(p.approach),
                        world: { ...p.approach },
                    },
                ])),
                enumerable: true,
            },
        });
        Object.defineProperty(window, 'villageStyleLimitedLight', {
            value: Object.freeze(api),
            writable: false,
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
        this.resize.disconnect();
        this.keys.clear();
        this.touch = { x: 0, z: 0 };
        this.drawing.dispose();
    }
}
new LimitedVillageScreen();
