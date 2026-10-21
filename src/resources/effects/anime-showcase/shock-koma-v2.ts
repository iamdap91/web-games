import { battleImpact, drawAtaho, drawBattle, drawBear } from './battle.js';
import spriteRecord from '../../../../resources/shock-koma-v2-sprites.json' with { type: 'json' };
import { label, line, noise, polygon } from './drawing.js';
import { height, width, type Context, type Frame } from './types.js';

const cellMs = 1000 / 30;
const contactMs = 1800;
const redMs = contactMs + cellMs;
const whiteMs = contactMs + cellMs * 2;
const flameMs = contactMs + cellMs * 5;
const inkMs = contactMs + cellMs * 22;
const finishMs = contactMs + cellMs * 25;
export const shockKomaV2Cuts: readonly number[] = [
  contactMs,
  redMs,
  whiteMs,
  whiteMs + cellMs,
  whiteMs + cellMs * 2,
  ...Array.from({ length: 9 }, (_, i) => flameMs + i * cellMs * 2),
  inkMs,
  finishMs,
];
type PlateStyle = 'rim' | 'red' | 'white' | 'fire' | 'ink' | 'calm';

function surface(): { canvas: HTMLCanvasElement; brush: Context } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const brush = canvas.getContext('2d', { willReadFrequently: true });
  if (!brush) throw new Error('쇼크코마 v2의 작화 판을 만들 수 없습니다.');
  return { canvas, brush };
}

/** 같은 정권 접촉의 실제 알파와 명암을 재사용한다. 새 인체 자세는 만들지 않는다. */
class ShockKomaV2Plates {
  private readonly plates = new Map<PlateStyle, HTMLCanvasElement>();

  constructor(frame: Frame) {
    const source = surface();
    const current = { ...frame, timeMs: contactMs + 16, reducedMotion: false };
    const impact = battleImpact(current);
    source.brush.translate(570 - impact.x * 1.2, 300 - impact.y * 1.2);
    source.brush.scale(1.2, 1.2);
    drawBear(source.brush, current);
    drawAtaho(source.brush, current, { action: 'straight' });
    source.brush.resetTransform();
    const pixels = source.brush.getImageData(0, 0, width, height).data;
    for (const style of [
      'rim',
      'red',
      'white',
      'fire',
      'ink',
      'calm',
    ] as const) {
      const target = surface();
      const image = target.brush.createImageData(width, height);
      for (let y = 3; y < height - 3; y++) {
        for (let x = 3; x < width - 3; x++) {
          const p = (y * width + x) * 4;
          if (pixels[p + 3]! < 40) continue;
          const edge = [-12, 12, -width * 12, width * 12].some(
            (offset) => pixels[p + offset + 3]! < 40,
          );
          const light =
            pixels[p]! * 0.2126 +
            pixels[p + 1]! * 0.7152 +
            pixels[p + 2]! * 0.0722;
          let color: readonly [number, number, number];
          switch (style) {
            case 'rim':
              color = edge
                ? x % 9 < 4
                  ? [255, 245, 220]
                  : [255, 70, 151]
                : light > 205
                  ? [255, 211, 117]
                  : [5, 3, 12];
              break;
            case 'red':
              color = edge ? [128, 0, 38] : [37, 0, 19];
              break;
            case 'white':
              color = edge ? [255, 255, 237] : [98, 23, 67];
              break;
            case 'fire':
              color = edge
                ? [255, 83, 91]
                : light > 205
                  ? [255, 227, 189]
                  : light > 140
                    ? [109, 29, 52]
                    : [8, 6, 15];
              break;
            case 'ink':
              color = light > 162 && !edge ? [12, 14, 21] : [255, 253, 234];
              break;
            case 'calm':
              color = light > 140 ? [162, 167, 169] : [52, 59, 69];
              break;
          }
          image.data[p] = color[0];
          image.data[p + 1] = color[1];
          image.data[p + 2] = color[2];
          image.data[p + 3] = pixels[p + 3]!;
        }
      }
      target.brush.putImageData(image, 0, 0);
      this.plates.set(style, target.canvas);
    }
    source.canvas.width = source.canvas.height = 1;
  }

  draw(ctx: Context, style: PlateStyle): void {
    ctx.drawImage(this.plates.get(style)!, 0, 0);
  }

