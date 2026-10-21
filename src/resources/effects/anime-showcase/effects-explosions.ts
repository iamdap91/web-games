import { clamp, ellipse, noise, palette, polygon, smooth } from './drawing.js';
import type { Context, EffectFrame, Point } from './types.js';
import { battleLayout } from './battle.js';
import { drawEffectSprite } from './effect-sprite.js';
import {
  fireFragmentCount,
  smokeDustKey,
  smokeShadowKey,
} from './effect-material-variants.js';

export type EffectLayer = 'back' | 'front';

/** 원화의 단계만 선택하고 발생·이동·수명은 각 기법이 소유한다. */
function spriteAge(age: number, frame: EffectFrame): number {
  const frameMs = frame.reducedMotion ? 230 : 1000 / 12;
  return Math.max(0, Math.floor(age / frameMs) * frameMs);
}

function smokeKey(
  age: number,
  frame: EffectFrame,
  kind: 'smoke' | 'smoke-dark' | 'smoke-flat' | 'smoke-iso',
): string {
  const sampled = spriteAge(age, frame);
  const cell = sampled < 180 ? 0 : sampled < 550 ? 1 : sampled < 1760 ? 2 : 3;
  return `${kind}-${cell}`;
}

/** 부푼 원화는 한 번만 지나가고, 식은 말림이 갈라져 각자 퇴장한다. */
function drawAgingBubble(
  ctx: Context,
  frame: EffectFrame,
  options: {
    readonly point: Point;
    readonly age: number;
    readonly life: number;
    readonly width: number;
    readonly height: number;
    readonly rotation?: number;
    readonly opacity?: number;
  },
): void {
  const { point, age, life, width, height } = options;
  if (age < 0 || age >= life) return;
  const p = age / life;
  const sampled = spriteAge(age, frame) / life;
  const cool = smooth((p - 0.48) / 0.16);
  const bodyFade = 1 - smooth((p - 0.6) / 0.16);
  const contraction = 1 - smooth((p - 0.55) / 0.22) * 0.22;
  const opacity = options.opacity ?? 1;
  if (bodyFade > 0) {
    const body = {
      point,
      width: width * contraction,
      height: height * contraction,
      rotation: options.rotation,
    };
    drawEffectSprite(ctx, frame, {
      ...body,
      key:
        sampled < 0.16 ? 'bubble-0' : sampled < 0.4 ? 'bubble-1' : 'bubble-2',
      opacity: opacity * bodyFade * (1 - cool),
    });
    drawEffectSprite(ctx, frame, {
      ...body,
      key: 'bubble-cool',
      opacity: opacity * bodyFade * cool,
    });
  }
  const fracture = smooth((p - 0.61) / 0.39);
  const fragmentFade =
    smooth((p - 0.61) / 0.1) * (1 - smooth((p - 0.77) / 0.23));
  if (fragmentFade <= 0) return;
  const motion = frame.reducedMotion ? 0.45 : 1;
  for (let index = 0; index < fireFragmentCount; index++) {
    const direction = index === 0 ? -1 : index === 1 ? 1 : 0.15;
    const size = 0.9 - fracture * 0.52;
    drawEffectSprite(ctx, frame, {
      key: `bubble-fragment-${index}`,
      point: {
        x: point.x + direction * width * 0.3 * fracture * motion,
        y:
          point.y +
          (index === 2 ? 0.08 : index === 0 ? -0.12 : -0.2) *
            height *
            fracture *
            motion,
      },
      width: width * size,
      height: height * size,
      rotation: (options.rotation ?? 0) + direction * fracture * 0.38 * motion,
      opacity: opacity * fragmentFade,
    });
  }
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
  frame: EffectFrame,
  layer: EffectLayer,
): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, palette.gold, { x: 550, y: 334 }, layer);
  if (age < 0 || age >= 1375) return;
  const cellTime = frame.reducedMotion ? Math.floor(age / 240) * 240 : age;
  // 접촉 핵·창·큰 파열은 압축하고 갈고리·분열의 읽을 시간은 따로 남긴다.
  const ends = [35, 75, 130, 215, 300, 420, 565, 760, 960, 1160, 1375];
  const cell = ends.findIndex((end) => cellTime < end);
  // 짧은 접촉 핵과 좁은 창만 앞에 두고, 부푼 본체는 배우 뒤로 보낸다.
  if (cell < 5 && (cell < 2 ? 'front' : 'back') !== layer) return;
  const radii = [21, 84, 156, 104, 145, 117, 136, 97, 72, 45, 24];
  const radius = radii[Math.max(0, cell)]! * (frame.reducedMotion ? 0.6 : 1);
  ctx.save();
  ctx.globalAlpha *=
    (frame.reducedMotion ? 0.65 : 1) * (1 - smooth((age - 1060) / 315));
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

