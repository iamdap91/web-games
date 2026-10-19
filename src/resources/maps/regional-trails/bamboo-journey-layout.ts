import type {
  TrailArea,
  TrailDefinition,
  TrailPoint,
} from './route-layouts.js';

const creek: TrailArea = { minX: -28, maxX: 1, minZ: 1.5, maxZ: 4.3 };
const pond: TrailArea = { minX: 10.5, maxX: 23, minZ: -17.5, maxZ: -3 };
const bridge: TrailArea = { minX: -8, maxX: -3.3, minZ: 1.1, maxZ: 4.7 };
const steppingStones: TrailArea = {
  minX: 14.6,
  maxX: 18.4,
  minZ: -17.8,
  maxZ: -2.7,
};

/** 인물·건물 배율과 길 폭을 유지하며 구역 사이의 보행 거리를 확장한다. */
export const bambooJourneyPlaces = {
  entrance: { x: -11, z: 24 },
  grove: { x: -20.5, z: 12 },
  fork: { x: -5, z: -1 },
  bridge: { center: { x: -5.7, z: 2.8 }, area: bridge },
  shrine: { model: { x: -22, z: -8 }, visit: { x: -18, z: -8 } },
  pavilion: { model: { x: 3, z: -2 }, visit: { x: 7, z: -3 } },
  steppingStones: { center: { x: 16.5, z: -10 }, area: steppingStones },
  farBank: { x: 26, z: -10 },
  shortcut: { x: -1, z: -3 },
  forecourt: { x: 7, z: -20 },
  trainingGate: { model: { x: 5, z: -27.3 }, visit: { x: 5, z: -26.3 } },
  pond,
  creek,
} as const;

export const bambooJourneySurface: {
  readonly waters: readonly TrailArea[];
  readonly bridges: readonly TrailArea[];
} = { waters: [creek, pond], bridges: [bridge, steppingStones] };

