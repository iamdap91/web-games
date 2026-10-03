export const anomalyDetails = {
  'giant-door': {
    title: '거대해진 철문',
    description: '중앙 철문이 천장 가까이까지 커져 있었다.',
    cue: '중앙 철문에 접근',
    observeX: 743,
  },
  'falling-pipe': {
    title: '연쇄 낙하 배관',
    description: '5번, 2번, 1번 배관이 차례로 내려왔다.',
    cue: '마지막 배관에 접근 · 낙하 중 피격 시 0번 방',
    observeX: 1720,
  },
  'upside-down': {
    title: '거꾸로 된 연구소',
    description: '바닥 위의 설비가 모두 거꾸로 매달려 있었다.',
    cue: '시작 지점부터 배경 확인',
    observeX: 360,
  },
  'red-fluid': {
    title: '붉은 배양액',
    description: '장치에서 붉은 액체가 흘러넘쳤다.',
    cue: '첫 번째 배양 장치에 접근',
    observeX: 600,
  },
  'sealed-exit': {
    title: '막힌 출구',
    description: '오른쪽 출구가 철판으로 막혀 있었다.',
    cue: '오른쪽 끝 문에 접근',
    observeX: 1850,
  },
  'bent-pipes': {
    title: '휘어진 배관',
    description: '천장 배관들이 몸을 향해 휘어졌다.',
    cue: '배관 구간에서 좌우로 이동',
    observeX: 1120,
  },
  'crowded-lab': {
    title: '과밀한 실험실',
    description: '같은 장치들이 벽을 빼곡히 채웠다.',
    cue: '중앙 구간에 접근',
    observeX: 650,
  },
  'following-door': {
    title: '붙어오는 문',
    description: '중앙 철문이 벽을 따라 움직였다.',
    cue: '중앙 철문 근처에서 좌우로 이동',
    observeX: 850,
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
    cue: '중앙 관측창 앞에서 좌우로 이동',
    observeX: 800,
  },
  'late-shadow': {
    title: '늦게 움직이는 그림자',
    description: '멈춘 뒤에도 그림자가 계속 움직였다.',
    cue: '이동하다 멈추기 · 그림자가 0.65초 늦게 따라옴',
    observeX: 360,
  },
  'lingering-echo': {
    title: '남아 있는 잔상',
    description: '사라지지 않은 점프 잔상이 뒤따라왔다.',
    cue: '플래시점프 사용 후 기다리기',
    observeX: 360,
  },
  blackout: {
    title: '순간 소등',
    description: '불이 돌아왔을 때 바로 옆에 거대한 장치가 있었다.',
    cue: '중앙 구간 통과 · 한 번만 발동',
    observeX: 1050,
  },
  'lowering-ceiling': {
    title: '낮아지는 천장',
    description: '안쪽으로 갈수록 천장 설비가 내려왔다.',
    cue: '오른쪽으로 계속 이동',
    observeX: 700,
  },
  'reverse-flow': {
    title: '역류하는 바닥',
    description: '바닥 아래 액체가 걸음과 반대로 흘렀다.',
    cue: '좌우로 이동하며 바닥 아래 확인',
    observeX: 360,
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
  // 부재형 하나만 다른 이상현상의 절반 확률로 배정한다(이상 중 약 1/35).
  let weight = ((roll - 0.3) / 0.7) * (anomalies.length * 2 - 1);
  for (const anomaly of anomalies) {
    weight -= anomaly === 'empty-center' ? 1 : 2;
    if (weight < 0) return anomaly;
  }
  return 'empty-center';
}
