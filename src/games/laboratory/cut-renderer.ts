import { world } from './layout.js';
import { cutImpact, cutting } from './room-cutter.js';
import { cameraPosition } from './spatial-rules.js';
import type { GameSnapshot } from './game.js';

// 원래 장면을 같은 좌표에서 잘라 그려 시설물과 캐릭터도 조각에 함께 붙는다.
export function drawCutRoom(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
  drawRoom: () => void,
): void {
  const cut = state.cut;
  const time = cut.elapsed;
  if (time === null) {
    drawRoom();
    return;
  }
  const camera = cameraPosition(state.player.x);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camera, -20, cut.boundary, 470);
  ctx.clip();
  drawRoom();
  ctx.restore();
  for (let i = 0; i < cut.count; i++) {
    const age = time - cutImpact(i);
    if (age > 1.25) continue;
    const left = cutting.boundaries[i]!;
    const right = i === 0 ? world.width : cutting.boundaries[i - 1]!;
    const fall = Math.max(0, age - 0.11);
    const x = left - camera;
    ctx.save();
    ctx.translate(x + 8 + fall * 24, 5 + fall * fall * 1150);
    ctx.rotate(fall * 0.13);
    ctx.translate(-x, 0);
    ctx.beginPath();
    ctx.rect(x, 0, right - left, world.height);
    ctx.clip();
    drawRoom();
    ctx.fillStyle = '#b9d3cd';
    ctx.fillRect(x, 0, 2, world.height);
    ctx.restore();
  }
  // 아직 내려오지 않은 칼날과 직전 칼날만 남겨 화면을 가리지 않는다.
  for (let i = Math.max(0, cut.count - 1); i <= cut.count; i++) {
    const boundary = cutting.boundaries[i];
    if (
      boundary === undefined ||
      (cut.caughtElapsed !== null && i === cut.count)
    )
      continue;
    const age = time - i * cutting.interval;
    drawBlade(ctx, boundary - camera, age);
  }
}

function drawBlade(
  ctx: CanvasRenderingContext2D,
  x: number,
  age: number,
): void {
  if (age < 0 || age > cutting.warning + cutting.descent + 0.6) return;
  ctx.save();
  // 칼이 닿을 선은 바닥까지 이어져 점프 중에도 절단 위치를 읽을 수 있다.
  if (age < cutting.warning) {
    const alpha = 0.2 + 0.5 * (age / cutting.warning);
    ctx.strokeStyle = `rgb(226 232 192 / ${alpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgb(203 212 172 / ${alpha * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, 341, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = Math.max(0, Math.min(1, (age - cutting.warning) / cutting.descent));
  const after = Math.max(0, age - cutting.warning - cutting.descent);
  const tip = -35 + t * t * 478 + Math.max(0, after - 0.07) * 1700;
  ctx.translate(x, tip);
  const metal = ctx.createLinearGradient(-20, 0, 32, 0);
  metal.addColorStop(0, '#131f25');
  metal.addColorStop(0.32, '#778988');
  metal.addColorStop(0.65, '#d0d7cb');
  metal.addColorStop(0.72, '#f3f0cf');
  metal.addColorStop(1, '#586f71');
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(-23, -590);
  ctx.lineTo(34, -590);
  ctx.lineTo(34, -78);
  ctx.lineTo(0, 0);
  ctx.lineTo(-23, -50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e6eee0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -585);
  ctx.lineTo(10, -48);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#142024';
  for (let y = -530; y < -85; y += 62) {
    ctx.fillRect(-18, y, 13, 4);
    ctx.fillStyle = '#8e9d95';
    ctx.fillRect(-16, y, 2, 2);
    ctx.fillStyle = '#142024';
  }
  ctx.restore();
  if (after > 0 && after < 0.22) {
    ctx.save();
    ctx.globalAlpha = 1 - after / 0.22;
    ctx.fillStyle = '#e8e7bf';
    ctx.fillRect(x - 2, 0, 4, world.height);
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.4;
      const travel = after * (120 + (i % 4) * 90);
      ctx.fillRect(
        x + Math.cos(angle) * travel,
        340 + Math.sin(angle) * travel,
        4,
        2,
      );
    }
    ctx.restore();
  }
}
