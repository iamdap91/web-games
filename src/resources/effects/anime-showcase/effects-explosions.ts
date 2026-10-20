import { clamp, ellipse, noise, palette, polygon, smooth } from './drawing.js';
import type { Context, Frame, Point } from './types.js';
import { battleLayout } from './battle.js';

function cloudPoints(
  x: number,
  y: number,
  rx: number,
  ry: number,
  phase: number,
  seed: number,
): readonly Point[] {
  return Array.from({ length: 56 }, (_, index) => {
    const a = (index / 56) * Math.PI * 2;
    const r =
      1 +
      Math.sin(a * 5 + seed + phase) * 0.11 +
      Math.cos(a * 9 - phase * 0.7) * 0.055;
    return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r };
  });
}

function path(ctx: Context, points: readonly Point[]): void {
  ctx.beginPath();
  points.forEach((point, index) =>
    index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
  );
  ctx.closePath();
}

function simple(ctx: Context, age: number, color: string, origin: Point): void {
  if (age < 0 || age > 1900) return;
  const p = age / 1900;
  ctx.save();
  ctx.globalAlpha *= Math.sin(p * Math.PI);
  ellipse(ctx, origin.x, origin.y - p * 40, 28 + p * 93, 28 + p * 93, color);
  ctx.restore();
}

/** 각진 방사형·창·갈고리를 서로 다른 셀에 써서 확대만으로 폭발을 대신하지 않는다. */
function kanadaFlame(
  ctx: Context,
  center: Point,
  radius: number,
  kind: number,
  seed: number,
  color: string,
): void {
  let points: readonly Point[];
  if (kind === 1) {
    points = [
      { x: -0.25, y: 0.6 },
      { x: -0.5, y: -0.3 },
      { x: -0.12, y: -0.15 },
      { x: 0.04, y: -1.7 },
      { x: 0.3, y: -0.55 },
      { x: 0.75, y: -0.9 },
      { x: 0.35, y: 0.12 },
      { x: 0.13, y: 0.8 },
    ];
  } else if (kind === 2) {
    points = [
      { x: -0.9, y: 0.45 },
      { x: -0.8, y: -0.12 },
      { x: -0.23, y: -0.96 },
      { x: 0.5, y: -1.1 },
      { x: 0.97, y: -0.32 },
      { x: 0.3, y: -0.56 },
      { x: 0.04, y: -0.17 },
      { x: 0.67, y: 0.02 },
      { x: 0.28, y: 0.6 },
      { x: -0.15, y: 0.12 },
      { x: -0.45, y: 0.68 },
    ];
  } else {
    const count = 12 + (seed % 3) * 2;
    points = Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + noise(seed + 3) * 0.7;
      const spike =
        index % 2
          ? 0.24 + noise(index * 3 + seed) * 0.22
          : 0.64 + noise(index + seed * 11) * 0.66;
      return { x: Math.cos(angle) * spike, y: Math.sin(angle) * spike };
    });
  }
  polygon(
    ctx,
    points.map((point) => ({
      x: center.x + point.x * radius,
      y: center.y + point.y * radius,
    })),
    color,
  );
}

