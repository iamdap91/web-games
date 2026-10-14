import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { comboMotions } from './motions.js';
import { ComboPlayer } from './player.js';
import {
  drawCombo,
  stageWidth,
  stageHeight,
  type DrawingOptions,
} from './drawing.js';
import {
  frameKey,
  loadComboFrames,
  type SourceFrame,
} from './source-frames.js';
import type { ComboMotion } from './types.js';

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`화면 요소가 없습니다: ${selector}`);
  return result;
}

class ComboScreen {
  private readonly canvas = element<HTMLCanvasElement>('#stage');
  private readonly context = this.canvas.getContext('2d')!;
  private readonly status = element<HTMLOutputElement>('#status');
  private readonly timeline = element<HTMLInputElement>('#timeline');
  private readonly pauseButton = element<HTMLButtonElement>('#pause');
  private readonly player = new ComboPlayer(comboMotions[0]!);
  private selectedMotion = comboMotions[0]!;
  private readonly events = new AbortController();
  private readonly resize = new ResizeObserver(() => this.resizeCanvas());
  private frames: ReadonlyMap<string, SourceFrame> = new Map();
  private options: DrawingOptions = { scale: 3, presentation: 'full' };
  private frameButtons: HTMLButtonElement[] = [];
  private frameRequest = 0;
  private previousTime = 0;
  private disposed = false;

  async start(): Promise<void> {
    registerEmbeddedScene(this.dispose);
    window.addEventListener('pagehide', this.dispose, {
      signal: this.events.signal,
    });
    try {
      this.frames = await loadComboFrames(comboMotions);
      if (this.disposed) return;
      this.createMotionButtons();
      this.bindInput();
      this.select(comboMotions[0]!);
      element<HTMLFieldSetElement>('#controls').disabled = false;
      this.timeline.disabled = false;
      element<HTMLButtonElement>('#previous').disabled = false;
      element<HTMLButtonElement>('#next').disabled = false;
      this.resize.observe(this.canvas);
      this.resizeCanvas();
      this.frameRequest = requestAnimationFrame(this.tick);
    } catch (error: unknown) {
      this.status.textContent =
        error instanceof Error ? error.message : '그림을 불러오지 못했어요.';
      this.dispose();
    }
  }

  dispose = (): void => {
    this.disposed = true;
    this.events.abort();
    this.resize.disconnect();
    cancelAnimationFrame(this.frameRequest);
  };

  private createMotionButtons(): void {
    const container = element('#motions');
    for (const [index, motion] of comboMotions.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.motion = motion.id;
      button.setAttribute('aria-pressed', 'false');
      button.append(document.createTextNode(`${index + 1}. ${motion.title}`));
      const subtitle = document.createElement('small');
      subtitle.textContent =
        motion.priority === 'recommended'
          ? '먼저 살펴볼 동작'
          : '초기 시안 · 채택 보류';
      button.append(subtitle);
      button.addEventListener('click', () => this.select(motion), {
        signal: this.events.signal,
      });
      container.append(button);
    }
  }

