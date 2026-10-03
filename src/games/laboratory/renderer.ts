import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import type { GameAssets } from './assets.js';
import { exitLight, passage, world, type GameSnapshot } from './game.js';

import { pipes, pipeFall, pipeShake, pipeShape } from './pipe-cascade.js';

export const viewport = { width: 1000, height: 430 } as const;

export function drawGame(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
): void {
  const { player, pipeElapsed } = state;
  const cameraX = Math.max(
    0,
    Math.min(world.width - viewport.width, player.x - 400),
  );
  const shake =
    state.hitElapsed === null
      ? pipeShake(pipeElapsed)
      : Math.cos(state.hitElapsed * 100) *
        7 *
        (1 - state.hitElapsed / passage.fadeOut);
  ctx.fillStyle = '#0d1719';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  ctx.translate(-cameraX, shake);
  ctx.drawImage(
    state.progress === 8
      ? assets.exit
      : state.scenario === 'giant-door'
        ? assets.giantDoor
        : assets.normal,
    0,
    0,
  );
  drawEntry(ctx, state);
  if (state.progress === 8) drawExit(ctx, 780, '→');
  else {
    drawExit(ctx, 44, '←');
    drawExit(ctx, world.width - 44, '→');
  }

  ctx.fillStyle = '#050d1080';
  ctx.beginPath();
  ctx.ellipse(player.x, world.ground + 2, 22, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const image = assets.frames.get(frame.localPath);
  if (image) {
    ctx.save();
    ctx.translate(player.x, player.y);
    // 원본 모험가 프레임은 왼쪽을 바라본다.
    ctx.scale(-player.facing * 1.3, 1.3);
    if (player.flashRemaining > 0) {
      for (const distance of [26, 52, 78]) {
        ctx.globalAlpha = 0.22 * (1 - distance / 100);
        ctx.drawImage(
          image,
          distance - frame.pivot.x,
          -(frame.height - frame.pivot.y),
        );
      }
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(image, -frame.pivot.x, -(frame.height - frame.pivot.y));
    ctx.restore();
  }
  // 정상 방에도 같은 배관을 배치하고, 낙하가 시작되어야 차이가 드러나게 한다.
  for (const pipe of pipes) {
    const fall = pipeFall(pipeElapsed, pipe.delay);
    ctx.drawImage(
      assets.pipe,
      pipe.x - pipe.width / 2,
      pipeShape.top + pipeShape.travel * fall,
      pipe.width,
      pipeShape.height,
    );
  }
  ctx.restore();

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

function drawEntry(ctx: CanvasRenderingContext2D, state: GameSnapshot): void {
  const glitch = state.failureElapsed;
  const pulse = glitch === null ? 0 : Math.floor(glitch * 35);
  const offset =
    glitch === null
      ? 0
      : Math.sin(pulse * 4.7) * 7 * (1 - glitch / passage.glitch);
  ctx.save();
  ctx.fillStyle = '#081311';
  ctx.fillRect(149, 57, 108, 75);
  ctx.strokeStyle = '#56675d';
  ctx.strokeRect(149.5, 57.5, 107, 74);
  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#9bac9c';
  ctx.fillText(state.progress === 8 ? 'EXIT →' : 'SECTOR C-2', 203, 73);
  ctx.font = 'bold 46px monospace';
  ctx.shadowColor = '#adcfad';
  ctx.shadowBlur = 7;
  ctx.fillStyle = glitch !== null && pulse % 3 === 0 ? '#627a73' : '#c4d4b7';
  const digit =
    glitch === null || glitch > 0.7
      ? String(state.progress)
      : pulse % 4 === 0
        ? '—'
        : String(state.previousRoom);
  ctx.fillText(digit, 203 + offset, 119);
  ctx.shadowBlur = 0;
  if (glitch !== null) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(150, 78, 106, 49);
    ctx.clip();
    for (let line = 0; line < 6; line++) {
      ctx.fillStyle = line % 2 ? '#c2d4c17c' : '#081311';
      ctx.fillRect(
        151 + Math.sin(pulse + line) * 25,
        80 + ((pulse * 11 + line * 17) % 46),
        80,
        line % 2 ? 1 : 4,
      );
    }
    ctx.restore();
  }
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
