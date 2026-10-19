import {
  drawMeteorBackdrop,
  drawMeteorForeground,
} from './finisher-meteor-concept.js';
import { drawKiFlowAccent, drawKiReleaseGlint } from './ki-accents.js';
import { kiHitPoint, sampleKi } from './ki-sampling.js';
import { line } from './ki-shapes.js';
import { sampleOrbitViscosity } from './orbit-viscosity.js';
import { drawOrbitViscosity } from './orbit-viscosity-drawing.js';
import {
  drawBeam,
  drawBeamCharge,
  drawBeamImpact,
  drawOrbCharge,
  drawOrbImpact,
  drawOrbProjectile,
} from './ki-projectile-drawing.js';
import {
  drawCrescent,
  drawCrescentCharge,
  drawEruption,
  drawEruptionCharge,
  drawOrbitHeld,
  drawOrbitShot,
  drawSpatialImpact,
} from './ki-spatial-drawing.js';
import {
  drawTigerCharge,
  drawTigerImpact,
  drawTigerManifest,
  drawTigerWave,
  tigerManifestFinalWidth,
} from './ki-tiger-drawing.js';
import type { ComboSnapshot } from './player.js';
import { groundY, startX, type PoseDrawingOptions } from './pose-drawing.js';
import type { SandbagContact } from './sandbag.js';
import type { SourceFrame } from './source-frames.js';
import {
  drawWithTextureErosion,
  type TextureBounds,
  type TextureErosionDirection,
} from './texture-erosion.js';
import type { KiDefinition, KiPoint } from './ki-types.js';

export type KiDrawingOptions = PoseDrawingOptions & {
  readonly showSandbag?: boolean;
  readonly showFinisher?: boolean;
  readonly showFinisherConcept?: boolean;
  readonly showContacts?: boolean;
  readonly showErosion?: boolean;
  readonly showErosionGlow?: boolean;
  readonly showDirectionalErosion?: boolean;
  readonly showFlowAccent?: boolean;
  readonly showReleaseGlint?: boolean;
  readonly showViscousOrbit?: boolean;
  readonly showEffectHierarchy?: boolean;
  readonly contacts?: readonly SandbagContact[];
};

type Frames = ReadonlyMap<string, SourceFrame>;

function pointBounds(point: KiPoint, radius: number): TextureBounds {
  return {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

function formBounds(definition: KiDefinition): TextureBounds {
  const points = [
    definition.origin,
    definition.target,
    ...definition.shots.flatMap((shot) => [shot.from, shot.to]),
  ];
  const left = Math.min(...points.map((point) => point.x)) - 130;
  const top = Math.min(...points.map((point) => point.y)) - 130;
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((point) => point.x)) + 130 - left,
    height: Math.max(...points.map((point) => point.y)) + 130 - top,
  };
}

/** 소멸 그림과 별도 접촉 잔광만 갈라내며 살아 있는 탄·빔과 명중 판정을 보존한다. */
function drawResidue(
  ctx: CanvasRenderingContext2D,
  options: KiDrawingOptions,
  residue: {
    readonly ageMs: number;
    readonly startMs: number;
    readonly endMs: number;
    readonly bounds: TextureBounds;
    readonly seed: number;
    readonly direction?: TextureErosionDirection;
  },
  draw: () => void,
): void {
  drawWithTextureErosion(
    ctx,
    {
      bounds: residue.bounds,
      progress: options.showErosion
        ? Math.max(
            0,
            (residue.ageMs - residue.startMs) /
              Math.max(1, residue.endMs - residue.startMs),
          )
        : 0,
      seed: residue.seed,
      edgeGlow: !!options.showErosion && !!options.showErosionGlow,
      direction: options.showDirectionalErosion ? residue.direction : undefined,
    },
    draw,
  );
}

function beginWorld(
  ctx: CanvasRenderingContext2D,
  options: KiDrawingOptions,
): void {
  ctx.save();
  ctx.translate(startX, groundY);
  ctx.scale(options.scale, options.scale);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'bevel';
  ctx.imageSmoothingEnabled = false;
}

