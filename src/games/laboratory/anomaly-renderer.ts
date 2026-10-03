import {
  cameraPosition,
  panelAngle,
  panelWidth,
  stagePanels,
} from './spatial-rules.js';
import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import type { GameAssets } from './assets.js';
import { world, type GameSnapshot } from './game.js';
import { pipes, pipeFall, pipeShape } from './pipe-cascade.js';

export function drawAnomalyBackground(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const { scenario, player, anomaly } = state;
  if (scenario === 'folding-stage') {
    drawBackstage(ctx, assets, state);
    return;
  }
  const background =
    state.progress === 8
      ? assets.exit
      : scenario === 'giant-door'
        ? assets.giantDoor
        : ['empty-center', 'following-door'].includes(scenario)
          ? assets.emptyCenter
          : assets.normal;
  ctx.drawImage(background, 0, 0);
  if (scenario === 'upside-down') {
    ctx.save();
    ctx.translate(0, world.ground);
    ctx.scale(1, -1);
    ctx.drawImage(
      background,
      0,
      0,
      world.width,
      world.ground,
      0,
      0,
      world.width,
      world.ground,
    );
    ctx.restore();
  }
  if (scenario === 'crowded-lab') {
    for (let x = 820; x < 2150; x += 105) {
      ctx.drawImage(assets.machine, x, 100, 95, 235);
      ctx.drawImage(assets.machine, x + 15, 25, 65, 90);
    }
  }
  if (scenario === 'following-door')
    ctx.drawImage(assets.door, anomaly.doorX, 140);
  if (scenario === 'creeping-machine')
    ctx.drawImage(assets.machine, anomaly.machineX - 70, 85, 140, 250);
  if (
    scenario === 'blackout' &&
    anomaly.activeElapsed !== null &&
    anomaly.activeElapsed >= 0.28
  ) {
    ctx.drawImage(assets.machine, anomaly.blackoutX - 90, 15, 180, 320);
  }
  if (scenario === 'red-fluid') drawFluid(ctx, anomaly.elapsed);
  if (scenario === 'sealed-exit') drawSealedExit(ctx);
  if (scenario === 'watching-eye') drawEye(ctx, player.x, anomaly.elapsed);
  if (scenario === 'reverse-flow') drawFloorFlow(ctx, anomaly.flowOffset);
  if (scenario === 'lowering-ceiling') {
    const drop = ceilingDrop(player.x);
    ctx.fillStyle = '#111c1e';
    ctx.fillRect(0, 0, world.width, drop);
    ctx.drawImage(
      assets.normal,
      0,
      0,
      world.width,
      48,
      0,
      drop,
      world.width,
      48,
    );
  }
}

function ceilingDrop(x: number): number {
  return Math.max(0, Math.min(210, (x - 600) * 0.15));
}

export function drawAnomalyPipes(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  if (state.scenario === 'folding-stage') return;
  for (const pipe of pipes) {
    const fall = pipeFall(state.pipeElapsed, pipe.delay);
    const y = pipeShape.top + pipeShape.travel * fall;
    if (state.scenario === 'bent-pipes') {
      const bend = Math.max(-90, Math.min(90, (state.player.x - pipe.x) * 0.3));
      // 조각을 가로로 늘리는 대신 얇은 띠를 옮겨 금속 무늬를 유지한다.
      for (let strip = 0; strip < 30; strip++) {
        const ratio = strip / 29;
        ctx.drawImage(
          assets.pipe,
          0,
          (strip * assets.pipe.height) / 30,
          assets.pipe.width,
          assets.pipe.height / 30,
          pipe.x - pipe.width / 2 + bend * ratio ** 2,
          -75 + strip * 10,
          pipe.width,
          11,
        );
      }
    } else if (state.scenario === 'upside-down') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, world.width, world.ground);
      ctx.clip();
      ctx.translate(0, world.ground);
      ctx.scale(1, -1);
      ctx.drawImage(
        assets.pipe,
        pipe.x - pipe.width / 2,
        y,
        pipe.width,
        pipeShape.height,
      );
      ctx.restore();
    } else {
      const drop =
        state.scenario === 'lowering-ceiling' ? ceilingDrop(state.player.x) : 0;
      ctx.save();
      if (state.scenario === 'lowering-ceiling') {
        ctx.beginPath();
        ctx.rect(0, drop + 48, world.width, world.ground - drop - 48);
        ctx.clip();
      }
      ctx.drawImage(
        assets.pipe,
        pipe.x - pipe.width / 2,
        y + drop,
        pipe.width,
        pipeShape.height,
      );
      ctx.restore();
    }
  }
}

