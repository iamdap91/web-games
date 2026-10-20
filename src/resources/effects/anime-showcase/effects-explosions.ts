import { clamp, ellipse, noise, palette, polygon, smooth } from './drawing.js';
import type { Context, Frame, Point } from './types.js';
import { battleLayout } from './battle.js';
import { drawEffectSprite } from './effect-sprite.js';

export type EffectLayer = 'back' | 'front';

/** 원화의 단계만 선택하고 발생·이동·수명은 각 기법이 소유한다. */
function spriteAge(age: number, frame: Frame): number {
  const frameMs = frame.reducedMotion ? 230 : 1000 / 12;
  return Math.max(0, Math.floor(age / frameMs) * frameMs);
}

function smokeKey(
  age: number,
  frame: Frame,
  kind: 'smoke' | 'smoke-dark' | 'smoke-flat' | 'smoke-iso',
): string {
  const sampled = spriteAge(age, frame);
  const cell = sampled < 180 ? 0 : sampled < 550 ? 1 : sampled < 1760 ? 2 : 3;
  return `${kind}-${cell}`;
}

function bubbleKey(age: number, life: number, frame: Frame): string {
  const cell = Math.min(3, Math.floor(clamp(spriteAge(age, frame) / life) * 4));
  return `bubble-${cell}`;
}

function simple(
  ctx: Context,
  age: number,
  color: string,
  origin: Point,
  layer: EffectLayer,
): void {
  if (layer !== 'front' || age < 0 || age > 1900) return;
  const p = age / 1900;
  ctx.save();
  ctx.globalAlpha *= Math.sin(p * Math.PI);
  ellipse(ctx, origin.x, origin.y - p * 40, 28 + p * 93, 28 + p * 93, color);
  ctx.restore();
}

function drawKanadaExplosion(
  ctx: Context,
  frame: Frame,
  layer: EffectLayer,
): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, palette.gold, { x: 550, y: 334 }, layer);
  if (age < 0 || age >= 1700) return;
  const cellTime = frame.reducedMotion ? Math.floor(age / 240) * 240 : age;
  const ends = [65, 110, 185, 260, 360, 485, 650, 900, 1180, 1460, 1700];
  const cell = ends.findIndex((end) => cellTime < end);
  // 짧은 접촉 핵과 좁은 창만 앞에 두고, 부푼 본체는 배우 뒤로 보낸다.
  if (cell < 5 && (cell < 2 ? 'front' : 'back') !== layer) return;
  const radii = [21, 84, 156, 104, 145, 117, 136, 97, 72, 45, 24];
  const radius = radii[Math.max(0, cell)]! * (frame.reducedMotion ? 0.6 : 1);
  ctx.save();
  ctx.globalAlpha *=
    (frame.reducedMotion ? 0.65 : 1) * (1 - smooth((age - 1300) / 400));
  if (cell === 0) {
    drawEffectSprite(ctx, frame, {
      key: 'light-clump',
      point: { x: 550, y: 334 },
      width: radius * 1.3,
      height: radius * 2,
    });
  } else if (cell < 4) {
    // 형상이 다른 원화를 같은 타점에서 교체해 확대만으로 폭발을 대신하지 않는다.
    drawEffectSprite(ctx, frame, {
      key:
        cell === 1 ? 'burst-spike' : cell === 2 ? 'burst-radial' : 'burst-hook',
      point: { x: 550 + (cell === 3 ? 11 : 0), y: 326 },
      width: radius * (cell === 1 ? 1.6 : 2.5),
      height: radius * (cell === 1 ? 2.7 : 2.5),
    });
  } else if (cell === 4) {
    drawEffectSprite(ctx, frame, {
      key: 'burst-split',
      point: { x: 550, y: 334 - radius * 0.12 },
      width: radius * 2.8,
      height: radius * 2.5,
    });
  } else {
    const count = Math.max(2, 12 - cell);
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2 - 1.6 + cell * 0.17;
      const spread = (cell - 3) * (frame.reducedMotion ? 9 : 15);
      const center = {
        x: 550 + Math.cos(angle) * spread,
        y: 334 + Math.sin(angle) * spread - (cell - 4) * 7,
      };
      const size = radius * (0.4 + noise(index + cell * 17) * 0.23);
      const fragmentLayer = size <= 40 && index % 4 === 1 ? 'front' : 'back';
      if (fragmentLayer !== layer) continue;
      drawEffectSprite(ctx, frame, {
        key: `flame-${Math.min(2, cell - 5 + (index % 3 === 0 ? 1 : 0))}`,
        point: center,
        width: size * 2.2,
        height: size * 2.1,
        rotation: angle + 1.4,
      });
    }
  }
  ctx.restore();
}