function drawKanadaExplosion(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, palette.gold, { x: 550, y: 334 });
  if (age < 0 || age >= 1700) return;
  const cellTime = frame.reducedMotion ? Math.floor(age / 240) * 240 : age;
  const ends = [65, 110, 185, 260, 360, 485, 650, 900, 1180, 1460, 1700];
  const cell = ends.findIndex((end) => cellTime < end);
  const radii = [21, 84, 156, 104, 145, 117, 136, 97, 72, 45, 24];
  const radius = radii[Math.max(0, cell)]! * (frame.reducedMotion ? 0.6 : 1);
  const colors = frame.reducedMotion
    ? ['#b87853', '#c6a365', '#d4c28d']
    : ['#b64c42', '#ed9d53', '#f1deb0'];
  ctx.save();
  ctx.globalAlpha *=
    (frame.reducedMotion ? 0.65 : 1) * (1 - smooth((age - 1300) / 400));
  if (cell === 0) {
    polygon(
      ctx,
      [
        { x: 550, y: 334 - radius },
        { x: 550 + radius * 0.45, y: 334 },
        { x: 550, y: 334 + radius },
        { x: 550 - radius * 0.45, y: 334 },
      ],
      colors[2]!,
    );
  } else if (cell < 4) {
    for (let layer = 0; layer < 3; layer++) {
      kanadaFlame(
        ctx,
        { x: 550 + (cell === 3 ? layer * 11 : 0), y: 334 - layer * 8 },
        radius * (1 - layer * 0.24),
        cell === 1 ? 1 : cell === 3 ? 2 : 0,
        cell * 19 + layer,
        colors[layer]!,
      );
    }
    if (cell === 3)
      kanadaFlame(ctx, { x: 540, y: 336 }, radius * 0.32, 2, 9, '#342e36');
  } else if (cell === 4) {
    for (let branch = 0; branch < 3; branch++) {
      ctx.save();
      ctx.translate(550 + (branch - 1) * radius * 0.44, 334 - radius * 0.12);
      ctx.rotate((branch - 1) * 0.83);
      for (let layer = 0; layer < 3; layer++)
        kanadaFlame(
          ctx,
          { x: 0, y: 0 },
          radius * (0.7 - layer * 0.16),
          1,
          branch * 3 + layer,
          colors[layer]!,
        );
      ctx.restore();
    }
  } else {
    const count = Math.max(2, 12 - cell);
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2 - 1.6 + cell * 0.17;
      const spread = (cell - 3) * (frame.reducedMotion ? 9 : 15);
      const center = {
        x: 550 + Math.cos(angle) * spread,
        y: 334 + Math.sin(angle) * spread - (cell - 4) * 7,
      };
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle + 1.4);
      const size = radius * (0.4 + noise(index + cell * 17) * 0.23);
      kanadaFlame(
        ctx,
        { x: 0, y: 0 },
        size,
        index % 3 === 0 ? 0 : 2,
        index + cell * 7,
        colors[0]!,
      );
      kanadaFlame(
        ctx,
        { x: 0, y: -size * 0.1 },
        size * 0.68,
        2,
        index + cell * 7,
        colors[1]!,
      );
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawAnno(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#847f7e', { x: 546, y: 407 });
  if (age < 0 || age > 2900) return;
  const motion = frame.reducedMotion ? 0.65 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  const grow = 1 - (1 - clamp(age / 700)) ** 3;
  const rise = smooth(age / 1550) * motion;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2150) / 750);
  // 접촉의 좁은 분진 기둥에서 머리와 밑동이 서로 다른 속도로 말려 나온다.
  for (let layer = 0; layer < 12; layer++) {
    const local = clamp((age - layer * 32) / (390 + layer * 31));
    const spread = (19 + layer * 7) * local;
    const x = 546 + Math.sin(layer * 2.399) * spread;
    const y = 407 - local * (26 + layer * 12) * motion - rise * layer * 6;
    const points = cloudPoints(
      x,
      y,
      (23 + layer * 3.4) * local,
      (35 + layer * 3.2) * local,
      cell * 0.19,
      layer * 3,
    );
    polygon(ctx, points, layer % 3 ? '#656166' : '#393e49');
    ctx.save();
    path(ctx, points);
    ctx.clip();
    for (let speck = 0; speck < 20; speck++) {
      const seed = layer * 67 + speck;
      const px =
        x + (noise(seed + cell * 0.07) - 0.5) * (46 + layer * 7) * local;
      const py = y + (noise(seed + 109) - 0.5) * (70 + layer * 7) * local;
      const width = 1 + noise(seed + 12) * 4.6;
      ctx.fillStyle = speck % 3 ? '#333541' : '#b7aaa0';
      ctx.fillRect(px, py, width, width * (0.6 + noise(seed + 8)));
    }
    ctx.restore();
  }
  for (let i = 0; i < 10; i++) {
    const local = clamp((age - i * 18) / 430);
    const x = 546 + (i % 2 ? 1 : -1) * (20 + i * 16) * grow;
    polygon(
      ctx,
      cloudPoints(
        x,
        407 - (i % 3) * 9,
        (20 + grow * 22) * local,
        (11 + grow * 9) * local,
        cell * 0.14,
        i,
      ),
      '#5b555d',
    );
  }
  if (age < 270) {
    const pulse = 1 - age / 270;
    polygon(
      ctx,
      [
        { x: 535, y: 407 },
        { x: 542, y: 407 - 132 * pulse },
        { x: 550, y: 407 - 82 * pulse },
        { x: 558, y: 407 },
      ],
      '#f2d4a5',
    );
  }
  for (let i = 0; i < 115; i++) {
    const angle = -Math.PI + noise(i) * Math.PI;
    const seconds = age / 1000;
    const speed = (90 + noise(i + 12) * 250) * motion;
    const x = 546 + Math.cos(angle) * speed * seconds;
    const y = 407 + Math.sin(angle) * speed * seconds + seconds * seconds * 96;
    if (y > 433) continue;
    const size = 0.7 + noise(i + 28) * 2.6;
    ctx.fillStyle = i % 4 ? '#302d39' : '#b8ac9b';
    ctx.fillRect(x, y, size, size * (0.7 + noise(i + 2) * 0.9));
  }
  ctx.restore();
}

