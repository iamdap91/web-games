import { gameDust } from '../../cutscenes/game-effects.js';
import {
  directionalKick,
  segment,
  strikePoint,
  strikeRootX,
  synergyBear,
  synergyDust,
  synergyHero,
  synergyImpact,
  synergyLayout,
  synergyShadow,
  type SynergyPoint,
  type SynergyPose,
} from './action-synergy-shared.js';
import { drawContactStar, drawStoneWall } from './causal-shared.js';
import { ease, fistSmear, lerp, line, smooth } from './drawing.js';
import { WorldScene } from './world.js';
import type { CutAssets } from './assets.js';
import type { Camera, Context, Cut, CutFrame } from './types.js';

const rebound = {
  firstThrust: 0.28,
  firstContact: 0.36,
  firstRelease: 0.405,
  wallContact: 0.98,
  wallRelease: 1.05,
  secondThrust: 1.34,
  secondContact: 1.43,
  secondRelease: 1.51,
  landing: 2.08,
  settled: 2.21,
  initialTargetX: 780,
  secondTargetX: 930,
  finalTargetX: 1040,
  wallX: 1245,
  wallLift: 38,
} as const;

// hit1 2번의 불투명 오른끝은 128px이다. 마지막 픽셀의 바깥면을 벽 앞면에 맞춘다.
const wallTargetX = rebound.wallX - (129 - 80) * synergyLayout.bearScale;
const wallContactPoint: SynergyPoint = {
  x: rebound.wallX,
  // 벽에 먼저 닿는 hit1 2번의 오른끝 픽셀은 원본 y75~81에 있다.
  y:
    synergyLayout.ground -
    rebound.wallLift +
    (78 - 135) * synergyLayout.bearScale,
};
const reboundCamera: Camera = {
  position: { x: 0, y: 4.5, z: 12 },
  target: { x: 0, y: 1.5, z: 0 },
  focal: 900,
};

type TargetPose = {
  readonly x: number;
  readonly lift: number;
  readonly state: 'stand' | 'hit' | 'defeat';
  readonly index: number;
};

/** 두 접촉 사이의 경로를 연결하고 벽 정지 뒤에만 되돌아오게 한다. */
function targetPose(time: number): TargetPose {
  if (time < rebound.firstContact)
    return { x: rebound.initialTargetX, lift: 0, state: 'stand', index: 0 };
  if (time < rebound.firstRelease)
    return { x: rebound.initialTargetX, lift: 0, state: 'hit', index: 2 };
  if (time < rebound.wallContact) {
    const flight = segment(
      time,
      rebound.firstRelease,
      rebound.wallContact - rebound.firstRelease,
    );
    return {
      x: lerp(rebound.initialTargetX, wallTargetX, smooth(flight)),
      lift: Math.sin(flight * Math.PI * 0.5) * rebound.wallLift,
      state: 'hit',
      index: 2,
    };
  }
  if (time < rebound.wallRelease)
    return { x: wallTargetX, lift: rebound.wallLift, state: 'hit', index: 2 };
  if (time < rebound.secondContact) {
    const returning = segment(
      time,
      rebound.wallRelease,
      rebound.secondContact - rebound.wallRelease,
    );
    return {
      x: lerp(wallTargetX, rebound.secondTargetX, smooth(returning)),
      lift: lerp(rebound.wallLift, 16, smooth(returning)),
      state: 'hit',
      index: 2,
    };
  }
  if (time < rebound.secondRelease)
    return { x: rebound.secondTargetX, lift: 16, state: 'hit', index: 2 };
  const fall = segment(
    time,
    rebound.secondRelease,
    rebound.landing - rebound.secondRelease,
  );
  return {
    x: lerp(rebound.secondTargetX, rebound.finalTargetX, smooth(fall)),
    lift: Math.max(0, Math.sin(fall * Math.PI) * 50 + (1 - fall) * 16),
    state: 'defeat',
    index: Math.min(
      7,
      2 +
        Math.floor(
          segment(
            time,
            rebound.secondRelease,
            rebound.settled - rebound.secondRelease,
          ) * 6,
        ),
    ),
  };
}

