import * as THREE from 'three';
import {
  type MapKit,
  type SurfaceKind,
} from '../../../prototypes/boar-turn-battle/map-kit.js';
import type { EncounterId } from '../../../prototypes/boar-turn-battle/encounters.js';
import { NaturalScenery } from './natural-scenery.js';

export interface TrailPoint {
  readonly x: number;
  readonly z: number;
}
export interface TrailArea {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}
export interface TrailPath {
  readonly width: number;
  readonly points: readonly TrailPoint[];
}
export interface TrailLandmark {
  readonly id: string;
  readonly name: string;
  readonly position: TrailPoint;
  readonly description: string;
  readonly kind: 'view' | 'battle';
}
export interface TrailDefinition {
  readonly name: string;
  readonly description: string;
  readonly start: TrailPoint;
  readonly areas: readonly TrailArea[];
  readonly paths?: readonly TrailPath[];
  readonly landmarks: readonly TrailLandmark[];
  readonly ground: SurfaceKind;
  readonly sky: number;
  readonly shade: number;
  readonly sun: number;
  readonly camera: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly targetX: number;
    readonly targetZ: number;
    readonly span: number;
  };
}

const trailCamera = {
  x: 0,
  y: 26,
  z: 33,
  targetX: 0,
  targetZ: 0,
  span: 18.5,
} as const;

