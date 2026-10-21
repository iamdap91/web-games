import { circusScenePhases } from './meteor-circus-flight.js';
import { isMeteorCircus } from './meteor-circus-drawing.js';
import { exportComboGif } from './gif-export.js';
import { finisherConcept } from './finisher-concepts.js';
import { sampleDemonDescent } from './demon-descent.js';
import { FinisherOpacityControls } from './finisher-opacity-controls.js';
import { FinisherPresetControls } from './finisher-preset-controls.js';
import {
  presetDrawingFlags,
  type FinisherPreset,
  type FinisherPresetDraft,
} from './finisher-presets.js';
import {
  finisherOpacityControls,
  finisherOpacityDefaults,
  finisherOpacityValue,
  isFinisherOpacityKey,
} from './finisher-opacity.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { ReferenceLibraryPanel } from './review.js';
import { activeMotions, motionSections } from './motion-catalog.js';
import { ComboPlayer, comboDuration } from './player.js';
import { KiLighting } from './ki-lighting.js';
import { BackgroundShockwave } from './shockwave-presentation.js';
import { collectContactCues, finisherContactPhase } from './finisher-actors.js';
import { applySupplement } from './supplements.js';
import {
  drawCombo,
  stageWidth,
  stageHeight,
  type DrawingOptions,
} from './drawing.js';
import { frameKey } from './source-frames.js';
import { MotionFrameLoader } from './frame-loader.js';
import type { ComboMotion } from './types.js';
import { sampleKi } from './ki-sampling.js';
import { hasInkEffects } from './ink-effects.js';
import {
  inkImpactScaleRange,
  inkImpactSizeMultiplier,
} from './ink-impact-size.js';
import { hasInkTrails } from './ink-trail-motion.js';
import {
  inkTrailScaleRange,
  inkTrailSizeMultiplier,
} from './ink-trail-types.js';
import { BodySilhouette } from './body-silhouette.js';
import {
  hasGroundPuffs,
  hasFloorTrace,
  hasDepthLayers,
  hasReleaseKick,
} from './stage-accents.js';
import {
  hasImpactLettering,
  hasEndSilhouette,
  hasBrushGlyph,
  hasActionFrame,
} from './comic-accents.js';
import { hasKiFlow, hasReleaseGlint, hasKiHierarchy } from './ki-accents.js';
import { hasFinisherHierarchy } from './effect-hierarchy.js';
import { hasFocusLines, hasBetaFlash } from './focus-lines.js';
import { hasLocalCharge } from './charge-effects.js';
import { hasCutin, cutinStop } from './cutin-presentation.js';
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
  hasViscousOrbit,
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
  name: string,
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

type PresentationMode =
  | 'impact-style'
  | 'focus-mode'
  | 'scene-impact'
  | 'hit-stop'
  | 'finisher-mode'
  | 'erosion-mode'
  | 'legacy-trail';

const presentationModeChoices: Readonly<
  Record<
    PresentationMode,
    readonly { readonly id: string; readonly label: string }[]
  >
> = {
  'impact-style': [
    { id: 'none', label: '없음' },
    { id: 'base', label: '기본' },
    { id: 'directional', label: '공격별' },
    { id: 'ink', label: '먹튀김' },
  ],
  'focus-mode': [
    { id: 'none', label: '없음' },
    { id: 'ink', label: '먹빛 집중선' },
    { id: 'beta', label: '베타 플래시' },
  ],
  'scene-impact': [
    { id: 'none', label: '없음' },
    { id: 'wave', label: '배경 충격파' },
    { id: 'frame', label: '내부 틀 돌파' },
  ],
  'hit-stop': [
    { id: 'none', label: '없음' },
    { id: 'stop', label: '정지' },
    { id: 'shake', label: '정지＋진동' },
  ],
  'finisher-mode': [
    { id: 'none', label: '끔' },
    { id: 'base', label: '기본' },
    { id: 'concept', label: '기술별 컨셉' },
  ],
  'erosion-mode': [
    { id: 'none', label: '기본 소멸' },
    { id: 'noise', label: '깎이며 소멸' },
    { id: 'directional', label: '방향성 소멸' },
  ],
  'legacy-trail': [
    { id: 'none', label: '사용 안 함' },
    { id: 'motion', label: '기존 선·면' },
    { id: 'ink', label: '이전 먹획' },
  ],
};

function updateModeChoices(settings: {
  readonly name: PresentationMode;
  readonly available: readonly string[];
  readonly selected: string;
  readonly disabled: boolean;
  readonly needsTarget?: readonly string[];
  readonly targetEnabled?: boolean;
  readonly blocked?: Readonly<Record<string, string>>;
}): void {
  const container = element(`#${settings.name}-options`);
  const choices = presentationModeChoices[settings.name].filter((choice) =>
    settings.available.includes(choice.id),
  );
  const signature = choices.map((choice) => choice.id).join(',');
  if (container.dataset.choices !== signature) {
    container.replaceChildren(
      ...choices.map((choice) => sceneChoice(choice, settings.name)),
    );
    container.dataset.choices = signature;
  }
  for (const input of container.querySelectorAll<HTMLInputElement>('input')) {
    const needsTarget = settings.needsTarget?.includes(input.value);
    input.disabled =
      settings.disabled ||
      (!!needsTarget && !settings.targetEnabled) ||
      !!settings.blocked?.[input.value];
    input.checked = input.value === settings.selected;
    input.title =
      settings.blocked?.[input.value] ??
      (needsTarget && !settings.targetEnabled
        ? '샌드백 반응이 필요합니다.'
        : '');
  }
}

class ComboScreen {
  private readonly referenceLibrary = new ReferenceLibraryPanel(
    element<HTMLDetailsElement>('#reference-library'),
  );
  private readonly canvas = element<HTMLCanvasElement>('#stage');
  private readonly context = this.canvas.getContext('2d')!;
  private readonly status = element<HTMLOutputElement>('#status');
  private readonly timeline = element<HTMLInputElement>('#timeline');
  private readonly pauseButton = element<HTMLButtonElement>('#pause');
  private readonly player = new ComboPlayer(initialMotion);
  private readonly effectSurfaces = {
    lighting: new KiLighting(),
    shockwave: new BackgroundShockwave(),
    silhouette: new BodySilhouette(),
  };
  private selectedMotion = initialMotion;
  private selectedSection = 'attack';
  private selectedPresentationId = 'base';
  private presentationReady = false;
  private directionNotice = '';
  private readonly motionChoices = new Map<string, HTMLLabelElement>();
  private readonly sectionChoices = new Map<string, HTMLInputElement>();
  private readonly events = new AbortController();
  private readonly resize = new ResizeObserver(() => this.resizeCanvas());
  private readonly frameLoader = new MotionFrameLoader();
  private readonly frames = this.frameLoader.frames;
  private selectionRequest = 0;
  private loading = false;
  private options: DrawingOptions = {
    scale: 3,
    showMovement: true,
    showContacts: true,
    showInkEffects: true,
    inkTrailScale: inkTrailScaleRange.initial,
    inkImpactScale: inkImpactScaleRange.initial,
    legacyTrails: 'none',
    showSandbag: false,
    directionalImpacts: false,
    showGroundEffects: false,
    showCameraRecoil: false,
    cameraMode: 'none',
    emphasisMode: 'none',
    showSpeedLines: false,
    showFinisher: true,
    showFinisherConcept: true,
    finisherOpacity: { ...finisherOpacityDefaults },
    showLocalCharge: false,
    showFocusLines: false,
    showDirectionalErosion: false,
    showBetaFlash: false,
    showFlowAccent: false,
    showReleaseGlint: false,
    showViscousOrbit: true,
    showEffectHierarchy: false,
    showGroundPuffs: false,
    groundPuffStyle: 'base',
    showFloorTrace: false,
    showDepthLayers: false,
    showReleaseKick: false,
    showImpactLettering: false,
    showEndSilhouette: false,
    showBrushGlyph: false,
    showActionFrame: false,
    showCutin: false,
    showErosion: false,
    showKiLighting: false,
    showErosionGlow: false,
    showShockwave: false,
    enabledEffects: new Set<string>(),
  };
  private readonly opacityControls = new FinisherOpacityControls({
    root: element('#finisher-opacity-controls'),
    onChange: (values) => {
      this.options = {
        ...this.options,
        finisherOpacity: { ...this.options.finisherOpacity, ...values },
      };
      this.updatePresentationInputs({ refreshHitStops: false });
      this.render();
    },
  });
  private frameButtons: HTMLButtonElement[] = [];
  private phaseButtons: HTMLButtonElement[] = [];
  private frameRequest = 0;
  private previousTime = 0;
  private disposed = false;
  private hitStopEnabled = false;
  private finalSlowEnabled = false;
  private hitStopShakeEnabled = false;
  private gifExport: AbortController | undefined;
  private gifUrl: string | undefined;
  private readonly presetControls = new FinisherPresetControls({
    root: element('#finisher-presets'),
    capture: (name) => this.captureFinisherPreset(name),
    onLoad: (preset) => this.loadFinisherPreset(preset),
    motionTitle: (id) => {
      const motion = activeMotions.find((item) => item.id === id);
      return motion ? motionOptionTitle(motion) : `사용할 수 없는 기술 (${id})`;
    },
  });

