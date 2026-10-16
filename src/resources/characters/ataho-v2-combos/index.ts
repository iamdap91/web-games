import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { activeMotions, motionSections } from './motion-catalog.js';
import { ComboPlayer, comboDuration } from './player.js';
import { collectContactCues, finisherContactPhase } from './finisher-actors.js';
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
import { sampleKi } from './ki-sampling.js';
import { loadKiSpriteFrames } from './ki-sprites.js';
import { hasInkEffects } from './ink-effects.js';
import { loadInkSpriteFrames } from './ink-sprites.js';
import { collectSandbagContacts, contactHitStopMs } from './sandbag.js';
import { hasGroundEffects } from './ground-effects.js';
import { hasSpeedLines } from './speed-lines.js';
import {
  availableEmphasisModes,
  emphasisChoices,
  emphasisNeedsTarget,
} from './emphasis-effects.js';
import {
  availableCameraModes,
  cameraStagingChoices,
} from './camera-staging.js';
import {
  directionLabels,
  directionSelection,
  groupMotionOptions,
  motionDirection,
  motionOptionId,
  motionOptionTitle,
  type MotionOption,
} from './motion-options.js';

const initialMotion = activeMotions[0]!;
const motionOptions = groupMotionOptions(activeMotions);

const priorityLabels: Readonly<Record<ComboMotion['priority'], string>> = {
  selected: '채택',
  recommended: '추천',
  review: '검토 중',
  experimental: '보류',
};

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

