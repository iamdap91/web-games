import type { GameSnapshot } from './game.js';
import { cameraPosition } from './spatial-rules.js';
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
