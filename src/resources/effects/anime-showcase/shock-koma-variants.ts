import spriteRecord from '../../../../resources/shock-koma-variant-sprites.json' with { type: 'json' };
import { battleImpact, drawAtaho, drawBattle, drawBear } from './battle.js';
import { clamp, label, noise, polygon } from './drawing.js';
import {
  getShockKomaVariant,
  shockKomaContactMs,
  type ShockKomaVariantId,
} from './shock-koma-variant-data.js';
import { height, width, type Context, type Frame } from './types.js';

type RenderedVariantId = Exclude<ShockKomaVariantId, 'ink' | 'embers'>;
type ActorTone =
  'silhouette' | 'rim' | 'pale' | 'contour' | 'cyan' | 'red' | 'calm' | 'ink';
type Surface = { readonly canvas: HTMLCanvasElement; readonly brush: Context };

function surface(): Surface {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const brush = canvas.getContext('2d', { willReadFrequently: true });
  if (!brush) throw new Error('쇼크코마 바리에이션의 작화 판이 없습니다.');
  return { canvas, brush };
}

function release(canvas: HTMLCanvasElement): void {
  canvas.width = canvas.height = 1;
}

function fill(ctx: Context, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

/** 다섯 판이 같은 접촉 원화·타점·체형을 공유하고 명암과 인쇄 방식만 교체한다. */
class ContactArtwork {
  private readonly source = surface();
  private readonly pixels: Uint8ClampedArray;
  private readonly tones = new Map<ActorTone, HTMLCanvasElement>();

  constructor(frame: Frame) {
    const current: Frame = {
      ...frame,
      sampleId: 'shock-koma-v2',
      timeMs: shockKomaContactMs + 16,
      reducedMotion: false,
    };
    const impact = battleImpact(current);
    this.source.brush.translate(570 - impact.x * 1.2, 300 - impact.y * 1.2);
    this.source.brush.scale(1.2, 1.2);
    drawBear(this.source.brush, current);
    drawAtaho(this.source.brush, current, { action: 'straight' });
    this.source.brush.resetTransform();
    this.pixels = this.source.brush.getImageData(0, 0, width, height).data;
  }

  lightAt(x: number, y: number): number | null {
    const p = (y * width + x) * 4;
    if (this.pixels[p + 3]! < 40) return null;
    return (
      this.pixels[p]! * 0.2126 +
      this.pixels[p + 1]! * 0.7152 +
      this.pixels[p + 2]! * 0.0722
    );
  }

  private paint(tone: ActorTone): HTMLCanvasElement {
    const target = surface();
    const image = target.brush.createImageData(width, height);
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const light = this.lightAt(x, y);
        if (light === null) continue;
        const p = (y * width + x) * 4;
        const edge = [-8, 8, -width * 8, width * 8].some(
          (offset) => this.pixels[p + offset + 3]! < 40,
        );
        if (tone === 'contour' && !edge) continue;
        let color: readonly [number, number, number];
        switch (tone) {
          case 'silhouette':
            color = [12, 13, 23];
            break;
          case 'rim':
            color = edge
              ? [255, 249, 225]
              : light > 206
                ? [181, 177, 160]
                : [9, 10, 18];
            break;
          case 'pale':
            color = edge ? [239, 236, 220] : [253, 252, 242];
            break;
          case 'contour':
            color = [173, 176, 169];
            break;
          case 'cyan':
            color = [36, 226, 228];
            break;
          case 'red':
            color = [255, 49, 102];
            break;
          case 'calm':
            color = light > 145 ? [150, 159, 167] : [61, 73, 87];
            break;
          case 'ink':
            color = light > 160 && !edge ? [249, 243, 224] : [17, 18, 27];
            break;
        }
        image.data[p] = color[0];
        image.data[p + 1] = color[1];
        image.data[p + 2] = color[2];
        image.data[p + 3] = this.pixels[p + 3]!;
      }
    }
    target.brush.putImageData(image, 0, 0);
    return target.canvas;
  }

  draw(
    ctx: Context,
    tone: ActorTone,
    options: {
      readonly offsetX?: number;
      readonly offsetY?: number;
      readonly opacity?: number;
    } = {},
  ): void {
    let plate = this.tones.get(tone);
    if (!plate) {
      plate = this.paint(tone);
      this.tones.set(tone, plate);
    }
    ctx.save();
    ctx.globalAlpha *= options.opacity ?? 1;
    ctx.drawImage(plate, options.offsetX ?? 0, options.offsetY ?? 0);
    ctx.restore();
  }

  dispose(): void {
    release(this.source.canvas);
    for (const canvas of this.tones.values()) release(canvas);
    this.tones.clear();
  }
}

