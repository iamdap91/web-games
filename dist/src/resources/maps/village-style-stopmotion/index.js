import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { StopmotionScene, stopmotionCameraYaw } from './scene.js';
import { StopmotionVisit } from './visit.js';
import { stopmotionPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
/** 입력과 화면 수명만 연결하고 마을 규칙은 답사 객체에 둔다. */
class StopmotionScreen {
    canvas = element('canvas');
    scene = new StopmotionScene(this.canvas);
    visit = new StopmotionVisit();
    events = new AbortController();
    keys = new Set();
    paused = false;
    overview = false;
    cadence = true;
    ready = false;
    disposed = false;
    frame = 0;
    lastTime = performance.now();
    constructor() {
        const { signal } = this.events;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal,
        });
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
        element('#interact').addEventListener('click', () => {
            if (!this.paused)
                this.visit.interact();
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
            if (this.paused)
                return;
            this.visit.reset();
            this.scene.mark(null);
            this.canvas.focus();
        }, { signal });
        element('#cadence').addEventListener('click', () => {
            if (this.paused)
                return;
            this.cadence = !this.cadence;
            element('#cadence').textContent = this.cadence
                ? '모형 박자 · 12FPS'
                : '연속 움직임';
            element('#cadence').setAttribute('aria-pressed', String(this.cadence));
        }, { signal });
        Object.defineProperty(window, 'villageStyleStopmotion', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                diagnostics: {
                    ...this.scene.diagnostics,
                    simulationTime: this.visit.snapshot.elapsed,
                },
                screenPositions: this.scene.screenPositions,
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
                error instanceof Error ? error.message : '마을을 불러오지 못했어요.';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    stopInput = () => {
        this.keys.clear();
        this.visit.stop();
        this.scene.mark(null);
    };
    toggleOverview() {
        this.overview = !this.overview;
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        element('#overview').textContent = this.overview
            ? '가까이 · M'
            : '전체 조망 · M';
    }
    togglePause() {
        this.paused = !this.paused;
        this.stopInput();
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
        element('#paused').hidden = !this.paused;
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
            'm',
            'r',
            'escape',
        ].includes(key))
            return;
        event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'escape')
                this.togglePause();
            if (!this.paused && key === 'm')
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
        const delta = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;
        if (this.ready) {
            if (!this.paused) {
                const sx = Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft'));
                const sz = Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup'));
                this.visit.update(delta, {
                    x: sx * Math.cos(stopmotionCameraYaw) +
                        sz * Math.sin(stopmotionCameraYaw),
                    z: -sx * Math.sin(stopmotionCameraYaw) +
                        sz * Math.cos(stopmotionCameraYaw),
                }, stopmotionCameraYaw);
            }
            const snapshot = this.visit.snapshot;
            if (this.paused)
                this.scene.refreshPausedSize();
            else
                this.scene.render(snapshot, delta, {
                    overview: this.overview,
                    cadence: this.cadence,
                });
            const nearby = stopmotionPlaces.find((place) => place.id === snapshot.nearby);
            element('#prompt').hidden = !nearby || this.paused;
            element('#prompt').textContent = nearby
                ? `${nearby.label} · Space / 사용`
                : '';
            element('#notice').hidden = !snapshot.notice;
            element('#notice').textContent = snapshot.notice;
            element('#interact').disabled = !nearby || this.paused;
            element('#restore').disabled = this.paused;
            element('#overview').disabled = this.paused;
            element('#cadence').disabled = this.paused;
            element('#reset').disabled = this.paused;
            element('#restore').textContent = snapshot.restored
                ? '복구 전 · R'
                : '도장 복구 · R';
            element('#status').textContent =
                `${snapshot.restored ? '복구 후' : '복구 전'} · 방문 ${snapshot.visited.length}/3${snapshot.shelterDiscovered ? ' · 뒷골목 발견' : ''}${snapshot.loopComplete ? ' · 한 바퀴 완료' : ''}`;
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
new StopmotionScreen();