export const trailDefinitions: Readonly<Record<EncounterId, TrailDefinition>> =
  {
    boar: {
      name: '솔바람 옛짐길',
      description:
        '폐역참에서 석교를 건너 솔숲 너머 바위 고개로 이어지는 옛 운반길.',
      start: { x: -13.5, z: 7.1 },
      areas: [
        { minX: -15.5, maxX: -6.2, minZ: 5.2, maxZ: 9.0 },
        { minX: -9.9, maxX: -6.2, minZ: -1.4, maxZ: 7.0 },
        { minX: -8.1, maxX: 1.8, minZ: -2.2, maxZ: 1.8 },
        { minX: -1.8, maxX: 1.8, minZ: -7.8, maxZ: 0.4 },
        { minX: 0, maxX: 14.4, minZ: -9.0, maxZ: -5.2 },
        { minX: -15.5, maxX: -11.8, minZ: 0.6, maxZ: 7.0 },
        { minX: -14.0, maxX: -7.4, minZ: -0.2, maxZ: 3.5 },
      ],
      landmarks: [
        {
          id: 'relay',
          name: '기와가 무너진 역참',
          position: { x: -13.3, z: 0.4 },
          description:
            '처마 아래 남은 짐받이와 빈 물통. 돌무더기 옆 작은 길로 다시 큰길에 합류한다.',
          kind: 'view',
        },
        {
          id: 'stone-bridge',
          name: '이끼 석교',
          position: { x: -3.4, z: -0.2 },
          description:
            '옅은 개울 위로 오래된 돌 난간이 이어진다. 물길 건너에서 솔 향이 불어온다.',
          kind: 'view',
        },
        {
          id: 'battle',
          name: '바위 고개 전투 입구',
          position: { x: 12.4, z: -7.1 },
          description:
            '끊어진 운반 난간 너머로 큰 발굽 자국이 공터 쪽으로 이어진다.',
          kind: 'battle',
        },
      ],
      ground: 'grass',
      sky: 0xc4d1b6,
      shade: 0x647250,
      sun: 0xffe1a8,
      camera: trailCamera,
    },
    bear: {
      name: '백서리 순례길',
      description:
        '빙하틈의 목교를 건너 풍설 쉼터와 푸른 빙폭을 돌아가는 설원 순례길.',
      start: { x: -13.5, z: 7.3 },
      areas: [
        { minX: -15.5, maxX: -9.8, minZ: 5.4, maxZ: 9.0 },
        { minX: -13.5, maxX: -9.8, minZ: -5.5, maxZ: 7.0 },
        { minX: -11.6, maxX: 5.8, minZ: -6.8, maxZ: -3.1 },
        { minX: 2.1, maxX: 5.8, minZ: -4.8, maxZ: 4.0 },
        { minX: 4.0, maxX: 14.4, minZ: 0.3, maxZ: 4.0 },
        { minX: 10.7, maxX: 14.4, minZ: -7.8, maxZ: 2.0 },
        { minX: 4.0, maxX: 12.5, minZ: -6.8, maxZ: -3.1 },
      ],
      landmarks: [
        {
          id: 'glacier-bridge',
          name: '빙하틈 목교',
          position: { x: -3.3, z: -4.9 },
          description:
            '푸른 틈 위로 굵은 판자와 밧줄이 걸려 있다. 건너편에서 곧장 고개로 가거나 쉼터를 돌아갈 수 있다.',
          kind: 'view',
        },
        {
          id: 'snow-shelter',
          name: '풍설 쉼터',
          position: { x: 7.7, z: 1.3 },
          description:
            '눈의 무게로 낮아진 지붕 아래 바람을 피하던 흔적이 남아 있다.',
          kind: 'view',
        },
        {
          id: 'battle',
          name: '빙폭 고개 전투 입구',
          position: { x: 12.5, z: -6.1 },
          description:
            '빙폭 곁의 얼어붙은 고개. 설원 깊은 곳에서 둔탁한 발소리가 울린다.',
          kind: 'battle',
        },
      ],
      ground: 'snow',
      sky: 0xbfd5df,
      shade: 0x7894af,
      sun: 0xe9f4ed,
      camera: trailCamera,
    },
    armadillo: {
      name: '잿불 운반로',
      description:
        '붉은 용암 해자를 피해 꺾이는 현무암 길과 버려진 광차, 꺼진 제련문.',
      start: { x: -13.4, z: 7.2 },
      areas: [
        { minX: -15.5, maxX: -8.0, minZ: 5.4, maxZ: 9.0 },
        { minX: -11.7, maxX: -8.0, minZ: 0.1, maxZ: 7.2 },
        { minX: -9.8, maxX: 4.7, minZ: -1.8, maxZ: 1.9 },
        { minX: 1.0, maxX: 4.7, minZ: -7.8, maxZ: 0.2 },
        { minX: 2.8, maxX: 14.4, minZ: -9.0, maxZ: -5.3 },
        { minX: -5.8, maxX: -2.1, minZ: 0, maxZ: 7.4 },
        { minX: -9.8, maxX: -2.1, minZ: 4.0, maxZ: 7.4 },
      ],
      landmarks: [
        {
          id: 'mine-cart',
          name: '버려진 광차',
          position: { x: -3.0, z: 5.7 },
          description:
            '식은 광석을 싣던 수레가 짧은 선로 끝에 멈춰 있다. 옆 운반길은 북쪽 큰길로 다시 이어진다.',
          kind: 'view',
        },
        {
          id: 'lava-moat',
          name: '잿불 해자 전망',
          position: { x: 2.8, z: -3.7 },
          description:
            '단단한 검은 길 바로 옆으로 붉은 해자가 흐른다. 위쪽 굽이를 돌아 제련문으로 향한다.',
          kind: 'view',
        },
        {
          id: 'battle',
          name: '꺼진 제련문 전투 입구',
          position: { x: 12.4, z: -7.1 },
          description:
            '불이 꺼진 제련문 앞에 뜨거운 갑각이 바닥을 긁은 흔적이 남아 있다.',
          kind: 'battle',
        },
      ],
      ground: 'ash',
      sky: 0xc6a17c,
      shade: 0x655953,
      sun: 0xffcf98,
      camera: trailCamera,
    },
    mantis: {
      name: '바람대숲 샛길',
      description:
        '대숲 사이로 크게 휘는 길. 목교와 작은 사당을 지나 옛 수련문으로 돌아든다.',
      start: { x: -13.2, z: 7.2 },
      areas: [
        { minX: -15.5, maxX: -8.8, minZ: 5.2, maxZ: 9.0 },
        { minX: -12.5, maxX: -8.8, minZ: -0.6, maxZ: 7.0 },
        { minX: -10.7, maxX: 10.0, minZ: -2.4, maxZ: 1.3 },
        { minX: 6.3, maxX: 10.0, minZ: -7.9, maxZ: -0.6 },
        { minX: -5.2, maxX: 8.1, minZ: -9.2, maxZ: -5.5 },
        { minX: 0, maxX: 3.7, minZ: -7.2, maxZ: -0.6 },
      ],
      landmarks: [
        {
          id: 'bamboo-bridge',
          name: '바람 목교',
          position: { x: -3.2, z: -0.5 },
          description:
            '가느다란 물길을 건너면 두 갈래 길이 나온다. 대숲 가운데 샛길은 사당을 돌아가는 길보다 짧다.',
          kind: 'view',
        },
        {
          id: 'small-shrine',
          name: '대숲 작은 사당',
          position: { x: 9.1, z: -4.3 },
          description:
            '낮은 처마와 작은 돌단만 남은 사당. 넓게 돌아온 길은 북쪽 수련문 앞에서 합쳐진다.',
          kind: 'view',
        },
        {
          id: 'battle',
          name: '옛 수련문 전투 입구',
          position: { x: -3.3, z: -7.3 },
          description:
            '기울어진 수련문 너머에서 대나무를 가르는 바람 소리가 들린다.',
          kind: 'battle',
        },
      ],
      ground: 'grass',
      sky: 0xc3d2b1,
      shade: 0x637865,
      sun: 0xffe9bc,
      camera: trailCamera,
    },
  };

function outsideTrail(
  definition: TrailDefinition,
  point: TrailPoint,
  radius: number,
): boolean {
  return definition.areas.every(
    (area) =>
      point.x + radius < area.minX ||
      point.x - radius > area.maxX ||
      point.z + radius < area.minZ ||
      point.z - radius > area.maxZ,
  );
}

