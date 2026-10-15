import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { comboMotions } from './motions.js';
import { ComboPlayer } from './player.js';
import { applySupplement } from './supplements.js';
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

const initialMotion = comboMotions[9]!;

const priorityLabels: Readonly<Record<ComboMotion['priority'], string>> = {
  selected: '채택',
  recommended: '추천',
  review: '검토 중',
  experimental: '보류',
};

const motionSections = [
  {
    id: 'single',
    label: '단독 기술',
    numbers: [
      1, 3, 4, 6, 8, 9, 19, 20, 22, 25, 26, 27, 28, 29, 30, 31, 32, 35, 36,
    ],
  },
  {
    id: 'chain',
    label: '복합 연계',
    numbers: [10, 11, 12, 13, 14, 15, 16, 17, 18, 23, 24, 33, 34],
  },
  { id: 'counter', label: '회피·반격', numbers: [2, 5, 21] },
  { id: 'support', label: '보조', numbers: [7] },
];

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`화면 요소가 없습니다: ${selector}`);
  return result;
}

function presentationChoice(
  choice: {
    readonly id: string;
    readonly label: string;
    readonly summary: string;
  },
  settings: {
    readonly name: string;
    readonly type: 'checkbox' | 'radio';
    readonly checked: boolean;
  },
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'presentation-choice';
  const input = document.createElement('input');
  input.type = settings.type;
  input.name = settings.name;
  input.value = choice.id;
  input.checked = settings.checked;
  const text = document.createElement('span');
  const title = document.createElement('span');
  title.className = 'choice-label';
  title.textContent = choice.label;
  title.id = `${settings.name}-${choice.id}-label`;
  input.setAttribute('aria-labelledby', title.id);
  const summary = document.createElement('span');
  summary.className = 'choice-summary';
  summary.id = `${settings.name}-${choice.id}-summary`;
  summary.textContent = choice.summary;
  input.setAttribute('aria-describedby', summary.id);
  text.append(title, summary);
  label.append(input, text);
  return label;
}

class ComboScreen {
  private readonly canvas = element<HTMLCanvasElement>('#stage');
  private readonly context = this.canvas.getContext('2d')!;
  private readonly status = element<HTMLOutputElement>('#status');
  private readonly timeline = element<HTMLInputElement>('#timeline');
  private readonly pauseButton = element<HTMLButtonElement>('#pause');
  private readonly player = new ComboPlayer(initialMotion);
  private selectedMotion = initialMotion;
  private selectedSection = 'all';
  private selectedPresentationId = 'base';
  private presentationReady = false;
  private readonly motionChoices = new Map<string, HTMLLabelElement>();
  private readonly sectionChoices = new Map<string, HTMLInputElement>();
  private readonly events = new AbortController();
  private readonly resize = new ResizeObserver(() => this.resizeCanvas());
  private frames: ReadonlyMap<string, SourceFrame> = new Map();
  private options: DrawingOptions = {
    scale: 3,
    showMovement: true,
    showContacts: true,
    enabledEffects: new Set<string>(),
  };
  private frameButtons: HTMLButtonElement[] = [];
  private frameRequest = 0;
  private previousTime = 0;
  private disposed = false;
  private gifReviewLoaded = false;

