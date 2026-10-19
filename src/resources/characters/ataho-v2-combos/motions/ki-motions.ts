import type { ComboStep } from '../types.js';
import type {
  KiDefinition,
  KiHit,
  KiMotion,
  KiPoint,
  KiShot,
} from '../ki-types.js';

const guardMotion = 'fight-stance-idle-8-frames-south-east';
const punchMotion = 'ataho-one-two-punch-south-east-south-east';
const origin: KiPoint = { x: 24, y: -34 };
const beamOrigin: KiPoint = { x: 22, y: -28 };
const target: KiPoint = { x: 150, y: -36 };
const tigerOrigin: KiPoint = { x: 49, y: -35 };
const tigerTarget: KiPoint = { x: 84, y: -35 };
const eruptionTarget: KiPoint = { x: 84, y: -35 };

type TimedPose = {
  readonly atMs: number;
  readonly motion: string;
  readonly frame: number;
  readonly phase: string;
  readonly x?: number;
  readonly movementCurve?: ComboStep['movementCurve'];
  readonly anchor?: ComboStep['anchor'];
  readonly emphasis?: 'charge';
};

/** 기공은 몸의 접촉을 발생시키지 않으며 전진도 몸의 자세 데이터에서 맡는다. */
function poses(
  endMs: number,
  sequence: readonly TimedPose[],
): readonly ComboStep[] {
  return sequence.map((pose, index) => ({
    motion: pose.motion,
    frame: pose.frame,
    phase: pose.phase,
    emphasis: pose.emphasis,
    durationMs: (sequence[index + 1]?.atMs ?? endMs) - pose.atMs,
    x: pose.x ?? 0,
    movementCurve: pose.movementCurve,
    y: 0,
    anchor: pose.anchor ?? 'feet',
  }));
}

function guard(atMs: number, phase = '기공 준비'): TimedPose {
  return { atMs, motion: guardMotion, frame: 0, phase };
}

function punch(atMs: number, frame: number, phase: string): TimedPose {
  return { atMs, motion: punchMotion, frame, phase };
}

function tigerPunchPoses(endMs: number): readonly ComboStep[] {
  const hook = (
    atMs: number,
    frame: number,
    x: number,
    phase: string,
  ): TimedPose => ({
    atMs,
    motion: 'smear-hook-stable-south-east',
    frame,
    x,
    phase,
  });
  return poses(endMs, [
    guard(0),
    hook(120, 1, -3, '허리를 틀어 주먹 장전'),
    { ...hook(220, 2, -7, '뒤로 당긴 주먹에 권기 압축'), emphasis: 'charge' },
    hook(430, 3, 2, '짧은 전진 · 가로 스미어'),
    {
      ...hook(470, 4, 18, '주먹을 박아 넣기 · 근거리 호랑이 권기'),
      movementCurve: { x: 'hold' },
    },
    hook(620, 6, 18, '기공 압력을 남기고 주먹 회수'),
    hook(740, 7, 12, '몸통 반동 회수'),
    hook(850, 8, 6, '가드 정착'),
    guard(1000, '호격권 뒤 가드 복귀'),
  ]);
}

function shot(
  id: string,
  launchMs: number,
  arriveMs: number,
  radius: number,
  options: {
    readonly from?: KiPoint;
    readonly curveY?: number;
    readonly travelCurve?: KiShot['travelCurve'];
  } = {},
): KiShot {
  return {
    id,
    launchMs,
    arriveMs,
    from: options.from ?? origin,
    to: target,
    radius,
    curveY: options.curveY,
    travelCurve: options.travelCurve,
  };
}

function hit(
  id: string,
  atMs: number,
  options: {
    readonly durationMs?: number;
    readonly radius?: number;
    readonly strength?: number;
    readonly reaction?: KiHit['reaction'];
    readonly shotId?: string;
    readonly point?: KiPoint;
  } = {},
): KiHit {
  return {
    id,
    atMs,
    durationMs: options.durationMs ?? 190,
    point: options.point ?? target,
    radius: options.radius ?? 14,
    strength: options.strength ?? 1,
    reaction: options.reaction ?? 'horizontal',
    shotId: options.shotId,
  };
}

