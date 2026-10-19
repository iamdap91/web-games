import * as THREE from 'three';
import type { MapKit } from '../../../prototypes/boar-turn-battle/map-kit.js';
import { NaturalScenery } from '../regional-trails/natural-scenery.js';
import type { TrailGround } from '../regional-trails/trail-ground.js';
import type { SettlementDefinition } from './settlement-types.js';

export const pineVillage: SettlementDefinition = {
  region: 'boar',
  title: '솔바람 방앗골',
  subtitle: '소나무 숲 · 목재와 곡식이 모이는 마을',
  description:
    '햇살 드는 우물마당에서 방앗간과 목재 작업장으로 골목이 갈라집니다. 초가지붕 아래 쉬었다가 솔바람 계곡으로 떠나보세요.',
  definition: {
    name: '솔바람 방앗골',
    description: '방앗간·목재 작업장·우물마당을 잇는 숲속 생활 거점',
    start: { x: 0, z: 13 },
    ground: 'grass',
    sky: 0xb7c5aa,
    shade: 0x657353,
    sun: 0xffe3ad,
    camera: { x: 0, y: 36, z: 36, targetX: 0, targetZ: 0, span: 27 },
    areas: [
      { minX: -4, maxX: 4, minZ: -2, maxZ: 5 },
      { minX: 6, maxX: 13, minZ: -5, maxZ: 0 },
      { minX: -14, maxX: -7, minZ: 7, maxZ: 10 },
    ],
    paths: [
      {
        width: 3.1,
        points: [
          { x: 0, z: 15 },
          { x: 1, z: 9 },
          { x: -0.5, z: 4 },
          { x: 0, z: 0 },
          { x: -2, z: -6 },
          { x: 0, z: -10 },
        ],
      },
      {
        width: 2.7,
        points: [
          { x: -11, z: 8 },
          { x: -7, z: 9 },
          { x: -4, z: 5 },
          { x: -6, z: 1 },
          { x: -10, z: -2.5 },
          { x: -7, z: -5 },
          { x: -5, z: -9.5 },
        ],
      },
      {
        width: 2.8,
        points: [
          { x: -10, z: -2.5 },
          { x: -4, z: -1 },
          { x: 0, z: 0 },
          { x: 5, z: -1 },
          { x: 10, z: -3.5 },
          { x: 13, z: 0 },
          { x: 10, z: 8 },
          { x: 5, z: 8 },
          { x: 1, z: 9 },
        ],
      },
    ],
    landmarks: [
      {
        id: 'inn',
        name: '솔그늘 여관',
        position: { x: -10, z: -2.5 },
        kind: 'view',
        description:
          '나무 향이 배어 있는 여관. 계곡에서 돌아온 나그네가 처마 아래 짐을 내려놓습니다.',
      },
      {
        id: 'mill',
        name: '곡식 방앗간',
        position: { x: 10, z: -3.5 },
        kind: 'view',
        description:
          '곡식 자루와 맷돌이 놓인 방앗간. 마을에서 모은 곡식을 원정길의 식량으로 준비합니다.',
      },
      {
        id: 'supply',
        name: '목재 보급소',
        position: { x: -11, z: 8.5 },
        kind: 'view',
        description:
          '솔방울과 장작, 수리용 나무가 모인 작업마당. 잘라 둔 통나무 사이로 짧은 골목이 이어집니다.',
      },
      {
        id: 'plaza',
        name: '우물마당',
        position: { x: 0, z: 2 },
        kind: 'view',
        description:
          '둥근 우물과 낮은 벤치가 있는 마을의 중심. 주민들이 물을 긷고 숲길의 소식을 나눕니다.',
      },
      {
        id: 'kitchen',
        name: '들밥 부엌',
        position: { x: 10, z: 8 },
        kind: 'view',
        description:
          '장작 화덕 곁에 바구니와 채소가 놓였습니다. 숲일을 마친 사람들이 식사를 나누는 작은 부엌입니다.',
      },
      {
        id: 'exit',
        name: '솔바람 계곡 길목',
        position: { x: 0, z: 15 },
        kind: 'view',
        description:
          '방앗골 남쪽의 숲길. 이곳에서 솔바람 계곡 이어걷기로 나갈 수 있습니다.',
      },
    ],
  },
  buildings: [
    {
      id: 'inn',
      x: -10,
      z: -6,
      width: 5.7,
      depth: 4.7,
      height: 2.55,
      roof: 'thatch',
      wall: 'earth',
    },
    {
      id: 'mill',
      x: 10,
      z: -7,
      width: 5.4,
      depth: 4.8,
      height: 2.7,
      roof: 'tile',
      wall: 'wood',
    },
    {
      id: 'supply',
      x: -11,
      z: 5,
      width: 4.5,
      depth: 4.5,
      height: 2.2,
      roof: 'thatch',
      wall: 'wood',
    },
    {
      id: 'kitchen',
      x: 10,
      z: 5,
      width: 4.8,
      depth: 3.6,
      height: 2.25,
      roof: 'thatch',
      wall: 'earth',
    },
    {
      id: 'home-a',
      x: -5,
      z: -13,
      width: 3.8,
      depth: 3.5,
      height: 2.05,
      roof: 'thatch',
      wall: 'earth',
    },
    {
      id: 'home-b',
      x: 1,
      z: -11,
      width: 3.5,
      depth: 3.2,
      height: 2.15,
      roof: 'tile',
      wall: 'wood',
    },
    {
      id: 'home-c',
      x: 7,
      z: -14,
      width: 3.9,
      depth: 3.4,
      height: 2.15,
      roof: 'thatch',
      wall: 'earth',
    },
  ],
  props: [
    { key: 'grain', x: 11.5, z: -3.9, width: 1.25 },
    { key: 'sack', x: 8.8, z: -4.1, width: 0.8 },
    { key: 'wood-chips', x: -12, z: 8, width: 1.2 },
    { key: 'hammer', x: -13.4, z: 6.9, width: 0.55, y: 0.55 },
    { key: 'vegetables', x: 11.6, z: 7.6, width: 1 },
    { key: 'basket', x: 8.4, z: 7.5, width: 0.8 },
    { key: 'flowers', x: -7, z: -3.9, width: 1.05 },
    { key: 'mushrooms', x: -14, z: -10, width: 0.7 },
    { key: 'bedroll', x: -11.6, z: -3.4, width: 0.9 },
    { key: 'notices', x: -1.6, z: 11.3, width: 0.8 },
  ],
  residents: [
    { key: 'mountain-porter', x: 8.3, z: -2.3, height: 1.9 },
    { key: 'village-cook', x: 8, z: 8.2, height: 1.9 },
    { key: 'dojo-assistant', x: -8.5, z: 8.7, height: 1.9 },
    { key: 'herbalist', x: -7.7, z: -2.4, height: 1.9 },
  ],
  solids: [
    { x: -4.5, z: 4.5, radius: 1.1 },
    { x: 5, z: 4.5, radius: 1.1 },
    { x: -2, z: 14.3, radius: 0.15 },
    { x: 2, z: 14.3, radius: 0.15 },
    { x: 2.3, z: 1.7, radius: 0.9 },
    { x: -13.8, z: 10.2, radius: 0.8 },
  ],
};

