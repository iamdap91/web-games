import {
  clamp,
  ellipse,
  line,
  noise,
  palette,
  polygon,
  ring,
  smooth,
  star,
} from './drawing.js';
import type { Context, Frame, Point } from './types.js';
import { battleLayout } from './battle.js';

function drawKanadaLight(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 1150) return;
  const size = frame.reducedMotion ? 0.62 : 1;
  if (!frame.enhanced) {
    ellipse(
      ctx,
      549,
      266,
      (18 + age / 22) * (1 - age / 1150),
      (18 + age / 22) * (1 - age / 1150),
      palette.paper,
    );
    return;
  }
  ctx.save();
  const spike = (1 - smooth((age - 55) / 235)) * size;
  ctx.globalAlpha *= frame.reducedMotion ? 0.66 : 1;
  if (spike > 0) {
    star(ctx, 549, 266, 186 * spike, palette.gold, 4, -0.13);
    star(ctx, 549, 266, 142 * spike, palette.paper, 4, -0.13);
    ellipse(ctx, 549, 266, 16 * spike, 16 * spike, '#fff9e2');
  }
  const orbit = clamp((age - 70) / 850);
  if (age >= 70) {
    ctx.globalAlpha *= 1 - orbit;
    ctx.translate(549, 266);
    ctx.rotate(-0.47);
    const rx = (26 + orbit * 151) * size;
    const ry = (8 + orbit * 37) * size;
    // 십자는 셀의 단단한 면으로, 링은 여러 겹의 부드러운 농도로 분리한다.
    for (let brush = 7; brush >= 0; brush--) {
      ctx.save();
      ctx.globalAlpha *= brush === 0 ? 0.54 : 0.055;
      ctx.shadowColor = '#f8e6b4';
      ctx.shadowBlur = brush * 1.6;
      ring(
        ctx,
        0,
        0,
        rx,
        ry,
        brush % 2 ? '#f4d497' : '#fff7df',
        2 + brush * 1.6,
      );
      ctx.restore();
    }
    ctx.globalAlpha *= 0.6;
    ring(ctx, 0, 0, rx * 0.72, ry * 0.7, '#e5c483', 2.5);
  }
  ctx.restore();
}

function beamAxis(
  u: number,
  length: number,
  bend: number,
  tipHeight: number,
): Point {
  const v = 1 - u;
  return {
    x: 267 + length * (3 * v * v * u * 0.2 + 3 * v * u * u * 0.72 + u ** 3),
    y:
      300 +
      3 * v * v * u * bend -
      3 * v * u * u * bend * 0.8 +
      u ** 3 * tipHeight,
  };
}

