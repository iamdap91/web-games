import * as THREE from 'three';
import { NaturalScenery } from './natural-scenery.js';
import {
  type MapKit,
  type SurfaceKind,
} from '../../../prototypes/boar-turn-battle/map-kit.js';
import type { EncounterId } from '../../../prototypes/boar-turn-battle/encounters.js';
import type {
  TrailArea,
  TrailDefinition,
  TrailPoint,
} from './route-layouts.js';

const camera = {
  x: 0,
  y: 26,
  z: 33,
  targetX: 0,
  targetZ: 0,
  span: 18.5,
} as const;

export const alternateTrailDefinitions: Record<EncounterId, TrailDefinition> = {
  boar: {
    name: '솔바람 계곡산책로',
    description:
      '물방앗간과 바위 굴다리 사이, 연못 양옆을 돌아가는 솔숲 산책로.',
    start: { x: 0, z: 8.0 },
    areas: [
      { minX: -2.1, maxX: 2.1, minZ: 3.8, maxZ: 9.5 },
      { minX: -12.5, maxX: 13.0, minZ: 3.8, maxZ: 7.5 },
      { minX: -12.5, maxX: -8.8, minZ: -5.8, maxZ: 5.7 },
      { minX: -10.7, maxX: 11.2, minZ: -8.8, maxZ: -5.1 },
      { minX: 9.3, maxX: 13.0, minZ: -6.9, maxZ: 5.7 },
      { minX: -1.8, maxX: 1.8, minZ: -7.0, maxZ: 5.8 },
    ],
    landmarks: [
      {
        id: 'watermill',
        name: '솔그늘 물방앗간',
        position: { x: -10.6, z: -1.0 },
        description:
          '수차와 작은 물받이가 남은 방앗간. 서쪽 길을 돌아가면 연못 북쪽에서 다시 만난다.',
        kind: 'view',
      },
      {
        id: 'rock-tunnel',
        name: '바위 굴다리',
        position: { x: 11.1, z: -0.8 },
        description:
          '두꺼운 바위 안으로 뚫린 굴다리. 동쪽 길과 연못 한가운데 돌길이 북쪽에서 합쳐진다.',
        kind: 'view',
      },
      {
        id: 'battle',
        name: '계곡 안쪽 전투 입구',
        position: { x: 0, z: -7.0 },
        description:
          '솔숲 안쪽의 둔덕으로 이어지는 길. 바닥에는 굵은 발굽 자국이 남아 있다.',
        kind: 'battle',
      },
    ],
    ground: 'grass',
    sky: 0xc3d2bb,
    shade: 0x66785a,
    sun: 0xffe8b7,
    camera,
  },
  bear: {
    name: '백서리 바람능선',
    description:
      '큰 얼음아치와 둥근 관측소를 지나 바람에 깎인 능선을 한 바퀴 도는 길.',
    start: { x: -13.1, z: -7.5 },
    areas: [
      { minX: -15.5, maxX: -10.5, minZ: -9.3, maxZ: -5.6 },
      { minX: -13.8, maxX: -10.1, minZ: -7.4, maxZ: 5.5 },
      { minX: -12.0, maxX: 1.8, minZ: 2.8, maxZ: 6.5 },
      { minX: -1.8, maxX: 1.8, minZ: -4.8, maxZ: 4.7 },
      { minX: 0, maxX: 14.5, minZ: -6.5, maxZ: -2.8 },
      { minX: 10.8, maxX: 14.5, minZ: -4.6, maxZ: 8.7 },
      { minX: -0.1, maxX: 12.6, minZ: 5.0, maxZ: 8.7 },
    ],
    landmarks: [
      {
        id: 'ice-arch',
        name: '푸른 바람아치',
        position: { x: -11.95, z: -0.9 },
        description:
          '바람에 열린 큰 얼음아치. 능선의 서쪽 길을 따라 남쪽 굽이로 내려간다.',
        kind: 'view',
      },
      {
        id: 'observatory',
        name: '둥근 능선 관측소',
        position: { x: 12.5, z: -4.8 },
        description:
          '눈이 얹힌 둥근 지붕과 긴 관측통. 가운데 길과 바깥 능선길이 여기서 합쳐진다.',
        kind: 'view',
      },
      {
        id: 'battle',
        name: '눈바람 끝 전투 입구',
        position: { x: 12.5, z: 7.1 },
        description:
          '능선 끝의 눈바람이 두 갈래로 갈라진다. 그 너머로 거대한 발자국이 이어진다.',
        kind: 'battle',
      },
    ],
    ground: 'snow',
    sky: 0xc7dce5,
    shade: 0x829bb2,
    sun: 0xf0f4df,
    camera,
  },
  armadillo: {
    name: '잿불 흑요석채석장',
    description:
      '채석기와 검은 기둥을 크게 돌아가거나 가운데 운반로로 가로지르는 채석장.',
    start: { x: 13.2, z: 7.3 },
    areas: [
      { minX: 8.2, maxX: 15.5, minZ: 5.2, maxZ: 9.0 },
      { minX: 11.8, maxX: 15.5, minZ: -7.5, maxZ: 7.0 },
      { minX: -1.5, maxX: 13.6, minZ: -9.2, maxZ: -5.5 },
      { minX: -3.3, maxX: 0.4, minZ: -7.3, maxZ: 1.2 },
      { minX: -14.3, maxX: -1.4, minZ: -0.8, maxZ: 2.9 },
      { minX: -14.3, maxX: -10.6, minZ: 1.2, maxZ: 8.7 },
      { minX: -12.5, maxX: 10.2, minZ: 5.0, maxZ: 8.7 },
      { minX: 4.0, maxX: 7.7, minZ: -7.0, maxZ: 6.5 },
    ],
    landmarks: [
      {
        id: 'black-pillars',
        name: '검은 기둥 절벽',
        position: { x: 13.6, z: -1.8 },
        description:
          '깨진 면마다 빛이 다른 흑요석 기둥. 북쪽 채석길과 가운데 운반로가 이어져 있다.',
        kind: 'view',
      },
      {
        id: 'stone-crane',
        name: '멈춘 채석기',
        position: { x: -7.3, z: 0.6 },
        description:
          '굵은 목재와 도르래로 돌을 끌어올리던 채석기. 잘라낸 돌층이 발밑 아래로 겹쳐 보인다.',
        kind: 'view',
      },
      {
        id: 'battle',
        name: '채석장 서문 전투 입구',
        position: { x: -12.3, z: 7.0 },
        description:
          '낡은 계근문 너머로 재가 쌓인 공터가 열린다. 단단한 갑각이 긁고 간 홈이 보인다.',
        kind: 'battle',
      },
    ],
    ground: 'basalt',
    sky: 0xb9b1ad,
    shade: 0x646071,
    sun: 0xffdbc1,
    camera,
  },
  mantis: {
    name: '바람대숲 물가정원',
    description:
      '연못 둘레의 대숲길과 한가운데 징검다리, 작은 정자를 잇는 물가 정원.',
    start: { x: 12.8, z: -7.4 },
    areas: [
      { minX: 8.5, maxX: 15.5, minZ: -9.2, maxZ: -5.5 },
      { minX: 11.8, maxX: 15.5, minZ: -7.0, maxZ: 7.8 },
      { minX: -2.2, maxX: 13.6, minZ: 5.0, maxZ: 8.7 },
      { minX: -3.8, maxX: -0.1, minZ: -0.8, maxZ: 6.8 },
      { minX: -14.3, maxX: -2.0, minZ: -2.6, maxZ: 1.1 },
      { minX: -14.3, maxX: -10.6, minZ: -7.8, maxZ: -0.7 },
      { minX: -12.5, maxX: 10.3, minZ: -9.2, maxZ: -5.5 },
      { minX: 3.2, maxX: 6.9, minZ: -7.2, maxZ: 6.8 },
    ],
    landmarks: [
      {
        id: 'stepping-stones',
        name: '연못 징검다리',
        position: { x: 5.0, z: 0.0 },
        description:
          '넓고 낮은 돌이 물 위로 이어진다. 연못을 크게 돌지 않고 남쪽 정원으로 건너갈 수 있다.',
        kind: 'view',
      },
      {
        id: 'waterside-pavilion',
        name: '대숲 물가정자',
        position: { x: -2.8, z: 3.2 },
        description:
          '대나무 처마와 네 기둥이 남은 정자. 물가를 감싼 길은 서쪽 대숲에서 다시 북쪽으로 돌아간다.',
        kind: 'view',
      },
      {
        id: 'battle',
        name: '정원 북문 전투 입구',
        position: { x: -12.4, z: -6.7 },
        description:
          '오래된 정원문 사이로 대숲이 갈라진다. 가는 칼날 같은 흔적이 문기둥에 남아 있다.',
        kind: 'battle',
      },
    ],
    ground: 'grass',
    sky: 0xc7d8c7,
    shade: 0x647c6a,
    sun: 0xffeab9,
    camera,
  },
};

