import { unit } from '../shared/playback.js';
/** 끝이 가늘어지는 짧은 면으로 속도 방향을 읽히게 한다. */
function sliver(ctx, length, width) {
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(-length * 0.22, -width);
    ctx.lineTo(6, 0);
    ctx.lineTo(-length * 0.35, width * 0.55);
    ctx.closePath();
    ctx.fill();
}
function drawLaunchDust(ctx, actor, reduced) {
    const ageMs = actor.trail.ageMs;
    if (ageMs <= 0 || ageMs >= 220)
        return;
    const p = ageMs / 220;
    const { from, tip, to } = actor.trail;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    // 손발 궤적에서 고정 오프셋을 빼 실제 출발 발밑을 얻는다.
    ctx.translate(from.x - (tip.x - actor.x), from.y - (tip.y - actor.feetY));
    ctx.rotate(angle);
    ctx.globalAlpha *= actor.opacity * (1 - p) * (reduced ? 0.2 : 0.38);
    ctx.fillStyle = '#b1a6af';
    for (let i = 0; i < (reduced ? 2 : 3); i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const distance = 8 + p * (24 + i * 8);
        ctx.save();
        ctx.translate(-distance, side * (3 + p * (5 + i * 3)));
        ctx.scale(1, 0.35);
        sliver(ctx, (8 + i * 3) * (1 - p * 0.65), 3 + p * 4);
        ctx.restore();
    }
    ctx.restore();
}
/** 캐릭터 뒤의 먹빛 면과 가는 밝은 가장자리로 빠른 통과만 강조한다. */
export function drawFinaleTrails(ctx, formation, options) {
    for (const actor of formation.actors) {
        if (actor.opacity <= 0)
            continue;
        drawLaunchDust(ctx, actor, options.reducedMotion);
        const { from, to, tip, progress } = actor.trail;
        const speed = 4 * progress * (1 - progress);
        if (speed <= 0.08)
            continue;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const travelled = Math.hypot(tip.x - from.x, tip.y - from.y);
        const length = Math.min(travelled, (options.reducedMotion ? 66 : 116) * speed);
        if (length < 3)
            continue;
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.globalAlpha *= actor.opacity * speed;
        ctx.fillStyle = '#060609b8';
        sliver(ctx, length, options.reducedMotion ? 4 : 8);
        ctx.translate(0, -2.5);
        const edge = ctx.createLinearGradient(-length, 0, 0, 0);
        edge.addColorStop(0, '#b4a8c000');
        edge.addColorStop(0.7, '#b4a8c047');
        edge.addColorStop(1, '#e9dfcfb0');
        ctx.fillStyle = edge;
        sliver(ctx, length, options.reducedMotion ? 0.65 : 1.2);
        ctx.restore();
    }
}
/** 통과 방향의 접촉 칼끝과 늦게 흩어지는 작은 잔재를 시차로 그린다. */
export function drawFinaleStrikes(ctx, formation, options) {
    for (const strike of formation.strikes) {
        if (!strike.active || strike.ageMs < 0 || strike.ageMs >= 160)
            continue;
        const angle = Math.atan2(strike.direction.y, strike.direction.x);
        ctx.save();
        ctx.translate(strike.x, strike.y);
        ctx.rotate(angle);
        const duration = options.reducedMotion ? 40 : 55;
        if (strike.ageMs < duration) {
            const p = strike.ageMs / duration;
            ctx.save();
            ctx.globalAlpha *= (1 - p) * (options.reducedMotion ? 0.55 : 0.95);
            // 검은 군상 위에서도 접촉점을 읽도록 짧은 명부 주변에만 어두운 테두리를 둔다.
            ctx.fillStyle = '#08070df0';
            sliver(ctx, 48 + p * 34, 7 * (1 - p) + 1);
            ctx.fillStyle = '#fff0d6';
            sliver(ctx, 42 + p * 30, (options.reducedMotion ? 2 : 4) * (1 - p));
            ctx.rotate(-0.95);
            sliver(ctx, (options.reducedMotion ? 15 : 25) * (1 - p * 0.6), 1.5 * (1 - p));
            ctx.restore();
        }
        const residue = unit((strike.ageMs - 24) / 136);
        if (residue > 0 && residue < 1) {
            ctx.globalAlpha *= (1 - residue) * (options.reducedMotion ? 0.3 : 0.65);
            for (let i = 0; i < (options.reducedMotion ? 2 : 4); i++) {
                const side = i % 2 === 0 ? -1 : 1;
                ctx.save();
                ctx.translate(10 + residue * (25 + i * 7), side * (5 + residue * (9 + i * 4)));
                ctx.rotate(side * (0.25 + i * 0.15));
                ctx.fillStyle = i % 2 === 0 ? '#c6b7b2' : '#756779';
                sliver(ctx, 4 + (i % 2) * 3, 1.5 * (1 - residue));
                ctx.restore();
            }
        }
        ctx.restore();
    }
}