function drawKanadaBeam(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 2100) return;
  const progress = clamp(
    age / (frame.enhanced && !frame.reducedMotion ? 440 : 620),
  );
  const fade = 1 - clamp((age - 1500) / 600);
  const length = 548 * smooth(progress);
  const amount = frame.reducedMotion ? 0.45 : 1;
  const cellTime = frame.reducedMotion ? Math.floor(age / 250) * 250 : age;
  const beats = [80, 160, 245, 380, 540, 760, 1020, 1280, 1560, 1800];
  const phase = beats.filter((timeMs) => cellTime >= timeMs).length;
  const bends = [0, -250, 310, -340, 360, -290, 330, -350, 270, -160, 90];
  const tips = [0, -30, 70, -65, 45, 80, -70, 55, -45, 30, 0];
  const bend = bends[phase]! * amount * Math.min(1, progress * 1.5);
  const tipHeight = tips[phase]! * amount;
  const head = beamAxis(1, length, bend, tipHeight);
  ctx.save();
  ctx.globalAlpha *= fade * (frame.reducedMotion ? 0.72 : 1);
  if (!frame.enhanced) {
    line(
      ctx,
      [
        { x: 267, y: 300 },
        { x: 267 + length, y: 300 },
      ],
      palette.blue,
      25,
    );
    ctx.restore();
    return;
  }
  const top: Point[] = [];
  const bottom: Point[] = [];
  const axis: Point[] = [];
  for (let index = 0; index <= 26; index++) {
    const u = index / 26;
    const point = beamAxis(u, length, bend, tipHeight);
    const prior = beamAxis(Math.max(0, u - 0.012), length, bend, tipHeight);
    const next = beamAxis(Math.min(1, u + 0.012), length, bend, tipHeight);
    const distance = Math.max(
      1,
      Math.hypot(next.x - prior.x, next.y - prior.y),
    );
    const nx = -(next.y - prior.y) / distance;
    const ny = (next.x - prior.x) / distance;
    const ridge =
      (7 +
        u * 18 +
        noise(index + phase * 7) * 21 +
        (index % 5 === phase % 5 ? 20 : 0)) *
      (frame.reducedMotion ? 0.7 : 1);
    axis.push(point);
    top.push({ x: point.x + nx * ridge, y: point.y + ny * ridge });
    bottom.unshift({
      x: point.x - nx * ridge * 0.73,
      y: point.y - ny * ridge * 0.73,
    });
  }
  polygon(ctx, [...top, ...bottom], palette.blue);
  line(ctx, top, '#d7f3ed', 3);
  line(ctx, bottom, '#386d9b', 4);
  line(ctx, axis, '#fff5cd', 10);
  for (let index = 0; index < 5; index++) {
    const u = (index + 0.6) / 6;
    const point = beamAxis(u, length, bend, tipHeight);
    const prior = beamAxis(u - 0.015, length, bend, tipHeight);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
    polygon(
      ctx,
      [
        { x: -12, y: -12 },
        { x: 24, y: -2 },
        { x: 5, y: 12 },
        { x: -21, y: 4 },
      ],
      '#29475b',
    );
    ctx.restore();
  }
  star(
    ctx,
    head.x,
    head.y,
    28 + (phase % 3) * 5,
    palette.paper,
    5,
    0.3 + phase * 0.21,
  );
  ctx.restore();
}

function dragonPoint(progress: number, trail: number): Point {
  const emitted = Math.max(0, progress - trail * 0.6);
  return {
    x: 292 + emitted * 493,
    y: 269 + Math.sin(emitted * 2.3 * Math.PI) * 58,
  };
}

function drawDragon(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 2400) return;
  const p = clamp(age / 1900);
  const head = dragonPoint(p, 0);
  const fade = 1 - clamp((age - 1900) / 500);
  ctx.save();
  ctx.globalAlpha *= fade;
  if (!frame.enhanced) {
    ellipse(ctx, head.x, head.y, 38, 23, palette.gold);
    ctx.restore();
    return;
  }
  const cell = Math.floor(age / (frame.reducedMotion ? 240 : 1000 / 12));
  const birth = smooth(age / 170);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.scale(birth, birth);
  ctx.translate(-head.x, -head.y);
  const count = 38;
  // 머리가 실제로 지난 구간만 사용해 발사 직후의 꼬리가 발생점 뒤로 생기지 않게 한다.
  const emittedTrail = Math.min(1, p / 0.6);
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let index = 0; index <= count; index++) {
    const u = index / count;
    const trail = u * emittedTrail;
    const point = dragonPoint(p, trail);
    const tangentY =
      Math.cos(Math.max(0, p - trail * 0.6) * 2.3 * Math.PI) *
      58 *
      2.3 *
      Math.PI;
    const distance = Math.hypot(493, tangentY);
    const normal = { x: -tangentY / distance, y: 493 / distance };
    const thick = ((1 - u) * 35 + 2) * (0.88 + noise(index + cell * 3) * 0.24);
    const flame = index % 4 === 0 ? (1 - u) * 17 : 0;
    top.push({
      x: point.x - normal.x * (thick + flame),
      y: point.y - normal.y * (thick + flame),
    });
    bottom.unshift({
      x: point.x + normal.x * thick * 0.65,
      y: point.y + normal.y * thick * 0.65,
    });
  }
  polygon(ctx, [...top, ...bottom], '#dc7947');
  line(ctx, top, '#f5d374', 3);
  const center = dragonPoint(p, 0);
  const spine = Array.from({ length: count }, (_, index) =>
    dragonPoint(p, (index / count) * emittedTrail),
  );
  line(ctx, spine, '#f8d98f', 11);
  const x = center.x;
  const y = center.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(Math.cos(p * 2.3 * Math.PI) * 58 * 2.3 * Math.PI, 493));
  ctx.translate(-x, -y);
  polygon(
    ctx,
    [
      { x: x - 29, y: y - 23 },
      { x: x - 38, y: y - 69 },
      { x: x - 7, y: y - 40 },
      { x: x + 12, y: y - 38 },
      { x: x + 53, y: y - 13 },
      { x: x + 34, y: y + 2 },
      { x: x + 65, y: y + 14 },
      { x: x + 16, y: y + 29 },
      { x: x - 27, y: y + 19 },
    ],
    '#f5ce75',
  );
  polygon(
    ctx,
    [
      { x: x + 7, y: y + 7 },
      { x: x + 43, y: y + 12 },
      { x: x + 12, y: y + 18 },
    ],
    palette.ink,
  );
  line(
    ctx,
    [
      { x: x + 2, y: y - 20 },
      { x: x + 17, y: y - 16 },
    ],
    palette.ink,
    5,
  );
  ctx.restore();
  for (let flame = 0; flame < 10; flame++) {
    const u = (flame + 1) / 11;
    const point = dragonPoint(p, u * emittedTrail);
    const tongue = 8 + noise(flame + cell * 5) * 19;
    const side = flame % 2 ? 1 : -1;
    polygon(
      ctx,
      [
        { x: point.x - 13, y: point.y },
        { x: point.x - tongue, y: point.y + side * (18 + u * 12) },
        { x: point.x + 10, y: point.y + side * 7 },
      ],
      '#efb66c',
    );
  }
  ctx.restore();
  ctx.restore();
}