function definition(
  config: Omit<KiDefinition, 'origin' | 'target'> &
    Partial<Pick<KiDefinition, 'origin' | 'target'>>,
): KiDefinition {
  return { origin, target, ...config };
}

const tigerManifest = definition({
  style: 'tiger-manifest',
  accent: '#ffcf63',
  chargeStartMs: 120,
  origin: tigerOrigin,
  chargeOrigin: { x: -5, y: -37 },
  target: tigerTarget,
  releaseMs: 470,
  endMs: 1300,
  shots: [],
  hits: [
    hit('tiger-pulse-1', 500, {
      point: tigerTarget,
      radius: 20,
      strength: 0.68,
    }),
    hit('tiger-pulse-2', 660, {
      point: tigerTarget,
      radius: 21,
      strength: 0.8,
    }),
    hit('tiger-pulse-3', 820, {
      point: tigerTarget,
      radius: 23,
      strength: 1.15,
      durationMs: 240,
    }),
  ],
});

const tigerWave = definition({
  style: 'tiger-wave',
  accent: '#ffd66d',
  chargeStartMs: 120,
  origin: tigerOrigin,
  chargeOrigin: { x: -5, y: -37 },
  target: tigerTarget,
  releaseMs: 470,
  endMs: 1120,
  shots: [
    {
      ...shot('tiger-head', 470, 545, 22, { from: tigerOrigin }),
      to: tigerTarget,
    },
  ],
  hits: [
    hit('tiger-bite', 545, {
      point: tigerTarget,
      shotId: 'tiger-head',
      radius: 25,
      strength: 1.4,
      durationMs: 260,
    }),
  ],
});

const orb = definition({
  style: 'orb',
  accent: '#73e3f7',
  chargeStartMs: 100,
  releaseMs: 340,
  endMs: 1100,
  shots: [shot('palm-orb', 340, 620, 10)],
  hits: [
    hit('orb-burst', 620, {
      shotId: 'palm-orb',
      radius: 16,
      strength: 1.05,
      durationMs: 220,
    }),
  ],
});

const beam = definition({
  style: 'beam',
  accent: '#8bdfff',
  origin: beamOrigin,
  chargeOrigin: { x: 6, y: -22 },
  chargeStartMs: 120,
  releaseMs: 900,
  endMs: 2050,
  shots: [shot('beam-front', 900, 1030, 15, { from: beamOrigin })],
  hits: [
    hit('beam-pressure-1', 1030, {
      shotId: 'beam-front',
      radius: 17,
      strength: 0.5,
      durationMs: 170,
    }),
    hit('beam-pressure-2', 1200, {
      shotId: 'beam-front',
      radius: 17,
      strength: 0.62,
      durationMs: 170,
    }),
    hit('beam-pressure-3', 1370, {
      shotId: 'beam-front',
      radius: 18,
      strength: 0.76,
      durationMs: 170,
    }),
    hit('beam-pressure-4', 1540, {
      shotId: 'beam-front',
      radius: 21,
      strength: 1.3,
      durationMs: 240,
    }),
  ],
});

const crescent = definition({
  style: 'crescent',
  accent: '#b4eaff',
  chargeStartMs: 90,
  releaseMs: 350,
  endMs: 1100,
  shots: [shot('light-crescent', 350, 660, 22)],
  hits: [
    hit('crescent-split', 660, {
      shotId: 'light-crescent',
      radius: 24,
      strength: 1.12,
      durationMs: 240,
    }),
  ],
});

