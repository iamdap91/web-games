import type { ComboMotion } from '../../characters/ataho-v2-combos/types.js';

export type Point = { readonly x: number; readonly y: number };
export type FinaleAttackId =
  'punch-se' | 'punch-sw' | 'kick-e' | 'kick-w' | 'uppercut-e' | 'uppercut-w';

export type FinaleAttack = {
  readonly id: FinaleAttackId;
  readonly label: string;
  readonly motion: string;
  readonly frames: readonly number[];
  readonly contactIndex: number;
  readonly contact: Point;
  readonly anchors: readonly Point[];
  readonly scale: number;
};

type AttackMetrics = {
  readonly id: FinaleAttackId;
  readonly label: string;
  readonly motion: string;
  readonly contactIndex: number;
  readonly contact: Point;
  readonly feetY: readonly number[];
  readonly referenceHeight: number;
};

function attack(metrics: AttackMetrics): FinaleAttack {
  return {
    id: metrics.id,
    label: metrics.label,
    motion: metrics.motion,
    frames: metrics.feetY.map((_, index) => index),
    contactIndex: metrics.contactIndex,
    contact: metrics.contact,
    anchors: metrics.feetY.map((y) => ({ x: 48, y })),
    scale: 130 / metrics.referenceHeight,
  };
}

// 기존96px PNG의 pivot x48·알파24 초과 최하단과 실제 손발의 바깥 윤곽을 읽었다.
// 배율은 지상 준비 높이에 맞춘다. 동쪽 어퍼컷은 웅크린0번 대신 펴진2번을 기준으로 삼는다.
export const finaleAttacks: Readonly<Record<FinaleAttackId, FinaleAttack>> = {
  'punch-se': attack({
    id: 'punch-se',
    label: '남동 정권',
    motion: 'cross-punch-south-east',
    contactIndex: 4,
    contact: { x: 73, y: 47 },
    feetY: [78, 78, 78, 78, 78, 78],
    referenceHeight: 56,
  }),
  'punch-sw': attack({
    id: 'punch-sw',
    label: '남서 정권',
    motion: 'cross-punch-south-west',
    contactIndex: 4,
    contact: { x: 22, y: 47 },
    feetY: [78, 78, 78, 78, 78, 78],
    referenceHeight: 56,
  }),
  'kick-e': attack({
    id: 'kick-e',
    label: '동쪽 높은 킥',
    motion: 'high-kick-east',
    contactIndex: 4,
    contact: { x: 66, y: 45 },
    feetY: [74, 74, 77, 81, 81, 81, 76],
    referenceHeight: 53,
  }),
  'kick-w': attack({
    id: 'kick-w',
    label: '서쪽 높은 킥',
    motion: 'high-kick-west',
    contactIndex: 4,
    contact: { x: 29, y: 45 },
    feetY: [74, 74, 77, 81, 81, 81, 76],
    referenceHeight: 53,
  }),
  'uppercut-e': attack({
    id: 'uppercut-e',
    label: '동쪽 어퍼컷',
    motion: 'surprise-uppercut-east',
    contactIndex: 3,
    contact: { x: 62, y: 28 },
    feetY: [79, 81, 81, 81, 81, 80, 79],
    referenceHeight: 60,
  }),
  'uppercut-w': attack({
    id: 'uppercut-w',
    label: '서쪽 어퍼컷',
    motion: 'surprise-uppercut-west',
    contactIndex: 3,
    contact: { x: 31, y: 27 },
    feetY: [79, 79, 81, 80, 80, 80, 78],
    referenceHeight: 56,
  }),
};

export const finaleGuard = {
  pose: { motion: 'presentation-martial-stomp-load-south-east', frame: 1 },
  anchor: { x: 44, y: 75 },
  scale: 2.9,
} as const;

// 로더에 필요한 기존 그림만 열거하며 접촉·피해 사건은 추가하지 않는다.
export const finaleMotions: readonly ComboMotion[] = [
  ...Object.values(finaleAttacks).map((profile): ComboMotion => ({
    id: profile.id,
    title: profile.label,
    summary: '지상 포위·교차 피날레에서 재사용하는 기존 공격 원본',
    review:
      '같은 방향 클립을 원본 순서대로 로딩하며 컷씬의 시각 연출에만 사용한다.',
    priority: 'review',
    steps: profile.frames.map((frame) => ({
      motion: profile.motion,
      frame,
      anchor: 'feet',
      x: 0,
      y: 0,
      durationMs: 40,
      phase: profile.label,
    })),
  })),
  {
    id: 'finale-prelaunch-guard',
    title: '지상 암전 전 가드',
    summary: '도약 없이 먹빛으로 전환하는 기존 지상 준비 그림',
    review: '기존 진각 발 들기 원본1번만 재사용한다.',
    priority: 'review',
    steps: [
      {
        ...finaleGuard.pose,
        anchor: 'feet',
        x: 0,
        y: 0,
        durationMs: 40,
        phase: '지상 암전 전 가드',
      },
    ],
  },
];

export function finalePose(
  attackId: FinaleAttackId,
  index: number,
): {
  readonly pose: { readonly motion: string; readonly frame: number };
  readonly anchor: Point;
  readonly scale: number;
} {
  const profile = finaleAttacks[attackId];
  const frame = profile.frames[index];
  const anchor = profile.anchors[index];
  if (!Number.isInteger(index) || frame === undefined || !anchor)
    throw new Error(`지상 피날레의 원본 자세가 없습니다: ${attackId}:${index}`);
  return {
    pose: { motion: profile.motion, frame },
    anchor,
    scale: profile.scale,
  };
}
