import { drawActingWater } from './acting-water.js';
function drawHeatHaze(ctx, assets, frame) {
    const moved = assets.acting.heat.draw(ctx, frame);
    const idle = assets.idle.get('ataho')?.get('south-east');
    if (!idle)
        throw new Error('온천을 바라보는 아타호 원화를 준비하지 못했습니다.');
    const x = 267;
    const base = 462;
    const scale = 3.4;
    ctx.save();
    ctx.fillStyle = '#53635b66';
    ctx.beginPath();
    ctx.ellipse(x, base + 1, 47, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    // 배경의 국소 변위를 마친 뒤 원본 인물을 그려 얼굴과 픽셀 경계를 보존한다.
    ctx.drawImage(idle.image, x - (idle.image.naturalWidth * scale) / 2, base - idle.bounds.bottom * scale, idle.image.naturalWidth * scale, idle.image.naturalHeight * scale);
    ctx.restore();
    return {
        phase: frame.timeMs < 450
            ? '눈솔 온천의 고요'
            : frame.timeMs < 1550
                ? '따뜻한 물길 열림'
                : frame.timeMs < 4170
                    ? '온천 위로 올라가는 열기'
                    : '잔열',
        detail: !frame.enhanced
            ? '같은 물길과 김을 배경의 굴절 없이 비교합니다.'
            : frame.reducedMotion
                ? '윤곽 흔들림을 줄인 온천 풍경입니다.'
                : '온천 뒤 울타리와 풍경만 작게 일렁이며 열기가 위로 흐릅니다.',
        poseIndex: moved,
    };
}
export function drawActingEffects(ctx, assets, frame) {
    ctx.save();
    try {
        if (frame.scene.id === 'water-landing')
            return drawActingWater(ctx, assets, frame);
        if (frame.scene.id === 'heat-haze')
            return drawHeatHaze(ctx, assets, frame);
        throw new Error(`지원하지 않는 물·열 비교입니다: ${frame.scene.id}`);
    }
    finally {
        ctx.restore();
    }
}