  private captureFinisherPreset(name: string): FinisherPresetDraft {
    if (
      this.loading ||
      !this.presentationReady ||
      !this.selectedMotion.finisher
    )
      throw new Error('저장할 필살기를 먼저 선택해 주세요.');
    const flags = Object.fromEntries(
      presetDrawingFlags.map((key) => [key, !!this.options[key]]),
    ) as Record<(typeof presetDrawingFlags)[number], boolean>;
    return {
      name,
      motionId: this.selectedMotion.id,
      presentationId: this.selectedPresentationId,
      supplement:
        this.selectedMotion.supplementedSteps &&
        element<HTMLSelectElement>('#supplement').value === 'supplemented'
          ? 'supplemented'
          : 'original',
      drawing: {
        ...flags,
        inkTrailScale: inkTrailSizeMultiplier(this.options),
        inkImpactScale: inkImpactSizeMultiplier(this.options),
        legacyTrails: this.options.legacyTrails ?? 'none',
        cameraMode: this.options.cameraMode ?? 'none',
        emphasisMode: this.options.emphasisMode ?? 'none',
        finisherOpacity: Object.fromEntries(
          finisherOpacityControls.map(({ key }) => [
            key,
            finisherOpacityValue(this.options, key),
          ]),
        ) as FinisherPresetDraft['drawing']['finisherOpacity'],
        enabledEffects: [...this.options.enabledEffects],
      },
      timing: {
        hitStop: this.hitStopEnabled,
        hitStopShake: this.hitStopShakeEnabled,
        finalSlow: this.finalSlowEnabled,
      },
      preview: {
        scale: this.options.scale,
        showMovement: this.options.showMovement,
        showContacts: this.options.showContacts,
        showSandbag: !!this.options.showSandbag,
        speed: Number(element<HTMLSelectElement>('#speed').value),
        repeat: element<HTMLInputElement>('#repeat').checked,
      },
    };
  }

  private async loadFinisherPreset(preset: FinisherPreset): Promise<boolean> {
    const motion = activeMotions.find((item) => item.id === preset.motionId);
    if (!motion?.finisher)
      throw new Error('이 설정의 필살기를 현재 조합실에서 찾지 못했어요.');
    if (
      preset.presentationId !== 'base' &&
      !motion.presentations?.some((item) => item.id === preset.presentationId)
    )
      throw new Error(
        '이 설정의 박자가 변경됐어요. 파일의 설정을 확인해 주세요.',
      );
    const effectIds = new Set(motion.effects?.map((effect) => effect.id));
    if (
      preset.drawing.enabledEffects.some((id) => !effectIds.has(id)) ||
      !availableCameraModes(motion).includes(preset.drawing.cameraMode) ||
      !availableEmphasisModes(motion).includes(preset.drawing.emphasisMode) ||
      (preset.supplement === 'supplemented' && !motion.supplementedSteps)
    )
      throw new Error('이 설정에 현재 지원하지 않는 그림·효과·구도가 있어요.');
    if (!(await this.select(motion))) return false;
    this.selectedPresentationId = preset.presentationId;
    const { scale, showMovement, showContacts, showSandbag, speed, repeat } =
      preset.preview;
    this.options = {
      ...preset.drawing,
      groundPuffStyle: this.options.groundPuffStyle,
      scale,
      showMovement,
      showContacts,
      showSandbag,
      enabledEffects: new Set(preset.drawing.enabledEffects),
      finisherOpacity: { ...preset.drawing.finisherOpacity },
    };
    this.hitStopEnabled = preset.timing.hitStop;
    this.hitStopShakeEnabled = preset.timing.hitStopShake;
    this.finalSlowEnabled = preset.timing.finalSlow;
    element<HTMLSelectElement>('#scale').value = String(scale);
    element<HTMLSelectElement>('#speed').value = String(speed);
    element<HTMLSelectElement>('#supplement').value = preset.supplement;
    element<HTMLInputElement>('#movement').checked = showMovement;
    element<HTMLInputElement>('#sandbag').checked = showSandbag;
    element<HTMLInputElement>('#repeat').checked = repeat;
    this.player.setSpeed(speed);
    this.player.setRepeating(repeat);
    this.createPresentationOptions(motion);
    this.playSelectedMotion();
    return true;
  }

  private get inkEffectsEnabled(): boolean {
    return (
      this.options.showMovement &&
      this.options.showContacts &&
      !!this.options.showInkEffects &&
      hasInkEffects(this.selectedMotion)
    );
  }

  private get inkTrailsEnabled(): boolean {
    return (
      this.options.showMovement &&
      inkTrailSizeMultiplier(this.options) > 0 &&
      hasInkTrails(this.selectedMotion)
    );
  }

