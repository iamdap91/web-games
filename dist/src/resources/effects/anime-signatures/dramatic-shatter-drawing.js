import { dramaticCrackOrigin } from './dramatic-surface.js';
const shockCutMs = 720;
const crackStartMs = 1410;
const breakMs = 1770;
const settleMs = 3200;
function unit(value) {
    return Math.max(0, Math.min(1, value));
}
function polygon(ctx, shard) {
    ctx.beginPath();
    shard.points.forEach((point, index) => {
        if (index)
            ctx.lineTo(point.x, point.y);
        else
            ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
}
function drawCracks(ctx, shards, progress, opacity = 1) {
    if (progress <= 0)
        return;
    ctx.save();
    const alpha = ctx.globalAlpha;
    ctx.lineJoin = 'bevel';
    for (const shard of shards) {
        const reveal = unit(progress * 1.6 -
            Math.hypot(shard.center.x - dramaticCrackOrigin.x, shard.center.y - dramaticCrackOrigin.y) /
                850);
        if (reveal <= 0)
            continue;
        ctx.globalAlpha = alpha * reveal * opacity;
        polygon(ctx, shard);
        ctx.strokeStyle = '#090d1a';
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.strokeStyle = '#d9ecea';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();
}
function drawFlyingShards(ctx, assets, timeMs) {
    let visible = 0;
    for (const shard of assets.shatter.shards) {
        const age = Math.max(0, timeMs - breakMs - shard.delayMs) / 1000;
        if (age >= 1.3)
            continue;
        const ease = age * age * 0.6 + age * 0.4;
        const x = shard.velocity.x * ease;
        const y = shard.velocity.y * ease + 330 * age * age;
        const fade = 1 - unit((age - 0.95) / 0.35);
        ctx.save();
        ctx.globalAlpha *= fade;
        ctx.translate(shard.center.x + x, shard.center.y + y);
        ctx.rotate(shard.spin * age);
        ctx.translate(-shard.center.x, -shard.center.y);
        polygon(ctx, shard);
        ctx.save();
        ctx.clip();
        assets.shatter.drawShard(ctx, shard);
        ctx.restore();
        ctx.strokeStyle = '#c4dfdfc2';
        ctx.lineWidth = 1.15;
        ctx.stroke();
        ctx.restore();
        visible++;
    }
    return visible;
}
/** 같은 충격 표정 컷의 합성층만 나누며 인물이나 실제 배경의 파괴를 만들지 않는다. */
export function drawDramaticShatter(ctx, assets, frame) {
    if (frame.scene.id !== 'dramatic-shatter')
        return null;
    assets.shatter.prepare(assets);
    const t = Math.max(0, frame.timeMs);
    let count = 0;
    ctx.save();
    try {
        ctx.imageSmoothingEnabled = false;
        assets.shatter.drawSettled(ctx);
        if (t >= shockCutMs && t < breakMs) {
            assets.shatter.drawPhoto(ctx);
            if (frame.enhanced)
                drawCracks(ctx, assets.shatter.shards, unit((t - crackStartMs) / (breakMs - crackStartMs)));
        }
        else if (t >= breakMs && t < settleMs && frame.enhanced) {
            if (frame.reducedMotion) {
                const opacity = 1 - unit((t - breakMs) / 330);
                ctx.save();
                ctx.globalAlpha *= opacity;
                assets.shatter.drawPhoto(ctx);
                drawCracks(ctx, assets.shatter.shards, 1);
                ctx.restore();
            }
            else
                count = drawFlyingShards(ctx, assets, t);
        }
    }
    finally {
        ctx.restore();
    }
    return {
        phase: t < shockCutMs
            ? '기척'
            : t < crackStartMs
                ? '충격적 깨달음'
                : t < breakMs
                    ? '인식에 금이 감'
                    : t < settleMs
                        ? '충격 컷이 갈라지고 현실이 드러남'
                        : '연묵의 정착',
        detail: !frame.enhanced
            ? '같은 놀람 표정과 복귀 시각을 화면 분리 없이 잇습니다.'
            : frame.reducedMotion
                ? '고정 균열을 짧게 거두고 같은 뒤 장면으로 돌아갑니다.'
                : '실제 얼굴과 풍경이 남은 화면 조각이 벌어지며 뒤의 같은 인물이 드러납니다.',
        poseIndex: count,
    };
}
