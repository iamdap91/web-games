import { groundY } from './pose-drawing.js';
import { drawCombatEffectSprite } from './combat-effect-sprites.js';
/** 빈 박자는 비워 두고 실제 여덟 접촉에서만 같은 방향의 효과를 만든다. */
function impacts(frame) {
    const { snapshot, finisher, options } = frame;
    if (finisher.definition.theme !== 'drunken-tiger' ||
        !options.showMovement ||
        options.showContacts === false ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs)
        return [];
    return finisher.contacts.flatMap((contact) => {
        if (finisher.connectedOnly && !contact.connected)
            return [];
        const ageMs = snapshot.elapsedMs -
            (finisher.connectedOnly ? contact.timeMs : contact.plannedTimeMs);
        const final = contact === finisher.contacts.at(-1);
        const lifetimeMs = final ? 180 : contact.kind === 'shoulder' ? 130 : 85;
        return ageMs >= 0 && ageMs < lifetimeMs
            ? [{ contact, ageMs, progress: ageMs / lifetimeMs, final }]
            : [];
    });
}
/** 등·어깨가 실린 두 접촉만 바닥 가까이에 낮은 비산을 남긴다. */
export function drawDrunkenConceptBackdrop(ctx, frame) {
    const { scale } = frame.options;
    for (const impact of impacts(frame)) {
        if (impact.contact.kind !== 'shoulder' || impact.ageMs < 12)
            continue;
        const { contact, progress, final } = impact;
        ctx.save();
        ctx.globalAlpha *= (1 - progress) ** 2 * (final ? 0.6 : 0.35);
        ctx.fillStyle = '#c7ad82';
        for (let index = 0; index < (final ? 7 : 4); index++) {
            const distance = (5 + index * 3 + progress * (final ? 18 : 10)) * scale;
            const x = contact.x + contact.directionX * distance;
            const y = groundY - Math.sin(progress * Math.PI) * (1 + (index % 3)) * scale;
            ctx.fillRect(x, y, (1 + (index % 2)) * scale, scale * 0.7);
        }
        ctx.restore();
    }
}
/** 앞뒤의 실제 힘 방향만 짧은 파편으로 남겨 몸을 감싸는 고리를 만들지 않는다. */
export function drawDrunkenConceptOverlay(ctx, frame) {
    const { scale } = frame.options;
    for (const { contact, ageMs, progress, final } of impacts(frame)) {
        const shoulder = contact.kind === 'shoulder';
        if (shoulder &&
            drawCombatEffectSprite(ctx, frame.frames, {
                sheet: 'shoulder-crush',
                ageMs,
                durationMs: final ? 180 : 130,
                x: contact.x,
                y: contact.y,
                scale,
                size: final ? 1.2 : 0.85,
                directionX: contact.directionX,
            }))
            continue;
        const width = shoulder ? (final ? 18 : 12) : 8;
        const height = shoulder ? 3.5 : 5;
        ctx.save();
        ctx.translate(contact.x, contact.y);
        ctx.scale(contact.directionX * scale, scale);
        ctx.globalAlpha *= (1 - progress) ** 2 * (final ? 0.95 : 0.75);
        // 접촉핵을 짧게 남기고 진행 쪽 파편은 다음 빈 박자 전에 걷는다.
        ctx.fillStyle = '#fff0cf';
        ctx.beginPath();
        ctx.moveTo(-width * 0.35, 0);
        ctx.lineTo(0, -height);
        ctx.lineTo(width * (0.7 + progress * 0.8), 0);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c5a268';
        ctx.lineWidth = final ? 1.2 : 0.8;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(width * (0.3 + progress), side * height);
            ctx.lineTo(width * (1.1 + progress * 1.5), side * height * (1.2 + progress));
            ctx.stroke();
        }
        ctx.restore();
    }
}