export function drawAnomalyFigure(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
): void {
  if (state.scenario !== 'late-shadow' && state.scenario !== 'lingering-echo')
    return;
  const pose =
    state.scenario === 'late-shadow'
      ? state.anomaly.shadow
      : state.anomaly.echo;
  if (!pose) return;
  const echoFrame =
    state.scenario === 'lingering-echo'
      ? (assets.animations.get('jump')?.frames[0] ?? frame)
      : frame;
  const image = assets.frames.get(echoFrame.localPath);
  if (!image) return;
  ctx.save();
  if (state.scenario === 'late-shadow') {
    ctx.translate(pose.x, world.ground + 9);
    ctx.scale(-pose.facing * 1.6, 0.42);
    ctx.filter = 'brightness(0)';
    ctx.globalAlpha = 0.85;
  } else {
    ctx.translate(pose.x, pose.y);
    ctx.scale(-pose.facing * 1.3, 1.3);
    ctx.filter = 'grayscale(1) sepia(0.6)';
    ctx.globalAlpha = 0.65;
  }
  ctx.drawImage(
    image,
    -echoFrame.pivot.x,
    -(echoFrame.height - echoFrame.pivot.y),
  );
  ctx.restore();
}

export function drawBlackout(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
): void {
  const time = state.anomaly.activeElapsed;
  if (state.scenario !== 'blackout' || time === null || time > 0.48) return;
  const opacity =
    time < 0.08 ? time / 0.08 : time < 0.28 ? 1 : 1 - (time - 0.28) / 0.2;
  ctx.fillStyle = `rgb(0 0 0 / ${opacity})`;
  ctx.fillRect(0, 0, 1000, 430);
}

