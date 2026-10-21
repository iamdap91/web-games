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
import { drawContactStar } from './causal-shared.js';
import { clamp, ease, lerp, line, smooth } from './drawing.js';
import type { CutAssets } from './assets.js';
import type { Camera, Context, Cut, CutFrame } from './types.js';

const origin: SynergyPoint = { x: 405, y: 360 };
const receivePoint: SynergyPoint = { x: 600, y: 480 };
const outgoingControls: readonly SynergyPoint[] = [
  origin,
  { x: 745, y: 350 },
  { x: 1160, y: 402 },
  { x: 1100, y: 410 },
];
const target = { x: 800, y: 585 } as const;
const firstHitProgress = 0.28;
// 첫 반동 뒤 대기 1번 원화의 오른팔 알파 경계는 논리 x=135다.
// 고정 발 뿌리(840,585)·3배율에서 귀로가 처음 닿는 면 x=1005를 사용한다.
const secondHitProgress = 0.19;
const returnInitialRate = 0.2;

function outgoingPoint(progress: number): SynergyPoint {
  const t = clamp(progress);
  const a = outgoingControls[0]!;
  const b = outgoingControls[1]!;
  const c = outgoingControls[2]!;
  const d = outgoingControls[3]!;
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * a.x +
      3 * inverse ** 2 * t * b.x +
      3 * inverse * t ** 2 * c.x +
      t ** 3 * d.x,
    y:
      inverse ** 3 * a.y +
      3 * inverse ** 2 * t * b.y +
      3 * inverse * t ** 2 * c.y +
      t ** 3 * d.y,
  };
}

const turnPoint = outgoingControls[3]!;
const firstContact = outgoingPoint(firstHitProgress);
const secondContact = {
  x: lerp(turnPoint.x, receivePoint.x, secondHitProgress),
  y: lerp(turnPoint.y, receivePoint.y, secondHitProgress),
};
// 귀로는 선회 끝의 느린 속도에서 가속하며, 접촉 시각도 같은 보간식을 역산한다.
const secondHitPhase =
  (-returnInitialRate +
    Math.sqrt(
      returnInitialRate ** 2 + 4 * (1 - returnInitialRate) * secondHitProgress,
    )) /
  (2 * (1 - returnInitialRate));

export const projectileReturnTiming = {
  prepare: 0.17,
  thrust: 0.43,
  launch: 0.5,
  firstContact: 0.5 + 1.15 * firstHitProgress,
  firstHold: 0.035,
  reposition: 1.28,
  arrive: 1.86,
  turn: 1.65,
  secondContact: 1.65 + 0.65 * secondHitPhase,
  secondHold: 0.045,
  receivePrepare: 2.16,
  receive: 2.3,
  settle: 2.8,
  duration: 3.1,
} as const;

const camera: Camera = {
  position: { x: 0, y: 4.5, z: 12 },
  target: { x: 0, y: 1.5, z: 0 },
  focal: 900,
};

/** 달리는 발 뿌리와 회수할 손 위치를 같은 이동량으로 옮긴다. */
function receiverPoint(time: number): SynergyPoint {
  const phase = smooth(
    segment(
      time,
      projectileReturnTiming.reposition,
      projectileReturnTiming.arrive - projectileReturnTiming.reposition,
    ),
  );
  return {
    x: lerp(origin.x, receivePoint.x, phase),
    y: lerp(origin.y, receivePoint.y, phase),
  };
}