function heroPose(assets: CutAssets, time: number): SynergyPose {
  const firstRoot = strikeRootX(assets, {
    targetX: rebound.initialTargetX,
    handFrame: 2,
  });
  const secondRoot = strikeRootX(assets, { targetX: rebound.secondTargetX });
  if (time < rebound.firstThrust) {
    const prepare = segment(time, 0.04, rebound.firstThrust - 0.04);
    return { action: 'punch', index: prepare < 0.6 ? 0 : 1, x: firstRoot - 42 };
  }
  if (time < rebound.firstRelease) {
    const thrust = segment(
      time,
      rebound.firstThrust,
      rebound.firstContact - rebound.firstThrust,
    );
    return {
      action: 'punch',
      index: thrust < 0.32 ? 1 : 2,
      x: firstRoot - 42 * (1 - thrust * thrust),
    };
  }
  if (time < 0.61)
    return {
      action: 'punch',
      index:
        3 +
        Math.min(3, Math.floor(segment(time, rebound.firstRelease, 0.205) * 4)),
      x: firstRoot,
    };
  if (time < rebound.secondThrust) {
    const chase = segment(time, 0.61, rebound.secondThrust - 0.61);
    return {
      action: 'run',
      index: Math.floor((time - 0.61) * 16) % 4,
      x: lerp(firstRoot, secondRoot - 44, smooth(chase)),
    };
  }
  if (time < rebound.secondRelease) {
    const thrust = segment(
      time,
      rebound.secondThrust,
      rebound.secondContact - rebound.secondThrust,
    );
    return {
      action: 'punch',
      index: thrust < 0.24 ? 9 : thrust < 0.5 ? 10 : thrust < 0.72 ? 11 : 12,
      x: secondRoot - 44 * (1 - thrust * thrust),
    };
  }
  return {
    action: 'punch',
    index:
      13 +
      Math.min(3, Math.floor(segment(time, rebound.secondRelease, 0.24) * 4)),
    x: secondRoot,
  };
}

function cameraPan(time: number): number {
  if (time < rebound.wallRelease)
    return (
      180 *
      smooth(
        segment(
          time,
          rebound.firstRelease,
          rebound.wallContact - rebound.firstRelease,
        ),
      )
    );
  return lerp(
    180,
    150,
    smooth(
      segment(
        time,
        rebound.wallRelease,
        rebound.secondContact - rebound.wallRelease,
      ),
    ),
  );
}

/** 배우·벽과 같은 이동량을 실제 무대 카메라에 전달해 배경도 같은 공간에 둔다. */
function drawBackground(context: Context, frame: CutFrame, pan: number): void {
  const reference = new WorldScene(context, reboundCamera);
  const origin = reference.project({ x: 0, y: 0, z: 0 })!;
  const unit = reference.project({ x: 1, y: 0, z: 0 })!;
  const truck = pan / (unit.x - origin.x);
  const camera: Camera = {
    ...reboundCamera,
    position: { ...reboundCamera.position, x: truck },
    target: { ...reboundCamera.target, x: truck },
  };
  frame.surfaces.stage.background(context, 'arena', camera, frame.time, {
    principalY: 360 + synergyLayout.ground - origin.y,
  });
}

function drawFlightTrace(
  context: Context,
  frame: CutFrame,
  target: TargetPose,
): void {
  const outgoing =
    frame.time > rebound.firstRelease + 0.08 &&
    frame.time < rebound.wallContact;
  const returning =
    frame.time > rebound.wallRelease + 0.06 &&
    frame.time < rebound.secondContact;
  if (!outgoing && !returning) return;
  const direction = outgoing ? -1 : 1;
  context.save();
  context.globalAlpha = 0.42;
  for (let index = 0; index < 3; index++) {
    const x = target.x + direction * (165 + index * 12);
    const y = synergyLayout.ground - target.lift - 185 + index * 23;
    line(
      context,
      [
        [x, y],
        [x + direction * (55 + index * 12), y + 3],
      ],
      '#dce9c9',
      3,
    );
  }
  context.restore();
}