function drawAnno(ctx: Context, frame: Frame, effectLayer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#847f7e', { x: 546, y: 407 }, effectLayer);
  if (age < 0 || age > 2900) return;
  const motion = frame.reducedMotion ? 0.65 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  const grow = 1 - (1 - clamp(age / 700)) ** 3;
  const rise = smooth(age / 1550) * motion;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2150) / 750);
  if (effectLayer === 'front') {
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
      const y =
        407 + Math.sin(angle) * speed * seconds + seconds * seconds * 96;
      if (y > 433) continue;
      const size = 0.7 + noise(i + 28) * 2.6;
      ctx.fillStyle = i % 4 ? '#302d39' : '#b8ac9b';
      ctx.fillRect(x, y, size, size * (0.7 + noise(i + 2) * 0.9));
    }
    ctx.restore();
    return;
  }
  // 접촉의 좁은 분진 기둥에서 머리와 밑동이 서로 다른 속도로 말려 나온다.
  for (let layer = 0; layer < 12; layer++) {
    const local = clamp((age - layer * 32) / (390 + layer * 31));
    const spread = (19 + layer * 7) * local;
    const x = 546 + Math.sin(layer * 2.399) * spread;
    const y = 407 - local * (26 + layer * 12) * motion - rise * layer * 6;
    const rx = (23 + layer * 3.4) * local;
    const ry = (35 + layer * 3.2) * local;
    ctx.save();
    ctx.filter = layer % 3 ? 'none' : 'brightness(0.7)';
    drawEffectSprite(ctx, frame, {
      key: smokeKey(age - layer * 32, frame, 'smoke-dark'),
      point: { x, y },
      width: rx * 2,
      height: ry * 2,
      rotation: Math.sin(cell * 0.19 + layer) * 0.09,
    });
    ctx.restore();
    ctx.save();
    // 거친 점묘는 원화의 중심 안에만 얹어 분진이 연기 바깥을 덮지 않게 한다.
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
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
    drawEffectSprite(ctx, frame, {
      key: smokeKey(age - i * 18, frame, 'smoke-dark'),
      point: { x, y: 407 - (i % 3) * 9 },
      width: (20 + grow * 22) * local * 2,
      height: (11 + grow * 9) * local * 2,
    });
  }
  ctx.restore();
}

function drawIso(ctx: Context, frame: Frame, layer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#a9aca7', { x: 548, y: 352 }, layer);
  if (layer !== 'back' || age < 0 || age > 2900) return;
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
    drawEffectSprite(ctx, frame, {
      key: smokeKey(localAge, frame, 'smoke-iso'),
      point: { x, y },
      width: radius * (1 + Math.sin(phase) * 0.1) * 2,
      height: radius * 0.91 * 2,
      rotation: Math.sin(phase * motion + i) * 0.06,
    });
    ctx.save();
    // 외곽 원화와 다른 위상으로 암부를 돌리되 중심 부피 안에 가둔다.
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.76, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.clip();
    const turn = phase * 0.85 + i;
    drawEffectSprite(ctx, frame, {
      key: `shade-${Math.floor(spriteAge(localAge, frame) / 420 + i) % 4}`,
      point: {
        x: x + Math.sin(turn) * radius * 0.16,
        y: y + Math.cos(turn) * radius * 0.13,
      },
      width: radius * 1.55,
      height: radius * 1.5,
      rotation: turn,
      opacity: 0.88,
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawHashimoto(
  ctx: Context,
  frame: Frame,
  effectLayer: EffectLayer,
): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#c8c8bb', { x: 548, y: 387 }, effectLayer);
  if (age < 0 || age > 2700) return;
  const motion = frame.reducedMotion ? 0.6 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2080) / 620);
  if (effectLayer === 'front') {
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
  }
  for (let layer = 0; layer < 3; layer++)
    for (let puff = 0; puff < 5; puff++) {
      // 작은 밑동 두 개만 발 앞에 남겨, 뒤쪽 김이 배우에 전부 묻히지 않게 한다.
      const puffLayer =
        layer === 0 && (puff === 0 || puff === 4) ? 'front' : 'back';
      if (puffLayer !== effectLayer) continue;
      const local = age - layer * 96 - puff * 24;
      if (local < 0) continue;
      const release = smooth(local / 460);
      const drift = clamp(local / 1900);
      const seed = layer * 7 + puff;
      const x =
        548 +
        (puff - 2) * (20 + layer * 7) * release * motion +
        Math.sin(layer * 3 + puff) * drift * 14 +
        (noise(seed + 19) - 0.5) * 19 * release * motion;
      const y =
        387 -
        (layer * 38 + 23) * release * motion -
        drift * (31 + layer * 21) * motion +
        (noise(seed + 47) - 0.5) * 25 * release * motion;
      const radius =
        (18 + layer * 8 + (puff % 2) * 7) *
        release *
        (1 - drift * 0.12) *
        (0.84 + noise(seed + 73) * 0.34);
      const squash = 1 - release;
      ctx.save();
      // 바닥층의 무거운 김과 위쪽의 밝은 김은 같은 자재의 명도만 달리한다.
      ctx.filter =
        layer === 0
          ? 'brightness(0.72)'
          : layer === 1
            ? 'none'
            : 'brightness(1.2)';
      drawEffectSprite(ctx, frame, {
        key: smokeKey(local, frame, 'smoke'),
        point: { x, y },
        width: radius * (1 + squash * 0.8) * 2,
        height: radius * (0.4 + release * 0.56) * 2,
        rotation:
          Math.sin(cell * 0.15 + puff) * 0.07 +
          (noise(seed + 101) - 0.5) * 0.24,
      });
      ctx.restore();
    }
  ctx.restore();
}