function drawFluid(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  const glow = ctx.createRadialGradient(806, 245, 15, 806, 245, 150);
  glow.addColorStop(0, '#bb102b55');
  glow.addColorStop(1, '#bb102b00');
  ctx.fillStyle = glow;
  ctx.fillRect(650, 90, 310, 310);
  ctx.fillStyle = '#7c0921';
  ctx.fillRect(772, 185, 63, 129);
  ctx.strokeStyle = '#e34249';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const y = 302 - ((time * 35 + i * 19) % 108);
    ctx.beginPath();
    ctx.arc(779 + ((i * 17) % 48), y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#a3122d';
  ctx.lineWidth = 8;
  for (const x of [765, 837]) {
    ctx.beginPath();
    ctx.moveTo(x, 185);
    ctx.bezierCurveTo(x - 18, 220, x + 20, 275, x, 339);
    ctx.stroke();
  }
  ctx.fillStyle = '#7c0921';
  ctx.beginPath();
  ctx.ellipse(806, 339, 100 + Math.sin(time * 2) * 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSealedExit(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = '#313c42';
  ctx.fillRect(2155, 132, 176, 208);
  ctx.strokeStyle = '#687978';
  ctx.lineWidth = 4;
  ctx.strokeRect(2155, 132, 176, 208);
  ctx.strokeStyle = '#0c191d';
  ctx.lineWidth = 18;
  for (const [from, to] of [
    [
      [2165, 145],
      [2320, 326],
    ],
    [
      [2320, 145],
      [2165, 326],
    ],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  }
  for (const x of [2165, 2321])
    for (const y of [143, 329]) {
      ctx.fillStyle = '#a1ad9c';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  ctx.restore();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  time: number,
): void {
  ctx.save();
  ctx.fillStyle = '#172126';
  ctx.fillRect(957, 110, 315, 181);
  ctx.strokeStyle = '#64736b';
  ctx.lineWidth = 9;
  ctx.strokeRect(957, 110, 315, 181);
  ctx.beginPath();
  ctx.ellipse(1114, 199, 136, 67, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#c7cab1';
  ctx.fillRect(978, 131, 274, 136);
  ctx.strokeStyle = '#873e3970';
  ctx.lineWidth = 2;
  for (let i = 0; i < 11; i++) {
    ctx.beginPath();
    ctx.moveTo(980 + i * 27, 133);
    ctx.lineTo(995 + i * 24, 172 + (i % 3) * 23);
    ctx.lineTo(986 + i * 25, 266);
    ctx.stroke();
  }
  const x = 1114 + Math.max(-75, Math.min(75, (playerX - 1114) * 0.15));
  ctx.fillStyle = '#516557';
  ctx.beginPath();
  ctx.arc(x, 199, 51, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#040b0c';
  ctx.beginPath();
  ctx.ellipse(x, 199, 17 + Math.sin(time) * 2, 43, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f4cd';
  ctx.fillRect(x - 16, 178, 9, 9);
  ctx.restore();
}

function drawFloorFlow(ctx: CanvasRenderingContext2D, offset: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 354, world.width, 65);
  ctx.clip();
  ctx.fillStyle = '#214e4ee0';
  ctx.fillRect(0, 354, world.width, 65);
  ctx.strokeStyle = '#9fbfa68c';
  ctx.lineWidth = 4;
  for (let x = -160; x < world.width + 160; x += 110) {
    const position = x + (offset % 110);
    ctx.beginPath();
    ctx.moveTo(position, 354);
    ctx.lineTo(position - 50, 419);
    ctx.stroke();
  }
  ctx.strokeStyle = '#a9c1a9';
  ctx.lineWidth = 2;
  for (const y of [357, 415]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackstage(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  ctx.fillStyle = '#060c0f';
  ctx.fillRect(0, 0, world.width, world.ground);
  const glow = ctx.createLinearGradient(0, 45, 0, world.ground);
  glow.addColorStop(0, '#0a151a');
  glow.addColorStop(1, '#27372e');
  ctx.fillStyle = glow;
  ctx.fillRect(800, 0, 1600, world.ground);
  for (let x = 820; x < 2400; x += 260) {
    ctx.fillStyle = '#14252a';
    ctx.fillRect(x, 0, 10, 340);
    ctx.strokeStyle = '#304039';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 250, 330);
    ctx.stroke();
    ctx.strokeStyle = '#050b0c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 70, 0);
    ctx.bezierCurveTo(x + 160, 90, x - 15, 180, x + 100, 285);
    ctx.stroke();
  }
  ctx.drawImage(
    assets.normal,
    0,
    0,
    800,
    world.ground,
    0,
    0,
    800,
    world.ground,
  );
  ctx.drawImage(
    assets.normal,
    0,
    world.ground,
    world.width,
    90,
    0,
    world.ground,
    world.width,
    90,
  );
  ctx.fillStyle = '#17221e80';
  ctx.fillRect(800, 340, 1600, 90);
  for (let x = 850; x < 2400; x += 130) {
    ctx.fillStyle = '#82927a36';
    ctx.fillRect(x, 347, 33, 2);
  }
  const camera = cameraPosition(state.player.x);
  for (const [index, x] of stagePanels.entries()) {
    const angle = (panelAngle(state.player.x, index) * Math.PI) / 180;
    const depth = -Math.sin(angle) * panelWidth;
    const edge =
      ((x - camera + Math.cos(angle) * panelWidth - 500) * 1100) /
        (1100 - depth) +
      500 +
      camera;
    ctx.fillStyle = '#00000070';
    ctx.beginPath();
    ctx.moveTo(x, 340);
    ctx.lineTo(edge, 340);
    ctx.lineTo(edge + depth * 0.08, 350);
    ctx.lineTo(x + 8, 344);
    ctx.closePath();
    ctx.fill();
  }
}