function drawAnno(
  ctx: Context,
  frame: EffectFrame,
  effectLayer: EffectLayer,
): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#847f7e', { x: 546, y: 407 }, effectLayer);
  if (age < 0 || age > 2900) return;
  const motion = frame.reducedMotion ? 0.65 : 1;
  const cell = Math.floor(age / (frame.reducedMotion ? 230 : 1000 / 12));
  const grow = 1 - (1 - clamp(age / 320)) ** 3;
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
  }
  // 좁은 전면 기둥 세 개와 뒤쪽 머리를 나눠 점묘가 배우 실루엣에 전부 묻히지 않게 한다.
  for (let layer = 0; layer < 12; layer++) {
    const plumeLayer =
      layer === 0 || layer === 4 || layer === 7 ? 'front' : 'back';
    if (plumeLayer !== effectLayer) continue;
    const born = age - layer * 24;
    const local = 1 - (1 - clamp(born / (180 + layer * 22))) ** 3;
    const spread = (19 + layer * 7) * local;
    const x = 546 + Math.sin(layer * 2.399) * spread;
    const y = 407 - local * (70 + layer * 16) * motion - rise * layer * 8;
    const rx = (23 + layer * 5.4) * local;
    const ry = (35 + layer * 3.2) * local;
    ctx.save();
    ctx.filter = layer % 3 ? 'none' : 'brightness(0.7)';
    drawEffectSprite(ctx, frame, {
      key: smokeDustKey(smokeKey(born, frame, 'smoke-dark'), cell + layer),
      point: { x, y },
      width: rx * 2,
      height: ry * 2,
      rotation: Math.sin(cell * 0.19 + layer) * 0.09,
    });
    ctx.restore();
  }
  if (effectLayer === 'front') {
    ctx.restore();
    return;
  }
  for (let i = 0; i < 10; i++) {
    const local = 1 - (1 - clamp((age - i * 18) / 210)) ** 3;
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

function drawIso(ctx: Context, frame: EffectFrame, layer: EffectLayer): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#a9aca7', { x: 548, y: 352 }, layer);
  if (layer !== 'back' || age < 0 || age > 2900) return;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((age - 2300) / 600);
  const motion = frame.reducedMotion ? 0.55 : 1;
  for (let i = 0; i < 6; i++) {
    const localAge = age - i * 34;
    if (localAge < 0) continue;
    // 외곽은 접촉 직후 밀려 나오고, 안쪽 암부는 기존의 느린 말림을 계속한다.
    const grow = 1 - (1 - clamp(localAge / 510)) ** 3;
    const phase = localAge / 950;
    const x =
      548 + Math.cos(i * 2.25) * 71 * grow + Math.sin(phase + i) * 14 * motion;
    const y = 352 - grow * (32 + (i % 3) * 29) * motion;
    const radius = (55 + (i % 3) * 16) * grow;
    const turn = phase * 0.85 + i;
    // 독립해서 도는 암부를 실제 몸체 알파 안에 합성한 표시 사본을 고른다.
    drawEffectSprite(ctx, frame, {
      key: smokeShadowKey(
        smokeKey(localAge, frame, 'smoke-iso'),
        Math.floor(spriteAge(localAge, frame) / 420 + i) % 4,
        turn,
      ),
      point: { x, y },
      width: radius * (1 + Math.sin(phase) * 0.1) * 2,
      height: radius * 0.91 * 2,
      rotation: Math.sin(phase * motion + i) * 0.06,
    });
  }
  ctx.restore();
}