function drawAraki(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 1350) return;
  const p = clamp(age / 1350);
  if (!frame.enhanced)
    return ellipse(ctx, 503, 277, 12 * (1 - p), 12 * (1 - p), palette.paper);
  ctx.save();
  const opacity = ctx.globalAlpha;
  ctx.globalAlpha *= frame.reducedMotion ? 0.55 : 1;
  const reach = (1 - clamp(age / 430)) * (frame.reducedMotion ? 102 : 224);
  if (reach > 0) {
    line(
      ctx,
      [
        { x: 503 - reach, y: 277 + reach * 0.4 },
        { x: 503 + reach, y: 277 - reach * 0.4 },
      ],
      palette.blue,
      12,
    );
    line(
      ctx,
      [
        { x: 503 - reach * 0.35, y: 277 - reach },
        { x: 503 + reach * 0.35, y: 277 + reach },
      ],
      palette.paper,
      7,
    );
  }
  for (let index = 0; index < 11; index++) {
    const local = clamp((age - index * 31) / 950);
    if (age < index * 31) continue;
    ctx.globalAlpha =
      opacity * (1 - local) * (frame.reducedMotion ? 0.42 : 0.8);
    const x = 503 + (noise(index) - 0.4) * 215 * local;
    const y = 277 - local * (45 + noise(index + 5) * 105);
    ring(
      ctx,
      x,
      y,
      4 + local * (8 + (index % 4) * 2),
      4 + local * (8 + (index % 4) * 2),
      index % 2 ? palette.paper : palette.blue,
      2,
    );
  }
  ctx.restore();
}

