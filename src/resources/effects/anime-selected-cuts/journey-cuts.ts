import {
  clamp,
  ease,
  fistSmear,
  lerp,
  line,
  smearBackground,
  smooth,
  speedLines,
} from './drawing.js';
import { gameDust, gameImpact } from '../../cutscenes/game-effects.js';
import {
  stairAngle,
  stairPoint,
  type GameStageKind,
} from '../../cutscenes/game-stage.js';
import { WorldScene } from './world.js';
import type { FistPatch, Sprite } from './assets.js';
import type { Camera, Context, Cut, CutFrame, Vec3 } from './types.js';

const runCut = {
  start: 0.16,
  jump: 1.85,
  land: 2.24,
  contact: 2.46,
  runDistance: 56,
  ramp: 0.12,
  spurtDuration: 0.3,
  spurtSpeed: 50,
  leapDistance: 6.7,
  leapHeight: 1.1,
  settleStart: 1.97,
  settleEnd: 2.25,
  targetGap: 1.05,
} as const;
// 마지막 이차 가속의 이동량까지 빼고 기본 속도를 정해 총 56m를 맞춘다.
const runBaseSpeed =
  (runCut.runDistance - (runCut.spurtSpeed * runCut.spurtDuration) / 3) /
  (runCut.jump - runCut.start - runCut.ramp / 2 - runCut.spurtDuration / 3);
const runLandingZ = runCut.runDistance + runCut.leapDistance;
const fallCut = {
  startHeight: 67,
  initialSpeed: 14,
  gravity: 8,
  boostStart: 2.16,
  contact: 2.58,
  contactHeight: 1.95,
  cameraLag: 0.025,
  cameraLagHeight: 0.72,
  cameraLagBlend: 0.12,
} as const;
const fallBoostDuration = fallCut.contact - fallCut.boostStart;
const fallBoostDistance =
  fallCut.startHeight -
  fallCut.initialSpeed * fallCut.contact -
  (fallCut.gravity * fallCut.contact ** 2) / 2 -
  fallCut.contactHeight;
const fallPeakSpeed =
  fallCut.initialSpeed +
  fallCut.gravity * fallCut.contact +
  (3 * fallBoostDistance) / fallBoostDuration;
const runSmearExposures = [
  { frame: 9, holds: 1, strength: 0.7 },
  { frame: 16, holds: 1, strength: 0.85 },
  { frame: 23, holds: 2, strength: 1 },
  { frame: 30, holds: 1, strength: 0.85 },
  { frame: 37, holds: 2, strength: 1 },
  { frame: 44, holds: 2, strength: 1.1 },
] as const;

// 세계 이동과 카메라는 연속적으로, 그림 교체만 24fps의 1·2·3코마로 나눈다.
function poseTime(time: number, holds = 2): number {
  return Math.floor(time * (24 / holds)) / (24 / holds);
}

function mixPoint(from: Vec3, to: Vec3, progress: number): Vec3 {
  return {
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    z: lerp(from.z, to.z, progress),
  };
}

function mixCamera(from: Camera, to: Camera, progress: number): Camera {
  return {
    position: mixPoint(from.position, to.position, progress),
    target: mixPoint(from.target, to.target, progress),
    focal: lerp(from.focal ?? 760, to.focal ?? 760, progress),
    roll: lerp(from.roll ?? 0, to.roll ?? 0, progress),
  };
}

function sceneBackground(
  ctx: Context,
  frame: CutFrame,
  camera: Camera,
  kind: GameStageKind,
  smear: number,
  focus: Vec3,
  vertical = false,
  smearDisplacement?: Vec3,
): WorldScene {
  const draw = (background: Context) => {
    frame.surfaces.stage.background(background, kind, camera, frame.time, {
      focus,
      smear: smearDisplacement,
    });
  };
  if (smear > 0.005)
    smearBackground(ctx, frame.surfaces, draw, smear, vertical);
  else draw(ctx);
  return new WorldScene(ctx, camera);
}