const gardenCrossing: TrailArea = {
  minX: 3.2,
  maxX: 6.9,
  minZ: -4.8,
  maxZ: 4.7,
};

function clearOfTrail(
  region: EncounterId,
  point: TrailPoint,
  radius: number,
): boolean {
  return alternateTrailDefinitions[region].areas.every(
    (area) =>
      point.x + radius < area.minX ||
      point.x - radius > area.maxX ||
      point.z + radius < area.minZ ||
      point.z - radius > area.maxZ,
  );
}

/** 보행 사각형의 합집합을 한 번만 그려 겹치는 길판의 깜빡임을 피한다. */
function timber(
  kit: MapKit,
  from: { readonly x: number; readonly y: number; readonly z: number },
  to: { readonly x: number; readonly y: number; readonly z: number },
  radius: number,
  kind: SurfaceKind = 'bark',
): THREE.Mesh {
  const direction = new THREE.Vector3(
    to.x - from.x,
    to.y - from.y,
    to.z - from.z,
  );
  const mesh = kit.mesh(
    new THREE.CylinderGeometry(radius * 0.76, radius, direction.length(), 7),
    kind,
    { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 },
  );
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return mesh;
}

function bankRock(
  nature: NaturalScenery,
  region: EncounterId,
  point: TrailPoint,
  scale: { readonly x: number; readonly y: number; readonly z: number },
  seed: number,
): void {
  if (!clearOfTrail(region, point, Math.max(scale.x, scale.z) * 1.14 + 0.18))
    return;
  nature.rock({ ...point, y: scale.y * 0.35 }, scale, {
    kind: region === 'armadillo' ? 'basalt' : 'stone',
    moss: region === 'boar' || region === 'mantis',
    snow: region === 'bear',
    seed,
  });
}

function understory(
  nature: NaturalScenery,
  region: EncounterId,
  point: TrailPoint,
  radius: number,
  seed: number,
  y = 0,
): void {
  if (!clearOfTrail(region, point, radius * 1.2 + 0.22)) return;
  nature.shrub({ ...point, y }, radius, { snow: region === 'bear', seed });
}

function roof(
  kit: MapKit,
  point: TrailPoint,
  y: number,
  width: number,
  depth: number,
  kind: SurfaceKind,
): void {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0.02);
  shape.lineTo(-width * 0.29, 0.21);
  shape.lineTo(0, 0.85);
  shape.lineTo(width * 0.29, 0.25);
  shape.lineTo(width / 2, 0.04);
  shape.lineTo(width / 2, -0.13);
  shape.lineTo(width * 0.29, 0.08);
  shape.lineTo(0, 0.67);
  shape.lineTo(-width * 0.29, 0.04);
  shape.lineTo(-width / 2, -0.16);
  shape.closePath();
  kit.mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    kind,
    {
      x: point.x,
      y,
      z: point.z - depth / 2,
    },
  );
  for (const side of [-1, 1]) {
    timber(
      kit,
      { x: point.x, y: y + 0.83, z: point.z + depth / 2 + 0.035 },
      {
        x: point.x + (side * width) / 2,
        y: y + 0.02,
        z: point.z + depth / 2 + 0.035,
      },
      0.075,
      'wood',
    );
    timber(
      kit,
      { x: point.x + side * width * 0.48, y: y - 0.07, z: point.z - depth / 2 },
      { x: point.x + side * width * 0.48, y: y - 0.07, z: point.z + depth / 2 },
      0.07,
      'bark',
    );
  }
}