/** 같은 한 발의 선두를 가는 길·선회·이동한 손끝까지 끊김 없이 잇는다. */
function projectilePoint(time: number): SynergyPoint {
  if (time <= projectileReturnTiming.turn) {
    return outgoingPoint(
      segment(
        time,
        projectileReturnTiming.launch,
        projectileReturnTiming.turn - projectileReturnTiming.launch,
      ),
    );
  }
  const phase = segment(
    time,
    projectileReturnTiming.turn,
    projectileReturnTiming.receive - projectileReturnTiming.turn,
  );
  const progress =
    returnInitialRate * phase + (1 - returnInitialRate) * phase ** 2;
  const receiver = receiverPoint(time);
  const receiverAtTurn = receiverPoint(projectileReturnTiming.turn);
  const returnDuration =
    projectileReturnTiming.receive - projectileReturnTiming.turn;
  const outgoingDuration =
    projectileReturnTiming.turn - projectileReturnTiming.launch;
  const lastControl = outgoingControls[2]!;
  const settlePhase =
    (projectileReturnTiming.arrive - projectileReturnTiming.turn) /
    returnDuration;
  // 이동 중 목표를 따라가되, 선회 전후 접선 속도를 보존한다.
  // 보정은 도착 전에 매끈하게 0이 되어 검증한 두 번째 접점을 바꾸지 않는다.
  const joinWeight =
    phase < settlePhase ? phase * (1 - phase / settlePhase) ** 2 : 0;
  const joinX =
    ((turnPoint.x - lastControl.x) * 3 * returnDuration) / outgoingDuration -
    returnInitialRate * (receiverAtTurn.x - turnPoint.x);
  const joinY =
    ((turnPoint.y - lastControl.y) * 3 * returnDuration) / outgoingDuration -
    returnInitialRate * (receiverAtTurn.y - turnPoint.y);
  return {
    x: lerp(turnPoint.x, receiver.x, progress) + joinX * joinWeight,
    y: lerp(turnPoint.y, receiver.y, progress) + joinY * joinWeight,
  };
}

function handRoot(assets: CutAssets, point: SynergyPoint): SynergyPoint {
  const sprite = assets.hero.punch['south-east']![12]!;
  return {
    x: point.x - (72 - sprite.anchorX) * synergyLayout.heroScale,
    y: point.y - (48 - sprite.feetY) * synergyLayout.heroScale,
  };
}

function heroPose(assets: CutAssets, time: number): SynergyPose {
  const start = handRoot(assets, origin);
  const finish = handRoot(assets, receivePoint);
  if (time < projectileReturnTiming.prepare)
    return { action: 'idle', index: 0, ...start };
  if (time < projectileReturnTiming.thrust) {
    const phase = segment(time, projectileReturnTiming.prepare, 0.26);
    return {
      action: 'punch',
      index: 9 + Math.min(2, Math.floor(phase * 3)),
      ...start,
    };
  }
  if (time < projectileReturnTiming.launch + 0.12)
    return { action: 'punch', index: 12, ...start };
  if (time < projectileReturnTiming.launch + 0.37) {
    const phase = segment(time, projectileReturnTiming.launch + 0.12, 0.25);
    return {
      action: 'punch',
      index: 13 + Math.min(3, Math.floor(phase * 4)),
      ...start,
    };
  }
  if (time < projectileReturnTiming.reposition)
    return { action: 'idle', index: 0, ...start };
  if (time < projectileReturnTiming.arrive) {
    return {
      action: 'run',
      index: Math.floor((time - projectileReturnTiming.reposition) * 13) % 4,
      ...handRoot(assets, receiverPoint(time)),
    };
  }
  if (time < projectileReturnTiming.receivePrepare)
    return { action: 'idle', index: 0, ...finish };
  if (time < projectileReturnTiming.receive - 0.04) {
    const phase = segment(time, projectileReturnTiming.receivePrepare, 0.1);
    return {
      action: 'punch',
      index: 9 + Math.min(2, Math.floor(phase * 3)),
      ...finish,
    };
  }
  if (time < projectileReturnTiming.receive + 0.08)
    return { action: 'punch', index: 12, ...finish };
  if (time < projectileReturnTiming.receive + 0.36) {
    const phase = segment(time, projectileReturnTiming.receive + 0.08, 0.28);
    return {
      action: 'punch',
      index: 13 + Math.min(3, Math.floor(phase * 4)),
      ...finish,
    };
  }
  return { action: 'idle', index: 0, ...finish };
}