/** 준비의 모양과 설치 탄을 몸 뒤에 두고 얼굴·손의 자세를 보존한다. */
export function drawKiBackdrop(
  ctx: CanvasRenderingContext2D,
  snapshot: ComboSnapshot,
  frames: Frames,
  options: KiDrawingOptions,
): void {
  const definition = snapshot.motion.ki;
  if (!definition || !options.showMovement) return;
  if (definition.style === 'meteor') {
    drawMeteorBackdrop(ctx, snapshot, options);
    return;
  }
  const sample = sampleKi(definition, snapshot.elapsedMs);
  if (sample.phase === 'done') return;
  beginWorld(ctx, options);
  switch (definition.style) {
    case 'tiger-manifest':
    case 'tiger-wave':
      drawTigerCharge(ctx, definition, sample, frames);
      break;
    case 'crescent':
      drawCrescentCharge(ctx, definition, sample, frames);
      break;
    case 'eruption':
      drawEruptionCharge(ctx, definition, sample, frames);
      break;
  }
  if (definition.style === 'orbit') {
    drawOrbitHeld(ctx, definition, sample, frames, options);
    // 출발점의 잔여는 선두가 몸 앞으로 나가도 설치 구체와 같은 뒤층에 둔다.
    if (options.showViscousOrbit)
      for (const [index, shot] of sample.shots.entries()) {
        if (!shot.visible) continue;
        drawOrbitViscosity(
          ctx,
          sampleOrbitViscosity(shot.shot, sample.timeMs, index),
          frames,
        );
      }
    if (options.showReleaseGlint) drawKiReleaseGlint(ctx, definition, sample);
    for (const shot of sample.shots)
      if (shot.point.x < definition.origin.x + 18)
        drawOrbitShot(ctx, shot, sample, frames, options);
  }
  ctx.restore();
}

/** 형상·비행·판정이 절대 시각을 공유하며 장식 이동으로 명중을 늘리지 않는다. */
export function drawKiForeground(
  ctx: CanvasRenderingContext2D,
  snapshot: ComboSnapshot,
  frames: Frames,
  options: KiDrawingOptions,
): void {
  const definition = snapshot.motion.ki;
  if (!definition || !options.showMovement) return;
  if (definition.style === 'meteor') {
    drawMeteorForeground(ctx, snapshot, frames, options);
    return;
  }
  const sample = sampleKi(definition, snapshot.elapsedMs);
  if (sample.phase === 'done') return;
  beginWorld(ctx, options);
  // 손 안의 핵은 몸 앞에 있어야 장전 그림에 가려지지 않는다.
  if (definition.style === 'orb')
    drawResidue(
      ctx,
      options,
      {
        ageMs: sample.timeMs - definition.releaseMs,
        startMs: 25,
        endMs: 95,
        bounds: pointBounds(definition.chargeOrigin ?? definition.origin, 45),
        seed: 17,
      },
      () => drawOrbCharge(ctx, definition, sample, frames),
    );
  if (definition.style === 'beam')
    drawBeamCharge(ctx, definition, sample, frames);
  const lastHit = definition.hits.at(-1);
  const lastHitEnd = lastHit
    ? lastHit.atMs + lastHit.durationMs
    : definition.releaseMs;
  if (definition.style === 'tiger-manifest')
    drawResidue(
      ctx,
      options,
      {
        ageMs: sample.timeMs,
        startMs: options.showDirectionalErosion
          ? Math.max(lastHitEnd, (lastHit?.atMs ?? 0) + 185)
          : (lastHit?.atMs ?? 0) + 185,
        endMs: (lastHit?.atMs ?? 0) + 345,
        bounds: formBounds(definition),
        seed: 29,
        direction: {
          from: {
            x: definition.target.x - tigerManifestFinalWidth,
            y: definition.target.y,
          },
          to: definition.target,
        },
      },
      () => drawTigerManifest(ctx, definition, sample, frames, options),
    );
  if (definition.style === 'tiger-wave') {
    const coreEnd =
      (sample.shots[0]?.shot.arriveMs ?? definition.releaseMs) + 170;
    drawResidue(
      ctx,
      options,
      {
        ageMs: sample.timeMs,
        startMs: Math.max(lastHitEnd, coreEnd),
        endMs: coreEnd + 300,
        bounds: formBounds(definition),
        seed: 31,
        direction: {
          from: definition.origin,
          to: sample.shots[0]?.point ?? definition.target,
        },
      },
      () => drawTigerWave(ctx, definition, sample, frames, options),
    );
  }
  if (definition.style === 'beam') {
    const sustainEnd =
      (lastHit?.atMs ??
        sample.shots[0]?.shot.arriveMs ??
        definition.releaseMs) + 100;
    const residueStartMs = Math.max(lastHitEnd, sustainEnd);
    const residueEndMs = sustainEnd + 170;
    const front = sample.shots[0]?.point ?? definition.target;
    const tailProgress = Math.min(
      1,
      Math.max(0, (residueStartMs - sustainEnd) / (residueEndMs - sustainEnd)),
    );
    drawResidue(
      ctx,
      options,
      {
        ageMs: sample.timeMs,
        startMs: residueStartMs,
        endMs: residueEndMs,
        bounds: formBounds(definition),
        seed: 43,
        direction: {
          // 마지막 판정 뒤에도 남아 있는 띠만 방향장의 범위로 쓴다.
          from: {
            x:
              definition.origin.x +
              (front.x - definition.origin.x) * tailProgress,
            y:
              definition.origin.y +
              (front.y - definition.origin.y) * tailProgress,
          },
          to: front,
        },
      },
      () => drawBeam(ctx, definition, sample, frames),
    );
  }
  if (definition.style === 'eruption')
    drawResidue(
      ctx,
      options,
      {
        ageMs: sample.timeMs,
        startMs: lastHitEnd,
        endMs: lastHitEnd + 220,
        bounds: formBounds(definition),
        seed: 53,
      },
      () => drawEruption(ctx, definition, sample, frames),
    );
  for (const shot of sample.shots) {
    if (definition.style === 'orb')
      drawOrbProjectile(ctx, shot, sample, definition.accent, frames);
    if (definition.style === 'crescent')
      drawCrescent(ctx, shot, sample, frames);
    if (
      definition.style === 'orbit' &&
      shot.point.x >= definition.origin.x + 18
    )
      drawOrbitShot(ctx, shot, sample, frames, options);
  }
  if (definition.style === 'orb')
    for (const hit of sample.hits)
      drawResidue(
        ctx,
        options,
        {
          ageMs: hit.ageMs,
          startMs: 140,
          endMs: 240,
          bounds: pointBounds(hit.point, 60 + hit.hit.strength * 55),
          seed: Math.round(hit.hit.atMs) + 61,
        },
        () =>
          drawOrbImpact(
            ctx,
            hit.point,
            hit.ageMs,
            hit.hit.strength,
            definition.accent,
            frames,
            options,
          ),
      );
  if (definition.style === 'crescent' || definition.style === 'orbit')
    for (const hit of sample.hits)
      drawResidue(
        ctx,
        options,
        {
          ageMs: hit.ageMs,
          startMs: 150,
          endMs: 300,
          bounds: pointBounds(hit.point, 60 + hit.hit.strength * 55),
          seed: Math.round(hit.hit.atMs) + 73,
        },
        () =>
          drawSpatialImpact(
            ctx,
            definition,
            hit.point,
            hit.ageMs,
            hit.hit.strength,
            frames,
          ),
      );
  if (options.showFlowAccent) drawKiFlowAccent(ctx, definition, sample);
  if (options.showReleaseGlint && definition.style === 'beam')
    drawKiReleaseGlint(ctx, definition, sample);
  ctx.restore();
}

