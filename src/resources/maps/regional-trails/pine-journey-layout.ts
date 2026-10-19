import type {
  TrailArea,
  TrailDefinition,
  TrailPoint,
} from './route-layouts.js';

const stoneBridge: TrailArea = {
  minX: -10.1,
  maxX: -5.9,
  minZ: -0.5,
  maxZ: 7.0,
};

/** 모형은 방문점 옆으로 물리고 같은 앵커를 통행로와 조경이 함께 사용한다. */
export const pineJourneyPlaces = {
  entrance: { x: 13, z: 24 },
  grove: { x: 1, z: 17 },
  bridge: { center: { x: -8, z: 3.25 }, area: stoneBridge },
  waterside: { model: { x: -3.6, z: 0.4 }, visit: { x: -3, z: -3.5 } },
  mill: { model: { x: 5, z: 1.5 }, visit: { x: 0, z: -1.2 } },
  loggingYard: { model: { x: -25, z: -9.5 }, visit: { x: -20, z: -9 } },
  shortcut: { x: -10, z: -10 },
  farBank: { x: 21, z: 4 },
  ridge: { x: 10, z: -15.5 },
  battleGate: { model: { x: -1, z: -28.1 }, visit: { x: -1, z: -27 } },
} as const;

export const pineJourneySurface: {
  readonly waters: readonly TrailArea[];
  readonly bridges: readonly TrailArea[];
} = {
  // 겹치는 네 물굽이가 계곡을 서북쪽에서 동남쪽으로 완만하게 굽혀 잇는다.
  waters: [
    { minX: -27, maxX: -13, minZ: -2.2, maxZ: 1.8 },
    { minX: -15, maxX: -1, minZ: 0, maxZ: 6.5 },
    { minX: -3, maxX: 13, minZ: 3.8, maxZ: 10 },
    { minX: 11, maxX: 26, minZ: 8.1, maxZ: 12.2 },
  ],
  bridges: [stoneBridge],
};