/** 같은 areas의 합집합으로 바닥 한 장을 만들어 겹친 길판의 깜빡임을 피한다. */
function bridge(
  kit: MapKit,
  natural: NaturalScenery,
  area: TrailArea,
  kind: 'wood' | 'stone',
): void {
  const width = area.maxX - area.minX;
  const depth = area.maxZ - area.minZ;
  const centerX = (area.minX + area.maxX) / 2;
  const centerZ = (area.minZ + area.maxZ) / 2;
  const count = kind === 'wood' ? Math.ceil(width / 0.34) : 4;
  for (let i = 0; i < count; i++) {
    const board = kit.box(
      { x: area.minX + ((i + 0.5) / count) * width, y: 0.025, z: centerZ },
      { x: width / count - 0.022, y: 0.05, z: depth },
      kind,
    );
    if (kind === 'wood') board.rotation.y = Math.sin(i * 3.8) * 0.006;
  }
  for (const z of [area.minZ - 0.19, area.maxZ + 0.19]) {
    for (let i = 0; i < 4; i++) {
      const x = area.minX + (i / 3) * width;
      if (kind === 'wood') {
        timber(
          kit,
          [
            { x, y: 0.01, z },
            { x: x + 0.012, y: 0.45, z },
            { x, y: 0.9, z },
          ],
          0.075,
        );
        const tie = kit.mesh(
          new THREE.TorusGeometry(0.09, 0.025, 5, 9),
          'rope',
          { x, y: 0.66, z },
        );
        tie.rotation.x = Math.PI / 2;
      } else {
        kit.box({ x, y: 0.43, z }, { x: 0.23, y: 0.86, z: 0.24 }, 'stone');
        natural.rock(
          { x, y: 0.88, z },
          { x: 0.17, y: 0.07, z: 0.17 },
          { moss: i === 1 },
        );
      }
    }
    if (kind === 'wood')
      timber(
        kit,
        [
          { x: area.minX, y: 0.67, z },
          { x: centerX, y: 0.53, z: z + 0.012 },
          { x: area.maxX, y: 0.67, z },
        ],
        0.033,
        'rope',
      );
    else {
      const rail = kit.box(
        { x: centerX, y: 0.47, z },
        { x: width + 0.16, y: 0.19, z: 0.15 },
        'stone',
      );
      rail.rotation.z = z < centerZ ? 0.008 : -0.008;
    }
  }
}

function gableRoof(
  kit: MapKit,
  point: TrailPoint,
  y: number,
  size: {
    readonly width: number;
    readonly depth: number;
    readonly rise: number;
  },
  kind: SurfaceKind,
): void {
  const shape = new THREE.Shape();
  shape.moveTo(-size.width / 2, 0);
  shape.lineTo(0, size.rise);
  shape.lineTo(size.width / 2, 0);
  shape.lineTo(size.width / 2, -0.15);
  shape.lineTo(0, size.rise - 0.15);
  shape.lineTo(-size.width / 2, -0.15);
  shape.closePath();
  kit.mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: size.depth,
      bevelEnabled: false,
    }),
    kind,
    { x: point.x, y, z: point.z - size.depth / 2 },
  );
}

// 환경 모형은 보행 데이터와 바닥 생성 뒤에 배치한다.
function timber(
  kit: MapKit,
  points: readonly {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }[],
  radius: number,
  kind: SurfaceKind = 'wood',
): void {
  kit.mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
      ),
      8,
      radius,
      5,
      false,
    ),
    kind,
    { x: 0, y: 0, z: 0 },
  );
}

function hangingCloth(
  kit: MapKit,
  point: { readonly x: number; readonly y: number; readonly z: number },
  width: number,
  height: number,
): void {
  const geometry = new THREE.PlaneGeometry(width, height, 6, 5);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i);
    position.setXYZ(
      i,
      x,
      y + Math.sin(x * 6) * 0.025,
      Math.cos(x * 8) * 0.045 + (height / 2 - y) * 0.05,
    );
  }
  geometry.computeVertexNormals();
  const cloth = kit.mesh(geometry, 'cloth', point);
  kit.material('cloth').side = THREE.DoubleSide;
  cloth.castShadow = false;
}