/** 같은 통행 구멍을 남기되 바깥 단면과 재료 조각은 고르게 반복하지 않는다. */
function arch(
  kit: MapKit,
  point: TrailPoint,
  kind: 'stone' | 'ice',
  inner: number,
  outer: number,
): void {
  for (const side of [-1, 1]) {
    const support = kit.mesh(
      new THREE.CylinderGeometry(0.43, 0.51, 2.15, 7),
      kind,
      {
        x: point.x + side * (inner + 0.36),
        y: 1.04,
        z: point.z,
      },
    );
    support.scale.z = 1.27;
    support.rotation.y = side * 0.2;
  }
  for (let i = 0; i < 12; i++) {
    const from = (i / 12) * Math.PI + 0.005,
      to = ((i + 1) / 12) * Math.PI - 0.005,
      outside = outer + Math.sin(i * 2.7) * 0.14;
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(from) * inner, 2 + Math.sin(from) * inner);
    shape.lineTo(Math.cos(from) * outside, 2 + Math.sin(from) * outside);
    shape.lineTo(
      Math.cos(to) * (outside + 0.06),
      2 + Math.sin(to) * (outside + 0.06),
    );
    shape.lineTo(Math.cos(to) * inner, 2 + Math.sin(to) * inner);
    shape.closePath();
    kit.mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 1.05 + (i % 3) * 0.1,
        bevelEnabled: false,
      }),
      kind,
      {
        x: point.x,
        y: 0,
        z: point.z - 0.61 - Math.sin(i * 1.9) * 0.045,
      },
    );
    if (i % 3 !== 1) {
      const a = (from + to) / 2;
      kit.rock(
        {
          x: point.x + Math.cos(a) * (outside - 0.04),
          y: 2 + Math.sin(a) * (outside - 0.04),
          z: point.z - 0.05,
        },
        { x: 0.38 + (i % 2) * 0.15, y: kind === 'ice' ? 0.13 : 0.17, z: 0.51 },
        kind === 'ice' ? 'snow' : 'moss',
      );
    }
  }
}

function wheel(kit: MapKit): void {
  const support = new THREE.Group();
  support.position.set(-13.4, 1.42, -1.3);
  support.rotation.y = 1.1;
  kit.root.add(support);
  const model = new THREE.Group();
  model.name = 'trail-waterwheel';
  support.add(model);
  for (const radius of [1.25, 0.98])
    kit.mesh(
      new THREE.TorusGeometry(radius, radius > 1 ? 0.11 : 0.055, 7, 24),
      'wood',
      { x: 0, y: 0, z: 0 },
      model,
    );
  const hub = kit.mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.72, 9),
    'wood',
    { x: 0, y: 0, z: -0.1 },
    model,
  );
  hub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const spoke = kit.box(
      { x: Math.cos(angle) * 0.64, y: Math.sin(angle) * 0.64, z: 0 },
      { x: 1.17, y: 0.1, z: 0.14 },
      'wood',
      model,
    );
    spoke.rotation.z = angle;
    const paddle = kit.box(
      { x: Math.cos(angle) * 1.25, y: Math.sin(angle) * 1.25, z: 0 },
      { x: 0.14, y: 0.43, z: 0.54 },
      i % 4 ? 'wood' : 'moss',
      model,
    );
    paddle.rotation.z = angle;
  }
}

