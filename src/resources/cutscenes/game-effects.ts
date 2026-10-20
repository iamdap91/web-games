import {
  drawCombatEffectSprite,
  type CombatEffectSheet,
} from '../characters/ataho-v2-combos/combat-effect-sprites.js';
import { drawInkSprite } from '../characters/ataho-v2-combos/ink-sprites.js';
import { inkPivots } from '../characters/ataho-v2-combos/ink-types.js';
import type { SourceFrame } from '../characters/ataho-v2-combos/source-frames.js';
type Context = CanvasRenderingContext2D;
type EffectFrames = ReadonlyMap<string, SourceFrame>;

type EffectPlacement = {
  readonly x: number;
  readonly y: number;
  readonly progress: number;
  readonly size?: number;
  readonly angle?: number;
};

function visible(options: EffectPlacement): boolean {
  return (
    Number.isFinite(options.progress) &&
    options.progress >= 0 &&
    options.progress < 1 &&
    (options.size === undefined || options.size > 0)
  );
}

function combatSprite(
  context: Context,
  effects: EffectFrames,
  options: EffectPlacement,
  sheet: CombatEffectSheet,
): void {
  if (!visible(options)) return;
  const cellWidth = sheet === 'shoulder-crush' ? 64 : 80;
  const size = options.size ?? (sheet === 'shoulder-crush' ? 180 : 240);
  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.angle ?? 0);
  // size는 투명 여백을 포함한 원본 한 셀의 화면 폭이다. 픽셀과 원점은 기존 그리기를 따른다.
  drawCombatEffectSprite(context, effects, {
    sheet,
    ageMs: options.progress,
    durationMs: 1,
    x: 0,
    y: 0,
    scale: 2,
    size: size / (cellWidth * 2),
  });
  context.restore();
}

/** 실제 타점에서 기존 압축핵 여섯 셀을 한 번만 재생한다. */
export function gameImpact(
  context: Context,
  effects: EffectFrames,
  options: EffectPlacement,
): void {
  combatSprite(context, effects, options, 'shoulder-crush');
}

/** 호출부가 실제 지면 접촉을 확인한 위치에서만 낮은 먼지를 재생한다. */
export function gameDust(
  context: Context,
  effects: EffectFrames,
  options: EffectPlacement,
): void {
  combatSprite(context, effects, options, 'ground-impact');
}

/** 먹 효과의 프레임별 접촉 원점을 유지하고 원본 색·알파를 그대로 합성한다. */
export function gameInk(
  context: Context,
  effects: EffectFrames,
  options: EffectPlacement & { readonly sheet: 'stroke' | 'impact' },
): void {
  if (!visible(options)) return;
  const source = effects.get(`ink-vfx:${options.sheet}`);
  if (!source) return;
  const size = options.size ?? 360;
  context.save();
  context.translate(options.x, options.y);
  context.rotate(options.angle ?? 0);
  context.translate((0.5 - inkPivots[options.sheet].x) * size, 0);
  context.imageSmoothingEnabled = false;
  drawInkSprite(context, source, {
    sheet: options.sheet,
    frame: Math.floor(options.progress * 16),
    width: size,
    height: size,
  });
  context.restore();
}