export const bambooJourneyDefinition: TrailDefinition = {
  name: '바람대숲 이어걷기',
  description:
    '울창한 대숲의 굽이를 지나 개울과 물가정원을 탐험하고, 북쪽 수련문 앞뜰에 닿는 긴 대숲길.',
  start: bambooJourneyPlaces.entrance,
  areas: [
    { minX: -13.3, maxX: -8.7, minZ: 21.4, maxZ: 26.5 },
    { minX: -20.3, maxX: -15.7, minZ: -10.3, maxZ: -5.7 },
    { minX: 4.5, maxX: 9.3, minZ: -5.3, maxZ: -0.8 },
    { minX: 3.2, maxX: 10.8, minZ: -23, maxZ: -17.7 },
    { minX: 2.7, maxX: 7.3, minZ: -28.6, maxZ: -24 },
  ],
  paths: [
    {
      width: 3.6,
      points: [
        { x: -11, z: 24 },
        { x: -12, z: 18 },
        { x: -21, z: 14 },
        { x: -20, z: 7 },
        { x: -12, z: 9 },
        { x: -6, z: 5 },
        { x: -5, z: -1 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: -5, z: -1 },
        { x: -11, z: -6 },
        { x: -6, z: -11 },
        { x: 2, z: -9 },
        { x: 7, z: -4 },
        { x: 7, z: -3 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: -11, z: -6 },
        { x: -18, z: -8 },
        { x: -17, z: -15 },
        { x: -6, z: -11 },
      ],
    },
    {
      width: 3.2,
      points: [
        { x: -5, z: -1 },
        { x: -1, z: -3 },
        { x: 7, z: -4 },
      ],
    },
    {
      width: 3.6,
      points: [
        { x: 7, z: -4 },
        { x: 9, z: 2 },
        { x: 17, z: 3 },
        { x: 24, z: 0 },
        { x: 26, z: -10 },
        { x: 22, z: -19 },
        { x: 14, z: -21 },
        { x: 7, z: -20 },
        { x: 5, z: -26.3 },
      ],
    },
    {
      width: 3.4,
      points: [
        { x: 16.5, z: 3 },
        { x: 16.5, z: -20.7 },
      ],
    },
  ],
  landmarks: [
    {
      id: 'grove',
      name: '바람 우는 대숲',
      position: bambooJourneyPlaces.grove,
      description:
        '굽은 길 양편으로 대나무가 겹쳐 선다. 대숲을 빠져나가면 낮은 개울과 갈림길이 나타난다.',
      kind: 'view',
    },
    {
      id: 'bridge',
      name: '개울 목교',
      position: bambooJourneyPlaces.bridge.center,
      description:
        '대숲 아래를 가로지르는 개울. 목교를 건너면 사당을 도는 길과 물가정원으로 향하는 샛길이 갈라진다.',
      kind: 'view',
    },
    {
      id: 'shrine',
      name: '대숲 작은 사당',
      position: bambooJourneyPlaces.shrine.visit,
      description:
        '개울 너머 깊은 대숲에 숨은 작은 사당. 뒤쪽 고사리 굽이를 돌면 정자 쪽 길에 다시 합류한다.',
      kind: 'view',
    },
    {
      id: 'shortcut',
      name: '대숲 가로샛길',
      position: bambooJourneyPlaces.shortcut,
      description:
        '목교와 물가정원을 잇는 짧은 길. 돌아올 때 사당의 굽은 길을 반복하지 않아도 된다.',
      kind: 'view',
    },
    {
      id: 'pavilion',
      name: '연못 물가정자',
      position: bambooJourneyPlaces.pavilion.visit,
      description:
        '대숲을 지나 시야가 열리는 물가정자. 연못 가운데 징검길이나 먼 물가를 골라 북쪽 앞뜰로 향할 수 있다.',
      kind: 'view',
    },
    {
      id: 'stepping-stones',
      name: '연못 징검길',
      position: bambooJourneyPlaces.steppingStones.center,
      description:
        '연못을 남북으로 잇는 낮은 돌길. 물 위를 가로지르면 먼 물가를 도는 것보다 수련문 앞뜰에 빨리 닿는다.',
      kind: 'view',
    },
    {
      id: 'far-bank',
      name: '연못 먼 물가',
      position: bambooJourneyPlaces.farBank,
      description:
        '대숲이 성기게 열리는 동쪽 물가. 연못 건너 정자를 바라보며 북쪽으로 돌아갈 수 있다.',
      kind: 'view',
    },
    {
      id: 'forecourt',
      name: '수련문 앞뜰',
      position: bambooJourneyPlaces.forecourt,
      description:
        '두 물가길이 다시 만나는 넓은 앞뜰. 낮은 바위와 대나무 사이로 수련문이 모습을 드러낸다.',
      kind: 'view',
    },
    {
      id: 'battle',
      name: '공통 수련문',
      position: bambooJourneyPlaces.trainingGate.visit,
      description:
        '긴 대숲길 끝에 남은 수련문. 문 너머 전장은 기존 두 전투맵에서 비교할 수 있다.',
      kind: 'battle',
    },
  ],
  ground: 'grass',
  sky: 0xc7d8c7,
  shade: 0x647c6a,
  sun: 0xffeab9,
  camera: { x: 1.5, y: 46, z: 58, targetX: 1.5, targetZ: -1, span: 35 },
};

export function bambooJourneyZone(point: TrailPoint): {
  readonly id: 'entrance' | 'grove' | 'trail' | 'garden' | 'training';
  readonly name: string;
} {
  if (point.z >= 20) return { id: 'entrance', name: '남쪽 대숲 입구' };
  if (point.z > 5 && point.x < -7)
    return { id: 'grove', name: '바람 우는 깊은 대숲' };
  if (point.z < -18 && point.x < 15)
    return { id: 'training', name: '북쪽 수련문 앞뜰' };
  if (point.x >= 4) return { id: 'garden', name: '동쪽 물가정원' };
  return { id: 'trail', name: '개울과 사당 샛길' };
}