function valley(kit: MapKit, nature: NaturalScenery): void {
  kit.material('ice').color.setHex(0x7aa798);
  kit.material('ice').roughness = 0.8;
  for (let i = 0; i < 15; i++) {
    const stone = kit.box(
      { x: Math.sin(i * 1.7) * 0.04, y: 0.025, z: -4.7 + ((i + 0.5) / 15) * 8 },
      { x: 3.6, y: 0.05, z: 8 / 15 - 0.025 },
      'stone',
    );
    stone.rotation.y = Math.sin(i * 2.3) * 0.012;
  }
  const mill = { x: -14.5, z: -1.3 };
  nature.rock(
    { ...mill, y: 0.05 },
    { x: 1.68, y: 0.19, z: 1.6 },
    { moss: true, seed: 120 },
  );
  kit.box({ ...mill, y: 1.3 }, { x: 2.8, y: 2.2, z: 2.6 }, 'wood');
  for (const x of [-15.95, -13.05])
    for (const z of [-2.65, 0.05]) {
      timber(kit, { x, y: 0.15, z }, { x: x + 0.03, y: 2.91, z }, 0.11);
      kit.box({ x, y: 0.23, z }, { x: 0.42, y: 0.46, z: 0.44 }, 'stone');
    }
  for (const y of [0.5, 1.1, 1.9])
    kit.box({ x: mill.x, y, z: 0.035 }, { x: 2.85, y: 0.07, z: 0.09 }, 'bark');
  roof(kit, mill, 2.55, 3.7, 3.2, 'bark');
  for (const [x, z, width] of [
    [-15.5, -2.3, 0.58],
    [-14.9, -1.3, 0.62],
    [-13.65, -0.4, 0.4],
    [-15.7, -0.3, 0.5],
  ] as const)
    kit.rock(
      { x, y: 2.95 - Math.abs(x - mill.x) * 0.17, z },
      { x: width, y: 0.09, z: 0.42 },
      'moss',
    );
  wheel(kit);
  kit.box({ x: -14.5, y: 0.7, z: 0.18 }, { x: 0.8, y: 1.2, z: 0.12 }, 'bark');
  for (const x of [-15.35, -13.75]) {
    kit.box({ x, y: 1.45, z: 0.065 }, { x: 0.4, y: 0.5, z: 0.08 }, 'bark');
    for (const dx of [-0.13, 0.13])
      kit.box(
        { x: x + dx, y: 1.45, z: 0.12 },
        { x: 0.035, y: 0.43, z: 0.035 },
        'wood',
      );
  }
  for (let i = 0; i < 5; i++) {
    const board = kit.box(
      { x: -15.6 + i * 0.34, y: 0.17, z: 0.6 + (i % 2) * 0.12 },
      { x: 0.27, y: 0.11, z: 0.84 },
      'wood',
    );
    board.rotation.y = -0.25 + i * 0.08;
  }
  arch(kit, { x: 11.15, z: -0.8 }, 'stone', 2.15, 2.8);
  for (const [x, z, width, height] of [
    [7.7, -1.2, 0.87, 1.3],
    [15.0, -1.5, 0.9, 1.7],
    [7.8, 0.6, 0.8, 0.9],
    [15.1, 0.5, 1.0, 1.1],
  ] as const)
    bankRock(
      nature,
      'boar',
      { x, z },
      { x: width, y: height, z: 1.0 },
      Math.round(x * 11 + z),
    );
  nature.shrub({ x: 10.1, y: 4.45, z: -0.95 }, 0.7, { seed: 141 });
  nature.shrub({ x: 12.5, y: 3.9, z: -1.1 }, 0.62, { seed: 142 });
  for (const [x, z, height] of [
    [-6.5, -10.8, 3.7],
    [5.5, -10.8, 4.1],
    [-16.8, 5.0, 4.2],
    [16.9, 5.8, 3.9],
  ] as const)
    if (clearOfTrail('boar', { x, z }, height * 0.29))
      nature.pine({ x, z }, height, { seed: Math.round(x * x + z * 3) });
  for (const [x, z, height, seed] of [
    [-5.5, -0.9, 2.7, 153],
    [5.4, 0.8, 2.5, 154],
  ] as const) {
    nature.rock(
      { x, y: 0.05, z },
      { x: 1.5, y: 0.34, z: 1.05 },
      { moss: true, seed },
    );
    nature.pine({ x: x - 0.2, y: 0.38, z: z - 0.12 }, height, { seed });
    understory(nature, 'boar', { x: x + 0.6, z: z + 0.2 }, 0.6, seed + 2, 0.25);
  }
  for (const [x, z, radius, seed] of [
    [-6.5, -10.6, 0.58, 161],
    [0.7, -10.6, 0.63, 162],
    [7.5, -10.8, 0.57, 163],
    [-15.8, 1.2, 0.55, 165],
    [-15.6, -3.9, 0.64, 166],
    [-3.6, -10.1, 0.64, 167],
    [3.1, -10.2, 0.6, 168],
  ] as const)
    understory(nature, 'boar', { x, z }, radius, seed);
  for (const side of [-1, 1]) {
    kit.rootBranch(
      [
        { x: side * 6.2, y: 0.26, z: -3.8 },
        { x: side * 5.25, y: 0.2, z: -3.1 },
        { x: side * 4.8, y: 0.04, z: -2.65 },
      ],
      0.12,
    );
    timber(
      kit,
      { x: side * 6.8, y: 0.13, z: 2.4 },
      { x: side * 5.4, y: 0.14, z: 2.1 },
      0.13,
    );
    timber(
      kit,
      { x: side * 5.7, y: 0.15, z: 2.2 },
      { x: side * 5.4, y: 0.3, z: 1.65 },
      0.055,
    );
  }
  for (const x of [-2.8, 2.8]) {
    nature.rock(
      { x, y: 0.43, z: -10 },
      { x: 0.58, y: 0.85, z: 0.57 },
      { moss: true, seed: x < 0 ? 170 : 171 },
    );
    understory(
      nature,
      'boar',
      { x: x + 0.45, z: -10.15 },
      0.48,
      x < 0 ? 172 : 173,
    );
  }
}

function observatory(kit: MapKit, nature: NaturalScenery): void {
  const point = { x: 12.8, z: -8.5 };
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const stone = kit.box(
      {
        x: point.x + Math.cos(a) * 1.48,
        y: 0.18,
        z: point.z + Math.sin(a) * 1.48,
      },
      { x: 0.88, y: 0.36, z: 0.61 },
      'stone',
    );
    stone.rotation.y = -a + Math.PI / 2;
  }
  kit.mesh(new THREE.CylinderGeometry(1.45, 1.55, 1.7, 14), 'wood', {
    ...point,
    y: 1.1,
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    timber(
      kit,
      {
        x: point.x + Math.cos(a) * 1.49,
        y: 0.4,
        z: point.z + Math.sin(a) * 1.49,
      },
      {
        x: point.x + Math.cos(a) * 1.42,
        y: 1.95,
        z: point.z + Math.sin(a) * 1.42,
      },
      0.035,
      'bark',
    );
  }
  kit.mesh(
    new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    'snow',
    { ...point, y: 1.95 },
  );
  for (const [dx, dz, radius] of [
    [-0.8, -0.4, 0.62],
    [0.6, -0.65, 0.67],
    [0.1, 0.65, 0.53],
  ] as const)
    kit.rock(
      { x: point.x + dx, y: 3.18 + (dz < 0 ? 0.12 : 0), z: point.z + dz },
      { x: radius, y: 0.18, z: radius * 0.75 },
      'snow',
    );
  kit.box(
    { x: point.x, y: 1.1, z: point.z + 1.48 },
    { x: 0.68, y: 1.4, z: 0.12 },
    'bark',
  );
  for (const side of [-1, 1])
    kit.box(
      { x: point.x + side * 0.4, y: 1.15, z: point.z + 1.54 },
      { x: 0.09, y: 1.58, z: 0.15 },
      'wood',
    );
  for (const [dx, dz] of [
    [-1.32, 0.5],
    [1.3, 0.56],
  ] as const) {
    kit.box(
      { x: point.x + dx, y: 1.35, z: point.z + dz },
      { x: 0.2, y: 0.42, z: 0.26 },
      'ice',
    );
    kit.rock(
      { x: point.x + dx, y: 1.61, z: point.z + dz },
      { x: 0.35, y: 0.055, z: 0.29 },
      'snow',
    );
  }
  const scope = new THREE.Group();
  scope.position.set(point.x - 0.3, 3.25, point.z - 0.15);
  scope.rotation.z = 0.95;
  kit.root.add(scope);
  kit.mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 2.3, 12),
    'ice',
    { x: 0, y: 0, z: 0 },
    scope,
  );
  for (const y of [-1.08, -0.25, 0.55, 1.1])
    kit.mesh(
      new THREE.CylinderGeometry(
        y > 0 ? 0.25 : 0.34,
        y > 0 ? 0.25 : 0.34,
        0.09,
        12,
      ),
      'wood',
      { x: 0, y, z: 0 },
      scope,
    );
  kit.box(
    { x: point.x, y: 2.9, z: point.z },
    { x: 0.25, y: 0.8, z: 0.25 },
    'wood',
  );
  for (const side of [-1, 1]) {
    nature.rock(
      { x: point.x + side * 1.7, y: 0.06, z: -8.5 + side * 0.45 },
      { x: 0.62, y: 0.2, z: 0.95 },
      { snow: true, seed: 210 + side },
    );
    const brace = timber(
      kit,
      { x: point.x + side * 0.75, y: 1.95, z: point.z },
      { x: point.x, y: 2.75, z: point.z },
      0.065,
      'wood',
    );
    brace.castShadow = true;
  }
}

