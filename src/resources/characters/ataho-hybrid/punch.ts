import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { drawPoseThumbnail, drawPunch } from './punch-drawing.js';
import { PunchPlayer, punchTiming, samplePunch } from './punch-model.js';

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

class PunchScreen {
  private readonly player = new PunchPlayer();
  private readonly events = new AbortController();
  private readonly canvases = [
    element<HTMLCanvasElement>('raw'),
    element<HTMLCanvasElement>('connected'),
  ];
  private readonly image = new Image();
  private readonly resize = new ResizeObserver(() => this.draw());
  private height = 240;
  private background: 'light' | 'dark' = 'light';
  private guides = false;
  private request = 0;
  private previous = 0;
  private disposed = false;

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

  async start(): Promise<void> {
    this.image.src =
      '../../../../public/assets/maplestory/ataho-punch-continuity/20261013/poses-02.png';
    try {
      await this.image.decode();
      if (this.disposed) return;
      if (this.image.naturalWidth !== 1536 || this.image.naturalHeight !== 1024)
        throw new Error('자세 시트의 크기를 확인해 주세요.');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches)
        this.player.setLooping(false);
      element<HTMLInputElement>('loop').checked = this.player.snapshot.looping;
      this.bind();
      this.makeThumbnails();
      this.canvases.forEach((canvas) => this.resize.observe(canvas));
      element<HTMLFieldSetElement>('controls').disabled = false;
      this.draw();
      this.request = requestAnimationFrame(this.tick);
    } catch (error: unknown) {
      element<HTMLOutputElement>('status').textContent =
        error instanceof Error ? error.message : '그림을 불러오지 못했어요.';
      this.dispose();
    }
  }

  dispose = (): void => {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this.resize.disconnect();
    cancelAnimationFrame(this.request);
  };

  private bind(): void {
    const options = { signal: this.events.signal };
    element<HTMLButtonElement>('punch').addEventListener(
      'click',
      () => this.player.punch(),
      options,
    );
    element<HTMLButtonElement>('pause').addEventListener(
      'click',
      () => this.player.setPaused(!this.player.snapshot.paused),
      options,
    );
    element<HTMLInputElement>('loop').addEventListener(
      'change',
      (event) =>
        this.player.setLooping(
          (event.currentTarget as HTMLInputElement).checked,
        ),
      options,
    );
    element<HTMLSelectElement>('speed').addEventListener(
      'change',
      (event) =>
        this.player.setSpeed(
          Number((event.currentTarget as HTMLSelectElement).value),
        ),
      options,
    );
    element<HTMLSelectElement>('size').addEventListener(
      'change',
      (event) => {
        this.height = Number((event.currentTarget as HTMLSelectElement).value);
      },
      options,
    );
    element<HTMLSelectElement>('background').addEventListener(
      'change',
      (event) => {
        this.background =
          (event.currentTarget as HTMLSelectElement).value === 'dark'
            ? 'dark'
            : 'light';
      },
      options,
    );
    element<HTMLInputElement>('guides').addEventListener(
      'change',
      (event) => {
        this.guides = (event.currentTarget as HTMLInputElement).checked;
      },
      options,
    );
    element<HTMLInputElement>('timeline').addEventListener(
      'input',
      (event) =>
        this.player.seek(
          Number((event.currentTarget as HTMLInputElement).value) / 1000,
        ),
      options,
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          event.repeat ||
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement
        )
          return;
        if (event.code === 'KeyJ') this.player.punch();
        if (
          event.code === 'Space' &&
          !(event.target instanceof HTMLButtonElement)
        ) {
          event.preventDefault();
          this.player.setPaused(!this.player.snapshot.paused);
        }
      },
      options,
    );
    window.addEventListener(
      'blur',
      () => {
        this.previous = 0;
      },
      options,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.previous = 0;
      },
      options,
    );
  }

  private makeThumbnails(): void {
    for (let index = 0; index < 8; index += 1) {
      const figure = document.createElement('div');
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 128;
      canvas.setAttribute('aria-label', `생성 자세 ${index + 1}`);
      drawPoseThumbnail(canvas.getContext('2d')!, this.image, index);
      const caption = document.createElement('span');
      caption.textContent = `${index + 1}`;
      figure.append(canvas, caption);
      element('poses').append(figure);
    }
  }

  private readonly tick = (time: number): void => {
    const delta =
      this.previous && !document.hidden
        ? Math.min(0.05, (time - this.previous) / 1000)
        : 0;
    this.previous = time;
    this.player.update(delta);
    this.draw();
    this.request = requestAnimationFrame(this.tick);
  };

  private draw(): void {
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
      const context = canvas.getContext('2d')!;
      context.setTransform(width / 480, 0, 0, height / 350, 0, 0);
      drawPunch(context, this.image, snapshot, {
        mode: index === 0 ? 'raw' : 'connected',
        height: this.height,
        background: this.background,
        guides: this.guides,
      });
    }
    const pose = samplePunch(snapshot);
    element<HTMLOutputElement>('status').textContent =
      `${pose.label} · ${snapshot.attackTime?.toFixed(2) ?? '—'}초${snapshot.paused ? ' · 정지' : ''}`;
    element<HTMLButtonElement>('pause').textContent = snapshot.paused
      ? '계속 재생 · Space'
      : '일시정지 · Space';
    element<HTMLButtonElement>('punch').disabled =
      snapshot.attackTime !== null &&
      snapshot.attackTime < punchTiming.duration;
    element<HTMLInputElement>('timeline').value = String(
      Math.round((snapshot.attackTime ?? 0) * 1000),
    );
    document.body.dataset.pose = String(pose.frame);
    document.body.dataset.impacts = String(snapshot.impacts);
    document.body.dataset.paused = String(snapshot.paused);
  }
}

void new PunchScreen().start();
