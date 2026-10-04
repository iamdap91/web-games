import { ClearingWorld, obstacleTypes } from './world.js';
import { ClearingScene } from './scene.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
const movementKeys = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
const workKeys = new Set(['Space', 'KeyE']);
class ClearingScreen {
    canvas = element('#clearing');
    overlay = element('#overlay');
    overlayTitle = element('#overlay-title');
    overlayMessage = element('#overlay-message');
    resume = element('#resume');
    targetLabel = element('#target');
    resources = element('#resources');
    progress = element('#progress');
    progressLabel = element('#progress-label');
    notice = element('#notice');
    diagnostics = element('#diagnostics');
    lifetime = new AbortController();
    keys = new Set();
    world = new ClearingWorld();
    dev = new URLSearchParams(location.search).get('dev') === '1';
    scene = null;
    frameId = 0;
    previousTime = 0;
    ready = false;
    paused = false;
    failed = false;
    disposed = false;
    noticeTime = 0;
    constructor() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', (event) => {
            if (!this.ready || this.failed)
                return;
            if (event.code === 'Escape') {
                event.preventDefault();
                if (!event.repeat)
                    this.setPaused(!this.paused);
                return;
            }
            if (!movementKeys.has(event.code) && !workKeys.has(event.code))
                return;
            if (event.target instanceof HTMLButtonElement)
                return;
            event.preventDefault();
            if (!this.paused)
                this.keys.add(event.code);
        }, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.code), {
            signal,
        });
        window.addEventListener('blur', () => this.setPaused(true), { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.setPaused(true);
        }, { signal });
        this.resume.addEventListener('click', () => {
            if (this.failed) {
                location.reload();
                return;
            }
            this.setPaused(false);
            this.canvas.focus();
        }, { signal });
        element('#reset').addEventListener('click', () => {
            if (!this.ready || this.failed)
                return;
            this.keys.clear();
            this.world.reset();
            this.scene?.reset();
            this.noticeTime = 0;
            this.notice.textContent = '';
            this.canvas.focus();
        }, { signal });
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
            signal,
        });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 화면을 다시 열어 주세요.');
        }, { signal });
        void this.start();
    }
    async start() {
        try {
            this.scene = new ClearingScene(this.canvas, this.world.snapshot);
            await this.scene.load();
            if (this.disposed)
                return;
            this.ready = true;
            this.setPaused(document.hidden);
            this.previousTime = performance.now();
            this.frameId = requestAnimationFrame(this.tick);
        }
        catch (error) {
            if (this.disposed)
                return;
            this.scene?.dispose();
            this.scene = null;
            this.showError(error instanceof Error
                ? error.message
                : '공터를 준비하지 못했어요. WebGL 2 지원 브라우저에서 열어 주세요.');
        }
    }
    showError(message) {
        this.failed = true;
        this.keys.clear();
        cancelAnimationFrame(this.frameId);
        this.overlay.hidden = false;
        this.overlayTitle.textContent = '공터를 준비하지 못했어요';
        this.overlayMessage.textContent = message;
        this.resume.textContent = '다시 열기';
        this.resume.hidden = false;
    }
    setPaused(paused) {
        if (!this.ready || this.failed)
            return;
        this.paused = paused;
        this.keys.clear();
        this.previousTime = performance.now();
        this.overlay.hidden = !paused;
        this.overlayTitle.textContent = '잠깐 쉬어가기';
        this.overlayMessage.textContent = '준비되면 공터 정리를 이어가세요.';
        this.resume.hidden = false;
    }
    tick = (now) => {
        if (this.disposed || this.failed)
            return;
        const dt = this.paused
            ? 0
            : Math.max(0, Math.min((now - this.previousTime) / 1000, 0.05));
        this.previousTime = now;
        const pressed = (a, b) => Number(this.keys.has(a) || this.keys.has(b));
        this.world.update(dt, {
            x: pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
            z: pressed('KeyS', 'ArrowDown') - pressed('KeyW', 'ArrowUp'),
            working: this.keys.has('Space') || this.keys.has('KeyE'),
        });
        const impacts = this.world.takeImpacts();
        this.scene?.addImpacts(impacts);
        for (const impact of impacts)
            if (impact.removed) {
                this.notice.textContent = `${obstacleTypes[impact.kind].material} +1 · 길이 열렸어요`;
                this.noticeTime = 1.8;
            }
        this.noticeTime = Math.max(0, this.noticeTime - dt);
        this.notice.hidden = this.noticeTime <= 0;
        const state = this.world.snapshot;
        this.scene?.render(state, dt);
        this.resources.textContent = `목재 ${state.wood}  /  돌 ${state.stone}`;
        this.progress.max = state.total;
        this.progress.value = state.removed;
        this.progressLabel.textContent = `공터 정리 ${state.removed} / ${state.total}`;
        const target = state.obstacles.find((item) => item.id === state.targetId && item.health > 0);
        this.targetLabel.textContent =
            state.removed === state.total
                ? '공터가 말끔해졌어요. 열린 땅을 걸어보세요!'
                : target
                    ? `${obstacleTypes[target.kind].label} · ${target.kind === 'brush' ? '도끼' : '곡괭이'} · ${target.health}회 남음`
                    : '잡목이나 바위를 향해 가까이 다가가세요';
        if (this.dev)
            this.diagnostics.textContent = JSON.stringify({
                ...state,
                paused: this.paused,
                ...this.scene?.diagnostics,
            });
        this.frameId = requestAnimationFrame(this.tick);
    };
    dispose() {
        this.disposed = true;
        this.lifetime.abort();
        cancelAnimationFrame(this.frameId);
        this.keys.clear();
        this.scene?.dispose();
    }
}
let screen = new ClearingScreen();
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = new ClearingScreen();
});