function windRidge(kit: MapKit, nature: NaturalScenery): void {
  arch(kit, { x: -11.95, z: -0.9 }, 'ice', 2.1, 2.7);
  observatory(kit, nature);
  for (const [x, z, width, height, seed] of [
    [-6.2, -2.0, 1.75, 0.8, 221],
    [-5.9, 0.5, 1.65, 0.62, 222],
    [5.2, 0.1, 1.7, 1.05, 223],
    [8.0, 0.7, 1.25, 0.75, 224],
  ] as const)
    bankRock(nature, 'bear', { x, z }, { x: width, y: height, z: 1.05 }, seed);
  for (let i = 0; i < 5; i++) {
    const slab = kit.mesh(
      new THREE.ConeGeometry(0.68, 1.45 + (i % 3) * 0.25, 5),
      'ice',
      { x: 4.2 + i * 0.79, y: 0.68, z: 1.35 + Math.sin(i * 1.8) * 0.32 },
    );
    slab.scale.z = 0.45;
    slab.rotation.set(0.07, i * 0.3, -0.31 + i * 0.07);
    kit.rock(
      { x: 4.1 + i * 0.79, y: 0.14, z: 1.45 + Math.sin(i * 1.8) * 0.32 },
      { x: 0.72, y: 0.2, z: 0.59 },
      'snow',
    );
  }
  for (const [x, z, height] of [
    [-16.0, -3.4, 3.9],
    [-16.4, 3.8, 3.5],
    [-7.1, 8.5, 3.1],
    [-2.8, 8.8, 2.7],
    [3.5, -9.2, 4.2],
    [8.1, -9.8, 3.5],
    [16.8, 0.5, 3.8],
  ] as const)
    if (clearOfTrail('bear', { x, z }, height * 0.27))
      nature.pine({ x, z }, height, {
        snow: true,
        seed: Math.round(x * x + z * 9),
      });
  for (const [x, z, radius, seed] of [
    [-8.1, -3.5, 0.65, 231],
    [-7.6, 1.1, 0.55, 232],
    [2.9, 1.6, 0.58, 233],
    [8.6, 1.9, 0.62, 234],
    [-8.5, 8.1, 0.57, 235],
    [5.7, -8.5, 0.72, 236],
    [15.9, 5.6, 0.5, 237],
  ] as const)
    understory(nature, 'bear', { x, z }, radius, seed);
  for (const [x, z, seed] of [
    [-5.1, -1.7, 241],
    [6.9, 1.1, 242],
    [-4.1, 1.2, 243],
  ] as const)
    if (clearOfTrail('bear', { x, z }, 0.8)) {
      timber(
        kit,
        { x: x - 0.48, y: 0.14, z: z - 0.17 },
        { x: x + 0.59, y: 0.16, z: z + 0.1 },
        0.12,
      );
      timber(
        kit,
        { x, y: 0.18, z },
        { x: x + 0.2, y: 0.47, z: z - 0.42 },
        0.045,
      );
      nature.rock(
        { x: x - 0.18, y: 0.05, z: z + 0.08 },
        { x: 0.66, y: 0.12, z: 0.32 },
        { kind: 'snow', snow: true, seed },
      );
    }
  for (let i = 0; i < 4; i++) {
    const z = -0.3 + i * 1.5;
    timber(
      kit,
      { x: 15.2, y: 0.04, z },
      { x: 15.24 + (i % 2) * 0.05, y: 0.93 - (i % 2) * 0.12, z },
      0.075,
      'wood',
    );
    timber(
      kit,
      { x: 15.22, y: 0.68, z },
      { x: 15.22, y: 0.54, z: z + 1.45 },
      0.035,
      'rope',
    );
    kit.rock({ x: 15.21, y: 0.09, z }, { x: 0.37, y: 0.1, z: 0.38 }, 'snow');
  }
}

