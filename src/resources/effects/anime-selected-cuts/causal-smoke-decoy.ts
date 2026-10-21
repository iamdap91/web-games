import { drawEffectSprite } from '../anime-showcase/effect-sprite.js';
import { drawHero } from './cast.js';
import {
  segment,
  synergyBear,
  synergyDust,
  synergyLayout,
  synergyShadow,
} from './action-synergy-shared.js';
import { ease, lerp, smearBackground, smooth } from './drawing.js';
import { WorldScene } from './world.js';
import type { Direction, HeroAction } from './assets.js';
import type { Camera, Context, Cut, CutFrame } from './types.js';

const timing = {
  smoke: 0.22,
  move: 0.52,
  arrived: 1.12,
  attack: 0.94,
  miss: 1.3,
  pan: 1.5,
  reveal: 1.66,
  focus: 1.84,
  settled: 2.45,
} as const;
const positions = { oldHero: 480, hiddenHero: -100, bear: 935 } as const;
const baseCamera: Camera = {
  position: { x: 0, y: 4.5, z: 12 },
  target: { x: 0, y: 1.5, z: 0 },
  focal: 900,
};

type StageView = {
  readonly drawAt: (x: number, draw: (layer: Context) => void) => void;
};

/** 카메라 위치는 고정하고 시선을 왼쪽으로 돌려 배경과 배우가 같은 팬을 받게 한다. */
function stageView(context: Context, frame: CutFrame): StageView {
  const pan = smooth(
    segment(frame.time, timing.pan, timing.reveal - timing.pan),
  );
  const camera: Camera = {
    ...baseCamera,
    target: { ...baseCamera.target, x: -4.4 * pan },
  };
  const reference = new WorldScene(context, baseCamera);
  const origin = reference.project({ x: 0, y: 0, z: 0 })!;
  const unit = reference.project({ x: 1, y: 0, z: 0 })!;
  const current = new WorldScene(context, camera);
  const shiftY = synergyLayout.ground - origin.y;
  const blur = Math.sin(pan * Math.PI) * 0.65;
  smearBackground(
    context,
    frame.surfaces,
    (background) => {
      frame.surfaces.stage.background(background, 'arena', camera, frame.time, {
        principalY: 360 + shiftY,
      });
    },
    blur,
  );
  return {
    drawAt: (x, draw) => {
      const projected = current.project({
        x: (x - origin.x) / (unit.x - origin.x),
        y: 0,
        z: 0,
      });
      if (!projected) return;
      context.save();
      context.translate(projected.x, projected.y + shiftY);
      const scale = projected.scale / origin.scale;
      context.scale(scale, scale);
      context.translate(-x, -synergyLayout.ground);
      draw(context);
      context.restore();
    },
  };
}

function heroPosition(time: number): number {
  return lerp(
    positions.oldHero,
    positions.hiddenHero,
    smooth(segment(time, timing.move, timing.arrived - timing.move)),
  );
}

