import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { drawPoseThumbnail, drawPunch } from './punch-drawing.js';
import { PunchPlayer, punchTiming, samplePunch } from './punch-model.js';
function element(id) {
    return document.getElementById(id);
}
class PunchScreen {
    player = new PunchPlayer();
    events = new AbortController();
    canvases = [
        element('raw'),
        element('connected'),
    ];
    image = new Image();
    resize = new ResizeObserver(() => this.draw());
    height = 240;
    background = 'light';
    guides = false;
    request = 0;
    previous = 0;
    disposed = false;
    constructor() {
        registerEmbeddedScene(this.dispose);
        if (new URLSearchParams(location.search).get('embedded') === '1') {
            document.documentElement.dataset.embedded = 'true';
            window.addEventListener('resource-scene-dispose', this.dispose, {
                signal: this.events.signal,
            });
        }
        window.addEventListener('pagehide', this.dispose, { once: true });
    }
    async start() {
        this.image.src =
            '../../../../public/assets/maplestory/ataho-punch-continuity/20261013/poses-02.png';
        try {
            await this.image.decode();
            if (this.disposed)
                return;
            if (this.image.naturalWidth !== 1536 || this.image.naturalHeight !== 1024)
                throw new Error('자세 시트의 크기를 확인해 주세요.');
            if (matchMedia('(prefers-reduced-motion: reduce)').matches)
                this.player.setLooping(false);
            element('loop').checked = this.player.snapshot.looping;
            this.bind();
            this.makeThumbnails();
            this.canvases.forEach((canvas) => this.resize.observe(canvas));
            element('controls').disabled = false;
            this.draw();
            this.request = requestAnimationFrame(this.tick);
        }
        catch (error) {
            element('status').textContent =
                error instanceof Error ? error.message : '그림을 불러오지 못했어요.';
            this.dispose();
        }
    }
    dispose = () => {
        if (this.disposed)
            return;
        this.disposed = true;
        this.events.abort();
        this.resize.disconnect();
        cancelAnimationFrame(this.request);
    };
    bind() {
        const options = { signal: this.events.signal };
        element('punch').addEventListener('click', () => this.player.punch(), options);
        element('pause').addEventListener('click', () => this.player.setPaused(!this.player.snapshot.paused), options);
        element('loop').addEventListener('change', (event) => this.player.setLooping(event.currentTarget.checked), options);
        element('speed').addEventListener('change', (event) => this.player.setSpeed(Number(event.currentTarget.value)), options);
        element('size').addEventListener('change', (event) => {
            this.height = Number(event.currentTarget.value);
        }, options);
        element('background').addEventListener('change', (event) => {
            this.background =
                event.currentTarget.value === 'dark'
                    ? 'dark'
                    : 'light';
        }, options);
        element('guides').addEventListener('change', (event) => {
            this.guides = event.currentTarget.checked;
        }, options);
        element('timeline').addEventListener('input', (event) => this.player.seek(Number(event.currentTarget.value) / 1000), options);
        window.addEventListener('keydown', (event) => {
            if (event.repeat ||
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLSelectElement)
                return;
            if (event.code === 'KeyJ')
                this.player.punch();
            if (event.code === 'Space' &&
                !(event.target instanceof HTMLButtonElement)) {
                event.preventDefault();
                this.player.setPaused(!this.player.snapshot.paused);
            }
        }, options);
        window.addEventListener('blur', () => {
            this.previous = 0;
        }, options);
        document.addEventListener('visibilitychange', () => {
            this.previous = 0;
        }, options);
    }
    makeThumbnails() {
        for (let index = 0; index < 8; index += 1) {
            const figure = document.createElement('div');
            const canvas = document.createElement('canvas');
            canvas.width = 96;
            canvas.height = 128;
            canvas.setAttribute('aria-label', `생성 자세 ${index + 1}`);
            drawPoseThumbnail(canvas.getContext('2d'), this.image, index);
            const caption = document.createElement('span');
            caption.textContent = `${index + 1}`;
            figure.append(canvas, caption);
            element('poses').append(figure);
        }
    }
    tick = (time) => {
        const delta = this.previous && !document.hidden
            ? Math.min(0.05, (time - this.previous) / 1000)
            : 0;
        this.previous = time;
        this.player.update(delta);
        this.draw();
        this.request = requestAnimationFrame(this.tick);
    };
    draw() {
        if (this.disposed || !this.image.complete || !this.image.naturalWidth)
            return;
        const snapshot = this.player.snapshot;
        const ratio = Math.min(2, devicePixelRatio || 1);
        for (const [index, canvas] of this.canvases.entries()) {
            const width = Math.round(canvas.getBoundingClientRect().width * ratio);
            const height = Math.round((width * 350) / 480);
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            const context = canvas.getContext('2d');
            context.setTransform(width / 480, 0, 0, height / 350, 0, 0);
            drawPunch(context, this.image, snapshot, {
                mode: index === 0 ? 'raw' : 'connected',
                height: this.height,
                background: this.background,
                guides: this.guides,
            });
        }
        const pose = samplePunch(snapshot);
        element('status').textContent =
            `${pose.label} · ${snapshot.attackTime?.toFixed(2) ?? '—'}초${snapshot.paused ? ' · 정지' : ''}`;
        element('pause').textContent = snapshot.paused
            ? '계속 재생 · Space'
            : '일시정지 · Space';
        element('punch').disabled =
            snapshot.attackTime !== null &&
                snapshot.attackTime < punchTiming.duration;
        element('timeline').value = String(Math.round((snapshot.attackTime ?? 0) * 1000));
        document.body.dataset.pose = String(pose.frame);
        document.body.dataset.impacts = String(snapshot.impacts);
        document.body.dataset.paused = String(snapshot.paused);
    }
}
void new PunchScreen().start();