function quarryCrane(kit: MapKit, nature: NaturalScenery): void {
  for (const x of [-8.7, -5.3]) {
    nature.rock(
      { x, y: 0.07, z: -3.5 },
      { x: 0.6, y: 0.18, z: 0.58 },
      { kind: 'ash', seed: Math.round(x * x) },
    );
    timber(
      kit,
      { x, y: 0.13, z: -3.5 },
      { x: x + 0.04, y: 3.83, z: -3.46 },
      0.22,
      'wood',
    );
    timber(kit, { x, y: 0.28, z: -4.8 }, { x, y: 2.5, z: -3.5 }, 0.11);
  }
  kit.box({ x: -7, y: 3.85, z: -3.5 }, { x: 4.4, y: 0.38, z: 0.45 }, 'wood');
  for (const side of [-1, 1]) {
    timber(
      kit,
      { x: -7 + side * 1.65, y: 2.0, z: -3.48 },
      { x: -7 + side * 0.55, y: 3.63, z: -3.48 },
      0.11,
      'wood',
    );
    for (const y of [0.68, 2.25, 3.6])
      kit.box(
        { x: -7 + side * 1.7, y, z: -3.5 },
        { x: 0.48, y: 0.12, z: 0.47 },
        'rope',
      );
  }
  kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), 'rope', {
    x: -7,
    y: 2.45,
    z: -3.15,
  });
  for (const z of [-3.4, -3.2]) {
    const pulley = kit.mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.09, 14),
      'basalt',
      { x: -7, y: 3.6, z },
    );
    pulley.rotation.x = Math.PI / 2;
  }
  const hook = kit.mesh(
    new THREE.TorusGeometry(0.19, 0.055, 6, 16, Math.PI * 1.4),
    'basalt',
    { x: -7, y: 1.25, z: -3.15 },
  );
  hook.rotation.z = -0.45;
  for (let i = 0; i < 3; i++)
    nature.rock(
      { x: -7.35 + i * 0.28, y: 0.09 + i * 0.17, z: -4.8 + i * 0.72 },
      { x: 2.7 - i * 0.32, y: 0.23, z: 0.83 },
      { kind: 'basalt', seed: 310 + i },
    );
  nature.rock(
    { x: -6.7, y: 0.3, z: -2.45 },
    { x: 0.94, y: 0.55, z: 0.64 },
    { kind: 'basalt', seed: 314 },
  );
  for (let i = 0; i < 9; i++) {
    const dx = Math.sin(i * 2.3) * 1.1,
      z = -2.8 + Math.cos(i * 1.9) * 0.55;
    nature.rock(
      { x: -7 + dx, y: 0.04, z },
      { x: 0.13 + (i % 3) * 0.04, y: 0.11, z: 0.19 },
      { kind: i % 3 ? 'basalt' : 'ash', seed: 320 + i },
    );
  }
  timber(
    kit,
    { x: -9.8, y: 0.12, z: -3.9 },
    { x: -9.3, y: 0.14, z: -2.8 },
    0.1,
    'wood',
  );
}

function quarry(kit: MapKit, nature: NaturalScenery): void {
  kit.material('basalt').color.setHex(0xa1a5ae);
  kit.material('basalt').roughness = 0.53;
  quarryCrane(kit, nature);
  for (const [x, z, height, radius] of [
    [17.05, -4.0, 3.5, 0.87],
    [17.4, -1.8, 4.7, 0.94],
    [17.1, 0.6, 3.6, 0.91],
    [16.95, 3.0, 2.5, 0.76],
  ] as const) {
    const column = kit.mesh(
      new THREE.CylinderGeometry(radius * 0.8, radius, height, 6),
      'basalt',
      { x, y: height / 2, z },
    );
    column.rotation.set(0.035, z * 0.4, Math.sin(z) * 0.035);
    nature.rock(
      { x: x + 0.18, y: 0.18, z: z + 0.4 },
      { x: radius * 0.9, y: 0.36, z: radius * 0.8 },
      { kind: 'ash', seed: Math.round(height * 91) },
    );
    nature.rock(
      { x: x - 0.24, y: height - 0.1, z },
      { x: radius * 0.7, y: 0.17, z: radius * 0.59 },
      { kind: 'basalt', seed: Math.round(height * 93) },
    );
  }
  for (const [x, z, width, height, seed] of [
    [-11.7, -4.0, 1.15, 1.45, 331],
    [-9.4, -7.3, 1.02, 2.0, 332],
    [-5.4, -10.5, 1.3, 1.4, 333],
    [9.5, -2.3, 1.05, 1.2, 334],
    [9.5, 2.0, 0.94, 0.9, 335],
    [-6.7, 3.9, 0.55, 0.5, 336],
  ] as const)
    bankRock(
      nature,
      'armadillo',
      { x, z },
      { x: width, y: height, z: 0.78 },
      seed,
    );
  for (const point of [
    { x: -11.6, z: -6.6 },
    { x: -5.1, z: -2.6 },
    { x: 9.2, z: 0.3 },
  ])
    if (clearOfTrail('armadillo', point, 0.8)) {
      timber(
        kit,
        { x: point.x - 0.5, y: 0.15, z: point.z },
        { x: point.x + 0.6, y: 0.11, z: point.z - 0.35 },
        0.14,
      );
      timber(
        kit,
        { x: point.x + 0.1, y: 0.17, z: point.z - 0.2 },
        { x: point.x + 0.55, y: 0.42, z: point.z + 0.15 },
        0.045,
      );
    }
  for (const [x, z, seed] of [
    [-11.7, -3.9, 341],
    [-8.4, -5.7, 342],
    [9.6, -4.0, 343],
    [9.4, 3.2, 344],
  ] as const) {
    if (!clearOfTrail('armadillo', { x, z }, 0.58)) continue;
    for (let i = 0; i < 5; i++) {
      const a = i * 2.3 + seed;
      timber(
        kit,
        { x: x + Math.cos(a) * 0.18, y: 0.03, z: z + Math.sin(a) * 0.16 },
        {
          x: x + Math.cos(a) * 0.32,
          y: 0.28 + (i % 3) * 0.09,
          z: z + Math.sin(a) * 0.27,
        },
        0.018,
        'rope',
      );
    }
  }
  for (const z of [5.3, 8.7]) {
    timber(
      kit,
      { x: -15.65, y: 0.1, z },
      { x: -15.63, y: 2.25, z },
      0.18,
      'wood',
    );
    nature.rock(
      { x: -15.65, y: 0.05, z },
      { x: 0.49, y: 0.18, z: 0.5 },
      { kind: 'stone', seed: Math.round(z * 19) },
    );
  }
  kit.box({ x: -15.65, y: 2.4, z: 7 }, { x: 0.4, y: 0.28, z: 4 }, 'wood');
  kit.box(
    { x: -15.39, y: 2.03, z: 7 },
    { x: 0.11, y: 0.48, z: 1.2 },
    'cloth',
  ).rotation.x = -0.05;
}

