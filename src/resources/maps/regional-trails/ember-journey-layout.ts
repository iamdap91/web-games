import type {
  TrailArea,
  TrailDefinition,
  TrailPoint,
} from './route-layouts.js';

const fissure: TrailArea = {
  minX: -11.2,
  maxX: -6.6,
  minZ: -16.5,
  maxZ: 18.4,
};
const quarryCrack: TrailArea = {
  minX: 3.8,
  maxX: 8.6,
  minZ: -12.8,
  maxZ: -8.8,
};
const bridge: TrailArea = {
  minX: -11.8,
  maxX: -6.0,
  minZ: 0.6,
  maxZ: 5.4,
};

export const emberJourneyPlaces = {
  entrance: { x: -27, z: 18 },
  road: { x: -22, z: 21 },
  relay: { model: { x: -23, z: 12 }, visit: { x: -18, z: 10 } },
  bridge: { center: { x: -8.9, z: 3 }, area: bridge },
  fork: { x: -4.5, z: 3 },
  quarry: { model: { x: 7, z: 8.2 }, visit: { x: 7, z: 3.5 } },
  ridge: { x: 1, z: -12 },
  observatory: { model: { x: 31.8, z: 2 }, visit: { x: 28, z: 2 } },
  workyard: { model: { x: 23, z: -13 }, visit: { x: 18, z: -13 } },
  shortcut: { x: 0, z: -4 },
  gate: { model: { x: 26, z: -24.4 }, visit: { x: 26, z: -23.3 } },
  fissure,
  quarryCrack,
} as const;

/** 용암과 돌다리는 모형도 같은 좌표를 사용하고 윗면 높이 0.055를 유지한다. */
export const emberJourneySurface: {
  readonly waters: readonly TrailArea[];
  readonly bridges: readonly TrailArea[];
} = {
  waters: [fissure, quarryCrack],
  bridges: [bridge],
};

