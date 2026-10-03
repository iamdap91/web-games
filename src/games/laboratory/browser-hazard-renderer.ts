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
  const caught = selection.caughtElapsed !== null;
  const edge = caught ? 0 : selection.boundary - camera;
  if (selection.deleted) {
    ctx.fillStyle = '#0a1012';
    ctx.fillRect(0, 0, 1000, 430);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, edge), 430);
    ctx.clip();
    if (!caught) paint();
    ctx.restore();
    const after =
      selection.elapsed - selectionTiming.sweep - selectionTiming.pause;
    if (after < 0.1) {
      ctx.fillStyle = `rgb(163 192 255 / ${(1 - after / 0.1) * 0.5})`;
      ctx.fillRect(Math.max(0, edge), 0, 1000, 430);
    }
    const phrase = '아...깝...다...';
    const typing = [
      0.45, 0.7, 0.87, 1.04, 1.65, 1.9, 2.07, 2.24, 2.85, 3.1, 3.27, 3.44,
    ];
    const typed = caught
      ? ''
      : phrase.slice(0, typing.filter((time) => after >= time).length);
    const textX = Math.max(26, edge + 24);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, edge), 0, 1000, 430);
    ctx.clip();
    // 타이핑 중 글자 크기가 달라지지 않도록 완성된 문구를 기준으로 맞춘다.
    ctx.font = 'bold 96px monospace';
    const fontSize = Math.min(
      96,
      (96 * (970 - textX)) / ctx.measureText(phrase).width,
    );
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#e24646';
    const baseline = 215 + fontSize * 0.35;
    ctx.fillText(typed, textX, baseline);
    const cursorX = textX + ctx.measureText(typed).width + (typed ? 12 : 0);
    if (after % 1 < 0.58) {
      ctx.fillStyle = '#f0f4f1';
      const top = caught ? 142 : baseline - fontSize;
      const height = caught ? 134 : fontSize * 1.25;
      ctx.fillRect(cursorX, top, 4, height);
      ctx.fillRect(cursorX - 6, top - 2, 16, 2);
      ctx.fillRect(cursorX - 6, top + height, 16, 2);
    }
    ctx.restore();
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