  private updatePresentationInputs(
    settings: { readonly refreshHitStops?: boolean } = {},
  ): void {
    this.updateInkInputs();
    this.updateEffectInputs();
    this.updateAccentInputs();
    const motion = this.player.snapshot.motion;
    const contacts = collectSandbagContacts(motion, {
      scale: this.options.scale,
      enabledEffects: this.options.enabledEffects,
    });
    const target = element<HTMLInputElement>('#sandbag');
    const circus = isMeteorCircus(motion);
    element('.presentation-controls').classList.toggle(
      'circus-scene-controls',
      circus,
    );
    target.closest('label')!.hidden = circus;
    target.disabled = circus || !this.options.showMovement || !contacts.length;
    target.checked = !!this.options.showSandbag;
    const targetEnabled = !target.disabled && target.checked;
    const hitStopActive = targetEnabled && this.hitStopEnabled;
    for (const [id, enabled, supported] of [
      [
        'ground-effects',
        this.options.showGroundEffects,
        hasGroundEffects(motion),
      ],
      ['speed-lines', this.options.showSpeedLines, hasSpeedLines(motion)],
      [
        'camera-recoil',
        this.options.showCameraRecoil,
        contacts.some((contact, index) =>
          contactHitStopMs(contact, {
            finalContact: index === contacts.length - 1,
          }),
        ),
      ],
    ] as const) {
      const input = element<HTMLInputElement>(`#${id}`);
      input.closest('label')!.hidden = !supported;
      input.disabled =
        !this.options.showMovement ||
        (id === 'camera-recoil' && !targetEnabled);
      input.checked = !!enabled;
      input.title = input.disabled
        ? id === 'camera-recoil'
          ? '샌드백 반응이 필요합니다.'
          : '이동 포함이 필요합니다.'
        : '';
    }
    this.updateCameraInputs();
    this.updateEmphasisInputs();
    const freeze =
      !circus && this.options.showMovement && this.options.showCutin
        ? cutinStop(motion)
        : undefined;
    if (settings.refreshHitStops !== false)
      this.player.setHitStops([
        ...(hitStopActive
          ? contacts.flatMap((contact, index) => {
              const durationMs = contactHitStopMs(contact, {
                finalContact: index === contacts.length - 1,
                finisherClimax: !!motion.finisher,
              });
              return durationMs ? [{ timeMs: contact.timeMs, durationMs }] : [];
            })
          : []),
        ...(freeze ? [{ ...freeze, kind: 'super' as const }] : []),
      ]);
    const final = motion.finisher
      ? contacts.filter((contact) => contact.connected).at(-1)
      : undefined;
    const slow = element<HTMLInputElement>('#finisher-slow');
    slow.closest('label')!.hidden = !motion.finisher;
    slow.disabled = !targetEnabled || !final;
    slow.checked = this.finalSlowEnabled;
    this.player.setFinalSlowMotion(
      !slow.disabled && slow.checked ? final?.timeMs : undefined,
    );
    element('#target-description').textContent = circus
      ? '덤불박쥐의 회피와 광탄 추격을 한 장면으로 재생합니다. 위의 기술 변형에서 기본 유성권과 비교하세요.'
      : !this.options.showMovement
        ? '이동 포함을 켜면 선택한 연출을 다시 적용합니다.'
        : contacts.length
          ? '샌드백에 닿은 공격만 반응합니다. 명중 정지·반동은 샌드백이 필요합니다.'
          : '이 동작에는 타격 대상이 없습니다.';
    this.updateCombinedInputs({
      targetEnabled,
      contactsAvailable: !!contacts.length,
    });
    this.opacityControls.update(this.selectedMotion, this.options);
    this.updatePresentationSummaries();
  }

  private get hitStopShakeActive(): boolean {
    return (
      this.options.showMovement &&
      !!this.options.showSandbag &&
      this.hitStopEnabled &&
      this.hitStopShakeEnabled
    );
  }

  private get finisherConceptEnabled(): boolean {
    return (
      !!this.selectedMotion.finisher &&
      this.options.showFinisher !== false &&
      !!this.options.showFinisherConcept
    );
  }

  private updateCombinedInputs(settings: {
    readonly targetEnabled: boolean;
    readonly contactsAvailable: boolean;
  }): void {
    const motion = this.selectedMotion;
    const disabled = !this.options.showMovement;
    const inkAvailable = hasInkEffects(motion);
    const impact = !this.options.showContacts
      ? 'none'
      : this.options.showInkEffects && inkAvailable
        ? 'ink'
        : this.options.directionalImpacts && !motion.ki
          ? 'directional'
          : 'base';
    element('#impact-style-controls').hidden = !settings.contactsAvailable;
    updateModeChoices({
      name: 'impact-style',
      available: [
        'none',
        'base',
        ...(!motion.ki ? ['directional'] : []),
        ...(inkAvailable ? ['ink'] : []),
      ],
      selected: impact,
      disabled,
    });
    element('#impact-style-description').textContent =
      motion.finisher && inkAvailable
        ? motion.ki
          ? '광탄 도착의 명중 표시를 바꿉니다. 먹튀김을 골라도 발사·비행과 실제 타수는 유지합니다.'
          : '본체·공격 분신의 각 명중 표시를 바꿉니다. 먹튀김은 공격 종류와 방향을 따르며 궤적·잔상은 유지합니다.'
        : motion.ki
          ? '기공의 명중 표시만 바꿉니다. 기공 본체·파열·잔광은 유지합니다.'
          : '명중 표시만 바꿉니다. 궤적·잔상은 그대로 유지합니다.';
    const focusAvailable = hasFocusLines(motion);
    const focus =
      hasBetaFlash(motion) && this.options.showBetaFlash
        ? 'beta'
        : focusAvailable && this.options.showFocusLines
          ? 'ink'
          : 'none';
    element('#focus-mode-controls').hidden = !focusAvailable;
    updateModeChoices({
      name: 'focus-mode',
      available: [
        'none',
        ...(focusAvailable ? ['ink'] : []),
        ...(hasBetaFlash(motion) ? ['beta'] : []),
      ],
      selected: focus,
      disabled,
    });
    element('#focus-mode-description').textContent =
      '준비 순간의 집중 표현을 하나만 선택합니다.';
    const waveAvailable = motion.ki?.style === 'beam' || !!motion.finisher;
    const frameAvailable = hasActionFrame(motion);
    const scene =
      frameAvailable && this.options.showActionFrame
        ? 'frame'
        : waveAvailable && this.options.showShockwave
          ? 'wave'
          : 'none';
    element('#scene-impact-controls').hidden =
      !waveAvailable && !frameAvailable;
    updateModeChoices({
      name: 'scene-impact',
      available: [
        'none',
        ...(waveAvailable ? ['wave'] : []),
        ...(frameAvailable ? ['frame'] : []),
      ],
      selected: scene,
      disabled,
      needsTarget: motion.finisher ? ['frame', 'wave'] : ['frame'],
      targetEnabled: settings.targetEnabled,
      blocked: this.finisherConceptEnabled
        ? { frame: '필살기 연출을 기본 또는 끔으로 바꾸면 적용합니다.' }
        : {},
    });
    element('#scene-impact-description').textContent =
      this.finisherConceptEnabled && frameAvailable
        ? '기술별 컨셉 사용 중 · 내부 틀은 필살기 연출을 기본 또는 끔으로 바꾸면 적용합니다.'
        : scene === 'frame' && !settings.targetEnabled
          ? '내부 틀 돌파 선택 유지 · 샌드백 반응을 켜면 적용합니다.'
          : motion.finisher && !settings.targetEnabled
            ? '필살기 화면 충격은 샌드백 반응이 필요합니다.'
            : '충격파와 내부 틀 돌파 중 하나만 표시합니다.';
    element('#hit-stop-controls').hidden = !this.strongPresetAvailable();
    updateModeChoices({
      name: 'hit-stop',
      available: ['none', 'stop', 'shake'],
      selected: !this.hitStopEnabled
        ? 'none'
        : this.hitStopShakeEnabled
          ? 'shake'
          : 'stop',
      disabled,
      needsTarget: ['stop', 'shake'],
      targetEnabled: settings.targetEnabled,
    });
    element('#hit-stop-description').textContent = !settings.targetEnabled
      ? '샌드백 반응을 켜면 강한 명중에서 적용합니다.'
      : '강한 명중을 짧게 멈추며 진동은 대상에만 적용합니다.';
    element('#finisher-controls').hidden = !motion.finisher;
    updateModeChoices({
      name: 'finisher-mode',
      available: ['none', 'base', 'concept'],
      selected:
        this.options.showFinisher === false
          ? 'none'
          : this.options.showFinisherConcept
            ? 'concept'
            : 'base',
      disabled,
    });
    element('#finisher-concept-description').textContent =
      this.options.showFinisher === false
        ? '장식을 끕니다. 공격자와 실제 명중은 유지합니다.'
        : this.options.showFinisherConcept
          ? (finisherConcept(motion)?.summary ?? '')
          : '기본 무대·연타 궤적을 표시합니다. 기술별 컨셉 장식은 끕니다.';
    const erosionAvailable = !!motion.ki || inkAvailable;
    const directionalAvailable =
      !!motion.ki &&
      ['beam', 'tiger-wave', 'tiger-manifest'].includes(motion.ki.style);
    const erosion = !this.options.showErosion
      ? 'none'
      : directionalAvailable && this.options.showDirectionalErosion
        ? 'directional'
        : 'noise';
    element('#erosion-controls').hidden = !erosionAvailable;
    updateModeChoices({
      name: 'erosion-mode',
      available: [
        'none',
        'noise',
        ...(directionalAvailable ? ['directional'] : []),
      ],
      selected: erosion,
      disabled,
    });
    element('#erosion-description').textContent =
      '깎이는 방식과 진행 방향을 고릅니다. 경계 발광은 아래에서 함께 켤 수 있습니다.';
  }