function roadsideRocks(natural: NaturalScenery, region: EncounterId): void {
  const clusters: Readonly<Record<EncounterId, readonly TrailPoint[]>> = {
    boar: [
      { x: -10.9, z: 4.25 },
      { x: -7.0, z: -5.1 },
      { x: -6.4, z: 2.9 },
      { x: 4.6, z: 2.8 },
      { x: 9.6, z: 4.8 },
      { x: 13.0, z: -3.2 },
    ],
    bear: [
      { x: -7.2, z: 1.8 },
      { x: -8.2, z: 4.2 },
      { x: -0.2, z: -0.5 },
      { x: 7.8, z: 5.8 },
      { x: 15.8, z: 6.6 },
    ],
    armadillo: [
      { x: -6.9, z: 3.0 },
      { x: -14.0, z: 2.8 },
      { x: 11.4, z: -1.5 },
      { x: 1.0, z: 6.6 },
      { x: 13.0, z: 5.4 },
    ],
    mantis: [
      { x: -7.0, z: 4.5 },
      { x: -8.4, z: -6.2 },
      { x: 4.9, z: -4.2 },
      { x: 2.1, z: 4.8 },
      { x: 12.7, z: 3.8 },
    ],
  };
  clusters[region].forEach((point, index) => {
    const radius = index % 3 === 0 ? 0.55 : 0.72;
    if (!outsideTrail(trailDefinitions[region], point, radius + 0.12)) return;
    natural.rock(
      { ...point, y: radius * 0.32 },
      { x: radius, y: radius * 0.5, z: radius * 0.78 },
      {
        kind: region === 'armadillo' ? 'basalt' : 'stone',
        moss: region === 'boar' || region === 'mantis',
        snow: region === 'bear',
        seed: index * 11 + 2,
      },
    );
    const satellite = { x: point.x + radius * 0.6, z: point.z - radius * 0.68 };
    if (outsideTrail(trailDefinitions[region], satellite, 0.24))
      natural.rock(
        { ...satellite, y: 0.09 },
        { x: 0.27, y: 0.18, z: 0.22 },
        { kind: region === 'armadillo' ? 'ash' : 'stone', seed: index + 41 },
      );
    const grass = { x: point.x - radius * 0.65, z: point.z + radius * 0.54 };
    if (
      region !== 'armadillo' &&
      outsideTrail(trailDefinitions[region], grass, 0.42)
    )
      natural.shrub(grass, 0.46, { seed: index + 23, snow: region === 'bear' });
  });
}

function buildOldRelay(kit: MapKit, natural: NaturalScenery): void {
  const point = { x: -14.5, z: -3.1 };
  kit.box({ ...point, y: 0.17 }, { x: 3.5, y: 0.34, z: 3.0 }, 'stone');
  kit.box({ ...point, y: 1.15 }, { x: 2.8, y: 1.9, z: 2.5 }, 'wood');
  for (const x of [-15.95, -13.05])
    for (const z of [-4.4, -1.8]) {
      timber(
        kit,
        [
          { x, y: 0.15, z },
          { x: x + 0.035, y: 1.5, z: z - 0.04 },
          { x: x - 0.025, y: 2.75, z },
        ],
        0.105,
        'bark',
      );
      natural.rock(
        { x, y: 0.12, z },
        { x: 0.26, y: 0.2, z: 0.25 },
        { moss: true },
      );
    }
  gableRoof(kit, point, 2.45, { width: 3.7, depth: 3.1, rise: 0.75 }, 'stone');
  for (const side of [-1, 1])
    for (let tile = 0; tile < 5; tile++) {
      if (side < 0 && tile === 3) continue;
      const distance = 0.12 + tile * 0.34;
      const cap = kit.mesh(
        new THREE.CylinderGeometry(0.072, 0.072, 3.0 - tile * 0.025, 7),
        'stone',
        {
          x: point.x + side * distance,
          y: 2.5 + 0.75 * (1 - distance / 1.85),
          z: point.z,
        },
      );
      cap.rotation.x = Math.PI / 2;
    }
  timber(
    kit,
    [
      { x: -16, y: 2.25, z: -1.72 },
      { x: -14.5, y: 2.2, z: -1.73 },
      { x: -12.9, y: 2.24, z: -1.72 },
    ],
    0.1,
  );
  for (let slat = 0; slat < 5; slat++)
    kit.box(
      { x: -15.45 + slat * 0.35, y: 1.25 + Math.sin(slat) * 0.035, z: -1.79 },
      { x: 0.22, y: 0.76, z: 0.09 },
      'bark',
    );
  kit.box(
    { x: -13.55, y: 0.43, z: -1.5 },
    { x: 1.1, y: 0.13, z: 0.65 },
    'wood',
  );
  for (let i = 0; i < 3; i++)
    natural.rock(
      { x: -12.2 + i * 0.35, y: 0.08, z: -2.8 + Math.sin(i * 2) * 0.32 },
      { x: 0.38, y: 0.12, z: 0.27 },
      { kind: 'stone', seed: 70 + i },
    );
  kit.mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.62, 10), 'wood', {
    x: -15.1,
    y: 0.31,
    z: -1.4,
  });
  for (const y of [0.12, 0.49]) {
    const band = kit.mesh(new THREE.TorusGeometry(0.3, 0.028, 5, 12), 'rope', {
      x: -15.1,
      y,
      z: -1.4,
    });
    band.rotation.x = Math.PI / 2;
  }
  hangingCloth(kit, { x: -13.1, y: 1.65, z: -1.6 }, 0.5, 0.62);
  natural.shrub({ x: -15.9, z: -4.55 }, 0.56, { seed: 18 });
}

