import { groundY, startX } from './pose-drawing.js';
/** 소실 중에는 출발점에 머물고 공백이 끝난 뒤 도착점의 준비 그림을 드러낸다. */
export function teleportOpacity(pose) {
    const progress = Math.max(0, Math.min(1, pose.stepElapsedMs / pose.step.durationMs));
    switch (pose.step.teleport) {
        case 'vanish':
            return 1 - progress;
        case 'hidden':
            return 0;
        case 'appear':
            return progress;
        default:
            return 1;
    }
}
/** 위치 사이를 잇지 않고 출발·도착점 주변의 짧은 파편만 남긴다. */
export function drawTeleportTraces(ctx, pose, options) {
    let startMs = 0;
    for (const step of pose.motion.steps) {
        const age = pose.elapsedMs - startMs;
        startMs += step.durationMs;
        if (age < 0 ||
            age >= 110 ||
            (step.teleport !== 'vanish' && step.teleport !== 'appear'))
            continue;
        const progress = age / 110;
        const direction = step.teleport === 'appear' ? 1 : -1;
        const spread = (3 + progress * 9) * options.scale;
        const x = startX + step.x * options.scale;
        const y = groundY + ((step.y ?? 0) - 28) * options.scale;
        ctx.save();
        ctx.globalAlpha *= (1 - progress) * 0.7;
        ctx.strokeStyle = options.accent;
        ctx.lineWidth = 2;
        for (const index of [-2, -1, 0, 1, 2]) {
            const side = index % 2 ? -1 : 1;
            const left = x + side * spread;
            const top = y + index * 9 * options.scale;
            ctx.beginPath();
            ctx.moveTo(left, top);
            ctx.lineTo(left + direction * (3 + Math.abs(index)) * options.scale, top - (5 - Math.abs(index)) * options.scale);
            ctx.stroke();
        }
        ctx.strokeStyle = '#e5f7ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 14 * options.scale);
        ctx.lineTo(x + direction * 2 * options.scale, y + 14 * options.scale);
        ctx.stroke();
        ctx.restore();
    }
}