  private updatePresentationSummaries(): void {
    const active: string[] = [];
    const groups = document.querySelectorAll<HTMLDetailsElement>(
      '[data-presentation-group]',
    );
    for (const group of groups) group.hidden = false;
    const sections = document.querySelectorAll<HTMLDetailsElement>(
      '[data-presentation-section]',
    );
    for (const section of sections) section.hidden = false;
    for (const section of [...sections].reverse())
      section.hidden = ![...section.querySelectorAll('input')].some(
        (input) => !input.closest('[hidden]'),
      );
    for (const group of groups) {
      if (
        ![...group.querySelectorAll('input')].some(
          (input) => !input.closest('[hidden]'),
        )
      ) {
        group.hidden = true;
        continue;
      }
      const labels: string[] = [];
      for (const input of group.querySelectorAll<HTMLInputElement>('input')) {
        if (input.closest('[hidden]') || input.disabled) continue;
        if (input.type === 'range') {
          if (input.id === 'ink-trail-scale' && input.valueAsNumber > 0)
            labels.push(`수묵 ${input.valueAsNumber.toFixed(1)}배`);
          if (
            input.id === 'ink-impact-scale' &&
            input.valueAsNumber !== inkImpactScaleRange.initial
          )
            labels.push(`먹튀김 ${input.valueAsNumber.toFixed(1)}배`);
          const key = input.dataset.finisherOpacity;
          if (
            isFinisherOpacityKey(key) &&
            input.valueAsNumber !== finisherOpacityDefaults[key] * 100
          ) {
            const control = finisherOpacityControls.find(
              (item) => item.key === key,
            )!;
            labels.push(`${control.label} ${input.valueAsNumber}%`);
          }
        } else if (
          input.checked &&
          (!['none', 'base'].includes(input.value) ||
            input.name === 'impact-style' ||
            input.name === 'finisher-mode')
        ) {
          const label = input.closest('label');
          const title =
            label?.querySelector('.choice-name, .choice-label')?.textContent ??
            label?.firstChild?.textContent;
          const text = title?.trim() || label?.textContent?.trim();
          if (text)
            labels.push(input.name === 'impact-style' ? `명중 ${text}` : text);
        }
      }
      const summary = group.querySelector<HTMLElement>('[data-group-summary]');
      if (summary)
        summary.textContent = labels.length
          ? labels.slice(0, 2).join(' · ') +
            (labels.length > 2 ? ` 외 ${labels.length - 2}` : '')
          : '추가 없음';
      if (labels.length)
        active.push(
          `${group.querySelector('[data-group-title]')?.textContent?.trim()}: ${labels[0]}${labels.length > 1 ? ` 외 ${labels.length - 1}` : ''}`,
        );
    }
    element('#presentation-summary').textContent = !this.options.showMovement
      ? '이동 포함 꺼짐 · 연출 선택은 유지됩니다.'
      : active.length
        ? `현재 선택 · ${active.join(' / ')}`
        : '기본 연출로 표시합니다.';
  }

  private strongPresetAvailable(): boolean {
    const last = collectSandbagContacts(this.player.snapshot.motion, {
      scale: this.options.scale,
      enabledEffects: this.options.enabledEffects,
    }).at(-1);
    return (
      !!last &&
      contactHitStopMs(
        { ...last, connected: true },
        {
          finalContact: true,
          finisherClimax: !!this.player.snapshot.motion.finisher,
        },
      ) > 0
    );
  }

  private updateAccentInputs(): void {
    const motion = this.player.snapshot.motion;
    for (const [id, key, supported] of [
      ['local-charge', 'showLocalCharge', hasLocalCharge(motion)],
      ['ki-flow', 'showFlowAccent', hasKiFlow(motion)],
      ['release-glint', 'showReleaseGlint', hasReleaseGlint(motion)],
      ['viscous-orbit', 'showViscousOrbit', hasViscousOrbit(motion)],
      [
        'effect-hierarchy',
        'showEffectHierarchy',
        hasKiHierarchy(motion) || hasFinisherHierarchy(motion),
      ],
      ['ground-puffs', 'showGroundPuffs', hasGroundPuffs(motion)],
      ['floor-trace', 'showFloorTrace', hasFloorTrace(motion)],
      ['depth-layers', 'showDepthLayers', hasDepthLayers(motion)],
      ['release-kick', 'showReleaseKick', hasReleaseKick(motion)],
      ['impact-lettering', 'showImpactLettering', hasImpactLettering(motion)],
      ['end-silhouette', 'showEndSilhouette', hasEndSilhouette(motion)],
      ['brush-glyph', 'showBrushGlyph', hasBrushGlyph(motion)],
      ['cutin', 'showCutin', hasCutin(motion)],
      ['ki-lighting', 'showKiLighting', !!motion.ki],
      ['erosion-glow', 'showErosionGlow', !!motion.ki],
    ] as const) {
      const input = element<HTMLInputElement>(`#${id}`);
      const label = input.closest('label')!;
      label.hidden = !supported;
      const needsTarget = [
        'impact-lettering',
        'brush-glyph',
        'end-silhouette',
      ].includes(id);
      const conceptBlocks =
        this.finisherConceptEnabled &&
        ['impact-lettering', 'end-silhouette'].includes(id);
      input.disabled =
        !supported ||
        !this.options.showMovement ||
        conceptBlocks ||
        (needsTarget && !this.options.showSandbag) ||
        (id === 'erosion-glow' && !this.options.showErosion);
      input.checked = !!this.options[key];
      let reason = label.querySelector<HTMLElement>('[data-option-reason]');
      if (!reason) {
        reason = document.createElement('span');
        reason.dataset.optionReason = '';
        reason.className = 'field-hint option-reason';
        label.append(reason);
      }
      reason.textContent = !this.options.showMovement
        ? '이동 포함 필요'
        : conceptBlocks
          ? '필살기 연출을 기본·끔으로 선택하면 적용'
          : needsTarget && !this.options.showSandbag
            ? '샌드백 필요'
            : id === 'erosion-glow' && !this.options.showErosion
              ? '깎이며·방향성 소멸 필요'
              : '';
      reason.hidden = !input.disabled || !supported;
    }
    const puffStyles = element('#ground-puff-style-controls');
    puffStyles.hidden = motion.id !== 'cheolsango';
    for (const input of puffStyles.querySelectorAll<HTMLInputElement>(
      'input',
    )) {
      input.checked = input.value === (this.options.groundPuffStyle ?? 'base');
      input.disabled =
        puffStyles.hidden ||
        !this.options.showMovement ||
        !this.options.showGroundPuffs;
    }
    element('#ground-puff-style-description').textContent = !this.options
      .showMovement
      ? '이동 포함을 켜면 먼지가 표시됩니다.'
      : !this.options.showGroundPuffs
        ? '낮은 퍼프를 켜고 두 형태를 비교하세요.'
        : this.options.groundPuffStyle === 'kagenashi'
          ? '발 양옆의 단색 덩어리가 퍼졌다 갈라져 사라집니다.'
          : '기존의 작고 낮은 퍼프를 표시합니다.';
    element<HTMLButtonElement>('#strong-preset').disabled =
      !this.options.showMovement || !this.strongPresetAvailable();
    element<HTMLButtonElement>('#new-effects-preset').disabled =
      !this.options.showMovement ||
      (!motion.ki && !motion.finisher && !this.strongPresetAvailable());
    element<HTMLButtonElement>('#movement-preset').disabled =
      !this.options.showMovement ||
      !hasGroundEffects(motion) ||
      !motion.effects?.some((effect) => effect.kind === 'afterimage');
  }

