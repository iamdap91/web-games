import { label, stage } from './drawing.js';
import { battleImpact, drawBattleActors } from './battle.js';
import type { Context, Frame, Sample } from './types.js';
import { drawLightEffects } from './effects-light.js';
import { drawCircusScene, drawFlightEffects } from './effects-flight.js';
import { drawExplosionEffects } from './effects-explosions.js';

export const effectSamples: readonly Sample[] = [
  {
    id: 'fx-kanada-light',
    name: '카나다 빛',
    category: 'effects',
    previewMs: 1930,
    description:
      '단단한 십자와 부드러운 브러시 링을 나눠, 접촉 순간의 빛이 여운으로 번지는 견본입니다.',
    distinction: '십자의 짧은 노출과 링의 넓은 농도 차이를 비교합니다.',
  },
  {
    id: 'fx-kanada-beam',
    name: '카나다 빔',
    category: 'effects',
    previewMs: 2570,
    beats: [
      { timeMs: 2570, label: 'S축과 전진 외피' },
      { timeMs: 3220, label: '후단 이탈' },
      { timeMs: 3740, label: '앞으로 빠지는 빔' },
    ],
    description:
      '정권에서 방출한 광선의 S축을 따라 각진 외피와 빈틈이 전진하고, 종료 때 후단이 손을 떠나 앞쪽으로 빠지는 견본입니다. 원작 동작 재현은 미검증입니다.',
    distinction:
      '직선 위 두께 변화와 달리 중심선·선두 방향·실루엣이 함께 바뀝니다.',
  },
  {
    id: 'fx-kanada-explosion',
    name: '카나다 폭발',
    category: 'effects',
    previewMs: 2110,
    description:
      '압축 핵·창·방사형·갈고리·갈라진 불꽃을 서로 다른 길이의 셀로 바꾸는 해석 견본입니다. 원작 동작 재현은 미검증입니다.',
    distinction:
      '같은 별모양 확대 대신 짧은 돌출과 긴 유지, 수축과 재확대, 형태 교체를 비교합니다.',
  },
  {
    id: 'fx-kanada-dragon',
    name: '카나다 드래곤',
    category: 'effects',
    previewMs: 2870,
    description:
      '정권에서 수평으로 출발한 용의 머리가 경로의 접선으로 기울고, 리본 몸통의 두께와 불꽃 혀가 셀마다 바뀌는 화염 견본입니다.',
    distinction:
      '고정된 용 그림 이동 대신 머리 방향·몸통 외곽·작은 화염이 함께 변합니다.',
  },
  {
    id: 'fx-itano',
    name: '이타노 서커스',
    category: 'effects',
    previewMs: 1260,
    beats: [
      { timeMs: 1260, label: '깊이가 다른 추격' },
      { timeMs: 1770, label: '빗나간 탄의 관성' },
      { timeMs: 2220, label: '탄별 이탈' },
    ],
    description:
      '곰왕의 두 번 회피를 다른 시각·깊이에서 쫓는 탄과 굽은 연기 꼬리, 지연 추적 카메라의 견본입니다.',
    distinction:
      '회피 전 위치를 놓친 탄이 앞뒤로 지나가 각자 화면을 벗어나며 연기 꼬리는 늦게 부풀어 흩어집니다.',
  },
  {
    id: 'fx-muraki',
    name: '무라키 서커스',
    category: 'effects',
    previewMs: 1450,
    beats: [
      { timeMs: 1040, label: '후속탄 재추진' },
      { timeMs: 1880, label: '빗나간 탄의 관성' },
      { timeMs: 2480, label: '탄별 이탈' },
    ],
    description:
      '선행탄과 잠깐 정체한 뒤 추진하는 후속탄을 나눠, 회피와 연기 꼬리의 박자를 비교하는 견본입니다.',
    distinction:
      '선행·정체·재추진을 비동기로 배치하고, 빗나간 탄이 각자의 진행 방향과 수명으로 떠납니다.',
  },
  {
    id: 'fx-anno',
    name: '안노 폭발',
    category: 'effects',
    previewMs: 2760,
    description:
      '좁은 접촉점에서 분진 기둥이 치솟고, 거친 점묘·밑동 구름·검은 잔해가 분리되는 견본입니다.',
    distinction:
      '깨끗한 원 입자 대신 분진 내부의 스패터와 외곽 비산, 뒤늦은 연기 머리를 나눕니다.',
  },
  {
    id: 'fx-iso-explosion',
    name: '이소 폭발',
    category: 'effects',
    previewMs: 2800,
    description:
      '불규칙한 연기 외곽과 Y자·삼각형 암부가 다른 속도로 말리며 부피를 만드는 견본입니다.',
    distinction: '외곽의 팽창과 내부 음영의 회전이 따로 움직입니다.',
  },
  {
    id: 'fx-iso-debris',
    name: '이소 파편',
    category: 'effects',
    previewMs: 2230,
    description:
      '잔 파편을 네 덩어리의 단색 실루엣으로 묶고, 바깥 조각부터 떨어져 나오는 견본입니다.',
    distinction:
      '처음부터 흩어진 독립 입자 대신 붙은 외곽·공통 탄도·뒤늦은 벌어짐을 비교합니다.',
  },
  {
    id: 'fx-nakamura',
    name: '나카무라 큐브',
    category: 'effects',
    previewMs: 2420,
    description:
      '접촉점의 석재 판이 큰 입방 조각과 작은 잔여로 깨지고, 게임의 현무암 면을 유지한 채 세 축으로 도는 견본입니다.',
    distinction:
      '고정 면색의 평면 회전 대신 실제 꼭짓점 회전과 원근, 큰 파편·작은 파편의 시차를 비교합니다.',
  },
  {
    id: 'fx-hashimoto',
    name: '하시모토 스팀·폭발',
    category: 'effects',
    previewMs: 2440,
    description:
      '눌린 김이 여러 높이의 둥근 층으로 솟고 검은 조각은 별도 탄도로 튀는 스팀 견본입니다.',
    distinction: '김의 압축·상승·말림과 단단한 파편의 빠른 비산을 나눕니다.',
  },
  {
    id: 'fx-norio',
    name: '노리오 연기',
    category: 'effects',
    previewMs: 2560,
    description:
      '같은 면색의 먼지가 눌려 태어나고, 겹친 외곽이 말리다 작은 덩어리로 갈라지는 견본입니다.',
    distinction:
      '내부 음영이나 하이라이트 없이 외곽과 겹침의 변화만으로 연기를 읽힙니다.',
  },
  {
    id: 'fx-mori',
    name: '모리 이펙트·파편',
    category: 'effects',
    previewMs: 2150,
    description:
      '길쭉하고 거친 파편의 외형과 굵은 내부 획을 셀마다 바꾸며 쏟아내는 견본입니다.',
    distinction:
      '고정 도형의 회전 대신 돌출부·굽은 획·짧은 유지가 함께 바뀝니다.',
  },
  {
    id: 'fx-araki',
    name: '아라키 이펙트',
    category: 'effects',
    previewMs: 1920,
    description:
      '교차 광선과 작은 빛 거품을 권격 접촉에 옮긴 해석입니다. 검 연출이나 작가 고유 동작의 재현은 미검증입니다.',
    distinction:
      '같은 어퍼컷 접촉점에서 광선이 교차하고 둥근 빛 잔여가 늦게 남습니다.',
  },
  {
    id: 'fx-yoshinari',
    name: '요시나리 폭발',
    category: 'effects',
    previewMs: 2384,
    description:
      '큰 불덩어리 안에서 ゝ 모양 터치가 각자 태어나 말리고 떠오르는 데포르메 폭발 견본입니다.',
    distinction:
      '한 덩어리에 붙은 고정 무늬 대신 터치마다 발생·회전·축소 시점을 다르게 둡니다.',
  },
  {
    id: 'fx-oki',
    name: '오키 폭발',
    category: 'effects',
    previewMs: 2648,
    description:
      '크기가 다른 거품이 접촉점부터 순서대로 부풀어 오르고, 외곽으로 떠올라 쪼그라드는 폭발 견본입니다.',
    distinction:
      '같은 자리의 반복 점멸 대신 거품마다 한 번의 발생·팽창·상승·소멸을 보여 줍니다.',
  },
  {
    id: 'fx-kozuma',
    name: '코즈마 이펙트',
    category: 'effects',
    previewMs: 3110,
    beats: [
      { timeMs: 2730, label: '점성 목의 압축' },
      { timeMs: 3000, label: '연결부 분리' },
      { timeMs: 3150, label: '연결부에서 태어난 잔여' },
    ],
    description:
      '정권의 접촉점에서 수평으로 짧고 끈적하게 늘다가 목이 가늘어지고, 큰 덩어리가 갑자기 빠져나가는 점성 견본입니다.',
    distinction:
      '붙어 버티는 시간과 떨어져 나가는 속도를 대비하고, 잔여 조각은 분리 직전 연결부의 위치를 이어받습니다.',
  },
  {
    id: 'fx-tatsuzo',
    name: '타츠조 이펙트',
    category: 'effects',
    previewMs: 2670,
    description:
      '검정 단색의 둥근 덩어리가 부드러운 목으로 합쳐졌다가 떨어지고, 다시 모이며 사라지는 견본입니다.',
    distinction:
      '외곽을 한 번 흔드는 대신 연결부 굵기·구체의 눌림·합체와 분리를 함께 바꿉니다.',
  },
  {
    id: 'fx-shigeta',
    name: '시게타 불꽃',
    category: 'effects',
    previewMs: 2000,
    description:
      '기계 전투 스파크의 모티프를 권격 접촉에 옮긴 해석입니다. 실제 금속 파괴와 작가 고유 동작 재현은 포함하지 않습니다.',
    distinction: '짧은 가지형 파열 뒤 발광 조각이 갈라져 날며 식어 사라집니다.',
  },
  {
    id: 'fx-anime-r',
    name: '아니메R의 사라지는 파편',
    category: 'effects',
    previewMs: 2650,
    description:
      '큰 잔해가 날던 자리에서 작은 조각이 갈라져 같은 속도를 이어받고, 다시 잔편이 되어 사라지는 견본입니다.',
    distinction:
      '부모와 자식의 출발 위치·탄도·재질을 이어 갑작스러운 교체나 전체 알파 소멸을 줄입니다.',
  },
  {
    id: 'fx-kutsuna',
    name: '쿠츠나 번개',
    category: 'effects',
    previewMs: 2420,
    description:
      '정권에서 수평으로 방출한 여섯 전류의 머리와 꼬리가 따로 진행하고, 고리·꺾임·잔가지가 굽고 풀리는 곡선 번개 견본입니다.',
    distinction:
      '평행한 사인파 다발 대신 각 줄의 경로·발생·수명과 흐름이 독립적으로 변합니다.',
  },
];

