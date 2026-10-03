import type { GameSnapshot } from './game.js';
import {
  intruderHand,
  intruderScare,
  intruderTurn,
  type Point,
} from './door-intruder.js';
import { clamp, smooth } from './event-rules.js';
import {
  createScareHand,
  drawScareHand,
  type ScareHand,
} from './intruder-scare-hand.js';
import { roomCameraPosition } from './spatial-rules.js';

function drawReachingArm(
  ctx: CanvasRenderingContext2D,
  origin: Point,
  hand: ScareHand,
): void {
  const wrist = hand.wrist;
  const [edgeA, edgeB] = hand.wristEdges;
  const dx = wrist.x - origin.x;
  const dy = wrist.y - origin.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const width = Math.max(
    1,
    Math.hypot(edgeB.x - edgeA.x, edgeB.y - edgeA.y) / 2,
  );
  const across = {
    x: (edgeB.x - edgeA.x) / (width * 2),
    y: (edgeB.y - edgeA.y) / (width * 2),
  };
  // 손목 방향에 접선을 맞추고 팔 곡선의 수직 방향으로 두께를 유지한다.
  const turn = -across.y * dx + across.x * dy >= 0 ? 1 : -1;
  const tangent = { x: -across.y * turn, y: across.x * turn };
  const bend = Math.min(72, length * 0.28);
  const controlA = {
    x: origin.x + dx * 0.35,
    y: origin.y + dy * 0.35 + Math.min(20, length * 0.08),
  };
  const controlB = {
    x: wrist.x - tangent.x * bend,
    y: wrist.y - tangent.y * bend,
  };
  const near: Point[] = [];
  const far: Point[] = [];
  const rootWidth = Math.max(10, Math.min(18, width * 0.6));
  const muscle = Math.min(28, Math.max(12, length * 0.07));
  const orientation = -turn;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const u = 1 - t;
    const center = {
      x:
        u ** 3 * origin.x +
        3 * u * u * t * controlA.x +
        3 * u * t * t * controlB.x +
        t ** 3 * wrist.x,
      y:
        u ** 3 * origin.y +
        3 * u * u * t * controlA.y +
        3 * u * t * t * controlB.y +
        t ** 3 * wrist.y,
    };
    const velocity = {
      x:
        3 * u * u * (controlA.x - origin.x) +
        6 * u * t * (controlB.x - controlA.x) +
        3 * t * t * (wrist.x - controlB.x),
      y:
        3 * u * u * (controlA.y - origin.y) +
        6 * u * t * (controlB.y - controlA.y) +
        3 * t * t * (wrist.y - controlB.y),
    };
    const speed = Math.hypot(velocity.x, velocity.y);
    const normal =
      speed > 0.001
        ? {
            x: (-velocity.y / speed) * orientation,
            y: (velocity.x / speed) * orientation,
          }
        : across;
    const radius =
      rootWidth +
      (width - rootWidth) * smooth(t) +
      Math.sin(Math.PI * t) * muscle;
    near.push({
      x: center.x + normal.x * radius,
      y: center.y + normal.y * radius,
    });
    far.push({
      x: center.x - normal.x * radius,
      y: center.y - normal.y * radius,
    });
  }
  // 손바닥 윤곽의 실제 양 끝까지 이어 붙인다.
  near[20] = edgeB;
  far[20] = edgeA;
  ctx.beginPath();
  ctx.moveTo(near[0]!.x, near[0]!.y);
  for (const point of near.slice(1)) ctx.lineTo(point.x, point.y);
  for (const point of far.reverse()) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  const middle = { x: (origin.x + wrist.x) / 2, y: (origin.y + wrist.y) / 2 };
  const normal = { x: -dy / length, y: dx / length };
  const thickness = (rootWidth + width) / 2 + muscle;
  const skin = ctx.createLinearGradient(
    middle.x - normal.x * thickness,
    middle.y - normal.y * thickness,
    middle.x + normal.x * thickness,
    middle.y + normal.y * thickness,
  );
  skin.addColorStop(0, '#253a2e');
  skin.addColorStop(0.3, '#89947b');
  skin.addColorStop(0.6, '#526a52');
  skin.addColorStop(1, '#14251e');
  ctx.fillStyle = skin;
  ctx.fill();
}