function paintWhiteout(
  ctx: Context,
  artwork: ContactArtwork,
  cell: number,
): void {
  if (cell === 0) {
    fill(ctx, '#090d17');
    artwork.draw(ctx, 'rim');
    polygon(
      ctx,
      [
        { x: 534, y: 303 },
        { x: 575, y: 294 },
        { x: 766, y: 255 },
        { x: 598, y: 305 },
        { x: 562, y: 313 },
      ],
      '#fffce9',
    );
    return;
  }
  fill(ctx, '#fffef3');
  if (cell === 1) {
    artwork.draw(ctx, 'pale');
    // 타점 오른쪽을 먼저 비워 배우의 윤곽이 빛에 잠기는 방향을 읽힌다.
    polygon(
      ctx,
      [
        { x: 537, y: 300 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 582, y: 332 },
      ],
      '#fffef3',
    );
  } else if (cell === 3) {
    artwork.draw(ctx, 'contour', { opacity: 0.6 });
  }
}

function paintMisregister(
  ctx: Context,
  artwork: ContactArtwork,
  cell: number,
): void {
  fill(ctx, cell === 2 ? '#fff5dc' : '#080c15');
  if (cell < 2) {
    const offset = cell === 0 ? 12 : 31;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    artwork.draw(ctx, 'cyan', {
      offsetX: -offset,
      offsetY: cell === 0 ? 2 : 6,
    });
    artwork.draw(ctx, 'red', {
      offsetX: offset + 5,
      offsetY: cell === 0 ? -2 : -6,
    });
    ctx.restore();
    artwork.draw(ctx, 'silhouette');
    artwork.draw(ctx, 'contour', { opacity: 0.22 });
    polygon(
      ctx,
      [
        { x: 548, y: 304 },
        { x: 586, y: 289 },
        { x: cell === 0 ? 686 : 800, y: 297 },
        { x: 581, y: 309 },
      ],
      cell === 0 ? '#fff8dc' : '#f7d8d8',
    );
  } else if (cell === 2) {
    artwork.draw(ctx, 'cyan', { offsetX: -4 });
    artwork.draw(ctx, 'red', { offsetX: 4 });
    artwork.draw(ctx, 'silhouette');
  } else {
    artwork.draw(ctx, 'rim');
  }
}