export function buildPineVillage(kit: MapKit, ground: TrailGround): void {
  const natural = new NaturalScenery(kit),
    b = ground.bounds;
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = Math.cos(angle) * (b.maxX + 0.6) + ((i % 3) - 1) * 0.7;
    const z = Math.sin(angle) * (b.maxZ + 1.3) + ((i % 4) - 1.5) * 0.6;
    if (Math.abs(x) < 4 && z > 8) continue;
    natural.pine({ x, z }, 4.2 + (i % 5) * 0.43, { seed: i * 11 });
    if (i % 2 === 0)
      natural.shrub({ x: x * 0.92, z: z * 0.92 }, 0.8, { seed: i });
  }
  const well = kit.mesh(
    new THREE.CylinderGeometry(0.83, 0.96, 0.72, 12),
    'stone',
    { x: 2.3, y: 0.36, z: 1.7 },
  );
  well.material = natural.surface('stone');
  kit.mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.025, 24), 'ice', {
    x: 2.3,
    y: 0.73,
    z: 1.7,
  });
  for (const dx of [-1, 1])
    kit.box(
      { x: 2.3 + dx, y: 1.3, z: 1.7 },
      { x: 0.14, y: 2.6, z: 0.15 },
      'bark',
    );
  kit.box({ x: 2.3, y: 2.6, z: 1.7 }, { x: 2.25, y: 0.17, z: 0.18 }, 'wood');
  kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), 'rope', {
    x: 2.3,
    y: 1.85,
    z: 1.7,
  });
  for (const z of [9.6, 10.2, 10.8]) {
    const log = kit.mesh(
      new THREE.CylinderGeometry(0.21, 0.25, 2.6, 9),
      'bark',
      { x: -13.8, y: 0.28, z },
    );
    log.rotation.z = Math.PI / 2;
  }
  for (const x of [-4.5, 5]) {
    kit.box({ x, y: 0.52, z: 4.5 }, { x: 2.2, y: 0.16, z: 0.55 }, 'wood');
    for (const dx of [-0.8, 0.8])
      kit.box(
        { x: x + dx, y: 0.25, z: 4.5 },
        { x: 0.18, y: 0.5, z: 0.4 },
        'bark',
      );
  }
  for (const x of [-2, 2])
    kit.box({ x, y: 1.1, z: 14.3 }, { x: 0.22, y: 2.2, z: 0.22 }, 'bark');
  kit.box({ x: 0, y: 2.2, z: 14.3 }, { x: 4.5, y: 0.2, z: 0.3 }, 'wood');
}
