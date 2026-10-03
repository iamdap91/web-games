import { drawPeekingFingers, drawIntruderHand } from './intruder-hands.js';
import type { GameAssets } from './assets.js';
import type { GameSnapshot } from './game.js';
import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import { drawPlayer } from './player-renderer.js';
import {
  intruderDoor,
  intruderReveal,
  intruderExtension,
  intruderTiming,
  intruderHand,
  type Point,
} from './door-intruder.js';
import { smooth } from './event-rules.js';

export function drawIntruderDoor(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
): void {
  const door = intruderDoor;
  const reveal = intruderReveal(state.intruder);
  // 새 문을 추가로 만들지 않고 원래 회색 문의 문틀과 문짝 질감을 사용한다.
  ctx.drawImage(assets.exitDoor, door.x, door.y, door.width, door.height);
  if (reveal.fingers === 0) return;
  const strike = Math.max(
    0,
    (state.intruder.attackElapsed ?? 0) - intruderTiming.brace,
  );
  const pushed = 1 - (1 - Math.min(1, strike / 0.17)) ** 3;
  const open = 0.06 * reveal.fingers + pushed * 0.88;
  const panelWidth = door.openingWidth * (1 - open);
  ctx.fillStyle = '#010405';
  ctx.fillRect(
    door.openingX,
    door.openingY,
    door.openingWidth,
    door.openingHeight,
  );
  // 손이 밀 때만 경첩을 축으로 문짝의 투영 폭이 급격히 줄어든다.
  ctx.drawImage(
    assets.exitDoor,
    31,
    88,
    65,
    111,
    door.openingX,
    door.openingY,
    panelWidth,
    door.openingHeight,
  );
  ctx.fillStyle = '#0c1719';
  ctx.fillRect(
    door.openingX + panelWidth - 2,
    door.openingY,
    3,
    door.openingHeight,
  );
}

function skin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.35,
    2,
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, '#c0b99b');
  gradient.addColorStop(0.28, '#90917a');
  gradient.addColorStop(0.58, '#535f50');
  gradient.addColorStop(1, '#15211e');
  return gradient;
}

function seam(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#1b2825';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(length * 0.3, 4, length * 0.6, -4, length, 0);
  ctx.stroke();
  ctx.strokeStyle = '#9b9e81';
  ctx.lineWidth = 1.3;
  for (let i = 5; i < length; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i - 2, -4);
    ctx.lineTo(i + 2, 4);
    ctx.stroke();
  }
  ctx.restore();
}