function drawIso(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#a9aca7', { x: 548, y: 352 });
  if (age < 0 || age > 2900) return;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2300) / 600);
  const motion = frame.reducedMotion ? 0.55 : 1;
  for (let i = 0; i < 6; i++) {
    const localAge = age - i * 65;
    if (localAge < 0) continue;
    const grow = 1 - (1 - clamp(localAge / 1150)) ** 3;
    const phase = localAge / 950;
    const x =
      548 + Math.cos(i * 2.25) * 71 * grow + Math.sin(phase + i) * 14 * motion;
    const y = 352 - grow * (32 + (i % 3) * 29) * motion;
    const radius = (55 + (i % 3) * 16) * grow;
    const points = cloudPoints(
      x,
      y,
      radius * (1 + Math.sin(phase) * 0.1),
      radius * 0.91,
      phase * motion,
      i,
    );
    polygon(ctx, points, i % 2 ? '#c5c6b9' : '#aeb9b1');
    ctx.save();
    path(ctx, points);
    ctx.clip();
    ctx.fillStyle = '#344f52';
    ctx.beginPath();
    ctx.moveTo(x - radius, y + radius * 0.5);
    ctx.bezierCurveTo(
      x + radius * Math.sin(phase) * 0.5,
      y - radius * 0.8,
      x + radius * 1.3,
      y - radius * 0.25,
      x + radius * 0.5,
      y + radius * 0.6,
    );
    ctx.bezierCurveTo(
      x + radius * 0.05,
      y + radius * 0.92,
      x - radius * 0.5,
      y + radius * 0.06,
      x - radius,
      y + radius * 0.5,
    );
    ctx.fill();
    ctx.strokeStyle = '#a9beb0';
    ctx.lineWidth = Math.max(2, radius * 0.14);
    ctx.beginPath();
    ctx.arc(
      x + Math.sin(phase * 1.5) * radius * 0.24,
      y + radius * 0.05,
      radius * 0.43,
      phase * 0.7,
      phase * 0.7 + Math.PI * 1.45,
    );
    ctx.stroke();
    const turn = phase * 0.85 + i;
    const junction = {
      x: x + Math.sin(turn) * radius * 0.27,
      y: y + Math.cos(turn) * radius * 0.21,
    };
    for (let branch = 0; branch < 3; branch++) {
      const angle = turn + (branch * Math.PI * 2) / 3;
      const next = angle + 0.48;
      polygon(
        ctx,
        [
          junction,
          {
            x: x + Math.cos(angle) * radius * 0.94,
            y: y + Math.sin(angle) * radius * 0.9,
          },
          {
            x: x + Math.cos(next) * radius * 0.84,
            y: y + Math.sin(next) * radius * 0.84,
          },
        ],
        '#344f52',
      );
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawHashimoto(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#c8c8bb', { x: 548, y: 387 });
  if (age < 0 || age > 2700) return;
  const motion = frame.reducedMotion ? 0.6 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2080) / 620);
  for (let layer = 0; layer < 3; layer++)
    for (let puff = 0; puff < 5; puff++) {
      const local = age - layer * 96 - puff * 24;
      if (local < 0) continue;
      const release = smooth(local / 460);
      const drift = clamp(local / 1900);
      const x =
        548 +
        (puff - 2) * (20 + layer * 7) * release * motion +
        Math.sin(layer * 3 + puff) * drift * 14;
      const y =
        387 -
        (layer * 38 + 23) * release * motion -
        drift * (31 + layer * 21) * motion;
      const radius =
        (18 + layer * 8 + (puff % 2) * 7) * release * (1 - drift * 0.12);
      const squash = 1 - release;
      const shape = cloudPoints(
        x,
        y,
        radius * (1 + squash * 0.8),
        radius * (0.4 + release * 0.56),
        cell * 0.15,
        layer * 7 + puff,
      );
      polygon(
        ctx,
        shape,
        layer === 0 ? '#8d9996' : layer === 1 ? '#bac7b9' : '#dee1ca',
      );
      ctx.save();
      path(ctx, shape);
      ctx.clip();
      polygon(
        ctx,
        cloudPoints(
          x + radius * 0.37,
          y + radius * 0.42,
          radius * 0.8,
          radius * 0.52,
          cell * 0.17,
          puff + 2,
        ),
        layer === 0 ? '#455d66' : '#6d8985',
      );
      ctx.restore();
    }
  for (let i = 0; i < 20; i++) {
    const seconds = age / 1000;
    const x = 548 + (noise(i) - 0.5) * seconds * 310 * motion;
    const y =
      388 -
      seconds * (110 + noise(i + 6) * 155) * motion +
      seconds * seconds * 113;
    if (y > 435) continue;
    const size = (3 + noise(i + 2) * 5) * (1 - smooth((age - 1650) / 850));
    polygon(
      ctx,
      [
        { x: x - size, y },
        { x, y: y - size * 1.8 },
        { x: x + size, y: y + size * 0.2 },
        { x: x + size * 0.3, y: y + size },
      ],
      '#172430',
    );
  }
  ctx.restore();
}