/** 접촉 설정은 기공 실체와 분리하며 실제 명중 위치에 물성별 충격을 그린다. */
export function drawKiOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: ComboSnapshot,
  frames: Frames,
  options: KiDrawingOptions,
): void {
  const definition = snapshot.motion.ki;
  if (!definition || !options.showMovement || options.showContacts === false)
    return;
  if (definition.style === 'meteor') return;
  beginWorld(ctx, options);
  for (const hit of definition.hits) {
    const contact = options.contacts?.find(
      (item) => item.actorId === `ki:${hit.id}`,
    );
    if (options.showSandbag && !contact?.connected) continue;
    const atMs = options.showSandbag && contact ? contact.timeMs : hit.atMs;
    const ageMs = snapshot.elapsedMs - atMs;
    if (ageMs < 0 || ageMs > 280) continue;
    const point =
      options.showSandbag && contact
        ? {
            x: (contact.x - startX) / options.scale,
            y: (contact.y - groundY) / options.scale,
          }
        : kiHitPoint(definition, hit);
    switch (definition.style) {
      case 'tiger-manifest':
      case 'tiger-wave':
        drawResidue(
          ctx,
          options,
          {
            ageMs,
            startMs: 65,
            endMs: 170,
            bounds: pointBounds(point, 60 + hit.strength * 55),
            seed: Math.round(atMs) + 89,
          },
          () =>
            drawTigerImpact(ctx, point, ageMs, hit.strength, frames, options),
        );
        break;
      case 'beam':
        drawResidue(
          ctx,
          options,
          {
            ageMs,
            startMs: 110,
            endMs: 260,
            bounds: pointBounds(point, 60 + hit.strength * 55),
            seed: Math.round(atMs) + 97,
          },
          () =>
            drawBeamImpact(
              ctx,
              point,
              ageMs,
              hit.strength,
              definition.accent,
              frames,
              options,
            ),
        );
        break;
      case 'crescent':
      case 'eruption':
      case 'orbit':
      case 'orb': {
        const hierarchy =
          options.showEffectHierarchy && definition.style === 'orb';
        const lifetimeMs = hierarchy ? 60 : 95;
        if (ageMs < lifetimeMs) {
          ctx.save();
          ctx.globalAlpha = (1 - ageMs / lifetimeMs) * (hierarchy ? 0.42 : 0.8);
          const reach = 4 + ageMs * 0.13;
          for (const direction of [-1, 1])
            line(
              ctx,
              [
                { x: point.x - reach, y: point.y - direction * reach },
                { x: point.x + reach, y: point.y + direction * reach },
              ],
              definition.accent,
              1.2,
            );
          ctx.restore();
        }
        break;
      }
    }
  }
  ctx.restore();
}
