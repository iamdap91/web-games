import biwol from '../../../../resources/companion-basic-attacks/biwol.json' with { type: 'json' };
import yeonmuk from '../../../../resources/companion-basic-attacks/yeonmuk.json' with { type: 'json' };
import biwolAdditions from '../../../../resources/companion-basic-attacks/biwol-additions.json' with { type: 'json' };
import yeonmukAdditions from '../../../../resources/companion-basic-attacks/yeonmuk-additions.json' with { type: 'json' };
import { attackDefinition } from './attack-definitions.js';
import { resourceUrl } from '../../catalog/resource-url.js';
import {
  AttackPlayback,
  sampleAttack,
  type AttackActor,
  type AttackFacing,
  type AttackStudy,
  type AttackMove,
} from './attack-motion.js';
import { renderAttack } from './attack-renderer.js';
import { encodeGif } from './gif-export.js';

interface AttackChoice {
  readonly move: AttackMove;
  readonly study: AttackStudy;
}

const choices: Readonly<Record<AttackActor, readonly AttackChoice[]>> = {
  biwol: [
    { move: 'basic', study: biwol },
    { move: 'lunge', study: biwolAdditions.motions.lunge },
    { move: 'spin', study: biwolAdditions.motions.spin },
    { move: 'plunge', study: biwolAdditions.motions.plunge },
  ],
  yeonmuk: [
    { move: 'basic', study: yeonmuk },
    { move: 'volley', study: yeonmukAdditions.motions.volley },
    { move: 'eruption', study: yeonmukAdditions.motions.eruption },
    { move: 'ink', study: yeonmukAdditions.motions.ink },
  ],
};

function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error('화면 요소를 찾을 수 없습니다: ' + selector);
  return found;
}

class AttackCard {
  readonly playback = new AttackPlayback();
  private readonly article: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly output: HTMLOutputElement;
  private readonly slider: HTMLInputElement;
  private readonly toggle: HTMLButtonElement;
  private readonly download: HTMLAnchorElement;
  private gifUrl: string | undefined;
  private move: AttackMove = 'basic';
  private study: AttackStudy;

  constructor(
    readonly actor: AttackActor,
    choices: readonly AttackChoice[],
    private readonly images: ReadonlyMap<string, HTMLImageElement>,
    private readonly settings: () => { facing: AttackFacing; light: boolean },
    signal: AbortSignal,
  ) {
    this.study = choices[0]!.study;
    this.article = element('#' + actor);
    this.canvas = element('canvas', this.article);
    this.output = element('output', this.article);
    this.slider = element('.timeline', this.article);
    this.toggle = element('[data-action="toggle"]', this.article);
    this.download = element('.download', this.article);
    this.toggle.addEventListener('click', () => this.playback.toggle(), {
      signal,
    });
    element('[data-action="restart"]', this.article).addEventListener(
      'click',
      () => this.playback.restart(),
      { signal },
    );
    element('[data-action="step"]', this.article).addEventListener(
      'click',
      () => this.playback.step(),
      { signal },
    );
    element<HTMLInputElement>(
      '[data-action="repeat"]',
      this.article,
    ).addEventListener(
      'change',
      (event) => {
        this.playback.setRepeat(
          (event.currentTarget as HTMLInputElement).checked,
        );
      },
      { signal },
    );
    this.slider.addEventListener(
      'input',
      () => this.playback.seek(Number(this.slider.value) / 1000),
      { signal },
    );
    element('[data-action="gif"]', this.article).addEventListener(
      'click',
      () => {
        void this.exportGif().catch((error: unknown) => {
          this.output.textContent =
            error instanceof Error ? error.message : 'GIF 저장에 실패했습니다.';
        });
      },
      { signal },
    );
    const selector = element<HTMLSelectElement>(
      '[data-role="motion"]',
      this.article,
    );
    selector.replaceChildren(
      ...choices.map((choice) => {
        const option = document.createElement('option');
        option.value = choice.move;
        option.textContent =
          attackDefinition(actor, choice.move).label +
          (choice.move === 'basic' ? ' (기본)' : '');
        return option;
      }),
    );
    selector.addEventListener(
      'change',
      () => {
        const choice = choices.find((item) => item.move === selector.value);
        if (!choice) return;
        this.study = choice.study;
        this.move = choice.move;
        const definition = attackDefinition(actor, this.move);
        this.playback.selectDuration(definition.duration);
        this.slider.max = String(Math.round(definition.duration * 1000));
        element('[data-role="description"]', this.article).textContent =
          definition.description;
        this.reset();
      },
      { signal },
    );
    this.article
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) => {
        button.disabled = false;
      });
  }

  render(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round((width * 360) / 640);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas를 시작할 수 없습니다.');
    context.setTransform(width / 640, 0, 0, height / 360, 0, 0);
    context.imageSmoothingEnabled = false;
    const elapsed = this.playback.elapsed;
    renderAttack(context, this.study, this.images, {
      actor: this.actor,
      elapsed,
      ...this.settings(),
      move: this.move,
    });
    const sample = sampleAttack(
      this.actor,
      elapsed,
      this.settings().facing,
      this.move,
    );
    const frame = Math.min(
      this.study.directions[this.settings().facing].frames.length - 1,
      Math.floor(
        sample.bodyProgress *
          this.study.directions[this.settings().facing].frames.length,
      ),
    );
    this.output.textContent =
      elapsed.toFixed(2) +
      '초 · ' +
      sample.phase +
      ' · 몸 ' +
      (sample.idle ? '대기' : String(frame + 1) + '프레임') +
      ' · 명중 ' +
      (sample.hitCount + '회');
    this.slider.value = String(Math.round(elapsed * 1000));
    this.toggle.textContent = this.playback.isPlaying ? '일시정지' : '재생';
    this.canvas.dataset.phase = sample.phase;
    this.canvas.dataset.elapsed = elapsed.toFixed(3);
    this.canvas.dataset.hitCount = String(sample.hitCount);
    this.canvas.dataset.move = this.move;
    this.canvas.dataset.bodyFrame = sample.idle ? 'idle' : String(frame);
  }

  reset(): void {
    this.playback.restart();
    this.download.hidden = true;
    if (this.gifUrl) URL.revokeObjectURL(this.gifUrl);
    this.gifUrl = undefined;
  }

  dispose(): void {
    if (this.gifUrl) URL.revokeObjectURL(this.gifUrl);
  }

  private async exportGif(): Promise<void> {
    const button = element<HTMLButtonElement>(
      '[data-action="gif"]',
      this.article,
    );
    button.disabled = true;
    button.textContent = 'GIF 만드는 중…';
    const settings = this.settings();
    const move = this.move;
    const study = this.study;
    const duration = this.playback.durationSeconds;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    try {
      const currentSettings = this.settings();
      if (
        this.move !== move ||
        currentSettings.facing !== settings.facing ||
        currentSettings.light !== settings.light
      )
        return;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('GIF용 Canvas를 만들 수 없습니다.');
      context.imageSmoothingEnabled = false;
      const frames: ImageData[] = [];
      for (let index = 0; index < Math.ceil(duration / 0.03); index++) {
        renderAttack(context, study, this.images, {
          actor: this.actor,
          elapsed: Math.min(duration, index * 0.03),
          move,
          ...settings,
        });
        frames.push(context.getImageData(0, 0, canvas.width, canvas.height));
      }
      const blob = encodeGif(frames, 3);
      if (this.gifUrl) URL.revokeObjectURL(this.gifUrl);
      this.gifUrl = URL.createObjectURL(blob);
      this.download.href = this.gifUrl;
      this.download.download =
        this.actor + '-' + move + '-' + settings.facing + '.gif';
      this.download.textContent =
        'GIF 저장 (' + Math.round(blob.size / 1024) + 'KB)';
      this.download.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = '이 방향 GIF 만들기';
    }
  }
}