function patch(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  name: string,
  source: readonly [number, number, number, number],
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
): void {
  const image = assets.props.get(name)?.[0];
  if (!image) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#111d1b';
  ctx.beginPath();
  ctx.ellipse(1, 3, width * 0.56, height * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'saturate(0.18) brightness(0.75)';
  ctx.drawImage(image, ...source, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  time: number,
): void {
  const breath = Math.sin(time * 2.3) * 2.4;
  ctx.fillStyle = skin(ctx, -8, -18, 120);
  ctx.strokeStyle = '#162321';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-27, -105);
  ctx.bezierCurveTo(-68, -107, -105, -70, -85, -31);
  ctx.bezierCurveTo(-75, -7, -38, 8, -33, 75);
  ctx.quadraticCurveTo(7, 106, 35, 67);
  ctx.bezierCurveTo(51, 33, 41, -12, 69, -37);
  ctx.bezierCurveTo(106, -76, 66, -123, 19, -108 + breath);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 얼룩은 몸 좌표에 고정해 움직일 때도 피부 표면에 붙어 있게 한다.
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 180; i++) {
    const x = Math.sin(i * 127.1) * 87;
    const y = -115 + ((i * 47) % 206);
    ctx.fillStyle = i % 3 === 0 ? '#162d2260' : '#d4d0ad23';
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + (i % 5), 1 + (i % 3), i, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const y = -64 + i * 16;
    ctx.strokeStyle = '#354139b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-57 + i * 3, y - 10);
    ctx.quadraticCurveTo(-43, y + 3, -9, y + 5);
    ctx.stroke();
    ctx.strokeStyle = '#d0cba044';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  // 괘종시계의 빈 내부가 가슴에 박혀 있고 인형 얼굴은 어깨에서 함께 움직인다.
  patch(ctx, assets, '목재 괘종시계', [44, 113, 36, 62], 8, -18, 42, 91, -0.17);
  patch(
    ctx,
    assets,
    '남겨진 인형',
    [5, 16, 80, 70],
    64,
    -74,
    44,
    38,
    0.57 + breath * 0.01,
  );
  seam(ctx, -49, -85, 43, 0.6);
  seam(ctx, 25, 33, 42, -1.35);
  // 끊어진 실은 골격과 다른 주기로 처진다.
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#797d67' : '#16211f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-18 + i * 12, 52);
    ctx.quadraticCurveTo(
      -13 + i * 12 + Math.sin(time * 2 + i) * 7,
      94,
      -25 + i * 13,
      105 + (i % 2) * 16,
    );
    ctx.stroke();
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
  time: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = skin(ctx, -5, -4, 57);
  ctx.strokeStyle = '#26332d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-25, -27);
  ctx.bezierCurveTo(-47, -5, -32, 30, -12, 43);
  ctx.quadraticCurveTo(6, 58, 15, 25);
  ctx.bezierCurveTo(35, -12, 16, -54, -9, -43);
  ctx.quadraticCurveTo(-23, -43, -25, -27);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#09110f';
  ctx.beginPath();
  ctx.ellipse(-19, -9, 3.3, 12, 0.43, 0, Math.PI * 2);
  ctx.ellipse(5, -17, 2.7, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, 7);
  ctx.bezierCurveTo(-16, 14, -9, 40, -4, 37);
  ctx.bezierCurveTo(1, 31, -3, 8, -9, 7);
  ctx.fill();
  seam(ctx, -24, -30, 37, 0.2);
  seam(ctx, -15, 9, 31, 1.25);
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = i % 2 ? '#c8c19d35' : '#1d302d80';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-28 + i * 3, -30 + (i % 3) * 4);
    ctx.quadraticCurveTo(-26 + i * 3, -20, -29 + i * 3, -14);
    ctx.stroke();
  }
  seam(ctx, 13, -2, 28, 1.65);
  ctx.strokeStyle = '#c9c6a94d';
  ctx.beginPath();
  ctx.moveTo(-29, -14);
  ctx.quadraticCurveTo(-34, 8, -19, 20);
  ctx.stroke();
  ctx.strokeStyle = '#18231f';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-19 + i * 5, -37);
    ctx.quadraticCurveTo(
      -38 + i * 8,
      -60,
      -32 + i * 7 + Math.sin(time + i) * 3,
      -58 - (i % 3) * 5,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  shoulder: Point,
  elbow: Point,
  wrist: Point,
  width: number,
  patched: boolean,
): void {
  const middle = { x: (elbow.x + wrist.x) / 2, y: (elbow.y + wrist.y) / 2 };
  const bone = (a: Point, b: Point, startWidth: number, endWidth: number) => {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-5, -startWidth);
    ctx.bezierCurveTo(
      length * 0.3,
      -startWidth * 1.3,
      length * 0.6,
      -endWidth * 0.7,
      length,
      -endWidth,
    );
    ctx.quadraticCurveTo(length + 8, 0, length, endWidth);
    ctx.bezierCurveTo(
      length * 0.7,
      endWidth * 0.55,
      length * 0.28,
      startWidth * 0.72,
      -5,
      startWidth,
    );
    ctx.closePath();
    const shading = ctx.createLinearGradient(0, -startWidth, 0, startWidth);
    shading.addColorStop(0, '#bbc1a0');
    shading.addColorStop(0.23, '#849378');
    shading.addColorStop(0.65, '#3e503f');
    shading.addColorStop(1, '#14221d');
    ctx.fillStyle = shading;
    ctx.strokeStyle = '#15241f';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.clip();
    for (let i = 0; i < 30; i++) {
      const x = (i * length) / 30;
      ctx.strokeStyle = i % 3 ? '#bac1a032' : '#152f2370';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, -startWidth + (i % 4) * 3);
      ctx.quadraticCurveTo(x + 7, 0, x + 3, endWidth);
      ctx.stroke();
    }
    ctx.restore();
  };
  bone(shoulder, elbow, width * 0.66, width * 0.36);
  bone(elbow, wrist, width * 0.42, width * 0.23);
  ctx.fillStyle = '#929b80';
  ctx.beginPath();
  ctx.ellipse(
    elbow.x,
    elbow.y,
    width * 0.55,
    width * 0.38,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  seam(ctx, elbow.x - 8, elbow.y - 6, 25, 1.1);
  if (patched) {
    const angle =
      Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) + Math.PI / 2;
    patch(
      ctx,
      assets,
      '낡은 나무 의자',
      [7, 3, 27, 55],
      middle.x,
      middle.y,
      20,
      63,
      angle,
    );
  }
}

