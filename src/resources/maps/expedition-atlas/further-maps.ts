import {
  mapStyles,
  type MapStyle,
} from '../../../rendering/map-art-direction.js';
import type { AtlasMap } from './maps.js';

const entrance = { x: 0, z: -6 },
  spawn = { x: 0, z: -3.7 };
const regionStyle = (
  ground: MapStyle['ground'],
  light: Partial<Omit<MapStyle, 'ground'>> = {},
): MapStyle => ({ ...mapStyles.clearing, ...light, ground });

/** 두 번째 묶음은 교차 골목·절벽 잔도·수로 구획·정원 광장·분화구를 서로 다른 동선으로 만든다. */
export const furtherAtlasMaps: readonly AtlasMap[] = [
  {
    id: 'bamboo',
    title: '바람대숲',
    structure: '작은 마당을 잇는 교차 골목과 우회 고리',
    description:
      '짙은 대숲 사이의 교차 골목을 따라 풍경과 우물을 찾는다. 묶인 대나무를 걷으면 중앙 골목이 연결된다.',
    style: regionStyle(
      {
        grass: 0x818f77,
        leaves: 0x647e64,
        earth: 0x8d8b70,
        path: 0xb7b59a,
        stone: 0x939d8c,
      },
      { background: 0xa2b4a0, sunlight: 0xe6ead7, sunStrength: 1.3 },
    ),
    entrance,
    spawn,
    routes: [
      {
        points: [
          entrance,
          { x: 0, z: 0 },
          { x: -8, z: 0 },
          { x: -8, z: 8 },
          { x: 0, z: 8 },
          { x: 0, z: 16 },
          { x: 8, z: 16 },
          { x: 8, z: 24 },
          { x: 0, z: 24 },
        ],
        halfWidth: 1.7,
      },
      {
        points: [
          { x: 0, z: 0 },
          { x: 8, z: 0 },
          { x: 8, z: 8 },
          { x: 15, z: 8 },
          { x: 15, z: 16 },
          { x: 8, z: 16 },
        ],
        halfWidth: 1.6,
      },
      {
        points: [
          { x: -8, z: 8 },
          { x: -15, z: 8 },
          { x: -15, z: 16 },
          { x: 0, z: 16 },
        ],
        halfWidth: 1.55,
      },
      {
        points: [
          { x: 0, z: 8 },
          { x: 8, z: 8 },
        ],
        halfWidth: 1.45,
        shortcut: true,
      },
    ],
    clearings: [
      { x: 0, z: 0, radius: 2.5 },
      { x: -15, z: 16, radius: 2.8 },
      { x: 0, z: 8, radius: 2.4 },
      { x: 8, z: 8, radius: 2.6 },
      { x: 15, z: 16, radius: 2.5 },
      { x: 0, z: 24, radius: 3.2 },
    ],
    obstacles: [
      { x: -6.7, z: 7.4, radius: 0.55, kind: 'tree' },
      { x: 1.5, z: 23, radius: 0.65, kind: 'tree' },
    ],
    points: [
      {
        id: 'bamboo-chimes',
        x: -14,
        z: 16,
        kind: 'landmark',
        label: '대숲의 낡은 풍경',
        description: '대나무 사이에 매달린 풍경과 오래된 길 안내를 살펴봤다.',
      },
      {
        id: 'bamboo-tie',
        x: 8,
        z: 9.6,
        kind: 'mechanism',
        label: '중앙 골목의 묶음 풀기',
        description:
          '묶여 있던 대나무를 걷어 두 교차 골목 사이의 짧은 길을 열었다.',
      },
      {
        id: 'bamboo-well',
        x: 0,
        z: 24,
        kind: 'landmark',
        label: '대숲 안쪽 돌우물',
        description: '골목 끝의 작은 마당에서 이끼 낀 돌우물을 발견했다.',
      },
      {
        id: 'bamboo-basket',
        x: 15,
        z: 15,
        kind: 'cache',
        label: '채집꾼의 바구니',
        description: '외곽 골목에서 채집꾼이 두고 간 바구니를 찾았다.',
      },
    ],
    shortcut: { point: 'bamboo-tie', label: '중앙 대숲 골목' },
    bridges: [],
    walls: [],
    battleAreas: [
      { x: -8, z: 3, radius: 1.2, label: '대숲 골목의 선택 전투' },
      { x: 0, z: 24, radius: 2.1, label: '우물 마당의 주 전투' },
    ],
  },
  {
    id: 'canyon',
    title: '붉은 협곡잔도',
    structure: '굽이진 양쪽 잔도와 협곡을 가로지르는 다리',
    description:
      '협곡 왼쪽 잔도를 굽이쳐 안쪽 전망대에 도착한다. 반대편에서 다리를 내리면 두 절벽 길이 바로 이어진다.',
    style: regionStyle(
      {
        grass: 0x977f6e,
        leaves: 0x85816b,
        earth: 0x926e59,
        path: 0xbea28a,
        stone: 0xab826b,
      },
      {
        background: 0xb5a290,
        sky: 0xe6ded2,
        shade: 0x756659,
        sunlight: 0xefddc7,
        sunStrength: 1.35,
      },
    ),
    entrance,
    spawn,
    routes: [
      {
        points: [
          entrance,
          { x: 0, z: 0 },
          { x: -7, z: 0 },
          { x: -13, z: 6 },
          { x: -8, z: 12 },
          { x: -14, z: 18 },
          { x: -8, z: 24 },
          { x: 2, z: 24 },
          { x: 10, z: 18 },
          { x: 5, z: 12 },
          { x: 11, z: 6 },
          { x: 7, z: 0 },
        ],
        halfWidth: 1.7,
      },
      {
        points: [
          { x: -13, z: 6 },
          { x: -18, z: 8 },
          { x: -18, z: 12 },
        ],
        halfWidth: 1.45,
      },
      {
        points: [
          { x: 5, z: 12 },
          { x: -8, z: 12 },
        ],
        halfWidth: 1.5,
        shortcut: true,
      },
    ],
    clearings: [
      { x: -8, z: 12, radius: 2.8 },
      { x: 2, z: 24, radius: 3.8 },
      { x: 5, z: 12, radius: 2.9 },
      { x: 7, z: 0, radius: 2.6 },
      { x: -18, z: 12, radius: 2.4 },
    ],
    obstacles: [
      { x: 3.8, z: 25.2, radius: 0.8, kind: 'rock' },
      { x: -8.9, z: 11.2, radius: 0.65, kind: 'rock' },
    ],
    points: [
      {
        id: 'canyon-watch',
        x: 2,
        z: 24.8,
        kind: 'landmark',
        label: '협곡 끝 전망대',
        description: '굽이진 잔도 끝에서 양쪽 절벽과 먼 강줄기를 내려다봤다.',
      },
      {
        id: 'canyon-winch',
        x: 5,
        z: 13.5,
        kind: 'mechanism',
        label: '협곡 다리 내리기',
        description: '권양기의 잠금을 풀어 두 절벽을 잇는 다리를 내렸다.',
      },
      {
        id: 'canyon-ledge',
        x: 7,
        z: 0,
        kind: 'landmark',
        label: '맞은편 절벽 표식',
        description: '맞은편 절벽의 표식에서 옛 잔도 작업자의 흔적을 읽었다.',
      },
      {
        id: 'canyon-tools',
        x: -18,
        z: 12,
        kind: 'cache',
        label: '막다른 잔도의 짐',
        description: '작은 옆 잔도 끝에서 보수 도구와 밧줄을 찾았다.',
      },
    ],
    shortcut: { point: 'canyon-winch', label: '협곡 가로 다리' },
    bridges: [
      { from: { x: 5, z: 12 }, to: { x: -8, z: 12 }, width: 3, shortcut: true },
    ],
    walls: [],
    battleAreas: [
      { x: -14, z: 18, radius: 1.25, label: '잔도 굽이의 선택 전투' },
      { x: 2, z: 24, radius: 2.5, label: '협곡 전망대의 주 전투' },
    ],
  },
  {
    id: 'mill',
    title: '잠든 수차마을',
    structure: '수로 사이의 네 구역과 십자 연결로',
    description:
      '수로를 끼고 작업 마당과 창고 사이를 돌아본다. 수문을 열고 중앙 가교를 내리면 남북의 마당이 이어진다.',
    style: regionStyle(
      {
        grass: 0x8b9b8e,
        leaves: 0x738b78,
        earth: 0x8b8a76,
        path: 0xb9b49b,
        stone: 0x99a49b,
      },
      {
        background: 0xaec2bc,
        shade: 0x6f8078,
        sunlight: 0xe8ecdc,
        sunStrength: 1.35,
      },
    ),
    entrance,
    spawn,
    routes: [
      {
        points: [
          entrance,
          { x: 0, z: 0 },
          { x: -9, z: 0 },
          { x: -9, z: 10 },
          { x: -9, z: 20 },
          { x: 0, z: 20 },
          { x: 9, z: 20 },
          { x: 9, z: 10 },
          { x: 9, z: 0 },
          { x: 0, z: 0 },
        ],
        halfWidth: 1.8,
      },
      {
        points: [
          { x: -9, z: 10 },
          { x: 9, z: 10 },
        ],
        halfWidth: 1.5,
      },
      {
        points: [
          { x: 0, z: 20 },
          { x: 0, z: 0 },
        ],
        halfWidth: 1.3,
        shortcut: true,
      },
    ],
    clearings: [
      { x: 0, z: 0, radius: 2.7 },
      { x: -9, z: 10, radius: 3.7 },
      { x: 9, z: 10, radius: 3.7 },
      { x: -9, z: 20, radius: 3.5 },
      { x: 9, z: 20, radius: 3.5 },
      { x: 0, z: 20, radius: 3 },
    ],
    obstacles: [],
    points: [
      {
        id: 'mill-wheel',
        x: -10.1,
        z: 9.4,
        kind: 'landmark',
        label: '멈춘 수차',
        description: '수차 옆의 마모된 축과 오래된 물높이 눈금을 살펴봤다.',
      },
      {
        id: 'mill-sluice',
        x: 1.2,
        z: 20.3,
        kind: 'mechanism',
        label: '수문 열고 가교 내리기',
        description:
          '수문을 열자 수차가 천천히 돌기 시작하고 중앙 가교가 내려갔다.',
      },
      {
        id: 'mill-store',
        x: 9,
        z: 20.5,
        kind: 'landmark',
        label: '곡물 창고 앞마당',
        description: '빈 곡물 창고와 수로로 연결된 운반 마당을 확인했다.',
      },
      {
        id: 'mill-bundle',
        x: 9,
        z: 10.4,
        kind: 'cache',
        label: '창고 옆 짐자루',
        description: '창고 옆 마당에서 남겨진 짐자루와 작은 물통을 찾았다.',
      },
    ],
    shortcut: { point: 'mill-sluice', label: '중앙 수로 가교' },
    bridges: [
      { from: { x: -5.5, z: 10 }, to: { x: 5.5, z: 10 }, width: 3 },
      { from: { x: -5.5, z: 0 }, to: { x: 5.5, z: 0 }, width: 3.4 },
      { from: { x: -5.5, z: 20 }, to: { x: 5.5, z: 20 }, width: 3.4 },
      { from: { x: 0, z: 20 }, to: { x: 0, z: 0 }, width: 2.6, shortcut: true },
    ],
    walls: [],
    battleAreas: [
      { x: 9, z: 10, radius: 2.2, label: '동쪽 작업 마당의 선택 전투' },
      { x: -9, z: 20, radius: 2.3, label: '수문 안쪽 마당의 주 전투' },
    ],
  },
  {
    id: 'garden',
    title: '단풍 사당정원',
    structure: '세 정원 마당과 연못 둘레의 열린 연결',
    description:
      '단풍나무 그늘에서 돌다리와 연못을 돌아 사당에 닿는다. 안쪽 문을 열면 정원 입구에서 사당으로 가는 길이 연결된다.',
    style: regionStyle(
      {
        grass: 0xa5a087,
        leaves: 0xb19570,
        earth: 0x9c8b77,
        path: 0xc8b99f,
        stone: 0xaaa999,
      },
      {
        background: 0xc1b9a4,
        sky: 0xe9e3d7,
        shade: 0x7e7867,
        sunlight: 0xf0e2c8,
        sunStrength: 1.35,
      },
    ),
    entrance,
    spawn,
    routes: [
      {
        points: [
          entrance,
          { x: 0, z: 0 },
          { x: -9, z: 7 },
          { x: -12, z: 16 },
          { x: 0, z: 23 },
        ],
        halfWidth: 2,
      },
      {
        points: [
          { x: 0, z: 0 },
          { x: 12, z: 8 },
          { x: 10, z: 17 },
          { x: 0, z: 23 },
        ],
        halfWidth: 1.9,
      },
      {
        points: [
          { x: -9, z: 7 },
          { x: 0, z: 13 },
          { x: 10, z: 17 },
        ],
        halfWidth: 2,
      },
      {
        points: [
          { x: 0, z: 0 },
          { x: 0, z: 23 },
        ],
        halfWidth: 1.5,
        shortcut: true,
      },
    ],
    clearings: [
      { x: 0, z: 0, radius: 2.7 },
      { x: -9, z: 7, radius: 4.2 },
      { x: -12, z: 16, radius: 3.5 },
      { x: 0, z: 13, radius: 5.8 },
      { x: 12, z: 8, radius: 3.8 },
      { x: 10, z: 17, radius: 4.3 },
      { x: 0, z: 23, radius: 4.2 },
    ],
    obstacles: [
      { x: 0, z: 13, radius: 2.1, kind: 'rock' },
      { x: -10.8, z: 6.3, radius: 0.75, kind: 'tree' },
      { x: 11.7, z: 18.1, radius: 0.8, kind: 'tree' },
    ],
    points: [
      {
        id: 'garden-bell',
        x: -12,
        z: 16,
        kind: 'landmark',
        label: '돌등과 작은 종',
        description: '돌등 사이의 작은 종과 오래된 정원 안내를 살펴봤다.',
      },
      {
        id: 'garden-gate',
        x: 0,
        z: 22,
        kind: 'mechanism',
        label: '사당 앞 정원문 열기',
        description:
          '안쪽 정원문을 열어 입구에서 사당 앞마당으로 이어지는 길을 확보했다.',
      },
      {
        id: 'garden-pond',
        x: 3,
        z: 13,
        kind: 'landmark',
        label: '단풍 비치는 연못',
        description:
          '연못 가장자리에서 돌로 두른 물길과 떨어진 단풍잎을 살펴봤다.',
      },
      {
        id: 'garden-offering',
        x: 11,
        z: 7.5,
        kind: 'cache',
        label: '정원 구석의 보따리',
        description: '옆 마당에서 여행자가 남긴 작은 보따리를 찾았다.',
      },
    ],
    shortcut: { point: 'garden-gate', label: '사당 정면 참배길' },
    bridges: [],
    walls: [],
    battleAreas: [
      { x: -9, z: 8, radius: 2.4, label: '서쪽 정원의 선택 전투' },
      { x: 0, z: 24, radius: 2.4, label: '사당 앞마당의 주 전투' },
    ],
  },
  {
    id: 'caldera',
    title: '검은돌 분지',
    structure: '분화구 둘레 순환로와 안쪽 암반길',
    description:
      '식은 분화구를 돌아 검은 돌기둥과 옛 관측 터를 찾는다. 안쪽 낙석을 치우면 분지 입구로 내려오는 암반길이 열린다.',
    style: regionStyle(
      {
        grass: 0x858881,
        leaves: 0x7b8475,
        earth: 0x78786e,
        path: 0xa7a596,
        stone: 0x777e79,
      },
      {
        background: 0xa6aeaa,
        sky: 0xd6dfda,
        shade: 0x65706c,
        sunlight: 0xe6e4d8,
        sunStrength: 1.35,
      },
    ),
    entrance,
    spawn,
    routes: [
      {
        points: [
          entrance,
          { x: 0, z: 2 },
          { x: -8, z: 6 },
          { x: -12, z: 14 },
          { x: -8, z: 22 },
          { x: 0, z: 25 },
        ],
        halfWidth: 2.1,
      },
      {
        points: [
          { x: 0, z: 2 },
          { x: 8, z: 6 },
          { x: 12, z: 14 },
          { x: 8, z: 22 },
          { x: 0, z: 25 },
        ],
        halfWidth: 1.8,
      },
      {
        points: [
          { x: -12, z: 14 },
          { x: -6, z: 14 },
          { x: -4, z: 20 },
          { x: 0, z: 25 },
        ],
        halfWidth: 1.4,
      },
      {
        points: [
          { x: 0, z: 25 },
          { x: 5, z: 20 },
          { x: 5, z: 10 },
          { x: 0, z: 2 },
        ],
        halfWidth: 1.3,
        shortcut: true,
      },
    ],
    clearings: [
      { x: 0, z: 2, radius: 4.2 },
      { x: -12, z: 14, radius: 3.1 },
      { x: 12, z: 14, radius: 3.8 },
      { x: -8, z: 22, radius: 2.7 },
      { x: 0, z: 25, radius: 4 },
    ],
    obstacles: [
      { x: 0, z: 14, radius: 3.8, kind: 'rock' },
      { x: 10.5, z: 14.6, radius: 0.8, kind: 'rock' },
    ],
    points: [
      {
        id: 'caldera-columns',
        x: 12.5,
        z: 14,
        kind: 'landmark',
        label: '검은 돌기둥 지대',
        description: '높이가 다른 검은 돌기둥과 냉각 균열을 살펴봤다.',
      },
      {
        id: 'caldera-slide',
        x: 0,
        z: 25,
        kind: 'mechanism',
        label: '안쪽 길의 낙석 치우기',
        description:
          '낙석을 치워 분화구 안쪽 가장자리를 따라 입구로 내려오는 길을 열었다.',
      },
      {
        id: 'caldera-watch',
        x: -8,
        z: 22,
        kind: 'landmark',
        label: '옛 분지 관측 터',
        description:
          '분화구가 내려다보이는 관측 터에서 오래된 기록의 흔적을 찾았다.',
      },
      {
        id: 'caldera-satchel',
        x: -12,
        z: 14,
        kind: 'cache',
        label: '재에 덮인 가방',
        description: '분화구 바깥길에서 재에 덮인 여행 가방을 찾았다.',
      },
    ],
    shortcut: { point: 'caldera-slide', label: '분지 안쪽 암반길' },
    bridges: [],
    walls: [],
    battleAreas: [
      { x: 12, z: 14, radius: 2.2, label: '돌기둥 사이의 선택 전투' },
      { x: 0, z: 25, radius: 2.6, label: '분지 안쪽의 주 전투' },
    ],
  },
];