function buildBoarTrail(kit: MapKit, natural: NaturalScenery): void {
  const definition = trailDefinitions.boar;
  kit.material('ice').color.setHex(0x7fae9e);
  kit.material('ice').roughness = 0.82;
  bridge(
    kit,
    natural,
    { minX: -5.2, maxX: -1.5, minZ: -2.2, maxZ: 1.8 },
    'stone',
  );
  buildOldRelay(kit, natural);
  for (const [x, z, height] of [
    [-16.0, 4.0, 3.2],
    [-11.0, 4.2, 2.2],
    [-9.1, -5.5, 3.8],
    [-6.6, -5.7, 3.1],
    [3.9, 4.3, 4.0],
    [8.6, -2.4, 3.3],
    [12.5, -2.5, 3.9],
    [15.6, 6.1, 3.8],
    [2.6, -10.5, 2.8],
  ] as const)
    if (outsideTrail(definition, { x, z }, height * 0.32))
      natural.pine({ x, z }, height);
  for (const [x, z, width, height] of [
    [-5.7, -8.5, 0.7, 0.35],
    [-1.0, -5.0, 0.5, 0.25],
    [-5.6, 4.2, 0.72, 0.32],
    [-1.0, 6.0, 0.58, 0.3],
    [5.8, -3.9, 1.15, 0.8],
    [8.6, -3.6, 1.45, 0.95],
    [12.0, -3.5, 1.0, 0.65],
  ] as const)
    if (outsideTrail(definition, { x, z }, Math.min(0.75, width)))
      natural.rock(
        { x, y: height * 0.5, z },
        { x: width, y: height, z: width * 0.65 },
        { moss: true, seed: x * 7 },
      );
  kit.rootBranch(
    [
      { x: -10.9, y: 0.45, z: 4.3 },
      { x: -11.1, y: 0.13, z: 4.8 },
      { x: -11.5, y: 0.035, z: 4.9 },
    ],
    0.12,
  );
  for (let i = 0; i < 4; i++) {
    const x = 10.2 + i * 1.2;
    timber(
      kit,
      [
        { x, y: 0.02, z: -9.55 },
        { x: x + Math.sin(i) * 0.035, y: 1.02, z: -9.5 },
      ],
      0.085,
    );
    if (i !== 1)
      timber(
        kit,
        [
          { x, y: 0.73, z: -9.55 },
          { x: x + 0.5, y: 0.68, z: -9.58 },
          { x: x + 1, y: 0.71, z: -9.55 },
        ],
        0.07,
      );
  }
}

function buildSnowShelter(kit: MapKit, natural: NaturalScenery): void {
  const point = { x: 8.1, z: -1.4 };
  for (const x of [6.7, 9.5])
    for (const z of [-2.35, -0.45])
      timber(
        kit,
        [
          { x, y: 0, z },
          { x: x + 0.025, y: 1.0, z },
          { x: x - 0.025, y: 1.98, z: z + 0.035 },
        ],
        0.1,
      );
  for (let board = 0; board < 7; board++)
    kit.box(
      { x: 6.9 + board * 0.4, y: 0.78 + Math.sin(board * 2) * 0.04, z: -2.31 },
      { x: 0.37, y: 1.34, z: 0.14 },
      'wood',
    );
  gableRoof(kit, point, 1.95, { width: 3.45, depth: 2.5, rise: 0.65 }, 'wood');
  for (const [x, z, width, depth] of [
    [6.8, -1.8, 0.74, 0.9],
    [7.7, -1.1, 0.82, 1.15],
    [8.5, -1.65, 0.72, 1.02],
    [9.35, -1.1, 0.55, 0.9],
  ] as const)
    natural.rock(
      { x, y: 2.08 + 0.65 * (1 - Math.abs(x - 8.1) / 1.77), z },
      { x: width, y: 0.16, z: depth },
      { kind: 'snow', seed: x * 3 },
    );
  kit.box({ x: 8.1, y: 0.35, z: -1.8 }, { x: 2.2, y: 0.13, z: 0.48 }, 'wood');
  hangingCloth(kit, { x: 9.35, y: 1.0, z: -0.43 }, 0.52, 0.7);
  natural.rock(
    { x: 6.4, y: 0.19, z: -2.5 },
    { x: 0.65, y: 0.35, z: 0.5 },
    { snow: true },
  );
}

function buildBearTrail(kit: MapKit, natural: NaturalScenery): void {
  const definition = trailDefinitions.bear;
  bridge(
    kit,
    natural,
    { minX: -5.5, maxX: -1.0, minZ: -6.8, maxZ: -3.1 },
    'wood',
  );
  buildSnowShelter(kit, natural);
  for (const [x, z, height] of [
    [-15.4, 1.7, 3.1],
    [-8.0, 6.5, 3.7],
    [-8.0, 1.9, 3.4],
    [-7.8, -9.6, 3.0],
    [-0.2, 5.6, 3.6],
    [1.3, -9.6, 3.2],
    [7.0, 6.0, 3.4],
    [15.8, -3.1, 3.1],
    [15.8, 6.3, 3.6],
  ] as const)
    if (outsideTrail(definition, { x, z }, height * 0.32))
      natural.pine({ x, z }, height, { snow: true });
  for (const [x, z, width, height] of [
    [8.4, -10.2, 1.7, 1.5],
    [11.1, -10.5, 2.1, 2.0],
    [14.2, -10.2, 1.2, 1.3],
  ] as const) {
    natural.rock(
      { x, y: height * 0.55, z },
      { x: width, y: height, z: 1.2 },
      { snow: true },
    );
    const shape = new THREE.Shape();
    shape.moveTo(-width * 0.62, 0);
    shape.lineTo(-width * 0.52, height * 1.6);
    shape.lineTo(-width * 0.12, height * 1.7);
    shape.lineTo(width * 0.52, height * 1.35);
    shape.lineTo(width * 0.68, 0.14);
    shape.closePath();
    kit.mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false }),
      'ice',
      { x, y: 0.15, z: -9.25 },
    );
  }
  for (const [x, length] of [
    [8.0, 0.4],
    [8.65, 0.64],
    [10.2, 0.45],
    [11.0, 0.7],
    [12.6, 0.52],
    [13.3, 0.32],
  ] as const)
    kit.mesh(new THREE.CylinderGeometry(0.12, 0, length, 7), 'ice', {
      x,
      y: 1.95 - length / 2,
      z: -8.9,
    });
}