function drawHashimoto(
  ctx: Context,
  frame: EffectFrame,
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
      // 좁은 가운데 김은 앞에, 크게 벌어지는 위층은 뒤에 두어 눌림과 상승을 함께 읽힌다.
      const puffLayer =
        (layer === 0 && (puff === 0 || puff === 2 || puff === 4)) ||
        (layer === 1 && puff === 2)
          ? 'front'
          : 'back';
      if (puffLayer !== effectLayer) continue;
      const local = age - layer * 96 - puff * 24;
      if (local < 0) continue;
      const release = 1 - (1 - clamp(local / (175 + layer * 65))) ** 3;
      const drift = clamp(local / 1900);
      const seed = layer * 7 + puff;
      const x =
        548 +
        (puff - 2) * (25 + layer * 19) * release * motion +
        Math.sin(layer * 3 + puff) * drift * 14 +
        (noise(seed + 19) - 0.5) * 19 * release * motion;
      const y =
        387 -
        (layer * 90 + 23) * release * motion -
        drift * (31 + layer * 21) * motion +
        (noise(seed + 47) - 0.5) * 25 * release * motion;
      const radius =
        (18 + layer * 13 + (puff % 2) * 7) *
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

function drawNorio(ctx: Context, frame: EffectFrame, layer: EffectLayer): void {
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
    const birth = 1 - (1 - clamp(local / 170)) ** 3;
    const life = clamp(local / (1900 + (i % 4) * 170));
    const direction = i % 2 ? 1 : -1;
    const separate = smooth((local - 420) / 950);
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

function drawYoshinari(
  ctx: Context,
  frame: EffectFrame,
  layer: EffectLayer,
): void {
  const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
  if (!frame.enhanced)
    return simple(ctx, age, '#cfae72', { x: 548, y: 325 }, layer);
  if (age < 0 || age > 2350) return;
  const p = age / 2350;
  const grow = 1 - (1 - clamp(age / 310)) ** 3;
  const scale = frame.reducedMotion ? 0.72 : 1;
  ctx.save();
  ctx.globalAlpha *= 1 - smooth((p - 0.66) / 0.34);
  if (layer === 'back')
    drawAgingBubble(ctx, frame, {
      age,
      life: 2350,
      point: { x: 548, y: 325 },
      width: 260 * grow * scale,
      height: 236 * grow * scale,
      opacity: 0.94,
    });
  const cell = Math.floor(age / (frame.reducedMotion ? 220 : 1000 / 12));
  for (let i = 0; i < 30; i++) {
    if ((i % 4 === 0 ? 'front' : 'back') !== layer) continue;
    const local = age - (i % 6) * 51 - Math.floor(i / 6) * 48;
    const life = 1180 + (i % 5) * 90;
    if (local < 0 || local >= life) continue;
    const touchLife = local / life;
    const turn = local / 850 + i * 2.399;
    const travel = 1 - (1 - clamp(local / 470)) ** 3;
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
      (1 - smooth((touchLife - 0.56) / 0.44) * 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn * 0.2 + noise(i + cell) * 0.28);
    ctx.globalAlpha *= 1 - smooth((touchLife - 0.66) / 0.34);
    if (i % 3 === 0) ctx.filter = 'brightness(0.48)';
    const touchCell = Math.min(
      2,
      Math.floor((spriteAge(local, frame) / life) * 5),
    );
    drawEffectSprite(ctx, frame, {
      key: touchLife < 0.6 ? `flame-${touchCell}` : 'flame-ember',
      point: { x: 0, y: 0 },
      width: length * 1.25,
      height: length * 1.5,
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawOki(ctx: Context, frame: EffectFrame, layer: EffectLayer): void {
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
    const delay = (i % 8) * 52 + Math.floor(i / 8) * 45;
    const local = age - delay;
    const life = 1050 + (i % 4) * 150;
    if (local < 0 || local > life) continue;
    const p = local / life;
    const birth = 1 - (1 - clamp(local / (i % 8 === 0 ? 105 : 175))) ** 3;
    const angle = i * 2.399;
    const spread =
      (29 + Math.sqrt((i + 0.5) / 32) * 113) *
      (1 - (1 - clamp(local / 370)) ** 3) *
      motion;
    const x = 550 + Math.cos(angle) * spread;
    const y =
      330 + Math.sin(angle) * spread * 0.72 - p * (29 + (i % 4) * 12) * motion;
    // 큰 거품을 작은 거품 사이에 드물게 두어 개수보다 부풀어 오르는 부피 차이를 강조한다.
    const radius = (i % 8 === 0 ? 48 : 15 + (i % 4) * 6) * birth;
    ctx.save();
    if (i % 3 === 0) ctx.filter = 'brightness(1.16)';
    drawAgingBubble(ctx, frame, {
      age: local,
      life,
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
  frame: EffectFrame,
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