function drawNorio(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#b8b4a8', { x: 548, y: 372 });
  if (age < 0 || age > 2800) return;
  const motion = frame.reducedMotion ? 0.48 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2200) / 600);
  // 모든 덩어리에 같은 면색을 쓰고, 외곽의 눌림·말림·떨어짐만 남긴다.
  for (let i = 0; i < 13; i++) {
    const local = age - (i % 4) * 58;
    if (local < 0) continue;
    const birth = smooth(local / 300);
    const life = clamp(local / (1900 + (i % 4) * 170));
    const direction = i % 2 ? 1 : -1;
    const separate = smooth((local - 540) / 1050);
    const x =
      548 +
      direction * (15 + (i % 5) * 22) * birth +
      direction * separate * (22 + i * 5) * motion;
    const y =
      372 - (12 + (i % 3) * 30) * birth - life * (15 + (i % 4) * 18) * motion;
    const radius =
      (21 + (i % 4) * 9) * birth * (1 - smooth((life - 0.72) / 0.28) * 0.54);
    const roll = Math.sin(local / 430 + i) * 0.25;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((life - 0.75) / 0.25);
    polygon(
      ctx,
      cloudPoints(
        x + roll * radius,
        y,
        radius * (1.2 - separate * 0.3),
        radius * (0.75 + separate * 0.3),
        cell * 0.13,
        i * 3,
      ),
      '#bbb8ac',
    );
    ctx.restore();
  }
  ctx.restore();
}