function buildMineCart(kit: MapKit, natural: NaturalScenery): void {
  for (const x of [-1.15, 0.55])
    timber(
      kit,
      [
        { x, y: 0.07, z: 3.5 },
        { x: x + 0.015, y: 0.075, z: 5.7 },
        { x, y: 0.07, z: 8.3 },
      ],
      0.065,
      'basalt',
    );
  for (let i = 0; i < 7; i++) {
    const sleeper = kit.box(
      { x: -0.3, y: 0.035, z: 3.8 + i * 0.65 },
      { x: 2.05, y: 0.07, z: 0.18 },
      'wood',
    );
    sleeper.rotation.y = Math.sin(i * 3) * 0.025;
  }
  kit.box({ x: -0.3, y: 0.47, z: 5.7 }, { x: 1.8, y: 0.18, z: 1.55 }, 'wood');
  for (const x of [-1.17, 0.57])
    for (let board = 0; board < 3; board++)
      kit.box(
        { x: x + (board - 1) * 0.025, y: 0.63 + board * 0.25, z: 5.7 },
        { x: 0.14, y: 0.22, z: 1.55 },
        'wood',
      );
  for (const z of [4.96, 6.44])
    for (let board = 0; board < 3; board++)
      kit.box(
        { x: -0.3, y: 0.63 + board * 0.25, z },
        { x: 1.8, y: 0.22, z: 0.14 },
        'wood',
      );
  for (const x of [-1.3, 0.7])
    for (const z of [5.18, 6.22]) {
      const wheel = kit.mesh(
        new THREE.CylinderGeometry(0.31, 0.31, 0.17, 10),
        'basalt',
        { x, y: 0.31, z },
      );
      wheel.rotation.z = Math.PI / 2;
      const rim = kit.mesh(
        new THREE.TorusGeometry(0.27, 0.04, 5, 10),
        'stone',
        { x: x + Math.sign(x) * 0.095, y: 0.31, z },
      );
      rim.rotation.y = Math.PI / 2;
    }
  for (let i = 0; i < 4; i++)
    natural.rock(
      { x: -0.83 + (i % 2) * 0.8, y: 0.85, z: 5.3 + Math.floor(i / 2) * 0.7 },
      { x: 0.37, y: 0.31, z: 0.38 },
      { kind: 'ash', seed: i * 8 },
    );
}

function buildArmadilloTrail(kit: MapKit, natural: NaturalScenery): void {
  buildMineCart(kit, natural);
  for (const [x, z, width, height] of [
    [10.7, -3.6, 1.15, 1.55],
    [13.5, -0.9, 1.4, 1.9],
    [11.8, 3.3, 1.0, 1.25],
    [-14.4, -2.7, 1.25, 1.5],
    [-13.0, 1.4, 0.85, 1.0],
    [-6.9, 3.0, 0.65, 0.48],
    [1.0, 6.6, 0.9, 0.35],
  ] as const)
    if (outsideTrail(trailDefinitions.armadillo, { x, z }, width + 0.1))
      natural.rock(
        { x, y: height * 0.5, z },
        { x: width, y: height, z: width * 0.72 },
        { kind: 'basalt', seed: x * 4 },
      );
  for (const [x, z, width] of [
    [5.3, -4.6, 0.38],
    [9.9, -3.9, 0.5],
    [5.2, 0.6, 0.34],
    [10.1, 2.0, 0.55],
    [5.2, 5.9, 0.45],
    [9.9, 7.6, 0.4],
  ] as const)
    if (outsideTrail(trailDefinitions.armadillo, { x, z }, width))
      natural.rock(
        { x, y: 0.12, z },
        { x: width, y: 0.24, z: width * 1.2 },
        { kind: 'basalt', seed: z },
      );
  for (const x of [10.4, 14.0]) {
    kit.box({ x, y: 1.6, z: -10.0 }, { x: 0.75, y: 3.2, z: 0.85 }, 'basalt');
    kit.box({ x, y: 3.15, z: -10.0 }, { x: 1.1, y: 0.28, z: 1.1 }, 'stone');
    natural.rock(
      { x: x + (x < 12 ? -0.4 : 0.4), y: 0.17, z: -9.6 },
      { x: 0.62, y: 0.35, z: 0.45 },
      { kind: 'ash' },
    );
  }
  kit.box(
    { x: 12.2, y: 3.5, z: -10.0 },
    { x: 4.6, y: 0.42, z: 1.05 },
    'basalt',
  );
  for (let board = 0; board < 7; board++)
    kit.box(
      { x: 10.98 + board * 0.4, y: 1.55, z: -10.16 },
      { x: 0.37, y: 2.8 - (board % 3) * 0.05, z: 0.15 },
      'wood',
    );
  for (const y of [0.75, 2.3])
    kit.box({ x: 12.2, y, z: -10.02 }, { x: 2.9, y: 0.15, z: 0.12 }, 'basalt');
}

