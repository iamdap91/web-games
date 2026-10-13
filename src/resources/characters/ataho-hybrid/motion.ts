import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import {
  MotionPreview,
  comparisonRules,
  type PreviewMotion,
} from './motion-preview.js';
import {
  loadFrameTextures,
  loadHybridImages,
  MotionScene,
} from './motion-scene.js';
import type { SpriteTextures } from '../../../rendering/sprite-textures.js';

const labels: Record<PreviewMotion, string> = {
  idle: '대기',
  walk: '걷기',
  punch: '정권',
  kick: '회전발차기',
};

class MotionComparison {
  private readonly preview = new MotionPreview();
  private readonly events = new AbortController();
  private readonly scenes: MotionScene[] = [];
  private textures: SpriteTextures | null = null;
  private frameRequest = 0;
  private previousTime = 0;
  private disposed = false;

  constructor() {
    registerEmbeddedScene(this.dispose);
  }

  async start(): Promise<void> {
    const status = document.querySelector<HTMLElement>('#status')!;
    try {
      const [textures, images] = await Promise.all([
        loadFrameTextures().then((textures) => {
          this.textures = textures;
          return textures;
        }),
        loadHybridImages(),
      ]);
      this.textures = textures;
      if (this.disposed) {
        textures.dispose();
        return;
      }
      this.scenes.push(
        new MotionScene(document.querySelector<HTMLElement>('#frame-stage')!, {
          kind: 'frame',
          textures,
        }),
        new MotionScene(document.querySelector<HTMLElement>('#hybrid-stage')!, {
          kind: 'hybrid',
          images,
        }),
      );
      this.bindInput();
      document.querySelector<HTMLFieldSetElement>(
        '#motion-controls',
      )!.disabled = false;
      this.frameRequest = requestAnimationFrame(this.tick);
    } catch (error: unknown) {
      status.textContent =
        error instanceof Error
          ? error.message
          : '비교 장면을 준비하지 못했어요.';
      this.dispose();
    }
  }

  dispose = (): void => {
    this.disposed = true;
    this.events.abort();
    cancelAnimationFrame(this.frameRequest);
    this.scenes.forEach((scene) => scene.dispose());
    this.textures?.dispose();
  };

  private bindInput(): void {
    const options = { signal: this.events.signal };
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-play]',
    )) {
      const motion = button.dataset.play;
      if (
        motion === 'idle' ||
        motion === 'walk' ||
        motion === 'punch' ||
        motion === 'kick'
      )
        button.addEventListener(
          'click',
          () => this.preview.play(motion),
          options,
        );
    }
    document
      .querySelector<HTMLButtonElement>('#pause')!
      .addEventListener(
        'click',
        () => this.preview.setPaused(!this.preview.snapshot.paused),
        options,
      );
    document.querySelector<HTMLInputElement>('#slow')!.addEventListener(
      'change',
      (event) => {
        this.preview.setSpeed(
          (event.currentTarget as HTMLInputElement).checked ? 0.25 : 1,
        );
      },
      options,
    );
    document.querySelector<HTMLInputElement>('#bones')!.addEventListener(
      'change',
      (event) => {
        this.scenes.forEach((scene) =>
          scene.setBones((event.currentTarget as HTMLInputElement).checked),
        );
      },
      options,
    );
    document.querySelector<HTMLSelectElement>('#size')!.addEventListener(
      'change',
      (event) => {
        const size =
          (event.currentTarget as HTMLSelectElement).value === '112'
            ? 112
            : 240;
        this.scenes.forEach((scene) => scene.setDisplayHeight(size));
      },
      options,
    );
    document.querySelector<HTMLInputElement>('#timeline')!.addEventListener(
      'input',
      (event) => {
        this.preview.seek(
          Number((event.currentTarget as HTMLInputElement).value) / 1000,
        );
      },
      options,
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.repeat
        )
          return;
        if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
          event.preventDefault();
          this.preview.walk({ direction: event.code === 'ArrowLeft' ? -1 : 1 });
        } else if (event.code === 'KeyJ') this.preview.play('punch');
        else if (event.code === 'KeyK') this.preview.play('kick');
        else if (event.code === 'Space') {
          event.preventDefault();
          this.preview.setPaused(!this.preview.snapshot.paused);
        }
      },
      options,
    );
    window.addEventListener(
      'keyup',
      (event) => {
        if (event.code === 'ArrowLeft' || event.code === 'ArrowRight')
          this.preview.stopWalking();
      },
      options,
    );
    window.addEventListener(
      'blur',
      () => {
        this.preview.stopWalking();
        this.previousTime = 0;
      },
      options,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.previousTime = 0;
      },
      options,
    );
    window.addEventListener('pagehide', this.dispose, options);
  }

  private readonly tick = (now: number): void => {
    const delta = this.previousTime
      ? Math.min(0.05, (now - this.previousTime) / 1000)
      : 0;
    this.previousTime = now;
    this.preview.update(delta);
    const snapshot = this.preview.snapshot;
    const [frameDetail, hybridDetail] = this.scenes.map((scene) =>
      scene.draw(snapshot),
    );
    document.querySelector<HTMLElement>('#frame-detail')!.textContent =
      frameDetail!;
    document.querySelector<HTMLElement>('#hybrid-detail')!.textContent =
      hybridDetail!;
    const attack =
      snapshot.motion === 'punch' || snapshot.motion === 'kick'
        ? comparisonRules.attacks[snapshot.motion]
        : null;
    document.querySelector<HTMLElement>('#status')!.textContent = [
      labels[snapshot.motion],
      `${snapshot.time.toFixed(2)}초`,
      snapshot.frozen
        ? '타격 · 히트스톱'
        : snapshot.paused
          ? '일시정지'
          : snapshot.finished
            ? '복귀 완료'
            : '',
    ]
      .filter(Boolean)
      .join(' · ');
    document.querySelector<HTMLButtonElement>('#pause')!.textContent =
      snapshot.paused ? '계속 재생' : '일시정지';
    const timeline = document.querySelector<HTMLInputElement>('#timeline')!;
    timeline.disabled = !attack;
    timeline.value = String(
      attack ? Math.round((snapshot.time / attack.duration) * 1000) : 0,
    );
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-play]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.play === snapshot.motion),
      );
    this.frameRequest = requestAnimationFrame(this.tick);
  };
}

void new MotionComparison().start();