function paintHalftone(
  ctx: Context,
  artwork: ContactArtwork,
  cell: number,
): void {
  const reverse = cell === 1;
  fill(ctx, reverse ? '#11121d' : '#f5ebd4');
  ctx.fillStyle = reverse ? '#f8f1da' : '#11121d';
  // 36px의 군집을 함께 옮겨 인쇄된 명암 면이 덩어리째 뜯겨 나가게 한다.
  for (let y = 5; y < height - 5; y += 9) {
    for (let x = 5; x < width - 5; x += 9) {
      const light = artwork.lightAt(x, y);
      if (light === null) continue;
      const group = Math.floor(x / 36) * 83 + Math.floor(y / 36) * 11;
      const split = noise(group + 24);
      const affected = clamp((x - 320) / 260);
      const progress = Math.max(0, cell - 1);
      if (cell >= 2 && split < [0, 0, 0.16, 0.43, 0.78][cell]! * affected)
        continue;
      const offsetX = progress * (13 + noise(group + 8) * 27) * affected;
      const offsetY = progress * (noise(group + 52) - 0.5) * 29 * affected;
      const density = reverse ? light / 255 : 1 - light / 255;
      const radius = 1.15 + density * 3.1;
      ctx.beginPath();
      ctx.arc(
        Math.round(x + offsetX),
        Math.round(y + offsetY),
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function drawImpactArtwork(
  ctx: Context,
  frame: Frame,
  variant: 'compression' | 'brush',
  index: number,
): void {
  const record = spriteRecord.variants[variant];
  const atlas = frame.assets.effects.get(`technique:${record.atlasKey}`);
  const cell = record.cells[index];
  if (!atlas || !cell)
    throw new Error(`쇼크코마 효과 작화가 없습니다: ${variant}`);
  const { impactX, impactY, pixelScale } = spriteRecord.render;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas.image,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    impactX - cell.anchorX * pixelScale,
    impactY - cell.anchorY * pixelScale,
    cell.width * pixelScale,
    cell.height * pixelScale,
  );
  ctx.restore();
}

function paintImpactArtwork(
  ctx: Context,
  artwork: ContactArtwork,
  frame: Frame,
  variant: 'compression' | 'brush',
  cell: number,
): void {
  if (variant === 'compression') {
    fill(ctx, cell === 1 ? '#d64250' : cell === 3 ? '#d8cbb0' : '#f5ecd4');
    artwork.draw(ctx, cell === 1 ? 'silhouette' : 'ink');
  } else {
    fill(ctx, '#eee6cd');
    artwork.draw(ctx, 'ink');
  }
  drawImpactArtwork(ctx, frame, variant, cell);
}

/** 첫 화면에서 모든 코마를 준비하고 접촉 중에는 시각으로 완성된 판을 고른다. */
class ShockKomaVariantPlates {
  private readonly plates: readonly HTMLCanvasElement[];
  private readonly calm: HTMLCanvasElement;

  constructor(
    frame: Frame,
    readonly variant: RenderedVariantId,
  ) {
    const artwork = new ContactArtwork(frame);
    try {
      const count = getShockKomaVariant(variant).cuts.length - 1;
      this.plates = Array.from({ length: count }, (_, cell) => {
        const target = surface();
        switch (variant) {
          case 'whiteout':
            paintWhiteout(target.brush, artwork, cell);
            break;
          case 'misregister':
            paintMisregister(target.brush, artwork, cell);
            break;
          case 'halftone':
            paintHalftone(target.brush, artwork, cell);
            break;
          case 'compression':
          case 'brush':
            paintImpactArtwork(target.brush, artwork, frame, variant, cell);
            break;
        }
        return target.canvas;
      });
      const calm = surface();
      fill(calm.brush, '#78828e');
      artwork.draw(calm.brush, 'calm');
      this.calm = calm.canvas;
    } finally {
      artwork.dispose();
    }
  }

  draw(ctx: Context, cell: number, reduced: boolean): void {
    ctx.drawImage(reduced ? this.calm : this.plates[cell]!, 0, 0);
  }

  dispose(): void {
    for (const canvas of [...this.plates, this.calm]) release(canvas);
  }
}

const surfaces = new WeakMap<Context, ShockKomaVariantPlates>();
const captions: Readonly<Record<RenderedVariantId, string>> = {
  whiteout: '접촉 윤곽 → 백화 → 흰 여백 → 윤곽 재출현 → 원색 복귀',
  compression: '압축점 → 눌린 핵 → 넓은 파열 → 끊긴 압력 조각 → 복귀',
  brush: '가는 압축획 → 찢는 일필 → 관통 흔적 → 끊긴 잔획 → 복귀',
  misregister: '청록·적색 판 분리 → 어긋남 확대 → 백색 접촉에서 결합 → 정착',
  halftone: '굵은 망점 → 흑백 밀도 교체 → 군집 분리 → 드문 잔여 면 → 복귀',
};

export function drawShockKomaVariant(
  ctx: Context,
  frame: Frame,
  variant: ShockKomaVariantId,
): void {
  if (variant === 'ink' || variant === 'embers') {
    drawBattle(ctx, frame, { action: 'straight' });
    return;
  }
  let plates = surfaces.get(ctx);
  if (plates && plates.variant !== variant) {
    plates.dispose();
    surfaces.delete(ctx);
    plates = undefined;
  }
  // 시각 탐색과 재생이 같은 코마를 고르도록 RAF 사이의 차분 상태를 두지 않는다.
  if (frame.enhanced && !plates) {
    plates = new ShockKomaVariantPlates(frame, variant);
    surfaces.set(ctx, plates);
  }
  const definition = getShockKomaVariant(variant);
  const active =
    frame.enhanced &&
    frame.timeMs >= shockKomaContactMs &&
    frame.timeMs < definition.finishMs;
  if (active && plates) {
    const next = definition.cuts.findIndex(
      (time) => time > frame.timeMs + 0.001,
    );
    const cell = next < 0 ? definition.cuts.length - 2 : Math.max(0, next - 1);
    plates.draw(ctx, cell, frame.reducedMotion);
  } else {
    drawBattle(ctx, frame, { action: 'straight' });
  }
  ctx.fillStyle = '#10131ddd';
  ctx.fillRect(28, 468, frame.enhanced && !frame.reducedMotion ? 860 : 380, 36);
  label(
    ctx,
    frame.enhanced
      ? frame.reducedMotion
        ? '모션 감소 · 낮은 대비의 접촉 판 유지'
        : captions[variant]
      : '같은 수평 정권 · 같은 접촉 시각',
  );
}

export function disposeShockKomaVariants(ctx: Context): void {
  surfaces.get(ctx)?.dispose();
  surfaces.delete(ctx);
}