function pavilion(kit: MapKit, nature: NaturalScenery): void {
  const point = { x: -6, z: 3.4 };
  nature.rock(
    { ...point, y: 0.02 },
    { x: 1.67, y: 0.16, z: 1.48 },
    { moss: true, seed: 410 },
  );
  for (const x of [-7.3, -4.7])
    for (const z of [2.3, 4.5]) {
      timber(kit, { x, y: 0.15, z }, { x: x + 0.025, y: 2.42, z }, 0.1, 'wood');
      kit.box({ x, y: 0.27, z }, { x: 0.29, y: 0.43, z: 0.31 }, 'stone');
    }
  const vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const corners = Array.from({ length: 4 }, (_, i) => ({
    x: Math.cos(Math.PI / 4 + (i * Math.PI) / 2) * 2.5,
    z: Math.sin(Math.PI / 4 + (i * Math.PI) / 2) * 2.5 * 0.87,
  }));
  for (let face = 0; face < 4; face++) {
    const a = corners[face]!,
      b = corners[(face + 1) % 4]!;
    const start = vertices.length / 3;
    for (let row = 0; row <= 4; row++) {
      const t = row / 4;
      for (let col = 0; col <= 4; col++) {
        const s = col / 4;
        vertices.push(
          ((1 - s) * a.x + s * b.x) * t,
          Math.pow(1 - t, 1.15) * 1.02 + Math.pow(t, 5) * 0.13,
          ((1 - s) * a.z + s * b.z) * t,
        );
        uv.push(s, t);
      }
    }
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const i = start + row * 5 + col;
        indices.push(i, i + 1, i + 5, i + 1, i + 6, i + 5);
      }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  kit.mesh(geometry, 'bamboo', { ...point, y: 2.26 });
  for (const corner of corners) {
    timber(
      kit,
      { x: point.x, y: 3.24, z: point.z },
      { x: point.x + corner.x, y: 2.39, z: point.z + corner.z },
      0.065,
      'bamboo',
    );
    timber(
      kit,
      { x: point.x + corner.x * 0.77, y: 2.28, z: point.z + corner.z * 0.77 },
      { x: point.x + corner.x, y: 2.35, z: point.z + corner.z },
      0.07,
      'wood',
    );
  }
  for (const x of [-7.3, -4.7])
    timber(kit, { x, y: 2.28, z: 2.3 }, { x, y: 2.28, z: 4.5 }, 0.09, 'wood');
  for (const z of [2.3, 4.5])
    timber(kit, { x: -7.3, y: 2.28, z }, { x: -4.7, y: 2.28, z }, 0.09, 'wood');
  kit.box({ x: -6, y: 0.48, z: 4.35 }, { x: 2.4, y: 0.14, z: 0.4 }, 'wood');
  for (const dx of [-0.85, 0.85])
    kit.box(
      { x: -6 + dx, y: 0.27, z: 4.35 },
      { x: 0.18, y: 0.42, z: 0.3 },
      'wood',
    );
  for (const [x, z, r, seed] of [
    [-7.6, 2.0, 0.62, 420],
    [-6.8, 4.9, 0.58, 421],
    [-4.4, 2.5, 0.45, 422],
  ] as const)
    understory(nature, 'mantis', { x, z }, r, seed);
}