function sceneChoice(
  choice: { readonly id: string; readonly label: string },
  name: 'camera' | 'emphasis',
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'choice-button';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = choice.id;
  const title = document.createElement('span');
  title.className = 'choice-name';
  title.textContent = choice.label;
  label.append(input, title);
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
  private selectedSection = 'attack';
  private selectedPresentationId = 'base';
  private presentationReady = false;
  private directionNotice = '';
  private readonly motionChoices = new Map<string, HTMLLabelElement>();
  private readonly sectionChoices = new Map<string, HTMLInputElement>();
  private readonly events = new AbortController();
  private readonly resize = new ResizeObserver(() => this.resizeCanvas());
  private frames: ReadonlyMap<string, SourceFrame> = new Map();
  private options: DrawingOptions = {
    scale: 3,
    showMovement: true,
    showContacts: true,
    showInkEffects: true,
    showSandbag: false,
    directionalImpacts: false,
    showGroundEffects: false,
    showCameraRecoil: false,
    cameraMode: 'none',
    emphasisMode: 'none',
    showSpeedLines: false,
    showFinisher: true,
    enabledEffects: new Set<string>(),
  };
  private frameButtons: HTMLButtonElement[] = [];
  private phaseButtons: HTMLButtonElement[] = [];
  private frameRequest = 0;
  private previousTime = 0;
  private disposed = false;
  private hitStopEnabled = false;

  private get inkEffectsEnabled(): boolean {
    return (
      this.options.showMovement &&
      !!this.options.showInkEffects &&
      hasInkEffects(this.selectedMotion)
    );
  }

  private updatePresentationInputs(
    settings: { readonly refreshHitStops?: boolean } = {},
  ): void {
    this.updateInkInputs();
    this.updateEffectInputs();
    const contacts = collectSandbagContacts(this.player.snapshot.motion, {
      scale: this.options.scale,
      enabledEffects: this.options.enabledEffects,
    });
    const finisher = element<HTMLInputElement>('#finisher-effects');
    element('#finisher-controls').hidden = !this.selectedMotion.finisher;
    finisher.disabled = !this.options.showMovement;
    finisher.checked =
      !finisher.disabled && this.options.showFinisher !== false;
    const target = element<HTMLInputElement>('#sandbag');
    target.disabled = !this.options.showMovement || !contacts.length;
    target.checked = !target.disabled && !!this.options.showSandbag;
    const hitStop = element<HTMLInputElement>('#hit-stop');
    hitStop.disabled = !target.checked;
    hitStop.checked = !hitStop.disabled && this.hitStopEnabled;
    const directional = element<HTMLInputElement>('#directional-impacts');
    directional.disabled =
      this.inkEffectsEnabled ||
      !this.options.showMovement ||
      !this.options.showContacts ||
      !contacts.length;
    directional.checked =
      !directional.disabled && !!this.options.directionalImpacts;
    directional.title = this.inkEffectsEnabled
      ? '수묵 공격 효과를 끄면 기존 공격별 충격 모양을 비교할 수 있습니다.'
      : '';
    const ground = element<HTMLInputElement>('#ground-effects');
    ground.disabled =
      !this.options.showMovement ||
      !hasGroundEffects(this.player.snapshot.motion);
    ground.checked = !ground.disabled && !!this.options.showGroundEffects;
    const speedLines = element<HTMLInputElement>('#speed-lines');
    speedLines.disabled =
      !this.options.showMovement || !hasSpeedLines(this.player.snapshot.motion);
    speedLines.checked = !speedLines.disabled && !!this.options.showSpeedLines;
    const camera = element<HTMLInputElement>('#camera-recoil');
    camera.disabled =
      !target.checked ||
      !contacts.some((contact, index) =>
        contactHitStopMs(contact, {
          finalContact: index === contacts.length - 1,
        }),
      );
    camera.checked = !camera.disabled && !!this.options.showCameraRecoil;
    this.updateCameraInputs();
    this.updateEmphasisInputs();
    if (settings.refreshHitStops !== false)
      this.player.setHitStops(
        hitStop.checked
          ? contacts.flatMap((contact, index) => {
              const durationMs = contactHitStopMs(contact, {
                finalContact: index === contacts.length - 1,
              });
              return durationMs ? [{ timeMs: contact.timeMs, durationMs }] : [];
            })
          : [],
      );
    element('#target-description').textContent = contacts.length
      ? '샌드백은 첫 타격 위치에 고정됩니다. 켜면 닿은 공격에만 충격 모양이 표시됩니다. 히트스톱은 강한 마무리 타격에 적용합니다.'
      : '이 동작에는 타격이 없어 샌드백 반응을 사용하지 않습니다.';
  }

  async start(): Promise<void> {
    registerEmbeddedScene(this.dispose);
    window.addEventListener('pagehide', this.dispose, {
      signal: this.events.signal,
    });
    try {
      const [bodyFrames, kiFrames, inkFrames] = await Promise.all([
        loadComboFrames(activeMotions),
        loadKiSpriteFrames(),
        loadInkSpriteFrames(),
      ]);
      this.frames = new Map([...bodyFrames, ...kiFrames, ...inkFrames]);
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

  private matchesSection(
    option: MotionOption,
    motions?: ReadonlySet<ComboMotion>,
  ): boolean {
    return !motions || option.motions.some((motion) => motions.has(motion));
  }

  private createMotionOptions(): void {
    const sections = [
      {
        id: 'all',
        label: '전체',
        motions: activeMotions,
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
      const motions = new Set(section.motions);
      count.textContent = ` ${motionOptions.filter((option) => this.matchesSection(option, motions)).length}`;
      choice.append(input, title, count);
      this.sectionChoices.set(section.id, input);
      element('#motion-kinds').append(choice);
    }
    for (const option of motionOptions) {
      const choice = document.createElement('label');
      choice.className = 'choice-button';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'motion';
      input.value = option.id;
      input.checked = option.id === motionOptionId(this.selectedMotion);
      const title = document.createElement('span');
      title.className = 'choice-name';
      title.textContent = option.title;
      choice.append(input, title);
      if (
        option.motions.some(
          (motion) =>
            motion.presentations?.length ||
            motion.ki ||
            motion.effects?.length ||
            availableCameraModes(motion).length > 1 ||
            availableEmphasisModes(motion).length > 1 ||
            hasSpeedLines(motion),
        )
      ) {
        const badge = document.createElement('span');
        badge.className = 'choice-badge';
        badge.textContent = '연출';
        choice.append(badge);
      }
      this.motionChoices.set(option.id, choice);
      element('#motion-options').append(choice);
    }
    this.filterMotions();
  }

  private filterMotions(): void {
    const section = motionSections.find(
      (item) => item.id === this.selectedSection,
    );
    const motions = section ? new Set(section.motions) : undefined;
    const visible = motionOptions.filter((option) =>
      this.matchesSection(option, motions),
    );
    for (const option of motionOptions) {
      this.motionChoices.get(option.id)!.hidden = !this.matchesSection(
        option,
        motions,
      );
    }
    for (const [id, input] of this.sectionChoices)
      input.checked = id === this.selectedSection;
    const playingElsewhere = this.motionChoices.get(
      motionOptionId(this.selectedMotion),
    )!.hidden;
    element('#motion-count').textContent =
      `${visible.length}개 동작${playingElsewhere ? ' · 현재 재생은 다른 종류의 동작입니다.' : ''}`;
  }

  private createDirectionOptions(motion: ComboMotion): void {
    const container = element('#direction-options');
    const option = motionOptions.find(
      (item) => item.id === motionOptionId(motion),
    )!;
    if (option.motions.length === 1 || motion.variant) {
      const fixed = document.createElement('span');
      fixed.className = 'direction-fixed';
      fixed.textContent = motion.finisher
        ? '여러 방향 · 공간 안무'
        : directionLabels[motionDirection(motion)];
      container.replaceChildren(fixed);
    } else {
      container.replaceChildren(
        ...option.motions.map((variant) => {
          const choice = document.createElement('label');
          choice.className = 'choice-button';
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'direction';
          input.value = variant.id;
          input.checked = variant === motion;
          const title = document.createElement('span');
          title.className = 'choice-name';
          title.textContent = directionLabels[motionDirection(variant)];
          choice.append(input, title);
          return choice;
        }),
      );
    }
    const notice = element('#direction-description');
    notice.hidden = !this.directionNotice;
    notice.textContent = this.directionNotice;
  }

  private createVariantOptions(motion: ComboMotion): void {
    const controls = element('#variant-controls');
    controls.hidden = !motion.variant;
    const variants = activeMotions.filter(
      (item) =>
        motion.variant && item.variant?.groupId === motion.variant.groupId,
    );
    element('#variant-options').replaceChildren(
      ...variants.map((variant) => {
        const choice = document.createElement('label');
        choice.className = 'choice-button';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'ki-variant';
        input.value = variant.id;
        input.checked = variant === motion;
        const title = document.createElement('span');
        title.className = 'choice-name';
        title.textContent = variant.variant!.label;
        choice.append(input, title);
        return choice;
      }),
    );
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
        ? '박자를 바꿔도 재생 시점과 정지 상태를 유지합니다.'
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

  private createCameraOptions(motion: ComboMotion): void {
    const available = availableCameraModes(motion);
    if (!available.includes(this.options.cameraMode ?? 'none'))
      this.options = { ...this.options, cameraMode: 'none' };
    const choices = cameraStagingChoices.filter((choice) =>
      available.includes(choice.id),
    );
    element('#camera-controls').hidden = choices.length <= 1;
    element('#camera-options').replaceChildren(
      ...choices.map((choice) => sceneChoice(choice, 'camera')),
    );
  }

  private updateCameraInputs(): void {
    const mode = this.options.cameraMode ?? 'none';
    const active =
      this.options.showMovement &&
      (mode !== 'impact' || element<HTMLInputElement>('#sandbag').checked);
    for (const input of element(
      '#camera-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      input.disabled =
        !this.options.showMovement ||
        (input.value === 'impact' &&
          !element<HTMLInputElement>('#sandbag').checked);
      input.title =
        input.value === 'impact' && !this.options.showSandbag
          ? '샌드백 반응을 켜면 선택할 수 있습니다.'
          : '';
      input.checked = input.value === (active ? mode : 'none');
    }
    const choice = cameraStagingChoices.find((item) => item.id === mode)!;
    element('#camera-description').textContent = !this.options.showMovement
      ? '이동 포함을 켜면 선택한 카메라 구도를 다시 사용합니다.'
      : mode === 'impact' && !this.options.showSandbag
        ? '샌드백 반응을 켜면 명중 스냅 확대를 사용할 수 있습니다.'
        : choice.summary;
  }

  private updateEffectInputs(): void {
    const effects = this.selectedMotion.effects ?? [];
    const replacesTrails = this.inkEffectsEnabled;
    for (const input of element(
      '#effect-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      const effect = effects.find((item) => item.id === input.value);
      const replaced =
        replacesTrails &&
        (effect?.kind === 'line' || effect?.kind === 'ribbon');
      input.disabled = !this.options.showMovement || replaced;
      input.checked =
        !input.disabled && this.options.enabledEffects.has(input.value);
      input.title = replaced
        ? '수묵 공격 효과를 끄면 선택한 기존 궤적을 다시 사용합니다.'
        : '';
    }
    const description = element('#effect-description');
    description.hidden =
      !replacesTrails ||
      !effects.some(
        (effect) => effect.kind === 'line' || effect.kind === 'ribbon',
      );
    description.textContent = description.hidden
      ? ''
      : '수묵 공격 효과가 기존 선·면 궤적을 대신합니다. 수묵을 끄면 이전 궤적 선택을 복원하며 잔상·부위 효과는 함께 사용할 수 있습니다.';
  }

  private updateInkInputs(): void {
    const available = hasInkEffects(this.selectedMotion);
    element('#ink-controls').hidden = !available;
    const ink = element<HTMLInputElement>('#ink-effects');
    ink.disabled = !available || !this.options.showMovement;
    ink.checked = !ink.disabled && !!this.options.showInkEffects;
    const description = element('#ink-description');
    description.hidden = !available;
    description.textContent = !this.options.showMovement
      ? '이동 포함을 켜면 선택한 수묵 공격 효과를 다시 사용합니다.'
      : '공격 방향을 따라 먹획이 흐르고 명중 시 먹이 튑니다. 타격 효과를 꺼도 먹획은 유지하며 수묵을 끄면 기존 효과를 비교할 수 있습니다.';
  }

  private createEmphasisOptions(motion: ComboMotion): void {
    const available = availableEmphasisModes(motion);
    if (!available.includes(this.options.emphasisMode ?? 'none'))
      this.options = { ...this.options, emphasisMode: 'none' };
    const choices = emphasisChoices.filter((choice) =>
      available.includes(choice.id),
    );
    element('#emphasis-controls').hidden = choices.length <= 1;
    element('#emphasis-options').replaceChildren(
      ...choices.map((choice) => sceneChoice(choice, 'emphasis')),
    );
  }

  private updateEmphasisInputs(): void {
    const motion = this.player.snapshot.motion;
    const mode = this.options.emphasisMode ?? 'none';
    const target = element<HTMLInputElement>('#sandbag').checked;
    const active =
      this.options.showMovement &&
      (!emphasisNeedsTarget(motion, mode) || target);
    for (const input of element(
      '#emphasis-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      const choice = emphasisChoices.find((item) => item.id === input.value);
      const needsTarget = !!choice && emphasisNeedsTarget(motion, choice.id);
      input.disabled = !this.options.showMovement || (needsTarget && !target);
      input.checked = input.value === (active ? mode : 'none');
      input.title =
        needsTarget && !target
          ? '샌드백 반응을 켜면 실제 명중에서 사용할 수 있습니다.'
          : '';
    }
    const choice = emphasisChoices.find((item) => item.id === mode)!;
    element('#emphasis-description').textContent = !this.options.showMovement
      ? '이동 포함을 켜면 선택한 명암 강조를 다시 사용합니다.'
      : emphasisNeedsTarget(motion, mode) && !target
        ? '샌드백 반응을 켜면 선택한 명암 강조를 사용할 수 있습니다.'
        : choice.summary;
  }

  private select(motion: ComboMotion): void {
    const previous = this.selectedMotion;
    const switchingDirection =
      previous !== motion &&
      motionOptionId(previous) === motionOptionId(motion);
    const playback = switchingDirection ? this.player.snapshot : undefined;
    if (switchingDirection) {
      const selection = directionSelection(previous, motion, {
        presentationId: this.selectedPresentationId,
        enabledEffects: this.options.enabledEffects,
      });
      this.selectedPresentationId = selection.presentationId;
      this.options = {
        ...this.options,
        enabledEffects: selection.enabledEffects,
      };
      this.directionNotice = selection.resetLabels.length
        ? `${directionLabels[motionDirection(motion)]}에 없는 ${selection.resetLabels.join(', ')} 설정은 해제했어요.`
        : '';
      const cameraMode = this.options.cameraMode ?? 'none';
      if (!availableCameraModes(motion).includes(cameraMode)) {
        const label = cameraStagingChoices.find(
          (item) => item.id === cameraMode,
        )!.label;
        this.options = { ...this.options, cameraMode: 'none' };
        this.directionNotice = [
          this.directionNotice,
          `${directionLabels[motionDirection(motion)]}에 없는 ${label} 구도는 해제했어요.`,
        ]
          .filter(Boolean)
          .join(' ');
      }
      const emphasisMode = this.options.emphasisMode ?? 'none';
      if (!availableEmphasisModes(motion).includes(emphasisMode)) {
        const label = emphasisChoices.find(
          (item) => item.id === emphasisMode,
        )!.label;
        this.options = { ...this.options, emphasisMode: 'none' };
        this.directionNotice = [
          this.directionNotice,
          `${directionLabels[motionDirection(motion)]}에 없는 명암 강조(${label})를 해제했어요.`,
        ]
          .filter(Boolean)
          .join(' ');
      }
    } else if (previous !== motion || !this.presentationReady) {
      this.selectedPresentationId = 'base';
      this.options = {
        ...this.options,
        enabledEffects: new Set<string>(
          motion.id === 'elbow-chop' ? ['elbow-down-keyposes'] : [],
        ),
        cameraMode: motion.finisher ? 'finisher' : 'none',
        emphasisMode: 'none',
      };
      this.directionNotice = '';
    }
    this.selectedMotion = motion;
    this.createPresentationOptions(motion);
    this.createDirectionOptions(motion);
    this.createVariantOptions(motion);
    this.presentationReady = true;
    const choice = this.motionChoices.get(motionOptionId(motion))!;
    choice.querySelector('input')!.checked = true;
    if (choice.hidden) this.selectedSection = 'all';
    this.filterMotions();
    this.playSelectedMotion();
    if (playback) {
      this.player.seek(playback.elapsedMs);
      this.player.setPaused(playback.paused);
      this.render();
    }
  }

  private playSelectedMotion(
    settings: { readonly preservePlayback?: boolean } = {},
  ): void {
    const playback = settings.preservePlayback
      ? this.player.snapshot
      : undefined;
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
    this.createCameraOptions(activeMotion);
    this.createEmphasisOptions(activeMotion);
    this.updatePresentationInputs();
    element('#supplement-label').hidden = !motion.supplementedSteps;
    element('#motion-title').textContent = motionOptionTitle(motion);
    element('#summary').textContent = motion.summary;
    const phases = element('#finisher-phases');
    phases.hidden = !activeMotion.finisher;
    this.phaseButtons = (activeMotion.finisher?.beats ?? []).map((beat) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = beat.label;
      button.dataset.step = String(beat.fromStep);
      button.dataset.endStep = String(beat.toStep);
      return button;
    });
    phases.replaceChildren(...this.phaseButtons);
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
    const elapsedMs = comboDuration(activeMotion);
    const cues = collectContactCues(activeMotion);
    const hit = cues.length;
    const hitButtons = cues.map((cue, index) => {
      const button = document.createElement('button');
      const actor = cue.actorId.startsWith('ki:')
        ? '기공'
        : cue.actorId === 'body'
          ? '본체'
          : activeMotion.finisher?.actors?.find(
                (item) => item.id === cue.actorId,
              )?.role === 'echo'
            ? '공격 잔상'
            : '분신';
      button.type = 'button';
      button.dataset.time = String(cue.plannedTimeMs);
      button.dataset.actor = cue.actorId;
      button.textContent = `${index + 1}타 · ${(cue.plannedTimeMs / 1000).toFixed(2)}초`;
      button.title = `${cue.step.phase} · ${actor}`;
      button.setAttribute(
        'aria-label',
        `${index + 1}타 타격 자세 보기 · ${cue.step.phase} · ${actor}`,
      );
      return button;
    });
    element('#hits').replaceChildren(...hitButtons);
    const hitDetails = element<HTMLDetailsElement>('#hit-details');
    const hitDetailsLabel = element('#hit-details-label');
    hitDetailsLabel.hidden = !activeMotion.finisher;
    hitDetailsLabel.textContent = `개별 타격 자세 · ${hit}타`;
    if (!settings.preservePlayback) hitDetails.open = !activeMotion.finisher;
    element('#duration').textContent =
      `${hit ? `${hit}타 · ` : ''}${(elapsedMs / 1000).toFixed(2)}초`;
    if (playback) {
      this.player.seek(playback.elapsedMs);
      this.player.setPaused(playback.paused);
    }
    this.render();
  }

  private bindInput(): void {
    const options = { signal: this.events.signal };
    element('#variant-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const id = event.target.value;
        const motion = activeMotions.find((item) => item.id === id);
        if (
          motion?.variant &&
          motion.variant.groupId === this.selectedMotion.variant?.groupId
        )
          this.select(motion);
      },
      options,
    );
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
        const optionId = event.target.value;
        const option = motionOptions.find((item) => item.id === optionId);
        if (option)
          this.select(
            option.motions.find((item) => item === this.selectedMotion) ??
              option.motions[0]!,
          );
      },
      options,
    );
    element('#direction-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const motionId = event.target.value;
        const motion = activeMotions.find((item) => item.id === motionId);
        if (
          !motion ||
          motionOptionId(motion) !== motionOptionId(this.selectedMotion)
        )
          return;
        this.select(motion);
        element('#direction-options')
          .querySelector<HTMLInputElement>('input:checked')
          ?.focus();
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
        this.updatePresentationInputs();
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
        this.playSelectedMotion({ preservePlayback: true });
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
      () => this.playSelectedMotion({ preservePlayback: true }),
      options,
    );
    element('#hits').addEventListener(
      'click',
      (event) => {
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('button[data-time]')
            : null;
        if (target) this.player.seek(Number(target.dataset.time));
      },
      options,
    );
    element('#finisher-phases').addEventListener(
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
      () => {
        this.player.play();
        this.updatePresentationInputs();
      },
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
        this.updatePresentationInputs();
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
        this.updatePresentationInputs();
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
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element<HTMLInputElement>('#ink-effects').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          showInkEffects: (event.currentTarget as HTMLInputElement).checked,
        };
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element<HTMLInputElement>('#sandbag').addEventListener(
      'change',
      (event) => {
        this.options = {
          ...this.options,
          showSandbag: (event.currentTarget as HTMLInputElement).checked,
        };
        this.updatePresentationInputs();
        this.render();
      },
      options,
    );
    element<HTMLInputElement>('#hit-stop').addEventListener(
      'change',
      (event) => {
        this.hitStopEnabled = (event.currentTarget as HTMLInputElement).checked;
        this.updatePresentationInputs();
      },
      options,
    );
    for (const [id, key] of [
      ['directional-impacts', 'directionalImpacts'],
      ['ground-effects', 'showGroundEffects'],
      ['camera-recoil', 'showCameraRecoil'],
      ['speed-lines', 'showSpeedLines'],
      ['finisher-effects', 'showFinisher'],
    ] as const) {
      element<HTMLInputElement>(`#${id}`).addEventListener(
        'change',
        (event) => {
          this.options = {
            ...this.options,
            [key]: (event.currentTarget as HTMLInputElement).checked,
          };
          this.updatePresentationInputs({ refreshHitStops: false });
          this.render();
        },
        options,
      );
    }
    element('#camera-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const value = event.target.value;
        const mode = cameraStagingChoices.find(
          (choice) => choice.id === value,
        )?.id;
        if (!mode) return;
        this.options = { ...this.options, cameraMode: mode };
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element('#emphasis-options').addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const value = event.target.value;
        const mode = emphasisChoices.find((choice) => choice.id === value)?.id;
        if (!mode) return;
        this.options = { ...this.options, emphasisMode: mode };
        this.updatePresentationInputs({ refreshHitStops: false });
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
    const drawn = drawCombo(this.context, snapshot, this.frames, this.options);
    const cameraValue =
      element('#camera-options').querySelector<HTMLInputElement>(
        'input:checked',
      )?.value;
    const cameraChoice = cameraStagingChoices.find(
      (choice) => choice.id === cameraValue,
    );
    const emphasisValue =
      element('#emphasis-options').querySelector<HTMLInputElement>(
        'input:checked',
      )?.value;
    const emphasisChoice = emphasisChoices.find(
      (choice) => choice.id === emphasisValue,
    );
    const presentation = this.selectedMotion.presentations?.find(
      (item) => item.id === this.selectedPresentationId,
    );
    const effects = this.options.showMovement
      ? (snapshot.motion.effects ?? []).filter(
          (effect) =>
            this.options.enabledEffects.has(effect.id) &&
            !(
              this.inkEffectsEnabled &&
              (effect.kind === 'line' || effect.kind === 'ribbon')
            ),
        )
      : [];
    this.canvas.setAttribute(
      'aria-label',
      [
        motionOptionTitle(this.selectedMotion),
        this.selectedMotion.finisher
          ? '여러 방향 공간 안무'
          : directionLabels[motionDirection(this.selectedMotion)],
        presentation?.label ??
          this.selectedMotion.presentationLabel ??
          '기본 박자',
        ...effects.map((effect) => effect.label),
        ...(this.inkEffectsEnabled ? ['수묵 공격 효과'] : []),
        ...(drawn.finisherBeat
          ? ['필살기 무대·연타 궤적', drawn.finisherBeat]
          : []),
        ...(cameraChoice && cameraChoice.id !== 'none'
          ? [cameraChoice.label]
          : []),
        ...(emphasisChoice && emphasisChoice.id !== 'none'
          ? [emphasisChoice.label]
          : []),
        ...(element<HTMLInputElement>('#speed-lines').checked
          ? ['배경 속도선']
          : []),
        ...(element<HTMLInputElement>('#directional-impacts').checked
          ? ['공격별 충격 모양']
          : []),
        ...(element<HTMLInputElement>('#ground-effects').checked
          ? ['접지·착지 반응']
          : []),
        ...(element<HTMLInputElement>('#camera-recoil').checked
          ? ['강타 카메라 반동']
          : []),
        ...(this.options.showMovement &&
        this.options.showSandbag &&
        collectContactCues(snapshot.motion).length > 0
          ? ['샌드백 반응', ...(this.hitStopEnabled ? ['강타 히트스톱'] : [])]
          : []),
        '아타호 동작 미리보기',
      ].join(' · '),
    );
    this.timeline.value = String(
      Math.round((snapshot.elapsedMs / snapshot.durationMs) * 1000),
    );
    this.pauseButton.textContent = snapshot.paused ? '재생' : '일시정지';
    const ki = snapshot.motion.ki;
    const kiSample = ki ? sampleKi(ki, snapshot.elapsedMs) : undefined;
    const kiContacts =
      ki && this.options.showMovement
        ? collectSandbagContacts(snapshot.motion, { scale: this.options.scale })
        : [];
    const kiHits = kiContacts.filter(
      (contact) =>
        (!this.options.showSandbag || contact.connected) &&
        snapshot.elapsedMs >=
          (this.options.showSandbag ? contact.timeMs : contact.plannedTimeMs),
    ).length;
    const phase =
      (this.options.showMovement
        ? finisherContactPhase(snapshot.motion, snapshot.elapsedMs)
        : undefined) ?? snapshot.step.phase;
    const statusParts = [phase];
    if (ki)
      statusParts.push(
        `기공 ${kiHits}/${ki.hits.length}${this.options.showSandbag ? '명중' : '타'}`,
      );
    statusParts.push(
      `${snapshot.motion.finisher ? '본체 자세' : '자세'} ${snapshot.stepIndex + 1}/${snapshot.motion.steps.length}`,
      `${(snapshot.elapsedMs / 1000).toFixed(2)}초`,
    );
    if (this.player.hitStopped) statusParts.push('명중 정지');
    this.status.textContent = statusParts.join(' · ');
    this.canvas.dataset.motion = snapshot.motion.id;
    this.canvas.dataset.step = String(snapshot.stepIndex);
    this.canvas.dataset.paused = String(snapshot.paused);
    this.canvas.dataset.hitStop = String(this.player.hitStopped);
    this.canvas.dataset.impacts = String(drawn.impactCount);
    this.canvas.dataset.inkCount = String(drawn.inkCount);
    this.canvas.dataset.inkEnabled = String(this.inkEffectsEnabled);
    this.canvas.dataset.groundEffects = String(drawn.groundCount);
    this.canvas.dataset.cameraX = drawn.cameraX.toFixed(3);
    this.canvas.dataset.cameraY = drawn.cameraY.toFixed(3);
    this.canvas.dataset.cameraZoom = drawn.cameraZoom.toFixed(4);
    this.canvas.dataset.cameraMode = cameraChoice?.id ?? 'none';
    this.canvas.dataset.emphasisMode = emphasisChoice?.id ?? 'none';
    this.canvas.dataset.backgroundDim = drawn.backgroundDim.toFixed(4);
    this.canvas.dataset.palette = String(drawn.palette);
    this.canvas.dataset.emphasisPhase = drawn.emphasisPhase;
    this.canvas.dataset.speedLines = String(drawn.speedLineCount);
    this.canvas.dataset.finisherBeat = drawn.finisherBeat;
    this.canvas.dataset.finisherHits = String(drawn.finisherHits);
    this.canvas.dataset.kiHits = String(kiHits);
    this.canvas.dataset.kiPhase = kiSample?.phase ?? '';
    this.canvas.dataset.kiStyle = ki?.style ?? '';
    this.phaseButtons.forEach((button) => {
      const active =
        snapshot.stepIndex >= Number(button.dataset.step) &&
        snapshot.stepIndex <= Number(button.dataset.endStep);
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
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
