import * as THREE from 'three';
import type {
  MapKit,
  SurfaceKind,
} from '../../../prototypes/boar-turn-battle/map-kit.js';
import { NaturalScenery } from '../regional-trails/natural-scenery.js';
import type { TrailPoint } from '../regional-trails/route-layouts.js';
import type { TrailGround } from '../regional-trails/trail-ground.js';
import type { SettlementDefinition } from './settlement-types.js';

const places = {
  monument: { x: -2.8, z: 1.1 },
  furnace: { x: -15.7, z: -3.2 },
  worktable: { x: 5.2, z: -5.1 },
  hearth: { x: 3.3, z: 4.5 },
  basin: { x: 7.2, z: 7.2 },
  firewood: { x: -8.6, z: 10.6 },
} as const;

export const emberVillage: SettlementDefinition = {
  region: 'armadillo',
  title: '잿불 석공마을',
  subtitle: '검은 돌집과 따뜻한 작업마당',
  description:
    '석공의 망치와 밥 짓는 화덕이 함께 있는 검은돌 마을. 광장에서 대장간·작업장과 생활 골목을 돌아 남쪽 운반로로 나선다.',
  definition: {
    name: '잿불 석공마을',
    description:
      '낮은 돌집 사이로 작업마당과 생활 골목이 이어지는, 사람이 사는 따뜻한 석공 마을.',
    start: { x: 0, z: 12 },
    areas: [
      { minX: -5.8, maxX: 5.8, minZ: -1.5, maxZ: 6.5 },
      { minX: -13.6, maxX: -8.4, minZ: -4.4, maxZ: -2.4 },
      { minX: -2.8, maxX: 2.8, minZ: -8.3, maxZ: -6.3 },
      { minX: 8.2, maxX: 13.8, minZ: -4.0, maxZ: -2.2 },
      { minX: 9.6, maxX: 14.4, minZ: 6.9, maxZ: 8.9 },
    ],
    paths: [
      {
        width: 3.5,
        points: [
          { x: 0, z: 12 },
          { x: 0, z: 7 },
          { x: 1, z: 2 },
          { x: 0, z: -3.4 },
          { x: 0, z: -7.6 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: -11, z: -3.6 },
          { x: -5, z: -2 },
          { x: 3, z: -3.4 },
          { x: 11, z: -3.4 },
        ],
      },
      {
        width: 3.4,
        points: [
          { x: -12, z: 7.6 },
          { x: -6.5, z: 7 },
          { x: 0, z: 7 },
          { x: 7.5, z: 9 },
          { x: 12, z: 7.5 },
        ],
      },
      {
        width: 2.6,
        points: [
          { x: -15.9, z: 6.4 },
          { x: -16.1, z: -10.5 },
          { x: -7, z: -10.5 },
          { x: -5.3, z: -12.2 },
          { x: -5.5, z: -14.6 },
          { x: 5.5, z: -14.6 },
          { x: 5.8, z: -10.2 },
          { x: 7, z: -10.5 },
          { x: 16, z: -10.5 },
          { x: 16, z: 6 },
          { x: 12, z: 7.5 },
        ],
      },
    ],
    landmarks: [
      {
        id: 'smith',
        name: '검은돌 대장간',
        position: { x: -11, z: -3.6 },
        description:
          '낮은 돌담 옆 화덕에서 작은 열기가 번진다. 집게와 쇠붙이를 정리하는 견습생 곁으로 석공의 앞길이 이어진다.',
        kind: 'view',
      },
      {
        id: 'stoneworks',
        name: '모서리 다듬는 석공 작업장',
        position: { x: 0, z: -7.6 },
        description:
          '거친 돌을 생활 도구와 집의 모서리로 다듬는 작업장. 작업대와 조각난 돌은 앞마당 한쪽에 모아 두었다.',
        kind: 'view',
      },
      {
        id: 'inn',
        name: '돌등짐 여관',
        position: { x: 11, z: -3.4 },
        description:
          '낮은 기와와 두꺼운 돌벽이 낮의 열기를 붙잡는다. 앞길에서 쉬거나 뒤쪽 주거 골목을 돌아갈 수 있다.',
        kind: 'view',
      },
      {
        id: 'supply',
        name: '운반꾼 보급소',
        position: { x: 12, z: 7.5 },
        description:
          '곡물 자루와 밧줄, 여행짐이 놓인 가게. 남쪽 출구와 광장, 주택 앞 작은 길이 여기서 만난다.',
        kind: 'view',
      },
      {
        id: 'square',
        name: '돌조각 모이는 광장',
        position: { x: 0, z: 3 },
        description:
          '둥글게 다듬은 돌조각과 공동 화로를 둘러 사람들이 쉬는 마당. 중앙은 짐수레가 지날 수 있도록 비워 두었다.',
        kind: 'view',
      },
      {
        id: 'exit',
        name: '남쪽 운반로 출구',
        position: { x: 0, z: 13.3 },
        description:
          '검은 돌집의 온기를 뒤로하고 옛 운반로로 이어지는 출구. 마을 안에서는 광장 앞길과 생활 골목을 자유롭게 돌아볼 수 있다.',
        kind: 'view',
      },
    ],
    ground: 'ash',
    sky: 0xc9b9a1,
    shade: 0x7a7166,
    sun: 0xffd9a3,
    camera: { x: 0, y: 35, z: 35, targetX: 0, targetZ: 0, span: 28 },
  },
  buildings: [
    {
      id: 'smith',
      x: -11,
      z: -7,
      width: 6,
      depth: 4.8,
      height: 3.0,
      roof: 'slate',
      wall: 'basalt',
    },
    {
      id: 'stoneworks',
      x: 0,
      z: -11,
      width: 6.4,
      depth: 4.8,
      height: 2.9,
      roof: 'slate',
      wall: 'basalt',
    },
    {
      id: 'inn',
      x: 11,
      z: -7,
      width: 6.2,
      depth: 5.2,
      height: 3.8,
      roof: 'tile',
      wall: 'earth',
    },
    {
      id: 'supply',
      x: 12,
      z: 4.5,
      width: 5,
      depth: 4,
      height: 2.7,
      roof: 'thatch',
      wall: 'wood',
    },
    {
      id: 'west-home',
      x: -12,
      z: 4.5,
      width: 5,
      depth: 4.2,
      height: 2.6,
      roof: 'tile',
      wall: 'basalt',
    },
    {
      id: 'northwest-home',
      x: -12.8,
      z: -13.3,
      width: 4.2,
      depth: 3.3,
      height: 2.5,
      roof: 'slate',
      wall: 'earth',
    },
    {
      id: 'northeast-home',
      x: 12.8,
      z: -13.4,
      width: 4.4,
      depth: 3.2,
      height: 2.7,
      roof: 'tile',
      wall: 'basalt',
    },
    {
      id: 'cookhouse',
      x: -5.5,
      z: 10,
      width: 4.4,
      depth: 3.4,
      height: 2.4,
      roof: 'thatch',
      wall: 'earth',
    },
  ],
  props: [
    { key: 'hammer', x: -13.1, z: -3.7, width: 0.4 },
    { key: 'tongs', x: -14.6, z: -2.5, width: 0.46 },
    { key: 'metal-offcuts', x: -14, z: -3.2, width: 0.62 },
    { key: 'ash', x: -15.3, z: -4.3, width: 0.7 },
    { key: 'quarry-wedges', x: 5.2, z: -5.1, width: 0.6, y: 1.02 },
    { key: 'hammer', x: 5.9, z: -5.1, width: 0.4, y: 1.02 },
    { key: 'stone-plaque', x: 2.3, z: -7.4, width: 0.7 },
    { key: 'basalt-shards', x: 3.2, z: -6.7, width: 0.72 },
    { key: 'sack', x: 14.4, z: 6.5, width: 0.75 },
    { key: 'rope', x: 13.8, z: 7, width: 0.55 },
    { key: 'grain', x: 11.3, z: 7.8, width: 0.6 },
    { key: 'basket', x: 14.6, z: 4.5, width: 0.75 },
    { key: 'bedroll', x: 13.8, z: -3.2, width: 0.7 },
    { key: 'travel-flask', x: 10.1, z: -3, width: 0.4 },
    { key: 'flowers', x: -14.1, z: 6.9, width: 0.58 },
    { key: 'herb', x: -10.3, z: 7, width: 0.48 },
    { key: 'cloth', x: -7.3, z: 12.1, width: 0.85 },
    { key: 'vegetables', x: -6.8, z: 12.3, width: 0.65 },
    { key: 'bowl', x: -5.9, z: 12.4, width: 0.4 },
    { key: 'village-map', x: -4.8, z: 4.8, width: 0.8 },
  ],
  residents: [
    { key: 'smith-apprentice', x: -12.8, z: -2.5, height: 1.9 },
    { key: 'village-cook', x: -5.5, z: 12.8, height: 1.9 },
    { key: 'hearth-keeper', x: 4.6, z: 4.8, height: 1.9 },
    { key: 'mountain-porter', x: 10.1, z: 8.7, height: 1.9 },
  ],
  solids: [
    { ...places.monument, radius: 1.25 },
    { ...places.furnace, radius: 0.95 },
    { ...places.worktable, radius: 1.3 },
    { ...places.hearth, radius: 0.9 },
    { ...places.basin, radius: 0.85 },
    { ...places.firewood, radius: 0.9 },
  ],
};