/** 평평한 발 디딤면은 유지하고 옆면만 닳고 깨진 돌의 윤곽으로 만든다. */
function steppingStone(
  kit: MapKit,
  x: number,
  z: number,
  width: number,
  depth: number,
  seed: number,
): void {
  const shape = new THREE.Shape();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      radius = 0.96 + Math.sin(i * 2.7 + seed) * 0.075,
      px = ((Math.cos(a) * width) / 2) * radius,
      pz = ((Math.sin(a) * depth) / 2) * radius;
    if (i === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  const stone = kit.mesh(geometry, 'stone', { x, y: -0.036, z });
  stone.castShadow = false;
}

function watersideGarden(kit: MapKit, nature: NaturalScenery): void {
  kit.material('ice').color.setHex(0x81afa4);
  kit.material('ice').roughness = 0.76;
  const count = 7,
    length = gardenCrossing.maxZ - gardenCrossing.minZ;
  for (let i = 0; i < count; i++) {
    const z = gardenCrossing.minZ + ((i + 0.5) / count) * length;
    steppingStone(
      kit,
      5.05 + Math.sin(i * 2.4) * 0.06,
      z,
      gardenCrossing.maxX - gardenCrossing.minX + 0.16,
      length / count + 0.12,
      430 + i,
    );
    kit.rock(
      { x: 3.43 + (i % 2) * 0.12, y: 0.059, z: z + 0.1 },
      { x: 0.15, y: 0.006, z: 0.12 },
      'moss',
    ).castShadow = false;
  }
  pavilion(kit, nature);
  const points = [
    [-16.4, 2.8],
    [-16.3, -4.3],
    [-16.1, -9.0],
    [-9.0, -11.1],
    [-4.7, -11.3],
    [3.0, -11.2],
    [8.9, -11.2],
    [17.0, -3.9],
    [17.1, 1.2],
    [16.8, 6.4],
    [-8.0, 1.5],
    [-8.4, 4.4],
    [-6.6, 7.8],
    [-0.4, 10.6],
    [8.2, 10.5],
  ] as const;
  points.forEach(([x, z], i) => {
    const height = 3.2 + (i % 4) * 0.43;
    if (clearOfTrail('mantis', { x, z }, 0.77))
      nature.bamboo({ x, z }, height, { seed: 450 + i });
  });
  for (const [x, z, seed] of [
    [1.3, -3.0, 470],
    [9.1, 2.5, 471],
  ] as const) {
    nature.rock(
      { x, y: 0.02, z },
      { x: 0.8, y: 0.16, z: 0.67 },
      { moss: true, seed },
    );
    nature.bamboo({ x, y: 0.17, z }, 2.4, { seed });
  }
  for (const [x, z, radius, seed] of [
    [-15.3, 2.9, 0.63, 481],
    [-9.3, 3.0, 0.63, 482],
    [-7.1, 5.6, 0.67, 483],
    [0.9, 9.9, 0.54, 484],
    [7.9, 9.9, 0.5, 485],
    [-7.2, -4.1, 0.61, 486],
    [-9.5, 2.4, 0.58, 487],
    [10.6, 10.4, 0.55, 488],
  ] as const)
    understory(nature, 'mantis', { x, z }, radius, seed);
  for (const z of [-8.35, -5.05]) {
    timber(kit, { x: -15, y: 0.1, z }, { x: -14.95, y: 2.43, z }, 0.13, 'wood');
    nature.rock(
      { x: -15, y: 0.04, z },
      { x: 0.46, y: 0.15, z: 0.47 },
      { moss: true, seed: Math.round(z * z * 5) },
    );
  }
  timber(
    kit,
    { x: -15, y: 2.55, z: -8.7 },
    { x: -15, y: 2.58, z: -4.7 },
    0.17,
    'bamboo',
  );
  for (const point of [
    { x: 1.3, z: -0.2 },
    { x: 9.5, z: -2 },
    { x: 8.6, z: 2.7 },
    { x: 2.2, z: 1.2 },
  ]) {
    const lily = kit.mesh(
      new THREE.CircleGeometry(0.35, 16, 0.18, Math.PI * 1.84),
      'leaf',
      { ...point, y: 0.037 },
    );
    lily.rotation.set(-Math.PI / 2, 0, point.x * 0.4);
    lily.scale.y = 0.78;
  }
  for (const [x, z] of [
    [9.5, 3.5],
    [8.9, -4.1],
    [-0.2, -3.3],
  ] as const) {
    if (!clearOfTrail('mantis', { x, z }, 0.55)) continue;
    for (let i = 0; i < 5; i++)
      timber(
        kit,
        {
          x: x + Math.sin(i * 2) * 0.13,
          y: 0.03,
          z: z + Math.cos(i * 2) * 0.13,
        },
        {
          x: x + Math.sin(i * 2) * 0.28,
          y: 0.5 + (i % 3) * 0.16,
          z: z + Math.cos(i * 2) * 0.25,
        },
        0.018,
        'bamboo',
      );
  }
}

function frameLandscape(
  kit: MapKit,
  nature: NaturalScenery,
  region: EncounterId,
): void {
  const anchors = [
    { x: -13.2, z: -13.8, sx: 3.2, sy: 1.9, sz: 2.0 },
    { x: -5.9, z: -14.5, sx: 2.5, sy: 1.4, sz: 1.6 },
    { x: 1.2, z: -14.2, sx: 3.1, sy: 1.7, sz: 1.8 },
    { x: 9.5, z: -14.0, sx: 3.6, sy: 2.1, sz: 2.0 },
    { x: 16.8, z: -11.5, sx: 1.9, sy: 1.25, sz: 1.6 },
  ];
  anchors.forEach((p, i) =>
    bankRock(nature, region, p, { x: p.sx, y: p.sy, z: p.sz }, 530 + i),
  );
  for (const side of [-1, 1]) {
    nature.rock(
      { x: side * 17.3, y: 0.25, z: 10.8 },
      { x: 1.9, y: 0.7, z: 1.3 },
      {
        kind: region === 'armadillo' ? 'basalt' : 'stone',
        moss: region === 'boar' || region === 'mantis',
        snow: region === 'bear',
        seed: side < 0 ? 540 : 541,
        parent: kit.foreground,
      },
    );
    bankRock(
      nature,
      region,
      { x: side * 18, z: 0.5 },
      { x: 1.25, y: 0.95, z: 2.1 },
      side < 0 ? 542 : 543,
    );
    if (region === 'boar')
      nature.pine({ x: side * 18, z: -5.8 }, side < 0 ? 4.2 : 3.8, {
        seed: side < 0 ? 550 : 551,
      });
    else if (region === 'bear')
      nature.pine({ x: side * 18, z: -5.2 }, side < 0 ? 4.1 : 3.8, {
        snow: true,
        seed: side < 0 ? 552 : 553,
      });
    else if (region === 'mantis')
      nature.bamboo({ x: side * 18, z: -5.2 }, side < 0 ? 4.4 : 4.1, {
        seed: side < 0 ? 554 : 555,
      });
  }
  for (let i = 0; i < 33; i++) {
    const point = { x: -16 + ((i * 7.71) % 32), z: -10 + ((i * 11.93) % 20) },
      radius = 0.18 + (i % 3) * 0.105;
    if (!clearOfTrail(region, point, radius * 1.2 + 0.3)) continue;
    const waterInterior =
      (region === 'boar' &&
        point.x > -8.2 &&
        point.x < 8.5 &&
        point.z > -4.9 &&
        point.z < 3.5) ||
      (region === 'mantis' &&
        point.x > -0.3 &&
        point.x < 12 &&
        point.z > -5 &&
        point.z < 4.9);
    if (waterInterior) continue;
    if (region === 'armadillo') {
      bankRock(
        nature,
        region,
        point,
        { x: radius * 1.3, y: radius * 0.45, z: radius },
        560 + i,
      );
      continue;
    }
    if (i % 4 === 0)
      bankRock(
        nature,
        region,
        point,
        { x: radius * 1.5, y: radius * 0.5, z: radius },
        560 + i,
      );
    else understory(nature, region, point, radius, 560 + i);
  }
}

export function buildAlternateTrailEnvironment(
  kit: MapKit,
  region: EncounterId,
): void {
  const nature = new NaturalScenery(kit);
  switch (region) {
    case 'boar':
      valley(kit, nature);
      break;
    case 'bear':
      windRidge(kit, nature);
      break;
    case 'armadillo':
      quarry(kit, nature);
      break;
    case 'mantis':
      watersideGarden(kit, nature);
      break;
  }
  frameLandscape(kit, nature, region);
}