function drawYoshinari(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#cfae72', { x: 548, y: 325 });
  if (age < 0 || age > 2350) return;
  const p = age / 2350;
  const grow = 1 - (1 - clamp(age / 770)) ** 3;
  const scale = frame.reducedMotion ? 0.72 : 1;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((p - 0.66) / 0.34);
  polygon(
    ctx,
    cloudPoints(548, 325, 130 * grow * scale, 118 * grow * scale, p, 2),
    '#b9634e',
  );
  polygon(
    ctx,
    cloudPoints(543, 316, 105 * grow * scale, 88 * grow * scale, p + 1, 4),
    '#e6b46b',
  );
  const cell = Math.floor(age / (frame.reducedMotion ? 220 : 1000 / 12));
  for (let i = 0; i < 30; i++) {
    const local = age - (i % 6) * 51 - Math.floor(i / 6) * 48;
    if (local < 0) continue;
    const turn = local / 850 + i * 2.399;
    const travel = smooth(local / 910);
    const radius = (22 + (i % 7) * 17) * travel * scale;
    const x =
      548 +
      Math.cos(i * 2.399) * radius +
      Math.sin(turn) * (9 + (i % 3) * 3) * travel;
    const y =
      325 + Math.sin(i * 2.399) * radius * 0.75 - travel * (15 + (i % 4) * 7);
    const length =
      (17 + (i % 4) * 7) *
      smooth(local / 120) *
      (1 - smooth((local - 1420) / 850) * 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn * 0.2 + noise(i + cell) * 0.28);
    ctx.beginPath();
    ctx.moveTo(-length * 0.3, -length * 0.5);
    ctx.bezierCurveTo(
      length * 0.8,
      -length * 0.24,
      length * 0.8,
      length * 0.5,
      -length * 0.1,
      length * 0.65,
    );
    ctx.quadraticCurveTo(
      length * 0.2,
      length * 0.13,
      -length * 0.3,
      -length * 0.04,
    );
    ctx.closePath();
    ctx.fillStyle = i % 3 ? '#ffe7a7' : '#693a43';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawOki(ctx: Context, frame: Frame): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced) return simple(ctx, age, '#d58d5b', { x: 550, y: 330 });
  if (age < 0 || age > 2900) return;
  const motion = frame.reducedMotion ? 0.55 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  ctx.save();
  for (let i = 0; i < 32; i++) {
    const delay = (i % 8) * 92 + Math.floor(i / 8) * 71;
    const local = age - delay;
    const life = 1050 + (i % 4) * 150;
    if (local < 0 || local > life) continue;
    const p = local / life;
    const birth = 1 - (1 - clamp(local / (i % 8 === 0 ? 250 : 330))) ** 3;
    const collapse = 1 - smooth((p - 0.57) / 0.43);
    const angle = i * 2.399;
    const spread =
      (29 + Math.sqrt((i + 0.5) / 32) * 113) * smooth(local / 710) * motion;
    const x = 550 + Math.cos(angle) * spread;
    const y =
      330 + Math.sin(angle) * spread * 0.72 - p * (29 + (i % 4) * 12) * motion;
    // 큰 거품을 작은 거품 사이에 드물게 두어 개수보다 부풀어 오르는 부피 차이를 강조한다.
    const radius = (i % 8 === 0 ? 48 : 15 + (i % 4) * 6) * birth * collapse;
    const shape = cloudPoints(
      x,
      y,
      radius,
      radius * (0.82 + Math.sin(p * Math.PI) * 0.15),
      cell * 0.12,
      i,
    );
    polygon(ctx, shape, '#59373b');
    polygon(
      ctx,
      cloudPoints(
        x - radius * 0.12,
        y - radius * 0.13,
        radius * 0.87,
        radius * 0.77,
        cell * 0.12,
        i,
      ),
      i % 3 ? '#d48b57' : '#f2bb69',
    );
    if (radius > 9)
      polygon(
        ctx,
        cloudPoints(
          x - radius * 0.3,
          y - radius * 0.36,
          radius * 0.31,
          radius * 0.23,
          p,
          i,
        ),
        '#f8d292',
      );
  }
  ctx.restore();
}

export function drawExplosionEffects(
  ctx: Context,
  id: string,
  frame: Frame,
): boolean {
  if (id === 'fx-kanada-explosion') drawKanadaExplosion(ctx, frame);
  else if (id === 'fx-anno') drawAnno(ctx, frame);
  else if (id === 'fx-iso-explosion') drawIso(ctx, frame);
  else if (id === 'fx-hashimoto') drawHashimoto(ctx, frame);
  else if (id === 'fx-norio') drawNorio(ctx, frame);
  else if (id === 'fx-yoshinari') drawYoshinari(ctx, frame);
  else if (id === 'fx-oki') drawOki(ctx, frame);
  else return false;
  return true;
}
