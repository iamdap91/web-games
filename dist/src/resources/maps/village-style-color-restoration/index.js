import { embeddedScene } from '../../catalog/embedded-scene.js';
import { ColorDrawing } from './drawing.js';
import { ColorVisit } from './visit.js';
import { colorPlaces } from './layout.js';
function element(selector) {
    const value = document.querySelector(selector);
    if (!value)
        throw new Error(`화면 요소가 없어요: ${selector}`);
    return value;
}
/** 입력·정지·종료를 연결하며 구역 복구와 이동 규칙은 Visit에 둔다. */
class ColorScreen {
    canvas = element('canvas');
    visit = new ColorVisit();
    drawing = new ColorDrawing(this.canvas);
    lifetime = new AbortController();
    keys = new Set();
    observer;
    ready = false;
    paused = false;
    overview = true;
    disposed = false;
    dirty = true;
    frame = 0;
    lastTime = performance.now();
    constructor() {
        this.overview = this.canvas.getBoundingClientRect().width > 600;
        const { signal } = this.lifetime;
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.clearInput, { signal });
        this.canvas.addEventListener('blur', this.clearInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus({ preventScroll: true });
            this.visit.navigate(this.drawing.groundFromPointer(event.clientX, event.clientY));
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        for (const id of ['overview', 'reset', 'interact'])
            element(`#${id}`).addEventListener('click', () => {
                if (this.paused || !this.ready)
                    return;
                if (id === 'overview')
                    this.overview = !this.overview;
                if (id === 'reset') {
                    this.clearInput();
                    this.visit.reset();
                }
                if (id === 'interact')
                    this.visit.interact();
                this.dirty = true;
                this.sync();
            }, { signal });
        element('#pause').addEventListener('click', () => {
            if (!this.ready)
                return;
            this.paused = !this.paused;
            this.clearInput();
            element('#paused').hidden = !this.paused;
            this.dirty = true;
            this.sync();
        }, { signal });
        this.observer = new ResizeObserver(() => {
            this.dirty = true;
        });
        this.observer.observe(this.canvas);
        Object.defineProperty(window, 'villageStyleColorRestoration', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                project: (point) => this.drawing.project(point),
                screenPositions: this.drawing.screenPositions,
                diagnostics: Object.freeze({
                    ...this.drawing.diagnostics,
                    stage: this.visit.snapshot.stage,
                    regionProgress: this.visit.snapshot.regionProgress,
                    restoring: this.visit.snapshot.restoring,
                    firstBridgeCrossed: this.visit.snapshot.firstBridgeCrossed,
                    roomVisited: this.visit.snapshot.roomVisited,
                    returnBridgeCrossed: this.visit.snapshot.returnBridgeCrossed,
                    returned: this.visit.snapshot.returned,
                    visited: this.visit.snapshot.visited,
                    visits: this.visit.snapshot.visits,
                }),
            }),
        });
        if (embeddedScene)
            document.documentElement.classList.add('embedded-scene');
        this.sync();
        void this.drawing
            .load()
            .then(() => {
            if (this.disposed)
                return;
            this.drawing.render(this.visit.snapshot, 0, {
                overview: this.overview,
            });
            this.ready = true;
            this.dirty = false;
            this.sync();
        })
            .catch((error) => {
            if (!this.disposed)
                element('#status').textContent =
                    error instanceof Error ? error.message : '로딩 실패';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.stop();
    };
    keyDown = (event) => {
        if (document.activeElement !== this.canvas || !this.ready)
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
            'escape',
        ].includes(key))
            return;
        event.preventDefault();
        if (key === 'escape' && !event.repeat) {
            element('#pause').click();
            return;
        }
        if (this.paused)
            return;
        if (!event.repeat) {
            if (key === ' ')
                this.visit.interact();
            if (key === 'm') {
                this.overview = !this.overview;
                this.dirty = true;
            }
        }
        this.keys.add(key);
    };
    sync() {
        const state = this.visit.snapshot, place = colorPlaces.find((p) => p.id === state.nearby);
        for (const id of ['overview', 'reset'])
            element(`#${id}`).disabled =
                !this.ready || this.paused;
        element('#pause').disabled = !this.ready;
        element('#interact').disabled =
            !this.ready || this.paused || !place;
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        element('#interact').textContent =
            place?.id === 'workshop' && state.stage === 0
                ? '공방 복구 · Space'
                : place?.id === 'teahouse' && state.stage === 1
                    ? '찻집 복구 · Space'
                    : place?.id === 'room'
                        ? '다락방 쉬기 · Space'
                        : '근처 살펴보기 · Space';
        element('#prompt').hidden = !place || this.paused;
        element('#prompt').textContent = place
            ? `${place.label} · Space / 살펴보기`
            : '';
        element('#notice').textContent = state.message;
        element('#status').textContent = this.ready
            ? `복구 ${state.stage}/2 · 답사 ${state.visits}회${state.restoring ? ` · 색 회복 ${Math.floor((state.regionProgress[state.restoring === 'workshop' ? 0 : 1] ?? 0) * 100)}%` : ''}${state.returned ? ' · 한 바퀴 귀환' : ''}`
            : '아타호를 불러오는 중…';
        element('#west-state').textContent =
            state.stage >= 1
                ? '01 공방 · 색과 다리 복구 ✓'
                : '01 흰 공방 · 가까이에서 복구';
        element('#east-state').textContent =
            state.stage === 2
                ? '02 찻집 · 방과 귀환길 복구 ✓'
                : '02 동쪽 찻집 · 다리 건너 복구';
        element('#loop-state').textContent = state.returned
            ? '03 다락방과 귀환길 답사 ✓'
            : state.roomVisited
                ? '03 남쪽 새 다리로 귀환'
                : '03 새 다락방 방문 → 다른 길로 귀환';
    }
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        if (this.ready) {
            if (!this.paused) {
                this.visit.update(delta, {
                    x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                        Number(this.keys.has('a') || this.keys.has('arrowleft')),
                    z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                        Number(this.keys.has('w') || this.keys.has('arrowup')),
                });
                this.drawing.render(this.visit.snapshot, delta, {
                    overview: this.overview,
                });
                this.sync();
            }
            else if (this.dirty)
                this.drawing.render(this.visit.snapshot, 0, {
                    overview: this.overview,
                });
            this.dirty = false;
        }
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.clearInput();
        cancelAnimationFrame(this.frame);
        this.lifetime.abort();
        this.observer.disconnect();
        this.drawing.dispose();
    }
}
new ColorScreen();
