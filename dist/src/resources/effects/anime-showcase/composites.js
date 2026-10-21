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
        name: '섬광 정권',
        category: 'composite',
        previewMs: 2010,
        description: '340px 진입을 디딤에서 멈추고 정권을 뻗습니다. 두 코마 접촉 컷 뒤 상대가140ms에84px 밀리고, 빛과 작은 파편이 앞쪽으로 빠져 회수를 드러냅니다.',
        distinction: '비교판은 같은 정권과 타점의 카나다 빛 한 종이며, 합성판은 속도·접촉·잔여에 다른 역할을 줍니다.',
        beats: [
            { timeMs: 1230, label: '동쪽 달리기 · 속도선' },
            { timeMs: 1510, label: '디딤 · 정권 준비' },
            { timeMs: 1816, label: '두 코마 접촉 컷' },
            { timeMs: 1940, label: '수평 빛무리 · 상대 방출' },
            { timeMs: 2010, label: '빠른84px 밀림' },
            { timeMs: 2260, label: '작은 파편 이탈' },
            { timeMs: 2390, label: '70px 떨어진 자리 정착' },
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
