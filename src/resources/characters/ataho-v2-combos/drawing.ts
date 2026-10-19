import {
  drawMeteorCircus,
  type CircusDrawingState,
} from './meteor-circus-drawing.js';
import type { FinisherConceptFrame } from './finisher-concept-types.js';
import {
  finisherOpacityValue,
  type FinisherOpacityKey,
  type FinisherOpacityOptions,
  type FinisherOpacityValues,
} from './finisher-opacity.js';
import {
  drawConceptBackdrop,
  drawConceptEchoes,
  drawConceptOverlay,
  drawConceptScreenOverlay,
  finisherConcept,
} from './finisher-concepts.js';
import {
  inkConceptActorOpacity,
  inkConceptBodyOpacity,
  inkConceptTargetOpacity,
} from './finisher-ink-concept.js';
import type { ComboSnapshot } from './player.js';
import { hasViscousOrbit } from './motion-options.js';
import {
  sampleKiLights,
  drawKiFloorLight,
  type KiLighting,
} from './ki-lighting.js';
import {
  sampleShockwave,
  type BackgroundShockwave,
} from './shockwave-presentation.js';
import { BodySilhouette } from './body-silhouette.js';
import { drawDojo } from './dojo-drawing.js';
import {
  drawStageGroundAccents,
  sampleReleaseKick,
  type GroundPuffStyle,
} from './stage-accents.js';
import {
  sampleComicAccents,
  hasActionFrame,
  drawComicBackdrop,
  drawComicOverlay,
} from './comic-accents.js';
import { finisherDecorationOpacity } from './effect-hierarchy.js';
import { drawFocusLines, sampleFocusLines } from './focus-lines.js';
import { teleportOpacity } from './teleport-presentation.js';
import { finisherContactPhase } from './finisher-actors.js';
import { frameKey, type SourceFrame } from './source-frames.js';

import { drawMotionEffects } from './effects-drawing.js';
import { drawPoseWithParts } from './parts-drawing.js';
import { sampleSandbag } from './sandbag.js';
import { drawSandbag } from './sandbag-drawing.js';
import { drawImpacts, sampleImpacts } from './impact-effects.js';
import { drawCombatEffectSprite } from './combat-effect-sprites.js';
import { hasInkEffects, sampleInkEffects } from './ink-effects.js';
import { drawInkEffects } from './ink-drawing.js';
import {
  inkImpactSizeMultiplier,
  resizeInkImpact,
  type InkImpactSizeOptions,
} from './ink-impact-size.js';
import type { InkSample } from './ink-types.js';
import { drawInkTrails } from './ink-trail-drawing.js';
import { hasInkTrails, sampleMotionInkTrails } from './ink-trail-motion.js';
import { sampleKiInkTrails } from './ink-trail-ki.js';
import {
  inkTrailSizeMultiplier,
  visibleInkTrailPoints,
  type InkTrailEnhancement,
  type InkTrailSample,
} from './ink-trail-types.js';
import { sampleCameraRecoil } from './camera-effects.js';
import {
  sampleCameraStaging,
  type CameraStagingMode,
} from './camera-staging.js';
import { composeCameraView } from './camera-framing.js';
import { groundShadow, sampleGroundEffects } from './ground-effects.js';
import { drawGroundEffects } from './ground-drawing.js';
import { drawImpactAttackGround } from './impact-attack-presentation.js';
import {
  sampleEmphasis,
  drawImpactAccent,
  type EmphasisMode,
} from './emphasis-effects.js';
import { sampleLocalCharge, drawLocalCharge } from './charge-effects.js';
import { sampleCutin, drawCutin } from './cutin-presentation.js';
import { drawSpeedLines, sampleSpeedLines } from './speed-lines.js';
import {
  drawKiBackdrop,
  drawKiForeground,
  drawKiOverlay,
} from './ki-drawing.js';
import { collectSandbagContacts } from './sandbag.js';
import {
  drawFinisherBackdrop,
  drawFinisherPaths,
  drawFinisherActors,
  drawFinisherEchoes,
  drawFinisherOverlay,
  drawFinisherStrikes,
  sampleFinisher,
} from './finisher-presentation.js';
import {
  drawPose,
  posePosition,
  poseWithDrawing,
  stageWidth,
  stageHeight,
  groundY,
  type PoseDrawingOptions,
} from './pose-drawing.js';
export { stageWidth, stageHeight } from './pose-drawing.js';

