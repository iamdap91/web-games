import { VillageScene } from './scene.js';
import { VillageWalk } from './world.js';
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
class VillageScreen {
    canvas = element('#village');
    overlay = element('#overlay');
    title = element('#overlay-title');
    message = element('#overlay-message');
    resume = element('#resume');
    area = element('#area');
    diagnostics = element('#diagnostics');
    spritePose = element('#sprite-pose');
    lifetime = new AbortController();
    keys = new Set();
    walk = new VillageWalk();
    scene = null;
    frameId = 0;
    previousTime = 0;
    paused = false;
    ready = false;
    failed = false;
    disposed = false;
    dev = new URLSearchParams(location.search).get('dev') === '1';
    constructor() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', (event) => {
            if (!this.ready || this.failed)
                return;
            if (event.code === 'Escape') {
                if (!event.repeat)
                    this.setPaused(!this.paused);
                event.preventDefault();
                return;
            }
            if (!movementKeys.has(event.code))
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
            this.walk.reset();
            this.scene?.resetCamera();
            this.canvas.focus();
        }, { signal });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 화면을 다시 열어 주세요.');
        }, { signal });
        if (this.dev) {
            element('#sprite-comparison').hidden = false;
            if (new URLSearchParams(location.search).get('sprite') === 'camera')
                this.spritePose.value = 'camera';
            this.spritePose.addEventListener('change', () => {
                this.keys.clear();
                this.walk.stop();
                this.applySpritePose();
                this.canvas.focus();
            }, { signal });
        }
        void this.start();
    }
    applySpritePose() {
        this.scene?.setSpritePose(this.dev && this.spritePose.value === 'camera' ? 'camera' : 'upright');
    }
    async start() {
        try {
            this.scene = new VillageScene(this.canvas);
            this.applySpritePose();
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
                : '화면을 준비하지 못했어요. WebGL 2 지원 브라우저에서 다시 열어 주세요.');
        }
    }
    showError(message) {
        this.failed = true;
        this.keys.clear();
        cancelAnimationFrame(this.frameId);
        this.overlay.hidden = false;
        this.title.textContent = '산책을 준비하지 못했어요';
        this.message.textContent = message;
        this.resume.textContent = '다시 열기';
        this.resume.hidden = false;
    }
    setPaused(paused) {
        if (!this.ready || this.failed)
            return;
        this.paused = paused;
        this.keys.clear();
        this.walk.stop();
        this.previousTime = performance.now();
        this.overlay.hidden = !paused;
        this.title.textContent = '잠깐 쉬어가기';
        this.message.textContent = '준비되면 산책을 이어가세요.';
        this.resume.hidden = false;
    }
    tick = (now) => {
        if (this.disposed || this.failed)
            return;
        const dt = Math.max(0, Math.min((now - this.previousTime) / 1000, 0.05));
        this.previousTime = now;
        const pressed = (a, b) => Number(this.keys.has(a) || this.keys.has(b));
        if (!this.paused)
            this.walk.update(dt, {
                x: pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
                z: pressed('KeyS', 'ArrowDown') - pressed('KeyW', 'ArrowUp'),
            });
        const player = this.walk.snapshot;
        this.scene?.render(player, this.paused ? 0 : dt);
        this.area.textContent = player.area;
        if (this.dev)
            this.diagnostics.textContent = JSON.stringify({
                ...player,
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
let screen = new VillageScreen();
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = new VillageScreen();
});
