import {
  segment,
  synergyBackdrop,
  synergyBear,
  synergyDust,
  synergyHero,
  synergyImpact,
  synergyLayout,
  synergyShadow,
  type SynergyPoint,
} from './action-synergy-shared.js';
import { drawContactStar } from './causal-shared.js';
import {
  drawKiSprite,
  kiSpriteFrame,
} from '../../characters/ataho-v2-combos/ki-sprites.js';
import { ease, lerp, line, smooth } from './drawing.js';
import type { Context, Cut, CutFrame } from './types.js';

const clash = {
  emission: 0.42,
  meeting: 0.76,
  enemyPush: 0.92,
  brace: 1.22,
  surge: 1.42,
  breakthrough: 1.8,
  contact: 2.22,
  beamEnd: 2.4,
  landing: 2.66,
  settled: 2.95,
  heroX: 210,
  bearX: 1020,
  center: { x: 638, y: 451 },
  pressed: { x: 520, y: 460 },
  recovered: { x: 706, y: 443 },
} as const;

function pressureAt(time: number): number {
  return (
    smooth(segment(time, clash.enemyPush, clash.brace - clash.enemyPush)) *
    (1 - ease(segment(time, clash.surge, 0.16)))
  );
}

function heroRecoil(time: number): number {
  if (time < clash.emission) return 0;
  const recovery = 1 - smooth(segment(time, clash.beamEnd, 0.18));
  const brace =
    time < clash.beamEnd ? Math.sin(Math.floor(time * 24) * 2.4) * 1.1 : 0;
  const releaseRecoil = -12 * smooth(segment(time, clash.emission, 0.22));
  const counter = ease(segment(time, clash.surge, 0.16)) * 4;
  return (releaseRecoil - pressureAt(time) * 30 + counter) * recovery + brace;
}

function heroSource(frame: CutFrame): SynergyPoint {
  const sprite = frame.assets.hero.ki['south-east']![1]!;
  return {
    x:
      clash.heroX +
      heroRecoil(frame.time) +
      (70 - sprite.anchorX) * synergyLayout.heroScale,
    y: synergyLayout.ground + (52 - sprite.feetY) * synergyLayout.heroScale,
  };
}

// attack1 6번의 왼쪽 앞발에서 냉기를 쏜다. 새 입 벌림 원화로 소개하지 않는다.
const bearSource: SynergyPoint = {
  x: clash.bearX + (34 - 80) * synergyLayout.bearScale,
  y: synergyLayout.ground + (84 - 135) * synergyLayout.bearScale,
};

function clashPoint(time: number): SynergyPoint {
  if (time < clash.surge) {
    const pressure = smooth(
      segment(time, clash.enemyPush, clash.brace - clash.enemyPush),
    );
    return {
      x: lerp(clash.center.x, clash.pressed.x, pressure),
      y: lerp(clash.center.y, clash.pressed.y, pressure),
    };
  }
  if (time < clash.breakthrough) {
    const counter = ease(
      segment(time, clash.surge, clash.breakthrough - clash.surge),
    );
    return {
      x: lerp(clash.pressed.x, clash.recovered.x, counter),
      y: lerp(clash.pressed.y, clash.recovered.y, counter),
    };
  }
  const finish = segment(
    time,
    clash.breakthrough,
    clash.contact - clash.breakthrough,
  );
  return {
    x: lerp(clash.recovered.x, bearSource.x, finish * finish),
    y: lerp(clash.recovered.y, bearSource.y, finish * finish),
  };
}