function drawDepthBars(
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.globalAlpha *= smooth((time - intruderScare.bars) / 0.28);
  for (const x of [width * 0.3, width * 0.7]) {
    ctx.fillStyle = '#020706';
    ctx.fillRect(x - 5, 0, 10, height);
    ctx.fillStyle = '#b0bcb2';
    ctx.fillRect(x - 3.5, 0, 7, height);
    ctx.fillStyle = '#d2d7c5';
    ctx.fillRect(x - 3, 0, 1, height);
  }
  ctx.restore();
}

export function drawIntruderScare(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
  width: number,
  height: number,
): void {
  const time = state.intruder.caughtElapsed;
  if (time === null) return;
  ctx.save();
  if (time >= intruderScare.blackout) {
    // 방 전환과 같은 암전을 유지해 리셋 직전에 방이 다시 드러나지 않게 한다.
    ctx.fillStyle = '#050a0c';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }
  if (time < intruderScare.hand) {
    drawDepthBars(ctx, time, width, height);
    ctx.restore();
    return;
  }
  const prepare = smooth(
    (time - intruderScare.hand) / (intruderScare.poised - intruderScare.hand),
  );
  const crossing = smooth(
    (time - intruderScare.crossing) /
      (intruderScare.lunge - intruderScare.crossing),
  );
  const lunge =
    clamp((time - intruderScare.lunge) / intruderScare.lungeDuration) ** 2;
  const grip = intruderHand(state.intruder);
  const origin = { x: grip.x - roomCameraPosition(state), y: grip.y };
  const direction = origin.x < width / 2 ? 1 : -1;
  const facing = 1 - intruderTurn(state.intruder) * 2;
  const barX = width * (direction === 1 ? 0.3 : 0.7);
  const poised = { x: barX + direction * 12, y: height * 0.47 };
  const crossed = { x: barX + direction * 50, y: height * 0.59 };
  const target = { x: width * 0.5 + direction * 105, y: height * 0.7 };
  // 한쪽 선에 가려진 자세로 멈춘 뒤, 반대쪽 아래를 향해 사선으로 뻗는다.
  const center = {
    x:
      origin.x +
      (poised.x - origin.x) * prepare +
      (crossed.x - poised.x) * crossing +
      (target.x - crossed.x) * lunge,
    y:
      origin.y +
      (poised.y - origin.y) * prepare +
      (crossed.y - poised.y) * crossing +
      (target.y - crossed.y) * lunge,
  };
  const hand = createScareHand({
    center,
    angle:
      -1.15 +
      (direction * facing * 0.55 + 1.15) * prepare +
      direction * facing * crossing * 0.2,
    pitch: prepare * 0.62 + crossing * 0.17 + lunge * 0.1,
    yaw: -direction * facing * prepare * 0.45 * (1 - crossing * 0.7),
    depth: -220 + crossing * 460 + lunge * 165,
    wristLag: crossing * 85 + lunge * 55,
    curl: 1 - prepare * 0.98 + smooth(lunge) * 0.68,
    facing,
    size: 1.42,
  });
  ctx.fillStyle = `rgb(2 8 7 / ${prepare * 0.12 + crossing * 0.2 + lunge * 0.15})`;
  ctx.fillRect(0, 0, width, height);
  const handOpacity = smooth((time - intruderScare.hand) / 0.045);
  ctx.save();
  ctx.globalAlpha *= handOpacity;
  drawReachingArm(ctx, origin, hand);
  drawScareHand(ctx, hand, false);
  ctx.restore();
  drawDepthBars(ctx, time, width, height);
  ctx.globalAlpha *= handOpacity;
  drawScareHand(ctx, hand, true);
  ctx.restore();
}
