import { drawTeleportTraces } from './teleport-presentation.js';
import { finisherTargetX } from './finisher-actors.js';
import { groundY, startX } from './pose-drawing.js';
function chargeAmount(snapshot) {
    let timeMs = 0;
    let startMs;
    let holdMs = 0;
    for (const step of snapshot.motion.steps) {
        if (step.emphasis === 'charge') {
            startMs = timeMs;
            holdMs = step.durationMs;
        }
        if (step.contact && startMs !== undefined) {
            if (snapshot.elapsedMs >= startMs && snapshot.elapsedMs < timeMs)
                return smooth((snapshot.elapsedMs - startMs) / holdMs);
            startMs = undefined;
        }
        timeMs += step.durationMs;
    }
    return 0;
}
function smooth(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}
/** 흔적과 방출은 기존 접촉만 읽는다. 동시에 닿는 협공은 한 결산 무늬로 묶는다. */
export function sampleFinisherSignature(snapshot, contacts, options) {
    const last = contacts.at(-1);
    const finalGroup = last
        ? contacts.filter((contact) => Math.abs(contact.plannedTimeMs - last.plannedTimeMs) < 0.01 &&
            (!options.connectedOnly || contact.connected))
        : [];
    const points = finalGroup.length ? finalGroup : last ? [last] : [];
    const center = points.length
        ? {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        }
        : {
            x: startX + finisherTargetX * options.scale,
            y: groundY - 38 * options.scale,
        };
    const finalTimeMs = finalGroup.length
        ? Math.max(...finalGroup.map((contact) => options.connectedOnly ? contact.timeMs : contact.plannedTimeMs))
        : Infinity;
    const age = snapshot.elapsedMs - finalTimeMs;
    return {
        charge: chargeAmount(snapshot),
        releaseAgeMs: age >= 0 ? age : undefined,
        finalGroup,
        center,
    };
}
function stroke(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
}
function contactTime(contact, state) {
    return state.connectedOnly ? contact.timeMs : contact.plannedTimeMs;
}
function visibleContacts(state) {
    return state.contacts.filter((contact) => !state.connectedOnly || contact.connected);
}
function drawCharge(ctx, snapshot, state, options) {
    const intro = state.definition.theme === 'drunken-tiger' &&
        state.beat.emphasis === 'intro';
    if (!intro && !state.signature.charge && snapshot.step.emphasis !== 'charge')
        return;
    const progress = intro ? state.progress : state.signature.charge;
    const x = startX + snapshot.x * options.scale;
    const y = groundY + (snapshot.y - 30) * options.scale;
    const radius = (52 - progress * 18) * options.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = state.definition.accent;
    ctx.globalAlpha *= 0.16 + progress * 0.38;
    ctx.lineWidth = 2.5;
    if (state.definition.theme === 'drunken-tiger') {
        // 시동은 한 바퀴씩 좁아지는 나선이며 공격 그림은 앞에서 선명하게 남긴다.
        const points = Array.from({ length: 57 }, (_, index) => {
            const t = index / 56;
            const angle = t * Math.PI * 5 + progress * Math.PI * 2;
            return {
                x: Math.cos(angle) * radius * (0.5 + t * 0.5),
                y: (t - 0.5) * 62 * options.scale + Math.sin(angle) * radius * 0.2,
            };
        });
        stroke(ctx, points);
        ctx.globalAlpha *= 0.65;
        ctx.strokeStyle = '#fff1d0';
        ctx.lineWidth = 0.9;
        ctx.stroke();
    }
    else {
        for (const offset of [0, Math.PI]) {
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.75, -0.4, offset + progress, offset + progress + 1.6);
            ctx.stroke();
        }
    }
    ctx.restore();
}
function drawThreads(ctx, snapshot, state, options) {
    const recent = visibleContacts(state)
        .filter((contact) => {
        const age = snapshot.elapsedMs - contactTime(contact, state);
        return age >= 0 && age < 900;
    })
        .slice(-8);
    const incomingAlpha = ctx.globalAlpha;
    for (const [index, contact] of recent.entries()) {
        const age = snapshot.elapsedMs - contactTime(contact, state);
        const squeeze = 1 - state.signature.charge * 0.65;
        const length = (32 + index * 6) * options.scale * squeeze;
        const angle = (index % 2 ? -0.22 : 0.2) + contact.directionY * 0.3;
        ctx.globalAlpha = incomingAlpha * (1 - age / 900) * 0.42;
        stroke(ctx, [
            {
                x: contact.x - contact.directionX * length,
                y: contact.y - Math.sin(angle) * length,
            },
            {
                x: contact.x + contact.directionX * length * 0.22,
                y: contact.y + Math.sin(angle) * length * 0.22,
            },
        ]);
        ctx.save();
        ctx.globalAlpha *= 0.65;
        ctx.strokeStyle = '#ffe4db';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
    }
}
function drawPressure(ctx, state, options) {
    ctx.save();
    const progress = state.hitCount / Math.max(1, state.totalHits);
    const radius = (37 - progress * 15) * options.scale;
    const center = state.signature.center;
    ctx.globalAlpha *= 0.12 + progress * 0.18;
    ctx.lineWidth = 2;
    for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(center.x + sign * radius, center.y - 32 * options.scale);
        ctx.bezierCurveTo(center.x + sign * radius * 1.5, center.y - 18 * options.scale, center.x + sign * radius * 1.5, center.y + 18 * options.scale, center.x + sign * radius, center.y + 32 * options.scale);
        ctx.stroke();
    }
    ctx.restore();
}
function drawRisingWake(ctx, snapshot, state, options) {
    const incomingAlpha = ctx.globalAlpha;
    for (const contact of visibleContacts(state).slice(-2)) {
        if (contact.reaction !== 'rising')
            continue;
        const age = snapshot.elapsedMs - contactTime(contact, state);
        if (age < 0 || age > 320)
            continue;
        const progress = age / 320;
        const height = (24 + progress * 45) * options.scale;
        ctx.globalAlpha = incomingAlpha * (1 - progress) * 0.48;
        ctx.lineWidth = (1 - progress) * 5 + 1;
        ctx.beginPath();
        ctx.moveTo(contact.x - contact.directionX * 14 * options.scale, contact.y + 22 * options.scale);
        ctx.bezierCurveTo(contact.x + contact.directionX * 30 * options.scale, contact.y, contact.x - contact.directionX * 20 * options.scale, contact.y - height * 0.7, contact.x, contact.y - height);
        ctx.stroke();
    }
}
/** 각 기술의 공간 흔적은 배우 뒤에 두어 손발·얼굴의 대비를 보존한다. */
export function drawFinisherField(ctx, snapshot, state, options) {
    ctx.save();
    ctx.strokeStyle = state.definition.accent;
    ctx.lineWidth = 1.5;
    if (state.definition.theme !== 'drunken-tiger')
        drawCharge(ctx, snapshot, state, options);
    const rushing = state.beat.emphasis === 'rush' || state.beat.emphasis === 'climax';
    if (options.showContacts !== false && rushing) {
        if (state.definition.theme === 'demon')
            drawThreads(ctx, snapshot, state, options);
        if (state.definition.theme === 'omnislash')
            drawTeleportTraces(ctx, snapshot, {
                scale: options.scale,
                accent: state.definition.accent,
            });
        if (state.definition.theme === 'dragon')
            drawPressure(ctx, state, options);
    }
    if (options.showContacts !== false && state.definition.theme === 'dragon')
        drawRisingWake(ctx, snapshot, state, options);
    ctx.restore();
}
/** 최종 동시 접촉을 한 번만 방출한다. 장식의 잔향은 명중 수를 다시 올리지 않는다. */
export function drawFinisherRelease(ctx, state, options) {
    const age = state.signature.releaseAgeMs;
    if (age === undefined || age > 360 || options.showContacts === false)
        return;
    const progress = age / 360;
    const strength = (1 - progress) ** 2;
    const { x, y } = state.signature.center;
    const radius = (12 + Math.sqrt(progress) * 48) * options.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = state.definition.accent;
    ctx.lineWidth = 2 + strength * 2;
    ctx.globalAlpha *= strength * 0.85;
    const theme = state.definition.theme;
    if (theme === 'omnislash') {
        // 지상에서 모은 마지막 상승권의 방향을 따른다.
        stroke(ctx, [
            { x: -radius * 0.24, y: radius * 0.5 },
            { x: radius * 0.12, y: -radius * 1.4 },
        ]);
        for (const angle of [-0.7, 0.55])
            stroke(ctx, [
                { x: -radius * Math.cos(angle), y: -radius * Math.sin(angle) },
                { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
            ]);
    }
    else if (theme === 'drunken-tiger') {
        for (const angle of [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6]) {
            ctx.beginPath();
            ctx.arc(0, 0, radius, angle - 0.26, angle + 0.26);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(0, groundY - y, radius * 1.3, radius * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    else if (theme === 'dragon') {
        for (const sign of [-1, 1])
            stroke(ctx, [
                { x: sign * radius * 0.65, y: radius * 0.3 },
                { x: sign * radius * 0.2, y: -radius * 1.6 },
            ]);
    }
    else {
        for (let index = 0; index < 8; index++) {
            const angle = (index * Math.PI) / 4 + 0.18;
            stroke(ctx, [
                {
                    x: Math.cos(angle) * radius * 0.25,
                    y: Math.sin(angle) * radius * 0.25,
                },
                { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.65 },
            ]);
        }
    }
    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = '#fff1d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.28, radius * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