/** 두 발사점에서 같은 접점까지만 그려 반대쪽 광선이 배우를 관통하지 않게 한다. */
function drawStream(
  context: Context,
  frame: CutFrame,
  source: SynergyPoint,
  end: SynergyPoint,
  cold: boolean,
  strength: number,
): void {
  const distance = Math.hypot(end.x - source.x, end.y - source.y);
  if (distance < 1 || strength <= 0) return;
  const age = frame.time - clash.emission;
  context.save();
  context.translate(source.x, source.y);
  context.rotate(Math.atan2(end.y - source.y, end.x - source.x));
  const pulse = 1 + Math.sin(Math.floor(age * 24) * 2.2) * 0.09;
  const counter = smooth(segment(frame.time, clash.surge, 0.18));
  const power = cold
    ? 1 + pressureAt(frame.time) * 0.35 - counter * 0.1
    : 1 - pressureAt(frame.time) * 0.23 + counter * 0.3;
  const radius = (cold ? 18 : 23) * pulse * strength * power;
  const points: [number, number][] = [[0, -radius * 0.28]];
  const steps = Math.max(2, Math.ceil(distance / 24));
  for (let index = 1; index <= steps; index++) {
    const x = (index / steps) * distance;
    const ripple = Math.sin(index * 2.7 + Math.floor(age * 24)) * 0.2;
    points.push([x, -radius * (0.65 + (index / steps) * 0.35 + ripple)]);
  }
  for (let index = steps; index >= 1; index--) {
    points.push([
      (index / steps) * distance,
      radius * (0.7 + (index / steps) * 0.3),
    ]);
  }
  points.push([0, radius * 0.28]);
  context.beginPath();
  points.forEach(([x, y], index) =>
    index ? context.lineTo(x, y) : context.moveTo(x, y),
  );
  context.closePath();
  context.fillStyle = cold ? '#4cacf0' : '#f2a53b';
  context.fill();
  context.beginPath();
  context.moveTo(0, -radius * 0.1);
  context.lineTo(distance, -radius * 0.45);
  context.lineTo(distance, radius * 0.45);
  context.lineTo(0, radius * 0.1);
  context.fillStyle = cold ? '#dbf8ff' : '#fff7d4';
  context.fill();
  // 기존 기공 그림을 흐르는 마디로 겹치고 선단은 같은 접점에서 자른다.
  context.beginPath();
  context.rect(0, -radius * 2, distance, radius * 4);
  context.clip();
  context.filter = cold ? 'none' : 'sepia(1) saturate(3)';
  for (let index = 0; index < 4; index++) {
    const fraction = (((age * 2.8 + index / 4) % 1) + 1) % 1;
    drawKiSprite(context, frame.assets.effects, {
      sheet: 'beam',
      frame: kiSpriteFrame(age * 1000 + index * 41, {
        start: 4,
        count: 4,
        frameMs: 50,
        loop: true,
      }),
      point: { x: fraction * distance, y: 0 },
      width: Math.min(100, distance * 0.3),
      height: radius * 2.7,
      alpha: cold ? 0.25 : 0.65,
    });
  }
  context.restore();
}

