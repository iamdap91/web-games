import * as THREE from 'three';
import type {
  MapKit,
  SurfaceKind,
} from '../../../prototypes/boar-turn-battle/map-kit.js';
import { NaturalScenery } from '../regional-trails/natural-scenery.js';
import type { TrailPoint } from '../regional-trails/route-layouts.js';
import type { TrailGround } from '../regional-trails/trail-ground.js';
import type { SettlementDefinition } from './settlement-types.js';

type Point = { readonly x: number; readonly y: number; readonly z: number };

const hearth = { x: 0, z: -0.6 };
const bath = { x: 6.3, z: 4 };
const snowBanks = [
  { x: -17.5, z: 13.1, width: 1.15, height: 0.51, depth: 0.86 },
  { x: 17.2, z: 12.5, width: 1.25, height: 0.62, depth: 0.91 },
  { x: -17.3, z: -13.9, width: 1.36, height: 0.86, depth: 1.02 },
  { x: 17.7, z: -15, width: 1.06, height: 0.71, depth: 0.83 },
] as const;

export const frostVillage: SettlementDefinition = {
  region: 'bear',
  title: '백서리 눈솔마을',
  subtitle: '눈솔과 온천이 감싸는 산장 마을',
  description:
    '차가운 눈솔숲 안에 모인 작은 산장 마을. 공동화덕을 가운데 두고 여관과 보급소, 주거 샛길과 작은 온천이 이어진다.',
  definition: {
    name: '백서리 눈솔마을',
    description:
      '화덕의 온기를 따라 여관과 보급소를 오가고, 주거 샛길을 돌아 눈바위 온천에서 쉬어 가는 설산 마을.',
    start: { x: 0, z: 12 },
    areas: [
      { minX: -5.2, maxX: 5.2, minZ: -3.5, maxZ: 4.2 },
      { minX: -13.4, maxX: -6.6, minZ: -5.7, maxZ: -3.7 },
      { minX: 5.6, maxX: 11.5, minZ: -6.5, maxZ: -4.4 },
      { minX: -14.1, maxX: -9.3, minZ: 7.7, maxZ: 9.7 },
      { minX: 9.5, maxX: 14.6, minZ: 5.8, maxZ: 8.2 },
      { minX: -2.8, maxX: 2.8, minZ: 10.8, maxZ: 15.2 },
    ],
    paths: [
      {
        width: 3.8,
        points: [
          { x: 0, z: 14.6 },
          { x: 0, z: 12 },
          { x: -1, z: 8 },
          { x: 0, z: 5.1 },
          { x: 2.8, z: 3.4 },
          { x: 3.2, z: 0 },
          { x: 2, z: -4 },
        ],
      },
      {
        width: 3.6,
        points: [
          { x: -2, z: -3 },
          { x: -5.4, z: -4.8 },
          { x: -10, z: -5 },
        ],
      },
      {
        width: 3.6,
        points: [
          { x: 2, z: -3 },
          { x: 4.5, z: -5 },
          { x: 8.5, z: -5.8 },
          { x: 13, z: -5 },
          { x: 15, z: -8.4 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: -10, z: -5 },
          { x: -5.5, z: -5 },
          { x: -4.8, z: -8.5 },
          { x: -3.8, z: -9.25 },
          { x: 1, z: -8 },
          { x: 3, z: -5 },
          { x: 8.5, z: -5.8 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: -1, z: 8 },
          { x: -6.5, z: 10.5 },
          { x: -11.7, z: 9.5 },
          { x: -16.7, z: 6.5 },
          { x: -16.7, z: 2.2 },
          { x: -13.6, z: 1.8 },
          { x: -8, z: 1.5 },
          { x: -5, z: 2.6 },
          { x: -3, z: 4 },
          { x: 0, z: 3.6 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: -11.7, z: 9.5 },
          { x: -11.7, z: 8.3 },
        ],
      },
      {
        width: 3.6,
        points: [
          { x: 0, z: 8 },
          { x: 5.3, z: 9 },
          { x: 12, z: 7.5 },
          { x: 12, z: 6.2 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: 13, z: -5 },
          { x: 16.1, z: -0.3 },
          { x: 16.2, z: 6.9 },
          { x: 12, z: 7.5 },
        ],
      },
    ],
    landmarks: [
      {
        id: 'inn',
        name: '눈솔 여관',
        position: { x: -10, z: -5 },
        description:
          '큰 눈지붕과 따뜻한 창이 길손을 맞는 여관. 처마 아래에는 설피와 여행 물통이 놓여 있다.',
        kind: 'view',
      },
      {
        id: 'supplies',
        name: '겨울길 보급소',
        position: { x: 8.5, z: -5.8 },
        description:
          '산짐꾼이 묶어 둔 식량 자루와 밧줄이 보인다. 작은 연료창고가 옆 골목에 붙어 있다.',
        kind: 'view',
      },
      {
        id: 'hearth',
        name: '공동화덕 마당',
        position: { x: 0, z: 2.6 },
        description:
          '낮은 돌 화덕 주위로 나무 의자와 공동 조리대가 모여 있다. 차가운 마을길 한가운데 온기를 나누는 자리다.',
        kind: 'view',
      },
      {
        id: 'bathhouse',
        name: '눈바위 온천집',
        position: { x: 12, z: 6.2 },
        description:
          '눈바위로 두른 작은 온천과 목욕집. 길손이 짐을 내려놓고 잠시 쉬어 가던 흔적이 남아 있다.',
        kind: 'view',
      },
      {
        id: 'homes',
        name: '눈솔 주거 샛길',
        position: { x: -11.7, z: 8.3 },
        description:
          '장작과 말린 약초를 내놓은 집들이 낮게 모여 있다. 집 앞을 돌아가는 샛길은 화덕 마당으로 다시 이어진다.',
        kind: 'view',
      },
      {
        id: 'exit',
        name: '남쪽 눈솔문',
        position: { x: 0, z: 14.5 },
        description:
          '낮은 울타리 사이로 산길이 이어진다. 마을의 온기 뒤로 차가운 눈솔숲이 기다린다.',
        kind: 'view',
      },
    ],
    ground: 'snow',
    sky: 0xd0dfe1,
    shade: 0x879eaa,
    sun: 0xffe1b1,
    camera: { x: 0, y: 35, z: 37, targetX: 0, targetZ: 0, span: 29 },
  },
  buildings: [
    {
      id: 'inn',
      x: -10,
      z: -8.5,
      width: 5.8,
      depth: 5,
      height: 3.3,
      roof: 'slate',
      wall: 'wood',
    },
    {
      id: 'supplies',
      x: 8.5,
      z: -9,
      width: 4.8,
      depth: 4.4,
      height: 2.9,
      roof: 'slate',
      wall: 'wood',
    },
    {
      id: 'bathhouse',
      x: 12,
      z: 3.1,
      width: 4.5,
      depth: 4.2,
      height: 2.6,
      roof: 'slate',
      wall: 'wood',
    },
    {
      id: 'home-pine',
      x: -11.7,
      z: 5.5,
      width: 4.4,
      depth: 3.6,
      height: 2.5,
      roof: 'slate',
      wall: 'wood',
    },
    {
      id: 'home-cedar',
      x: -13.6,
      z: -1.1,
      width: 3.8,
      depth: 3.8,
      height: 2.4,
      roof: 'thatch',
      wall: 'wood',
    },
    {
      id: 'home-ridge',
      x: -3.8,
      z: -12,
      width: 4.4,
      depth: 3.5,
      height: 2.5,
      roof: 'slate',
      wall: 'wood',
    },
    {
      id: 'fuel-store',
      x: 15,
      z: -11,
      width: 3.6,
      depth: 3.2,
      height: 2.3,
      roof: 'thatch',
      wall: 'wood',
    },
  ],
  props: [
    { key: 'snowshoes', x: -12.1, z: -5.7, width: 1.05 },
    { key: 'travel-flask', x: -8.1, z: -5.4, width: 0.58 },
    { key: 'sack', x: 6.5, z: -6.1, width: 0.83 },
    { key: 'rope', x: 11.7, z: -5.8, width: 0.74 },
    { key: 'bedroll', x: -13.3, z: 8.2, width: 0.91 },
    { key: 'dry-herbs', x: -7.2, z: 4.94, width: 1.16, y: 0.85 },
    { key: 'basket', x: -8.8, z: 5.7, width: 0.74 },
    { key: 'bowl', x: -3.45, z: -0.87, width: 0.56, y: 0.65 },
    { key: 'cloth', x: 9, z: 7.2, width: 0.74, y: 0.66 },
    { key: 'windsock', x: 4, z: 12.7, width: 0.91 },
    { key: 'wood-chips', x: -6.1, z: 1.6, width: 1.12 },
    { key: 'notices', x: 3.9, z: 6.4, width: 0.88 },
  ],
  residents: [
    { key: 'mountain-porter', x: -7.1, z: -3.9, height: 1.9 },
    { key: 'winter-outfitter', x: 10.3, z: -4.7, height: 1.9 },
    { key: 'hearth-keeper', x: -2.2, z: 2.5, height: 1.9 },
    { key: 'onsen-caretaker', x: 13.5, z: 7.6, height: 1.9 },
    { key: 'herbalist', x: -14.2, z: 8.8, height: 1.9 },
  ],
  solids: [
    { ...hearth, radius: 1.48 },
    { ...bath, radius: 2.16 },
    { x: -3.7, z: -1.2, radius: 0.82 },
    { x: 0, z: -3.65, radius: 1.1 },
    { x: -6.2, z: 1.1, radius: 1.03 },
    { x: -7.2, z: 4.9, radius: 0.95 },
    { x: 9, z: 7.3, radius: 0.43 },
    { x: -3.7, z: 15.8, radius: 1.05 },
    { x: 3.7, z: 15.8, radius: 1.05 },
    ...snowBanks.map((point) => ({
      x: point.x,
      z: point.z,
      radius: Math.max(point.width, point.depth) * 0.9,
    })),
  ],
};

