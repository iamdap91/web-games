export const anomalyDetails = {
  'falling-pipe': {
    title: '연쇄 낙하 배관',
    description: '5번, 2번, 1번 배관이 차례로 내려왔다.',
    cue: '마지막 배관에 접근 · 낙하 중 피격 시 0번 방',
    observeX: 1720,
  },
  'mirrored-lab': {
    title: '뒤집힌 연구소',
    description: '연구소의 좌우가 뒤집히고 출발했던 문이 반대편에 나타났다.',
    cue: '중앙으로 접근 · 좌우 반전 후 돌아갈 방향 선택',
    observeX: 900,
  },
  'creeping-machine': {
    title: '다가오는 기계',
    description: '등을 돌릴 때마다 기계가 가까워졌다.',
    cue: '중앙에 접근한 뒤 기계를 등지고 기다리기',
    observeX: 850,
  },
  'watching-eye': {
    title: '창 안의 거대한 눈',
    description: '관측창 안의 눈이 움직임을 따라왔다.',
    cue: '중앙 창에 접근 · 눈이 뜨인 뒤 더 다가가기',
    observeX: 800,
  },
  blackout: {
    title: '순간 소등',
    description: '철문 안에 있던 기계가 불이 돌아오자 바로 앞에 서 있었다.',
    cue: '열린 철문 안의 장치를 보고 접근 · 한 번만 소등',
    observeX: 1160,
  },
  'lowering-ceiling': {
    title: '낮아지는 천장',
    description: '더 들어가자 천장이 내려앉아 몸이 납작해졌다.',
    cue: '천장이 낮아진 뒤 더 전진 · 급강하에 찌부된 뒤 0번 방',
    observeX: 700,
  },
  'frame-escape': {
    title: '화면 밖으로',
    description: '화면 밖에서 돌아오자 경계가 좁혀 오며 뒤를 쫓았다.',
    cue: '경계가 줄면 왼쪽으로 돌아가 추격 시작 · 밖에 나갔다면 떨릴 때 복귀',
    observeX: 2100,
  },
  'folding-stage': {
    title: '연구소의 뒷면',
    description: '벽 뒤의 문틈 너머에 방금 출발한 입구가 있었다.',
    cue: '오른쪽 문에 접근 · 왼쪽으로 돌아와 입구 쪽 벽과 문틈 확인',
    observeX: 950,
  },
  'room-invasion': {
    title: '다른 방의 침범',
    description: '철문 너머 저택의 바닥과 가구가 연구소로 밀려 나왔다.',
    cue: '중앙 철문에 접근 · 문이 열린 뒤 더 다가가기',
    observeX: 800,
  },
  'empty-center': {
    title: '텅 빈 중앙',
    description: '중앙 철문이 통째로 사라졌다.',
    cue: '중앙 철문 자리 확인 · 드물게 출현',
    observeX: 850,
  },
} as const;

export type Anomaly = keyof typeof anomalyDetails;
export type Scenario = 'normal' | Anomaly;
export type ScenarioSelection = 'random' | Scenario;
export const anomalies: readonly Anomaly[] = Object.keys(
  anomalyDetails,
) as Anomaly[];

export function isSelection(value: string): value is ScenarioSelection {
  return (
    value === 'normal' ||
    value === 'random' ||
    Object.hasOwn(anomalyDetails, value)
  );
}

export function chooseScenario(roll: number): Scenario {
  if (roll < 0.3) return 'normal';
  // 콘텐츠 수가 줄어도 부재형의 희귀도는 그대로 유지한다.
  const anomalyRoll = (roll - 0.3) / 0.7;
  if (anomalyRoll >= 34 / 35) return 'empty-center';
  const regular = anomalies.filter((id) => id !== 'empty-center');
  return regular[
    Math.min(
      regular.length - 1,
      Math.floor((anomalyRoll / (34 / 35)) * regular.length),
    )
  ]!;
}