function drawCore(
  context: Context,
  frame: CutFrame,
  point: SynergyPoint,
): void {
  const age = frame.time - clash.meeting;
  if (age < 0 || frame.time >= clash.contact) return;
  const pulse = 1 + Math.sin(Math.floor(age * 24) * 2.4) * 0.11;
  context.save();
  context.translate(point.x, point.y);
  context.scale(pulse, pulse);
  for (let index = 0; index < 10; index++) {
    const angle = (index * Math.PI) / 5 + Math.floor(age * 12) * 0.17;
    line(
      context,
      [
        [Math.cos(angle) * 20, Math.sin(angle) * 32],
        [Math.cos(angle + 0.1) * 48, Math.sin(angle + 0.1) * 61],
        [Math.cos(angle) * 65, Math.sin(angle) * 82],
      ],
      index % 2 ? '#9be7ff' : '#ffd37c',
      3,
    );
  }
  context.fillStyle = '#fffce5';
  context.beginPath();
  context.ellipse(0, 0, 23, 49, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export const beamClashCut: Cut & { readonly techniques: readonly string[] } = {
  id: 'beam-clash',
  title: '쌍기 격돌',
  kind: '2D',
  duration: 3.25,
  description:
    '중앙에서 부딪힌 냉기가 황금 기공을 밀어 아타호를 뒤로 끌고 간다. 낮게 버틴 뒤 굵어진 기공으로 접점을 되밀고, 마지막 가속이 상대 앞발에 닿으면 냉기가 끊기며 곰왕이 방출된다.',
  techniques: [
    '양방향 기공',
    '압력 역전',
    '버팀·재분출',
    '접점 전진',
    '압도·방출',
  ],
  beats: [
    { time: 0.18, label: '양쪽 장전 · 같은 공격선' },
    { time: clash.emission, label: '서로 향하는 두 기공' },
    { time: clash.meeting, label: '중앙 충돌 · 대치 시작' },
    { time: clash.enemyPush, label: '냉기 우세 · 아타호 쪽으로 밀림' },
    { time: clash.brace, label: '밀림 끝 · 낮게 버팀' },
    { time: clash.surge, label: '재분출 · 압력 역전' },
    { time: clash.breakthrough, label: '중앙 탈환 · 끝 밀어내기 가속' },
    { time: clash.contact, label: '앞발 명중 · 냉기 붕괴' },
    { time: clash.landing, label: '방출 뒤 착지' },
    { time: clash.settled, label: '회수 · 종결' },
  ],
  draw(context, frame) {
    const time = frame.time;
    const hitAge = time - clash.contact;
    const release = ease(segment(time, clash.contact + 0.045, 0.3));
    const bearX = clash.bearX + release * 80;
    const lift =
      time < clash.landing && hitAge > 0
        ? Math.sin(
            segment(time, clash.contact, clash.landing - clash.contact) *
              Math.PI,
          ) * 24
        : 0;
    const shake =
      time >= clash.meeting && time < clash.contact
        ? 2
        : hitAge >= 0 && hitAge < 0.15
          ? 5 * (1 - hitAge / 0.15)
          : 0;
    context.save();
    context.translate(Math.sin(Math.floor(time * 30) * 2.7) * shake, 0);
    synergyBackdrop(context, frame);
    context.fillStyle = `rgba(9,20,34,${0.12 * segment(time, clash.emission, 0.2) * (1 - segment(time, clash.beamEnd, 0.25))})`;
    context.fillRect(0, 0, 1280, 720);
    const heroX = clash.heroX + heroRecoil(time);
    synergyShadow(context, { x: heroX, y: synergyLayout.ground }, 64);
    synergyShadow(context, { x: bearX, y: synergyLayout.ground }, 105);
    synergyHero(context, frame.assets, {
      action: 'ki',
      index: time < clash.emission ? 0 : time < clash.beamEnd ? 1 : 2,
      x: heroX,
    });
    synergyBear(context, frame, {
      x: bearX,
      y: synergyLayout.ground - lift,
      state: hitAge < 0 ? 'attack' : hitAge < 0.18 ? 'hit' : 'defeat',
      index:
        hitAge < 0
          ? time < clash.emission
            ? Math.floor(segment(time, 0.04, 0.38) * 6)
            : 6
          : hitAge < 0.18
            ? 2
            : Math.min(
                7,
                2 + Math.floor(segment(time, clash.contact + 0.18, 0.4) * 6),
              ),
    });
    if (time >= clash.emission && time < clash.beamEnd) {
      const source = heroSource(frame);
      const meeting = clashPoint(time);
      const grow = segment(
        time,
        clash.emission,
        clash.meeting - clash.emission,
      );
      const heroEnd = {
        x: lerp(source.x, meeting.x, grow),
        y: lerp(source.y, meeting.y, grow),
      };
      const bearEnd = {
        x: lerp(bearSource.x, meeting.x, grow),
        y: lerp(bearSource.y, meeting.y, grow),
      };
      const tail =
        1 -
        segment(
          time,
          clash.contact + 0.05,
          clash.beamEnd - clash.contact - 0.05,
        );
      drawStream(context, frame, source, heroEnd, false, tail);
      if (time < clash.contact)
        drawStream(context, frame, bearSource, bearEnd, true, 1);
      drawCore(context, frame, meeting);
    }
    drawContactStar(context, {
      point: clash.center,
      age: time - clash.meeting,
      size: 105,
    });
    synergyImpact(context, frame, {
      point: bearSource,
      contact: clash.contact,
      size: 290,
      duration: 0.23,
    });
    synergyDust(context, frame, {
      x: bearX,
      contact: clash.landing,
      size: 240,
    });
    synergyDust(context, frame, {
      x: clash.heroX - 35,
      contact: clash.enemyPush + 0.08,
      size: 150,
      duration: 0.32,
    });
    synergyDust(context, frame, {
      x: clash.heroX - 45,
      contact: clash.surge,
      size: 125,
      duration: 0.23,
    });
    context.restore();
  },
};