/** 공통 건물과 별도로 눈 소나무와 마을 공동시설만 구성한다. */
export function buildFrostVillage(kit: MapKit, ground: TrailGround): void {
  new FrostVillageScenery(kit, ground).build();
}

class FrostVillageScenery {
  private readonly nature: NaturalScenery;

  constructor(
    private readonly kit: MapKit,
    private readonly ground: TrailGround,
  ) {
    this.nature = new NaturalScenery(kit);
  }

  build(): void {
    this.hearth();
    this.hotSpring();
    this.cookingStand();
    this.bench();
    this.woodpile();
    this.dryingRack();
    this.waterBarrel();
    this.entrance();
    this.snowGarden();
  }

  private group(point: TrailPoint, angle = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(point.x, this.ground.terrainHeight(point), point.z);
    group.rotation.y = angle;
    this.kit.root.add(group);
    return group;
  }

  private hearth(): void {
    const group = this.group(hearth);
    this.kit.mesh(
      new THREE.CylinderGeometry(1.07, 1.13, 0.17, 16),
      'ash',
      { x: 0, y: 0.08, z: 0 },
      group,
    );
    for (let index = 0; index < 11; index++) {
      const angle = (index * Math.PI * 2) / 11;
      this.nature.rock(
        { x: Math.cos(angle) * 1.06, y: 0.22, z: Math.sin(angle) * 1.06 },
        { x: 0.36, y: 0.23, z: 0.31 },
        { seed: 120 + index * 3, parent: group },
      );
    }
    for (let index = 0; index < 3; index++) {
      const angle = index * 1.14;
      this.pole(
        group,
        { x: -Math.cos(angle) * 0.63, y: 0.2, z: -Math.sin(angle) * 0.63 },
        { x: Math.cos(angle) * 0.63, y: 0.25, z: Math.sin(angle) * 0.63 },
        0.12,
        'bark',
      );
    }
    const flame = new THREE.MeshStandardMaterial({
      color: 0xf0ae58,
      emissive: 0xd0762b,
      emissiveIntensity: 0.48,
      roughness: 0.94,
    });
    for (const [x, z, height] of [
      [-0.22, -0.06, 0.5],
      [0.13, 0.1, 0.68],
      [0.32, -0.18, 0.4],
    ] as const) {
      const shape = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, height, 5),
        flame,
      );
      shape.position.set(x, 0.28 + height / 2, z);
      shape.rotation.z = x * 0.6;
      shape.castShadow = true;
      group.add(shape);
    }
  }

  private hotSpring(): void {
    const group = this.group(bath);
    this.kit.mesh(
      new THREE.CylinderGeometry(1.68, 1.57, 0.27, 24),
      'stone',
      { x: 0, y: 0.1, z: 0 },
      group,
    );
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.53, 28),
      new THREE.MeshStandardMaterial({
        color: 0x88b8ba,
        roughness: 0.24,
        metalness: 0.08,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.247;
    water.receiveShadow = true;
    group.add(water);
    for (let index = 0; index < 15; index++) {
      const angle = (index * Math.PI * 2) / 15;
      this.nature.rock(
        {
          x: Math.cos(angle) * 1.76,
          y: 0.24 + Math.sin(index * 1.7) * 0.025,
          z: Math.sin(angle) * 1.76,
        },
        { x: 0.39, y: 0.24, z: 0.33 },
        { snow: index < 7, seed: 200 + index * 7, parent: group },
      );
    }
    for (const [angle, reach] of [
      [0.8, 0.39],
      [3.8, 0.33],
      [4.3, 0.28],
    ] as const)
      this.nature.rock(
        { x: Math.cos(angle) * 1.9, y: 0.5, z: Math.sin(angle) * 1.9 },
        { x: reach, y: 0.12, z: reach * 0.8 },
        { kind: 'snow', seed: Math.round(angle * 31), parent: group },
      );
    this.pole(
      group,
      { x: 1.79, y: 0.14, z: 0.8 },
      { x: 1.81, y: 1.03, z: 0.79 },
      0.055,
    );
    this.pole(
      group,
      { x: 1.81, y: 0.98, z: 0.79 },
      { x: 1.51, y: 1.0, z: 0.79 },
      0.035,
    );
    const pail = this.kit.mesh(
      new THREE.CylinderGeometry(0.19, 0.15, 0.26, 10),
      'wood',
      { x: 1.52, y: 0.72, z: 0.79 },
      group,
    );
    pail.rotation.z = -0.09;
    this.kit.mesh(
      new THREE.TorusGeometry(0.19, 0.016, 4, 12),
      'rope',
      { x: 1.52, y: 0.94, z: 0.79 },
      group,
    );
  }

  private cookingStand(): void {
    const group = this.group({ x: -3.7, z: -1.2 }, 0.14);
    for (const x of [-0.66, 0.66])
      this.pole(
        group,
        { x, y: 0.02, z: 0 },
        { x: x * 0.93, y: 1.43, z: 0 },
        0.075,
      );
    this.pole(
      group,
      { x: -0.81, y: 1.34, z: 0 },
      { x: 0.81, y: 1.34, z: 0 },
      0.07,
    );
    this.pole(
      group,
      { x: 0, y: 0.94, z: 0 },
      { x: 0, y: 1.35, z: 0 },
      0.018,
      'rope',
    );
    this.kit.mesh(
      new THREE.CylinderGeometry(0.32, 0.24, 0.37, 12),
      'basalt',
      { x: 0, y: 0.76, z: 0 },
      group,
    );
    const handle = this.kit.mesh(
      new THREE.TorusGeometry(0.31, 0.022, 4, 12, Math.PI),
      'rope',
      { x: 0, y: 0.93, z: 0 },
      group,
    );
    handle.rotation.z = 0;
    this.kit.box(
      { x: 0.35, y: 0.55, z: 0.44 },
      { x: 0.89, y: 0.1, z: 0.32 },
      'wood',
      group,
    );
    for (const x of [0.02, 0.67])
      this.pole(group, { x, y: 0.02, z: 0.44 }, { x, y: 0.52, z: 0.44 }, 0.045);
  }

  private bench(): void {
    const group = this.group({ x: 0, z: -3.65 }, -0.1);
    this.kit.box(
      { x: 0, y: 0.41, z: 0 },
      { x: 1.88, y: 0.17, z: 0.48 },
      'wood',
      group,
    );
    for (const x of [-0.65, 0.65])
      this.pole(group, { x, y: 0.03, z: 0 }, { x, y: 0.4, z: 0 }, 0.1);
  }

  private woodpile(): void {
    const group = this.group({ x: -6.2, z: 1.1 }, 0.18);
    for (let index = 0; index < 8; index++) {
      const row = Math.floor(index / 4),
        x = ((index % 4) - 1.5) * 0.36;
      this.pole(
        group,
        { x, y: 0.18 + row * 0.29, z: -0.5 },
        { x: x + 0.02, y: 0.19 + row * 0.29, z: 0.62 },
        0.17,
        'bark',
      );
    }
    for (const [x, z, width] of [
      [-0.34, -0.28, 0.63],
      [0.47, -0.04, 0.35],
    ] as const)
      this.nature.rock(
        { x, y: 0.67, z },
        { x: width, y: 0.12, z: 0.43 },
        { kind: 'snow', seed: Math.round(x * 10 + 90), parent: group },
      );
  }

  private dryingRack(): void {
    const group = this.group({ x: -7.2, z: 4.9 }, -0.1);
    for (const x of [-0.76, 0.76])
      this.pole(
        group,
        { x, y: 0.02, z: 0 },
        { x: x + 0.02, y: 1.48, z: 0 },
        0.07,
      );
    this.pole(
      group,
      { x: -0.88, y: 1.36, z: 0 },
      { x: 0.88, y: 1.36, z: 0 },
      0.06,
    );
    for (const x of [-0.45, 0.1, 0.52])
      this.pole(
        group,
        { x, y: 0.97, z: 0 },
        { x, y: 1.38, z: 0 },
        0.012,
        'rope',
      );
  }

  private waterBarrel(): void {
    const group = this.group({ x: 9, z: 7.3 });
    this.kit.mesh(
      new THREE.CylinderGeometry(0.38, 0.32, 0.61, 12),
      'wood',
      { x: 0, y: 0.31, z: 0 },
      group,
    );
    for (const y of [0.12, 0.49]) {
      const tie = this.kit.mesh(
        new THREE.TorusGeometry(0.35, 0.025, 4, 12),
        'rope',
        { x: 0, y, z: 0 },
        group,
      );
      tie.rotation.x = Math.PI / 2;
    }
  }

  private entrance(): void {
    for (const side of [-1, 1]) {
      const group = this.group({ x: side * 3.7, z: 15.8 });
      for (const z of [-0.9, 0.9]) {
        this.pole(group, { x: 0, y: 0.02, z }, { x: 0.03, y: 0.92, z }, 0.1);
        this.nature.rock(
          { x: 0.03, y: 1.0, z },
          { x: 0.18, y: 0.08, z: 0.17 },
          { kind: 'snow', seed: side + z * 13, parent: group },
        );
      }
      this.pole(
        group,
        { x: 0, y: 0.55, z: -1.02 },
        { x: 0.02, y: 0.55, z: 1.02 },
        0.085,
      );
    }
  }

  private snowGarden(): void {
    snowBanks.forEach((point, index) => {
      this.nature.rock(
        {
          x: point.x,
          y: this.ground.terrainHeight(point) + point.height * 0.3,
          z: point.z,
        },
        { x: point.width, y: point.height, z: point.depth },
        { snow: true, seed: 320 + index * 11 },
      );
    });
    const pines: readonly (readonly [number, number, number])[] = [
      [-23.6, 12.3, 4.5],
      [-24.2, 5.5, 5.1],
      [-23.4, -2.1, 5.6],
      [-24.6, -9.6, 5.8],
      [-18.5, -19.4, 4.8],
      [-11.1, -21.6, 5.4],
      [-2.7, -20.7, 4.7],
      [5.3, -20.8, 5.2],
      [13.6, -20.1, 5.0],
      [22.9, -14.7, 5.1],
      [23.5, -7.2, 5.5],
      [23.7, 1.1, 5.1],
      [23.6, 8.6, 4.5],
      [22.1, 15.1, 3.6],
      [-21.3, 17.0, 3.6],
      [-13.3, 21.2, 2.8],
      [13.6, 21.4, 2.8],
    ];
    pines.forEach(([x, z, height], index) => {
      this.nature.pine(
        { x, y: this.ground.terrainHeight({ x, z }), z },
        height,
        { snow: true, seed: 410 + index * 9 },
      );
      if (index < 13)
        this.nature.pine(
          {
            x: x + (index % 2 ? -1.75 : 1.8),
            y: this.ground.terrainHeight({ x, z: z - 1.5 }),
            z: z - 1.5,
          },
          height * 0.64,
          { snow: true, seed: 650 + index * 7 },
        );
    });
    for (const [x, z, radius] of [
      [-21.4, 8.5, 0.67],
      [-21.8, -5.6, 0.76],
      [-15.7, -18.5, 0.64],
      [1.7, -18.5, 0.61],
      [20.7, -11.1, 0.79],
      [21, 5.9, 0.68],
      [-10.2, 19.2, 0.62],
      [10.2, 19.1, 0.6],
    ] as const)
      this.nature.shrub(
        { x, y: this.ground.terrainHeight({ x, z }), z },
        radius,
        { snow: true, seed: Math.round(x * 9 - z * 3) },
      );
  }

  private pole(
    parent: THREE.Group,
    from: Point,
    to: Point,
    radius: number,
    kind: SurfaceKind = 'wood',
  ): void {
    const direction = new THREE.Vector3(
      to.x - from.x,
      to.y - from.y,
      to.z - from.z,
    );
    const mesh = this.kit.mesh(
      new THREE.CylinderGeometry(radius * 0.9, radius, direction.length(), 7),
      kind,
      {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        z: (from.z + to.z) / 2,
      },
      parent,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
  }
}
