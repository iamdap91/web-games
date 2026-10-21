import {
  drawKiSprite,
  kiSpriteFrame,
} from '../../characters/ataho-v2-combos/ki-sprites.js';
import {
  directionalKick,
  segment,
  synergyBear,
  synergyHero,
  synergyImpact,
  synergyLayout,
  synergyShadow,
  type SynergyPoint,
  type SynergyPose,
} from './action-synergy-shared.js';
import { gameDust } from '../../cutscenes/game-effects.js';
import { drawContactStar, drawStoneWall } from './causal-shared.js';
import { clamp, ease, lerp, line, smooth } from './drawing.js';
import type { CutAssets } from './assets.js';
import type { Camera, Context, Cut, CutFrame } from './types.js';

const origin: SynergyPoint = { x: 405, y: 280 };
const wallContact: SynergyPoint = { x: 1070, y: 250 };
const targetContact: SynergyPoint = { x: 814, y: 456 };
const target = { x: 680, y: 645 } as const;
const speed = 1180;
const firstDistance = Math.hypot(
  wallContact.x - origin.x,
  wallContact.y - origin.y,
);
const secondDistance = Math.hypot(
  targetContact.x - wallContact.x,
  targetContact.y - wallContact.y,
);
const incoming = {
  x: (wallContact.x - origin.x) / firstDistance,
  y: (wallContact.y - origin.y) / firstDistance,
};
const outgoing = {
  x: (targetContact.x - wallContact.x) / secondDistance,
  y: (targetContact.y - wallContact.y) / secondDistance,
};
// 반사 법선은 두 단위 진행 벡터의 차이이며, 그림의 벽면도 같은 접선에 둔다.
const normalLength = Math.hypot(
  incoming.x - outgoing.x,
  incoming.y - outgoing.y,
);
const normal = {
  x: (incoming.x - outgoing.x) / normalLength,
  y: (incoming.y - outgoing.y) / normalLength,
};
const tangent = { x: -normal.y, y: normal.x };
const wallTop = {
  x: wallContact.x - tangent.x * 155,
  y: wallContact.y - tangent.y * 155,
};
const wallBottom = {
  x: wallContact.x + tangent.x * 330,
  y: wallContact.y + tangent.y * 330,
};
const wallFace: readonly SynergyPoint[] = [
  wallTop,
  { x: wallTop.x + normal.x * 84, y: wallTop.y + normal.y * 84 },
  { x: wallBottom.x + normal.x * 84, y: wallBottom.y + normal.y * 84 },
  wallBottom,
];

export const ricochetTiming = {
  prepare: 0.22,
  thrust: 0.475,
  launch: 0.54,
  bounce: 0.54 + firstDistance / speed,
  contact: 0.54 + (firstDistance + secondDistance) / speed,
  release: 0.54 + (firstDistance + secondDistance) / speed + 0.055,
  settle: 2.06,
  duration: 2.55,
} as const;

const camera: Camera = {
  position: { x: 0, y: 4.5, z: 12 },
  target: { x: 0, y: 1.5, z: 0 },
  focal: 900,
};

/** 정속인 두 직선을 접점에서 이어 반사 순간에도 위치와 속력이 연속되게 한다. */
function projectilePoint(time: number): SynergyPoint {
  if (time < ricochetTiming.bounce) {
    const distance =
      clamp(((time - ricochetTiming.launch) * speed) / firstDistance) *
      firstDistance;
    return {
      x: origin.x + incoming.x * distance,
      y: origin.y + incoming.y * distance,
    };
  }
  const distance =
    clamp(((time - ricochetTiming.bounce) * speed) / secondDistance) *
    secondDistance;
  return {
    x: wallContact.x + outgoing.x * distance,
    y: wallContact.y + outgoing.y * distance,
  };
}