function buildMantisTrail(kit: MapKit, natural: NaturalScenery): void {
  const definition = trailDefinitions.mantis;
  kit.material('ice').color.setHex(0x87b0a4);
  kit.material('ice').roughness = 0.85;
  bridge(
    kit,
    natural,
    { minX: -4.8, maxX: -1.3, minZ: -2.4, maxZ: 1.3 },
    'wood',
  );
  const points = [
    [-16.0, 2.3],
    [-14.9, -1.0],
    [-13.4, -4.5],
    [-10.2, -4.9],
    [-7.0, 3.8],
    [-5.9, 6.8],
    [-1.8, 6.8],
    [1.2, 4.6],
    [5.6, 3.5],
    [9.1, 3.8],
    [12.1, 1.3],
    [13.6, 5.9],
    [15.5, -0.6],
    [15.0, -7.9],
    [10.4, -9.5],
    [4.9, -4.0],
    [-0.1, -10.2],
    [-8.8, -8.9],
  ] as const;
  points.forEach(([x, z], index) => {
    const height = 2.9 + (index % 4) * 0.4;
    if (outsideTrail(definition, { x, z }, height * 0.34))
      natural.bamboo({ x, z }, height, { seed: index * 9 });
    else if (outsideTrail(definition, { x, z }, 0.65))
      natural.shrub({ x, z }, 0.66, { seed: index * 9 });
  });
  const shrine = { x: 12.5, z: -4.4 };
  kit.box({ ...shrine, y: 0.18 }, { x: 2.9, y: 0.36, z: 2.4 }, 'stone');
  kit.box({ ...shrine, y: 1.1 }, { x: 1.85, y: 1.6, z: 1.6 }, 'wood');
  for (const x of [11.5, 13.5])
    timber(
      kit,
      [
        { x, y: 0.2, z: -3.52 },
        { x: x + 0.02, y: 1.1, z: -3.51 },
        { x, y: 2.2, z: -3.52 },
      ],
      0.085,
    );
  gableRoof(kit, shrine, 2.05, { width: 3.0, depth: 2.3, rise: 0.7 }, 'bamboo');
  for (let rib = 0; rib < 7; rib++) {
    const x = 11.2 + rib * 0.43;
    timber(
      kit,
      [
        { x, y: 2.1 + 0.7 * (1 - Math.abs(x - 12.5) / 1.5), z: -5.55 },
        { x, y: 2.15 + 0.7 * (1 - Math.abs(x - 12.5) / 1.5), z: -4.4 },
        { x, y: 2.1 + 0.7 * (1 - Math.abs(x - 12.5) / 1.5), z: -3.25 },
      ],
      0.045,
      'bamboo',
    );
  }
  hangingCloth(kit, { x: shrine.x, y: 1.18, z: shrine.z + 0.86 }, 0.58, 0.9);
  for (const z of [-8.8, -6.0]) {
    timber(
      kit,
      [
        { x: -6.4, y: 0.05, z },
        { x: -6.37, y: 1.3, z },
        { x: -6.43, y: 2.45, z },
      ],
      0.14,
    );
    natural.rock(
      { x: -6.4, y: 0.13, z },
      { x: 0.38, y: 0.23, z: 0.4 },
      { moss: true },
    );
  }
  timber(
    kit,
    [
      { x: -6.4, y: 2.57, z: -9.2 },
      { x: -6.4, y: 2.65, z: -7.4 },
      { x: -6.4, y: 2.53, z: -5.6 },
    ],
    0.16,
  );
  for (let i = 0; i < 4; i++)
    timber(
      kit,
      [
        { x: -6.42, y: 0.14, z: -8.4 + i * 0.62 },
        { x: -6.39, y: 1.1, z: -8.4 + i * 0.62 },
        { x: -6.42, y: 1.9, z: -8.4 + i * 0.62 },
      ],
      0.055,
      'bamboo',
    );
  natural.shrub({ x: 13.8, z: -5.6 }, 0.7, { seed: 76 });
  natural.shrub({ x: -7.2, z: -8.7 }, 0.6, { seed: 31 });
}

