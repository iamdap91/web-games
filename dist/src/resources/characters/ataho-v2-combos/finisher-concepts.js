import { drawPhoenixConceptBackdrop, drawPhoenixConceptOverlay, } from './finisher-phoenix-concept.js';
import { drawGalacticaConceptBackdrop, drawGalacticaConceptOverlay, } from './finisher-galactica-concept.js';
import { drawInkConceptBackdrop, drawInkConceptOverlay, } from './finisher-ink-concept.js';
import { drawDemonDescentBackdrop, drawDemonDescentOverlay, } from './demon-descent-drawing.js';
import { drawDragonConceptEchoes } from './finisher-echo-concept.js';
import { drawDrunkenConceptBackdrop, drawDrunkenConceptOverlay, } from './finisher-drunken-concept.js';
import { drawSpaceConceptBackdrop, drawSpaceConceptScreenOverlay, } from './finisher-space-concept.js';
export function finisherConcept(motion) {
    switch (motion.finisher?.theme) {
        case 'demon':
            return {
                label: '암중 난타와 먹빛 급강하',
                summary: '암중 난타의 실제 접촉 원화를 드러낸 뒤 높은 도약과 급강하를 잇습니다. 양손 뒤의 굵은 먹획과 수직 유선이 하강을 따르고 마지막 접촉에서 백열핵과 거친 파열이 터집니다.',
            };
        case 'dragon':
            return {
                label: '점점 빨라지는 엇박 압박',
                summary: '초반 세 타의 회수는 묵직하게 남기고 후반에는 접촉 자세를 유지한 채 회수 간격을 좁혀 압박합니다.',
            };
        case 'omnislash':
            return {
                label: '쌓이는 화면 균열과 마지막 파쇄',
                summary: '필살기 컷 구도에서는 표적 위치를 고정하고 좌우·상공의 공격자만 바뀝니다. 쌓인 균열은 마지막 상승권에서 깨집니다.',
            };
        case 'drunken-tiger':
            return {
                label: '앞뒤를 뒤집는 한 몸의 허실',
                summary: '현재 여덟 타와 빈 박자를 유지하고 실제 접촉에서만 앞뒤 힘 방향의 짧은 파편을 더합니다. 끝 철산고는 낮고 넓게 터집니다.',
            };
        case 'phoenix':
            return {
                label: '연각과 한 번의 공중 전환',
                summary: '몸은 낮은 도약의 호를 그리고 발은 그 주위로 빠르게 돌아 찹니다. 백덤블링 한 번과 반대편 끝각을 잇습니다.',
            };
        case 'galactica':
            return {
                label: '긴 정적과 단 한 번의 폭발',
                summary: '장전 주먹의 중심을 비운 먹빛 집중선이 힘을 모으고 돌진 순간 걷힙니다. 한 주먹 관통 뒤 반동을 흘리고 버팁니다.',
            };
        case 'meteor':
            return {
                label: '별자리에서 쏟아지는 유성우',
                summary: '실제 양손의 짧은 발사광, 가는 유성의 밝은 선두, 표적의 작은 도착 파열로 서른두 원거리 권격을 구분합니다.',
            };
        default:
            return undefined;
    }
}
export function drawConceptBackdrop(ctx, frame) {
    switch (frame.finisher.definition.theme) {
        case 'demon':
            drawInkConceptBackdrop(ctx, frame);
            drawDemonDescentBackdrop(ctx, frame);
            break;
        case 'omnislash':
            drawSpaceConceptBackdrop(ctx, frame);
            break;
        case 'phoenix':
            drawPhoenixConceptBackdrop(ctx, frame);
            break;
        case 'galactica':
            drawGalacticaConceptBackdrop(ctx, frame);
            break;
        case 'drunken-tiger':
            drawDrunkenConceptBackdrop(ctx, frame);
            break;
    }
}
export function drawConceptEchoes(ctx, frame) {
    if (frame.finisher.definition.theme === 'dragon')
        drawDragonConceptEchoes(ctx, frame);
}
export function drawConceptOverlay(ctx, frame) {
    if (frame.finisher.definition.theme === 'demon') {
        drawInkConceptOverlay(ctx, frame);
        drawDemonDescentOverlay(ctx, frame);
    }
    if (frame.finisher.definition.theme === 'phoenix')
        drawPhoenixConceptOverlay(ctx, frame);
    if (frame.finisher.definition.theme === 'galactica')
        drawGalacticaConceptOverlay(ctx, frame);
    if (frame.finisher.definition.theme === 'drunken-tiger')
        drawDrunkenConceptOverlay(ctx, frame);
}
/** 유리 균열은 카메라 밖의 화면 좌표에 고정한다. */
export function drawConceptScreenOverlay(ctx, frame) {
    if (frame.finisher.definition.theme === 'omnislash')
        drawSpaceConceptScreenOverlay(ctx, frame);
}
