import type { GameAssets } from './assets.js';
import type { GameSnapshot } from './game.js';
import { clamp, smooth } from './event-rules.js';

function prop(assets: GameAssets, name: string): HTMLImageElement {
  const image = assets.props.get(name)?.[0];
  if (!image) throw new Error(`공간 이미지가 없습니다: ${name}`);
  return image;
}

export function drawMachine(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  x: number,
  scale: number,
  lean = 0,
  stride = 0,
): void {
  ctx.save();
  ctx.fillStyle = '#03080bd0';
  ctx.beginPath();
  ctx.ellipse(x, 342, 66 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, 340);
  ctx.rotate(lean);
  const lift = Math.abs(Math.sin(stride)) * Math.min(3, Math.abs(lean) * 60);
  ctx.drawImage(
    assets.machine,
    -70 * scale,
    -250 * scale - lift,
    140 * scale,
    250 * scale,
  );
  ctx.restore();
}

const portal = { x: 1390, y: 70, width: 260, height: 270 } as const;

function doorOpening(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  open: number,
  inside: () => void,
): void {
  const frames = assets.props.get('개폐 철문');
  const index = Math.round(clamp(open) * 5);
  const frame = frames?.[index];
  if (!frame) return;
  ctx.save();
  ctx.filter = 'saturate(0.45) brightness(0.7)';
  ctx.drawImage(frame, portal.x, portal.y, portal.width, portal.height);
  ctx.restore();
  // 원본 프레임의 검은 내부를 실제 방으로 채우되 문짝과 문틀은 남긴다.
  const opening = [0, 22, 56, 102, 150, 172][index]!;
  if (!opening) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(portal.x + 140 - opening / 2, portal.y + 62, opening, 197);
  ctx.clip();
  inside();
  ctx.restore();
}

export function drawBlackoutChamber(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const time = state.anomaly.activeElapsed;
  const arrived = time !== null && time >= 0.32;
  doorOpening(ctx, assets, 1, () => {
    ctx.fillStyle = '#09171a';
    ctx.fillRect(portal.x, portal.y, portal.width, portal.height);
    for (let x = portal.x + 40; x < portal.x + 230; x += 30) {
      ctx.fillStyle = '#233438';
      ctx.fillRect(x, 130, 2, 200);
    }
    if (!arrived) {
      ctx.save();
      ctx.translate(0, -8);
      drawMachine(ctx, assets, portal.x + 140, 0.7);
      ctx.restore();
    }
  });
  if (arrived) {
    const settle = Math.max(0, 1 - ((time ?? 0) - 0.32) / 0.45);
    drawMachine(
      ctx,
      assets,
      state.anomaly.blackoutX,
      1.18,
      Math.sin(settle * 9) * settle * 0.025,
    );
  }
}

function mansion(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  expansion: number,
): void {
  const left = 1450 - expansion * 480;
  const width = 220 + expansion * 750;
  ctx.save();
  ctx.filter = 'saturate(0.5) brightness(0.65)';
  ctx.drawImage(prop(assets, '저택 실내 벽'), left, 35, width, 305);
  ctx.drawImage(
    prop(assets, '목재 괘종시계'),
    left + width * 0.7,
    150,
    115,
    190,
  );
  ctx.restore();
  const shade = ctx.createLinearGradient(left, 0, left + width, 0);
  shade.addColorStop(0, '#080d1190');
  shade.addColorStop(0.45, '#11100910');
  shade.addColorStop(1, '#070b1099');
  ctx.fillStyle = shade;
  ctx.fillRect(left, 35, width, 305);
}

export function drawInvasion(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const p = state.anomaly.invasion;
  const open = smooth((state.anomaly.activeElapsed ?? 0) / 1.3);
  if (p > 0) {
    ctx.save();
    // 문 밖으로 확장된 공간의 사선 가장자리가 기존 설비를 앞에서 덮는다.
    ctx.beginPath();
    ctx.moveTo(1510 - p * 540, 130 - p * 100);
    ctx.lineTo(1590 + p * 520, 130 - p * 95);
    ctx.lineTo(1610 + p * 590, 340);
    ctx.lineTo(1490 - p * 600, 340);
    ctx.closePath();
    ctx.clip();
    mansion(ctx, assets, p);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(1500 - p * 530, 338);
    ctx.lineTo(1610 + p * 570, 338);
    ctx.lineTo(1610 + p * 650, 340 + p * 78);
    ctx.lineTo(1490 - p * 660, 340 + p * 78);
    ctx.closePath();
    ctx.fillStyle = '#070907';
    ctx.fill();
    ctx.clip();
    ctx.filter = 'saturate(0.45) brightness(0.5)';
    const floor = prop(assets, '목재 바닥 무늬');
    for (let x = 700; x < 2400; x += 240) ctx.drawImage(floor, x, 339, 240, 95);
    ctx.restore();
  }
  doorOpening(ctx, assets, open, () => {
    mansion(ctx, assets, p);
    if (p < 0.32) {
      const size = 0.43 + p * 0.7;
      ctx.drawImage(
        prop(assets, '목재 책장'),
        1515 - p * 480,
        340 - 212 * size,
        240 * size,
        212 * size,
      );
    }
  });
}

export function drawInvasionFurniture(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const p = state.anomaly.invasion;
  if (p <= 0.15) return;
  ctx.save();
  // 문틀 뒤에서 나오다가 바닥까지 진출한다. 캐릭터 앞 레이어가 깊이를 만든다.
  if (p < 0.4) {
    ctx.beginPath();
    ctx.rect(1490 - p * 600, 90, 200 + p * 1190, 280);
    ctx.clip();
  }
  const x = 1515 - p * 480;
  const scale = 0.43 + p * 0.7;
  ctx.fillStyle = '#03070899';
  ctx.beginPath();
  ctx.ellipse(x + 110 * scale, 347, 130 * scale, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'saturate(0.5) brightness(0.65)';
  ctx.drawImage(
    prop(assets, '목재 책장'),
    x,
    346 - 212 * scale,
    240 * scale,
    212 * scale,
  );
  if (p > 0.45)
    ctx.drawImage(prop(assets, '낡은 나무 의자'), 1600 + p * 250, 285, 90, 76);
  ctx.restore();
}