function pan(time: number): SynergyPoint {
  if (time < ricochetTiming.launch) return { x: 0, y: 0 };
  const point = projectilePoint(Math.min(time, ricochetTiming.contact));
  const track = smooth(segment(time, ricochetTiming.launch, 0.13));
  const returnWide =
    1 - smooth(segment(time, ricochetTiming.contact + 0.18, 0.45));
  return {
    x: -(point.x - origin.x) * 0.4 * track * returnWide,
    y: -(point.y - origin.y) * 0.22 * track * returnWide,
  };
}

function heroPose(assets: CutAssets, time: number): SynergyPose {
  const hand = assets.hero.punch['south-east']![12]!;
  // 기존 스트레이트 원화의 손끝에 발사 원점을 맞춰 기탄이 다른 곳에서 생기지 않게 한다.
  const x = origin.x - (72 - hand.anchorX) * synergyLayout.heroScale;
  const y = origin.y - (48 - hand.feetY) * synergyLayout.heroScale;
  if (time < ricochetTiming.prepare)
    return { action: 'idle', index: 0, x: x - 12, y };
  if (time < ricochetTiming.thrust) {
    const progress = segment(
      time,
      ricochetTiming.prepare,
      ricochetTiming.thrust - ricochetTiming.prepare,
    );
    return {
      action: 'punch',
      index: 9 + Math.min(2, Math.floor(progress * 3)),
      x: x - 12,
      y,
    };
  }
  if (time < ricochetTiming.launch + 0.1) {
    const progress = segment(
      time,
      ricochetTiming.thrust,
      ricochetTiming.launch - ricochetTiming.thrust,
    );
    return {
      action: 'punch',
      index: progress < 0.4 ? 11 : 12,
      x: lerp(x - 12, x, progress),
      y,
    };
  }
  const recover = segment(time, ricochetTiming.launch + 0.1, 0.24);
  return {
    action: 'punch',
    index: 13 + Math.min(3, Math.floor(recover * 4)),
    x,
    y,
  };
}

function drawTarget(context: Context, frame: CutFrame): void {
  const age = frame.time - ricochetTiming.release;
  const recoil = ease(segment(frame.time, ricochetTiming.release, 0.3));
  const x = target.x + outgoing.x * recoil * 158;
  synergyShadow(context, { x, y: target.y }, 89);
  const defeated = age >= 0.27;
  synergyBear(context, frame, {
    x,
    y: target.y - Math.sin(recoil * Math.PI) * 18,
    state:
      frame.time < ricochetTiming.contact
        ? 'stand'
        : defeated
          ? 'defeat'
          : 'hit',
    index:
      frame.time < ricochetTiming.contact
        ? undefined
        : defeated
          ? Math.floor(
              segment(age, 0.27, 0.35) * (frame.assets.bear.defeat.length - 1),
            )
          : Math.floor(
              segment(age, 0, 0.22) * (frame.assets.bear.hit.length - 1),
            ),
  });
}

/** 미래 경로 대신 현재 시각에서 직전 0.14초의 통과 위치만 남긴다. */
function drawProjectile(context: Context, frame: CutFrame): void {
  const { time } = frame;
  if (time < ricochetTiming.launch || time >= ricochetTiming.contact) return;
  for (let index = 7; index > 0; index--) {
    const sampleTime = Math.max(ricochetTiming.launch, time - index * 0.02);
    const nextTime = Math.max(ricochetTiming.launch, time - (index - 1) * 0.02);
    const a = projectilePoint(sampleTime);
    const b = projectilePoint(nextTime);
    // 접점을 지나는 짧은 구간도 둘로 나눠 모서리를 가로지르는 잔상을 막는다.
    const points: readonly (readonly [number, number])[] =
      sampleTime < ricochetTiming.bounce && nextTime > ricochetTiming.bounce
        ? [
            [a.x, a.y],
            [wallContact.x, wallContact.y],
            [b.x, b.y],
          ]
        : [
            [a.x, a.y],
            [b.x, b.y],
          ];
    line(
      context,
      points,
      `rgba(180,236,205,${0.08 + (7 - index) * 0.045})`,
      3 + (7 - index) * 0.7,
    );
  }
  const point = projectilePoint(time);
  const direction = time < ricochetTiming.bounce ? incoming : outgoing;
  context.save();
  context.translate(point.x, point.y);
  context.rotate(Math.atan2(direction.y, direction.x));
  // 판정점보다 그림이 앞서면 벽·상대에 먼저 닿아 보이므로 선두에서 자른다.
  context.beginPath();
  context.rect(-100, -50, 100, 100);
  context.clip();
  drawKiSprite(context, frame.assets.effects, {
    sheet: 'orb',
    frame: kiSpriteFrame((time - ricochetTiming.launch) * 1000, {
      start: 4,
      count: 4,
      frameMs: 42,
      loop: true,
    }),
    point: { x: 0, y: 0 },
    width: 71,
    height: 53,
    anchorX: 0.93,
  });
  context.restore();
}

