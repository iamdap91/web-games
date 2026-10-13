import { embeddedScene, registerEmbeddedScene, } from '../../catalog/embedded-scene.js';
import { LivingDioramaScene } from './scene.js';
import { LivingDioramaVisit } from './visit.js';
import { livingDioramaPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
/** 화면 입력·정지·크기 변경·뷰어 종료만 조율한다. */
class LivingDioramaScreen {
    canvas = element('canvas');
    visit = new LivingDioramaVisit();
    scene = new LivingDioramaScene(this.canvas);
    lifetime = new AbortController();
    keys = new Set();
    resizeObserver = new ResizeObserver(() => {
        this.dirty = true;
    });
    paused = false;
    overview = false;
    light = true;
    normals = true;
    ready = false;
    loaded = false;
    disposed = false;
    dirty = true;
    pausedState = null;
    frame = 0;
    lastTime = performance.now();
    pointerId = null;
    constructor() {
        const { signal } = this.lifetime;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.clearInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        this.resizeObserver.observe(this.canvas);
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready || this.disposed)
                return;
            this.canvas.focus({ preventScroll: true });
            this.pointerId = event.pointerId;
            this.canvas.setPointerCapture(event.pointerId);
            const destination = this.scene.groundFromPointer(event.clientX, event.clientY);
            if (destination)
                this.visit.navigate(destination);
        }, { signal });
        this.canvas.addEventListener('pointerup', () => {
            if (this.pointerId !== null &&
                this.canvas.hasPointerCapture(this.pointerId))
                this.canvas.releasePointerCapture(this.pointerId);
            this.pointerId = null;
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        element('#overview').addEventListener('click', () => this.viewAction(() => {
            this.overview = !this.overview;
            this.visit.cancelRoute();
        }), { signal });
        element('#period').addEventListener('click', () => this.viewAction(() => this.visit.togglePeriod()), { signal });
        element('#restore').addEventListener('click', () => this.viewAction(() => this.visit.toggleRestored()), { signal });
        element('#light').addEventListener('click', () => this.viewAction(() => {
            this.light = !this.light;
        }), { signal });
        element('#normal').addEventListener('click', () => this.viewAction(() => {
            this.normals = !this.normals;
        }), { signal });
        element('#interact').addEventListener('click', () => this.viewAction(() => this.visit.interact()), { signal });
        element('#reset').addEventListener('click', () => this.viewAction(() => {
            this.visit.reset();
            this.clearInput();
        }), { signal });
        element('#pause').addEventListener('click', () => {
            if (!this.ready || this.disposed)
                return;
            this.togglePause();
            if (!embeddedScene)
                this.canvas.focus();
        }, { signal });
        Object.defineProperty(window, 'villageStyleLivingDiorama', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                snapshot: this.pausedState ?? this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                diagnostics: this.scene.diagnostics,
                project: (point) => this.scene.project(point),
                screenPositions: livingDioramaPlaces.map((place) => Object.freeze({
                    id: place.id,
                    label: place.label,
                    world: Object.freeze({ x: place.x, z: place.z }),
                    screen: Object.freeze(this.scene.project(place)),
                })),
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
    viewAction(action) {
        if (this.paused || !this.ready || this.disposed)
            return;
        action();
        this.dirty = true;
        if (!embeddedScene)
            this.canvas.focus();
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.cancelRoute();
        if (this.pointerId !== null &&
            this.canvas.hasPointerCapture(this.pointerId))
            this.canvas.releasePointerCapture(this.pointerId);
        this.pointerId = null;
    };
    togglePause() {
        this.paused = !this.paused;
        this.pausedState = this.paused ? this.visit.snapshot : null;
        this.clearInput();
        element('#paused').hidden = !this.paused;
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
        element('#interact').disabled =
            this.paused || !this.visit.snapshot.nearby;
        this.lastTime = performance.now();
    }
    keyDown = (event) => {
        if (event.target !== this.canvas)
            return;
        const key = event.key.toLowerCase();
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
            'r',
            'l',
            'n',
            't',
            'escape',
        ].includes(key))
            return;
        event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat && key === 'escape') {
            this.togglePause();
            return;
        }
        if (this.paused)
            return;
        if (!event.repeat) {
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'r')
                this.visit.toggleRestored();
            if (key === 'l')
                this.light = !this.light;
            if (key === 'n')
                this.normals = !this.normals;
            if (key === 't')
                this.visit.togglePeriod();
            if (key === ' ')
                this.visit.interact();
        }
        this.keys.add(key);
        if ([
            'w',
            'a',
            's',
            'd',
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
        ].includes(key))
            this.visit.cancelRoute();
    };
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        if (this.loaded) {
            if (!this.paused) {
                const input = {
                    x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                        Number(this.keys.has('a') || this.keys.has('arrowleft')),
                    z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                        Number(this.keys.has('w') || this.keys.has('arrowup')),
                };
                this.visit.walk(delta, this.scene.movementToWorld(input));
                this.visit.update(delta);
            }
            const state = this.pausedState ?? this.visit.snapshot;
            if (!this.paused || this.dirty || !this.ready) {
                this.scene.render(state, this.paused ? 0 : delta, {
                    overview: this.overview,
                    light: this.light,
                    normals: this.normals,
                    period: state.period,
                    freezeActor: this.paused,
                });
                this.dirty = false;
                this.ready = true;
            }
            const nearby = livingDioramaPlaces.find((place) => place.id === state.nearby);
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
            element('#overview').setAttribute('aria-pressed', String(this.overview));
            element('#light').setAttribute('aria-pressed', String(this.light));
            element('#normal').setAttribute('aria-pressed', String(this.normals));
            element('#period').textContent =
                state.period === 'day' ? '저녁 보기 · T' : '낮 보기 · T';
            element('#period').setAttribute('aria-pressed', String(state.period === 'evening'));
            element('#status').textContent =
                `${state.period === 'day' ? '낮' : '저녁'} · ${state.restored ? '복구 후' : '복구 전'} · 방문 ${state.visited.length}/4${state.returned ? ' · 귀환 완료' : ''}`;
            for (const place of livingDioramaPlaces)
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
        this.resizeObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new LivingDioramaScreen();