function viscousBody(
  ctx: Context,
  head: Point,
  neck: number,
  connected: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(285, 278);
  if (connected) {
    ctx.bezierCurveTo(
      345,
      268,
      head.x - 77,
      head.y - neck,
      head.x - 28,
      head.y - 38,
    );
    ctx.bezierCurveTo(
      head.x + 50,
      head.y - 79,
      head.x + 82,
      head.y + 50,
      head.x + 8,
      head.y + 46,
    );
    ctx.bezierCurveTo(
      head.x - 60,
      head.y + 52,
      head.x - 84,
      head.y + neck,
      285,
      318,
    );
    ctx.bezierCurveTo(237, 330, 246, 263, 285, 278);
  } else {
    ctx.moveTo(head.x - 49, head.y - 18);
    ctx.bezierCurveTo(
      head.x - 17,
      head.y - 64,
      head.x + 60,
      head.y - 38,
      head.x + 49,
      head.y + 18,
    );
    ctx.bezierCurveTo(
      head.x + 31,
      head.y + 62,
      head.x - 71,
      head.y + 55,
      head.x - 49,
      head.y - 18,
    );
  }
  ctx.closePath();
  ctx.fillStyle = '#a9d8b6';
  ctx.fill();
  ctx.strokeStyle = '#e8f1bc';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawKozuma(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 2400) return;
  const ordinary =
    age < 930
      ? smooth(age / 930) * 0.38
      : 0.38 + smooth((age - 930) / 970) * 0.62;
  // 붙어서 버티는 구간과 끊긴 뒤의 급가속을 충분히 벌려 점성의 박자를 읽힌다.
  const p =
    frame.enhanced && !frame.reducedMotion
      ? age < 980
        ? smooth(age / 980) * 0.18
        : 0.18 + smooth((age - 980) / 620) * 0.82
      : ordinary;
  const head = { x: 285 + p * 430, y: 300 - Math.sin(p * Math.PI) * 48 };
  ctx.save();
  ctx.globalAlpha *= 1 - clamp((age - 2000) / 400);
  ctx.translate(285, 300);
  const birth = smooth(age / 180);
  ctx.scale(birth, birth);
  ctx.translate(-285, -300);
  if (!frame.enhanced) ellipse(ctx, head.x, head.y, 39, 39, '#a9d8b6');
  else {
    const split = age > 1200;
    viscousBody(
      ctx,
      head,
      Math.max(1.2, 25 * (1 - smooth((age - 760) / 440))),
      !split,
    );
    if (split) {
      const since = (age - 1200) / 1000;
      ellipse(
        ctx,
        285 + since * 19,
        300 + since * 7,
        23 - clamp(since) * 13,
        31,
        '#a9d8b6',
      );
      for (let index = 0; index < 5; index++) {
        const x = 380 + index * 34 + since * (24 + index * 18);
        const y = 286 + Math.sin(index * 1.8) * 24 + since * since * 57;
        ellipse(
          ctx,
          x,
          y,
          (5 + (index % 3) * 3) * (frame.reducedMotion ? 0.7 : 1),
          8 + (index % 2) * 8,
          '#b5dcb7',
        );
      }
    }
  }
  ctx.restore();
}

function blackBridge(
  ctx: Context,
  a: Point,
  b: Point,
  radius: number,
  neck: number,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / distance;
  const ny = dx / distance;
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  ctx.beginPath();
  ctx.moveTo(a.x + nx * radius, a.y + ny * radius);
  ctx.bezierCurveTo(
    middle.x + nx * neck,
    middle.y + ny * neck,
    middle.x + nx * neck,
    middle.y + ny * neck,
    b.x + nx * radius,
    b.y + ny * radius,
  );
  ctx.lineTo(b.x - nx * radius, b.y - ny * radius);
  ctx.bezierCurveTo(
    middle.x - nx * neck,
    middle.y - ny * neck,
    middle.x - nx * neck,
    middle.y - ny * neck,
    a.x - nx * radius,
    a.y - ny * radius,
  );
  ctx.closePath();
  ctx.fillStyle = '#070a12';
  ctx.fill();
}

function drawTatsuzo(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 2200) return;
  const p = age / 2200;
  const motion = frame.reducedMotion ? 0.45 : 1;
  const birth = smooth(age / 160);
  const end = 1 - smooth((age - 1560) / 640);
  if (!frame.enhanced) {
    ellipse(ctx, 551, 284, 90 * birth * end, 90 * birth * end, '#070a12');
    return;
  }
  const spread = Math.sin(clamp((age - 80) / 1650) * Math.PI) * motion;
  const root = { x: 551, y: 284 };
  const points = Array.from({ length: 3 }, (_, index) => {
    const angle = -2.6 + index * 2.12 + p * 2.8;
    return {
      x: 551 + Math.cos(angle) * (48 + index * 23) * spread,
      y: 284 + Math.sin(angle) * (59 + index * 12) * spread,
    };
  });
  ctx.save();
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    const split =
      smooth((age - 640 - index * 125) / 480) *
      (1 - smooth((age - 1430) / 360));
    const radius = (32 + index * 7) * birth * end;
    if (split < 0.96)
      blackBridge(ctx, root, point, radius * 0.6, radius * (1 - split) * 0.9);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(p * 3.5 - index);
    const stretch =
      1 + Math.sin(p * 9 + index) * (frame.reducedMotion ? 0.12 : 0.3);
    ellipse(ctx, 0, 0, radius * stretch, radius / stretch, '#070a12');
    ctx.restore();
  }
  ellipse(ctx, root.x, root.y, 38 * birth * end, 30 * birth * end, '#070a12');
  ctx.restore();
}