function drawRicochet(context: Context, frame: CutFrame): void {
  const shift = pan(frame.time);
  const impactAge = frame.time - ricochetTiming.release;
  const kick = directionalKick(impactAge, 11, 0.13);
  const shiftX = shift.x + outgoing.x * kick;
  const shiftY = shift.y + outgoing.y * kick;
  // 배경 투영창과 배우 좌표에 같은 PAN을 적용해 가장자리 빈틈과 배경 정지를 막는다.
  frame.surfaces.stage.background(context, 'arena', camera, frame.time, {
    viewOffsetX: -shiftX,
    principalY: 360 + shiftY,
  });
  context.save();
  context.translate(shiftX, shiftY);
  synergyShadow(
    context,
    { x: wallBottom.x + normal.x * 35, y: wallBottom.y },
    72,
  );
  drawStoneWall(context, frame, {
    face: wallFace,
    depth: 27,
    contact: wallContact,
    crack: segment(frame.time, ricochetTiming.bounce, 0.06),
  });
  const pose = heroPose(frame.assets, frame.time);
  synergyShadow(context, { x: pose.x, y: pose.y ?? synergyLayout.ground }, 57);
  synergyHero(context, frame.assets, pose);
  drawTarget(context, frame);
  drawProjectile(context, frame);
  drawContactStar(context, {
    point: wallContact,
    age: frame.time - ricochetTiming.bounce,
    size: 56,
  });
  synergyImpact(context, frame, {
    point: targetContact,
    contact: ricochetTiming.contact,
    size: 190,
    duration: 0.16,
  });
  gameDust(context, frame.assets.effects, {
    x: target.x + outgoing.x * 158,
    y: target.y,
    progress: (frame.time - ricochetTiming.release - 0.3) / 0.25,
    size: 210,
  });
  context.restore();
}

export const ricochetCut: Cut & { readonly techniques: readonly string[] } = {
  id: 'causal-ricochet',
  title: '지형 도탄',
  kind: '2D',
  duration: ricochetTiming.duration,
  description:
    '상대 위로 비껴 쏜 한 발이 기울어진 돌벽에서 반사되어 곰왕의 오른쪽 몸통을 친다. 같은 속도의 직선 탄도와 벽면 각도, 접점 별빛, 따라가는 PAN으로 지형이 명중 방향을 바꾸는 원인을 드러낸다.',
  techniques: [
    '지형 반사',
    '경로 궤적',
    '따라가는 PAN',
    '접점 섬광',
    '방향성 피격',
  ],
  beats: [
    { time: 0, label: '발사자·벽·전경 표적 배치' },
    {
      time: ricochetTiming.launch,
      label: '스트레이트 손끝에서 기탄 한 발 발사',
    },
    { time: ricochetTiming.bounce, label: '돌벽 실제 면에서 반사' },
    { time: ricochetTiming.contact, label: '돌아온 탄이 오른쪽 몸통 명중' },
    { time: ricochetTiming.settle, label: '넓은 구도로 벽 자국과 결과 확인' },
  ],
  draw: drawRicochet,
};
