import {
  drawKiSprite,
  kiSpriteFrame,
} from '../../characters/ataho-v2-combos/ki-sprites.js';
import { drawBear } from './cast.js';
import {
  segment,
  synergyBackdrop,
  synergyHero,
  synergyImpact,
  synergyLayout,
  synergyShadow,
  type SynergyPoint,
} from './action-synergy-shared.js';
import { drawContactStar } from './causal-shared.js';
import { ease, line } from './drawing.js';
import type { Context, Cut, CutFrame } from './types.js';

const hero = { x: 230, y: 600 } as const;
const origin: SynergyPoint = {
  x: hero.x + 22 * synergyLayout.heroScale,
  y: hero.y - 28 * synergyLayout.heroScale,
};
const bearScale = 2.15;
const launch = 0.64;

// stand 0의 alpha > 24 픽셀에 각 이전 접점에서 향하는 선분을 교차시킨 최초 경계다.
// 접촉 정지 중에는 같은 stand 0을 유지하고, 정지가 풀린 뒤 피격 원화로 바꾼다.
const targets = [
  {
    x: 610,
    y: 565,
    contact: { x: 502.5, y: 457.84090909090907 },
    speed: 540,
    hold: 0.05,
  },
  {
    x: 1040,
    y: 465,
    contact: { x: 930.35, y: 363.195303030303 },
    speed: 540,
    hold: 0.05,
  },
  {
    x: 815,
    y: 650,
    contact: { x: 859.1737786298925, y: 437.15 },
    speed: 340,
    hold: 0.12,
  },
] as const;

type Leg = {
  readonly from: SynergyPoint;
  readonly to: SynergyPoint;
  readonly departure: number;
  readonly contact: number;
  readonly release: number;
  readonly direction: SynergyPoint;
};

function chainLegs(): readonly Leg[] {
  let from = origin;
  let departure = launch;
  return targets.map((target) => {
    const distance = Math.hypot(
      target.contact.x - from.x,
      target.contact.y - from.y,
    );
    const contact = departure + distance / target.speed;
    const leg: Leg = {
      from,
      to: target.contact,
      departure,
      contact,
      release: contact + target.hold,
      direction: {
        x: (target.contact.x - from.x) / distance,
        y: (target.contact.y - from.y) / distance,
      },
    };
    from = target.contact;
    departure = leg.release;
    return leg;
  });
}

const legs = chainLegs();
const lastContact = legs[legs.length - 1]!.contact;

export const targetChainTiming = {
  prepare: 0.16,
  launch,
  first: legs[0]!.contact,
  second: legs[1]!.contact,
  third: lastContact,
  release: legs[2]!.release,
  settle: 3.04,
  duration: 3.4,
} as const;

function projectileAt(time: number): {
  readonly point: SynergyPoint;
  readonly direction: SynergyPoint;
} {
  const leg =
    legs.find((candidate) => time < candidate.release) ??
    legs[legs.length - 1]!;
  const progress = segment(time, leg.departure, leg.contact - leg.departure);
  return {
    point: {
      x: leg.from.x + (leg.to.x - leg.from.x) * progress,
      y: leg.from.y + (leg.to.y - leg.from.y) * progress,
    },
    direction: leg.direction,
  };
}

function drawHero(context: Context, frame: CutFrame): void {
  const time = frame.time;
  const action =
    time < targetChainTiming.prepare || time >= launch + 0.43 ? 'idle' : 'ki';
  const index = time < launch ? 0 : time < launch + 0.19 ? 1 : 2;
  synergyShadow(context, hero, 51);
  synergyHero(context, frame.assets, { ...hero, action, index });
  if (time < targetChainTiming.prepare || time >= launch) return;
  const progress = segment(
    time,
    targetChainTiming.prepare,
    launch - targetChainTiming.prepare,
  );
  drawKiSprite(context, frame.assets.effects, {
    sheet: 'orb',
    frame: kiSpriteFrame(time * 1000, {
      start: 0,
      count: 4,
      frameMs: 70,
      loop: true,
    }),
    point: {
      x: hero.x + 6 * synergyLayout.heroScale,
      y: hero.y - 22 * synergyLayout.heroScale,
    },
    width: 20 + progress * 24,
    height: 20 + progress * 24,
    alpha: progress,
  });
}