function drawTarget(context: Context, frame: CutFrame): void {
  const { time } = frame;
  const firstRecoil = ease(
    segment(
      time,
      projectileReturnTiming.firstContact + projectileReturnTiming.firstHold,
      0.25,
    ),
  );
  const secondRecoil = ease(
    segment(
      time,
      projectileReturnTiming.secondContact + projectileReturnTiming.secondHold,
      0.3,
    ),
  );
  const x = target.x + firstRecoil * 40 - secondRecoil * 118;
  const secondAge = time - projectileReturnTiming.secondContact;
  const firstAge = time - projectileReturnTiming.firstContact;
  const contactHold =
    secondAge >= 0 && secondAge < projectileReturnTiming.secondHold
      ? projectileReturnTiming.secondContact
      : firstAge >= 0 && firstAge < projectileReturnTiming.firstHold
        ? projectileReturnTiming.firstContact
        : undefined;
  const defeated = secondAge >= 0.22;
  const hit = secondAge >= 0 || (firstAge >= 0 && firstAge < 0.42);
  synergyShadow(context, { x, y: target.y }, 89);
  synergyBear(context, frame, {
    x,
    y: target.y + Math.sin(secondRecoil * Math.PI) * 12,
    state:
      contactHold !== undefined
        ? 'stand'
        : defeated
          ? 'defeat'
          : hit
            ? 'hit'
            : 'stand',
    filter: contactHold !== undefined ? 'brightness(1.4)' : undefined,
    // 짧은 힘 받기에는 접촉 직전 외곽을 보존하고, 방출에서 피격 원화로 바꾼다.
    index:
      contactHold !== undefined
        ? Math.floor(contactHold * 0.7 * frame.assets.bear.stand.length) %
          frame.assets.bear.stand.length
        : defeated
          ? Math.floor(
              segment(secondAge, 0.22, 0.48) *
                (frame.assets.bear.defeat.length - 1),
            )
          : hit
            ? Math.min(
                frame.assets.bear.hit.length - 1,
                Math.floor(
                  Math.max(0, secondAge >= 0 ? secondAge : firstAge) * 12,
                ),
              )
            : undefined,
  });
}

function drawProjectile(context: Context, frame: CutFrame): void {
  const { time } = frame;
  if (
    time < projectileReturnTiming.launch ||
    time >= projectileReturnTiming.receive
  )
    return;
  // 아직 지나지 않은 경로를 보이지 않고 같은 탄의 직전 위치만 남긴다.
  for (let index = 8; index > 0; index--) {
    const sampleTime = Math.max(
      projectileReturnTiming.launch,
      time - index * 0.022,
    );
    const nextTime = Math.max(
      projectileReturnTiming.launch,
      time - (index - 1) * 0.022,
    );
    const a = projectilePoint(sampleTime);
    const b = projectilePoint(nextTime);
    line(
      context,
      [
        [a.x, a.y],
        [b.x, b.y],
      ],
      `rgba(182,244,211,${0.05 + (8 - index) * 0.045})`,
      3 + (8 - index) * 0.6,
    );
  }
  const point = projectilePoint(time);
  const before = projectilePoint(time - 0.006);
  const after = projectilePoint(time + 0.006);
  context.save();
  context.translate(point.x, point.y);
  context.rotate(Math.atan2(after.y - before.y, after.x - before.x));
  // 선두와 접촉 시각을 맞춰 명중 전에 원화 끝이 먼저 닿아 보이지 않게 한다.
  context.beginPath();
  context.rect(-100, -50, 100, 100);
  context.clip();
  drawKiSprite(context, frame.assets.effects, {
    sheet: 'orb',
    frame: kiSpriteFrame((time - projectileReturnTiming.launch) * 1000, {
      start: 4,
      count: 4,
      frameMs: 46,
      loop: true,
    }),
    point: { x: 0, y: 0 },
    width: 76,
    height: 56,
    anchorX: 0.93,
  });
  context.restore();
}