  async start(): Promise<void> {
    registerEmbeddedScene(this.dispose);
    window.addEventListener('pagehide', this.dispose, {
      signal: this.events.signal,
    });
    element<HTMLDetailsElement>('#gif-review').addEventListener(
      'toggle',
      (event) => {
        if ((event.currentTarget as HTMLDetailsElement).open)
          void this.loadGifReview();
      },
      { signal: this.events.signal },
    );
    try {
      this.frames = await loadComboFrames(comboMotions);
      if (this.disposed) return;
      this.createMotionOptions();
      this.bindInput();
      this.select(initialMotion);
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

  private createMotionOptions(): void {
    const sections = [
      {
        id: 'all',
        label: '전체',
        numbers: comboMotions.map((_, index) => index + 1),
      },
      ...motionSections,
    ];
    for (const section of sections) {
      const choice = document.createElement('label');
      choice.className = 'choice-button';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'motion-kind';
      input.value = section.id;
      input.checked = section.id === this.selectedSection;
      const title = document.createElement('span');
      title.className = 'choice-name';
      title.textContent = section.label;
      const count = document.createElement('span');
      count.className = 'choice-count';
      count.textContent = ` ${section.numbers.length}`;
      choice.append(input, title, count);
      this.sectionChoices.set(section.id, input);
      element('#motion-kinds').append(choice);
    }
    for (const motion of comboMotions) {
      const choice = document.createElement('label');
      choice.className = 'choice-button';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'motion';
      input.value = motion.id;
      input.checked = motion === this.selectedMotion;
      const title = document.createElement('span');
      title.className = 'choice-name';
      title.textContent = motion.title;
      choice.append(input, title);
      if (motion.presentations?.length || motion.effects?.length) {
        const badge = document.createElement('span');
        badge.className = 'choice-badge';
        badge.textContent = '연출';
        choice.append(badge);
      }
      this.motionChoices.set(motion.id, choice);
      element('#motion-options').append(choice);
    }
    this.filterMotions();
  }

  private filterMotions(): void {
    const section = motionSections.find(
      (item) => item.id === this.selectedSection,
    );
    const numbers = section ? new Set(section.numbers) : undefined;
    for (const [index, motion] of comboMotions.entries()) {
      this.motionChoices.get(motion.id)!.hidden =
        !!numbers && !numbers.has(index + 1);
    }
    for (const [id, input] of this.sectionChoices) {
      input.checked = id === this.selectedSection;
    }
    const count = section?.numbers.length ?? comboMotions.length;
    const playingElsewhere = this.motionChoices.get(
      this.selectedMotion.id,
    )!.hidden;
    element('#motion-count').textContent =
      `${count}개 동작${playingElsewhere ? ' · 현재 재생은 다른 종류의 동작입니다.' : ''}`;
  }

  private createPresentationOptions(motion: ComboMotion): void {
    const effects = element('#effect-options');
    effects.replaceChildren(
      ...(motion.effects ?? []).map((effect) =>
        presentationChoice(effect, {
          name: 'effect',
          type: 'checkbox',
          checked: this.options.enabledEffects.has(effect.id),
        }),
      ),
    );
    element('#effect-controls').hidden = !motion.effects?.length;
    this.updateEffectInputs();
    const container = element('#presentation-options');
    container.replaceChildren();
    const alternatives = motion.presentations ?? [];
    element('#timing-controls').hidden = !alternatives.length;
    const description = element('#presentation-description');
    description.hidden = alternatives.length < 2;
    description.textContent =
      alternatives.length > 1
        ? '박자 하나를 선택하면 처음부터 재생합니다.'
        : '';
    if (!alternatives.length) return;
    const choices =
      alternatives.length === 1
        ? alternatives
        : [
            {
              id: 'base',
              label: motion.presentationLabel ?? '기본 박자',
              summary:
                motion.presentationSummary ?? '기존 자세와 박자로 재생합니다.',
            },
            ...alternatives,
          ];
    for (const presentation of choices) {
      container.append(
        presentationChoice(presentation, {
          type: alternatives.length === 1 ? 'checkbox' : 'radio',
          name: 'presentation',
          checked: presentation.id === this.selectedPresentationId,
        }),
      );
    }
  }

  private updateEffectInputs(): void {
    for (const input of element(
      '#effect-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      input.disabled = !this.options.showMovement;
      input.checked =
        this.options.showMovement &&
        this.options.enabledEffects.has(input.value);
    }
  }

  private async loadGifReview(): Promise<void> {
    if (this.gifReviewLoaded) return;
    this.gifReviewLoaded = true;
    const gallery = element('#gif-gallery');
    try {
      const response = await fetch('review.html', {
        signal: this.events.signal,
      });
      if (!response.ok) throw new Error('GIF 비교 자료를 불러오지 못했어요.');
      const document = new DOMParser().parseFromString(
        await response.text(),
        'text/html',
      );
      if (this.disposed) return;
      const sections = [
        ...document.querySelectorAll('main > section, main > footer'),
      ];
      if (!sections.length) throw new Error('GIF 비교 자료가 비어 있어요.');
      gallery.replaceChildren(
        ...sections.map((section) => section.cloneNode(true)),
      );
      for (const link of gallery.querySelectorAll<HTMLAnchorElement>('a')) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
    } catch (error: unknown) {
      if (this.disposed) return;
      this.gifReviewLoaded = false;
      gallery.textContent = `${error instanceof Error ? error.message : 'GIF 자료를 불러오지 못했어요.'} 자료를 접었다가 다시 열어 주세요.`;
    }
  }

  private select(motion: ComboMotion): void {
    if (this.selectedMotion !== motion || !this.presentationReady) {
      this.selectedPresentationId = 'base';
      this.options = { ...this.options, enabledEffects: new Set<string>() };
      this.createPresentationOptions(motion);
      this.presentationReady = true;
    }
    this.selectedMotion = motion;
    const choice = this.motionChoices.get(motion.id)!;
    choice.querySelector('input')!.checked = true;
    if (choice.hidden) this.selectedSection = 'all';
    this.filterMotions();
    this.playSelectedMotion();
  }

  private playSelectedMotion(): void {
    const motion = this.selectedMotion;
    const presentation = motion.presentations?.find(
      (item) => item.id === this.selectedPresentationId,
    );
    const supplemented =
      element<HTMLSelectElement>('#supplement').value === 'supplemented' &&
      !!motion.supplementedSteps;
    const timedMotion = presentation
      ? { ...motion, steps: presentation.steps, review: presentation.review }
      : motion;
    const activeMotion = supplemented
      ? applySupplement(timedMotion)
      : timedMotion;
    this.player.play(activeMotion);
    element('#supplement-label').hidden = !motion.supplementedSteps;
    element('#motion-title').textContent = motion.title;
    element('#summary').textContent = motion.summary;
    element('#review').textContent = activeMotion.review;
    element('#priority').textContent = priorityLabels[motion.priority];
    const missing = element('#missing');
    missing.hidden = !activeMotion.missingPose;
    missing.textContent = activeMotion.missingPose
      ? `추가 그림 후보: ${activeMotion.missingPose}`
      : '';
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
    let elapsedMs = 0;
    let hit = 0;
    const hitButtons: HTMLButtonElement[] = [];
    for (const [index, step] of activeMotion.steps.entries()) {
      if (step.contact) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.step = String(index);
        button.textContent = `${++hit}타 · ${(elapsedMs / 1000).toFixed(2)}초`;
        button.title = step.phase;
        button.setAttribute(
          'aria-label',
          `${hit}타 타격 자세 보기 · ${step.phase}`,
        );
        hitButtons.push(button);
      }
      elapsedMs += step.durationMs;
    }
    element('#hits').replaceChildren(...hitButtons);
    element('#duration').textContent =
      `${hit ? `${hit}타 · ` : ''}${(elapsedMs / 1000).toFixed(2)}초`;
    this.render();
  }

  private bindInput(): void {
    const options = { signal: this.events.signal };
    element('#motion-kinds').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        this.selectedSection = event.target.value;
        this.filterMotions();
        element('#motion-options').scrollTop = 0;
      },
      options,
    );
    element('#motion-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const motionId = event.target.value;
        const motion = comboMotions.find((item) => item.id === motionId);
        if (motion) this.select(motion);
      },
      options,
    );
    element('#effect-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const enabledEffects = new Set(this.options.enabledEffects);
        if (event.target.checked) enabledEffects.add(event.target.value);
        else enabledEffects.delete(event.target.value);
        this.options = { ...this.options, enabledEffects };
        this.render();
      },
      options,
    );
    element('#presentation-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        this.selectedPresentationId = event.target.checked
          ? event.target.value
          : 'base';
        this.playSelectedMotion();
      },
      options,
    );
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
      () => this.playSelectedMotion(),
      options,
    );
    element('#hits').addEventListener(
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
    element<HTMLInputElement>('#movement').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          showMovement: (event.currentTarget as HTMLInputElement).checked,
        };
        const contacts = element<HTMLInputElement>('#contacts');
        contacts.disabled = !this.options.showMovement;
        contacts.checked =
          this.options.showMovement && this.options.showContacts;
        this.updateEffectInputs();
        this.render();
      },
      options,
    );
    element<HTMLInputElement>('#contacts').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          showContacts: (event.currentTarget as HTMLInputElement).checked,
        };
        this.render();
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
          event.defaultPrevented ||
          event.repeat ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          (event.code === 'Space' &&
            event.target instanceof HTMLButtonElement) ||
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          (event.target instanceof HTMLElement &&
            (event.target.isContentEditable ||
              !!event.target.closest('summary')))
        )
          return;
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
    const presentation = this.selectedMotion.presentations?.find(
      (item) => item.id === this.selectedPresentationId,
    );
    const effects = this.options.showMovement
      ? (snapshot.motion.effects ?? []).filter((effect) =>
          this.options.enabledEffects.has(effect.id),
        )
      : [];
    this.canvas.setAttribute(
      'aria-label',
      [
        snapshot.motion.title,
        presentation?.label ??
          this.selectedMotion.presentationLabel ??
          '기본 박자',
        ...effects.map((effect) => effect.label),
        '아타호 동작 미리보기',
      ].join(' · '),
    );
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
