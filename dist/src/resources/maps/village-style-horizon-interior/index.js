import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { HorizonScene } from './scene.js';
import { HorizonVisit } from './visit.js';
import { horizonPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
class HorizonScreen {
    canvas = element('canvas');
    scene = new HorizonScene(this.canvas);
    visit = new HorizonVisit();
    events = new AbortController();
    keys = new Set();
    ready = false;
    disposed = false;
    paused = false;
    overview = false;
    curved = true;
    lastTime = performance.now();
    frame = 0;
    constructor() {
        const { signal } = this.events;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.stopInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (!this.ready || this.paused)
                return;
            event.preventDefault();
            this.canvas.focus();
            const point = this.scene.pick(event.clientX, event.clientY);
            if (point) {
                this.visit.navigate(point);
                this.scene.mark(point);
            }
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.stopInput, { signal });
        element('#restore').addEventListener('click', () => {
            if (!this.paused)
                this.visit.toggleRestored();
            this.canvas.focus();
        }, { signal });
        element('#curve').addEventListener('click', () => {
            if (!this.paused)
                this.toggleCurve();
            this.canvas.focus();
        }, { signal });
        element('#overview').addEventListener('click', () => {
            if (!this.paused)
                this.toggleOverview();
            this.canvas.focus();
        }, { signal });
        element('#pause').addEventListener('click', () => {
            this.togglePause();
            this.canvas.focus();
        }, { signal });
        element('#reset').addEventListener('click', () => {
            if (!this.paused) {
                this.visit.reset();
                this.scene.mark(null);
            }
            this.canvas.focus();
        }, { signal });
        element('#interact').addEventListener('click', () => {
            if (!this.paused)
                this.visit.interact();
            this.canvas.focus();
        }, { signal });
        Object.defineProperty(window, 'villageStyleHorizonInterior', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                curved: this.curved,
                disposed: this.disposed,
                diagnostics: this.scene.diagnostics,
                screenPositions: this.scene.screenPositions,
                project: (point) => this.scene.project(point),
            }),
        });
        void this.scene
            .load()
            .then(() => {
            if (this.disposed)
                return;
            this.scene.render(this.visit.snapshot, 0, {
                overview: this.overview,
                curved: this.curved,
            });
            this.ready = true;
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '마을을 불러오지 못했어요.';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    stopInput = () => {
        this.keys.clear();
        this.visit.stop();
        this.scene.mark(null);
    };
    togglePause() {
        this.paused = !this.paused;
        this.stopInput();
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
        element('#paused').hidden = !this.paused;
    }
    toggleOverview() {
        this.overview = !this.overview;
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        element('#overview').textContent = this.overview
            ? '따라 걷기 · M'
            : '전체 조망 · M';
    }
    toggleCurve() {
        this.curved = !this.curved;
        element('#curve').setAttribute('aria-pressed', String(this.curved));
        element('#curve').textContent = this.curved ? '곡선 · C' : '평면 · C';
    }
    keyDown = (event) => {
        if (document.activeElement !== this.canvas)
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
            'r',
            'm',
            'c',
            'escape',
        ].includes(key))
            return;
        event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'escape')
                this.togglePause();
            if (!this.paused) {
                if (key === 'r')
                    this.visit.toggleRestored();
                if (key === 'm')
                    this.toggleOverview();
                if (key === 'c')
                    this.toggleCurve();
                if (key === ' ')
                    this.visit.interact();
            }
        }
        if (!this.paused)
            this.keys.add(key);
    };
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;
        if (this.ready) {
            if (!this.paused)
                this.visit.update(delta, {
                    x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                        Number(this.keys.has('a') || this.keys.has('arrowleft')),
                    z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                        Number(this.keys.has('w') || this.keys.has('arrowup')),
                });
            const snapshot = this.visit.snapshot;
            this.scene.render(snapshot, this.paused ? 0 : delta, {
                overview: this.overview,
                curved: this.curved,
            });
            const nearby = snapshot.inside
                ? { label: '집 안의 주민' }
                : horizonPlaces.find((place) => place.id === snapshot.nearby);
            element('#prompt').hidden = !nearby || this.paused;
            element('#prompt').textContent = nearby
                ? `${nearby.label} · Space / 사용`
                : '';
            element('#notice').hidden = !snapshot.notice;
            element('#notice').textContent = snapshot.notice;
            element('#status').textContent =
                `${snapshot.inside ? '집 안' : snapshot.roomOpen ? '문 앞 · 단면 개방' : '언덕 너머 집 찾기'} · ${this.curved ? '곡선 지평선' : '평면 비교'} · ${snapshot.restored ? '복구 후' : '복구 전'} · 방문 ${snapshot.visited.length}/3${snapshot.discovered ? ' · 쉼터 발견' : ''}${snapshot.loopComplete ? ' · 한 바퀴 완료' : ''}`;
            element('#restore').textContent = snapshot.restored
                ? '복구 전 · R'
                : '도장 복구 · R';
            for (const id of ['restore', 'curve', 'overview', 'reset'])
                element(`#${id}`).disabled = this.paused;
            element('#interact').disabled = !nearby || this.paused;
            if (!snapshot.routeRemaining)
                this.scene.mark(null);
        }
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.events.abort();
        this.stopInput();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new HorizonScreen();
