import type { GameSnapshot } from './game.js';
import {
  intruderPivotX,
  intruderReveal,
  intruderScare,
  intruderTiming,
  intruderTurn,
  type Point,
} from './door-intruder.js';
import { clamp, smooth } from './event-rules.js';
import { drawIntruderHand } from './intruder-hands.js';
import { roomCameraPosition } from './spatial-rules.js';

type FacePose = {
  readonly center: Point;
  readonly scale: number;
  readonly tilt: number;
  readonly lunge: number;
};

// 원래 얼굴의 봉합선과 비대칭을 유지하되, 정면의 눈·광대·턱을 따로 그린다.
function drawFace(ctx: CanvasRenderingContext2D, lunge: number): void {
  const jaw = 7 + lunge * 22;
  const skin = ctx.createRadialGradient(-17, -22, 3, 0, 2, 77);
  skin.addColorStop(0, '#bec0a7');
  skin.addColorStop(0.32, '#899380');
  skin.addColorStop(0.66, '#43574b');
  skin.addColorStop(1, '#111e1c');
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#17231f';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-7, -64);
  ctx.bezierCurveTo(-34, -68, -54, -41, -47, -9);
  ctx.bezierCurveTo(-44, 13, -28, 22, -19, 47 + jaw);
  ctx.quadraticCurveTo(-2, 68 + jaw, 14, 46 + jaw);
  ctx.bezierCurveTo(23, 19, 43, 15, 46, -15);
  ctx.bezierCurveTo(52, -47, 25, -68, -7, -64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // 가까워져도 얼룩이 피부에 붙어 있도록 매 프레임 같은 좌표를 쓴다.
  for (let i = 0; i < 85; i++) {
    const x = Math.sin(i * 137.2) * 49;
    const y = -60 + ((i * 43) % 133);
    ctx.fillStyle = i % 3 === 0 ? '#162d2552' : '#d0ceac25';
    ctx.beginPath();
    ctx.ellipse(x, y, 0.6 + (i % 3), 0.4 + (i % 2), i, 0, Math.PI * 2);
    ctx.fill();
  }
  // 광대와 뺨의 깊이는 굵은 윤곽선 대신 안쪽 그늘로 표현한다.
  for (const side of [-1, 1]) {
    const hollow = ctx.createRadialGradient(
      side * 30,
      14,
      2,
      side * 30,
      14,
      24,
    );
    hollow.addColorStop(0, '#102920d9');
    hollow.addColorStop(1, '#203c2900');
    ctx.fillStyle = hollow;
    ctx.fillRect(side * 30 - 24, -10, 48, 60);
  }
  ctx.restore();

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 22, side < 0 ? -18 : -14);
    ctx.rotate(side * 0.16);
    ctx.scale(side, 1);
    ctx.fillStyle = '#06110e';
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.bezierCurveTo(-4, -15 - lunge * 3, 12, -10, 17, 0);
    ctx.bezierCurveTo(8, 14 + lunge * 5, -9, 10, -15, -5);
    ctx.fill();
    // 눈구멍 깊숙이 정면을 향한 좁은 흰자와 동공이 드러난다.
    ctx.fillStyle = '#c4c7af';
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(0, -5 - lunge * 3, 10, 0);
    ctx.quadraticCurveTo(3, 7 + lunge * 2, -9, 0);
    ctx.fill();
    ctx.fillStyle = '#060d0b';
    ctx.beginPath();
    ctx.ellipse(1, 1, 2.7, 5 + lunge, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e1e2c6';
    ctx.fillRect(-0.5, -1.2, 0.8, 0.8);
    ctx.strokeStyle = '#263c2fc9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.quadraticCurveTo(0, -18, 17, -5);
    ctx.moveTo(-10, 13);
    ctx.quadraticCurveTo(0, 17, 13, 10);
    ctx.stroke();
    ctx.restore();
  }

  const nose = ctx.createLinearGradient(-8, 0, 8, 0);
  nose.addColorStop(0, '#172c2280');
  nose.addColorStop(0.5, '#a9ae9080');
  nose.addColorStop(1, '#1a302bcc');
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(-10, 11);
  ctx.quadraticCurveTo(-1, 17, 7, 10);
  ctx.lineTo(1, -17);
  ctx.fill();

  ctx.fillStyle = '#040a08';
  ctx.beginPath();
  ctx.moveTo(-9, 23);
  ctx.bezierCurveTo(-14 - lunge * 6, 28, -10, 43 + jaw, 0, 49 + jaw);
  ctx.bezierCurveTo(12, 43 + jaw, 15 + lunge * 3, 23, 6, 21);
  ctx.quadraticCurveTo(-1, 28, -9, 23);
  ctx.fill();
  ctx.strokeStyle = '#374a3999';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.strokeStyle = '#a1a58a';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const y = 27 + i * (3.5 + lunge * 2.7);
    ctx.beginPath();
    ctx.moveTo(-12 + i * 0.7, y);
    ctx.quadraticCurveTo(
      -4 + (i % 2) * 9,
      y + 3 + lunge * 8,
      10 - i * 0.5,
      y + 1,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = '#253c30';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-35, -37);
  ctx.quadraticCurveTo(-7, -29, 24, -48);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const x = -31 + i * 6;
    const y = -35 - Math.max(0, i - 3) * 1.9;
    ctx.strokeStyle = i % 2 ? '#27362a' : '#a2a68a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 3);
    ctx.lineTo(x + 2, y + 4);
    ctx.stroke();
  }
}

