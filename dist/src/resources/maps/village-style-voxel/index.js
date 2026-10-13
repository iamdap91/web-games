import { embeddedScene, registerEmbeddedScene, } from '../../catalog/embedded-scene.js';
import { VoxelScene } from './scene.js';
import { VoxelVisit } from './visit.js';
import { voxelPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
/** 화면의 입력과 뷰어 종료만 조율한다. */
class VoxelScreen {
    canvas = element('canvas');
    visit = new VoxelVisit();
    scene = new VoxelScene(this.canvas);
    lifetime = new AbortController();
    keys = new Set();
    prompt = element('#prompt');
    notice = element('#notice');
    paused = false;
    overview = false;
    ready = false;
    disposed = false;
    frame = 0;
    lastTime = performance.now();
    pointerId = null;
    constructor() {
        const { signal } = this.lifetime;
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('blur', this.clearInput, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus();
            this.pointerId = event.pointerId;
            this.canvas.setPointerCapture(event.pointerId);
            const destination = this.scene.groundFromPointer(event.clientX, event.clientY);
            if (destination)
                this.visit.navigate(destination);
        }, { signal });
        this.canvas.addEventListener('pointerup', () => {
            this.pointerId = null;
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        element('#overview').addEventListener('click', () => {
            this.setOverview();
            this.canvas.focus();
        }, { signal });
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
        element('#reset').addEventListener('click', () => {
            this.visit.reset();
            if (this.paused)
                this.togglePause();
            this.clearInput();
            this.canvas.focus();
        }, { signal });
        element('#pause').addEventListener('click', () => {
            this.togglePause();
            this.canvas.focus();
        }, { signal });
        Object.defineProperty(window, 'villageStyleVoxel', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                diagnostics: this.scene.diagnostics,
                project: (point) => this.scene.project(point),
                screenPositions: voxelPlaces.map((place) => ({
                    id: place.id,
                    label: place.label,
                    world: { x: place.x, z: place.z },
                    screen: this.scene.project(place),
                })),
            }),
        });
        void this.scene
            .load()
            .then(() => {
            if (this.disposed)
                return;
            this.ready = true;
            if (!embeddedScene)
                this.canvas.focus();
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '로딩 실패';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.cancelRoute();
        if (this.pointerId !== null &&
            this.canvas.hasPointerCapture(this.pointerId))
            this.canvas.releasePointerCapture(this.pointerId);
        this.pointerId = null;
        this.visit.stop();
    };
    setOverview() {
        this.overview = !this.overview;
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        this.visit.cancelRoute();
    }
    togglePause() {
        this.paused = !this.paused;
        this.clearInput();
        element('#paused').hidden = !this.paused;
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
    }
    keyDown = (event) => {
        if (event.target instanceof HTMLButtonElement ||
            event.target instanceof HTMLAnchorElement)
            return;
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
            'm',
            'r',
            'escape',
        ].includes(key))
            event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'm')
                this.setOverview();
            if (key === 'escape')
                this.togglePause();
            if (!this.paused && key === 'r')
                this.visit.toggleRestored();
            if (!this.paused && key === ' ')
                this.visit.interact();
        }
        if (!this.paused) {
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
        }
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
                this.visit.walk(delta, this.scene.movementToWorld(input));
                this.visit.update(delta);
            }
            const state = this.visit.snapshot;
            this.scene.render(state, this.paused ? 0 : delta, this.overview);
            const nearby = voxelPlaces.find((place) => place.id === state.nearby);
            this.prompt.hidden = !nearby || this.paused;
            this.prompt.textContent = nearby ? `${nearby.label} · Space / 사용` : '';
            this.notice.hidden = !state.notice;
            this.notice.textContent = state.notice;
            element('#interact').disabled = !nearby || this.paused;
            element('#restore').textContent = state.restored
                ? '복구 전 · R'
                : '도장 복구 · R';
            element('#status').textContent =
                `${state.restored ? '복구 후' : '복구 전'} · 장소 ${state.visited.length}/3${state.shelterDiscovered ? ' · 쉼터 발견' : ''}`;
            for (const place of voxelPlaces)
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
new VoxelScreen();