export type DrawingOptions = PoseDrawingOptions &
  InkTrailEnhancement &
  InkImpactSizeOptions &
  FinisherOpacityOptions & {
    readonly composition?: 'workbench' | 'cutscene';
    readonly showContacts: boolean;
    readonly showInkEffects?: boolean;
    readonly legacyTrails?: 'none' | 'motion' | 'ink';
    readonly showSandbag?: boolean;
    readonly directionalImpacts?: boolean;
    readonly showGroundEffects?: boolean;
    readonly showCameraRecoil?: boolean;
    readonly cameraMode?: CameraStagingMode;
    readonly emphasisMode?: EmphasisMode;
    readonly showSpeedLines?: boolean;
    readonly showFinisher?: boolean;
    readonly showFinisherConcept?: boolean;
    readonly showLocalCharge?: boolean;
    readonly showFocusLines?: boolean;
    readonly showDirectionalErosion?: boolean;
    readonly showBetaFlash?: boolean;
    readonly showFlowAccent?: boolean;
    readonly showReleaseGlint?: boolean;
    readonly showViscousOrbit?: boolean;
    readonly showEffectHierarchy?: boolean;
    readonly showGroundPuffs?: boolean;
    readonly groundPuffStyle?: GroundPuffStyle;
    readonly showFloorTrace?: boolean;
    readonly showDepthLayers?: boolean;
    readonly showReleaseKick?: boolean;
    readonly showImpactLettering?: boolean;
    readonly showEndSilhouette?: boolean;
    readonly showBrushGlyph?: boolean;
    readonly showActionFrame?: boolean;
    readonly showCutin?: boolean;
    readonly showErosion?: boolean;
    readonly showKiLighting?: boolean;
    readonly showErosionGlow?: boolean;
    readonly showShockwave?: boolean;
    readonly hitStopElapsedMs?: number;
    readonly enabledEffects: ReadonlySet<string>;
  };

export type ComboDrawingState = {
  readonly circus?: CircusDrawingState;
  readonly impactCount: number;
  readonly inkCount: number;
  readonly inkImpacts: readonly Pick<
    InkSample,
    'x' | 'y' | 'width' | 'height' | 'rotation' | 'mirrorX'
  >[];
  readonly inkTrailCount: number;
  readonly groundCount: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly cameraZoom: number;
  readonly backgroundDim: number;
  readonly palette: boolean;
  readonly emphasisPhase: 'none' | 'preparation' | 'impact';
  readonly speedLineCount: number;
  readonly finisherBeat: string;
  readonly finisherConcept: string;
  readonly finisherHits: number;
  readonly localChargePhase: 'none' | 'charge' | 'release';
  readonly cutinActive: boolean;
  readonly impactAccent: boolean;
  readonly lightCount: number;
  readonly focusLines: boolean;
  readonly betaFlash: boolean;
  readonly silhouette: boolean;
  readonly lettering: boolean;
  readonly brushGlyph: boolean;
  readonly actionFrame: boolean;
  readonly decorationOpacity: number;
  readonly finisherOpacities: FinisherOpacityValues;
  readonly shockwave: boolean;
  readonly targetJitter: number;
  readonly targetHitHeld: boolean;
};