function cornerMasses(
  kit: MapKit,
  natural: NaturalScenery,
  region: EncounterId,
): void {
  const kind = region === 'armadillo' ? 'basalt' : 'stone';
  for (const side of [-1, 1]) {
    natural.rock(
      { x: side * 17.7, y: 0.4, z: 10.7 },
      { x: 2.0, y: 0.78, z: 1.35 },
      {
        kind,
        moss: region === 'boar' || region === 'mantis',
        snow: region === 'bear',
        parent: kit.foreground,
        seed: side * 28,
      },
    );
    natural.rock(
      { x: side * 16.8, y: 0.1, z: 12.0 },
      { x: 0.8, y: 0.3, z: 0.65 },
      { kind, snow: region === 'bear', parent: kit.foreground, seed: side * 9 },
    );
  }
}

function backRidge(natural: NaturalScenery, region: EncounterId): void {
  const kind = region === 'armadillo' ? 'basalt' : 'stone';
  for (const [x, z, width, height, depth] of [
    [-13.2, -12.7, 4.2, 1.6, 1.6],
    [-5.4, -13.6, 4.4, 2.0, 1.9],
    [3.5, -12.8, 3.9, 1.7, 1.45],
    [11.8, -13.2, 4.3, 2.2, 1.8],
  ] as const) {
    natural.rock(
      { x, y: height * 0.55, z },
      { x: width, y: height, z: depth },
      {
        kind,
        moss: region === 'boar' || region === 'mantis',
        snow: region === 'bear',
        seed: x * 3,
      },
    );
    natural.rock(
      { x: x + width * 0.45, y: 0.23, z: z + 1.0 },
      { x: width * 0.26, y: 0.5, z: 0.78 },
      { kind, snow: region === 'bear', seed: x * 7 },
    );
  }
  if (region === 'mantis') {
    for (const [x, z, height] of [
      [-15.3, -12.6, 4.5],
      [-9.7, -13.2, 5.0],
      [-2.3, -13.2, 4.6],
      [3.5, -12.8, 4.1],
      [10.6, -12.6, 4.8],
      [15.3, -12.9, 4.5],
      [-18.2, 2.5, 4.1],
      [18.3, -2.8, 4.4],
    ] as const)
      natural.bamboo({ x, z }, height, { seed: x * 4 });
    return;
  }
  if (region === 'boar' || region === 'bear') {
    for (const [x, z, height] of [
      [-18.1, -5.7, 4.0],
      [-18.2, 2.5, 3.7],
      [18.2, -5.0, 4.1],
      [18.1, 4.8, 3.8],
      [-10.6, -14.0, 3.4],
      [6.8, -14.1, 3.6],
    ] as const)
      natural.pine({ x, z }, height, { snow: region === 'bear' });
  } else {
    for (const [x, z, height] of [
      [-18.0, -5.8, 2.5],
      [-18.2, 3.3, 2.0],
      [18.1, -4.4, 2.8],
      [18.3, 4.8, 2.2],
    ] as const)
      natural.rock(
        { x, y: height * 0.55, z },
        { x: 1.15, y: height, z: 1.2 },
        { kind: 'basalt', seed: z },
      );
  }
}

function fillUnusedGround(natural: NaturalScenery, region: EncounterId): void {
  const points: Readonly<Record<EncounterId, readonly TrailPoint[]>> = {
    boar: [
      { x: -11.0, z: 4.3 },
      { x: 5.7, z: 2.8 },
      { x: 9.1, z: 5.8 },
      { x: 5.4, z: -3.9 },
    ],
    bear: [
      { x: -7.5, z: 0.4 },
      { x: 0.0, z: -0.8 },
      { x: -8.0, z: 3.7 },
      { x: 7.8, z: 6.4 },
    ],
    armadillo: [
      { x: -6.9, z: 3.0 },
      { x: 11.0, z: -1.6 },
      { x: -14.0, z: 2.3 },
      { x: 1.4, z: 6.7 },
    ],
    mantis: [
      { x: 4.9, z: -4.2 },
      { x: 3.2, z: 4.3 },
    ],
  };
  points[region].forEach((point, seed) => {
    if (!outsideTrail(trailDefinitions[region], point, 0.64)) return;
    if (region !== 'armadillo')
      natural.shrub(point, 0.66, { snow: region === 'bear', seed: seed * 17 });
    else
      natural.rock(
        { ...point, y: 0.1 },
        { x: 0.65, y: 0.22, z: 0.5 },
        { kind: 'ash', seed },
      );
  });
}

export function buildTrailEnvironment(kit: MapKit, region: EncounterId): void {
  const natural = new NaturalScenery(kit);
  roadsideRocks(natural, region);
  switch (region) {
    case 'boar':
      buildBoarTrail(kit, natural);
      break;
    case 'bear':
      buildBearTrail(kit, natural);
      break;
    case 'armadillo':
      buildArmadilloTrail(kit, natural);
      break;
    case 'mantis':
      buildMantisTrail(kit, natural);
      break;
  }
  backRidge(natural, region);
  cornerMasses(kit, natural, region);
  fillUnusedGround(natural, region);
}
