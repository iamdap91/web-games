import type { GameSnapshot } from './game.js';
import { intruderDoor, intruderTiming, type Point } from './door-intruder.js';
import { smooth } from './event-rules.js';

type Finger = readonly [Point, Point, Point, Point];
type FingerColors = {
  readonly edge: string;
  readonly shade: string;
  readonly skin: string;
  readonly light: string;
  readonly nail: string;
};
const exposed: FingerColors = {
  edge: '#1b2525',
  shade: '#384440',
  skin: '#727b70',
  light: '#a3a694',
  nail: '#60665f',
};
const inDoor: FingerColors = {
  edge: '#1c262b',
  shade: '#293238',
  skin: '#424b50',
  light: '#636b70',
  nail: '#4e585f',
};

function drawFinger(
  ctx: CanvasRenderingContext2D,
  joints: Finger,
  width: number,
  colors: FingerColors,
): void {
  for (let index = 0; index < 3; index++) {
    const start = joints[index]!;
    const end = joints[index + 1]!;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const root = width * (1 - index * 0.18);
    const tip = root * (index === 2 ? 0.58 : 0.83);
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-1, -root);
    ctx.quadraticCurveTo(length * 0.45, -root * 0.72, length - 2, -tip);
    ctx.quadraticCurveTo(length + 1, -tip * 0.8, length + 1, 0);
    ctx.quadraticCurveTo(length + 1, tip, length - 2, tip);
    ctx.quadraticCurveTo(length * 0.45, root * 0.7, -1, root);
    ctx.closePath();
    const skin = ctx.createLinearGradient(0, -root, 0, root);
    skin.addColorStop(0, colors.light);
    skin.addColorStop(0.26, colors.skin);
    skin.addColorStop(1, colors.shade);
    ctx.fillStyle = skin;
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
    if (index === 2) {
      // 손톱도 마지막 마디 방향을 따라가며, 둥근 선 끝 대신 납작한 끝을 만든다.
      ctx.fillStyle = colors.nail;
      ctx.beginPath();
      ctx.moveTo(Math.max(1, length - 8), -tip * 0.7);
      ctx.lineTo(length + 1.5, -tip * 0.5);
      ctx.lineTo(length + 1, tip * 0.65);
      ctx.lineTo(Math.max(1, length - 7), tip * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = colors.light;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(length - 6, -tip * 0.6);
      ctx.lineTo(length + 0.5, -tip * 0.45);
      ctx.stroke();
    }
    ctx.restore();
    if (index < 2) {
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(angle);
      ctx.fillStyle = colors.skin;
      ctx.beginPath();
      ctx.ellipse(0, 0, root * 0.72, root * 1.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.shade;
      ctx.lineWidth = 0.8;
      for (const offset of [-1.4, 1.1]) {
        ctx.beginPath();
        ctx.moveTo(offset, -root * 0.68);
        ctx.quadraticCurveTo(offset - 1, 0, offset, root * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function drawPeekingFingers(
  ctx: CanvasRenderingContext2D,
  state: GameSnapshot,
): void {
  const time = state.intruder.elapsed ?? 0;
  const strike = (state.intruder.attackElapsed ?? 0) - intruderTiming.brace;
  const fade = 1 - smooth(strike / 0.09);
  if (fade === 0) return;
  const x = intruderDoor.seamX;
  const fingers = [
    { y: 260, length: 19, drop: 9, delay: 0.25, width: 3.3 },
    { y: 279, length: 26, drop: 13, delay: 0.48, width: 3.7 },
    { y: 302, length: 13, drop: 7, delay: 0.77, width: 2.8 },
  ];
  ctx.save();
  ctx.globalAlpha *= fade;
  // 문 안의 뿌리는 문짝에 가려진다. 노출된 피부 자체는 불투명하게 남긴다.
  ctx.beginPath();
  ctx.rect(x - 40, intruderDoor.openingY, 41, intruderDoor.openingHeight);
  ctx.clip();
  for (const [index, finger] of fingers.entries()) {
    const reveal = smooth((time - finger.delay) / 1.0);
    if (reveal === 0) continue;
    // 계속 꿈틀거리지 않고 가운데 손가락 하나만 한 번 힘을 준다.
    const squeeze =
      index === 1 ? Math.sin(Math.PI * smooth((time - 3.7) / 0.85)) * 1.4 : 0;
    const reach = finger.length * reveal;
    const y = finger.y;
    drawFinger(
      ctx,
      [
        { x: x + 11, y: y + 1 },
        { x: x - reach * 0.46, y: y - 3 },
        { x: x - reach, y: y - 1 },
        { x: x - reach + 3 + squeeze, y: y + finger.drop * reveal },
      ],
      finger.width,
      inDoor,
    );
  }
  // 문틈 바로 옆의 손등에만 접촉 그림자가 붙는다.
  const shadow = ctx.createLinearGradient(x - 9, 0, x + 1, 0);
  shadow.addColorStop(0, '#07101400');
  shadow.addColorStop(1, '#071014bb');
  ctx.fillStyle = shadow;
  ctx.fillRect(x - 9, 249, 10, 70);
  ctx.restore();
}

export function drawIntruderHand(
  ctx: CanvasRenderingContext2D,
  point: Point,
  angle: number,
  closed: boolean | number,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  const curl = typeof closed === 'boolean' ? Number(closed) : smooth(closed);
  const bent: readonly Finger[] = [
    [
      { x: -14, y: -10 },
      { x: -25, y: -27 },
      { x: -26, y: -42 },
      { x: -10, y: -32 },
    ],
    [
      { x: -5, y: -15 },
      { x: -8, y: -37 },
      { x: 3, y: -48 },
      { x: 10, y: -28 },
    ],
    [
      { x: 6, y: -14 },
      { x: 15, y: -32 },
      { x: 26, y: -34 },
      { x: 21, y: -18 },
    ],
    [
      { x: 16, y: -8 },
      { x: 30, y: -21 },
      { x: 40, y: -18 },
      { x: 29, y: -7 },
    ],
  ];
  const spread: readonly Finger[] = [
    [
      { x: -14, y: -10 },
      { x: -24, y: -29 },
      { x: -29, y: -48 },
      { x: -23, y: -61 },
    ],
    [
      { x: -5, y: -15 },
      { x: -9, y: -38 },
      { x: -8, y: -57 },
      { x: -1, y: -69 },
    ],
    [
      { x: 6, y: -14 },
      { x: 10, y: -36 },
      { x: 14, y: -54 },
      { x: 21, y: -62 },
    ],
    [
      { x: 16, y: -8 },
      { x: 26, y: -23 },
      { x: 34, y: -38 },
      { x: 41, y: -41 },
    ],
  ];
  const bend = (open: Finger, shut: Finger): Finger => {
    const joint = (index: number): Point => ({
      x: open[index]!.x + (shut[index]!.x - open[index]!.x) * curl,
      y: open[index]!.y + (shut[index]!.y - open[index]!.y) * curl,
    });
    return [joint(0), joint(1), joint(2), joint(3)];
  };
  const fingers = spread.map((finger, index) => bend(finger, bent[index]!));
  for (const [index, finger] of fingers.entries())
    drawFinger(ctx, finger, [5.2, 5.8, 5.1, 4.1][index]!, exposed);
  const palm = ctx.createLinearGradient(-22, -17, 17, 21);
  palm.addColorStop(0, '#a2a590');
  palm.addColorStop(0.3, '#747e6e');
  palm.addColorStop(1, '#303e37');
  ctx.fillStyle = palm;
  ctx.strokeStyle = exposed.edge;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, 21);
  ctx.bezierCurveTo(-14, 8, -27, 6, -22, -10);
  ctx.lineTo(-15, -17);
  ctx.lineTo(-5, -21);
  ctx.lineTo(7, -20);
  ctx.lineTo(20, -12);
  ctx.quadraticCurveTo(25, -2, 17, 9);
  ctx.lineTo(10, 21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 네 손가락의 힘줄과 옆으로 갈라진 엄지를 구분해 부채꼴 선 묶음처럼 보이지 않게 한다.
  for (const finger of fingers) {
    const root = finger[0];
    ctx.strokeStyle = '#abb09750';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y + 1);
    ctx.quadraticCurveTo(root.x * 0.7, 0, root.x * 0.25, 15);
    ctx.stroke();
  }
  const bentThumb: Finger = [
    { x: -18, y: 8 },
    { x: -31, y: 0 },
    { x: -27, y: -14 },
    { x: -10, y: -13 },
  ];
  const spreadThumb: Finger = [
    { x: -18, y: 8 },
    { x: -31, y: 1 },
    { x: -42, y: -7 },
    { x: -44, y: -20 },
  ];
  drawFinger(ctx, bend(spreadThumb, bentThumb), 6.1, exposed);
  ctx.restore();
}