export function buildEmberVillage(kit: MapKit, ground: TrailGround): void {
  new EmberVillageScenery(kit, ground).build();
}

type Point = TrailPoint & { readonly y: number };

/** 건물 공통 외형과 분리해 생활 작업물과 외곽 자연물만 kit에 더한다. */
class EmberVillageScenery {
  private readonly nature: NaturalScenery;

  constructor(
    private readonly kit: MapKit,
    private readonly ground: TrailGround,
  ) {
    this.nature = new NaturalScenery(kit);
  }

  build(): void {
    this.monument();
    this.furnace();
    this.worktable();
    this.hearth();
    this.basin();
    this.firewood();
    this.frame();
  }

  private group(point: TrailPoint): THREE.Group {
    const group = new THREE.Group();
    group.position.set(point.x, this.ground.terrainHeight(point), point.z);
    this.kit.root.add(group);
    return group;
  }

  private beam(
    group: THREE.Group,
    from: Point,
    to: Point,
    radius: number,
    kind: SurfaceKind = 'wood',
  ): void {
    const delta = new THREE.Vector3(
      to.x - from.x,
      to.y - from.y,
      to.z - from.z,
    );
    const mesh = this.kit.mesh(
      new THREE.CylinderGeometry(radius * 0.9, radius, delta.length(), 7),
      kind,
      {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        z: (from.z + to.z) / 2,
      },
      group,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
  }

  private monument(): void {
    const point = places.monument;
    const group = this.group(point);
    this.kit.mesh(
      new THREE.CylinderGeometry(1.03, 1.13, 0.28, 12),
      'basalt',
      { x: 0, y: 0.14, z: 0 },
      group,
    );
    const lower = this.kit.mesh(
      new THREE.IcosahedronGeometry(0.74, 1),
      'stone',
      { x: -0.08, y: 0.83, z: 0 },
      group,
    );
    lower.scale.set(0.78, 0.95, 0.72);
    lower.rotation.set(0.1, 0.38, 0.15);
    const upper = this.kit.mesh(
      new THREE.IcosahedronGeometry(0.47, 1),
      'stone',
      { x: 0.19, y: 1.57, z: 0 },
      group,
    );
    upper.scale.set(0.91, 0.81, 0.84);
    upper.rotation.set(0.2, -0.2, 0.18);
    this.kit.box(
      { x: 0, y: 0.33, z: 0.91 },
      { x: 0.58, y: 0.15, z: 0.08 },
      'wood',
      group,
    );
  }

  private furnace(): void {
    const group = this.group(places.furnace);
    this.kit.mesh(
      new THREE.CylinderGeometry(0.63, 0.8, 1.27, 10),
      'basalt',
      { x: 0, y: 0.64, z: 0 },
      group,
    );
    this.kit.mesh(
      new THREE.CylinderGeometry(0.23, 0.32, 1.5, 8),
      'basalt',
      { x: 0, y: 1.91, z: -0.08 },
      group,
    );
    const mouth = this.kit.mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.045, 12),
      'lava',
      { x: 0, y: 0.54, z: 0.67 },
      group,
    );
    mouth.rotation.x = Math.PI / 2;
    this.kit.box(
      { x: 0, y: 0.25, z: 0.63 },
      { x: 0.86, y: 0.14, z: 0.38 },
      'stone',
      group,
    );
    for (const x of [-0.25, 0, 0.25])
      this.beam(
        group,
        { x, y: 0.29, z: 0.73 },
        { x, y: 0.75, z: 0.73 },
        0.022,
        'basalt',
      );
  }

  private worktable(): void {
    const group = this.group(places.worktable);
    this.kit.box(
      { x: 0, y: 0.93, z: 0 },
      { x: 2.3, y: 0.17, z: 1.15 },
      'wood',
      group,
    );
    for (const x of [-0.89, 0.89])
      for (const z of [-0.37, 0.37])
        this.beam(group, { x, y: 0.06, z }, { x, y: 0.85, z }, 0.09);
    this.beam(
      group,
      { x: -0.89, y: 0.29, z: 0 },
      { x: 0.89, y: 0.29, z: 0 },
      0.065,
    );
    this.kit.box(
      { x: -0.5, y: 1.13, z: 0 },
      { x: 0.65, y: 0.23, z: 0.67 },
      'stone',
      group,
    );
  }

  private hearth(): void {
    const group = this.group(places.hearth);
    const rim = this.kit.mesh(
      new THREE.TorusGeometry(0.5, 0.15, 7, 13),
      'basalt',
      { x: 0, y: 0.18, z: 0 },
      group,
    );
    rim.rotation.x = Math.PI / 2;
    const coal = this.kit.mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      'lava',
      { x: 0, y: 0.28, z: 0 },
      group,
    );
    coal.scale.set(1, 0.52, 1);
    for (const side of [-1, 1])
      this.beam(
        group,
        { x: side * 0.66, y: 0.03, z: 0.16 },
        { x: side * 0.16, y: 1.37, z: 0.07 },
        0.055,
        'bark',
      );
    this.beam(
      group,
      { x: -0.3, y: 1.37, z: 0.07 },
      { x: 0.3, y: 1.37, z: 0.07 },
      0.045,
      'bark',
    );
    this.beam(
      group,
      { x: 0, y: 1.35, z: 0.07 },
      { x: 0, y: 1.1, z: 0.07 },
      0.018,
      'rope',
    );
    this.kit.mesh(
      new THREE.CylinderGeometry(0.24, 0.19, 0.29, 10),
      'basalt',
      { x: 0, y: 0.94, z: 0.07 },
      group,
    );
  }

  private basin(): void {
    const group = this.group(places.basin);
    this.kit.mesh(
      new THREE.CylinderGeometry(0.52, 0.6, 0.44, 11),
      'stone',
      { x: 0, y: 0.22, z: 0 },
      group,
    );
    const lip = this.kit.mesh(
      new THREE.TorusGeometry(0.48, 0.115, 6, 12),
      'basalt',
      { x: 0, y: 0.45, z: 0 },
      group,
    );
    lip.rotation.x = Math.PI / 2;
    this.kit.mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.025, 12),
      'ash',
      { x: 0, y: 0.43, z: 0 },
      group,
    );
    this.kit.box(
      { x: 0.25, y: 0.54, z: -0.02 },
      { x: 0.72, y: 0.055, z: 0.11 },
      'wood',
      group,
    );
  }

  private firewood(): void {
    const group = this.group(places.firewood);
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 3 - row; i++) {
        const x = (i - (2 - row) / 2) * 0.34;
        this.beam(
          group,
          { x, y: 0.14 + row * 0.26, z: -0.54 },
          { x: x + 0.035, y: 0.15 + row * 0.26, z: 0.54 },
          0.145,
          'bark',
        );
      }
  }

  private frame(): void {
    for (const [x, z, width, height, seed] of [
      [-23.5, -14.5, 1.4, 0.62, 1],
      [-23.7, -6.5, 1.5, 0.53, 2],
      [-23.1, 3.8, 1.2, 0.47, 3],
      [-22.8, 12.1, 1.1, 0.43, 4],
      [-15.5, -21.8, 1.5, 0.68, 5],
      [-5.6, -22.1, 1.8, 0.74, 6],
      [4.1, -22.2, 1.4, 0.63, 7],
      [14.5, -21.7, 1.6, 0.69, 8],
      [23.5, -14.3, 1.3, 0.55, 9],
      [23.7, -4.5, 1.4, 0.52, 10],
      [23.3, 5.2, 1.3, 0.48, 11],
      [22.9, 13.6, 1.1, 0.38, 12],
      [-14.9, 21.8, 1.4, 0.32, 13],
      [13.8, 21.8, 1.3, 0.3, 14],
    ] as const) {
      const radius = width * 1.3;
      // 열린 마당도 보행하므로 윤곽 밖임을 실제 마을 판정으로 확인한다.
      if (
        Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4;
          return this.ground.isWalkable({
            x: x + Math.cos(angle) * radius,
            z: z + Math.sin(angle) * radius,
          });
        }).some(Boolean)
      )
        continue;
      this.nature.rock(
        { x, y: this.ground.terrainHeight({ x, z }) + height * 0.55, z },
        { x: width, y: height, z: width * 0.65 },
        { kind: 'basalt', seed: 800 + seed },
      );
      this.nature.rock(
        {
          x: x + 0.4,
          y: this.ground.terrainHeight({ x, z }) + 0.08,
          z: z + 0.4,
        },
        { x: width * 0.5, y: 0.12, z: 0.48 },
        { kind: 'ash', seed: 850 + seed },
      );
    }
  }
}
