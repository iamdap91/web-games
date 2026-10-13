import { embeddedScene } from '../../catalog/embedded-scene.js';
import { ForestScene } from './scene.js';
import { ForestVisit } from './visit.js';
import { forestPlaces, entrance, findRoute, forestRouteDistance, } from './layout.js';
function element(selector) {
    const value = document.querySelector(selector);
    if (!value)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return value;
}
/** 입력과 종료는 화면이, 진행은 Visit이, GPU는 Scene이 정리한다. */
class ForestScreen {
    canvas = element('canvas');
    visit = new ForestVisit();
    scene = new ForestScene(this.canvas);
    returnDistances = Object.freeze({
        sealed: forestRouteDistance(forestPlaces[2], findRoute(forestPlaces[2], entrance)),
        open: forestRouteDistance(forestPlaces[2], findRoute(forestPlaces[2], entrance, true)),
    });
    lifetime = new AbortController();
    keys = new Set();
    observer;
    ready = false;
    disposed = false;
    paused = false;
    overview = false;
    dirty = true;
    frame = 0;
    lastTime = performance.now();
    constructor() {
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
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus();
            const point = this.scene.groundFromPointer(event.clientX, event.clientY);
            if (point)
                this.visit.navigate(point);
        }, { signal });
        this.canvas.addEventListener('pointercancel', this.clearInput, { signal });
        for (const id of [
            'overview',
            'restore',
            'reset',
            'interact',
            'normal',
            'light',
        ])
            element(`#${id}`).addEventListener('click', () => {
                if (this.paused || !this.ready)
                    return;
                if (id === 'overview')
                    this.overview = !this.overview;
                if (id === 'restore')
                    this.visit.toggleRestored();
                if (id === 'reset') {
                    this.visit.reset();
                    this.clearInput();
                }
                if (id === 'interact')
                    this.visit.interact();
                if (id === 'normal')
                    this.visit.toggleNormal();
                if (id === 'light')
                    this.visit.toggleLight();
                this.dirty = true;
                this.canvas.focus();
            }, { signal });
        element('#pause').addEventListener('click', () => {
            if (!this.ready)
                return;
            this.paused = !this.paused;
            this.clearInput();
            element('#paused').hidden = !this.paused;
            element('#pause').textContent = this.paused
                ? '계속 · Esc'
                : '멈춤 · Esc';
            this.syncControls();
            this.canvas.focus();
        }, { signal });
        this.observer = new ResizeObserver(() => {
            this.dirty = true;
        });
        this.observer.observe(this.canvas);
        Object.defineProperty(window, 'villageStyleRootExpedition', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                diagnostics: Object.freeze({
                    ...this.scene.diagnostics,
                    returnDistances: this.returnDistances,
                    discovered: this.visit.snapshot.discovered,
                    investigation: this.visit.snapshot.visited.includes('refuge'),
                    openingProgress: this.visit.snapshot.openingProgress,
                    passageOpen: this.visit.snapshot.shortcut === 'open',
                    shortcutCrossed: this.visit.snapshot.shortcutCrossed,
                    returned: this.visit.snapshot.returned,
                    visits: this.visit.snapshot.visits,
                    visited: this.visit.snapshot.visited,
                }),
                screenPositions: this.scene.screenPositions,
                project: (point) => this.scene.project(point),
            }),
        });
        void this.scene
            .load()
            .then(() => {
            if (this.disposed)
                return;
            this.scene.render(this.visit.snapshot, 0, { overview: this.overview });
            this.ready = true;
            this.dirty = false;
            this.syncControls();
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '로딩 실패';
        });
        if (embeddedScene)
            document.documentElement.classList.add('embedded-scene');
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
            'r',
            'm',
            'n',
            'l',
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
            if (key === 'r')
                this.visit.toggleRestored();
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'n')
                this.visit.toggleNormal();
            if (key === 'l')
                this.visit.toggleLight();
        }
        this.keys.add(key);
    };
    syncControls() {
        const s = this.visit.snapshot, p = forestPlaces.find((p) => p.id === s.nearby);
        for (const id of ['overview', 'restore', 'reset', 'normal', 'light'])
            element(`#${id}`).disabled = this.paused;
        element('#interact').disabled = this.paused || !p;
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        element('#normal').setAttribute('aria-pressed', String(s.normalEnabled));
        element('#light').setAttribute('aria-pressed', String(s.lightEnabled));
        element('#restore').textContent = s.restored
            ? '복구 전 · R'
            : '도장 복구 · R';
        element('#normal').textContent = s.normalEnabled
            ? '요철 켬 · N'
            : '요철 끔 · N';
        element('#light').textContent = s.lightEnabled
            ? '불빛 켬 · L'
            : '불빛 끔 · L';
        element('#prompt').hidden = !p || this.paused;
        element('#prompt').textContent = p
            ? `${p.label} · Space / ${p.id === 'refuge' ? '조사' : '사용'}`
            : '';
        element('#interact').textContent =
            p?.id === 'refuge' ? '포자 씨앗 조사 · Space' : '근처 시설 사용 · Space';
        element('#notice').textContent = s.message;
        element('#status').textContent =
            `답사 ${s.visits}회 · 방문 ${s.visited.length}/3 · ${s.shortcut === 'open' ? '뒷길 열림' : s.shortcut === 'growing' ? `뿌리 성장 ${Math.floor(s.openingProgress * 100)}%` : '끊긴 뒷길'}${s.returned ? ' · 포자길 귀환 완료' : ''}`;
        forestPlaces.forEach((p) => element(`[data-place="${p.id}"]`).classList.toggle('visited', s.visited.includes(p.id)));
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
                this.scene.render(this.visit.snapshot, delta, {
                    overview: this.overview,
                });
                this.syncControls();
            }
            else if (this.dirty) {
                this.scene.render(this.visit.snapshot, 0, { overview: this.overview });
            }
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
        this.lifetime.abort();
        this.observer.disconnect();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new ForestScreen();
