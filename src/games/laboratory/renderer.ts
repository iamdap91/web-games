import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import type { GameAssets } from './assets.js';
import { pipeX, world, type GameSnapshot } from './game.js';

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
    pipeElapsed !== null && pipeElapsed < 0.32
      ? Math.sin(pipeElapsed * 100) * 5 * (1 - pipeElapsed / 0.32)
      : 0;
  ctx.fillStyle = '#0d1719';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  ctx.translate(-cameraX, shake);
  ctx.drawImage(
    state.scenario === 'giant-door' ? assets.giantDoor : assets.normal,
    0,
    0,
  );
  drawExit(ctx, 44, '←', '이상 있음');
  drawExit(ctx, world.width - 44, '→', '이상 없음');

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
  // 정상일 때의 짧은 배관도 같은 자리에 있어 출현 자체가 단서가 되지 않는다.
  const fall =
    pipeElapsed === null ? 0 : Math.min(1, (pipeElapsed / 0.18) ** 2);
  ctx.drawImage(assets.pipe, pipeX - 34, -190 + 225 * fall, 68, 300);
  ctx.restore();

  const shade = ctx.createRadialGradient(500, 230, 130, 500, 215, 550);
  shade.addColorStop(0, '#07141600');
  shade.addColorStop(1, '#030a0c80');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawExit(
  ctx: CanvasRenderingContext2D,
  x: number,
  arrow: string,
  label: string,
): void {
  ctx.fillStyle = '#9fae9d';
  ctx.textAlign = 'center';
  ctx.font = '28px sans-serif';
  ctx.fillText(arrow, x, 243);
  ctx.font = '12px sans-serif';
  ctx.fillText(label, x, 267);
  ctx.fillStyle = '#9fae9d35';
  ctx.fillRect(x - 1, 280, 2, 60);
}
