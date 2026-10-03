export const anomalyDetails = {
  'falling-pipe': {
    title: '연쇄 낙하 배관',
    description: '5번, 2번, 1번 배관이 차례로 내려왔다.',
    cue: '마지막 배관에 접근 · 낙하 중 피격 시 0번 방',
    observeX: 1720,
  },
  'mirrored-lab': {
    title: '뒤집힌 연구소',
    description: '천장에 착지한 뒤 더 움직이자 좌우까지 뒤집혔다.',
    cue: '중앙에서 상하 반전 · 이후 조금 더 이동하면 좌우 반전',
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
    cue: '내려오는 천장 아래 관측창 중앙에 접근 · 찌부된 뒤 0번 방',
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
    title: '문에 끼어 있는 침입자',
    description: '작은 문틈의 손가락 뒤로 긴 팔과 몸이 튀어나왔다.',
    cue: '작은 문틈에 손가락이 보이면 접근 · 손이 먼저 돌출 · 잡히면 0번 방',
    observeX: 1000,
  },
  'room-guillotine': {
    title: '공간 절단',
    description: '칼날이 내려올 때마다 연구소가 조각째 떨어져 나갔다.',
    cue: '오른쪽으로 진행 · 칼날이 보이면 왼쪽 문까지 플래시점프로 탈출',
    observeX: 1280,
  },
  'time-rewind': {
    title: '리와인드',
    description: '점프와 잔상까지 방금 움직였던 궤적을 거꾸로 되짚었다.',
    cue: '오른쪽으로 진행하면 첫 되감기 · 이후 조작 2.8초마다 최근 1.6초를 2.5배속 역재생',
    observeX: 1500,
  },
  'escaping-exit': {
    title: '도망가는 출구',
    description: '오른쪽 문이 달아났다. 돌아가려 하자 왼쪽 문까지 도망갔다.',
    cue: '오른쪽 문에 접근하면 먼저 도주 · 돌아와 왼쪽 문에 접근 · 연속 플래시점프로 귀로의 문 잡기',
    observeX: 2010,
  },
  'select-delete': {
    title: '전체 선택 → 삭제',
    description: '파랗게 선택된 연구소와 그 안에 남은 것들이 한 번에 지워졌다.',
    cue: '중앙에 접근 · 선택 영역이 멈춘 뒤 삭제 · 파란 영역에서 왼쪽으로 탈출',
    observeX: 1100,
  },
  'loading-wheel': {
    title: '로딩 중',
    description: '끝나지 않는 로딩 표시가 방과 몸을 빨아들이기 시작했다.',
    cue: '입장 즉시 로딩 표시 · 3.2초 뒤 흡수 시작 · 왼쪽으로 탈출, 빨려들면 0번 방',
    observeX: 0,
  },
  'empty-center': {
    title: '텅 빈 중앙',
    description: '중앙 관측창이 통째로 사라졌다.',
    cue: '중앙 관측창 자리 확인 · 드물게 출현',
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