function drawNorio(ctx: Context, frame: Frame, layer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#b8b4a8', { x: 548, y: 372 }, layer);
  if (layer !== 'back' || age < 0 || age > 2800) return;
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
    drawEffectSprite(ctx, frame, {
      key: smokeKey(local, frame, 'smoke-flat'),
      point: { x: x + roll * radius, y },
      width: radius * (1.2 - separate * 0.3) * 2,
      height: radius * (0.75 + separate * 0.3) * 2,
      rotation: Math.sin(cell * 0.13 + i * 3) * 0.06,
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawYoshinari(ctx: Context, frame: Frame, layer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#cfae72', { x: 548, y: 325 }, layer);
  if (age < 0 || age > 2350) return;
  const p = age / 2350;
  const grow = 1 - (1 - clamp(age / 770)) ** 3;
  const scale = frame.reducedMotion ? 0.72 : 1;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((p - 0.66) / 0.34);
  if (layer === 'back')
    drawEffectSprite(ctx, frame, {
      key: bubbleKey(age, 2350, frame),
      point: { x: 548, y: 325 },
      width: 260 * grow * scale,
      height: 236 * grow * scale,
      opacity: 0.94,
    });
  const cell = Math.floor(age / (frame.reducedMotion ? 220 : 1000 / 12));
  for (let i = 0; i < 30; i++) {
    if ((i % 4 === 0 ? 'front' : 'back') !== layer) continue;
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
    if (i % 3 === 0) ctx.filter = 'brightness(0.48)';
    const touchCell = Math.min(2, Math.floor(spriteAge(local, frame) / 640));
    drawEffectSprite(ctx, frame, {
      key: `flame-${touchCell}`,
      point: { x: 0, y: 0 },
      width: length * 1.25,
      height: length * 1.5,
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawOki(ctx: Context, frame: Frame, layer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#d58d5b', { x: 550, y: 330 }, layer);
  if (age < 0 || age > 2900) return;
  const motion = frame.reducedMotion ? 0.55 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  ctx.save();
  for (let i = 0; i < 32; i++) {
    // 큰 거품은 뒤에 남기고, 작은 거품 중 일부만 배우 앞으로 흘려보낸다.
    if ((i % 4 === 1 ? 'front' : 'back') !== layer) continue;
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
    ctx.save();
    if (i % 3 === 0) ctx.filter = 'brightness(1.16)';
    drawEffectSprite(ctx, frame, {
      key: bubbleKey(local, life, frame),
      point: { x, y },
      width: radius * 2,
      height: radius * (0.82 + Math.sin(p * Math.PI) * 0.15) * 2,
      rotation: Math.sin(cell * 0.12 + i) * 0.045,
    });
    ctx.restore();
  }
  ctx.restore();
}

export function drawExplosionEffects(
  ctx: Context,
  id: string,
  frame: Frame,
  layer: EffectLayer,
): boolean {
  if (id === 'fx-kanada-explosion') drawKanadaExplosion(ctx, frame, layer);
  else if (id === 'fx-anno') drawAnno(ctx, frame, layer);
  else if (id === 'fx-iso-explosion') drawIso(ctx, frame, layer);
  else if (id === 'fx-hashimoto') drawHashimoto(ctx, frame, layer);
  else if (id === 'fx-norio') drawNorio(ctx, frame, layer);
  else if (id === 'fx-yoshinari') drawYoshinari(ctx, frame, layer);
  else if (id === 'fx-oki') drawOki(ctx, frame, layer);
  else return false;
  return true;
}