function drawProjectileReturn(context: Context, frame: CutFrame): void {
  const firstKick = directionalKick(
    frame.time - projectileReturnTiming.firstContact,
    5,
  );
  const secondKick = directionalKick(
    frame.time - projectileReturnTiming.secondContact,
    9,
  );
  const shiftX = firstKick - secondKick;
  frame.surfaces.stage.background(context, 'arena', camera, frame.time, {
    viewOffsetX: -shiftX,
  });
  context.save();
  context.translate(shiftX, 0);
  const pose = heroPose(frame.assets, frame.time);
  synergyShadow(context, { x: pose.x, y: pose.y ?? synergyLayout.ground }, 57);
  drawTarget(context, frame);
  synergyHero(context, frame.assets, pose);
  drawProjectile(context, frame);
  synergyImpact(context, frame, {
    point: firstContact,
    contact: projectileReturnTiming.firstContact,
    size: 145,
    duration: 0.13,
  });
  synergyImpact(context, frame, {
    point: secondContact,
    contact: projectileReturnTiming.secondContact,
    size: 205,
    duration: 0.17,
  });
  drawContactStar(context, {
    point: receivePoint,
    age: frame.time - projectileReturnTiming.receive,
    size: 48,
  });
  gameDust(context, frame.assets.effects, {
    x: target.x + 40 - 118,
    y: target.y,
    progress: (frame.time - projectileReturnTiming.secondContact - 0.36) / 0.26,
    size: 200,
  });
  gameDust(context, frame.assets.effects, {
    x: handRoot(frame.assets, receivePoint).x,
    y: handRoot(frame.assets, receivePoint).y,
    progress: (frame.time - projectileReturnTiming.arrive) / 0.22,
    size: 135,
  });
  context.restore();
}

export const projectileReturnCut: Cut & {
  readonly techniques: readonly string[];
} = {
  id: 'projectile-return',
  title: '왕복 기탄',
  kind: '2D',
  duration: projectileReturnTiming.duration,
  description:
    '한 발이 곰왕을 통과한 뒤 뒤쪽에서 감속해 돌아온다. 선회하는 동안 아타호가 남동쪽으로 뛰면 같은 탄의 귀로가 이동 중인 수신 위치를 따라 아래로 휜다. 반대편을 다시 때린 탄을 회수 직전에 주먹을 내밀어 받아낸다.',
  techniques: [
    '왕복 투사체',
    '발사자 재배치',
    '귀로 재조준',
    '연속 궤적',
    '방향이 다른 두 접촉',
  ],
  beats: [
    { time: 0, label: '발사자와 표적의 거리 확인' },
    { time: projectileReturnTiming.launch, label: '손끝에서 한 발 발사' },
    {
      time: projectileReturnTiming.firstContact,
      label: '가는 길에 왼쪽 몸통 명중',
    },
    {
      time: projectileReturnTiming.reposition,
      label: '발사자가 남동쪽으로 이동',
    },
    {
      time: projectileReturnTiming.turn,
      label: '이동 중인 발사자를 따라 선회·귀로 전환',
    },
    {
      time: projectileReturnTiming.secondContact,
      label: '다른 각도로 돌아와 오른쪽 몸통 재명중',
    },
    {
      time: projectileReturnTiming.receivePrepare,
      label: '회수 직전에 주먹을 내밀기',
    },
    {
      time: projectileReturnTiming.receive,
      label: '이동한 손끝으로 같은 탄 회수',
    },
    {
      time: projectileReturnTiming.settle,
      label: '이동 위치와 두 번째 피격 결과 확인',
    },
  ],
  draw: drawProjectileReturn,
};