export function drawIntruder(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameSnapshot,
  frame: AnimationFrame,
  actor: boolean,
): void {
  const monster = state.intruder;
  const time = monster.elapsed;
  if (time === null) return;
  const reveal = intruderReveal(monster);
  drawPeekingFingers(ctx, state);
  if (reveal.hand === 0) return;
  const extension = intruderExtension(monster.attackElapsed);
  const dragged = smooth((monster.caughtElapsed ?? 0) / intruderTiming.drag);
  const breath = Math.sin(time * 2.3) * 1.5;
  const body = { x: 1524 - reveal.body * 44 + dragged * 20, y: 290 + breath };
  const hand = intruderHand(monster);
  const leftShoulder = {
    x: 1515 + (body.x - 58 - 1515) * reveal.body,
    y: 268 - reveal.body * 13,
  };
  const rightShoulder = { x: body.x + 42, y: 244 };
  const rightHand = { x: intruderDoor.seamX + 7, y: 267 };
  ctx.save();
  ctx.fillStyle = `rgb(0 3 4 / ${reveal.hand * 0.6})`;
  ctx.beginPath();
  ctx.ellipse(
    body.x - extension * 80,
    345,
    45 + extension * 170,
    8 + extension * 6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // 손이 먼저 나간 뒤에만 머리와 어깨가 좁은 입구를 통과한다.
  if (reveal.body > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      intruderDoor.openingX - reveal.body * 125,
      intruderDoor.openingY - reveal.body * 57,
      intruderDoor.openingWidth + reveal.body * 245,
      intruderDoor.openingHeight + reveal.body * 57,
    );
    ctx.clip();
    drawArm(
      ctx,
      assets,
      rightShoulder,
      { x: 1596, y: 317 },
      rightHand,
      23,
      false,
    );
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.scale(0.45 + reveal.body * 0.45, 0.43 + reveal.body * 0.26);
    drawTorso(ctx, assets, time);
    ctx.restore();
    const headTime = Math.max(
      0,
      (monster.attackElapsed ?? 0) -
        intruderTiming.brace -
        intruderTiming.bodyDelay,
    );
    const headLag = Math.sin(headTime * 17) * Math.exp(-headTime * 4);
    const gaze = Math.max(
      -0.15,
      Math.min(0.2, (state.player.x - body.x) / 1400),
    );
    ctx.save();
    ctx.translate(body.x - 12 - reveal.body * 19, 267 - reveal.body * 49);
    ctx.scale(0.6 + reveal.body * 0.24, 0.6 + reveal.body * 0.24);
    drawHead(ctx, 0, 0, -0.7 + gaze + headLag * 0.22, time);
    ctx.restore();
    ctx.restore();
    drawIntruderHand(ctx, rightHand, 0.55, true);
  }
  // 어깨가 아직 문 뒤에 있을 때도 뻗는 팔은 입구에서 손까지 이어진다.
  drawArm(
    ctx,
    assets,
    leftShoulder,
    { x: 1514 - extension * 220, y: 323 - reveal.body * 12 },
    hand,
    26,
    true,
  );
  if (actor && monster.caughtElapsed !== null) {
    const bind = smooth(monster.caughtElapsed / 0.12);
    const scale = 1 - dragged * 0.58;
    ctx.save();
    ctx.translate(
      state.player.x + (hand.x - state.player.x) * bind,
      state.player.y + (hand.y + 29 * scale - state.player.y) * bind,
    );
    ctx.rotate(
      Math.sin(monster.caughtElapsed * 24) * (1 - dragged) * 0.15 +
        dragged * 0.6,
    );
    ctx.scale(scale, scale);
    ctx.globalAlpha *= 1 - smooth((monster.caughtElapsed - 0.86) / 0.25);
    drawPlayer(ctx, assets, { ...state.player, x: 0, y: 0 }, frame, false);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(0.55 + reveal.hand * 0.45, 0.55 + reveal.hand * 0.45);
  drawIntruderHand(
    ctx,
    { x: 0, y: 0 },
    -0.45 - reveal.hand * 0.7,
    monster.caughtElapsed !== null,
  );
  ctx.restore();
  ctx.restore();
}