  dispose(): void {
    for (const canvas of this.plates.values()) canvas.width = canvas.height = 1;
    this.plates.clear();
  }
}

function radialInk(ctx: Context): void {
  ctx.fillStyle = '#fffce9';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 116; i++) {
    const angle = (i / 116) * Math.PI * 2;
    const inner = 95 + noise(i + 8) * 110;
    const spread = 0.006 + noise(i + 22) * 0.018;
    polygon(
      ctx,
      [
        { x: 570 + Math.cos(angle) * inner, y: 300 + Math.sin(angle) * inner },
        {
          x: 570 + Math.cos(angle - spread) * 1000,
          y: 300 + Math.sin(angle - spread) * 1000,
        },
        {
          x: 570 + Math.cos(angle + spread) * 1000,
          y: 300 + Math.sin(angle + spread) * 1000,
        },
      ],
      '#090c14',
    );
  }
}

/** 같은 픽셀 배율과 타점을 유지해야 핵의 팽창·소진이 작화 자체로 드러난다. */
function drawImpactCell(ctx: Context, frame: Frame, index: number): void {
  const atlas = frame.assets.effects.get(`technique:${spriteRecord.atlas.key}`);
  const cell = spriteRecord.cells[index];
  if (!atlas || !cell) throw new Error('쇼크코마 v2의 효과 작화가 없습니다.');
  const { pixelScale, impactX, impactY } = spriteRecord.render;
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

const surfaces = new WeakMap<Context, ShockKomaV2Plates>();

export function drawShockKomaV2Scene(ctx: Context, frame: Frame): void {
  let plates = surfaces.get(ctx);
  if (frame.enhanced && !plates) {
    plates = new ShockKomaV2Plates(frame);
    surfaces.set(ctx, plates);
  }
  const active =
    frame.enhanced && frame.timeMs >= contactMs && frame.timeMs < finishMs;
  if (!active || !plates) {
    drawBattle(ctx, frame, { action: 'straight' });
  } else if (frame.reducedMotion) {
    ctx.fillStyle = '#626873';
    ctx.fillRect(0, 0, width, height);
    plates.draw(ctx, 'calm');
  } else {
    const t = frame.timeMs;
    ctx.fillStyle = t < whiteMs && t >= redMs ? '#fa0757' : '#07050e';
    ctx.fillRect(0, 0, width, height);
    if (t < redMs) {
      plates.draw(ctx, 'rim');
      line(
        ctx,
        [
          { x: 540, y: 302 },
          { x: 960, y: 270 },
        ],
        '#fff4dc',
        4,
      );
    } else if (t < whiteMs) {
      plates.draw(ctx, 'red');
    } else if (t < flameMs) {
      // 접촉 앞에서 퍼져야 곰왕의 큰 실루엣 뒤에 섬광이 묻히지 않는다.
      plates.draw(ctx, 'white');
      // 정확한 코마 탐색도 다음 작화를 고르도록 소수점 시간 오차만 흡수한다.
      const drawing = Math.min(2, Math.floor((t - whiteMs + 0.001) / cellMs));
      drawImpactCell(ctx, frame, drawing);
    } else if (t < inkMs) {
      plates.draw(ctx, 'fire');
      const drawing = Math.floor((t - flameMs + 0.001) / (cellMs * 2));
      drawImpactCell(ctx, frame, 3 + drawing);
    } else {
      radialInk(ctx);
      plates.draw(ctx, 'ink');
    }
  }
}

export function drawShockKomaV2(ctx: Context, frame: Frame): void {
  drawShockKomaV2Scene(ctx, frame);
  ctx.fillStyle = '#10131ddd';
  ctx.fillRect(28, 468, frame.enhanced && !frame.reducedMotion ? 720 : 380, 36);
  label(
    ctx,
    frame.enhanced
      ? frame.reducedMotion
        ? '모션 감소 · 낮은 대비의 접촉 판 유지'
        : '발광 윤곽 → 적색 실루엣 → 백열광 → 붉은 잔염 → 흑백 충격'
      : '같은 수평 정권 · 같은 접촉 시각',
  );
}

export function disposeShockKomaV2(ctx: Context): void {
  surfaces.get(ctx)?.dispose();
  surfaces.delete(ctx);
}
