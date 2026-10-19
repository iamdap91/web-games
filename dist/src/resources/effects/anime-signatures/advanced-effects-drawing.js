import { sprite, stage } from '../../cutscenes/shared/drawing.js';
import { signatureWidth, signatureHeight, } from './contracts.js';
import { drawCubeDebris } from './advanced-cubes.js';
import { drawMetamorphosis } from './advanced-metamorphosis.js';
import { drawRollingSmoke } from './advanced-smoke.js';
function drawIdle(ctx, source, feet) {
    if (!source)
        return;
    const scale = 3.25;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source.image, feet.x - (source.image.naturalWidth * scale) / 2, feet.y - source.bounds.bottom * scale, source.image.naturalWidth * scale, source.image.naturalHeight * scale);
    ctx.restore();
}
function drawStudyBody(ctx, source, feet) {
    const scale = 3.25;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source.sprite.image, feet.x - source.pivot.x * scale, feet.y - (source.sprite.image.naturalHeight - source.pivot.y) * scale, source.sprite.image.naturalWidth * scale, source.sprite.image.naturalHeight * scale);
    ctx.restore();
}
function actor(ctx, assets, frame) {
    const feet = { x: 262, y: 449 };
    const casting = frame.scene.id === 'metamorphosis';
    ctx.save();
    ctx.fillStyle = '#0a111873';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 2, 46, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const sequence = casting
        ? assets.advanced.companions.get('yeonmuk')?.get(frame.facing)
        : undefined;
    if (sequence?.length && frame.timeMs >= 120 && frame.timeMs < 1000) {
        const index = Math.min(sequence.length - 1, Math.floor(((frame.timeMs - 120) / 880) * sequence.length));
        drawStudyBody(ctx, sequence[index], feet);
    }
    else
        drawIdle(ctx, assets.idle.get(casting ? 'yeonmuk' : 'ataho')?.get(frame.facing), feet);
}
function stoneCourtyard(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, '#172a30');
    sky.addColorStop(1, '#5b7265');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    for (let i = 0; i < 16; i++) {
        const x = i * 72 - 70;
        const height = 155 + (i % 4) * 31;
        ctx.fillStyle = i % 2 ? '#263f3c' : '#304b43';
        ctx.beginPath();
        ctx.moveTo(x, 365);
        ctx.lineTo(x + 52, 365 - height);
        ctx.lineTo(x + 105, 365);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#707c70';
    ctx.fillRect(0, 365, signatureWidth, signatureHeight - 365);
    for (let row = 0; row < 5; row++) {
        const top = 365 + row * row * 7;
        const bottom = 365 + (row + 1) * (row + 1) * 7;
        for (let column = -1; column < 8; column++) {
            const x = column * 162 + (row % 2) * 75;
            ctx.fillStyle = (row + column) % 3 ? '#7b8678' : '#8b9381';
            ctx.fillRect(x + 2, top + 2, 158, bottom - top - 3);
            if ((row + column) % 4 === 0) {
                ctx.fillStyle = '#536955';
                ctx.fillRect(x + 4, bottom - 3, 25, 2);
            }
        }
    }
}
function drawMorphScene(ctx, assets, frame) {
    stage(ctx, frame.reducedMotion ? 0 : frame.timeMs);
    actor(ctx, assets, frame);
    if (!frame.enhanced) {
        if (frame.timeMs >= 1100 && frame.timeMs < 3800)
            sprite(ctx, assets.advanced.spirit, 651, 431, 294);
        return {
            phase: frame.timeMs < 1100 ? '시전' : '완성된 호랑이 등장',
            detail: '기존 완성 원화가 한 번에 나타나는 기준입니다.',
            poseIndex: frame.timeMs >= 1100 ? 1 : 0,
        };
    }
    const state = drawMetamorphosis(ctx, assets.advanced.spirit, assets.advanced.morphology, { timeMs: frame.timeMs, reducedMotion: frame.reducedMotion });
    return {
        phase: state.phase,
        detail: '부적과 먹덩어리의 외곽이 이어 변하며 귀와 양 앞발을 만듭니다.',
        poseIndex: Math.round(state.progress * 100),
    };
}
function drawSmokeScene(ctx, assets, frame) {
    stage(ctx, frame.reducedMotion ? 0 : frame.timeMs);
    actor(ctx, assets, frame);
    const count = drawRollingSmoke(ctx, frame);
    return {
        phase: frame.timeMs < 840
            ? '분출 전'
            : frame.timeMs < 1600
                ? '덩어리 팽창'
                : frame.timeMs < 3050
                    ? '내부 면의 말림과 분리'
                    : '잔여 소멸',
        detail: frame.enhanced
            ? '그림자 면이 안쪽으로 말리고 덩어리마다 다른 박자로 부풀어 오릅니다.'
            : '같은 시각과 출발점의 단색 연기 덩어리입니다.',
        poseIndex: count,
    };
}
function drawCubeScene(ctx, assets, frame) {
    stoneCourtyard(ctx);
    actor(ctx, assets, frame);
    const count = drawCubeDebris(ctx, frame);
    return {
        phase: frame.timeMs < 760
            ? '석판'
            : frame.timeMs < 1030
                ? '균열'
                : frame.timeMs < 1950
                    ? '입방 파편'
                    : frame.timeMs < 3600
                        ? '작은 조각과 정착'
                        : '잔여 소멸',
        detail: frame.enhanced
            ? '석재의 큰 덩어리가 면색이 다른 회전 파편과 작은 조각으로 갈라집니다.'
            : '같은 석재 마당에서 평면 파편의 위치 변화만 비교합니다.',
        poseIndex: count,
    };
}
/** 표시 시각만으로 구성해 탐색·반복·GIF에서도 같은 형상을 반환한다. */
export function drawAdvancedEffects(ctx, assets, frame) {
    ctx.save();
    try {
        if (frame.scene.id === 'metamorphosis')
            return drawMorphScene(ctx, assets, frame);
        if (frame.scene.id === 'rolling-smoke')
            return drawSmokeScene(ctx, assets, frame);
        if (frame.scene.id === 'cube-debris')
            return drawCubeScene(ctx, assets, frame);
        throw new Error(`지원하지 않는 효과 비교입니다: ${frame.scene.id}`);
    }
    finally {
        ctx.restore();
    }
}