class CompanionAttackPreview {
  private readonly events = new AbortController();
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly cards: AttackCard[] = [];
  private animationFrame = 0;
  private previousTime = 0;
  private disposed = false;
  private readonly facing = element<HTMLSelectElement>('#facing');
  private readonly background = element<HTMLSelectElement>('#background');

  async start(): Promise<void> {
    const paths = new Set<string>();
    for (const choice of Object.values(choices).flat()) {
      for (const direction of Object.values(choice.study.directions)) {
        paths.add(direction.idle.localPath);
        for (const frame of direction.frames) paths.add(frame.localPath);
      }
    }
    await Promise.all(
      [...paths].map(async (path) => {
        const image = new Image();
        image.src = resourceUrl(path).href;
        await image.decode();
        this.images.set(path, image);
      }),
    );
    if (this.disposed) return;
    const { signal } = this.events;
    const settings = (): { facing: AttackFacing; light: boolean } => ({
      facing: this.facing.value === 'north-west' ? 'north-west' : 'south-east',
      light: this.background.value === 'light',
    });
    for (const actor of ['biwol', 'yeonmuk'] as const) {
      this.cards.push(
        new AttackCard(actor, choices[actor], this.images, settings, signal),
      );
    }
    this.facing.addEventListener(
      'change',
      () => this.cards.forEach((card) => card.reset()),
      { signal },
    );
    this.background.addEventListener(
      'change',
      () => this.cards.forEach((card) => card.reset()),
      { signal },
    );
    element<HTMLSelectElement>('#speed').addEventListener(
      'change',
      (event) => {
        const speed = Number((event.currentTarget as HTMLSelectElement).value);
        this.cards.forEach((card) => card.playback.setSpeed(speed));
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.previousTime = 0;
      },
      { signal },
    );
    window.addEventListener(
      'pagehide',
      (event: PageTransitionEvent) => {
        if (!event.persisted) this.dispose();
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      () => {
        this.previousTime = 0;
      },
      { signal },
    );
    element('#status').textContent =
      '두 캐릭터 · 각 공격 4종 · 남동·북서 2방향 준비 완료';
    this.animationFrame = requestAnimationFrame(this.render);
  }

  private readonly render = (now: number): void => {
    if (this.disposed) return;
    const delta = this.previousTime
      ? Math.min(0.1, (now - this.previousTime) / 1000)
      : 0;
    this.previousTime = now;
    if (!document.hidden) {
      for (const card of this.cards) {
        card.playback.update(delta);
        card.render();
      }
    }
    this.animationFrame = requestAnimationFrame(this.render);
  };

  private dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.events.abort();
    this.cards.forEach((card) => card.dispose());
  }
}

const preview = new CompanionAttackPreview();
void preview.start().catch((error: unknown) => {
  element('#status').textContent =
    error instanceof Error ? error.message : '재생 준비에 실패했습니다.';
});