function faceLayer(
  ctx: CanvasRenderingContext2D,
  pose: FacePose,
  front: number | null,
): void {
  if (front === 0) return;
  ctx.save();
  ctx.translate(pose.center.x, pose.center.y);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.scale, pose.scale);
  if (front !== null) {
    // 코부터 바깥으로 전경을 열어 얼굴 전체가 한꺼번에 선 위로 바뀌지 않게 한다.
    ctx.beginPath();
    ctx.ellipse(0, 1, 100 * front, 135 * front, 0, 0, Math.PI * 2);
    ctx.clip();
  }
  drawFace(ctx, pose.lunge);
  ctx.restore();
}

function handLayer(
  ctx: CanvasRenderingContext2D,
  origin: Point,
  target: Point,
  side: number,
  reach: number,
  front: number | null,
): void {
  if (front === 0) return;
  const hand = {
    x: origin.x + side * 29 + (target.x - origin.x - side * 29) * reach,
    y: origin.y + 54 + (target.y - origin.y - 54) * reach,
  };
  const scale = 0.6 + reach * 2.7;
  ctx.save();
  if (front === null) {
    ctx.strokeStyle = '#14261f';
    ctx.lineCap = 'round';
    ctx.lineWidth = 13 + reach * 27;
    ctx.beginPath();
    ctx.moveTo(origin.x + side * 27, origin.y + 61);
    ctx.quadraticCurveTo(hand.x + side * 32, hand.y + 45, hand.x, hand.y + 13);
    ctx.stroke();
    ctx.strokeStyle = '#657360';
    ctx.lineWidth *= 0.66;
    ctx.stroke();
  }
  ctx.translate(hand.x, hand.y);
  ctx.rotate(side * (0.12 + reach * 0.13));
  ctx.scale(-side * scale, scale);
  if (front !== null) {
    // 손끝이 먼저 선을 가린 뒤 손바닥이 같은 면을 넘어온다.
    ctx.beginPath();
    ctx.rect(-90, -95, 180, 140 * front);
    ctx.clip();
  }
  drawIntruderHand(
    ctx,
    { x: 0, y: 0 },
    0,
    smooth((reach - 0.78) / 0.22) * 0.45,
  );
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
  const look = smooth((time - intruderScare.look) / intruderScare.lookDuration);
  const hands = clamp(
    (time - intruderScare.hands) / intruderScare.handDuration,
  );
  const reach = 1 - (1 - hands) ** 3;
  const face =
    clamp((time - intruderScare.face) / intruderScare.faceDuration) ** 2;
  const reveal = intruderReveal(state.intruder).body;
  const dragged = smooth(time / intruderTiming.drag);
  const localX = 1524 - reveal * 44 + dragged * 20 - 12 - reveal * 19;
  const origin = {
    x:
      intruderPivotX +
      (localX - intruderPivotX) * (1 - intruderTurn(state.intruder) * 2) -
      roomCameraPosition(state),
    y: 267 - reveal * 49,
  };
  const pose: FacePose = {
    center: {
      x: origin.x + (width * 0.515 - origin.x) * face,
      y: origin.y + (height * 0.52 - origin.y) * face,
    },
    scale: 0.6 + reveal * 0.24 + face * (width / 135 - 0.84),
    tilt: -0.6 * (1 - look) - face * 0.16,
    lunge: face,
  };
  const targets = [
    { side: -1, point: { x: width * 0.3 + 28, y: height * 0.71 } },
    { side: 1, point: { x: width * 0.7 - 20, y: height * 0.71 } },
  ];
  ctx.fillStyle = `rgb(2 8 7 / ${look * 0.12 + reach * 0.45})`;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha *= smooth(hands / 0.15);
  for (const hand of targets)
    handLayer(ctx, origin, hand.point, hand.side, reach, null);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= look;
  faceLayer(ctx, pose, null);
  ctx.restore();

  // 깊이 기준선은 카메라와 손, 얼굴의 움직임에 따라 움직이지 않는다.
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
  faceLayer(ctx, pose, smooth((face - 0.25) / 0.5));
  const fingertips = smooth((hands - 0.24) / 0.62);
  for (const hand of targets)
    handLayer(ctx, origin, hand.point, hand.side, reach, fingertips);
  ctx.restore();
}