const eruption = definition({
  style: 'eruption',
  accent: '#ff9d54',
  origin: { x: 16, y: 3 },
  target: eruptionTarget,
  chargeStartMs: 120,
  releaseMs: 660,
  endMs: 1770,
  shots: [],
  hits: [
    hit('earth-burst-1', 740, {
      point: { x: eruptionTarget.x, y: -22 },
      radius: 14,
      strength: 0.55,
      reaction: 'rising',
      durationMs: 180,
    }),
    hit('earth-burst-2', 960, {
      point: { x: eruptionTarget.x, y: -35 },
      radius: 21,
      strength: 0.9,
      reaction: 'rising',
      durationMs: 200,
    }),
    hit('earth-burst-3', 1200, {
      point: { x: eruptionTarget.x, y: -42 },
      radius: 29,
      strength: 1.45,
      reaction: 'rising',
      durationMs: 280,
    }),
  ],
});

const orbitShots = [
  shot('orbit-high', 980, 1320, 8, {
    from: { x: 4, y: -77 },
    curveY: -14,
    travelCurve: 'ease-in',
  }),
  shot('orbit-rear', 1160, 1510, 8, {
    from: { x: -22, y: -52 },
    curveY: -28,
    travelCurve: 'ease-in',
  }),
  shot('orbit-front', 1320, 1700, 8, {
    from: { x: 43, y: -66 },
    curveY: -10,
    travelCurve: 'ease-in',
  }),
  shot('orbit-low', 1480, 1890, 9, {
    from: { x: 55, y: -25 },
    curveY: 11,
    travelCurve: 'ease-in',
  }),
];

const orbit = definition({
  style: 'orbit',
  accent: '#bc9dff',
  chargeStartMs: 120,
  releaseMs: 900,
  endMs: 2400,
  shots: orbitShots,
  hits: orbitShots.map((item, index) =>
    hit(`orbit-impact-${index + 1}`, item.arriveMs, {
      shotId: item.id,
      radius: index === 3 ? 19 : 14,
      strength: index === 3 ? 1.25 : 0.68,
      durationMs: index === 3 ? 260 : 180,
    }),
  ),
});