type Placement = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly emphasis: number;
  readonly rotation?: number;
};
const placements: Readonly<Record<string, Placement>> = {
  'fx-kanada-light': { x: 549, y: 266, scale: 0.72, emphasis: 1.2 },
  'fx-kanada-beam': {
    x: 267,
    y: 300,
    scale: 0.34,
    emphasis: 1.34,
    rotation: 0,
  },
  'fx-kanada-explosion': { x: 550, y: 334, scale: 0.63, emphasis: 1.18 },
  'fx-kanada-dragon': {
    x: 292,
    y: 269,
    scale: 0.38,
    emphasis: 1.28,
    rotation: 0,
  },
  'fx-anno': { x: 546, y: 407, scale: 0.68, emphasis: 1.06 },
  'fx-iso-explosion': { x: 548, y: 352, scale: 0.66, emphasis: 1.22 },
  'fx-iso-debris': { x: 550, y: 390, scale: 0.8, emphasis: 1.13 },
  'fx-nakamura': { x: 551, y: 389, scale: 0.8, emphasis: 1.08 },
  'fx-hashimoto': { x: 548, y: 387, scale: 0.64, emphasis: 1.2 },
  'fx-norio': { x: 548, y: 372, scale: 0.64, emphasis: 1.23 },
  'fx-mori': { x: 410, y: 310, scale: 0.65, emphasis: 1.12, rotation: -0.8 },
  'fx-araki': { x: 503, y: 277, scale: 0.58, emphasis: 1.27 },
  'fx-yoshinari': { x: 548, y: 325, scale: 0.68, emphasis: 1.15 },
  'fx-oki': { x: 550, y: 330, scale: 0.65, emphasis: 1.2 },
  'fx-kozuma': { x: 285, y: 300, scale: 0.36, emphasis: 1.38, rotation: 0 },
  'fx-tatsuzo': { x: 551, y: 284, scale: 0.58, emphasis: 1.4 },
  'fx-shigeta': { x: 548, y: 300, scale: 0.75, emphasis: 1.1 },
  'fx-anime-r': { x: 548, y: 371, scale: 0.8, emphasis: 1.15 },
  'fx-kutsuna': { x: 296, y: 288, scale: 0.37, emphasis: 1.32, rotation: 0 },
};