  private select(motion: ComboMotion): void {
    this.selectedMotion = motion;
    const supplemented =
      element<HTMLSelectElement>('#supplement').value === 'supplemented' &&
      !!motion.supplementedSteps;
    const activeMotion = supplemented
      ? {
          ...motion,
          steps: motion.supplementedSteps!,
          review: motion.supplementedReview ?? motion.review,
          missingPose: motion.supplementedMissingPose,
        }
      : motion;
    this.player.play(activeMotion);
    element('#supplement-label').hidden = !motion.supplementedSteps;
    element('#motion-title').textContent = motion.title;
    element('#summary').textContent = motion.summary;
    element('#review').textContent = activeMotion.review;
    element('#priority').textContent =
      motion.priority === 'recommended' ? '우선 추천' : '채택 보류';
    const missing = element('#missing');
    missing.hidden = !activeMotion.missingPose;
    missing.textContent = activeMotion.missingPose
      ? `추가 그림 후보: ${activeMotion.missingPose}`
      : '';
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-motion]',
    )) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.motion === motion.id),
      );
    }
    this.frameButtons = activeMotion.steps.map((step, index) => {
      const source = this.frames.get(frameKey(step))!;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.step = String(index);
      button.title = `${source.label} #${step.frame} · ${step.durationMs}ms`;
      const image = document.createElement('img');
      image.src = source.image.src;
      image.alt = `${step.phase} · ${source.label} #${step.frame}`;
      const label = document.createElement('span');
      label.textContent = `${index + 1}. ${step.phase}`;
      const timing = document.createElement('span');
      timing.textContent = `${source.kind === 'generated' ? '생성 보강' : `원본 #${step.frame}`} · ${step.durationMs}ms`;
      button.append(image, label, timing);
      return button;
    });
    element('#frames').replaceChildren(...this.frameButtons);
    this.canvas.setAttribute(
      'aria-label',
      `${motion.title} · 아타호 동작 미리보기`,
    );
    this.render();
  }

  private bindInput(): void {
    const options = { signal: this.events.signal };
    element('#frames').addEventListener(
      'click',
      (event) => {
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('button[data-step]')
            : null;
        if (target) this.player.showStep(Number(target.dataset.step));
      },
      options,
    );
    element('#supplement').addEventListener(
      'change',
      () => this.select(this.selectedMotion),
      options,
    );
    this.pauseButton.addEventListener(
      'click',
      () => this.player.setPaused(!this.player.snapshot.paused),
      options,
    );
    element('#restart').addEventListener(
      'click',
      () => this.player.play(),
      options,
    );
    element<HTMLSelectElement>('#speed').addEventListener(
      'change',
      (event) => {
        this.player.setSpeed(
          Number((event.currentTarget as HTMLSelectElement).value),
        );
      },
      options,
    );
    element<HTMLSelectElement>('#scale').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          scale:
            (event.currentTarget as HTMLSelectElement).value === '2' ? 2 : 3,
        };
      },
      options,
    );
    element<HTMLSelectElement>('#presentation').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          presentation:
            (event.currentTarget as HTMLSelectElement).value === 'poses'
              ? 'poses'
              : (event.currentTarget as HTMLSelectElement).value === 'movement'
                ? 'movement'
                : 'full',
        };
      },
      options,
    );
    element<HTMLInputElement>('#repeat').addEventListener(
      'change',
      (event) => {
        this.player.setRepeating(
          (event.currentTarget as HTMLInputElement).checked,
        );
      },
      options,
    );
    this.timeline.addEventListener(
      'input',
      () => {
        this.player.seek(
          (Number(this.timeline.value) / 1000) *
            this.player.snapshot.durationMs,
        );
      },
      options,
    );
    element('#previous').addEventListener(
      'click',
      () => this.player.showStep(this.player.snapshot.stepIndex - 1),
      options,
    );
    element('#next').addEventListener(
      'click',
      () => this.player.showStep(this.player.snapshot.stepIndex + 1),
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
        const selected = comboMotions[Number(event.key) - 1];
        if (selected) this.select(selected);
        if (event.code === 'Space') {
          event.preventDefault();
          this.player.setPaused(!this.player.snapshot.paused);
        }
        if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
          event.preventDefault();
          this.player.showStep(
            this.player.snapshot.stepIndex +
              (event.code === 'ArrowLeft' ? -1 : 1),
          );
        }
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
    window.addEventListener(
      'blur',
      () => {
        this.previousTime = 0;
      },
      options,
    );
  }

  private resizeCanvas(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = this.canvas.getBoundingClientRect().width;
    this.canvas.width = Math.max(1, Math.round(width * ratio));
    this.canvas.height = Math.max(
      1,
      Math.round((width / stageWidth) * stageHeight * ratio),
    );
    this.context.setTransform(
      this.canvas.width / stageWidth,
      0,
      0,
      this.canvas.height / stageHeight,
      0,
      0,
    );
    this.render();
  }

  private render(): void {
    const snapshot = this.player.snapshot;
    drawCombo(this.context, snapshot, this.frames, this.options);
    this.timeline.value = String(
      Math.round((snapshot.elapsedMs / snapshot.durationMs) * 1000),
    );
    this.pauseButton.textContent = snapshot.paused ? '재생' : '일시정지';
    this.status.textContent = `${snapshot.step.phase} · 자세 ${snapshot.stepIndex + 1}/${snapshot.motion.steps.length} · ${(snapshot.elapsedMs / 1000).toFixed(2)}초`;
    this.canvas.dataset.motion = snapshot.motion.id;
    this.canvas.dataset.step = String(snapshot.stepIndex);
    this.canvas.dataset.paused = String(snapshot.paused);
    this.frameButtons.forEach((button, index) =>
      button.classList.toggle('active', index === snapshot.stepIndex),
    );
  }

  private tick = (time: number): void => {
    if (this.disposed) return;
    const delta = this.previousTime
      ? Math.min(80, time - this.previousTime)
      : 0;
    this.previousTime = time;
    this.player.update(delta);
    this.render();
    this.frameRequest = requestAnimationFrame(this.tick);
  };
}

void new ComboScreen().start();