export function drawCombo(
  ctx: CanvasRenderingContext2D,
  snapshot: ComboSnapshot,
  frames: ReadonlyMap<string, SourceFrame>,
  options: DrawingOptions,
  surfaces?: {
    readonly lighting: KiLighting;
    readonly shockwave: BackgroundShockwave;
    readonly silhouette?: BodySilhouette;
  },
): ComboDrawingState {
  const finisher = sampleFinisher(snapshot, options);
  const conceptEnabled =
    !!finisher &&
    !!options.showFinisherConcept &&
    !snapshot.waiting &&
    snapshot.elapsedMs < snapshot.durationMs;
  const comic = sampleComicAccents(
    snapshot,
    conceptEnabled
      ? {
          ...options,
          showActionFrame: false,
          showEndSilhouette: false,
          showImpactLettering: false,
        }
      : options,
  );
  const impactDecorationOpacity = comic.suppressImpactDecoration ? 0.32 : 1;
  const hierarchyOpacity = finisherDecorationOpacity(
    snapshot,
    !!options.showEffectHierarchy,
  );
  const inkDecorationOpacity = hierarchyOpacity * impactDecorationOpacity;
  const conceptOpacity = (key: FinisherOpacityKey): number =>
    conceptEnabled ? finisherOpacityValue(options, key) : 1;
  const finisherOpacities: FinisherOpacityValues = {
    attackTrail: conceptOpacity('attackTrail') * inkDecorationOpacity,
    movementTrail: conceptOpacity('movementTrail') * inkDecorationOpacity,
    kiTrail: conceptOpacity('kiTrail') * inkDecorationOpacity,
    legacySweep: conceptOpacity('legacySweep') * inkDecorationOpacity,
    inkImpact: conceptOpacity('inkImpact') * inkDecorationOpacity,
    backdrop: conceptOpacity('backdrop') * hierarchyOpacity,
    paths: conceptOpacity('paths') * hierarchyOpacity,
    hitTraces: conceptOpacity('hitTraces'),
    release: conceptOpacity('release'),
  };
  // 단일 장식 진단값을 읽던 화면에는 무대장식 채널을 계속 제공한다.
  const decorationOpacity = finisherOpacities.backdrop;
  const charge = sampleLocalCharge(snapshot, {
    ...options,
    enabled: !!options.showLocalCharge,
  });
  const focus = sampleFocusLines(snapshot, options);
  const cutin = sampleCutin(snapshot, {
    ...options,
    enabled: !!options.showCutin,
  });
  const contacts =
    snapshot.motion.ki || options.showShockwave
      ? collectSandbagContacts(snapshot.motion, options)
      : [];
  const kiOptions = {
    ...options,
    showViscousOrbit:
      !!options.showViscousOrbit && hasViscousOrbit(snapshot.motion),
    contacts,
  };
  const lights = options.showKiLighting
    ? sampleKiLights(snapshot, kiOptions)
    : [];
  const actionFrameEnabled =
    !!options.showActionFrame &&
    !!options.showSandbag &&
    options.showMovement &&
    hasActionFrame(snapshot.motion);
  const wave =
    options.showShockwave && !actionFrameEnabled
      ? sampleShockwave(snapshot, kiOptions)
      : undefined;
  const jitter =
    options.hitStopElapsedMs === undefined
      ? 0
      : [1.5, -1.5, 1, -1][Math.floor(options.hitStopElapsedMs / 8) % 4]!;
  const inkEnabled =
    options.showMovement &&
    !!options.showInkEffects &&
    hasInkEffects(snapshot.motion);
  const shoulderSprite =
    snapshot.motion.id === 'cheolsango' &&
    options.showMovement &&
    options.showContacts &&
    (inkEnabled || !!options.directionalImpacts) &&
    frames.has('combat-vfx:shoulder-crush');
  const impacts =
    options.showMovement &&
    ((!inkEnabled && options.showContacts) ||
      shoulderSprite ||
      options.showCameraRecoil)
      ? sampleImpacts(snapshot, options)
      : [];
  const inkTrailSize = inkTrailSizeMultiplier(options);
  const inkTrailsEnabled =
    options.showMovement && inkTrailSize > 0 && hasInkTrails(snapshot.motion);
  const legacyInkEnabled =
    options.showMovement &&
    inkTrailSize === 0 &&
    options.legacyTrails === 'ink' &&
    hasInkEffects(snapshot.motion);
  const legacyMotionEnabled =
    options.showMovement &&
    inkTrailSize === 0 &&
    options.legacyTrails === 'motion';
  const inkImpactSize = inkImpactSizeMultiplier(options);
  const ink = (
    inkEnabled || legacyInkEnabled
      ? sampleInkEffects(snapshot, frames, options)
      : []
  )
    .filter((sample) =>
      sample.phase === 'impact'
        ? inkEnabled && !shoulderSprite
        : legacyInkEnabled,
    )
    .flatMap((sample) => {
      const resized = resizeInkImpact(sample, inkImpactSize);
      return resized ? [resized] : [];
    })
    .map((sample) => ({
      ...sample,
      opacity:
        sample.opacity *
        (sample.phase === 'impact'
          ? finisherOpacities.inkImpact
          : finisherOpacities.legacySweep),
    }))
    .filter((sample) => sample.opacity > 0);
  const visibleTrail = (sample: InkTrailSample): boolean =>
    visibleInkTrailPoints(sample.points, snapshot.elapsedMs, sample.lifetimeMs)
      .length > 1;
  const motionInkTrails = inkTrailsEnabled
    ? sampleMotionInkTrails(snapshot, frames, options)
        .filter(visibleTrail)
        .map((sample) => ({
          ...sample,
          opacity:
            sample.opacity *
            (sample.attack
              ? finisherOpacities.attackTrail
              : finisherOpacities.movementTrail),
        }))
        .filter((sample) => sample.opacity > 0)
    : [];
  const kiInkTrails = inkTrailsEnabled
    ? sampleKiInkTrails(snapshot, options)
        .filter(visibleTrail)
        .map((sample) => ({
          ...sample,
          opacity: sample.opacity * finisherOpacities.kiTrail,
        }))
        .filter((sample) => sample.opacity > 0)
    : [];
  const impactCamera =
    options.showMovement && options.showSandbag && options.showCameraRecoil
      ? sampleCameraRecoil(snapshot, impacts, options)
      : { x: 0, y: 0 };
  const releaseKick = sampleReleaseKick(snapshot, options);
  const camera = releaseKick.x || releaseKick.y ? releaseKick : impactCamera;
  const staging = sampleCameraStaging(snapshot, {
    ...options,
    mode: options.showMovement ? (options.cameraMode ?? 'none') : 'none',
  });
  const view = composeCameraView(snapshot, frames, {
    ...options,
    staging,
    recoil: camera,
  });
  const conceptFrame: FinisherConceptFrame | undefined =
    conceptEnabled && finisher
      ? {
          snapshot,
          finisher,
          frames,
          options,
          bounds: view.visibleBounds,
        }
      : undefined;
  const conceptBodyOpacity =
    conceptFrame && finisher?.definition.theme === 'demon'
      ? inkConceptBodyOpacity(conceptFrame)
      : undefined;
  const actorOpacity = conceptBodyOpacity ?? finisher?.actorOpacity ?? 1;
  const targetOpacity =
    conceptFrame && finisher?.definition.theme === 'demon'
      ? inkConceptTargetOpacity(conceptFrame)
      : (finisher?.actorOpacity ?? 1);
  const ground =
    options.showMovement && options.showGroundEffects
      ? sampleGroundEffects(snapshot, frames, options)
      : [];
  const emphasis = sampleEmphasis(snapshot, {
    ...options,
    mode: options.showMovement ? (options.emphasisMode ?? 'none') : 'none',
  });
  const backgroundDim = Math.max(
    emphasis.backgroundDim,
    finisher?.backgroundDim ?? 0,
  );
  const speedLines =
    options.showMovement && options.showSpeedLines
      ? sampleSpeedLines(snapshot, options)
      : [];
  const target =
    options.showMovement && options.showSandbag
      ? sampleSandbag(snapshot, {
          scale: options.scale,
          enabledEffects: options.enabledEffects,
        })
      : undefined;
  const state: ComboDrawingState = {
    impactCount: shoulderSprite
      ? inkEnabled && inkImpactSize === 0
        ? 0
        : impacts.length
      : inkEnabled
        ? ink.filter((sample) => sample.phase === 'impact').length
        : options.showContacts
          ? impacts.length
          : 0,
    inkCount: ink.length,
    inkImpacts: ink
      .filter((sample) => sample.phase === 'impact')
      .map(({ x, y, width, height, rotation, mirrorX }) => ({
        x,
        y,
        width,
        height,
        rotation,
        mirrorX,
      })),
    inkTrailCount: motionInkTrails.length + kiInkTrails.length,
    groundCount: ground.length,
    cameraX: view.translateX,
    cameraY: view.translateY,
    cameraZoom: view.zoom,
    backgroundDim,
    palette: emphasis.palette,
    emphasisPhase: emphasis.phase,
    speedLineCount: speedLines.length,
    finisherBeat: finisher?.beat.label ?? '',
    finisherConcept: conceptFrame
      ? (finisherConcept(snapshot.motion)?.label ?? '')
      : '',
    finisherHits: finisher?.hitCount ?? 0,
    localChargePhase: charge?.phase ?? 'none',
    cutinActive: !!cutin,
    impactAccent: options.showContacts && !!emphasis.accent,
    lightCount: lights.length,
    focusLines: !!focus,
    betaFlash: focus?.mode === 'beta',
    silhouette: comic.silhouetteOpacity > 0,
    lettering: !!comic.lettering,
    brushGlyph: !!comic.brushGlyph,
    actionFrame: !!comic.actionFrame,
    decorationOpacity,
    finisherOpacities,
    shockwave: !!wave,
    targetJitter: options.showMovement && options.showSandbag ? jitter : 0,
    targetHitHeld: target?.hitHeld ?? false,
  };
  const circus = drawMeteorCircus(ctx, snapshot, frames, options);
  if (circus)
    return {
      ...state,
      circus,
      finisherHits: circus.hits,
      finisherBeat: circus.phase,
      impactCount: circus.impacts,
      inkCount: 0,
      inkImpacts: [],
      inkTrailCount: 0,
      groundCount: 0,
      cameraX: circus.camera.x,
      cameraY: circus.camera.y,
      cameraZoom: 1,
      cutinActive: false,
      targetJitter: 0,
      targetHitHeld: false,
      backgroundDim: 0,
      palette: false,
      emphasisPhase: 'none',
      speedLineCount: 0,
      finisherConcept: '이타노 서커스 · 추격',
      localChargePhase: 'none',
      impactAccent: circus.impacts > 0,
      lightCount: 0,
      focusLines: false,
      betaFlash: false,
      silhouette: false,
      lettering: false,
      brushGlyph: false,
      actionFrame: false,
      shockwave: false,
    };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, stageWidth, stageHeight);
  ctx.clip();
  ctx.translate(view.translateX, view.translateY);
  ctx.scale(view.zoom, view.zoom);
  // 컷씬은 자체 배경과 HUD 위에 같은 동작·효과를 합성한다.
  if (options.composition !== 'cutscene')
    drawDojo(ctx, view, snapshot, options);
  if (backgroundDim > 0) {
    ctx.save();
    ctx.globalAlpha = backgroundDim;
    ctx.fillStyle = '#242331';
    const bounds = view.visibleBounds;
    ctx.fillRect(
      bounds.left - 2,
      bounds.top - 2,
      bounds.right - bounds.left + 4,
      bounds.bottom - bounds.top + 4,
    );
    ctx.restore();
  }
  surfaces?.shockwave.draw(ctx, wave);
  ctx.save();
  ctx.globalAlpha *= finisherOpacities.backdrop;
  if (finisher) drawFinisherBackdrop(ctx, snapshot, finisher, options);
  ctx.restore();
  if (conceptFrame) drawConceptBackdrop(ctx, conceptFrame);
  drawComicBackdrop(ctx, comic);
  drawKiFloorLight(ctx, lights);
  ctx.save();
  ctx.globalAlpha *= snapshot.opacity;
  drawInkTrails(ctx, kiInkTrails, snapshot.elapsedMs, {
    layer: 'back',
    sizeMultiplier: inkTrailSize,
    showErosion: options.showErosion,
  });
  ctx.restore();
  drawKiBackdrop(ctx, snapshot, frames, kiOptions);
  const pose = options.showMovement
    ? poseWithDrawing(snapshot, options.enabledEffects)
    : snapshot;
  const replacement = pose !== snapshot;
  const originalSource = frames.get(frameKey(pose.step));
  const source =
    originalSource && emphasis.palette && originalSource.emphasisImage
      ? { ...originalSource, image: originalSource.emphasisImage }
      : originalSource;
  let bodyBounds:
    { left: number; top: number; right: number; bottom: number } | undefined;
  if (source) {
    const position = posePosition(pose, source, options);
    const bounds = source.bounds;
    const exclusion = {
      left: position.left + (bounds?.left ?? 0) * options.scale - 8,
      top: position.top + (bounds?.top ?? 0) * options.scale - 8,
      right:
        position.left +
        (bounds?.right ?? source.image.naturalWidth) * options.scale +
        8,
      bottom:
        position.top +
        (bounds?.bottom ?? source.image.naturalHeight) * options.scale +
        8,
    };
    bodyBounds = exclusion;
    drawSpeedLines(ctx, speedLines, { exclusion });
    if (focus) drawFocusLines(ctx, focus, exclusion, view.visibleBounds);
  }
  if (target) {
    ctx.save();
    ctx.globalAlpha = targetOpacity;
    drawSandbag(ctx, target, { x: jitter, y: jitter * -0.3 });
    ctx.restore();
  }
  if (!source) {
    ctx.restore();
    return state;
  }
  const scale = options.scale;
  const moving = options.showMovement;
  const { x } = posePosition(pose, source, options);
  ctx.save();
  ctx.globalAlpha = snapshot.opacity;
  const bodyOpacity = moving ? teleportOpacity(snapshot) : 1;
  const airborne = moving ? Math.max(0, -snapshot.y) : 0;
  const shadow =
    moving && options.showGroundEffects
      ? groundShadow(snapshot)
      : { opacity: 1, widthScale: 1, heightScale: 1 };
  ctx.save();
  ctx.globalAlpha *= shadow.opacity * bodyOpacity;
  ctx.fillStyle = '#59413230';
  ctx.beginPath();
  ctx.ellipse(
    x,
    groundY + 3,
    Math.max(16, 34 - airborne * 0.4) * shadow.widthScale,
    7 * shadow.heightScale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  drawGroundEffects(ctx, ground, options);
  drawImpactAttackGround(ctx, snapshot, frames, options);
  drawStageGroundAccents(ctx, snapshot, frames, options);
  ctx.save();
  ctx.globalAlpha *= finisherOpacities.paths;
  if (finisher) drawFinisherPaths(ctx, snapshot, finisher, frames, options);
  if (finisher && !conceptFrame)
    drawFinisherEchoes(ctx, snapshot, finisher, frames, options);
  ctx.restore();
  if (conceptFrame) drawConceptEchoes(ctx, conceptFrame);
  if (snapshot.motion.finisher && options.showMovement)
    drawFinisherActors(ctx, snapshot, frames, {
      ...options,
      palette: emphasis.palette,
      actorOpacity:
        conceptFrame && finisher?.definition.theme === 'demon'
          ? (actorId) => inkConceptActorOpacity(conceptFrame, actorId)
          : undefined,
    });
  const motionEffectOptions = {
    ...options,
    suppressTrails: !legacyMotionEnabled,
  };
  drawMotionEffects(ctx, snapshot, frames, {
    ...motionEffectOptions,
    layer: 'back',
  });
  ctx.save();
  drawInkEffects(ctx, ink, frames, {
    layer: 'back',
    showErosion: options.showErosion,
  });
  drawInkTrails(ctx, motionInkTrails, snapshot.elapsedMs, {
    layer: 'back',
    sizeMultiplier: inkTrailSize,
    showErosion: options.showErosion,
  });
  ctx.restore();
  if (charge) drawLocalCharge(ctx, charge);
  ctx.save();
  ctx.globalAlpha *= actorOpacity * bodyOpacity;
  const drawBody = (target: CanvasRenderingContext2D): void => {
    if (replacement) drawPose(target, pose, source, options);
    else drawPoseWithParts(target, snapshot, source, options);
  };
  if (surfaces && lights.length) {
    const position = posePosition(pose, source, options);
    surfaces.lighting.drawBody(ctx, lights, drawBody, {
      x: position.left + (source.image.naturalWidth * options.scale) / 2,
      y: position.top + (source.image.naturalHeight * options.scale) / 2,
    });
  } else drawBody(ctx);
  surfaces?.silhouette?.draw(ctx, drawBody, comic.silhouetteOpacity);
  ctx.restore();
  drawMotionEffects(ctx, snapshot, frames, {
    ...motionEffectOptions,
    layer: 'front',
  });
  ctx.save();
  drawInkEffects(ctx, ink, frames, {
    layer: 'front',
    showErosion: options.showErosion,
  });
  drawInkTrails(ctx, motionInkTrails, snapshot.elapsedMs, {
    layer: 'front',
    sizeMultiplier: inkTrailSize,
    showErosion: options.showErosion,
  });
  ctx.restore();
  if (options.showMovement && options.showContacts && !inkEnabled)
    drawImpacts(
      ctx,
      impacts.filter(
        (impact) =>
          !impact.contact.actorId.startsWith('ki:') &&
          !shoulderSprite &&
          !(
            conceptFrame &&
            snapshot.motion.finisher?.theme === 'drunken-tiger' &&
            impact.contact.kind === 'shoulder' &&
            frames.has('combat-vfx:shoulder-crush')
          ),
      ),
      {
        scale,
        directional: !!options.directionalImpacts,
      },
    );
  if (shoulderSprite)
    for (const { contact, ageMs } of impacts)
      drawCombatEffectSprite(ctx, frames, {
        sheet: 'shoulder-crush',
        ageMs,
        durationMs: 130,
        x: contact.x,
        y: contact.y,
        scale,
        // 먹튀김 대신 표시하는 철산고 전용 파열도 같은 명중점에서 조절한다.
        size: inkEnabled ? inkImpactSize : 1,
        directionX: contact.directionX,
      });
  if (finisher && options.showContacts)
    drawFinisherStrikes(ctx, snapshot, finisher, {
      ...options,
      showContactTraces: !inkEnabled,
      contactOpacity: finisherOpacities.hitTraces,
      releaseOpacity: finisherOpacities.release,
    });
  drawKiForeground(
    ctx,
    snapshot,
    frames,
    snapshot.motion.finisher && inkEnabled
      ? { ...kiOptions, showContacts: false }
      : kiOptions,
  );
  drawKiOverlay(ctx, snapshot, frames, kiOptions);
  if (options.showContacts) drawImpactAccent(ctx, emphasis, options);
  if (conceptFrame) drawConceptOverlay(ctx, conceptFrame);
  drawComicOverlay(ctx, comic, { bodyBounds });
  ctx.restore();
  ctx.restore();
  if (conceptFrame) drawConceptScreenOverlay(ctx, conceptFrame);
  if (finisher && options.composition !== 'cutscene')
    drawFinisherOverlay(ctx, snapshot, finisher, {
      suppressEndGlyph: comic.brushGlyphActive,
    });
  if (cutin) drawCutin(ctx, cutin, frames);
  if (options.composition !== 'cutscene') {
    ctx.fillStyle = finisher || backgroundDim > 0.4 ? '#f6e8c9' : '#614630';
    ctx.font = '15px sans-serif';
    ctx.fillText(
      snapshot.waiting
        ? '한 동작 완료'
        : ((options.showMovement
            ? finisherContactPhase(snapshot.motion, snapshot.elapsedMs)
            : undefined) ?? snapshot.step.phase),
      28,
      391,
    );
  }
  return state;
}
