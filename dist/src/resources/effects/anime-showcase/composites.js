import { drawCompositeFast } from './composite-fast.js';
import { drawCompositeFire } from './composite-fire.js';
import { drawCompositeGround } from './composite-ground.js';
import { drawCompositeBeam } from './composite-beam.js';
import { drawCompositeOrb } from './composite-orb.js';
import { drawCompositeSiege } from './composite-siege.js';
import { drawCompositeHeavy } from './composite-heavy.js';
import { drawCompositeInk } from './composite-ink.js';
export const compositeSamples = [
    {
        id: 'composite-fast',
        name: '합성 · 섬광 정권',
        category: 'composite',
        previewMs: 1940,
        description: '속도선의 진입 뒤 두 코마 접촉 컷과 수평 빛무리, 작은 파편이 차례로 이어집니다.',
        distinction: '비교판은 같은 정권과 타점의 카나다 빛 한 종이며, 합성판은 속도·접촉·잔여에 다른 역할을 줍니다.',
        beats: [
            { timeMs: 1430, label: '속도선 · 진입' },
            { timeMs: 1816, label: '두 코마 접촉 컷' },
            { timeMs: 1940, label: '수평 빛무리 파열' },
            { timeMs: 2200, label: '작은 파편' },
            { timeMs: 2600, label: '소멸' },
        ],
    },
    {
        id: 'composite-fire',
        name: '합성 · 화염 파열',
        category: 'composite',
        previewMs: 2660,
        description: '작은 백열핵에서 카나다 파열과 외곽 거품이 번지고, 뒤늦은 공중 연기가 남습니다.',
        distinction: '비교판은 카나다 폭발 한 종이며, 합성판은 핵·파열·외곽·잔연기의 정점을 시차로 나눕니다.',
        beats: [
            { timeMs: 1820, label: '백열핵' },
            { timeMs: 1940, label: '카나다 파열' },
            { timeMs: 2660, label: '외곽 거품' },
            { timeMs: 3100, label: '공중 잔연기' },
            { timeMs: 3980, label: '소멸' },
        ],
    },
    {
        id: 'composite-ground',
        name: '합성 · 지면 분쇄',
        category: 'composite',
        previewMs: 3340,
        description: '곰왕의 머리 착지점에서 낮은 충격과 현무암 파편이 퍼지고 분진 기둥과 바닥 먼지가 뒤따릅니다.',
        distinction: '비교판은 같은 낙하와 착지점의 안노 분진 한 종이며, 합성판은 지면 충격·파편·먼지를 차례로 더합니다.',
        beats: [
            { timeMs: 2380, label: '머리부터 낙하' },
            { timeMs: 2950, label: '가속 하강' },
            { timeMs: 3040, label: '지면 접촉' },
            { timeMs: 3340, label: '현무암 파편' },
            { timeMs: 3500, label: '뒤늦은 분진' },
            { timeMs: 4180, label: '소멸' },
        ],
    },
    {
        id: 'composite-beam',
        name: '합성 · 뇌광포',
        category: 'composite',
        previewMs: 2350,
        description: '굵은 수평 광선이 지난 자리에서 가는 전류가 분기하고, 광선의 후단과 잔전류가 뒤늦게 끊어져 사라집니다.',
        distinction: '비교판은 같은 배우와 방출의 카나다 빔 한 종이며, 합성판은 빛핵·광선·전류 분기·후단 이탈의 박자를 나눕니다.',
        beats: [
            { timeMs: 1660, label: '장전' },
            { timeMs: 1900, label: '빛핵' },
            { timeMs: 2120, label: '광선 전진' },
            { timeMs: 2350, label: '전류 분기' },
            { timeMs: 2920, label: '후단 이탈' },
            { timeMs: 3100, label: '잔전류' },
            { timeMs: 3500, label: '소멸' },
        ],
    },
    {
        id: 'composite-orb',
        name: '합성 · 점성 흑구',
        category: 'composite',
        previewMs: 2620,
        description: '세 검은 덩어리가 합쳐지고 끈끈한 목으로 늘어나다 끊어져 날아갑니다.',
        distinction: '비교판은 타츠조식 합체 흑구 한 종이며, 합성판은 붙어서 늘어나는 목·절단·사출과 분리 위치의 잔여를 이어 갑니다.',
        beats: [
            { timeMs: 1150, label: '세 덩어리 발생' },
            { timeMs: 1650, label: '합체' },
            { timeMs: 2360, label: '붙어서 늘어남' },
            { timeMs: 2760, label: '목 절단' },
            { timeMs: 3100, label: '사출 · 목의 잔여' },
            { timeMs: 3720, label: '소멸' },
        ],
    },
    {
        id: 'composite-siege',
        name: '합성 · 유도탄 포위',
        category: 'composite',
        previewMs: 2260,
        description: '네 유도탄이 서로 다른 앞뒤 곡선으로 돌아 같은 표적에 차례로 닿고, 휘어진 연기 궤적과 도착 연기가 남습니다.',
        distinction: '비교판과 유도탄의 궤적·도착 핵·피격 시각은 같으며, 합성판은 각 탄의 연기 꼬리와 도착 뒤 잔연기를 더합니다.',
        beats: [
            { timeMs: 760, label: '사출' },
            { timeMs: 1740, label: '앞뒤 곡선' },
            { timeMs: 2000, label: '첫 도착' },
            { timeMs: 2260, label: '연속 명중' },
            { timeMs: 2800, label: '마지막 도착' },
            { timeMs: 3520, label: '소멸' },
        ],
    },
    {
        id: 'composite-heavy',
        name: '합성 · 중량 정권',
        category: 'composite',
        previewMs: 2460,
        description: '긴 장전 뒤 짧게 신전하고 접촉을 유지한 뒤 곰왕이 무겁게 밀려나며, 소수의 큰 파편이 뒤늦게 떨어집니다.',
        distinction: '비교판과 준비·2200ms 접촉·120ms 유지·반동·접촉 효과는 같으며, 합성판은 소수의 무거운 파편을 앞뒤로 나눠 더합니다.',
        beats: [
            { timeMs: 1380, label: '장전' },
            { timeMs: 2100, label: '신전' },
            { timeMs: 2220, label: '접촉 유지' },
            { timeMs: 2380, label: '밀림' },
            { timeMs: 2660, label: '최대 반동' },
            { timeMs: 3180, label: '파편 착지' },
            { timeMs: 3460, label: '정착' },
        ],
    },
    {
        id: 'composite-ink',
        name: '합성 · 먹빛 종결',
        category: 'composite',
        previewMs: 3000,
        description: '장전의 정적 뒤 짧은 흑백 접촉과 거친 먹획 파편을 지나 하모니 정지판으로 끝납니다.',
        distinction: '비교판은 같은 어퍼컷과 접촉 정지의 모리 파편 한 종이며, 합성판은 흑백 접촉과 회화 정지판으로 타격 뒤 여운을 남깁니다.',
        beats: [
            { timeMs: 1650, label: '장전 정적' },
            { timeMs: 1835, label: '흑백 접촉' },
            { timeMs: 2070, label: '먹획 파편' },
            { timeMs: 2600, label: '파편 감쇠' },
            { timeMs: 2700, label: '하모니 정지판' },
        ],
    },
];
export function drawComposite(ctx, id, frame) {
    if (id === 'composite-fast')
        drawCompositeFast(ctx, frame);
    else if (id === 'composite-fire')
        drawCompositeFire(ctx, frame);
    else if (id === 'composite-ground')
        drawCompositeGround(ctx, frame);
    else if (id === 'composite-beam')
        drawCompositeBeam(ctx, frame);
    else if (id === 'composite-orb')
        drawCompositeOrb(ctx, frame);
    else if (id === 'composite-siege')
        drawCompositeSiege(ctx, frame);
    else if (id === 'composite-heavy')
        drawCompositeHeavy(ctx, frame);
    else if (id === 'composite-ink')
        drawCompositeInk(ctx, frame);
}
