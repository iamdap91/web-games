import { contactPoint } from './contact-geometry.js';
import { drawCombatEffectSprite } from './combat-effect-sprites.js';
import { sampleComboMotion } from './player.js';
import { groundY } from './pose-drawing.js';
/** 손과 발이 실제 내려온 시각에만 바닥에 짧은 충격을 남긴다. */
export function drawImpactAttackGround(ctx, snapshot, frames, options) {
    const demon = snapshot.motion.id === 'finisher-demon';
    const aerial = snapshot.motion.id === 'aerial-smash' || demon;
    if ((!aerial && snapshot.motion.id !== 'martial-stomp') ||
        (demon && (!options.showFinisher || !options.showFinisherConcept)) ||
        !options.showMovement ||
        !options.showContacts ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs)
        return;
    let contactMs;
    let stepStartMs = 0;
    for (const step of snapshot.motion.steps) {
        if (step.contact &&
            (!demon || step.motion === 'presentation-aerial-smash-south-east')) {
            contactMs = stepStartMs;
            if (!demon)
                break;
        }
        stepStartMs += step.durationMs;
    }
    if (contactMs === undefined)
        return;
    const ageMs = snapshot.elapsedMs - contactMs;
    const lifetimeMs = aerial ? 190 : 150;
    if (ageMs < 0 || ageMs >= lifetimeMs)
        return;
    const pose = sampleComboMotion(snapshot.motion, contactMs);
    const point = contactPoint(pose, options);
    if (!point)
        return;
    ctx.save();
    ctx.globalAlpha *= snapshot.opacity;
    const drawn = drawCombatEffectSprite(ctx, frames, {
        sheet: 'ground-impact',
        ageMs,
        durationMs: lifetimeMs,
        x: point.x,
        // 손의 접촉점이 떠 있어도 지면 파열은 바닥에 고정한다.
        y: groundY,
        scale: options.scale,
        directionX: (pose.step.contact?.reach ?? 0) < 0 ? -1 : 1,
    });
    ctx.restore();
    if (drawn)
        return;
    const progress = ageMs / lifetimeMs;
    const spread = 1 - (1 - progress) ** 2;
    const scale = options.scale;
    ctx.save();
    ctx.globalAlpha *= snapshot.opacity * (1 - progress) ** 1.4;
    ctx.strokeStyle = '#f0d8a2';
    ctx.lineWidth = scale * (aerial ? 1.4 : 1);
    ctx.beginPath();
    ctx.ellipse(point.x, groundY + 2, (5 + spread * (aerial ? 30 : 23)) * scale, (1 + spread * 3) * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 0; index < (aerial ? 10 : 7); index++) {
        const side = index % 2 ? -1 : 1;
        const distance = (3 + spread * (6 + index * 1.8)) * scale;
        const rise = Math.sin(progress * Math.PI) * (2 + (index % 3) * 2) * scale;
        const size = index % 3 ? 1 : 2;
        ctx.fillStyle = index % 2 ? '#d3ac78' : '#f0d6aa';
        ctx.fillRect(Math.round(point.x + side * distance), Math.round(groundY - rise - size * scale), size * scale, scale);
    }
    ctx.restore();
}
