import type { GameSnapshot } from './game.js';
import {
  intruderHand,
  intruderScare,
  intruderTurn,
  type Point,
} from './door-intruder.js';
import { clamp, smooth } from './event-rules.js';
import { drawIntruderHand } from './intruder-hands.js';
import { roomCameraPosition } from './spatial-rules.js';

type HandPose = {
  readonly origin: Point;
  readonly center: Point;
  readonly scale: number;
  readonly angle: number;
  readonly facing: number;
  readonly curl: number;
};

function drawReachingArm(ctx: CanvasRenderingContext2D, pose: HandPose): void {
  const wrist = {
    x: pose.center.x - Math.sin(pose.angle) * 18 * pose.scale * pose.facing,
    y: pose.center.y + Math.cos(pose.angle) * 18 * pose.scale,
  };
  const width = 10 * pose.scale;
  const middleY = (pose.origin.y + wrist.y) / 2 + 25;
  ctx.fillStyle = '#172a22';
  ctx.beginPath();
  ctx.moveTo(pose.origin.x - 7, pose.origin.y);
  ctx.bezierCurveTo(
    pose.origin.x - 20,
    middleY,
    wrist.x - width * 0.7,
    wrist.y + width,
    wrist.x - width,
    wrist.y,
  );
  ctx.lineTo(wrist.x + width, wrist.y);
  ctx.bezierCurveTo(
    wrist.x + width * 0.7,
    wrist.y + width,
    pose.origin.x + 20,
    middleY,
    pose.origin.x + 7,
    pose.origin.y,
  );
  ctx.closePath();
  const skin = ctx.createLinearGradient(wrist.x - width, 0, wrist.x + width, 0);
  skin.addColorStop(0, '#253a2e');
  skin.addColorStop(0.3, '#89947b');
  skin.addColorStop(0.6, '#526a52');
  skin.addColorStop(1, '#14251e');
  ctx.fillStyle = skin;
  ctx.fill();
}

function handLayer(
  ctx: CanvasRenderingContext2D,
  pose: HandPose,
  front: number | null,
): void {
  if (front === 0) return;
  ctx.save();
  if (front === null) drawReachingArm(ctx, pose);
  ctx.translate(pose.center.x, pose.center.y);
  ctx.scale(pose.facing * pose.scale, pose.scale);
  ctx.rotate(pose.angle);
  if (front !== null) {
    // 같은 손의 손끝부터 선 앞으로 넘긴다. 팔은 끝까지 선 뒤에 이어진다.
    ctx.beginPath();
    ctx.rect(-95, -100, 190, 150 * front);
    ctx.clip();
  }
  drawIntruderHand(ctx, { x: 0, y: 0 }, 0, pose.curl);
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
    // 방 전환의 암전과 색을 맞춰 리셋 직전에 원래 화면이 다시 드러나지 않게 한다.
    ctx.fillStyle = '#050a0c';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }
  const progress = clamp(
    (time - intruderScare.hand) / intruderScare.handDuration,
  );
  const reach = progress ** 2;
  const hand = intruderHand(state.intruder);
  const origin = { x: hand.x - roomCameraPosition(state), y: hand.y };
  const pose: HandPose = {
    origin,
    center: {
      x: origin.x + (width * 0.51 - origin.x) * smooth(progress),
      y: origin.y + (height * 0.74 - origin.y) * reach,
    },
    scale: 1 + reach * (width / 118 - 1),
    angle: -1.15 + smooth(progress) * 1.03,
    facing: 1 - intruderTurn(state.intruder) * 2,
    // 잡았던 손을 펴서 다가온 뒤 마지막에 손가락만 조금 구부린다.
    curl: 1 - smooth(progress / 0.28) + smooth((progress - 0.76) / 0.24) * 0.22,
  };
  ctx.fillStyle = `rgb(2 8 7 / ${smooth((time - 0.9) / 0.25) * 0.14 + reach * 0.55})`;
  ctx.fillRect(0, 0, width, height);
  const handOpacity = smooth((time - intruderScare.hand) / 0.045);
  ctx.save();
  ctx.globalAlpha *= handOpacity;
  handLayer(ctx, pose, null);
  ctx.restore();

  // 두 선은 고정하고 하나의 손만 뒤에서 앞으로 가림 순서를 바꾼다.
  ctx.save();
  ctx.globalAlpha *= smooth((time - intruderScare.bars) / 0.28);
  for (const x of [width * 0.3, width * 0.7]) {
    ctx.fillStyle = '#020706';
    ctx.fillRect(x - 4.5, 0, 9, height);
    ctx.fillStyle = '#a8b6ad';
    ctx.fillRect(x - 3, 0, 6, height);
    ctx.fillStyle = '#d2d7c5';
    ctx.fillRect(x - 2.5, 0, 1, height);
  }
  ctx.restore();
  ctx.globalAlpha *= handOpacity;
  handLayer(ctx, pose, smooth((progress - 0.28) / 0.6));
  ctx.restore();
}