  private applyEffectPreset(kind: 'strong' | 'movement'): void {
    if (!this.options.showMovement) return;
    if (kind === 'strong') {
      if (!this.strongPresetAvailable()) return;
      this.options = {
        ...this.options,
        showContacts: true,
        showSandbag: true,
        showInkEffects: hasInkEffects(this.selectedMotion),
        directionalImpacts:
          !hasInkEffects(this.selectedMotion) && !this.selectedMotion.ki,
      };
      this.hitStopEnabled = true;

      element('#preset-notice').textContent =
        '명중 효과·샌드백·강타 히트스톱을 켰어요. 수묵 지원 공격은 먹 튀김을, 나머지는 공격별 충격을 사용합니다.';
    } else {
      const motion = this.player.snapshot.motion;
      if (!hasGroundEffects(motion)) return;
      const enabledEffects = new Set(this.options.enabledEffects);
      for (const effect of motion.effects ?? [])
        if (effect.kind === 'afterimage') enabledEffects.add(effect.id);
      this.options = {
        ...this.options,
        showGroundEffects: true,
        enabledEffects,
      };
      element('#preset-notice').textContent =
        '빠른 구간의 짧은 잔상과 발밑 반응을 켰어요. 착지와 가드에서는 새 잔상을 만들지 않습니다.';
    }
    this.updatePresentationInputs();
    this.render();
  }

  async start(): Promise<void> {
    registerEmbeddedScene(this.dispose);
    window.addEventListener('pagehide', this.dispose, {
      signal: this.events.signal,
    });
    try {
      this.createMotionOptions();
      this.bindInput();
      element<HTMLFieldSetElement>('#controls').disabled = false;
      this.resize.observe(this.canvas);
      this.resizeCanvas();
      this.frameRequest = requestAnimationFrame(this.tick);
      await this.select(initialMotion);
      await this.presetControls.start();
    } catch (error: unknown) {
      this.status.textContent =
        error instanceof Error ? error.message : '그림을 불러오지 못했어요.';
      this.dispose();
    }
  }