export const emberJourneyDefinition: TrailDefinition = {
  name: '잿불 채석장 이어걷기',
  description:
    '재덮인 옛 운반로에서 용암 균열을 건너, 흑요석 채석장과 퇴석 능선을 지나 전장문에 닿는 길.',
  start: emberJourneyPlaces.entrance,
  areas: [
    { minX: -29.5, maxX: -24.5, minZ: 15.7, maxZ: 20.3 },
    { minX: -20.4, maxX: -15.6, minZ: 7.6, maxZ: 12.4 },
    { minX: 4.5, maxX: 9.5, minZ: 1.2, maxZ: 5.8 },
    { minX: 15.5, maxX: 20.5, minZ: -15.5, maxZ: -10.5 },
    { minX: 21.4, maxX: 26.6, minZ: -20.3, maxZ: -15.7 },
    { minX: 23.4, maxX: 28.6, minZ: -25.6, maxZ: -21.0 },
  ],
  paths: [
    {
      width: 3.6,
      points: [
        { x: -27, z: 18 },
        { x: -22, z: 21 },
        { x: -17, z: 15 },
        { x: -18, z: 10 },
        { x: -23, z: 6 },
        { x: -15, z: 2 },
        { x: -12, z: 3 },
        { x: -4.5, z: 3 },
      ],
    },
    {
      width: 3.8,
      points: [
        { x: -4.5, z: 3 },
        { x: 3, z: 5 },
        { x: 11, z: 2 },
        { x: 16, z: -5 },
        { x: 18, z: -13 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: -4.5, z: 3 },
        { x: -2, z: -5 },
        { x: 1, z: -12 },
        { x: 8, z: -15 },
        { x: 13, z: -11 },
        { x: 18, z: -13 },
      ],
    },
    {
      width: 3.4,
      points: [
        { x: 11, z: 2 },
        { x: 18, z: 7 },
        { x: 27, z: 6 },
        { x: 29, z: -2 },
        { x: 22, z: -8 },
        { x: 18, z: -13 },
      ],
    },
    {
      width: 3.4,
      points: [
        { x: -4.5, z: 3 },
        { x: 0, z: -4 },
        { x: 9, z: -6 },
        { x: 18, z: -13 },
      ],
    },
    {
      width: 3.8,
      points: [
        { x: 18, z: -13 },
        { x: 24, z: -18 },
        { x: 26, z: -23.3 },
      ],
    },
  ],
  landmarks: [
    {
      id: 'ash-road',
      name: '재바람 운반굽이',
      position: emberJourneyPlaces.road,
      description:
        '검은 돌 사이로 옛 수레 자국이 이어진다. 굽이를 돌아 내려가면 무너진 짐꾼 역참이 나타난다.',
      kind: 'view',
    },
    {
      id: 'relay',
      name: '무너진 짐꾼 역참',
      position: emberJourneyPlaces.relay.visit,
      description:
        '재가 쌓인 짐받이와 꺾인 지붕만 남았다. 그 너머로 따뜻한 용암 균열과 돌다리가 보인다.',
      kind: 'view',
    },
    {
      id: 'fissure-bridge',
      name: '현무암 균열다리',
      position: emberJourneyPlaces.bridge.center,
      description:
        '붉은 균열 위에 낮고 두꺼운 돌을 이어 놓았다. 건너편에서 채석기 쪽 운반로와 퇴석 능선길이 갈라진다.',
      kind: 'view',
    },
    {
      id: 'quarry',
      name: '흑요석 채석기',
      position: emberJourneyPlaces.quarry.visit,
      description:
        '굵은 목재와 도르래가 잘라낸 흑요석을 붙잡고 있다. 작업마당으로 가거나 동쪽 관측 곁길을 돌아볼 수 있다.',
      kind: 'view',
    },
    {
      id: 'spoil-ridge',
      name: '퇴석 능선길',
      position: emberJourneyPlaces.ridge,
      description:
        '낮은 검은 바위와 잘게 부서진 퇴석이 겹쳐 있다. 채석장 아래의 붉은 틈을 돌아 작업마당에서 다시 만난다.',
      kind: 'view',
    },
    {
      id: 'observatory',
      name: '잿불 관측대',
      position: emberJourneyPlaces.observatory.visit,
      description:
        '낡은 관측통 너머로 채석장과 용암 균열이 겹쳐 보인다. 동쪽 곁길은 작업마당으로 이어진다.',
      kind: 'view',
    },
    {
      id: 'workyard',
      name: '재덮인 석공 작업대',
      position: emberJourneyPlaces.workyard.visit,
      description:
        '쐐기와 망치가 남은 석공 작업대. 채석장과 능선길이 여기서 합류하고 북쪽 전장문으로 이어진다.',
      kind: 'view',
    },
    {
      id: 'return-cut',
      name: '석공 귀환샛길',
      position: emberJourneyPlaces.shortcut,
      description:
        '빈 광차 곁으로 돌아오는 짧은 반출길. 작업마당에서 채석장과 능선 굽이를 반복하지 않고 돌다리로 향할 수 있다.',
      kind: 'view',
    },
    {
      id: 'battle',
      name: '천산갑 전장 입구',
      position: emberJourneyPlaces.gate.visit,
      description:
        '재가 얇게 깔린 계근문 너머로 단단한 갑각이 긁은 자국이 이어진다. 문 너머 전장은 기존 두 전투맵에서 비교한다.',
      kind: 'battle',
    },
  ],
  ground: 'basalt',
  sky: 0xbeb0a5,
  shade: 0x615d66,
  sun: 0xffd1a4,
  camera: { x: 0.5, y: 45, z: 58, targetX: 0.5, targetZ: -1, span: 37 },
};

export function emberJourneyZone(point: TrailPoint): {
  readonly id: string;
  readonly name: string;
} {
  if (point.x < -24 && point.z > 14)
    return { id: 'entrance', name: '남서쪽 재바람 입구' };
  if (point.x > 17 && point.z < -18.5)
    return { id: 'battle', name: '천산갑 전장 앞 계근문' };
  if (point.x > 23 && point.z > -6.5)
    return { id: 'observatory', name: '동쪽 잿불 관측 곁길' };
  if (point.x > 12 && point.z < -8.5)
    return { id: 'workyard', name: '북쪽 석공 작업마당' };
  if (point.x < 10 && point.z < -7.5)
    return { id: 'ridge', name: '낮은 퇴석 능선길' };
  if (point.x < -14) return { id: 'road', name: '재덮인 옛 운반로' };
  if (point.x < -3 && point.z > -0.2)
    return { id: 'fissure', name: '용암 균열과 현무암 돌다리' };
  return { id: 'quarry', name: '흑요석 채석장과 반출샛길' };
}