export const kiMotions: readonly KiMotion[] = [
  {
    id: 'ki-tiger',
    title: '호격권',
    variant: {
      groupId: 'ki-tiger',
      groupTitle: '호격권',
      label: '대상에 호랑이 형상',
    },
    summary:
      '허리를 틀어 짧게 전진하는 강한 훅 뒤 주먹 가까이에서 호랑이의 압력이 세 박자로 몰아친다.',
    priority: 'review',
    ki: tigerManifest,
    review:
      '기존 같은 방향의 훅 장전·스미어·닫힌 주먹을 빠른 전진과 연결한다. 주먹 앞35px의 중근거리 표적에 호랑이가 현현하며 첫 압력은 주먹을 뻗은30ms 뒤에 닿는다. 세 압력만 명중으로 세고 몸의 접촉은 추가하지 않는다.',
    steps: tigerPunchPoses(tigerManifest.endMs),
  },
  {
    id: 'ki-tiger-wave',
    title: '호격권',
    variant: {
      groupId: 'ki-tiger',
      groupTitle: '호격권',
      label: '호랑이 선두 파동',
    },
    summary:
      '강하게 뻗은 훅에 연결된 호랑이 기공이 짧은 거리를 단숨에 밀어붙인다.',
    priority: 'review',
    ki: tigerWave,
    review:
      '대상 현현과 같은 강한 훅에서 금빛 기운을 주먹 앞35px까지75ms에 밀어낸다. 선두가545ms에 도착할 때 한 번만 명중하며 유지되는 금빛 핵과 붉은 잔류선에는 추가 타격이 없다. 몸 접촉은 추가하지 않는다.',
    steps: tigerPunchPoses(tigerWave.endMs),
  },
  {
    id: 'ki-orb',
    title: '권기탄',
    summary:
      '주먹 앞에서 빠르게 압축한 기공핵을 한 발 쏘아 날카롭게 파열시킨다.',
    priority: 'recommended',
    ki: orb,
    review:
      '짧은 응축 뒤 한 발이 분리되는 빠른 단발 기공이다. 몸의 정권은 방출 자세만 맡고 접촉을 발생시키지 않으며 기공핵이620ms에 도착한 순간만 한 타로 센다. 초기 명칭은 권기탄이며 특정 원작 기술을 재현한 것은 아니다.',
    steps: poses(orb.endMs, [
      guard(0),
      { ...punch(100, 11, '손 앞의 기공핵 응축'), emphasis: 'charge' },
      punch(300, 11, '빠른 압축 · 방출 직전'),
      punch(340, 12, '권기탄 발사'),
      punch(430, 13, '기공탄 비행 · 팔 회수'),
      punch(560, 15, '명중 준비 · 가드 올리기'),
      guard(800, '파열 뒤 가드 복귀'),
    ]),
  },
  {
    id: 'ki-beam',
    title: '파동포',
    summary:
      '양손에 압축한 핵에서 갈라지는 빔을 쏟고, 손에서 분리된 후단을 앞으로 보내며 반동을 거둔다.',
    priority: 'review',
    ki: beam,
    review:
      '전용 준비·발사 유지·반동의 세 그림을 사용한다. 선두광이 대상에 도달한 뒤 네 번의 압력 타격을 발생시키며 몸 자세와 끝 잔광에는 접촉을 붙이지 않는다. 보류한 양손 밀어치기를 사용하지 않는다.',
    steps: poses(beam.endMs, [
      guard(0),
      {
        atMs: 120,
        motion: 'presentation-ki-beam-poses-south-east',
        frame: 0,
        phase: '양손에 파동핵 장전',
        emphasis: 'charge',
      },
      {
        atMs: 900,
        motion: 'presentation-ki-beam-poses-south-east',
        frame: 1,
        phase: '파동포 방출 · 압력 유지',
      },
      {
        atMs: 1700,
        motion: 'presentation-ki-beam-poses-south-east',
        frame: 2,
        phase: '포구 분리 · 발사 반동',
      },
      guard(1880, '파동포 뒤 가드 복귀'),
    ]),
  },
  {
    id: 'ki-crescent',
    title: '광파참',
    summary:
      '팔의 짧은 휘두름에서 얇은 초승달 기공면을 떼어 날리고 절단 방향으로 흩뜨린다.',
    priority: 'recommended',
    ki: crescent,
    review:
      '크게 감아치는 훅의 짧은 준비·휘두름에 전용 초승달 그림을 연결한다. 열린 기공면의 밝은 날과 깨진 후면이 다르게 변하고 도착 뒤 두 갈래의 긴 파편으로 흩어진다. 초승달이660ms에 도착할 때만 한 번 명중한다.',
    steps: poses(crescent.endMs, [
      guard(0),
      {
        atMs: 90,
        motion: 'smear-hook-stable-south-east',
        frame: 2,
        phase: '팔을 당겨 초승달 장전',
        emphasis: 'charge',
      },
      {
        atMs: 310,
        motion: 'smear-hook-stable-south-east',
        frame: 3,
        phase: '짧은 휘두름 궤적',
      },
      {
        atMs: 350,
        motion: 'smear-hook-stable-south-east',
        frame: 4,
        phase: '광파참 분리 · 비행',
      },
      {
        atMs: 460,
        motion: 'smear-hook-stable-south-east',
        frame: 6,
        phase: '팔 회수 · 참격 비행',
      },
      {
        atMs: 600,
        motion: 'smear-hook-stable-south-east',
        frame: 7,
        phase: '참격 도달 · 빛 조각 소멸',
      },
      guard(850, '광파참 뒤 가드 복귀'),
    ]),
  },
  {
    id: 'ki-eruption',
    title: '지열파',
    summary:
      '몸을 낮춰 주먹으로 땅을 내리찍고 가까운 대상 아래 작은·중간·큰 분출을 세 번 솟게 한다.',
    priority: 'recommended',
    ki: eruption,
    review:
      '사용자가 비교 GIF의 오른쪽으로 선택한 같은 남동 방향의2차 내려찍기9장을 사용한다. 발 기준99px을 고정하고 원본의 짧은 충격 그림 뒤 지면 주먹을 유지하며 회수한다. 가까운 대상 아래740·960·1200ms에 다시 솟는 세 분출만 명중 판정한다. 바닥을 기어가는 선과 손에서 바닥으로 잇는 선은 표시하지 않는다. 앞 두 분출은 소멸 뒤 다음 크기로 이어지며 마지막에 가장 크게 터진다.',
    steps: poses(eruption.endMs, [
      guard(0),
      {
        atMs: 120,
        motion: 'ground-punch-face-retry-south-east',
        frame: 1,
        anchor: { x: 68, y: 99 },
        phase: '주먹을 들어 지면기 장전',
      },
      {
        atMs: 230,
        motion: 'ground-punch-face-retry-south-east',
        frame: 1,
        anchor: { x: 68, y: 99 },
        phase: '주먹을 높이 들고 무게 싣기',
        emphasis: 'charge',
      },
      {
        atMs: 620,
        motion: 'ground-punch-face-retry-south-east',
        frame: 2,
        anchor: { x: 68, y: 99 },
        phase: '무릎과 허리를 낮추며 내려찍기',
      },
      {
        atMs: 660,
        motion: 'ground-punch-face-retry-south-east',
        frame: 3,
        anchor: { x: 68, y: 99 },
        phase: '닫힌 주먹을 땅에 박기',
      },
      {
        atMs: 710,
        motion: 'ground-punch-face-retry-south-east',
        frame: 4,
        anchor: { x: 68, y: 99 },
        phase: '내려찍기 충격 회수',
      },
      {
        atMs: 780,
        motion: 'ground-punch-face-retry-south-east',
        frame: 5,
        anchor: { x: 68, y: 99 },
        phase: '분출 발동 · 주먹 회수',
      },
      {
        atMs: 1020,
        motion: 'ground-punch-face-retry-south-east',
        frame: 6,
        anchor: { x: 68, y: 99 },
        phase: '작은 분출 뒤 더 큰 두 분출',
      },
      {
        atMs: 1220,
        motion: 'ground-punch-face-retry-south-east',
        frame: 7,
        anchor: { x: 68, y: 99 },
        phase: '주먹을 들고 무릎 펴기',
      },
      {
        atMs: 1440,
        motion: 'ground-punch-face-retry-south-east',
        frame: 8,
        anchor: { x: 68, y: 99 },
        phase: '지열파 뒤 가드 정착',
      },
      guard(1600, '지열파 뒤 가드 복귀'),
    ]),
  },
  {
    id: 'ki-orbit',
    title: '부유기탄',
    summary:
      '다른 높이에 배치한 네 기공구를 하나씩 활성화하고 서로 다른 곡선으로 가속 사출한다.',
    priority: 'recommended',
    ki: orbit,
    review:
      '네 구체의 배치·대기·선택 활성·개별 사출을 구분한다. 공중 준비 위치와 도착 시각은 유지하고 각 탄은 같은 순수 샘플의 가속 곡선으로 날린다. 몸의 주먹에는 접촉이 없으며 각 구체의 실제 도착 한 번씩만 네 타로 센다. 정지 구체·선택 표시·잔광은 타수를 더하지 않는다.',
    steps: poses(orbit.endMs, [
      guard(0),
      { ...punch(120, 11, '네 부유기공 핵 응축'), emphasis: 'charge' },
      punch(900, 0, '부유기탄 대기 · 선택 활성'),
      punch(980, 1, '첫 기공구 사출'),
      punch(1160, 12, '둘째 기공구 사출'),
      punch(1320, 13, '셋째 기공구 사출'),
      punch(1480, 15, '넷째 기공구 사출'),
      guard(1670, '시간차 명중 · 기공구 회수'),
      guard(2200, '부유기탄 뒤 가드 정착'),
    ]),
  },
];