export function drawEffects(ctx: Context, id: string, frame: Frame): void {
  ctx.save();
  try {
    if (drawCircusScene(ctx, id, frame)) return;
    // 일반 FX는 공유 접촉을, 서커스는 위 전용 합성에서 회피와 깊이를 소유한다.
    stage(ctx, frame, 0);
    drawBattleActors(ctx, frame);
    const placement = placements[id];
    if (!placement) return;
    let drawn = false;
    ctx.save();
    try {
      const impact = battleImpact(frame);
      ctx.translate(impact.x, impact.y);
      ctx.rotate(placement.rotation ?? 0);
      const motionScale = frame.reducedMotion ? 0.75 : 1;
      // 기법별 점유 공간만 넓히고 기본 비교판과 움직임 줄이기의 크기는 보존한다.
      const emphasis =
        frame.enhanced && !frame.reducedMotion ? placement.emphasis : 1;
      const scale = placement.scale * 1.3 * motionScale * emphasis;
      ctx.scale(scale, scale);
      ctx.translate(-placement.x, -placement.y);
      drawn =
        drawLightEffects(ctx, id, frame) ||
        drawFlightEffects(ctx, id, frame) ||
        drawExplosionEffects(ctx, id, frame);
    } finally {
      ctx.restore();
    }
    if (!drawn) label(ctx, '이 효과의 견본을 찾을 수 없습니다.');
  } finally {
    ctx.restore();
  }
}
