import { actor, ellipse, label, palette, stage } from './drawing.js';
import { drawLightEffects } from './effects-light.js';
import { drawFlightEffects } from './effects-flight.js';
import { drawExplosionEffects } from './effects-explosions.js';
export const effectSamples = [
    {
        id: 'fx-kanada-light',
        name: '카나다 빛',
        category: 'effects',
        previewMs: 1280,
        description: '점광이 긴 십자와 비스듬한 링으로 바뀌는 짧은 섬광 견본입니다.',
        distinction: '광점 → 십자 → 링의 서로 다른 노출 길이를 비교합니다.',
    },
    {
        id: 'fx-kanada-beam',
        name: '카나다 빔',
        category: 'effects',
        previewMs: 1750,
        description: '직선 광선의 외피가 각진 덩어리와 가는 목으로 급변하는 견본입니다.',
        distinction: '색이나 두께의 진동 대신 광선 외곽의 꺾임과 빈틈이 바뀝니다.',
    },
    {
        id: 'fx-kanada-explosion',
        name: '카나다 폭발',
        category: 'effects',
        previewMs: 1350,
        description: '압축된 핵이 뾰족한 불꽃 면과 방사 쐐기로 열리는 견본입니다.',
        distinction: '둥근 팽창에 비해 각진 외곽과 짧은 정점이 두드러집니다.',
    },
    {
        id: 'fx-kanada-dragon',
        name: '카나다 드래곤',
        category: 'effects',
        previewMs: 1900,
        description: '팬 통칭을 용의 뿔·주둥이와 굽는 화염 몸통으로 해석한 견본입니다. 고정된 원전 정의는 아닙니다.',
        distinction: '같은 이동 경로의 에너지 덩어리를 동물 실루엣으로 연결합니다.',
    },
    {
        id: 'fx-itano',
        name: '이타노 서커스',
        category: 'effects',
        previewMs: 1850,
        description: '서로 다른 고도에서 표적을 감아 돌아 합류하는 유도탄 궤도 견본입니다.',
        distinction: '각 탄의 긴 곡선·시간차·표적 회피가 공간을 만듭니다.',
    },
    {
        id: 'fx-muraki',
        name: '무라키 서커스',
        category: 'effects',
        previewMs: 1850,
        description: '명칭을 추진 화염과 급격한 경로 압축 박자에 초점을 맞춰 해석한 견본입니다. 영향 계보를 판정하지 않습니다.',
        distinction: '이타노 견본의 긴 유도곡선과 달리 정체 → 추진 → 짧은 고속 교차를 보여줍니다.',
    },
    {
        id: 'fx-anno',
        name: '안노 폭발',
        category: 'effects',
        previewMs: 2000,
        description: '지면의 섬광에서 치솟는 큰 분진 기둥과 작은 잔해 층을 나눈 견본입니다.',
        distinction: '정점 뒤 오래 남는 무거운 분진과 세밀한 비산을 비교합니다.',
    },
    {
        id: 'fx-iso-explosion',
        name: '이소 폭발',
        category: 'effects',
        previewMs: 2100,
        description: '팽창하는 외곽과 안쪽으로 말리는 그림자 면을 분리한 부피 견본입니다.',
        distinction: '외곽만 커지는 연기와 달리 내부 암부가 서로 다른 시각에 흐릅니다.',
    },
    {
        id: 'fx-iso-debris',
        name: '이소 파편',
        category: 'effects',
        previewMs: 1750,
        description: '잔해가 큰 무리로 날아가다 작은 비대칭 덩어리로 풀리는 견본입니다.',
        distinction: '균일한 점 분산 대신 군집의 공통 운동과 내부 분열을 보여줍니다.',
    },
    {
        id: 'fx-nakamura',
        name: '나카무라 큐브',
        category: 'effects',
        previewMs: 1720,
        description: '석재 덩어리에서 면색을 가진 입방 조각과 작은 잔해가 이어지는 견본입니다.',
        distinction: '평면 사각형이 아닌 회전하는 입방 면과 크기 위계를 비교합니다.',
    },
    {
        id: 'fx-hashimoto',
        name: '하시모토 스팀·폭발',
        category: 'effects',
        previewMs: 1750,
        description: '눌린 둥근 김 덩어리가 부풀고 검은 파편이 먼저 튀는 견본입니다.',
        distinction: '각진 불꽃이나 말리는 회색 암부와 달리 깨끗한 원형 외곽의 압축·팽창을 강조합니다.',
    },
    {
        id: 'fx-norio',
        name: '노리오 연기',
        category: 'effects',
        previewMs: 1850,
        description: '내부 음영을 비운 큰 연기 실루엣이 덩어리로 밀려가는 견본입니다.',
        distinction: '색면 하나의 외곽 분열과 긴 끌림으로 읽히게 합니다.',
    },
    {
        id: 'fx-mori',
        name: '모리 이펙트·파편',
        category: 'effects',
        previewMs: 1500,
        description: '굵은 파열 획에서 길쭉하고 거친 파편이 같은 방향으로 쏟아지는 견본입니다.',
        distinction: '입방 블록·둥근 입자와 다른 비정형 조각의 방향성을 비교합니다.',
    },
    {
        id: 'fx-araki',
        name: '아라키 이펙트',
        category: 'effects',
        previewMs: 1320,
        description: '날을 스치는 두 교차 광선과 작은 빛 거품이 이어지는 견본입니다.',
        distinction: '칼날을 따라 모였다가 교차하고, 둥근 빛 잔여만 늦게 남습니다.',
    },
    {
        id: 'fx-yoshinari',
        name: '요시나리 폭발',
        category: 'effects',
        previewMs: 1650,
        description: 'ゝ 모양의 굽은 터치를 여러 층에 배치한 데포르메 폭발의 해석 견본입니다. 특정 장면 복제는 아닙니다.',
        distinction: '큰 불덩어리 안팎의 짧고 굽은 터치가 팽창 방향을 만듭니다.',
    },
    {
        id: 'fx-oki',
        name: '오키 폭발',
        category: 'effects',
        previewMs: 1900,
        description: '거품 같은 덩어리가 부글거리며 계속 부푸는 폭발의 해석 견본입니다.',
        distinction: '큰 원의 일회 팽창 대신 크기가 다른 거품이 비동기로 솟고 꺼집니다.',
    },
    {
        id: 'fx-kozuma',
        name: '코즈마 이펙트',
        category: 'effects',
        previewMs: 2050,
        description: '점성 있는 에너지의 목이 길어졌다 끊어지고 비대칭 방울이 남는 견본입니다.',
        distinction: '탄 복제 잔상이 아닌 연결 → 가는 목 → 분리라는 형태 변화입니다.',
    },
    {
        id: 'fx-tatsuzo',
        name: '타츠조 이펙트',
        category: 'effects',
        previewMs: 1800,
        description: '곡선형 구체의 검은 실루엣이 매끄럽게 늘고 합쳐지는 평면 효과 견본입니다. 원작 재현을 뜻하지 않습니다.',
        distinction: '내부 음영을 비우고 곡률과 연결 형태의 연속 변화에 집중합니다.',
    },
    {
        id: 'fx-shigeta',
        name: '시게타 불꽃',
        category: 'effects',
        previewMs: 1450,
        description: '기계 전투의 금속 접촉점에서 파열하고 갈라져 날아가는 스파크의 해석 견본입니다.',
        distinction: '접촉점의 짧은 가지형 파열 뒤 발광 금속편이 포물선으로 날며 작게 갈라지고 식어 사라집니다.',
    },
    {
        id: 'fx-anime-r',
        name: '아니메R의 사라지는 파편',
        category: 'effects',
        previewMs: 1750,
        description: '날아가는 조각이 가늘어지고 작은 잔편을 남기며 차례로 사라지는 해석 견본입니다.',
        distinction: '모든 조각을 같은 알파로 지우지 않고 크기와 속도에 따라 외곽부터 거둡니다.',
    },
    {
        id: 'fx-kutsuna',
        name: '쿠츠나 번개',
        category: 'effects',
        previewMs: 1700,
        description: '스파게티처럼 엉킨 가는 선 덩어리가 짧은 노출 박자로 바뀌는 번개의 해석 견본입니다.',
        distinction: '한 줄의 꺾인 번개와 달리 매듭처럼 얽힌 여러 곡선이 함께 압축·확장됩니다.',
    },
];
export function drawEffects(ctx, id, frame) {
    ctx.save();
    try {
        stage(ctx, frame.reducedMotion ? 0 : frame.timeMs);
        ellipse(ctx, 547, 422, 149, 17, '#090e1959');
        if (id === 'fx-kanada-light' ||
            id === 'fx-kanada-beam' ||
            id === 'fx-kanada-dragon' ||
            id === 'fx-araki' ||
            id === 'fx-kozuma' ||
            id === 'fx-kutsuna') {
            actor(ctx, 164, 420, 0.75, { arm: 1, color: palette.gold });
        }
        if (drawLightEffects(ctx, id, frame) ||
            drawFlightEffects(ctx, id, frame) ||
            drawExplosionEffects(ctx, id, frame))
            return;
        label(ctx, '이 효과의 견본을 찾을 수 없습니다.');
    }
    finally {
        ctx.restore();
    }
}
