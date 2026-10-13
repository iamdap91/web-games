import { embeddedScene, registerEmbeddedScene, } from '../../catalog/embedded-scene.js';
import { BookScene } from './scene.js';
import { BookVisit } from './visit.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소 없음: ${selector}`);
    return node;
}
/** 입력·정지·관찰자·뷰어 수명만 조율한다. */
class BookScreen {
    canvas = element('canvas');
    scene = new BookScene(this.canvas);
    visit = new BookVisit();
    events = new AbortController();
    keys = new Set();
    resizeObserver = new ResizeObserver(() => {
        this.dirty = true;
    });
    paused = false;
    overview = false;
    ready = false;
    loaded = false;
    disposed = false;
    dirty = true;
    pausedState = null;
    frame = 0;
    lastTime = performance.now();
    pointerId = null;
    constructor() {
        const { signal } = this.events;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.clearInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()), { signal });
        this.resizeObserver.observe(this.canvas);
        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.ready || this.paused || this.disposed)
                return;
            e.preventDefault();
            this.canvas.focus({ preventScroll: true });
            this.pointerId = e.pointerId;
            this.canvas.setPointerCapture(e.pointerId);
            const destination = this.scene.pick(e.clientX, e.clientY);
            if (destination)
                this.visit.navigate(destination);
        }, { signal });
        this.canvas.addEventListener('pointerup', () => this.releasePointer(), {
            signal,
        });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        element('#interact').addEventListener('click', () => this.act(() => this.visit.interact()), { signal });
        element('#overview').addEventListener('click', () => this.act(() => {
            this.overview = !this.overview;
            this.visit.cancelRoute();
        }), { signal });
        element('#reset').addEventListener('click', () => this.act(() => this.visit.reset()), { signal });
        element('#pause').addEventListener('click', () => {
            if (!this.ready || this.disposed)
                return;
            this.togglePause();
            if (!embeddedScene)
                this.canvas.focus();
        }, { signal });
        Object.defineProperty(window, 'villageStylePopupBook', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                snapshot: this.pausedState ?? this.visit.snapshot,
                diagnostics: this.scene.diagnostics,
                project: (p) => this.scene.project(p),
                screenPositions: this.scene.screenPositions,
            }),
        });
        void this.scene
            .load()
            .then(() => {
            if (!this.disposed)
                this.loaded = true;
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '로딩 실패';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    act(action) {
        if (!this.ready || this.paused || this.disposed)
            return;
        action();
        this.dirty = true;
        if (!embeddedScene)
            this.canvas.focus();
    }
    releasePointer() {
        if (this.pointerId !== null &&
            this.canvas.hasPointerCapture(this.pointerId))
            this.canvas.releasePointerCapture(this.pointerId);
        this.pointerId = null;
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.cancelRoute();
        this.releasePointer();
    };
    togglePause() {
        this.paused = !this.paused;
        this.clearInput();
        this.pausedState = this.paused ? this.visit.snapshot : null;
        this.lastTime = performance.now();
        element('#paused').hidden = !this.paused;
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
    }
    keyDown = (e) => {
        if (e.target !== this.canvas)
            return;
        const key = e.key.toLowerCase();
        if (![
            'w',
            'a',
            's',
            'd',
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            ' ',
            'm',
            'escape',
        ].includes(key))
            return;
        e.preventDefault();
        if (!this.ready || this.disposed)
            return;
        if (key === 'escape' && !e.repeat) {
            this.togglePause();
            return;
        }
        if (this.paused)
            return;
        if (!e.repeat && key === ' ')
            this.visit.interact();
        if (!e.repeat && key === 'm') {
            this.overview = !this.overview;
            this.visit.cancelRoute();
        }
        this.keys.add(key);
    };
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        if (this.loaded) {
            if (!this.paused) {
                this.visit.walk(delta, this.scene.movementToWorld({
                    x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                        Number(this.keys.has('a') || this.keys.has('arrowleft')),
                    z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                        Number(this.keys.has('w') || this.keys.has('arrowup')),
                }));
                this.visit.update(delta);
            }
            const state = this.pausedState ?? this.visit.snapshot;
            if (!this.paused || this.dirty || !this.ready) {
                this.scene.render(state, this.paused ? 0 : delta, {
                    overview: this.overview,
                    freezeActor: this.paused,
                });
                this.dirty = false;
                this.ready = true;
            }
            element('#notice').hidden = !state.notice;
            element('#notice').textContent = state.notice;
            element('#prompt').hidden = !state.nearby || this.paused;
            element('#prompt').textContent = state.nearby
                ? `${state.nearby === 'workshop' ? '제본 공방' : state.nearby === 'dojo' ? '종이 도장' : '책갈피 전망대'} · Space / 사용`
                : '';
            element('#interact').disabled =
                !state.nearby || this.paused;
            element('#overview').setAttribute('aria-pressed', String(this.overview));
            element('#status').textContent = state.returned
                ? '두 다리를 건너 귀환 완료'
                : state.folding !== null
                    ? `종이 조립 중 ${Math.round((state.folds[state.folding] ?? 0) * 100)}%`
                    : state.access.secondOpen
                        ? '둘째 펼침 완료 · 전망대에서 귀환'
                        : state.access.firstOpen
                            ? '첫 펼침 완료 · 도장을 복구해 다음 장 연결'
                            : '접힌 책 · 공방에서 첫 다리 펼치기';
            for (const id of ['workshop', 'dojo', 'rest'])
                element(`[data-place="${id}"]`).classList.toggle('visited', state.visited.includes(id));
        }
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.clearInput();
        this.events.abort();
        this.resizeObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new BookScreen();
