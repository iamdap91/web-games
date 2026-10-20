import { label, stage } from './drawing.js';
import { drawBattleActors } from './battle.js';
import { drawCircusScene } from './effects-flight.js';
import { drawEffectLayer } from './effect-layer.js';
export const effectSamples = [
    {
        id: 'fx-kanada-light',
        name: '카나다 빛',
        category: 'effects',
        previewMs: 1930,
        description: '굵은 접촉 핵이 짧게 터지고, 큰 빛무리가 어퍼컷 방향으로 뻗은 뒤 작은 잔광이 빠르게 걷힙니다.',
        distinction: '큰 전진 빛과 작은 반동·잔광의 크기와 수명을 달리해 힘의 방향을 읽힙니다.',
        beats: [
            { timeMs: 1835, label: '접촉 · 빛무리 핵' },
            { timeMs: 1930, label: '파열 · 어퍼컷 방향' },
            { timeMs: 2110, label: '짧은 잔광' },
            { timeMs: 2320, label: '소멸' },
        ],
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
        description: '정권에서 방출한 광선의 S축을 따라 각진 외피와 빈틈이 전진하고, 종료 때 후단이 손을 떠나 앞쪽으로 빠지는 견본입니다. 원작 동작 재현은 미검증입니다.',
        distinction: '직선 위 두께 변화와 달리 중심선·선두 방향·실루엣이 함께 바뀝니다.',
    },
    {
        id: 'fx-kanada-explosion',
        name: '카나다 폭발',
        category: 'effects',
        previewMs: 1920,
        description: '압축 핵·창·방사형·갈고리·갈라진 불꽃을 서로 다른 길이의 셀로 바꾸는 해석 견본입니다. 원작 동작 재현은 미검증입니다.',
        distinction: '같은 별모양 확대 대신 짧은 돌출과 긴 유지, 수축과 재확대, 형태 교체를 비교합니다.',
        beats: [
            { timeMs: 1810, label: '압축 핵' },
            { timeMs: 1860, label: '창' },
            { timeMs: 1920, label: '방사형' },
            { timeMs: 1980, label: '갈고리' },
            { timeMs: 2040, label: '세 갈래' },
            { timeMs: 2480, label: '분열 불꽃' },
            { timeMs: 3160, label: '소멸' },
        ],
    },
    {
        id: 'fx-kanada-dragon',
        name: '카나다 드래곤',
        category: 'effects',
        previewMs: 2870,
        description: '정권에서 수평으로 출발한 용의 머리가 경로의 접선으로 기울고, 리본 몸통의 두께와 불꽃 혀가 셀마다 바뀌는 화염 견본입니다.',
        distinction: '고정된 용 그림 이동 대신 머리 방향·몸통 외곽·작은 화염이 함께 변합니다.',
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
        description: '곰왕의 두 번 회피를 다른 시각·깊이에서 쫓는 탄과 굽은 연기 꼬리, 지연 추적 카메라의 견본입니다.',
        distinction: '회피 전 위치를 놓친 탄이 앞뒤로 지나가 각자 화면을 벗어나며 연기 꼬리는 늦게 부풀어 흩어집니다.',
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
        description: '선행탄과 잠깐 정체한 뒤 추진하는 후속탄을 나눠, 회피와 연기 꼬리의 박자를 비교하는 견본입니다.',
        distinction: '선행·정체·재추진을 비동기로 배치하고, 빗나간 탄이 각자의 진행 방향과 수명으로 떠납니다.',
    },
    {
        id: 'fx-anno',
        name: '안노 폭발',
        category: 'effects',
        previewMs: 2760,
        description: '좁은 접촉점에서 분진 기둥이 치솟고, 거친 점묘·밑동 구름·검은 잔해가 분리되는 견본입니다.',
        distinction: '깨끗한 원 입자 대신 분진 내부의 스패터와 외곽 비산, 뒤늦은 연기 머리를 나눕니다.',
    },
    {
        id: 'fx-iso-explosion',
        name: '이소 폭발',
        category: 'effects',
        previewMs: 2800,
        description: '불규칙한 연기 외곽과 Y자·삼각형 암부가 다른 속도로 말리며 부피를 만드는 견본입니다.',
        distinction: '외곽의 팽창과 내부 음영의 회전이 따로 움직입니다.',
    },
    {
        id: 'fx-iso-debris',
        name: '이소 파편',
        category: 'effects',
        previewMs: 2230,
        description: '잔 파편을 네 덩어리의 단색 실루엣으로 묶고, 바깥 조각부터 떨어져 나오는 견본입니다.',
        distinction: '처음부터 흩어진 독립 입자 대신 붙은 외곽·공통 탄도·뒤늦은 벌어짐을 비교합니다.',
    },
    {
        id: 'fx-nakamura',
        name: '나카무라 큐브',
        category: 'effects',
        previewMs: 2420,
        description: '접촉점의 석재 판이 큰 입방 조각과 작은 잔여로 깨지고, 게임의 현무암 면을 유지한 채 세 축으로 도는 견본입니다.',
        distinction: '고정 면색의 평면 회전 대신 실제 꼭짓점 회전과 원근, 큰 파편·작은 파편의 시차를 비교합니다.',
    },
    {
        id: 'fx-hashimoto',
        name: '하시모토 스팀·폭발',
        category: 'effects',
        previewMs: 2440,
        description: '눌린 김이 여러 높이의 둥근 층으로 솟고 검은 조각은 별도 탄도로 튀는 스팀 견본입니다.',
        distinction: '김의 압축·상승·말림과 단단한 파편의 빠른 비산을 나눕니다.',
    },
    {
        id: 'fx-norio',
        name: '노리오 연기',
        category: 'effects',
        previewMs: 2560,
        description: '같은 면색의 먼지가 눌려 태어나고, 겹친 외곽이 말리다 작은 덩어리로 갈라지는 견본입니다.',
        distinction: '내부 음영이나 하이라이트 없이 외곽과 겹침의 변화만으로 연기를 읽힙니다.',
    },
    {
        id: 'fx-mori',
        name: '모리 이펙트·파편',
        category: 'effects',
        previewMs: 2150,
        description: '길쭉하고 거친 파편의 외형과 굵은 내부 획을 셀마다 바꾸며 쏟아내는 견본입니다.',
        distinction: '고정 도형의 회전 대신 돌출부·굽은 획·짧은 유지가 함께 바뀝니다.',
    },
    {
        id: 'fx-araki',
        name: '아라키 이펙트',
        category: 'effects',
        previewMs: 1920,
        description: '교차 광선과 작은 빛 거품을 권격 접촉에 옮긴 해석입니다. 검 연출이나 작가 고유 동작의 재현은 미검증입니다.',
        distinction: '같은 어퍼컷 접촉점에서 광선이 교차하고 둥근 빛 잔여가 늦게 남습니다.',
    },
    {
        id: 'fx-yoshinari',
        name: '요시나리 폭발',
        category: 'effects',
        previewMs: 2384,
        description: '큰 불덩어리 안에서 ゝ 모양 터치가 각자 태어나 말리고 떠오르는 데포르메 폭발 견본입니다.',
        distinction: '한 덩어리에 붙은 고정 무늬 대신 터치마다 발생·회전·축소 시점을 다르게 둡니다.',
    },
    {
        id: 'fx-oki',
        name: '오키 폭발',
        category: 'effects',
        previewMs: 2648,
        description: '크기가 다른 거품이 접촉점부터 순서대로 부풀어 오르고, 외곽으로 떠올라 쪼그라드는 폭발 견본입니다.',
        distinction: '같은 자리의 반복 점멸 대신 거품마다 한 번의 발생·팽창·상승·소멸을 보여 줍니다.',
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
        description: '정권의 접촉점에서 수평으로 짧고 끈적하게 늘다가 목이 가늘어지고, 큰 덩어리가 갑자기 빠져나가는 점성 견본입니다.',
        distinction: '붙어 버티는 시간과 떨어져 나가는 속도를 대비하고, 잔여 조각은 분리 직전 연결부의 위치를 이어받습니다.',
    },
    {
        id: 'fx-tatsuzo',
        name: '타츠조 이펙트',
        category: 'effects',
        previewMs: 2670,
        description: '검정 단색의 둥근 덩어리가 부드러운 목으로 합쳐졌다가 떨어지고, 다시 모이며 사라지는 견본입니다.',
        distinction: '외곽을 한 번 흔드는 대신 연결부 굵기·구체의 눌림·합체와 분리를 함께 바꿉니다.',
    },
    {
        id: 'fx-shigeta',
        name: '시게타 불꽃',
        category: 'effects',
        previewMs: 2000,
        description: '기계 전투 스파크의 모티프를 권격 접촉에 옮긴 해석입니다. 실제 금속 파괴와 작가 고유 동작 재현은 포함하지 않습니다.',
        distinction: '짧은 가지형 파열 뒤 발광 조각이 갈라져 날며 식어 사라집니다.',
    },
    {
        id: 'fx-anime-r',
        name: '아니메R의 사라지는 파편',
        category: 'effects',
        previewMs: 2650,
        description: '큰 잔해가 날던 자리에서 작은 조각이 갈라져 같은 속도를 이어받고, 다시 잔편이 되어 사라지는 견본입니다.',
        distinction: '부모와 자식의 출발 위치·탄도·재질을 이어 갑작스러운 교체나 전체 알파 소멸을 줄입니다.',
    },
    {
        id: 'fx-kutsuna',
        name: '쿠츠나 번개',
        category: 'effects',
        previewMs: 2130,
        description: '굵기와 고리 모양이 코마마다 바뀌는 주 전류가 빠르게 뻗고, 짧은 가지가 갈라진 뒤 꼬리부터 끊어집니다.',
        distinction: '원작 클립의 선택 프레임을 참고해 여섯 곡선 다발을 새로 구성했습니다. 흰 핵·가는 연결·국소 팽창과 세 번의 방출을 나눕니다.',
        beats: [
            { timeMs: 1850, label: '선두 전진' },
            { timeMs: 1960, label: '고리와 굵기 교체' },
            { timeMs: 2130, label: '짧은 가지 분기' },
            { timeMs: 2390, label: '후속 방출' },
            { timeMs: 2820, label: '꼬리 이탈' },
            { timeMs: 3050, label: '소멸' },
        ],
    },
];
export function drawEffects(ctx, id, frame) {
    ctx.save();
    try {
        if (drawCircusScene(ctx, id, frame))
            return;
        stage(ctx, frame, 0);
        const back = drawEffectLayer(ctx, id, frame, { layer: 'back' });
        drawBattleActors(ctx, frame);
        const front = drawEffectLayer(ctx, id, frame, { layer: 'front' });
        if (!back && !front)
            label(ctx, '이 효과의 견본을 찾을 수 없습니다.');
    }
    finally {
        ctx.restore();
    }
}