function drawShigeta(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 1500) return;
  const motion = frame.reducedMotion ? 0.55 : 1;
  if (!frame.enhanced) {
    if (age > 300) return;
    ctx.save();
    ctx.globalAlpha *= 1 - age / 300;
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + (i / 5) * 1.8;
      line(
        ctx,
        [
          { x: 548, y: 300 },
          { x: 548 + Math.cos(a) * 30, y: 300 + Math.sin(a) * 30 },
        ],
        palette.gold,
        2,
      );
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
  if (age < 230) {
    const spread = (22 + age * 0.45) * motion;
    const opacity = ctx.globalAlpha;
    ctx.globalAlpha *= 1 - age / 230;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI + (i / 11) * Math.PI * 2;
      const bend = {
        x: 548 + Math.cos(a) * spread * 0.52,
        y: 300 + Math.sin(a) * spread * 0.52,
      };
      const tip = {
        x: 548 + Math.cos(a + 0.14) * spread,
        y: 300 + Math.sin(a + 0.14) * spread,
      };
      line(ctx, [{ x: 548, y: 300 }, bend, tip], '#f5cf7e', 3);
      line(
        ctx,
        [
          bend,
          {
            x: bend.x + Math.cos(a - 0.5) * spread * 0.31,
            y: bend.y + Math.sin(a - 0.5) * spread * 0.31,
          },
        ],
        '#fff0bd',
        1.5,
      );
    }
    ellipse(ctx, 548, 300, 5, 5, '#fff5d9');
    ctx.globalAlpha = opacity;
  }
  // 같은 접촉 탄도로 빛줄기와 선두를 그리며 날아간 금속편은 식은 색으로 사라진다.
  for (let i = 0; i < 42; i++) {
    if (frame.reducedMotion && i % 3) continue;
    const delayMs = (i % 7) * 31;
    const seconds = (age - delayMs) / 1000;
    const life = 0.38 + noise(i + 29) * 0.52;
    if (seconds < 0 || seconds > life) continue;
    const angle = i % 6 ? -1.08 + noise(i) * 2.05 : -2.8 + noise(i) * 0.8;
    const speed = (155 + noise(i + 7) * 310) * motion;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const gravity = 350 * motion;
    const position = {
      x: 548 + vx * seconds,
      y: 300 + vy * seconds + (gravity * seconds * seconds) / 2,
    };
    const prior = Math.max(0, seconds - 0.026);
    const color =
      seconds < 0.13
        ? '#fff2c4'
        : seconds < life * 0.63
          ? '#edbc69'
          : '#b76f48';
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((seconds / life - 0.62) / 0.38);
    line(
      ctx,
      [
        {
          x: 548 + vx * prior,
          y: 300 + vy * prior + (gravity * prior * prior) / 2,
        },
        position,
      ],
      color,
      i % 4 ? 1.4 : 2.2,
    );
    ellipse(ctx, position.x, position.y, 1.5, 1.5, color);
    const splitAt = 0.1 + (i % 4) * 0.035;
    if (seconds > splitAt && i % 3 === 0) {
      const childAge = seconds - splitAt;
      const from = {
        x: 548 + vx * splitAt,
        y: 300 + vy * splitAt + (gravity * splitAt * splitAt) / 2,
      };
      const childVx = vx * 0.68 - vy * 0.22;
      const childVy = vy * 0.7 + vx * 0.22;
      const child = {
        x: from.x + childVx * childAge,
        y: from.y + childVy * childAge + (gravity * childAge * childAge) / 2,
      };
      line(
        ctx,
        [
          {
            x: child.x - childVx * 0.018,
            y: child.y - (childVy + gravity * childAge) * 0.018,
          },
          child,
        ],
        '#e5b273',
        1,
      );
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawKutsuna(ctx: Context, frame: Frame): void {
  const age = frame.timeMs - battleLayout.contactMs;
  if (age < 0 || age > 1700) return;
  ctx.save();
  ctx.globalAlpha *= frame.reducedMotion ? 0.6 : 1;
  if (!frame.enhanced) {
    ctx.globalAlpha *= 1 - smooth((age - 700) / 450);
    line(
      ctx,
      [
        { x: 296, y: 288 },
        { x: 421, y: 250 },
        { x: 478, y: 314 },
        { x: 595, y: 258 },
        { x: 782, y: 288 },
      ],
      palette.blue,
      5,
    );
    ctx.restore();
    return;
  }
  const motion = frame.reducedMotion ? 0.56 : 1;
  const cell = age / (frame.reducedMotion ? 230 : 1000 / 12);
  const first = Math.floor(cell);
  const blend = smooth(cell - first);
  const flow = (seed: number): number =>
    noise(seed + first * 31) * (1 - blend) +
    noise(seed + (first + 1) * 31) * blend;
  for (let strand = 0; strand < 6; strand++) {
    const local = age - strand * 67;
    const life = 920 + strand * 71;
    if (local < 0 || local > life) continue;
    const head = clamp(local / 180);
    const tail = clamp((local - 490) / (life - 490));
    const points: Point[] = [];
    const curl = (flow(strand * 7) - 0.5) * Math.PI * 2;
    for (let index = 0; index <= 64; index++) {
      const u = tail + ((head - tail) * index) / 64;
      const body = Math.sin(u * Math.PI);
      const swirl = u * (7 + strand * 1.3) + local / 240 + curl;
      const loop = (24 + flow(strand * 11 + 5) * 69) * body * motion;
      const kink =
        Math.sin(u * 21 + strand * 3 + local / 370) * body * 17 * motion;
      points.push({
        x: 296 + u * 486 + Math.sin(swirl) * loop,
        y:
          288 +
          Math.cos(swirl * 1.6 + curl) * loop +
          Math.sin(u * 5 + strand) * body * 43 * motion +
          kink,
      });
    }
    ctx.save();
    ctx.globalAlpha *=
      smooth(local / 45) * (1 - smooth((local - life + 190) / 190));
    // 각 줄의 머리와 꼬리가 따로 이동하여 평행 사인파의 고정 다발을 피한다.
    const edge: Point[] = [];
    const reverse: Point[] = [];
    for (let index = 0; index < points.length; index++) {
      const point = points[index]!;
      const before = points[Math.max(0, index - 1)]!;
      const after = points[Math.min(points.length - 1, index + 1)]!;
      const distance = Math.max(
        1,
        Math.hypot(after.x - before.x, after.y - before.y),
      );
      const nx = -(after.y - before.y) / distance;
      const ny = (after.x - before.x) / distance;
      const along = index / (points.length - 1);
      const width =
        (2 + Math.sin(along * Math.PI) * (4 + flow(index + strand * 37) * 9)) *
        motion;
      edge.push({ x: point.x + nx * width, y: point.y + ny * width });
      reverse.unshift({ x: point.x - nx * width, y: point.y - ny * width });
    }
    polygon(ctx, [...edge, ...reverse], strand % 2 ? '#8dcfdd' : '#d3e7d9');
    ctx.strokeStyle = '#24536a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    line(ctx, points, '#fff4d9', strand % 2 ? 3.7 : 2.8);
    if (strand % 2 === 0) {
      const root = points[Math.floor(points.length * 0.58)]!;
      const branch = points
        .slice(Math.floor(points.length * 0.58))
        .map((point, index) => ({
          x: point.x - index * 0.8,
          y: point.y - index * 1.6 * motion,
        }));
      line(ctx, [root, ...branch], '#c1e6e2', 1.4);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawLightEffects(
  ctx: Context,
  id: string,
  frame: Frame,
): boolean {
  if (id === 'fx-kanada-light') drawKanadaLight(ctx, frame);
  else if (id === 'fx-kanada-beam') drawKanadaBeam(ctx, frame);
  else if (id === 'fx-kanada-dragon') drawDragon(ctx, frame);
  else if (id === 'fx-araki') drawAraki(ctx, frame);
  else if (id === 'fx-kozuma') drawKozuma(ctx, frame);
  else if (id === 'fx-tatsuzo') drawTatsuzo(ctx, frame);
  else if (id === 'fx-shigeta') drawShigeta(ctx, frame);
  else if (id === 'fx-kutsuna') drawKutsuna(ctx, frame);
  else return false;
  return true;
}
