import { label, stage } from './drawing.js';
import { battleLayout, drawBattleActors } from './battle.js';
import { drawLightEffects } from './effects-light.js';
import { drawCircusScene, drawFlightEffects } from './effects-flight.js';
import { drawExplosionEffects } from './effects-explosions.js';
export const effectSamples = [
    {
        id: 'fx-kanada-light',
        name: '카나다 빛',
        category: 'effects',
        previewMs: 1930,
        description: '십자와 단단한 링을 조합한 해석 견본입니다. 브러시 링 질감과 작가 원작 동작의 재현은 미검증입니다.',
        distinction: '십자와 링의 노출 길이를 비교하며 원작의 부드러운 링을 그대로 복제한 것은 아닙니다.',
    },
    {
        id: 'fx-kanada-beam',
        name: '카나다 빔',
        category: 'effects',
        previewMs: 2570,
        description: '중심축부터 S자로 굽어 뻗고, 각진 외피와 빈틈이 셀마다 교체되는 광선의 원리 견본입니다. 원작 동작 재현은 미검증입니다.',
        distinction: '직선 위 두께 변화와 달리 중심선·선두 방향·실루엣이 함께 바뀝니다.',
    },
    {
        id: 'fx-kanada-explosion',
        name: '카나다 폭발',
        category: 'effects',
        previewMs: 2110,
        description: '압축 핵·창·방사형·갈고리·갈라진 불꽃을 서로 다른 길이의 셀로 바꾸는 해석 견본입니다. 원작 동작 재현은 미검증입니다.',
        distinction: '같은 별모양 확대 대신 짧은 돌출과 긴 유지, 수축과 재확대, 형태 교체를 비교합니다.',
    },
    {
        id: 'fx-kanada-dragon',
        name: '카나다 드래곤',
        category: 'effects',
        previewMs: 2870,
        description: '팬 통칭을 고정된 용 머리와 굽는 리본 몸통으로 해석한 견본입니다. 화염의 형태 변환과 원작 동작은 미검증입니다.',
        distinction: '동물 실루엣을 가진 리본 경로이며 용의 외형만으로 특정 작가의 표현을 입증하지 않습니다.',
    },
    {
        id: 'fx-itano',
        name: '이타노 서커스',
        category: 'effects',
        previewMs: 1260,
        description: '곰왕의 회피를 다른 시각·깊이에서 쫓는 기공탄과 지연 추적 카메라를 조합한 원리 견본입니다. 원작 장면 복제는 아닙니다.',
        distinction: '탄은 회피 전 위치를 놓쳐 통과하고 앞뒤 가림·원근·추적 구도가 달라집니다. 마무리는 같은 1800ms 어퍼컷 한 번입니다.',
    },
    {
        id: 'fx-muraki',
        name: '무라키 서커스',
        category: 'effects',
        previewMs: 1450,
        description: '선행탄과 잠깐 정체한 뒤 추진하는 후속탄이 서로 다른 깊이에서 회피를 쫓는 해석입니다. 작가 고유 동작·계보는 미검증입니다.',
        distinction: '동시 수렴 대신 선행·정체·추진을 비동기로 배치하며, 빗나가는 궤도 뒤 같은 어퍼컷으로 끝납니다.',
    },
    {
        id: 'fx-anno',
        name: '안노 폭발',
        category: 'effects',
        previewMs: 2760,
        description: '접촉에서 치솟는 큰 분진 기둥과 작은 비산을 나눈 해석입니다. 타타키 질감과 작가 고유 동작 재현은 포함하지 않습니다.',
        distinction: '연기 기둥·지면 덩어리·작은 원형 비산의 층을 비교합니다.',
    },
    {
        id: 'fx-iso-explosion',
        name: '이소 폭발',
        category: 'effects',
        previewMs: 2800,
        description: '외곽 팽창과 내부 암부의 말림을 단순화한 부피 견본입니다. 작가 고유 형상·동작의 재현은 미검증입니다.',
        distinction: '초승달·원호 암부가 외곽과 다르게 흐르며, 복잡한 Y·삼각형 암부를 모두 구현한 것은 아닙니다.',
    },
    {
        id: 'fx-iso-debris',
        name: '이소 파편',
        category: 'effects',
        previewMs: 2520,
        description: '독립 잔해가 세 군집의 공통 운동을 따르다 간격을 벌리는 해석입니다. 원작 동작 재현은 미검증입니다.',
        distinction: '조각이 새로 분열하는 대신 처음부터 있는 조각의 군집 운동과 간격 변화를 비교합니다.',
    },
    {
        id: 'fx-nakamura',
        name: '나카무라 큐브',
        category: 'effects',
        previewMs: 2420,
        description: '곰왕 접촉점에서 입방 외형의 효과 조각과 작은 잔여가 이어집니다. 원작 동작 재현과 실제 지형 파괴는 포함하지 않습니다.',
        distinction: '면색이 고정된 입방 도형의 평면 회전과 크기 위계이며, 입체 회전 중 면이 바뀌는 구현은 아닙니다.',
    },
    {
        id: 'fx-hashimoto',
        name: '하시모토 스팀·폭발',
        category: 'effects',
        previewMs: 2440,
        description: '눌린 둥근 김 덩어리와 검은 파편을 조합한 단순 해석입니다. 복합 김 층과 작가 고유 동작의 재현은 포함하지 않습니다.',
        distinction: '둥근 외곽의 압축·팽창을 비교하며, 투과와 내부 재료가 겹치는 스팀 전체를 재현한 것은 아닙니다.',
    },
    {
        id: 'fx-norio',
        name: '노리오 연기',
        category: 'effects',
        previewMs: 2560,
        description: '내부 음영을 비운 연기 덩어리를 겹쳐 이동시키는 해석입니다. 작가 고유 동작의 재현은 미검증입니다.',
        distinction: '색면 하나인 덩어리의 겹침과 외곽 이동을 비교합니다.',
    },
    {
        id: 'fx-mori',
        name: '모리 이펙트·파편',
        category: 'effects',
        previewMs: 2150,
        description: '길쭉하고 거친 고정형 파편이 방향을 따라 쏟아지는 해석입니다. 작가 특유의 형태 변화와 박자는 미검증입니다.',
        distinction: '입방 블록·둥근 입자와 다른 파편 외형과 이동·평면 회전·축소를 비교합니다.',
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
        description: 'ゝ 모양 터치를 여러 층에 배치한 데포르메 폭발의 해석입니다. 요시나리 요의 원작 동작 재현은 미검증입니다.',
        distinction: '고정 배치된 굽은 터치와 큰 불덩어리가 팽창하는 형태를 비교합니다.',
    },
    {
        id: 'fx-oki',
        name: '오키 폭발',
        category: 'effects',
        previewMs: 2648,
        description: '크기가 다른 거품이 비동기로 솟고 꺼지는 폭발의 해석입니다. 작가 원작의 박자·동작 재현은 미검증입니다.',
        distinction: '큰 원의 한 번 팽창 대신 여러 거품의 크기 주기와 상승 시점을 비교합니다.',
    },
    {
        id: 'fx-kozuma',
        name: '코즈마 이펙트',
        category: 'effects',
        previewMs: 2990,
        description: '점성 있는 목을 늘린 뒤 분리 도형과 방울로 교체하는 해석입니다. 작가 고유의 구체 혼합·박자 재현은 미검증입니다.',
        distinction: '가는 목은 연속으로 줄지만 분리 순간은 두 도형 사이의 전환이며 잔상 효과는 아닙니다.',
    },
    {
        id: 'fx-tatsuzo',
        name: '타츠조 이펙트',
        category: 'effects',
        previewMs: 2670,
        description: '검은 연결 덩어리 하나의 곡률이 한 주기로 부드럽게 변하는 해석입니다. 작가 원작 동작 재현은 미검증입니다.',
        distinction: '내부 음영 없는 곡면 실루엣의 변형이며, 별개 구체의 합체·분열은 없습니다.',
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
        description: '큰 파편이 줄어들며 작은 잔편을 남기는 소멸의 해석입니다. 특정 작가·원작의 시간 배분 재현은 미검증입니다.',
        distinction: '같은 알파로 한꺼번에 지우는 대신 조각 크기를 줄이고 작은 잔편을 따로 남깁니다.',
    },
    {
        id: 'fx-kutsuna',
        name: '쿠츠나 번개',
        category: 'effects',
        previewMs: 2420,
        description: '엉킨 선 덩어리라는 통칭에 기대어 여러 곡선을 교체한 해석입니다. 원작성자 자료와 원작 번개 동작은 미검증입니다.',
        distinction: '가는 사인 곡선 11개의 엉킴과 셀 교체이며 작가 특유의 번개 형상을 입증한 견본은 아닙니다.',
    },
];
const placements = {
    'fx-kanada-light': { x: 549, y: 266, scale: 0.72 },
    'fx-kanada-beam': { x: 267, y: 300, scale: 0.34, rotation: -1.08 },
    'fx-kanada-explosion': { x: 550, y: 334, scale: 0.63 },
    'fx-kanada-dragon': { x: 292, y: 269, scale: 0.38, rotation: -1.1 },
    'fx-anno': { x: 546, y: 407, scale: 0.68 },
    'fx-iso-explosion': { x: 548, y: 352, scale: 0.66 },
    'fx-iso-debris': { x: 550, y: 390, scale: 0.8 },
    'fx-nakamura': { x: 551, y: 389, scale: 0.8 },
    'fx-hashimoto': { x: 548, y: 387, scale: 0.64 },
    'fx-norio': { x: 548, y: 372, scale: 0.64 },
    'fx-mori': { x: 410, y: 310, scale: 0.65, rotation: -0.8 },
    'fx-araki': { x: 503, y: 277, scale: 0.58 },
    'fx-yoshinari': { x: 548, y: 325, scale: 0.68 },
    'fx-oki': { x: 550, y: 330, scale: 0.65 },
    'fx-kozuma': { x: 285, y: 300, scale: 0.36, rotation: -1.05 },
    'fx-tatsuzo': { x: 551, y: 284, scale: 0.58 },
    'fx-shigeta': { x: 548, y: 300, scale: 0.75 },
    'fx-anime-r': { x: 548, y: 371, scale: 0.8 },
    'fx-kutsuna': { x: 296, y: 288, scale: 0.37, rotation: -1.06 },
};
export function drawEffects(ctx, id, frame) {
    ctx.save();
    try {
        if (drawCircusScene(ctx, id, frame))
            return;
        // 일반 FX는 공유 접촉을, 서커스는 위 전용 합성에서 회피와 깊이를 소유한다.
        stage(ctx, 0);
        drawBattleActors(ctx, frame);
        const placement = placements[id];
        if (!placement)
            return;
        let drawn = false;
        ctx.save();
        try {
            ctx.translate(battleLayout.impact.x, battleLayout.impact.y);
            ctx.rotate(placement.rotation ?? 0);
            const motionScale = frame.reducedMotion ? 0.75 : 1;
            const scale = placement.scale * 1.3 * motionScale;
            ctx.scale(scale, scale);
            ctx.translate(-placement.x, -placement.y);
            drawn =
                drawLightEffects(ctx, id, frame) ||
                    drawFlightEffects(ctx, id, frame) ||
                    drawExplosionEffects(ctx, id, frame);
        }
        finally {
            ctx.restore();
        }
        if (!drawn)
            label(ctx, '이 효과의 견본을 찾을 수 없습니다.');
    }
    finally {
        ctx.restore();
    }
}