function contact(
  ctx: Context,
  frame: CutFrame,
  projected: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
  } | null,
  time: number,
  contactTime: number,
  angle: number,
  patch?: FistPatch,
): void {
  if (!projected) return;
  const swing = (time - (contactTime - 0.12)) / 0.15;
  if (swing > 0 && swing < 1)
    fistSmear(
      ctx,
      projected.x,
      projected.y,
      swing,
      angle,
      Math.min(160, projected.scale * 1.4),
      patch,
    );
  if (time >= contactTime && time < contactTime + 0.33)
    gameImpact(ctx, frame.assets.effects, {
      x: projected.x,
      y: projected.y,
      progress: (time - contactTime) / 0.33,
      size: Math.min(320, projected.scale * 3.6),
      angle,
    });
}

function spriteHeight(sprite: Sprite): number {
  return (
    (sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
    (sprite.bounds?.top ?? 0)
  );
}

function strikePoint(
  scene: WorldScene,
  sprite: Sprite,
  position: Vec3,
  hand: readonly [number, number],
): { readonly x: number; readonly y: number; readonly scale: number } | null {
  const foot = scene.project(position);
  if (!foot) return null;
  const pixelScale = (2.5 * foot.scale) / spriteHeight(sprite);
  return {
    x: foot.x + (hand[0] - sprite.anchorX) * pixelScale,
    y: foot.y + (hand[1] - sprite.feetY) * pixelScale,
    scale: foot.scale,
  };
}

function strikeHeight(
  sequence: readonly Sprite[],
  phase: number,
  reference: number,
): number {
  const sprite =
    sequence[
      Math.min(sequence.length - 1, Math.floor(clamp(phase) * sequence.length))
    ]!;
  // 코마별 알파 높이가 달라도 같은 원본 픽셀의 크기는 유지한다.
  return (2.5 * spriteHeight(sprite)) / spriteHeight(sequence[reference]!);
}

function finishShade(ctx: Context, progress: number): void {
  if (progress <= 0) return;
  const shade = ctx.createRadialGradient(640, 325, 200, 640, 350, 850);
  shade.addColorStop(0, '#05151b00');
  shade.addColorStop(1, '#07151bd9');
  ctx.save();
  ctx.globalAlpha = smooth(progress) * 0.65;
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.restore();
}

function runPoint(time: number): Vec3 {
  if (time < runCut.jump) {
    const duration = runCut.jump - runCut.start;
    const elapsed = clamp((time - runCut.start) / duration) * duration;
    const travel =
      elapsed < runCut.ramp
        ? (elapsed * elapsed) / (2 * runCut.ramp)
        : elapsed - runCut.ramp / 2;
    const spurt = clamp(
      (time - (runCut.jump - runCut.spurtDuration)) / runCut.spurtDuration,
    );
    return {
      x: 0,
      y: 0,
      z:
        runBaseSpeed * travel +
        ((runCut.spurtSpeed - runBaseSpeed) *
          runCut.spurtDuration *
          spurt ** 3) /
          3,
    };
  }
  const jump = clamp((time - runCut.jump) / (runCut.land - runCut.jump));
  return {
    x: 0,
    y: Math.sin(jump * Math.PI) * runCut.leapHeight,
    // 스퍼트의 진입 속도와 6.7m 착지 지점을 함께 맞추고 착지에서 멈춘다.
    z:
      runCut.runDistance +
      runCut.leapDistance * (3 * jump ** 2 - 2 * jump ** 3) +
      runCut.spurtSpeed * (runCut.land - runCut.jump) * jump * (1 - jump) ** 2,
  };
}

function runSmearDisplacement(time: number): Vec3 | undefined {
  const frame = Math.floor(time * 24 + 1e-8);
  const exposure = runSmearExposures.find(
    (entry) => frame >= entry.frame && frame < entry.frame + entry.holds,
  );
  if (!exposure) return undefined;
  // 현재 이동량으로 배경 면만 늘인다. 카메라·배우·그림자의 좌표는 바꾸지 않는다.
  const travel = runPoint(time).z - runPoint(Math.max(0, time - 1 / 24)).z;
  return { x: 0, y: 0, z: -travel * 1.6 * exposure.strength };
}

function runShadow(
  ctx: Context,
  scene: WorldScene,
  position: Vec3,
  radius: { readonly x: number; readonly z: number },
): void {
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return scene.project({
      x: position.x + Math.cos(angle) * radius.x,
      y: 0.03,
      z: position.z + Math.sin(angle) * radius.z,
    });
  });
  if (points.some((point) => !point)) return;
  ctx.save();
  ctx.fillStyle = '#263941';
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const point of points.slice(1)) ctx.lineTo(point!.x, point!.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackgroundRun(ctx: Context, frame: CutFrame): void {
  const time = Math.max(0, Math.min(3.3, frame.time));
  const point = runPoint(time);
  const hit = time >= runCut.contact;
  const hitAge = Math.max(0, time - runCut.contact);
  const bearPoint = {
    x: 0,
    y: hit
      ? Math.sin(clamp((time - runCut.contact) / 0.25) * Math.PI) * 0.5
      : 0,
    z:
      runLandingZ +
      runCut.targetGap +
      (hit ? smooth((time - runCut.contact) / 0.3) * 1.2 : 0),
  };
  const chase: Camera = {
    position: {
      x: -9.5,
      y: 1.25 + point.y * 0.25,
      z: point.z + 5.5,
    },
    target: { x: 0, y: 1.55 + point.y * 0.25, z: point.z + 2 },
    focal: 1380,
    roll: -0.035 * smooth((time - runCut.start) / 0.14),
  };
  const finish: Camera = {
    position: { x: -7.4, y: 1.1 + point.y * 0.25, z: point.z + 3.2 },
    target: { x: 0, y: 1.7 + point.y * 0.25, z: point.z + 1.1 },
    focal: 1000,
    roll: 0,
  };
  const camera = mixCamera(
    chase,
    finish,
    smooth(
      (time - runCut.settleStart) / (runCut.settleEnd - runCut.settleStart),
    ),
  );
  const smear =
    time >= runCut.jump && time < runCut.settleEnd
      ? Math.sin(
          clamp((time - runCut.jump) / (runCut.settleEnd - runCut.jump)) *
            Math.PI,
        ) * 0.48
      : 0;
  const scene = sceneBackground(
    ctx,
    frame,
    camera,
    'run',
    smear,
    point,
    false,
    runSmearDisplacement(time),
  );
  scene.render();
  // 그림자도 같은 바닥에 투영하고, 가까운 기둥과 배우보다 먼저 합성한다.
  runShadow(ctx, scene, point, { x: 0.72, z: 0.42 });
  runShadow(ctx, scene, bearPoint, { x: 1.1, z: 0.65 });
  if (time < runCut.land) {
    const running = time >= runCut.start && time < runCut.jump;
    scene.hero(
      frame.assets,
      point,
      time < runCut.start ? 'idle' : running ? 'run' : 'jump',
      running
        ? Math.floor((time - runCut.start) * 16) / 4
        : lerp(
            0.12,
            1,
            clamp(
              (poseTime(time, 1) - runCut.jump) / (runCut.land - runCut.jump),
            ),
          ),
      { facing: 0, rotation: camera.roll },
    );
  } else {
    const phase =
      time < runCut.contact
        ? clamp(
            (poseTime(time, 1) - runCut.land) / (runCut.contact - runCut.land),
          ) *
          (2 / 7)
        : time < runCut.contact + 0.07
          ? 2.5 / 7
          : Math.min(
              6.5 / 7,
              (3 + Math.floor((time - runCut.contact - 0.07) / 0.08)) / 7,
            );
    scene.hero(frame.assets, point, 'uppercut', phase, {
      facing: 0,
      rotation: camera.roll,
      height: strikeHeight(frame.assets.hero.uppercut['south-east']!, phase, 2),
    });
  }
  scene.bear(
    frame.assets,
    bearPoint,
    hitAge > 0.28 ? 'defeat' : hit ? 'hit' : 'stand',
    hitAge > 0.28
      ? clamp((hitAge - 0.28) / 0.24)
      : hit
        ? clamp(hitAge / 0.28)
        : poseTime(time, 3) * 2,
    { rotation: camera.roll },
  );
  scene.render();
  frame.surfaces.stage.foreground(ctx, 'run', camera, time, { focus: point });
  contact(
    ctx,
    frame,
    strikePoint(
      scene,
      frame.assets.hero.uppercut['south-east']![2]!,
      { x: 0, y: 0, z: runLandingZ },
      [62, 34],
    ),
    time,
    runCut.contact,
    -1.15,
    frame.assets.fistPatch,
  );
  finishShade(ctx, (time - 2.8) / 0.2);
}

function fallDescent(time: number) {
  const falling = Math.max(0, Math.min(time, fallCut.contact));
  const boost = clamp((falling - fallCut.boostStart) / fallBoostDuration);
  return {
    height:
      fallCut.startHeight -
      fallCut.initialSpeed * falling -
      (fallCut.gravity * falling ** 2) / 2 -
      fallBoostDistance * boost ** 3,
    speed:
      time < fallCut.contact
        ? fallCut.initialSpeed +
          fallCut.gravity * falling +
          (3 * fallBoostDistance * boost ** 2) / fallBoostDuration
        : 0,
  };
}

function fallPoint(time: number): Vec3 {
  const falling = Math.min(time, fallCut.contact);
  return {
    x: Math.sin(falling * 1.3) * 0.5 * (1 - smooth((time - 2.16) / 0.3)),
    y:
      time < fallCut.contact
        ? fallDescent(time).height
        : fallCut.contactHeight * (1 - smooth((time - 2.65) / 0.33)),
    z: 0,
  };
}

function fallingBrush(
  ctx: Context,
  scene: WorldScene,
  time: number,
  amount: number,
): void {
  ctx.save();
  ctx.globalAlpha = amount * 0.32;
  for (let index = 0; index < 16; index++) {
    const y = Math.floor(fallPoint(time).y / 7) * 7 + (index % 4) * 7 - 7;
    const angle = (Math.floor(index / 4) * Math.PI) / 2;
    const position = scene.project({
      x: Math.cos(angle) * 8,
      y,
      z: Math.sin(angle) * 8,
    });
    if (!position || position.x < -100 || position.x > 1380) continue;
    line(
      ctx,
      [
        [position.x, position.y],
        [position.x + 4, position.y - 80 - amount * 170],
      ],
      '#9e9883',
      Math.min(70, position.scale * 0.8),
    );
  }
  ctx.restore();
}

function drawFalling(ctx: Context, frame: CutFrame): void {
  const time = Math.max(0, Math.min(3.7, frame.time));
  const fall = fallPoint(time);
  const descent = fallDescent(time);
  const orbit = time * 1.8 + 0.3;
  const rotation = Math.PI * (1 - smooth((time - 1.88) / 0.34));
  const lagEnvelope =
    smooth((time - fallCut.boostStart) / fallCut.cameraLagBlend) *
    (1 -
      smooth(
        (time - (fallCut.contact - fallCut.cameraLagBlend)) /
          fallCut.cameraLagBlend,
      ));
  // 카메라만 짧게 뒤처져 배우가 내려가게 하되 접촉 전에는 원래 구도로 회수한다.
  const lagHeight =
    time < fallCut.contact
      ? Math.min(
          fallCut.cameraLagHeight,
          Math.max(0, fallDescent(time - fallCut.cameraLag).height - fall.y),
        ) * lagEnvelope
      : 0;
  const cameraHeight = fall.y + lagHeight;
  const chase: Camera = {
    position: {
      x: Math.sin(orbit) * 5.7,
      y: cameraHeight + 4.1,
      z: Math.cos(orbit) * 5.7,
    },
    target: { x: fall.x, y: cameraHeight + 1.25, z: 0 },
    focal: 780,
    roll: -0.14 + Math.sin(time * 1.7) * 0.15,
  };
  const finishLift = Math.max(0, cameraHeight - fallCut.contactHeight);
  const finish: Camera = {
    // 마지막 가속까지 배우 높이를 따라가고 접촉에서 기존 앙각 구도로 돌아온다.
    position: { x: -6.2, y: 1.4 + finishLift, z: 7.6 },
    target: { x: 0, y: 2.6 + finishLift, z: 0.5 },
    focal: 920,
    roll: 0,
  };
  const camera = mixCamera(chase, finish, smooth((time - 2.24) / 0.28));
  const smear =
    clamp(
      (descent.speed - fallCut.initialSpeed) /
        (fallPeakSpeed - fallCut.initialSpeed),
    ) *
    0.92 *
    (1 - smooth((time - (fallCut.contact - 0.04)) / 0.04));
  const scene = sceneBackground(ctx, frame, camera, 'cliff', smear, fall, true);
  if (time < 2.22) {
    scene.hero(
      frame.assets,
      { ...fall, y: fall.y + 1.25 * (1 - Math.cos(rotation)) },
      'jump',
      0.46,
      {
        facing: 0,
        rotation,
      },
    );
  } else {
    const phase =
      time < fallCut.contact
        ? lerp(3 / 9, 4.5 / 9, clamp((poseTime(time, 1) - 2.22) / 0.36))
        : time < 2.69
          ? 5.5 / 9
          : lerp(6 / 9, 8.5 / 9, clamp((time - 2.69) / 0.3));
    scene.hero(frame.assets, fall, 'slam', phase, {
      facing: 0,
      height: strikeHeight(frame.assets.hero.slam['south-east']!, phase, 5),
    });
  }
  const hit = time >= fallCut.contact;
  scene.bear(
    frame.assets,
    {
      x: 0.8 + (hit ? smooth((time - fallCut.contact) / 0.35) * 0.7 : 0),
      y: 0,
      z: 0.9 + (hit ? smooth(clamp((time - fallCut.contact) / 0.35)) * 0.5 : 0),
    },
    time >= 2.86 ? 'defeat' : hit ? 'hit' : 'stand',
    time >= 2.86
      ? clamp((time - 2.86) / 0.44)
      : hit
        ? clamp((time - fallCut.contact) / 0.28)
        : poseTime(time, 3) * 2,
  );
  scene.render();
  frame.surfaces.stage.foreground(ctx, 'cliff', camera, time, { focus: fall });
  if (time >= 2.98) {
    const ground = scene.project({ x: 0, y: 0, z: 0 });
    if (ground)
      gameDust(ctx, frame.assets.effects, {
        ...ground,
        progress: (time - 2.98) / 0.5,
        size: 300,
      });
  }
  if (smear > 0.005) {
    fallingBrush(ctx, scene, time, smear);
    speedLines(ctx, time, smear * 0.55, true);
  }
  contact(
    ctx,
    frame,
    strikePoint(
      scene,
      frame.assets.hero.slam['south-east']![5]!,
      // 접촉 전 권격도 가속 중인 배우를 따라가고 접촉광은 기존 타점에 남긴다.
      hit ? { x: 0, y: fallCut.contactHeight, z: 0 } : fall,
      [64, 69],
    ),
    time,
    fallCut.contact,
    1.3,
  );
  finishShade(ctx, (time - 3.05) / 0.28);
}

function stairProgress(time: number): number {
  // 올려다보는 구간은 같은 세계 거리를 절반 시간에 지나가도록 접는다.
  if (time < 0.75) return lerp(0, 0.26, time / 0.75);
  if (time < 1.34) return lerp(0.26, 0.61, (time - 0.75) / 0.59);
  if (time < 1.7) return lerp(0.61, 1, (time - 1.34) / 0.36);
  return 1;
}

function drawStairs(ctx: Context, frame: CutFrame): void {
  const time = Math.max(0, Math.min(3.05, frame.time));
  const progress = stairProgress(time);
  const step = stairPoint(progress);
  const angle = stairAngle(progress);
  const jump = clamp((time - 1.7) / 0.9);
  const point: Vec3 = {
    x: step.x + (time > 1.7 ? Math.cos(angle) * ease(jump) * 1.4 : 0),
    y: step.y + Math.sin(jump * Math.PI) * 3,
    z: step.z - (time > 1.7 ? Math.sin(angle) * ease(jump) * 1.4 : 0),
  };
  const orbit = angle - 0.8;
  // 중앙 빈 공간의 반경1.5m 안에서 돌아 외곽 기둥이 주연을 덮지 않는다.
  const orbitRadius = 1.5;
  const height =
    time < 0.75
      ? lerp(9, 3.5, smooth(time / 0.75))
      : time < 1.34
        ? lerp(3.5, -1.2, smooth((time - 0.75) / 0.59))
        : lerp(-1.2, 0.4, smooth(clamp((time - 1.34) / 0.36)));
  const chase: Camera = {
    position: {
      x: -Math.sin(orbit) * orbitRadius,
      y: step.y + height,
      z: -Math.cos(orbit) * orbitRadius,
    },
    target: { x: point.x, y: point.y + 1.2, z: point.z },
    focal:
      lerp(650, 760, smooth(clamp(time / 1.5))) -
      Math.sin(jump * Math.PI) * 110,
    roll: Math.sin(time * 2.1) * 0.055,
  };
  const end = stairPoint(1);
  const landing: Vec3 = {
    x: end.x + Math.cos(stairAngle(1)) * 1.4,
    y: end.y,
    z: end.z - Math.sin(stairAngle(1)) * 1.4,
  };
  const finish: Camera = {
    position: { x: end.x - 6.2, y: 16.4, z: end.z + 7.6 },
    target: { x: landing.x, y: 17.5, z: landing.z + 0.5 },
    focal: 920,
    roll: 0,
  };
  const camera = mixCamera(chase, finish, smooth((time - 2.08) / 0.26));
  const smear =
    time > 1.68 && time < 2.18
      ? Math.sin(clamp((time - 1.68) / 0.5) * Math.PI) * 0.8
      : 0;
  const scene = sceneBackground(ctx, frame, camera, 'stairs', smear, point);
  if (time < 1.7)
    scene.hero(frame.assets, point, 'run', poseTime(time, 2) * 3, {
      facing: angle + Math.PI / 2,
    });
  else if (time < 2.19)
    scene.hero(frame.assets, point, 'jump', (poseTime(time, 1) - 1.7) / 0.7, {
      facing: 0,
    });
  else {
    const phase =
      time < 2.4
        ? lerp(3 / 9, 4.5 / 9, clamp((poseTime(time, 1) - 2.19) / 0.21))
        : time < 2.47
          ? 5.5 / 9
          : lerp(6 / 9, 8.5 / 9, clamp((time - 2.47) / 0.2));
    scene.hero(frame.assets, point, 'slam', phase, {
      facing: 0,
      height: strikeHeight(frame.assets.hero.slam['south-east']!, phase, 5),
    });
  }
  const hit = time >= 2.4;
  scene.bear(
    frame.assets,
    {
      x: landing.x + 0.8 + (hit ? smooth((time - 2.4) / 0.24) * 0.7 : 0),
      y: landing.y,
      z: landing.z + 0.9 + (hit ? smooth(clamp((time - 2.4) / 0.24)) * 0.5 : 0),
    },
    time >= 2.53 ? 'defeat' : hit ? 'hit' : 'stand',
    time >= 2.53
      ? clamp((time - 2.53) / 0.2)
      : hit
        ? clamp((time - 2.4) / 0.13)
        : poseTime(time, 3) * 2,
  );
  scene.render();
  frame.surfaces.stage.foreground(ctx, 'stairs', camera, time, {
    focus: point,
  });
  if (smear > 0) speedLines(ctx, time, smear * 0.28);
  contact(
    ctx,
    frame,
    strikePoint(
      scene,
      frame.assets.hero.slam['south-east']![5]!,
      {
        x: landing.x,
        y: landing.y + Math.sin((0.7 / 0.9) * Math.PI) * 3,
        z: landing.z,
      },
      [64, 69],
    ),
    time,
    2.4,
    1.2,
  );
  finishShade(ctx, (time - 2.65) / 0.1);
}

export const journeyCuts: readonly Cut[] = [
  {
    id: 'background-run',
    title: '背景動画 · 숲길 질주',
    kind: '3D',
    duration: 3.3,
    description:
      '게임 숲길의 낮은 사선 카메라가 아타호와 함께 후퇴한다. 질주 끝0.30초에33→50m/s로 치고 나가 같은 속도로 도약한다. 배경 스미어를1~2코마씩 섞고, 착지 뒤 구도를 정착시켜 어퍼컷 한 번으로 끝낸다.',
    beats: [
      { time: runCut.start, label: '사선 동행 · 급가속' },
      { time: 23 / 24, label: '질주 · 배경 스미어 2코마' },
      {
        time: runCut.jump - runCut.spurtDuration,
        label: '끝 스퍼트 · 33→50m/s',
      },
      { time: runCut.jump, label: '짧은 도약 · 배경 스미어' },
      { time: runCut.settleEnd, label: '타격 구도 정착' },
      { time: runCut.contact, label: '주먹 접촉 · 짧은 정지' },
      { time: 3, label: '회수 · 곰왕 쓰러짐' },
    ],
    draw: drawBackgroundRun,
  },
  {
    id: 'falling-background',
    title: '落下 · 바위 협곡',
    kind: '3D',
    duration: 3.7,
    description:
      '게임 바위·식생으로 재구성한 협곡을 나선 추적 낙하한 뒤 마지막0.42초에31→51m/s로 가속한다. 카메라가25ms 늦게 따라와 몸도 아래로 파고들며 접촉 전에 구도를 회수한다. 머리부터 떨어지는 장은 기존 점프 원본의 카드 회전이며 새 낙하 자세를 그린 재현은 아니다.',
    beats: [
      { time: 0, label: '머리부터 낙하 · 나선 추적' },
      { time: 1, label: '낙하 가속 · 배경만 세로 스미어' },
      { time: 1.88, label: '낙하 중 자세 회복' },
      { time: fallCut.boostStart, label: '마지막 하강 가속 · 31→51m/s' },
      { time: 2.22, label: '양손 내려찍기 장전' },
      {
        time: fallCut.boostStart + fallCut.cameraLagBlend,
        label: '카메라 지연 · 본체 하강',
      },
      {
        time: fallCut.contact - fallCut.cameraLagBlend,
        label: '접촉 구도 회수',
      },
      { time: fallCut.contact, label: '공중 접촉 · 앙각 정착' },
      { time: 3.3, label: '착지 · 곰왕 쓰러짐' },
    ],
    draw: drawFalling,
  },
  {
    id: 'spiral-stairs',
    title: '螺旋 · 열린 계단 60칸',
    kind: '3D',
    duration: 3.05,
    description:
      '게임의 석재 재질로 재구성한 난간 없는 60칸 나선 계단을 실제 3D로 오르며 하이→근접→로우 앵글을 잇고, 낮은 구간을 압축한 뒤 하늘 열린 꼭대기에 내려찍는다. 계단·카메라는 입체이고 인물은 방향별 평면 원본이다. 특정 작품 장면의 정확한 자세 재현은 아니다.',
    beats: [
      { time: 0, label: '60칸 · 높은 시점에서 진입' },
      { time: 0.75, label: '허공에서 파고드는 카메라' },
      { time: 1.34, label: '로우 앵글 구간 압축' },
      { time: 1.7, label: '꼭대기 도약 · 배경 스미어' },
      { time: 2.4, label: '공중 내려찍기 접촉' },
      { time: 2.75, label: '꼭대기 착지 · 종결' },
    ],
    draw: drawStairs,
  },
];
