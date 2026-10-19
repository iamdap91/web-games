import { sampleLocalCharge } from './charge-effects.js';
import { beamChargePoint, sampleKi } from './ki-sampling.js';
import { startX, groundY, stageWidth, stageHeight } from './pose-drawing.js';
export function hasFocusLines(motion) {
    return hasBetaFlash(motion) || motion.ki?.style === 'beam';
}
export function hasBetaFlash(motion) {
    return motion.id === 'cheolsango' || motion.id === 'charged-uppercut';
}
function preparationFocus(snapshot, scale) {
    const definition = snapshot.motion.ki;
    if (definition?.style === 'beam') {
        const remainingMs = definition.releaseMs - snapshot.elapsedMs;
        if (remainingMs <= 0 || remainingMs > 80)
            return;
        const point = beamChargePoint(definition, sampleKi(definition, snapshot.elapsedMs));
        return {
            x: startX + point.x * scale,
            y: groundY + point.y * scale,
            remainingMs,
        };
    }
    const charge = sampleLocalCharge(snapshot, {
        scale,
        showMovement: true,
        enabled: true,
    });
    return charge?.phase === 'charge' && charge.remainingMs <= 80
        ? charge
        : undefined;
}
/** 같은 준비 시각·초점에서 먹선과 베타를 비교하고 공격 진입에 해제한다. */
export function sampleFocusLines(snapshot, options) {
    if (!options.showMovement ||
        snapshot.waiting ||
        !hasFocusLines(snapshot.motion))
        return;
    const beta = !!options.showBetaFlash && hasBetaFlash(snapshot.motion);
    if (!options.showFocusLines && !beta)
        return;
    const focus = preparationFocus(snapshot, options.scale);
    if (!focus)
        return;
    const progress = 1 - focus.remainingMs / 80;
    const opacity = beta
        ? Math.min(1, (1 - progress) * 5) * 0.38
        : options.showLocalCharge
            ? 0.18
            : 0.27;
    return {
        x: focus.x,
        y: focus.y,
        progress,
        scale: options.scale,
        mode: beta ? 'beta' : 'ink',
        opacity: Math.min(1, progress * 5) * opacity,
    };
}
export function drawFocusLines(ctx, sample, exclusion, bounds = { left: 0, top: 0, right: stageWidth, bottom: stageHeight }) {
    ctx.save();
    ctx.globalAlpha *= sample.opacity;
    const beta = sample.mode === 'beta';
    if (beta) {
        // 중앙을 둥글게 도려내지 않고 배경이 읽히는 농도로 먹을 퍼뜨린다.
        const wash = ctx.createRadialGradient(sample.x, sample.y, 18 * sample.scale, sample.x, sample.y, 96 * sample.scale);
        wash.addColorStop(0, '#15191d00');
        wash.addColorStop(0.3, '#15191d12');
        wash.addColorStop(0.68, '#15191d85');
        wash.addColorStop(1, '#15191d');
        ctx.fillStyle = wash;
        ctx.fillRect(bounds.left - 2, bounds.top - 2, bounds.right - bounds.left + 4, bounds.bottom - bounds.top + 4);
    }
    const clip = new Path2D();
    clip.rect(bounds.left - 2, bounds.top - 2, bounds.right - bounds.left + 4, bounds.bottom - bounds.top + 4);
    clip.rect(exclusion.left, exclusion.top, exclusion.right - exclusion.left, exclusion.bottom - exclusion.top);
    ctx.clip(clip, 'evenodd');
    ctx.fillStyle = beta ? '#293235' : '#493a33';
    if (beta)
        ctx.globalAlpha *= 0.65;
    const betaLineCount = 24;
    const angles = beta
        ? Array.from({ length: betaLineCount }, (_, index) => (index / betaLineCount) * Math.PI * 2 + Math.sin(index * 3.1) * 0.08)
        : [-2.96, -2.45, -1.95, -1.45, -0.6, 0.15, 0.65, 2.7];
    for (const [index, angle] of angles.entries()) {
        // 길이가 다른 뾰족한 먹선으로 원형 경계를 풀고 자세 주변은 비운다.
        const inner = (beta
            ? 24 - sample.progress * 6 + (index % 5) * 3
            : 34 - sample.progress * 10 + (index % 3) * 4) * sample.scale;
        const outer = (82 + ((index * 7) % 31)) * sample.scale;
        const width = (beta ? 1 + (index % 4) * 0.6 : index % 3 === 0 ? 1.15 : 0.7) *
            sample.scale;
        const x = Math.cos(angle), y = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(sample.x + x * inner, sample.y + y * inner);
        ctx.lineTo(sample.x + x * outer - y * width, sample.y + y * outer + x * width);
        ctx.lineTo(sample.x + x * (outer - 8 * sample.scale), sample.y + y * (outer - 8 * sample.scale));
        ctx.lineTo(sample.x + x * outer + y * width * 0.45, sample.y + y * outer - x * width * 0.45);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
