import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { ToyScene } from './scene.js';
import { ToyVisit } from './visit.js';
import { screenToWorld, toyPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
/** 키·포인터·버튼과 이 독립 화면의 수명을 연결한다. */
class ToyScreen {
    canvas = element('canvas');
    visit = new ToyVisit();
    scene = new ToyScene(this.canvas);
    lifetime = new AbortController();
    keys = new Set();
    paused = false;
    overview = false;
    ready = false;
    disposed = false;
    frame = 0;
    lastTime = performance.now();
    constructor() {
        const { signal } = this.lifetime;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.clearInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()), { signal });
        this.canvas.addEventListener('pointerdown', (e) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus();
            this.canvas.setPointerCapture(e.pointerId);
            const target = this.scene.groundFromPointer(e.clientX, e.clientY);
            if (target)
                this.visit.routeTo(target);
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        element('#overview').addEventListener('click', () => {
            this.toggleOverview();
            this.canvas.focus();
        }, { signal });
        element('#restore').addEventListener('click', () => {
            if (!this.paused)
                this.visit.toggleRestored();
            this.canvas.focus();
        }, { signal });
        element('#pause').addEventListener('click', () => {
            this.togglePause();
            this.canvas.focus();
        }, { signal });
        element('#reset').addEventListener('click', () => {
            if (!this.paused) {
                this.clearInput();
                this.visit.reset();
            }
            this.canvas.focus();
        }, { signal });
        element('#interact').addEventListener('click', () => {
            if (!this.paused)
                this.visit.interact();
            this.canvas.focus();
        }, { signal });
        Object.defineProperty(window, 'villageStyleToy', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                diagnostics: this.scene.diagnostics,
                screenPositions: toyPlaces.map((place) => ({
                    id: place.id,
                    label: place.label,
                    ...this.scene.project(place),
                    worldX: place.x,
                    worldZ: place.z,
                })),
                project: (point) => this.scene.project(point),
            }),
        });
        void this.scene
            .load()
            .then(() => {
            if (!this.disposed)
                this.ready = true;
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '로딩 실패';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.stop();
    };
    toggleOverview() {
        if (this.paused)
            return;
        this.overview = !this.overview;
        this.clearInput();
        element('#overview').setAttribute('aria-pressed', String(this.overview));
    }
    togglePause() {
        this.paused = !this.paused;
        this.clearInput();
        element('#paused').hidden = !this.paused;
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
    }
    keyDown = (event) => {
        if (event.target !== this.canvas)
            return;
        const key = event.key.toLowerCase();
        const handled = [
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
            'r',
            'escape',
        ];
        if (!handled.includes(key))
            return;
        event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'escape')
                this.togglePause();
            if (key === 'm')
                this.toggleOverview();
            if (!this.paused && key === 'r')
                this.visit.toggleRestored();
            if (!this.paused && key === ' ')
                this.visit.interact();
        }
        if (!this.paused)
            this.keys.add(key);
    };
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        if (this.ready) {
            if (!this.paused) {
                const input = {
                    x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                        Number(this.keys.has('a') || this.keys.has('arrowleft')),
                    z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                        Number(this.keys.has('w') || this.keys.has('arrowup')),
                };
                this.visit.walk(delta, screenToWorld(input));
                this.visit.update(delta);
            }
            const state = this.visit.snapshot;
            this.scene.render(state, this.paused ? 0 : delta, this.overview);
            const nearby = toyPlaces.find((p) => p.id === state.nearby);
            element('#prompt').hidden = !nearby || this.paused;
            element('#prompt').textContent = nearby
                ? `${nearby.label} · Space / 사용`
                : '';
            element('#notice').hidden = !state.notice;
            element('#notice').textContent = state.notice;
            element('#interact').disabled = !nearby || this.paused;
            element('#restore').textContent = state.restored
                ? '복구 전 · R'
                : '도장 복구 · R';
            element('#status').textContent =
                `${state.restored ? '복구 후' : '복구 전'} · 장소 ${state.visited.length}/3`;
            for (const place of toyPlaces)
                element(`[data-place="${place.id}"]`).classList.toggle('visited', state.visited.includes(place.id));
        }
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.clearInput();
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new ToyScreen();
