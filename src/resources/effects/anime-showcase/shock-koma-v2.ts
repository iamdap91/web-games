import { battleImpact, drawAtaho, drawBattle, drawBear } from './battle.js';
import { ellipse, label, line, noise, polygon } from './drawing.js';
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

/** 백열 핵의 면적을 줄이고 적색 테두리와 검은 틈을 드러내 잔염으로 푼다. */
function flame(ctx: Context, drawing: number, progress: number): void {
  const strength = 1 - progress * 0.58;
  ctx.save();
  ctx.translate(570, 300);
  ctx.rotate(-0.13);
  for (const layer of [
    { color: '#ec074d', radius: 1.16 },
    { color: '#ff443e', radius: 1 },
    { color: '#ffc24c', radius: 0.77 },
    { color: '#fffbd9', radius: 0.52 },
  ]) {
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    for (let i = 0; i <= 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const jag = 0.8 + noise(i + drawing * 101) * 0.35;
      const x = 165 + Math.cos(angle) * 270 * layer.radius;
      const y =
        Math.sin(angle) *
        (108 + Math.cos(angle * 3 + drawing) * 34) *
        layer.radius *
        strength *
        jag;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = layer.radius > 1 ? 24 : 0;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // 밝은 덩어리를 가로지르는 불꽃 갈래와 어두운 틈이 진행 방향을 드러낸다.
  for (let i = 0; i < 16; i++) {
    const x = 70 + noise(i + 11) * 330;
    const y = (noise(i + 32) - 0.5) * 240 * strength;
    const travel = 15 + noise(i + drawing * 13) * 75;
    line(
      ctx,
      [
        { x, y },
        { x: x + travel, y: y - 8 },
        { x: x + travel * 1.8, y: y - 3 },
      ],
      i % 3 === 0 ? '#100a1b' : '#ff7054',
      2 + noise(i + 70) * 7,
    );
  }
  ctx.restore();
  for (let i = 0; i < 32; i++) {
    const x = 600 + noise(i + drawing * 19) * 370;
    const y = 300 + (noise(i + drawing * 17) - 0.5) * 340 * strength;
    ellipse(ctx, x, y, 1 + noise(i) * 4, 1 + noise(i + 8) * 3, '#ff7d40');
  }
}

const surfaces = new WeakMap<Context, ShockKomaV2Plates>();

export function drawShockKomaV2(ctx: Context, frame: Frame): void {
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
      const age = (t - whiteMs) / (flameMs - whiteMs);
      const radius = 135 + Math.floor(age * 3) * 105;
      ellipse(ctx, 630, 275, radius * 1.5, radius, '#362238');
      ellipse(ctx, 630, 275, radius * 1.42, radius * 0.94, '#ff8d64');
      ellipse(ctx, 630, 275, radius * 1.34, radius * 0.88, '#fffde1');
      plates.draw(ctx, 'white');
    } else if (t < inkMs) {
      const progress = (t - flameMs) / (inkMs - flameMs);
      flame(ctx, Math.floor((t - flameMs) / (cellMs * 2)), progress);
      plates.draw(ctx, 'fire');
    } else {
      radialInk(ctx);
      plates.draw(ctx, 'ink');
    }
  }
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
