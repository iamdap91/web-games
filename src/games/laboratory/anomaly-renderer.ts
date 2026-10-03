import {
  cameraPosition,
  stagePanelViews,
  panelWidth,
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
  const start = state.anomaly.backstageReturning ? 0 : 800;
  ctx.fillRect(start, 0, world.width - start, world.ground);
  for (let x = start + 20; x < 2400; x += 260) {
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
  if (!state.anomaly.backstageReturning)
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
  ctx.fillRect(start, 340, world.width - start, 90);
  for (let x = 850; x < 2400; x += 130) {
    ctx.fillStyle = '#82927a36';
    ctx.fillRect(x, 347, 33, 2);
  }
  drawBackstageDoor(
    ctx,
    assets,
    state.progress,
    1990,
    state.anomaly.backstageDoorOpen,
  );
  if (state.anomaly.backstageReturning)
    drawBackstageDoor(
      ctx,
      assets,
      state.progress,
      110,
      state.anomaly.returnDoorOpen,
    );
  const camera = cameraPosition(state.player.x);
  for (const view of stagePanelViews(state)) {
    if (!view.visible) continue;
    const x = view.x + (view.reverse ? panelWidth : 0);
    const direction = view.reverse ? -1 : 1;
    const angle = (view.angle * Math.PI) / 180;
    const depth = -Math.sin(angle) * panelWidth * direction;
    const edge =
      ((x - camera + Math.cos(angle) * panelWidth * direction - 500) * 1100) /
        (1100 - depth) +
      500 +
      camera;
    // 회전한 벽의 끝을 잡아 주는 케이블은 열릴수록 처짐이 줄어든다.
    const tension = Math.min(1, Math.abs(angle) / 1.8);
    ctx.strokeStyle = '#6c776455';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + direction * 210, 32);
    ctx.quadraticCurveTo(
      (x + direction * 210 + edge) / 2,
      150 - tension * 102,
      edge,
      42,
    );
    ctx.stroke();
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

function drawBackstageDoor(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  progress: number,
  x: number,
  open: number,
): void {
  const y = 106;
  const width = 170;
  const height = 234;
  ctx.save();
  // 문과 실내는 회전하는 벽보다 뒤에 남아, 앞면이 닫히면 완전히 가려진다.
  ctx.fillStyle = '#050b0d';
  ctx.fillRect(x - 10, y - 10, width + 20, height + 10);
  ctx.strokeStyle = '#637168';
  ctx.lineWidth = 5;
  ctx.strokeRect(x - 5, y - 5, width + 10, height + 5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(assets.normal, 60, 25, 370, 405, x, y, width, height);
  // 문틈 속 번호도 지금 방의 번호다. 얇은 벽 뒤에 출발점이 존재한다.
  ctx.fillStyle = '#081311';
  ctx.fillRect(x + 41, y + 18, 50, 43);
  ctx.strokeStyle = '#80937d';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 41, y + 18, 50, 43);
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e2efc1';
  ctx.shadowColor = '#d8e9b9';
  ctx.shadowBlur = 8;
  ctx.fillText(String(progress), x + 66, y + 51);
  ctx.shadowBlur = 0;
  const innerShade = ctx.createLinearGradient(x, 0, x + width, 0);
  innerShade.addColorStop(0, '#08100b20');
  innerShade.addColorStop(1, '#030706bb');
  ctx.fillStyle = innerShade;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
  // 오른쪽 경첩에서 안으로 열리며 왼쪽 틈에 입구를 드러낸다.
  const leafWidth = width * (1 - open * 0.63);
  const lip = open * 15;
  ctx.fillStyle = '#283832';
  ctx.beginPath();
  ctx.moveTo(x + width - leafWidth, y + lip);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width - leafWidth, y + height - lip);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#66715a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0c1817';
  ctx.fillRect(x + width - leafWidth + 8, y + height * 0.6, 4, 19);
  ctx.strokeStyle = '#8e9874';
  ctx.beginPath();
  ctx.moveTo(x + width - leafWidth + 10, y + height * 0.6 + 3);
  ctx.lineTo(x + width - leafWidth + 23, y + height * 0.6 + 3);
  ctx.stroke();
  if (open > 0) {
    const light = ctx.createLinearGradient(0, 335, 0, 400);
    light.addColorStop(0, `rgb(220 233 166 / ${open * 0.38})`);
    light.addColorStop(1, '#e4eab400');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, 339);
    ctx.lineTo(x + width - leafWidth, 339);
    ctx.lineTo(x + width - leafWidth + 24, 402);
    ctx.lineTo(x - 140 * open, 402);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgb(233 242 186 / ${open * 0.75})`;
    ctx.fillRect(x, 338, width - leafWidth, 2);
  }
  ctx.restore();
}
