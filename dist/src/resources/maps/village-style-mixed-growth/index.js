import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { GrowthScene, growthCameraYaw } from './scene.js';
import { GrowthVisit } from './visit.js';
import { growthPlaces } from './layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
/** 화면은 입력·렌더 수명만 소유한다. 성장·복구 규칙은 답사에 둔다. */
class GrowthScreen {
    canvas = element('canvas');
    scene = new GrowthScene(this.canvas);
    visit = new GrowthVisit();
    events = new AbortController();
    keys = new Set();
    observer;
    ready = false;
    disposed = false;
    paused = false;
    view = {
        overview: false,
        cutaway: true,
        normal: true,
        light: 'hearth',
    };
    frame = 0;
    lastTime = performance.now();
    resizePending = true;
    frozen = null;
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
        this.bind('#restore', () => this.visit.restore());
        this.bind('#growth', () => {
            this.visit.grow();
            this.scene.mark(null);
        });
        this.bind('#cutaway', () => (this.view = { ...this.view, cutaway: !this.view.cutaway }));
        this.bind('#normal', () => (this.view = { ...this.view, normal: !this.view.normal }));
        this.bind('#light', () => (this.view = {
            ...this.view,
            light: this.view.light === 'hearth' ? 'window' : 'hearth',
        }));
        this.bind('#overview', () => (this.view = { ...this.view, overview: !this.view.overview }));
        this.bind('#reset', () => {
            this.visit.reset();
            this.scene.mark(null);
        });
        this.bind('#interact', () => this.visit.interact());
        element('#pause').addEventListener('click', () => {
            this.togglePause();
            this.canvas.focus();
        }, { signal });
        this.observer = new ResizeObserver(() => {
            this.resizePending = true;
        });
        this.observer.observe(this.canvas);
        Object.defineProperty(window, 'villageStyleMixedGrowth', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                snapshot: this.paused && this.frozen ? this.frozen : this.visit.snapshot,
                paused: this.paused,
                overview: this.view.overview,
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
            this.scene.render(this.visit.snapshot, this.view, 0);
            this.resizePending = false;
            this.ready = true;
            this.updateUi();
        })
            .catch((error) => {
            element('#status').textContent =
                error instanceof Error ? error.message : '골목을 불러오지 못했어요.';
        });
        this.frame = requestAnimationFrame(this.render);
    }
    bind(selector, action) {
        element(selector).addEventListener('click', () => {
            if (!this.ready || this.paused)
                return;
            action();
            this.updateUi();
            this.canvas.focus();
        }, { signal: this.events.signal });
    }
    stopInput = () => {
        this.keys.clear();
        this.visit.stop();
    };
    togglePause() {
        if (!this.ready)
            return;
        this.paused = !this.paused;
        if (this.paused)
            this.frozen = this.visit.snapshot;
        else
            this.frozen = null;
        this.stopInput();
        this.updateUi();
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
            'escape',
            'm',
            'r',
            'g',
            'c',
        ].includes(key))
            return;
        event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'escape')
                this.togglePause();
            if (!this.paused) {
                if (key === ' ')
                    this.visit.interact();
                if (key === 'r')
                    this.visit.restore();
                if (key === 'g')
                    this.visit.grow();
                if (key === 'c')
                    this.view = { ...this.view, cutaway: !this.view.cutaway };
                if (key === 'm')
                    this.view = { ...this.view, overview: !this.view.overview };
            }
        }
        if (!this.paused)
            this.keys.add(key);
    };
    updateUi() {
        const state = this.paused && this.frozen ? this.frozen : this.visit.snapshot, place = growthPlaces(state.stage).find((p) => p.id === state.nearby);
        for (const id of [
            'restore',
            'growth',
            'cutaway',
            'normal',
            'light',
            'overview',
            'reset',
        ])
            element(`#${id}`).disabled = this.paused;
        element('#interact').disabled = this.paused || !place;
        element('#restore').textContent = state.restored
            ? '복구 전 · R'
            : '도장 복구 · R';
        element('#growth').textContent =
            ['② 복도 잇기 · G', '③ 숙소 더하기 · G', '① 분리 공방 · G'][state.stage] ?? '';
        element('#cutaway').textContent = this.view.cutaway
            ? '외벽 닫기 · C'
            : '단면 열기 · C';
        element('#cutaway').setAttribute('aria-pressed', String(this.view.cutaway));
        element('#normal').textContent = this.view.normal
            ? '요철 켜짐'
            : '요철 꺼짐';
        element('#normal').setAttribute('aria-pressed', String(this.view.normal));
        element('#light').textContent =
            this.view.light === 'hearth' ? '빛: 화덕 쪽' : '빛: 창가 쪽';
        element('#overview').textContent = this.view.overview
            ? '가까이 · M'
            : '전체 조망 · M';
        element('#overview').setAttribute('aria-pressed', String(this.view.overview));
        element('#pause').textContent = this.paused ? '계속 · Esc' : '멈춤 · Esc';
        element('#paused').hidden = !this.paused;
        element('#prompt').hidden = !place || this.paused;
        element('#prompt').textContent = place
            ? `${place.label} · Space / 사용`
            : '';
        element('#notice').hidden = !state.notice;
        element('#notice').textContent = state.notice;
        element('#stage-label').textContent =
            ['01 · 각자의 작은 방', '02 · 벽이 열린 복도', '03 · 숙소와 꽃 마당'][state.stage] ?? '';
        element('#stage-copy').textContent =
            [
                '공방에서 차를 데우고, 도장 마룻장을 고쳐보세요.',
                '공유벽을 열자 식탁과 주민의 왕래가 생깁니다.',
                '골목에 꽃이 피고, 도장 뒤 계단 위 쉼터가 열렸어요.',
            ][state.stage] ?? '';
        const info = this.scene.diagnostics;
        element('#topology').textContent =
            `방 ${info.rooms} · 공유벽 ${info.sharedWalls} · 복도 ${info.corridors}`;
        element('#status').textContent =
            `방문 ${state.visited.length}/3 · ${state.restored ? '도장 복구' : '수리 전'}${state.loopComplete ? ' · 한 바퀴 완료' : ''}`;
    }
    render = (time) => {
        if (this.disposed)
            return;
        const dt = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;
        if (this.ready) {
            if (!this.paused) {
                const sx = Number(this.keys.has('d') || this.keys.has('arrowright')) -
                    Number(this.keys.has('a') || this.keys.has('arrowleft')), sz = Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                    Number(this.keys.has('w') || this.keys.has('arrowup'));
                this.visit.update(dt, {
                    x: sx * Math.cos(growthCameraYaw) + sz * Math.sin(growthCameraYaw),
                    z: -sx * Math.sin(growthCameraYaw) + sz * Math.cos(growthCameraYaw),
                }, growthCameraYaw);
                this.scene.render(this.visit.snapshot, this.view, dt);
                this.updateUi();
                this.resizePending = false;
                if (!this.visit.snapshot.routeRemaining)
                    this.scene.mark(null);
            }
            else if (this.resizePending && this.frozen) {
                this.scene.render(this.frozen, this.view, 0);
                this.resizePending = false;
            }
        }
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.events.abort();
        this.observer.disconnect();
        this.stopInput();
        cancelAnimationFrame(this.frame);
        this.scene.dispose();
    }
}
new GrowthScreen();