function drawDecoyHero(context: Context, frame: CutFrame, x: number): void {
  const moving = frame.time >= timing.move && frame.time < timing.arrived;
  const action: HeroAction = moving ? 'run' : 'idle';
  const direction: Direction =
    moving || (frame.time >= timing.move && frame.time < 1.78)
      ? 'west'
      : frame.time >= 1.78 && frame.time < 1.84
        ? 'south-west'
        : frame.time >= 1.84 && frame.time < 1.9
          ? 'south'
          : 'south-east';
  const sequence = frame.assets.hero[action][direction]!;
  const index = moving
    ? Math.floor((frame.time - timing.move) * 17) % sequence.length
    : 0;
  const sprite = sequence[index]!;
  const bodyHeight =
    (sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
    (sprite.bounds?.top ?? 0);
  const facing: Readonly<Record<Direction, number>> = {
    south: 0,
    'south-east': Math.PI / 4,
    east: Math.PI / 2,
    'north-east': (Math.PI * 3) / 4,
    north: Math.PI,
    'north-west': (Math.PI * 5) / 4,
    west: (Math.PI * 3) / 2,
    'south-west': (Math.PI * 7) / 4,
  };
  const focus = smooth(
    segment(frame.time, timing.reveal, timing.focus - timing.reveal),
  );
  synergyShadow(context, { x, y: synergyLayout.ground }, 55);
  drawHero(context, frame.assets, {
    x,
    y: synergyLayout.ground,
    height: bodyHeight * synergyLayout.heroScale,
    action,
    phase: (index + 0.5) / sequence.length,
    facing: facing[direction],
    filter: frame.time >= timing.pan ? `blur(${(1 - focus) * 3.2}px)` : 'none',
  });
}

function bearPosition(time: number): number {
  return (
    positions.bear -
    275 *
      ease(
        segment(time, timing.attack + 0.12, timing.miss - timing.attack - 0.12),
      )
  );
}

function drawMiss(context: Context, frame: CutFrame, x: number): void {
  const active = frame.time >= timing.attack && frame.time < timing.miss + 0.44;
  // 실제 공격 4~6번 원화의 들어 올림→낙하를 헛침 시각에 맞추고 7~15번으로 회수한다.
  const index =
    frame.time < timing.miss - 0.1
      ? Math.min(
          4,
          Math.floor(
            segment(
              frame.time,
              timing.attack,
              timing.miss - timing.attack - 0.1,
            ) * 5,
          ),
        )
      : frame.time < timing.miss
        ? 4 +
          Math.min(
            1,
            Math.floor(segment(frame.time, timing.miss - 0.1, 0.1) * 2),
          )
        : frame.time < timing.miss + 0.1
          ? 6
          : 7 +
            Math.min(
              8,
              Math.floor(segment(frame.time, timing.miss + 0.1, 0.34) * 9),
            );
  const focus = smooth(
    segment(frame.time, timing.reveal, timing.focus - timing.reveal),
  );
  synergyShadow(context, { x, y: synergyLayout.ground }, 102);
  synergyBear(context, frame, {
    x,
    state: active ? 'attack' : 'stand',
    index: active ? Math.min(frame.assets.bear.attack.length - 1, index) : 0,
    filter: `blur(${focus * 3.2}px)`,
  });
}

/** 노리오 연기의 단색 원화와 출생·말림·분리 원리를 이동 가림막에 맞춰 재배치한다. */
function smokeCloud(context: Context, frame: CutFrame): void {
  const age = frame.time - timing.smoke;
  if (age < 0) return;
  const fade = 1 - smooth(segment(frame.time, 0.98, 0.58));
  if (fade <= 0) return;
  const cloud = frame.surfaces.get('causal-smoke-cloud');
  // 덩어리를 위에 배치해 발을 남기고, 한 장 전체를 걷어 헛친 접점을 드러낸다.
  for (let index = 0; index < 15; index++) {
    const local = age - (index % 4) * 0.035;
    if (local < 0) continue;
    const born = ease(segment(local, 0, 0.15));
    const separated = smooth(segment(local, 0.65, 1));
    const side = index % 2 ? 1 : -1;
    const row = Math.floor(index / 5);
    const drift = side * separated * (22 + index * 3);
    const x = positions.oldHero + side * (16 + (index % 5) * 37) * born + drift;
    const y = synergyLayout.ground - 130 - row * 58 - local * 13;
    const radius = (70 + (index % 4) * 15) * born * (1 - separated * 0.24);
    const cell = local < 0.16 ? 0 : local < 0.4 ? 1 : local < 1.45 ? 2 : 3;
    const stepped = Math.floor(local * 12) / 12;
    drawEffectSprite(cloud, frame, {
      key: `smoke-flat-${cell}`,
      point: { x: x + Math.sin(stepped * 3.5 + index) * radius * 0.12, y },
      width: radius * (1.18 - separated * 0.18) * 2,
      height: radius * (0.82 + separated * 0.16) * 2,
      rotation: Math.sin(stepped * 1.4 + index * 3) * 0.07,
    });
  }
  context.save();
  context.globalAlpha *= fade;
  context.drawImage(cloud.canvas, 0, 0);
  context.restore();
}

function drawSmokeDecoy(context: Context, frame: CutFrame): void {
  const scene = { ...frame, time: Math.min(frame.time, timing.settled) };
  const view = stageView(context, scene);
  const heroX = heroPosition(scene.time);
  const bearX = bearPosition(scene.time);
  view.drawAt(bearX, (layer) => drawMiss(layer, scene, bearX));
  view.drawAt(heroX, (layer) => drawDecoyHero(layer, scene, heroX));
  view.drawAt(positions.oldHero, (layer) => smokeCloud(layer, scene));
  view.drawAt(positions.oldHero, (layer) => {
    synergyDust(layer, scene, {
      x: positions.oldHero,
      contact: timing.smoke,
      size: 140,
      duration: 0.18,
    });
  });
  // 발의 마지막 분진도 실제 달린 끝점에서만 발생한다.
  view.drawAt(positions.hiddenHero, (layer) => {
    synergyDust(layer, scene, {
      x: positions.hiddenHero,
      contact: timing.arrived,
      size: 110,
      duration: 0.22,
    });
  });
}

export const smokeDecoyCut: Cut & { readonly techniques: readonly string[] } = {
  id: 'causal-smoke-decoy',
  title: '연막 교란',
  kind: '3D',
  duration: 2.75,
  description:
    '단색 연기의 가림 속에서 아타호가 실제로 옆으로 달린다. 발과 그림자로 이동 단서를 남기고 곰왕은 마지막으로 본 빈자리를 공격한다. 고정 위치의 카메라가 빠르게 팬하고 초점을 넘겨 옆에서 멈춘 아타호와 헛친 곰왕을 함께 드러낸다.',
  techniques: ['단색 연기', '이동 가림', '헛공격', '퀵 PAN', '초점 넘기기'],
  beats: [
    { time: timing.smoke, label: '단색 연기 발생 · 이전 자리 가림' },
    { time: timing.move, label: '연기 속 실제 옆 달리기 · 발과 그림자 단서' },
    { time: timing.attack, label: '곰왕 공격 준비 · 마지막 위치 조준' },
    { time: timing.arrived, label: '이탈 완료 · 화면 밖에서 정지' },
    { time: timing.miss, label: '헛공격 · 연기 속 빈자리' },
    { time: timing.pan, label: '퀵 PAN · 이전 자리에서 실제 위치로' },
    { time: timing.reveal, label: '이동한 아타호 공개 · 초점 전환 시작' },
    { time: timing.focus, label: '초점 정착 · 공격 없는 교란의 결과' },
    { time: timing.settled, label: '연기 회수 · 두 배우의 거리 확인' },
  ],
  draw: drawSmokeDecoy,
};
