import { drawSelectedRoom } from './browser-hazard-renderer.js';
import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import type { GameAssets } from './assets.js';
import { exitLight, passage, type GameSnapshot } from './game.js';
import { world, viewport } from './layout.js';

import { roomTurn, smooth } from './event-rules.js';
import { drawIntruder } from './intruder-renderer.js';
import { drawIntruderScare } from './intruder-scare-renderer.js';
import { cameraPosition, roomCameraPosition } from './spatial-rules.js';
import { drawWindowReflection } from './observation-window.js';
import { drawPlayer } from './player-renderer.js';
import {
  recordedFrame,
  drawRewindEchoes,
  drawRewindScreen,
} from './rewind-renderer.js';
import { drawCutRoom } from './cut-renderer.js';
import { cutImpact } from './room-cutter.js';
import { pipeShake } from './pipe-cascade.js';
import {
  drawAnomalyBackground,
  drawAnomalyPipes,
  drawCeiling,
  drawBlackout,
} from './anomaly-renderer.js';

export { viewport } from './layout.js';

export function drawGame(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
): void {
  const { player } = state;
  if (state.scenario === 'time-rewind')
    frame = recordedFrame(assets, player, frame);
  const cameraX = cameraPosition(player.x);
  ctx.fillStyle = state.cut.elapsed === null ? '#0d1719' : '#020305';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (state.scenario === 'select-delete')
    drawSelectedRoom(ctx, state, () => drawRoom(ctx, assets, state, frame));
  else if (state.scenario === 'room-guillotine')
    drawCutRoom(ctx, state, () => drawRoom(ctx, assets, state, frame));
  else drawRoom(ctx, assets, state, frame);
  const shade = ctx.createRadialGradient(500, 230, 130, 500, 215, 550);
  shade.addColorStop(0, '#07141600');
  shade.addColorStop(1, state.progress === 8 ? '#35231330' : '#030a0c80');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (state.progress === 8) {
    ctx.save();
    ctx.translate(-cameraX, 0);
    // 빛은 캐릭터와 잔상 위에 그려 오른쪽에서 모든 윤곽을 지운다.
    const light = ctx.createLinearGradient(
      exitLight.start,
      0,
      exitLight.opaque,
      0,
    );
    light.addColorStop(0, '#fffaf000');
    light.addColorStop(0.2, '#fffaf01a');
    light.addColorStop(0.55, '#fffaf059');
    light.addColorStop(0.82, '#fffaf0cc');
    light.addColorStop(1, '#fffaf0');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();
  }
  if (state.landingElapsed !== null && state.landingElapsed < 0.18) {
    ctx.fillStyle = `rgb(5 10 12 / ${1 - state.landingElapsed / 0.18})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
  drawBlackout(ctx, state);
  drawRewindScreen(ctx, state);
  drawIntruderScare(ctx, state, viewport.width, viewport.height);
  if (state.hitElapsed !== null) {
    ctx.fillStyle = `rgb(205 65 45 / ${0.45 * (1 - state.hitElapsed / passage.fadeOut)})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
  if (state.transitionElapsed !== null) {
    const elapsed = state.transitionElapsed;
    const opacity =
      elapsed < passage.fadeOut
        ? elapsed / passage.fadeOut
        : Math.max(0, 1 - (elapsed - passage.fadeOut) / passage.fadeIn);
    const leavingInLight = state.progress === 8 && player.x >= exitLight.finish;
    ctx.fillStyle = leavingInLight
      ? `rgb(255 250 240 / ${opacity})`
      : `rgb(5 10 12 / ${opacity})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
}

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
  { actor = true }: { readonly actor?: boolean } = {},
): void {
  const { player, pipeElapsed } = state;
  const cameraX = roomCameraPosition(state);
  const shake =
    state.hitElapsed === null
      ? pipeShake(pipeElapsed)
      : Math.cos(state.hitElapsed * 100) *
        7 *
        (1 - state.hitElapsed / passage.fadeOut);
  ctx.save();
  if (state.scenario === 'mirrored-lab') {
    const vertical = roomTurn(state.anomaly.activeElapsed) * Math.PI;
    const horizontal = roomTurn(state.anomaly.mirrorElapsed) * Math.PI;
    ctx.translate(500, 170);
    ctx.scale(Math.cos(horizontal), Math.cos(vertical));
    ctx.translate(-500, -170);
  }
  const cutAge =
    state.cut.elapsed === null || state.cut.count === 0
      ? 1
      : state.cut.elapsed - cutImpact(state.cut.count - 1);
  const cutShake =
    cutAge < 0.16 ? Math.sin(cutAge * 130) * 5 * (1 - cutAge / 0.16) : 0;
  ctx.translate(-cameraX, shake + cutShake);
  drawAnomalyBackground(ctx, assets, state);
  if (actor) drawWindowReflection(ctx, assets, state, frame);
  if (!(state.scenario === 'folding-stage' && state.anomaly.backstageReturning))
    drawEntry(ctx, state);
  if (state.scenario === 'escaping-exit') drawEscapingExit(ctx, assets, state);
  if (state.progress === 8) drawExit(ctx, 780, '→');
  else {
    if (state.scenario !== 'escaping-exit') drawExit(ctx, 44, '←');
    if (state.scenario !== 'escaping-exit')
      drawExit(ctx, world.width - 44, '→');
  }

  drawRewindEchoes(ctx, assets, state, frame);
  if (
    actor &&
    state.squashElapsed === null &&
    state.intruder.caughtElapsed === null &&
    state.scenario !== 'folding-stage' &&
    !(state.scenario === 'frame-escape' && state.anomaly.activeElapsed !== null)
  )
    drawPlayer(ctx, assets, player, frame);
  ctx.save();
  if (state.scenario === 'mirrored-lab') {
    ctx.beginPath();
    ctx.rect(0, 0, world.width, world.ground);
    ctx.clip();
  }
  drawAnomalyPipes(ctx, assets, state);
  ctx.restore();
  drawCeiling(ctx, assets, state);
  if (state.squashElapsed !== null) {
    const t = state.squashElapsed;
    const squash = smooth(t / 0.1);
    const wobble =
      t > 0.1 ? Math.sin((t - 0.1) * 30) * Math.exp(-(t - 0.1) * 7) * 0.18 : 0;
    ctx.save();
    ctx.translate(player.x, world.ground);
    ctx.scale(1 + squash * 1.8 + wobble, 1 - squash * 0.88);
    drawPlayer(ctx, assets, { ...player, x: 0, y: 0 }, frame, false);
    ctx.restore();
  }
  if (state.scenario === 'room-invasion')
    drawIntruder(ctx, assets, state, frame, actor);
  ctx.restore();
}

const roomNumberNoiseColors = ['#5cffff', '#ff62cf', '#ffe875', '#98ff94'];

function drawRoomNumber(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
): void {
  const glitch = state.failureElapsed;
  const pulse = glitch === null ? 0 : Math.floor(glitch * 30);
  // 암전이 걷힌 뒤에도 색 어긋남을 유지하고 마지막에는 밝은 0으로 정착시킨다.
  const strength =
    glitch === null ? 0 : 1 - smooth((glitch / passage.glitch - 0.55) / 0.45);
  const accent = roomNumberNoiseColors[pulse % roomNumberNoiseColors.length]!;
  const offset = Math.sin(pulse * 4.7) * 9 * strength;
  ctx.save();
  ctx.fillStyle = '#081311';
  ctx.fillRect(149, 57, 108, 75);
  ctx.strokeStyle = glitch === null ? '#56675d' : accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14 * strength;
  ctx.lineWidth = glitch === null ? 1 : 2;
  ctx.strokeRect(149.5, 57.5, 107, 74);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = glitch === null ? '#9bac9c' : '#eaffed';
  ctx.fillText(state.progress === 8 ? 'EXIT →' : 'SECTOR C-2', 203, 73);
  ctx.font = 'bold 46px monospace';
  const digit =
    glitch === null || glitch / passage.glitch >= 0.65
      ? String(state.progress)
      : pulse % 4 === 0
        ? '—'
        : String(pulse % 3 === 0 ? state.progress : state.previousRoom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(150, 78, 106, 49);
  ctx.clip();
  if (glitch !== null) {
    // 숫자 본체는 밝게 유지하고 색 잔상만 서로 어긋나게 그린다.
    ctx.globalAlpha = 0.85 * strength;
    ctx.fillStyle = '#5cffff';
    ctx.fillText(digit, 203 + offset - 7 * strength, 119 - 2 * strength);
    ctx.fillStyle = '#ff62cf';
    ctx.fillText(digit, 203 + offset + 7 * strength, 119 + 2 * strength);
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = glitch === null ? '#adcfad' : '#baffdc';
  ctx.shadowBlur = glitch === null ? 7 : 12;
  ctx.fillStyle = glitch === null ? '#c4d4b7' : '#f2fff5';
  ctx.fillText(digit, 203 + offset, 119);
  ctx.shadowBlur = 0;
  if (glitch !== null) drawRoomNumberNoise(ctx, pulse, strength);
  ctx.restore();
  ctx.restore();
}

function drawRoomNumberNoise(
  ctx: CanvasRenderingContext2D,
  pulse: number,
  strength: number,
): void {
  ctx.globalAlpha = 0.7 * strength;
  for (let line = 0; line < 8; line++) {
    ctx.fillStyle =
      roomNumberNoiseColors[(pulse + line) % roomNumberNoiseColors.length]!;
    const y = 80 + ((pulse * 11 + line * 17) % 46);
    ctx.fillRect(
      151 + Math.sin(pulse + line) * 28,
      y,
      36 + ((pulse * 13 + line * 19) % 60),
      line % 3 === 0 ? 3 : 1,
    );
    // 짧은 검은 단절과 밝은 색 조각으로 고장 난 표시판의 수평 잡음을 만든다.
    ctx.fillStyle = '#081311';
    ctx.fillRect(160 + ((pulse * 7 + line * 23) % 78), y + 2, 18, 2);
  }
}

function drawEntry(ctx: CanvasRenderingContext2D, state: GameSnapshot): void {
  if (state.scenario !== 'escaping-exit') drawRoomNumber(ctx, state);
  ctx.save();
  if (state.progress === 8) {
    ctx.textAlign = 'left';
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#eee5cc';
    ctx.fillText('바깥 공기.', 400, 218);
  } else {
    ctx.fillStyle = '#26332c';
    ctx.fillRect(383, 139, 274, 122);
    ctx.strokeStyle = '#81907b';
    ctx.strokeRect(386.5, 142.5, 267, 115);
    ctx.fillStyle = '#aebba5';
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillText('연구소 출입 수칙', 402, 162);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#e0e5ce';
    ctx.fillText('이상이 있으면  ← 되돌아갈 것', 402, 190);
    ctx.fillText('이상이 없으면  → 나아갈 것', 402, 217);
    ctx.fillStyle = '#b3bea8';
    ctx.font = '14px sans-serif';
    ctx.fillText('8번 방이 출구입니다.', 402, 244);
    for (const x of [390, 650])
      for (const y of [146, 254]) {
        ctx.fillStyle = '#9caa90';
        ctx.fillRect(x, y, 2, 2);
      }
  }
  ctx.restore();
}

function drawEscapingExit(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  for (const [door, entry] of [
    [state.exit, true],
    [state.rightExit, false],
  ] as const) {
    ctx.save();
    ctx.fillStyle = '#02080970';
    ctx.beginPath();
    ctx.ellipse(door.x, world.ground - 2, 92, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(door.x, world.ground - door.bounce);
    ctx.rotate(door.lean);
    ctx.drawImage(assets.exitDoor, -83, -200);
    ctx.translate(-203, -world.ground);
    if (entry) drawRoomNumber(ctx, state);
    else drawExit(ctx, 316, '→');
    ctx.restore();
  }
}

function drawExit(
  ctx: CanvasRenderingContext2D,
  x: number,
  arrow: string,
): void {
  ctx.fillStyle = '#9fae9d';
  ctx.textAlign = 'center';
  ctx.font = '28px sans-serif';
  ctx.fillText(arrow, x, 243);
  ctx.fillStyle = '#9fae9d35';
  ctx.fillRect(x - 1, 280, 2, 60);
}
