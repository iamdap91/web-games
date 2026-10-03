import {
  cameraPosition,
  stagePanelViews,
  panelWidth,
} from './spatial-rules.js';
import type { GameAssets } from './assets.js';
import { world, type GameSnapshot } from './game.js';
import { pipes, pipeFall, pipeShape } from './pipe-cascade.js';
import { ceiling, ceilingHeight, smooth } from './event-rules.js';
import {
  drawMachine,
  drawBlackoutChamber,
  drawInvasion,
} from './chamber-renderer.js';

export function drawAnomalyBackground(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const { scenario, anomaly } = state;
  if (scenario === 'folding-stage') {
    drawBackstage(ctx, assets, state);
    return;
  }
  ctx.drawImage(
    state.progress === 8
      ? assets.exit
      : ['empty-center', 'room-invasion', 'blackout', 'watching-eye'].includes(
            scenario,
          )
        ? assets.emptyCenter
        : assets.normal,
    0,
    0,
  );
  if (scenario === 'mirrored-lab') {
    ctx.drawImage(assets.normal, 0, 340, 2400, 90, 0, -90, 2400, 90);
    ctx.fillStyle = '#34423c';
    ctx.fillRect(0, -4, world.width, 4);
  }
  if (scenario === 'creeping-machine')
    drawMachine(
      ctx,
      assets,
      anomaly.machineX,
      1,
      anomaly.machineLean,
      anomaly.machineStride,
    );
  if (scenario === 'blackout') drawBlackoutChamber(ctx, assets, state);
  if (scenario === 'watching-eye') drawEye(ctx, state);
  if (scenario === 'room-invasion') drawInvasion(ctx, assets, state);
}

export function drawAnomalyPipes(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  if (state.scenario === 'folding-stage') return;
  for (const pipe of pipes) {
    const fall = pipeFall(state.pipeElapsed, pipe.delay);
    ctx.drawImage(
      assets.pipe,
      pipe.x - pipe.width / 2,
      pipeShape.top + pipeShape.travel * fall,
      pipe.width,
      pipeShape.height,
    );
  }
}

export function drawCeiling(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  if (state.scenario !== 'lowering-ceiling') return;
  const drop = ceilingHeight(state.player.x, state.anomaly.ceilingSlam);
  const slam = state.anomaly.ceilingSlam;
  const shake =
    slam === null ? (Math.sin(state.anomaly.elapsed * 21) * drop) / 150 : 0;
  ctx.save();
  ctx.translate(0, shake);
  ctx.fillStyle = '#0e171b';
  ctx.fillRect(ceiling.edge, 0, world.width - ceiling.edge, drop);
  ctx.drawImage(
    assets.normal,
    ceiling.edge,
    0,
    world.width - ceiling.edge,
    48,
    ceiling.edge,
    drop,
    world.width - ceiling.edge,
    48,
  );
  for (let x = ceiling.edge; x < world.width; x += 180) {
    ctx.fillStyle = '#2c3b3a';
    ctx.fillRect(x, 0, 12, drop);
    ctx.strokeStyle = '#090f12';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 6, 0);
    ctx.lineTo(x + 100, drop);
    ctx.stroke();
  }
  ctx.fillStyle = '#050b0ee0';
  ctx.fillRect(ceiling.edge, drop + 40, world.width - ceiling.edge, 8);
  const shadow = ctx.createLinearGradient(0, drop + 48, 0, 340);
  shadow.addColorStop(0, '#02050890');
  shadow.addColorStop(1, '#02050800');
  if (drop + 48 < 340) {
    ctx.fillStyle = shadow;
    ctx.fillRect(
      ceiling.edge,
      drop + 48,
      world.width - ceiling.edge,
      340 - drop - 48,
    );
  }
  ctx.restore();
}

export function drawBlackout(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
): void {
  const time = state.anomaly.activeElapsed;
  if (state.scenario !== 'blackout' || time === null || time > 0.65) return;
  const opacity =
    time < 0.1 ? time / 0.1 : time < 0.4 ? 1 : 1 - (time - 0.4) / 0.25;
  ctx.fillStyle = `rgb(0 0 0 / ${opacity})`;
  ctx.fillRect(0, 0, 1000, 430);
}

function drawEye(ctx: CanvasRenderingContext2D, state: GameSnapshot): void {
  const time = state.anomaly.activeElapsed;
  const opening = smooth((time ?? 0) / 1.1);
  const approach =
    smooth((state.player.x - 950) / 400) * smooth(((time ?? 0) - 0.8) / 1.2);
  const x = 950,
    y = 100,
    w = 330,
    h = 200;
  ctx.save();
  ctx.fillStyle = '#101c21';
  ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
  ctx.strokeStyle = '#586760';
  ctx.lineWidth = 7;
  ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
  for (const bx of [x - 7, x + w + 7])
    for (const by of [y - 7, y + h + 7]) {
      ctx.fillStyle = '#8b9986';
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#04090c';
  ctx.fillRect(x, y, w, h);
  if (opening > 0) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    const size = 1 + approach * 1.5;
    ctx.scale(size, size);
    ctx.beginPath();
    ctx.moveTo(-153, 0);
    ctx.bezierCurveTo(-90, -100 * opening, 85, -100 * opening, 153, 0);
    ctx.bezierCurveTo(85, 90 * opening, -90, 90 * opening, -153, 0);
    ctx.clip();
    const sclera = ctx.createRadialGradient(-20, -5, 15, 0, 0, 155);
    sclera.addColorStop(0, '#b8b99e');
    sclera.addColorStop(0.65, '#72796a');
    sclera.addColorStop(1, '#242a27');
    ctx.fillStyle = sclera;
    ctx.fillRect(-160, -100, 320, 200);
    ctx.strokeStyle = '#594139aa';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 150, Math.sin(a) * 90);
      ctx.lineTo(Math.cos(a + 0.08) * 104, Math.sin(a + 0.08) * 58);
      ctx.lineTo(Math.cos(a - 0.04) * 78, Math.sin(a - 0.04) * 44);
      ctx.stroke();
    }
    const gaze = Math.max(-54, Math.min(54, (state.player.x - 1115) * 0.13));
    ctx.translate(gaze, 0);
    const iris = ctx.createRadialGradient(0, 0, 8, 0, 0, 48);
    iris.addColorStop(0, '#8b8650');
    iris.addColorStop(0.5, '#576752');
    iris.addColorStop(1, '#15231f');
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b3ad644d';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.lineTo(Math.cos(a + 0.03) * 45, Math.sin(a + 0.03) * 45);
      ctx.stroke();
    }
    ctx.fillStyle = '#020607';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 - approach * 7, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e1e8ca9c';
    ctx.beginPath();
    ctx.ellipse(-16, -17, 6, 9, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const reflection = ctx.createLinearGradient(x, y, x + w, y + h);
  reflection.addColorStop(0, '#90c5c218');
  reflection.addColorStop(0.4, '#b3d0c52b');
  reflection.addColorStop(0.43, '#09121800');
  reflection.addColorStop(1, '#02070b55');
  ctx.fillStyle = reflection;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#101c21';
  ctx.fillRect(x + w / 2 - 3, y, 6, h);
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