export const pineJourneyDefinition: TrailDefinition = {
  name: '솔바람 계곡 이어걷기',
  description:
    '솔그늘에서 이끼 석교를 건너 물레방아와 옛 벌목터를 둘러보고, 굽은 바위고개 너머 공터에 닿는 계곡길.',
  start: pineJourneyPlaces.entrance,
  areas: [
    { minX: 10.7, maxX: 15.3, minZ: 21.8, maxZ: 26.2 },
    { minX: -5.3, maxX: -0.8, minZ: -5.7, maxZ: -1.3 },
    { minX: -2.2, maxX: 2.2, minZ: -3.4, maxZ: 1.0 },
    { minX: -22.2, maxX: -17.8, minZ: -11.3, maxZ: -6.7 },
    { minX: 18.8, maxX: 23.2, minZ: 1.8, maxZ: 6.2 },
    { minX: 7.8, maxX: 12.2, minZ: -17.7, maxZ: -13.3 },
    { minX: -3.2, maxX: 1.2, minZ: -29.2, maxZ: -24.8 },
  ],
  paths: [
    {
      width: 3.6,
      points: [
        { x: 13, z: 24 },
        { x: 9, z: 18 },
        { x: 1, z: 17 },
        { x: -6, z: 13 },
        { x: -8, z: 9 },
        { x: -8, z: 3.25 },
        { x: -8, z: -2 },
        { x: -3, z: -3.5 },
        { x: 0, z: -1.2 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: 0, z: -1.2 },
        { x: 6, z: -5 },
        { x: 15, z: -8 },
        { x: 10, z: -15.5 },
        { x: 3, z: -20 },
        { x: -1, z: -27 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: -8, z: -2 },
        { x: -13, z: -5 },
        { x: -20, z: -9 },
        { x: -17, z: -17 },
        { x: -6, z: -18 },
        { x: 3, z: -20 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: 6, z: -5 },
        { x: 18, z: -2 },
        { x: 21, z: 4 },
        { x: 24, z: -3 },
        { x: 15, z: -8 },
      ],
    },
    {
      width: 3.4,
      points: [
        { x: -17, z: -17 },
        { x: -10, z: -10 },
        { x: -3, z: -3.5 },
      ],
    },
  ],
  landmarks: [
    {
      id: 'grove',
      name: '솔그늘 굽이',
      position: pineJourneyPlaces.grove,
      description:
        '굽은 소나무와 고사리 사이로 옛 짐길이 이어진다. 숲을 돌아 나가면 낮은 계류와 석교가 드러난다.',
      kind: 'view',
    },
    {
      id: 'stone-bridge',
      name: '물안개 석교',
      position: pineJourneyPlaces.bridge.center,
      description:
        '두꺼운 돌 난간 아래로 계류가 흐른다. 다리 건너 물레방아 길과 옛 벌목터 길이 갈라진다.',
      kind: 'view',
    },
    {
      id: 'waterside',
      name: '계류 너럭바위',
      position: pineJourneyPlaces.waterside.visit,
      description:
        '잔물결 옆으로 이끼 낀 너럭바위가 드러난다. 물가를 따라가면 소나무 사이의 작은 물레방아를 만난다.',
      kind: 'view',
    },
    {
      id: 'watermill',
      name: '계류 물레방아',
      position: pineJourneyPlaces.mill.visit,
      description:
        '기울어진 판벽과 물레가 남은 계곡의 작업집. 북쪽 바위고개로 곧장 오르거나 동쪽 물굽이를 돌아갈 수 있다.',
      kind: 'view',
    },
    {
      id: 'logging-yard',
      name: '옛 벌목터',
      position: pineJourneyPlaces.loggingYard.visit,
      description:
        '낮은 작업대와 잘린 통나무가 풀 속에 남아 있다. 뒤쪽 길은 바위고개 앞에서 주동선과 다시 만난다.',
      kind: 'view',
    },
    {
      id: 'shortcut',
      name: '솔뿌리 귀환길',
      position: pineJourneyPlaces.shortcut,
      description:
        '옛 벌목터의 북쪽 길에서 석교 쪽으로 빠르게 돌아오는 샛길. 고사리와 드러난 뿌리를 따라 두 길이 이어진다.',
      kind: 'view',
    },
    {
      id: 'far-bank',
      name: '솔바람 물굽이',
      position: pineJourneyPlaces.farBank,
      description:
        '계류가 넓어지는 동쪽 물가. 돌무더기 사이로 물레방아 지붕을 돌아본 뒤 바위고개 길에 합류한다.',
      kind: 'view',
    },
    {
      id: 'ridge',
      name: '이끼 바위고개',
      position: pineJourneyPlaces.ridge,
      description:
        '겹겹이 드러난 암반과 부러진 운반 난간 사이로 길이 휜다. 솔숲 뒤에서 멧돼지 공터의 입구가 나타난다.',
      kind: 'view',
    },
    {
      id: 'battle',
      name: '멧돼지 공터 입구',
      position: pineJourneyPlaces.battleGate.visit,
      description:
        '낡은 돌기둥 곁에 굵은 발굽 자국이 남아 있다. 계곡길과 벌목터 길이 여기서 하나로 모인다.',
      kind: 'battle',
    },
  ],
  ground: 'grass',
  sky: 0xcbd7be,
  shade: 0x697958,
  sun: 0xffe3ae,
  camera: { x: 0, y: 46, z: 58, targetX: 0, targetZ: -1.5, span: 35 },
};

export function pineJourneyZone(point: TrailPoint): {
  readonly id: string;
  readonly name: string;
} {
  if (point.z >= 21) return { id: 'entrance', name: '남쪽 솔숲 입구' };
  if (point.z > 7) return { id: 'grove', name: '굽은 소나무 숲길' };
  if (point.z < -21) return { id: 'battle', name: '북쪽 멧돼지 공터' };
  if (point.x < -11 && point.z < -4)
    return { id: 'logging', name: '옛 벌목터 우회길' };
  if (point.z <= -13) return { id: 'ridge', name: '이끼 바위고개' };
  if (point.x >= 13) return { id: 'bend', name: '동쪽 계류 물굽이' };
  if (point.z < -5 && point.x < -4)
    return { id: 'shortcut', name: '솔뿌리 귀환 샛길' };
  return { id: 'valley', name: '석교와 물레방아 계곡' };
}