function drawRebound(context: Context, frame: CutFrame): void {
  const pan = cameraPan(frame.time);
  const target = targetPose(frame.time);
  const pose = heroPose(frame.assets, frame.time);
  const wallAge = frame.time - rebound.wallContact;
  const secondPoint = strikePoint(frame.assets, {
    targetX: rebound.secondTargetX,
  });
  context.save();
  context.translate(directionalKick(frame.time - rebound.secondRelease, 17), 0);
  drawBackground(context, frame, pan);
  context.translate(-pan, 0);
  drawStoneWall(context, frame, {
    face: [
      { x: rebound.wallX, y: 174 },
      { x: rebound.wallX + 116, y: 190 },
      { x: rebound.wallX + 116, y: 613 },
      { x: rebound.wallX, y: 597 },
    ],
    depth: 36,
    contact: wallContactPoint,
    crack:
      wallAge < 0 ? 0 : ease(segment(frame.time, rebound.wallContact, 0.07)),
  });
  drawFlightTrace(context, frame, target);
  synergyShadow(
    context,
    { x: target.x, y: synergyLayout.ground },
    99,
    1 - target.lift / 180,
  );
  synergyBear(context, frame, {
    x: target.x,
    y: synergyLayout.ground - target.lift,
    state: target.state,
    index: target.index,
  });
  synergyShadow(context, { x: pose.x, y: synergyLayout.ground }, 56);
  synergyHero(context, frame.assets, pose);
  const firstPoint = strikePoint(frame.assets, {
    targetX: rebound.initialTargetX,
    handFrame: 2,
  });
  synergyImpact(context, frame, {
    point: firstPoint,
    contact: rebound.firstContact,
    size: 155,
    duration: 0.14,
  });
  if (frame.time >= rebound.secondThrust && frame.time < rebound.secondContact)
    fistSmear(
      context,
      secondPoint.x - 35,
      secondPoint.y,
      segment(
        frame.time,
        rebound.secondThrust,
        rebound.secondContact - rebound.secondThrust,
      ),
      0,
      112,
      frame.assets.fistPatch,
    );
  synergyImpact(context, frame, {
    point: secondPoint,
    contact: rebound.secondContact,
    size: 245,
    duration: 0.2,
  });
  drawContactStar(context, { point: wallContactPoint, age: wallAge, size: 78 });
  gameDust(context, frame.assets.effects, {
    ...wallContactPoint,
    size: 150,
    progress: wallAge / 0.25,
  });
  synergyDust(context, frame, {
    x: rebound.finalTargetX,
    contact: rebound.landing,
    size: 225,
    duration: 0.28,
  });
  context.restore();
}

export const wallReboundCut: Cut & { readonly techniques: readonly string[] } =
  {
    id: 'causal-wall-rebound',
    title: '벽 반동 연계',
    kind: '2D',
    duration: 2.75,
    description:
      '첫 잽으로 곰왕을 돌벽까지 날리고, 벽 접촉 뒤 되돌아오는 궤적에 아타호가 달려붙어 두 번째 정권을 맞춘다. 벽의 접점·정지·진행 방향 반전이 두 타를 연결한다.',
    techniques: [
      '화면 추적',
      '환경 충돌',
      '박자 대비',
      '접촉 유지',
      '방향성 반동',
    ],
    beats: [
      { time: rebound.firstContact, label: '첫 잽 접촉' },
      { time: rebound.wallContact, label: '몸이 벽에 접촉' },
      { time: rebound.wallRelease, label: '벽 반발로 방향 반전' },
      { time: rebound.secondContact, label: '돌아오는 상대에 정권' },
      { time: rebound.landing, label: '두 번째 타격 뒤 착지' },
    ],
    draw: drawRebound,
  };
