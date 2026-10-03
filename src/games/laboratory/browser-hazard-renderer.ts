import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import type { GameAssets } from './assets.js';
import type { GameSnapshot } from './game.js';
import { cameraPosition } from './spatial-rules.js';
import { drawPlayer } from './player-renderer.js';
import { smooth } from './event-rules.js';
import { selectionTiming } from './screen-selection.js';

export function drawSelectedRoom(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
  paint: () => void,
): void {
  const selection = state.selection;
  if (selection.elapsed === null) {
    paint();
    return;
  }
  const camera = cameraPosition(state.player.x);
  const edge = selection.boundary - camera;
  if (selection.deleted) {
    ctx.fillStyle = '#0a1012';
    ctx.fillRect(0, 0, 1000, 430);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, edge), 430);
    ctx.clip();
    paint();
    ctx.restore();
    const after =
      selection.elapsed - selectionTiming.sweep - selectionTiming.pause;
    if (after < 0.1) {
      ctx.fillStyle = `rgb(163 192 255 / ${(1 - after / 0.1) * 0.5})`;
      ctx.fillRect(Math.max(0, edge), 0, 1000, 430);
    }
    if (after % 1 < 0.58) {
      ctx.fillStyle = '#c8dfd8';
      ctx.fillRect(Math.max(26, edge + 24), 142, 4, 134);
      ctx.fillRect(Math.max(20, edge + 18), 140, 16, 2);
      ctx.fillRect(Math.max(20, edge + 18), 276, 16, 2);
    }
    return;
  }
  paint();
  ctx.save();
  ctx.beginPath();
  ctx.rect(edge, 0, 2400, 430);
  ctx.clip();
  ctx.fillStyle = '#397cf26b';
  ctx.fillRect(edge, 0, 2400, 430);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = '#327dff38';
  for (const [y, h] of [
    [38, 33],
    [109, 112],
    [251, 51],
    [341, 70],
  ])
    ctx.fillRect(edge, y!, 2400, h!);
  ctx.restore();
  ctx.strokeStyle = '#b3cfff';
  ctx.lineWidth = 2;
  ctx.strokeRect(edge + 1, 2, 2400 - selection.boundary - 2, 426);
  for (const y of [5, 211, 420]) {
    ctx.fillStyle = '#dce9ff';
    ctx.fillRect(edge - 4, y, 9, 9);
  }
  const player = state.player;
  if (player.x + 18 >= selection.boundary) {
    ctx.strokeStyle = '#dce9ff';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(player.x - camera - 23, player.y - 68, 46, 70);
    ctx.setLineDash([]);
  }
}

export function drawLoadingWheel(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  if (state.scenario !== 'loading-wheel' || state.wheel.phase === 'waiting')
    return;
  const wheel = state.wheel;
  const { x, radius, angle } = wheel;
  const y = 340 - radius;
  const winding = smooth((radius - 22) / 100);
  // 바닥 타일의 띠가 원의 둘레에 감겨 올라가며 UI 아이콘에 무게를 준다.
  ctx.save();
  ctx.fillStyle = '#091113';
  ctx.fillRect(x, 340, 2400 - x, 90);
  ctx.beginPath();
  ctx.moveTo(x, 340);
  ctx.bezierCurveTo(
    x + radius * 1.3,
    340,
    x + radius * 1.4,
    y + radius * 0.3,
    x + radius * 0.8,
    y - radius * 0.5,
  );
  ctx.strokeStyle = '#647265';
  ctx.lineWidth = 18 * winding;
  if (winding > 0) ctx.stroke();
  ctx.strokeStyle = '#b2b99a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = winding;
  for (let tile = 0; tile < 6; tile++) {
    const a = -0.8 + ((tile / 6 + Math.abs(angle) * 0.07) % 1) * 1.65;
    ctx.save();
    ctx.translate(
      x + Math.cos(a) * (radius + 10),
      y + Math.sin(a) * (radius + 10),
    );
    ctx.rotate(a + Math.PI / 2);
    ctx.drawImage(assets.normal, 500 + tile * 40, 340, 36, 18, -18, -9, 36, 18);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = '#b4e3d180';
  ctx.shadowBlur = 14 * winding;
  ctx.lineWidth = 4 + 17 * winding;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(193, 224, 210, ${0.12 + (i / 11) * 0.88})`;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      radius - 12 * winding,
      (i * Math.PI) / 6,
      ((i + 0.65) * Math.PI) / 6,
    );
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawWheelActor(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
): boolean {
  const wheel = state.wheel;
  if (wheel.passenger) {
    ctx.save();
    ctx.translate(state.player.x, state.player.y - 30);
    ctx.rotate(wheel.passenger.rotation);
    drawPlayer(ctx, assets, { ...state.player, x: 0, y: 30 }, frame, false);
    ctx.restore();
    return true;
  }
  if (wheel.phase === 'caught') {
    const t = smooth(wheel.elapsed / 0.65);
    const x = state.player.x + (wheel.x - state.player.x) * t;
    const y = state.player.y - 30 + (310 - wheel.radius - state.player.y) * t;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * -Math.PI * 5);
    ctx.scale(1 - t, 1 - t);
    drawPlayer(
      ctx,
      assets,
      { ...state.player, x: 0, y: 30, flashRemaining: 0 },
      frame,
      false,
    );
    ctx.restore();
    return true;
  }
  return false;
}
