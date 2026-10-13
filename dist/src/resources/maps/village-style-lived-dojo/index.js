import { embeddedScene, reportEmbeddedSelection, } from '../../catalog/embedded-scene.js';
import { LivedDojoScene } from './scene.js';
import { villagePoints } from './layout.js';
import { VillageVisit } from './visit.js';
function element(selector) {
    const found = document.querySelector(selector);
    if (!found)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return found;
}
/** 입력·화면 수명만 소유하고 마을 진행은 답사 객체에 맡긴다. */
class LivedDojoScreen {
    lifetime = new AbortController();
    keys = new Set();
    visit = new VillageVisit();
    canvas = element('canvas');
    scene = new LivedDojoScene(this.canvas);
    resizeObserver = new ResizeObserver(() => {
        this.scene.resize();
        if (this.ready && !this.disposed)
            this.draw(0);
    });
    frame = 0;
    lastTime = performance.now();
    ready = false;
    disposed = false;
    paused = false;
    overview = false;
    normalEnabled = true;
    lightSide = 'left';
    constructor() {
        this.registerInput();
        this.resizeObserver.observe(this.canvas);
        Object.defineProperty(window, 'villageStyleLivedDojo', {
            configurable: true,
            get: () => Object.freeze({
                ready: this.ready,
                snapshot: this.visit.snapshot,
                paused: this.paused,
                overview: this.overview,
                disposed: this.disposed,
                project: (point) => this.scene.project(point),
                screenPositions: Object.freeze(Object.fromEntries(villagePoints.map((point) => [
                    point.id,
                    Object.freeze(this.scene.project(point)),
                ]))),
                diagnostics: Object.freeze(this.scene.diagnostics),
            }),
        });
        reportEmbeddedSelection('local/village-style-lived-dojo');
        void this.load();
    }
    async load() {
        try {
            await this.scene.load();
            if (this.disposed)
                return;
            this.scene.resize();
            this.draw(0);
            this.ready = true;
            this.lastTime = performance.now();
            this.frame = requestAnimationFrame(this.render);
        }
        catch (error) {
            if (!this.disposed)
                element('#status').textContent =
                    error instanceof Error
                        ? error.message
                        : '아타호 리소스를 불러오지 못했어요.';
        }
    }
    interact = () => {
        if (this.paused || !this.ready)
            return;
        element('.notice').textContent = this.visit.interact();
        this.canvas.focus({ preventScroll: true });
    };
    clearInput = () => {
        this.keys.clear();
        if (!this.paused)
            this.visit.stop();
    };
    togglePause = () => {
        if (!this.ready)
            return;
        this.paused = !this.paused;
        this.keys.clear();
        element('.paused').hidden = !this.paused;
        element('#pause').setAttribute('aria-pressed', String(this.paused));
        for (const id of [
            'restore',
            'overview',
            'reset',
            'interact',
            'light',
            'normal',
        ])
            element(`#${id}`).disabled = this.paused;
        if (this.paused)
            cancelAnimationFrame(this.frame);
        else {
            this.lastTime = performance.now();
            this.frame = requestAnimationFrame(this.render);
        }
        this.canvas.focus({ preventScroll: true });
    };
    registerInput() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', (event) => {
            if (document.activeElement !== this.canvas)
                return;
            const key = event.key.toLowerCase();
            if (![
                'arrowup',
                'arrowdown',
                'arrowleft',
                'arrowright',
                'w',
                'a',
                's',
                'd',
                'r',
                'm',
                'escape',
                ' ',
            ].includes(key))
                return;
            event.preventDefault();
            if (!event.repeat) {
                if (key === 'escape')
                    this.togglePause();
                if (key === ' ')
                    this.interact();
                if (!this.paused && key === 'm')
                    this.toggleOverview();
                if (!this.paused && key === 'r')
                    this.restoreDojo();
            }
            if (!this.paused)
                this.keys.add(key);
        }, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        window.addEventListener('blur', this.clearInput, { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.clearInput();
        }, { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        window.addEventListener('resource-scene-dispose', () => this.dispose(), {
            once: true,
            signal,
        });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.paused || !this.ready)
                return;
            this.canvas.focus({ preventScroll: true });
            const point = this.scene.pick(event.clientX, event.clientY);
            if (point) {
                this.visit.navigate(point);
                if (!this.visit.snapshot.routeRemaining)
                    element('.notice').textContent =
                        '건물과 줄기는 지나갈 수 없어요. 흙길이나 계단 바닥을 눌러 주세요.';
            }
        }, { signal });
        element('#restore').addEventListener('click', this.restoreDojo, {
            signal,
        });
        element('#overview').addEventListener('click', this.toggleOverview, {
            signal,
        });
        element('#pause').addEventListener('click', this.togglePause, { signal });
        element('#interact').addEventListener('click', this.interact, { signal });
        element('#reset').addEventListener('click', () => {
            if (this.paused)
                return;
            this.visit.returnToEntrance();
            this.keys.clear();
            element('.notice').textContent =
                '입구로 돌아왔어요. 복구와 방문은 남아 있어요. 이번에는 다른 길로 올라가 보세요.';
            this.canvas.focus({ preventScroll: true });
        }, { signal });
        element('#light').addEventListener('click', () => {
            if (this.paused)
                return;
            this.lightSide = this.lightSide === 'left' ? 'right' : 'left';
            element('#light').setAttribute('aria-pressed', String(this.lightSide === 'right'));
            element('.notice').textContent =
                this.lightSide === 'right'
                    ? '화덕 빛을 오른쪽으로 옮겼어요. 벽돌 왼쪽 홈과 기와 능선의 밝기가 바뀝니다.'
                    : '화덕 빛을 왼쪽으로 옮겼어요. 같은 표면을 반대쪽에서 비춥니다.';
            this.canvas.focus({ preventScroll: true });
        }, { signal });
        element('#normal').addEventListener('click', () => {
            if (this.paused)
                return;
            this.normalEnabled = !this.normalEnabled;
            element('#normal').setAttribute('aria-pressed', String(this.normalEnabled));
            element('.notice').textContent = this.normalEnabled
                ? '표면 요철 켜짐 · 벽돌·기와의 능선이 빛에 반응합니다.'
                : '표면 요철 꺼짐 · 같은 색 그림과 같은 조명에서 평평한 면을 비교합니다.';
            this.canvas.focus({ preventScroll: true });
        }, { signal });
    }
    toggleOverview = () => {
        if (this.paused)
            return;
        this.overview = !this.overview;
        element('#overview').setAttribute('aria-pressed', String(this.overview));
        this.canvas.focus({ preventScroll: true });
    };
    restoreDojo = () => {
        if (this.paused)
            return;
        element('.notice').textContent = this.visit.restore();
        this.canvas.focus({ preventScroll: true });
    };
    draw(delta) {
        const snapshot = this.visit.snapshot;
        this.scene.render(snapshot, delta, {
            overview: this.overview,
            normalEnabled: this.normalEnabled,
            lightSide: this.lightSide,
        });
        const nearby = this.visit.nearby;
        element('.prompt').hidden = !nearby;
        element('.prompt').textContent = nearby
            ? `${nearby.name} · Space / 시설 사용`
            : '';
        element('#status').textContent =
            `${snapshot.height > 2.3 ? '언덕 마당' : snapshot.height > 0.4 ? '계단 · 언덕길' : '온빛 골목'} · 시설 ${snapshot.visited.length}/5 · ${snapshot.restored ? (snapshot.shortcutUsed ? '뒤문 지름길 답사 완료' : '수련 마루 · 뒤문 열림') : '문앞에서 복구'}`;
        element('#restore').setAttribute('aria-pressed', String(snapshot.restored));
    }
    render = (time) => {
        if (this.disposed || this.paused)
            return;
        const seconds = Math.min(0.04, Math.max(0, (time - this.lastTime) / 1000));
        this.lastTime = time;
        this.visit.update(seconds, {
            x: Number(this.keys.has('d') || this.keys.has('arrowright')) -
                Number(this.keys.has('a') || this.keys.has('arrowleft')),
            z: Number(this.keys.has('s') || this.keys.has('arrowdown')) -
                Number(this.keys.has('w') || this.keys.has('arrowup')),
        });
        this.draw(seconds);
        this.frame = requestAnimationFrame(this.render);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.keys.clear();
        this.visit.stop();
        cancelAnimationFrame(this.frame);
        this.lifetime.abort();
        this.resizeObserver.disconnect();
        this.scene.dispose();
    }
}
if (embeddedScene)
    document.documentElement.classList.add('embedded-scene');
new LivedDojoScreen();