  dispose = (): void => {
    this.disposed = true;
    this.events.abort();
    this.referenceLibrary.dispose();
    this.opacityControls.dispose();
    this.presetControls.dispose();
    this.gifExport?.abort();
    if (this.gifUrl) URL.revokeObjectURL(this.gifUrl);
    this.resize.disconnect();
    cancelAnimationFrame(this.frameRequest);
    this.effectSurfaces.silhouette.destroy();
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
    const isTrail = (effect: NonNullable<ComboMotion['effects']>[number]) =>
      effect.kind === 'line' || effect.kind === 'ribbon';
    for (const [id, choices] of [
      [
        'effect-options',
        (motion.effects ?? []).filter((effect) => !isTrail(effect)),
      ],
      ['legacy-effect-options', (motion.effects ?? []).filter(isTrail)],
    ] as const) {
      element(
        id === 'effect-options' ? '#effect-controls' : '#legacy-effect-options',
      ).hidden = !choices.length;
      element(`#${id}`).replaceChildren(
        ...choices.map((effect) =>
          presentationChoice(effect, {
            name: 'effect',
            type: 'checkbox',
            checked: this.options.enabledEffects.has(effect.id),
          }),
        ),
      );
    }
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
    const targetInput = element<HTMLInputElement>('#sandbag');
    const target = !targetInput.disabled && targetInput.checked;
    for (const input of element(
      '#camera-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      input.disabled =
        !this.options.showMovement || (input.value === 'impact' && !target);
      input.title =
        input.value === 'impact' && !this.options.showSandbag
          ? '샌드백 반응을 켜면 선택할 수 있습니다.'
          : '';
      input.checked = input.value === mode;
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
    const legacyEnabled =
      !this.inkTrailsEnabled && this.options.legacyTrails === 'motion';
    for (const input of element(
      '.presentation-controls',
    ).querySelectorAll<HTMLInputElement>('input[name="effect"]')) {
      const effect = effects.find((item) => item.id === input.value);
      const trail = effect?.kind === 'line' || effect?.kind === 'ribbon';
      input.disabled = !this.options.showMovement || (trail && !legacyEnabled);
      input.checked = this.options.enabledEffects.has(input.value);
      input.title =
        trail && !legacyEnabled
          ? '이전 궤적 비교에서 기존 선·면을 선택하면 적용합니다.'
          : '';
    }
    element('#effect-description').hidden = true;
  }

  private updateInkInputs(): void {
    const impactAvailable = hasInkEffects(this.selectedMotion);
    element('#ink-impact-scale-controls').hidden = !impactAvailable;
    const impact = element<HTMLInputElement>('#ink-impact-scale');
    impact.min = String(inkImpactScaleRange.min);
    impact.max = String(inkImpactScaleRange.max);
    impact.step = String(inkImpactScaleRange.step);
    impact.value = String(inkImpactSizeMultiplier(this.options));
    impact.disabled = !this.inkEffectsEnabled;
    const impactLabel =
      Number(impact.value) === 0
        ? '끔'
        : `${Number(impact.value).toFixed(1)}배`;
    element<HTMLOutputElement>('#ink-impact-scale-value').value = impactLabel;
    impact.setAttribute('aria-valuetext', impactLabel);
    element('#ink-impact-scale-description').textContent = this
      .inkEffectsEnabled
      ? '0은 숨김 · 1배는 기본 크기 · 최대 5배. 명중 위치와 농도는 유지합니다.'
      : !this.options.showMovement
        ? '이동 포함을 켜면 조절할 수 있어요.'
        : '명중 효과에서 먹튀김을 선택하면 조절할 수 있어요.';
    const trailsAvailable = hasInkTrails(this.selectedMotion);
    element('#ink-trail-scale-controls').hidden = !trailsAvailable;
    const scale = element<HTMLInputElement>('#ink-trail-scale');
    scale.min = String(inkTrailScaleRange.min);
    scale.max = String(inkTrailScaleRange.max);
    scale.step = String(inkTrailScaleRange.step);
    scale.value = String(inkTrailSizeMultiplier(this.options));
    scale.disabled = !this.options.showMovement;
    const value = Number(scale.value);
    const label = value === 0 ? '끔' : `${value.toFixed(1)}배`;
    element<HTMLOutputElement>('#ink-trail-scale-value').value = label;
    scale.setAttribute('aria-valuetext', label);
    element('#ink-trail-description').textContent =
      '0은 끔 · 1배는 기본 크기 · 최대 20배. 길이와 굵기를 함께 조절합니다.';
    const motionTrails = this.selectedMotion.effects?.some(
      (effect) => effect.kind === 'line' || effect.kind === 'ribbon',
    );
    const inkAvailable = hasInkEffects(this.selectedMotion);
    element('#legacy-comparison').hidden = !motionTrails && !inkAvailable;
    element('#legacy-trail-controls').hidden = !motionTrails && !inkAvailable;
    updateModeChoices({
      name: 'legacy-trail',
      available: [
        'none',
        ...(motionTrails ? ['motion'] : []),
        ...(inkAvailable ? ['ink'] : []),
      ],
      selected: this.options.legacyTrails ?? 'none',
      disabled: !this.options.showMovement,
    });
    element('#legacy-trail-description').textContent = [
      '이전 표현을 고르면 수묵 배율은 0으로 바뀝니다. 배율을 조절하면 이전 표현은 해제됩니다.',
      this.selectedMotion.finisher
        ? this.selectedMotion.ki
          ? '이전 먹획은 각 광탄의 실제 비행을 따르며 명중 먹튀김과 따로 조절합니다.'
          : '이전 먹획은 본체·공격 분신의 각 공격을 따르며 순간이동 구간은 잇지 않습니다.'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
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
    const targetInput = element<HTMLInputElement>('#sandbag');
    const target = !targetInput.disabled && targetInput.checked;
    for (const input of element(
      '#emphasis-options',
    ).querySelectorAll<HTMLInputElement>('input')) {
      const choice = emphasisChoices.find((item) => item.id === input.value);
      const needsTarget = !!choice && emphasisNeedsTarget(motion, choice.id);
      input.disabled = !this.options.showMovement || (needsTarget && !target);
      input.checked = input.value === mode;
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

  private setLoading(motion?: ComboMotion): void {
    this.loading = !!motion;
    this.presetControls.updateSelection({
      canSave:
        !this.loading &&
        this.presentationReady &&
        !!this.selectedMotion.finisher,
      loading: this.loading,
      motionId: this.selectedMotion.id,
    });
    const message = element('#load-status');
    message.hidden = !motion;
    message.textContent = motion
      ? `${motionOptionTitle(motion)} 그림을 불러오는 중이에요.`
      : '';
    element<HTMLButtonElement>('#gif-export').disabled =
      !this.gifExport && (this.loading || !this.presentationReady);
    this.canvas.setAttribute('aria-busy', String(this.loading));
    element('.playback-content').inert = this.loading;
    element('.presentation-controls').inert = this.loading;
    element('#frames').inert = this.loading;
    this.timeline.disabled = this.loading || !this.presentationReady;
    for (const id of ['#previous', '#next'])
      element<HTMLButtonElement>(id).disabled =
        this.loading || !this.presentationReady;
  }

  private async select(motion: ComboMotion): Promise<boolean> {
    const request = ++this.selectionRequest;
    const selectionSection = this.selectedSection;
    try {
      if (!this.frameLoader.has(motion)) {
        this.setLoading(motion);
        await this.frameLoader.load(motion);
      }
      // 먼저 요청한 그림이 늦게 도착해도 마지막 선택만 화면에 적용한다.
      if (this.disposed || request !== this.selectionRequest) return false;
      this.applySelection(motion, selectionSection);
      this.setLoading();
      this.previousTime = 0;
      return true;
    } catch {
      if (this.disposed || request !== this.selectionRequest) return false;
      this.setLoading();
      for (const [id, choice] of this.motionChoices)
        choice.querySelector<HTMLInputElement>('input')!.checked =
          this.presentationReady && id === motionOptionId(this.selectedMotion);
      if (this.presentationReady) {
        this.createDirectionOptions(this.selectedMotion);
        this.createVariantOptions(this.selectedMotion);
      }
      const message = element('#load-status');
      message.hidden = false;
      message.textContent = `${motionOptionTitle(motion)} 그림을 불러오지 못했어요. 동작을 다시 선택해 주세요.`;
      return false;
    }
  }

  private applySelection(motion: ComboMotion, selectionSection: string): void {
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
    element('#preset-notice').textContent = '';
    this.createPresentationOptions(motion);
    this.createDirectionOptions(motion);
    this.createVariantOptions(motion);
    this.presentationReady = true;
    const choice = this.motionChoices.get(motionOptionId(motion))!;
    choice.querySelector('input')!.checked = true;
    if (choice.hidden && this.selectedSection === selectionSection)
      this.selectedSection = 'all';
    this.filterMotions();
    this.playSelectedMotion();
    if (playback) {
      this.player.seek(playback.elapsedMs);
      this.player.setPaused(playback.paused);
      this.render();
    }
  }

  private playSelectedMotion(
    settings: {
      readonly preservePlayback?: boolean;
      readonly preserveTimeline?: boolean;
    } = {},
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
    const baseMotion = supplemented
      ? applySupplement(timedMotion)
      : timedMotion;
    const activeMotion = baseMotion;
    if (settings.preserveTimeline)
      this.player.replacePresentation(activeMotion);
    else this.player.play(activeMotion);
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
    if (isMeteorCircus(activeMotion))
      this.phaseButtons = circusScenePhases.map((phase) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = phase.label;
        button.dataset.time = String(phase.startMs);
        button.dataset.endTime = String(phase.endMs);
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
    if (playback && !settings.preserveTimeline) {
      this.player.seek(playback.elapsedMs);
      this.player.setPaused(playback.paused);
    }
    this.render();
  }

  private bindInput(): void {
    const options = { signal: this.events.signal };
    const puffStyles = element('#ground-puff-style-options');
    puffStyles.replaceChildren(
      sceneChoice({ id: 'base', label: '기존 퍼프' }, 'ground-puff-style'),
      sceneChoice(
        { id: 'kagenashi', label: '카게나시 연기' },
        'ground-puff-style',
      ),
    );
    puffStyles.addEventListener(
      'change',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const value = event.target.value;
        if (value !== 'base' && value !== 'kagenashi') return;
        this.options = { ...this.options, groundPuffStyle: value };
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element('#gif-export').addEventListener(
      'click',
      () => {
        if (this.gifExport) this.gifExport.abort();
        else void this.saveGif();
      },
      options,
    );
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
          void this.select(motion);
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
          void this.select(
            option.motions.find((item) => item === this.selectedMotion) ??
              option.motions[0]!,
          );
      },
      options,
    );
    element('#direction-options').addEventListener(
      'change',
      async (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const motionId = event.target.value;
        const motion = activeMotions.find((item) => item.id === motionId);
        if (
          !motion ||
          motionOptionId(motion) !== motionOptionId(this.selectedMotion)
        )
          return;
        const applied = await this.select(motion);
        if (!applied || this.disposed) return;
        element('#direction-options')
          .querySelector<HTMLInputElement>('input:checked')
          ?.focus();
      },
      options,
    );
    for (const id of ['effect-options', 'legacy-effect-options'])
      element(`#${id}`).addEventListener(
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
            ? event.target.closest<HTMLButtonElement>('button')
            : null;
        if (target?.dataset.time !== undefined)
          this.player.seek(Number(target.dataset.time));
        else if (target?.dataset.step !== undefined)
          this.player.showStep(Number(target.dataset.step));
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
        this.updateEffectInputs();
        if (this.selectedMotion.finisher?.theme === 'drunken-tiger') {
          this.playSelectedMotion({
            preservePlayback: true,
            preserveTimeline: true,
          });
        } else {
          this.updatePresentationInputs();
          this.render();
        }
      },
      options,
    );
    element<HTMLInputElement>('#ink-trail-scale').addEventListener(
      'input',
      (event) => {
        this.options = {
          ...this.options,
          inkTrailScale: (event.currentTarget as HTMLInputElement)
            .valueAsNumber,
          legacyTrails: 'none',
        };
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element<HTMLInputElement>('#ink-impact-scale').addEventListener(
      'input',
      (event) => {
        this.options = {
          ...this.options,
          inkImpactScale: (event.currentTarget as HTMLInputElement)
            .valueAsNumber,
        };
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    for (const name of Object.keys(
      presentationModeChoices,
    ) as PresentationMode[]) {
      element(`#${name}-options`).addEventListener(
        'change',
        (event) => {
          if (!(event.target instanceof HTMLInputElement)) return;
          const value = event.target.value;
          if (
            !presentationModeChoices[name].some((choice) => choice.id === value)
          )
            return;
          if (name === 'impact-style') {
            this.options = {
              ...this.options,
              showContacts: value !== 'none',
              showInkEffects: value === 'ink',
              directionalImpacts: value === 'directional',
            };
          } else if (name === 'focus-mode') {
            this.options = {
              ...this.options,
              showFocusLines: value === 'ink',
              showBetaFlash: value === 'beta',
            };
          } else if (name === 'scene-impact') {
            this.options = {
              ...this.options,
              showShockwave: value === 'wave',
              showActionFrame: value === 'frame',
            };
          } else if (name === 'hit-stop') {
            this.hitStopEnabled = value !== 'none';
            this.hitStopShakeEnabled = value === 'shake';
          } else if (name === 'finisher-mode') {
            this.options = {
              ...this.options,
              showFinisher: value !== 'none',
              showFinisherConcept: value === 'concept',
            };
            this.playSelectedMotion({
              preservePlayback: true,
              preserveTimeline: true,
            });
            return;
          } else if (name === 'erosion-mode') {
            this.options = {
              ...this.options,
              showErosion: value !== 'none',
              showDirectionalErosion: value === 'directional',
            };
          } else if (
            name === 'legacy-trail' &&
            (value === 'none' || value === 'motion' || value === 'ink')
          ) {
            const enabledEffects = new Set(this.options.enabledEffects);
            const trails = (this.selectedMotion.effects ?? []).filter(
              (effect) => effect.kind === 'line' || effect.kind === 'ribbon',
            );
            if (
              value === 'motion' &&
              !trails.some((effect) => enabledEffects.has(effect.id))
            )
              for (const effect of trails) enabledEffects.add(effect.id);
            this.options = {
              ...this.options,
              legacyTrails: value,
              inkTrailScale: value === 'none' ? this.options.inkTrailScale : 0,
              enabledEffects,
            };
          }
          this.updatePresentationInputs();
          this.render();
        },
        options,
      );
    }
    for (const [id, key] of [
      ['sandbag', 'showSandbag'],
      ['ground-effects', 'showGroundEffects'],
      ['camera-recoil', 'showCameraRecoil'],
      ['speed-lines', 'showSpeedLines'],
      ['local-charge', 'showLocalCharge'],
      ['ki-flow', 'showFlowAccent'],
      ['release-glint', 'showReleaseGlint'],
      ['viscous-orbit', 'showViscousOrbit'],
      ['effect-hierarchy', 'showEffectHierarchy'],
      ['ground-puffs', 'showGroundPuffs'],
      ['floor-trace', 'showFloorTrace'],
      ['depth-layers', 'showDepthLayers'],
      ['release-kick', 'showReleaseKick'],
      ['impact-lettering', 'showImpactLettering'],
      ['end-silhouette', 'showEndSilhouette'],
      ['brush-glyph', 'showBrushGlyph'],
      ['cutin', 'showCutin'],
      ['ki-lighting', 'showKiLighting'],
      ['erosion-glow', 'showErosionGlow'],
    ] as const) {
      element<HTMLInputElement>(`#${id}`).addEventListener(
        'change',
        (event) => {
          this.options = {
            ...this.options,
            [key]: (event.currentTarget as HTMLInputElement).checked,
          };
          this.updatePresentationInputs({
            refreshHitStops: id === 'cutin' || id === 'sandbag',
          });
          this.render();
        },
        options,
      );
    }
    element<HTMLInputElement>('#finisher-slow').addEventListener(
      'change',
      (event) => {
        this.finalSlowEnabled = (
          event.currentTarget as HTMLInputElement
        ).checked;
        this.updatePresentationInputs({ refreshHitStops: false });
        this.render();
      },
      options,
    );
    element('#new-effects-preset').addEventListener(
      'click',
      () => {
        const motion = this.selectedMotion;
        const wave = motion.ki?.style === 'beam' || !!motion.finisher;
        this.options = {
          ...this.options,
          ...(motion.ki
            ? { showKiLighting: true, showErosion: true, showErosionGlow: true }
            : {}),
          ...(wave ? { showShockwave: true, showActionFrame: false } : {}),
          showSandbag: true,
        };
        if (this.strongPresetAvailable()) {
          this.hitStopEnabled = true;
          this.hitStopShakeEnabled = true;
        }
        if (motion.finisher) this.finalSlowEnabled = true;
        this.updatePresentationInputs();
        element('#preset-notice').textContent =
          '현재 동작에서 지원하는 조명·소멸·충격·명중 정지를 켰어요. 각 묶음에서 따로 비교할 수 있습니다.';
        this.render();
      },
      options,
    );

    element('#strong-preset').addEventListener(
      'click',
      () => this.applyEffectPreset('strong'),
      options,
    );
    element('#movement-preset').addEventListener(
      'click',
      () => this.applyEffectPreset('movement'),
      options,
    );
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
          this.referenceLibrary.open ||
          this.loading ||
          !this.presentationReady ||
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

  private async saveGif(): Promise<void> {
    if (
      this.disposed ||
      this.loading ||
      !this.presentationReady ||
      this.gifExport
    )
      return;
    const controller = new AbortController();
    this.gifExport = controller;
    const button = element<HTMLButtonElement>('#gif-export');
    const progress = element<HTMLProgressElement>('#gif-export-progress');
    const status = element('#gif-export-status');
    const replay = this.player.createReplay();
    const title = motionOptionTitle(replay.player.snapshot.motion);
    const speed = element<HTMLSelectElement>('#speed').value;
    const filename = `ataho-${replay.player.snapshot.motion.id}-${speed}x-${Date.now()}.gif`;
    button.textContent = '저장 취소';
    button.setAttribute('aria-describedby', 'gif-export-status');
    progress.hidden = false;
    progress.value = 0;
    status.hidden = false;
    status.textContent = `${title} · GIF 준비 중…`;
    try {
      const blob = await exportComboGif({
        replay,
        frames: this.frames,
        options: {
          ...this.options,
          enabledEffects: new Set(this.options.enabledEffects),
        },
        hitStopShake: this.hitStopShakeActive,
        signal: controller.signal,
        onProgress: (value) => {
          progress.value = value;
          status.textContent = `${title} · GIF 저장 중 ${Math.round(value * 100)}%`;
        },
      });
      if (this.disposed || controller.signal.aborted) return;
      if (this.gifUrl) URL.revokeObjectURL(this.gifUrl);
      this.gifUrl = URL.createObjectURL(blob);
      const download = element<HTMLAnchorElement>('#gif-download');
      download.href = this.gifUrl;
      download.download = filename;
      download.hidden = false;
      const preview = element<HTMLImageElement>('#gif-preview');
      preview.src = this.gifUrl;
      preview.alt = `${title} · ${speed}배속 · 저장한 GIF`;
      element('#gif-result').hidden = false;
      status.textContent = `${title} · ${speed}배속 · GIF 저장 완료 (${(blob.size / 1024 / 1024).toFixed(1)} MB)`;
      download.click();
    } catch (error: unknown) {
      if (this.disposed) return;
      status.textContent = controller.signal.aborted
        ? 'GIF 저장을 취소했어요.'
        : `GIF 저장에 실패했어요. ${error instanceof Error ? error.message : '다시 시도해 주세요.'}`;
    } finally {
      this.gifExport = undefined;
      if (!this.disposed) {
        progress.hidden = true;
        button.textContent = 'GIF 저장';
        button.setAttribute('aria-describedby', 'gif-export-description');
        button.disabled = this.loading || !this.presentationReady;
      }
    }
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
    if (this.presentationReady) this.render();
  }

  private render(): void {
    const snapshot = this.player.snapshot;
    const drawn = drawCombo(
      this.context,
      snapshot,
      this.frames,
      {
        ...this.options,
        hitStopElapsedMs: this.hitStopShakeActive
          ? this.player.hitStopElapsedMs
          : undefined,
      },
      this.effectSurfaces,
    );
    const cameraValue = element(
      '#camera-options',
    ).querySelector<HTMLInputElement>('input:checked:not(:disabled)')?.value;
    const cameraChoice = cameraStagingChoices.find(
      (choice) => choice.id === cameraValue,
    );
    const emphasisValue = element(
      '#emphasis-options',
    ).querySelector<HTMLInputElement>('input:checked:not(:disabled)')?.value;
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
              (this.inkTrailsEnabled ||
                this.options.legacyTrails !== 'motion') &&
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
        ...(this.inkEffectsEnabled ? ['명중 먹튀김'] : []),
        ...(this.inkTrailsEnabled
          ? [`수묵 궤적 ${inkTrailSizeMultiplier(this.options)}배`]
          : []),
        ...[
          'local-charge',
          'cutin',
          'ki-lighting',
          'ki-flow',
          'release-glint',
          'effect-hierarchy',
          'ground-puffs',
          'floor-trace',
          'depth-layers',
          'release-kick',
          'impact-lettering',
          'end-silhouette',
          'brush-glyph',
          'erosion-glow',
          'finisher-slow',
        ].flatMap((id) => {
          const input = element<HTMLInputElement>(`#${id}`);
          return input.checked && !input.disabled
            ? [input.closest('label')!.textContent!.trim()]
            : [];
        }),
        ...(
          [
            'focus-mode',
            'scene-impact',
            'hit-stop',
            'erosion-mode',
            'legacy-trail',
            'ground-puff-style',
          ] as const
        ).flatMap((name) => {
          const input = element(
            `#${name}-options`,
          ).querySelector<HTMLInputElement>('input:checked');
          return input && !input.disabled && input.value !== 'none'
            ? [input.closest('label')!.textContent!.trim()]
            : [];
        }),

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
        ...(this.options.showMovement &&
        this.options.showContacts &&
        this.options.directionalImpacts &&
        !this.inkEffectsEnabled
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
      drawn.circus?.phase ??
      (this.options.showMovement
        ? finisherContactPhase(snapshot.motion, snapshot.elapsedMs)
        : undefined) ??
      snapshot.step.phase;
    const statusParts = [phase];
    if (ki)
      statusParts.push(
        `기공 ${kiHits}/${ki.hits.length}${this.options.showSandbag || drawn.circus ? '명중' : '타'}`,
      );
    statusParts.push(
      `${snapshot.motion.finisher ? '본체 자세' : '자세'} ${snapshot.stepIndex + 1}/${snapshot.motion.steps.length}`,
      `${(snapshot.elapsedMs / 1000).toFixed(2)}초`,
    );
    if (this.player.stopKind === 'hit') statusParts.push('명중 정지');
    if (this.player.stopKind === 'super') statusParts.push('필살기 프리즈');
    if (this.player.presentationSpeed < 1)
      statusParts.push(`결정타 ${this.player.presentationSpeed}배속`);
    this.status.textContent = statusParts.join(' · ');
    // 기존 단계·타격 명령으로 재현한 시점과 실제 비행 탄 수를 함께 관찰한다.
    if (drawn.circus)
      this.canvas.setAttribute(
        'aria-label',
        `유성권 · 이타노 서커스 추격 · ${drawn.circus.phase} · ${drawn.circus.hits}/32명중`,
      );
    this.canvas.dataset.circusPhase = drawn.circus?.phase ?? '';
    this.canvas.dataset.circusForeground = String(
      drawn.circus?.foreground ?? 0,
    );
    this.canvas.dataset.circusTarget = drawn.circus
      ? JSON.stringify(drawn.circus.target)
      : '';
    this.canvas.dataset.circusCamera = drawn.circus
      ? JSON.stringify(drawn.circus.camera)
      : '';
    this.canvas.dataset.elapsedMs = snapshot.elapsedMs.toFixed(3);
    this.canvas.dataset.durationMs = snapshot.durationMs.toFixed(3);
    const descent =
      this.options.showMovement &&
      this.options.showFinisher &&
      this.options.showFinisherConcept
        ? sampleDemonDescent(snapshot)
        : undefined;
    this.canvas.dataset.demonDescent = descent
      ? JSON.stringify({
          phase: descent.phase,
          fallProgress: descent.fallProgress,
          impactAgeMs: descent.impactAgeMs,
          bodyOpacity: descent.bodyOpacity,
          contactMs: descent.contactMs,
          x: snapshot.x,
          y: snapshot.y,
        })
      : '';
    this.canvas.dataset.waiting = String(snapshot.waiting);
    this.canvas.dataset.projectiles = String(
      this.options.showMovement
        ? (kiSample?.shots.filter((shot) => shot.visible).length ?? 0)
        : 0,
    );
    this.canvas.dataset.motion = snapshot.motion.id;
    this.canvas.dataset.step = String(snapshot.stepIndex);
    this.canvas.dataset.paused = String(snapshot.paused);
    this.canvas.dataset.hitStop = String(this.player.stopKind === 'hit');
    this.canvas.dataset.superFreeze = String(this.player.stopKind === 'super');
    this.canvas.dataset.localCharge = drawn.localChargePhase;
    this.canvas.dataset.cutin = String(drawn.cutinActive);
    this.canvas.dataset.erosion = String(
      !!this.options.showMovement &&
        !!this.options.showErosion &&
        (!!snapshot.motion.ki || this.inkEffectsEnabled),
    );
    this.canvas.dataset.kiLights = String(drawn.lightCount);
    this.canvas.dataset.viscousOrbit = String(
      this.options.showMovement &&
        !!this.options.showViscousOrbit &&
        hasViscousOrbit(snapshot.motion),
    );
    this.canvas.dataset.focusLines = String(drawn.focusLines);
    this.canvas.dataset.betaFlash = String(drawn.betaFlash);
    this.canvas.dataset.silhouette = String(drawn.silhouette);
    this.canvas.dataset.lettering = String(drawn.lettering);
    this.canvas.dataset.brushGlyph = String(drawn.brushGlyph);
    this.canvas.dataset.actionFrame = String(drawn.actionFrame);
    this.canvas.dataset.decorationOpacity = String(drawn.decorationOpacity);
    this.canvas.dataset.finisherOpacities = JSON.stringify(
      drawn.finisherOpacities,
    );
    this.canvas.dataset.erosionGlow = String(
      !!this.options.showMovement &&
        !!this.options.showErosion &&
        !!this.options.showErosionGlow &&
        !!snapshot.motion.ki,
    );
    this.canvas.dataset.shockwave = String(drawn.shockwave);
    this.canvas.dataset.presentationSpeed = String(
      this.player.presentationSpeed,
    );
    this.canvas.dataset.targetJitter = String(drawn.targetJitter);
    this.canvas.dataset.targetHitHeld = String(drawn.targetHitHeld);
    this.canvas.dataset.impactAccent = String(drawn.impactAccent);
    this.canvas.dataset.impacts = String(drawn.impactCount);
    this.canvas.dataset.inkCount = String(drawn.inkCount);
    this.canvas.dataset.inkImpactScale = String(
      inkImpactSizeMultiplier(this.options),
    );
    this.canvas.dataset.inkImpacts = JSON.stringify(drawn.inkImpacts);
    this.canvas.dataset.inkTrailCount = String(drawn.inkTrailCount);
    this.canvas.dataset.inkTrailsEnabled = String(this.inkTrailsEnabled);
    this.canvas.dataset.enhancedInkTrailsEnabled = String(
      this.inkTrailsEnabled && inkTrailSizeMultiplier(this.options) > 1,
    );
    this.canvas.dataset.inkTrailScale = String(
      this.inkTrailsEnabled ? inkTrailSizeMultiplier(this.options) : 0,
    );
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
    this.canvas.dataset.finisherConcept = drawn.finisherConcept;
    this.canvas.dataset.finisherHits = String(drawn.finisherHits);
    this.canvas.dataset.kiHits = String(kiHits);
    this.canvas.dataset.kiPhase = kiSample?.phase ?? '';
    this.canvas.dataset.kiStyle = ki?.style ?? '';
    this.phaseButtons.forEach((button) => {
      const active =
        button.dataset.time !== undefined
          ? snapshot.elapsedMs >= Number(button.dataset.time) &&
            snapshot.elapsedMs < Number(button.dataset.endTime)
          : snapshot.stepIndex >= Number(button.dataset.step) &&
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
    if (
      !this.referenceLibrary.open &&
      !this.loading &&
      this.presentationReady
    ) {
      this.player.update(delta);
      this.render();
    }
    this.frameRequest = requestAnimationFrame(this.tick);
  };
}

void new ComboScreen().start();