function drawTarget(context: Context, frame: CutFrame, index: number): void {
  const target = targets[index]!;
  const leg = legs[index]!;
  const final = index === targets.length - 1;
  const age = frame.time - leg.contact;
  const recoil = ease(segment(age, target.hold, final ? 0.42 : 0.24));
  const x = target.x + leg.direction.x * recoil * (final ? 57 : 22);
  const y = target.y + leg.direction.y * recoil * (final ? 32 : 13);
  const defeatStart = target.hold + (final ? 0.24 : 0.12);
  const defeated = age >= defeatStart;
  const state = age < target.hold ? 'stand' : defeated ? 'defeat' : 'hit';
  const sequence = frame.assets.bear[state];
  const phase =
    state === 'stand'
      ? 0
      : defeated
        ? segment(age, defeatStart, final ? 0.46 : 0.35)
        : segment(age, target.hold, defeatStart - target.hold);
  synergyShadow(context, { x, y }, 61, 1 - (defeated ? 0.25 : 0));
  drawBear(context, frame.assets, {
    x,
    y,
    state,
    phase,
    height: sequence[0]!.image.naturalHeight * bearScale,
    filter:
      age >= 0 && age < target.hold
        ? `brightness(${final ? 1.7 : 1.3})`
        : 'none',
  });
}

/** 각 접촉·재출발 시각을 궤적에 끼워 코너를 가로질러 지름길이 생기지 않게 한다. */
function trailTimes(time: number): readonly number[] {
  const start = Math.max(launch, time - 0.14);
  const times = Array.from(
    { length: 8 },
    (_, index) => start + ((time - start) * index) / 7,
  );
  for (const leg of legs) {
    for (const boundary of [leg.contact, leg.release]) {
      if (boundary > start && boundary < time) times.push(boundary);
    }
  }
  return times.sort((a, b) => a - b);
}

function drawProjectile(context: Context, frame: CutFrame): void {
  const time = frame.time;
  if (time < launch || time >= lastContact) return;
  const times = trailTimes(time);
  for (let index = 1; index < times.length; index++) {
    const from = projectileAt(times[index - 1]!).point;
    const to = projectileAt(times[index]!).point;
    const strength = index / times.length;
    line(
      context,
      [
        [from.x, from.y],
        [to.x, to.y],
      ],
      `rgba(169,234,203,${0.12 + strength * 0.35})`,
      2 + strength * 5,
    );
  }
  const sample = projectileAt(time);
  context.save();
  context.translate(sample.point.x, sample.point.y);
  context.rotate(Math.atan2(sample.direction.y, sample.direction.x));
  // 탄두를 접촉 판정점 뒤에만 그려 몸에 먼저 닿아 보이는 오차를 막는다.
  context.beginPath();
  context.rect(-95, -45, 95, 90);
  context.clip();
  drawKiSprite(context, frame.assets.effects, {
    sheet: 'orb',
    frame: kiSpriteFrame((time - launch) * 1000, {
      start: 4,
      count: 4,
      frameMs: 42,
      loop: true,
    }),
    point: { x: 0, y: 0 },
    width: 66,
    height: 49,
    anchorX: 0.93,
  });
  context.restore();
}

function drawTargetChain(context: Context, frame: CutFrame): void {
  synergyBackdrop(context, frame);
  // 깊이 순서와 탄의 시각은 별개다. 탄은 명중하지 않은 상대를 반응시키지 않는다.
  drawTarget(context, frame, 1);
  drawTarget(context, frame, 0);
  drawHero(context, frame);
  drawTarget(context, frame, 2);
  drawProjectile(context, frame);
  for (let index = 0; index < targets.length; index++) {
    const point = targets[index]!.contact;
    const contact = legs[index]!.contact;
    const final = index === targets.length - 1;
    drawContactStar(context, {
      point,
      age: frame.time - contact,
      size: final ? 64 : 36,
    });
    synergyImpact(context, frame, {
      point,
      contact,
      size: final ? 218 : 128,
      duration: final ? 0.24 : 0.13,
    });
  }
}

export const targetChainCut: Cut & { readonly techniques: readonly string[] } =
  {
    id: 'target-chain',
    title: '표적 연쇄탄',
    kind: '2D',
    duration: targetChainTiming.duration,
    description:
      '한 발이 이전 명중점에서 다음 표적으로 이어진다. 앞 두 타는 짧게 멈추고 작게 밀리며, 마지막 비행은 길게 읽힌 뒤 더 긴 접촉 정지와 큰 반동으로 끝난다. 세 표적은 각자 맞은 뒤 쓰러진다.',
    techniques: [
      '표적 간 연쇄',
      '연속 탄도',
      '접점 정지',
      '개별 피격',
      '끝타 강약',
      '깊이 배치',
    ],
    beats: [
      { time: 0, label: '세 표적의 삼각 배치' },
      { time: launch, label: '양손에서 기탄 한 발 발사' },
      {
        time: targetChainTiming.first,
        label: '첫 명중점에서 다음 표적으로 방향 전환',
      },
      { time: targetChainTiming.second, label: '두 번째 명중점이 다시 출발점' },
      { time: legs[2]!.departure, label: '마지막 표적까지 비행 궤적 확인' },
      { time: lastContact, label: '끝타의 긴 접촉 정지' },
      { time: targetChainTiming.release, label: '큰 반동으로 끝타 해방' },
      { time: targetChainTiming.settle, label: '세 표적의 개별 결과 확인' },
    ],
    draw: drawTargetChain,
  };
