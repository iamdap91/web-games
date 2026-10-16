import { clamp, ellipse, line, polygon } from './ki-shapes.js';
/** 장전의 작은 손안 코어와 발사 때 한 번 팽창하는 외피를 구분한다. */
export function drawOrbCharge(ctx, definition, sample) {
    const point = definition.chargeOrigin ?? definition.origin;
    const releaseAge = sample.timeMs - definition.releaseMs;
    if (sample.phase !== 'charge' && (releaseAge < 0 || releaseAge > 95))
        return;
    ctx.save();
    if (sample.phase === 'charge') {
        const radius = 2 + sample.charge * 4;
        const pulse = Math.sin(sample.timeMs * 0.035);
        ctx.globalAlpha *= 0.7 + sample.charge * 0.3;
        ellipse(ctx, point, radius + 2, radius + 1, '#1d728d');
        ellipse(ctx, point, radius, radius + pulse, definition.accent);
        ellipse(ctx, point, 1.5 + sample.charge, 2, '#f1ffff');
        for (let index = 0; index < 3; index += 1) {
            const angle = index * 2.1 + sample.timeMs * 0.008;
            const distance = 8 + (1 - sample.charge) * 9;
            const outward = {
                x: point.x + Math.cos(angle) * distance,
                y: point.y + Math.sin(angle) * distance,
            };
            line(ctx, [
                outward,
                {
                    x: point.x + Math.cos(angle) * 6,
                    y: point.y + Math.sin(angle) * 6,
                },
            ], definition.accent, 1);
        }
    }
    else {
        const front = sample.shots[0]?.point.x ?? definition.origin.x;
        // 발사 섬광도 탄의 선두를 앞지르면 조기 명중처럼 보이므로 같은 경계에서 자른다.
        ctx.beginPath();
        ctx.rect(point.x - 22, point.y - 24, Math.max(0, front - point.x + 22), 48);
        ctx.clip();
        const width = 12 * (1 - releaseAge / 95);
        ctx.globalAlpha *= 1 - releaseAge / 95;
        polygon(ctx, [
            { x: point.x - 12, y: point.y - 5 },
            { x: point.x - 4, y: point.y - width },
            { x: point.x + 12, y: point.y - 3 },
            { x: point.x + 14, y: point.y + 2 },
            { x: point.x - 5, y: point.y + width },
            { x: point.x - 9, y: point.y + 4 },
        ], definition.accent);
        ellipse(ctx, point, 7, width * 0.7 + 1, '#efffff');
    }
    ctx.restore();
}
/** 탄의 선두를 판정점에 맞추고 짧은 꼬리로 비행 구체의 실루엣을 지킨다. */
export function drawOrbProjectile(ctx, shot, sample, accent) {
    if (!shot.visible)
        return;
    ctx.save();
    const radius = shot.shot.radius;
    const center = { x: shot.point.x - radius, y: shot.point.y };
    const launch = clamp(shot.ageMs / 80);
    const ripple = Math.sin(sample.timeMs * 0.04) * 0.6;
    polygon(ctx, [
        { x: center.x - radius * 0.5, y: center.y - radius * 0.7 },
        { x: center.x - radius * 2.9 * launch, y: center.y - radius * 0.3 },
        { x: center.x - radius * 1.8, y: center.y + 1 },
        { x: center.x - radius * 2.5 * launch, y: center.y + radius * 0.55 },
        { x: center.x - radius * 0.3, y: center.y + radius * 0.75 },
    ], '#1e718c');
    ellipse(ctx, center, radius, radius * 0.82 + ripple, '#164b67');
    ellipse(ctx, { x: center.x + 1, y: center.y }, radius - 1, radius * 0.71, accent);
    ellipse(ctx, { x: center.x + 2, y: center.y - 1 }, radius * 0.6, radius * 0.5, '#efffff');
    line(ctx, [
        { x: center.x - radius * 1.9, y: center.y - radius * 0.2 },
        { x: center.x - radius * 0.6, y: center.y },
    ], accent, 2);
    ctx.restore();
}
/** 장전 말미에 압축한 코어가 새 방출 자세의 손 위치로 빠르게 옮겨간다. */
export function drawBeamCharge(ctx, definition, sample) {
    if (sample.phase !== 'charge')
        return;
    ctx.save();
    const point = definition.chargeOrigin ?? definition.origin;
    const compression = clamp((sample.charge - 0.84) / 0.16);
    const radius = 3 + sample.charge * 9 - compression * 4;
    for (let index = 0; index < 5; index += 1) {
        const angle = index * 1.257 + sample.timeMs * 0.004;
        const flow = (sample.timeMs / 210 + index * 0.31) % 1;
        const distance = 8 + (1 - flow) * (18 + sample.charge * 8);
        line(ctx, [
            {
                x: point.x + Math.cos(angle) * distance,
                y: point.y + Math.sin(angle) * distance,
            },
            {
                x: point.x + Math.cos(angle) * (distance - 5),
                y: point.y + Math.sin(angle) * (distance - 5),
            },
        ], definition.accent, flow > 0.65 ? 2 : 1);
    }
    ellipse(ctx, point, radius + 2, radius + 1, '#194f76');
    ellipse(ctx, point, radius, radius * 0.85, definition.accent);
    ellipse(ctx, { x: point.x + 1, y: point.y }, radius * 0.5, radius * 0.6, '#f4ffff');
    line(ctx, [
        { x: point.x - radius - 7, y: point.y },
        { x: point.x + radius + 7, y: point.y },
    ], '#e6ffff', 1);
    ctx.restore();
}
function beamEnvelope(ctx, from, to, width, timeMs, color) {
    const upper = [];
    const lower = [];
    for (let index = 0; index <= 18; index += 1) {
        const progress = index / 18;
        const x = from.x + (to.x - from.x) * progress;
        const centerY = from.y + (to.y - from.y) * progress;
        const frontTaper = Math.min(1, (1 - progress) * 9);
        const mouth = 0.58 + Math.min(1, progress * 5) * 0.42;
        const flow = Math.sin(progress * 15 - timeMs * 0.018) * 0.08;
        const halfWidth = width * frontTaper * mouth * (1 + flow);
        upper.push({ x, y: centerY - halfWidth });
        lower.push({ x, y: centerY + halfWidth });
    }
    polygon(ctx, [...upper, ...lower.reverse()], color);
}
/** 큰 선두에서 연결된 코어로 전환하고 마지막에 포구부터 폭을 거둔다. */
export function drawBeam(ctx, definition, sample) {
    const front = sample.shots[0];
    if (!front || sample.timeMs < definition.releaseMs)
        return;
    const finalHit = definition.hits[definition.hits.length - 1];
    const sustainEnd = (finalHit?.atMs ?? front.shot.arriveMs) + 100;
    const collapse = clamp((sample.timeMs - sustainEnd) / 170);
    if (collapse >= 1)
        return;
    ctx.save();
    const releaseAge = sample.timeMs - definition.releaseMs;
    const startup = clamp(releaseAge / 75);
    const width = (10.5 + Math.sin(sample.timeMs * 0.04) * 0.7) * (1 - collapse);
    const origin = definition.origin;
    const to = front.point;
    const from = {
        x: origin.x + (to.x - origin.x) * collapse * 0.17,
        y: origin.y + (to.y - origin.y) * collapse * 0.17,
    };
    ctx.globalAlpha *= 1 - collapse * 0.65;
    beamEnvelope(ctx, from, to, width * (1.18 + startup * 0.2), sample.timeMs, '#194d7a');
    beamEnvelope(ctx, from, to, width, sample.timeMs + 20, '#4ec7f3');
    beamEnvelope(ctx, from, to, width * 0.64, sample.timeMs + 50, '#eaffff');
    // 흐름 덩어리를 앞으로 보내며 선두보다 먼저 대상에 닿지 않게 자른다.
    ctx.beginPath();
    ctx.rect(from.x - 2, Math.min(from.y, to.y) - 28, Math.max(0, to.x - from.x + 2), 56);
    ctx.clip();
    for (let index = 0; index < 5; index += 1) {
        const progress = (((releaseAge / 185 + index * 0.2) % 1) + 1) % 1;
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;
        const bandWidth = (2 + (index % 2)) * (1 - collapse);
        line(ctx, [
            { x: x - 4, y: y - width * 0.82 },
            { x: x + bandWidth, y: y - width * 0.35 },
            { x, y: y + width * 0.42 },
            { x: x - 5, y: y + width * 0.87 },
        ], index % 2 === 0 ? '#92eaff' : '#217caf', 1.5);
    }
    if (releaseAge < 135) {
        const radiusX = Math.min(16, Math.max(1, (to.x - origin.x) * 0.45));
        const center = { x: to.x - radiusX, y: to.y };
        ellipse(ctx, center, radiusX, 15 * (1 - collapse), '#9deeff');
        ellipse(ctx, { x: center.x + 2, y: center.y }, Math.max(1, radiusX - 2), 10, '#f7ffff');
    }
    ctx.restore();
}
/** 구체는 접촉면에서 납작해진 다음 옆으로 터져, 비행 구형과 구별된다. */
export function drawOrbImpact(ctx, point, ageMs, strength, accent) {
    if (ageMs < 0 || ageMs >= 240)
        return;
    ctx.save();
    const progress = clamp(ageMs / 240);
    const expansion = clamp((ageMs - 24) / 105);
    ctx.globalAlpha *= (1 - progress) ** 1.2;
    ellipse(ctx, point, 3 + expansion * 6, (10 + expansion * 9) * strength, accent);
    ellipse(ctx, point, 2 + expansion * 3, (7 + expansion * 6) * strength, '#f6ffff');
    for (const direction of [-1, 1]) {
        const reach = 8 + expansion * 19 * strength;
        polygon(ctx, [
            { x: point.x - 2, y: point.y + direction * 4 },
            { x: point.x + 5 + expansion * 6, y: point.y + direction * reach },
            { x: point.x + 1, y: point.y + direction * (reach - 7) },
            {
                x: point.x - 6 - expansion * 8,
                y: point.y + direction * (reach * 0.65),
            },
        ], accent);
    }
    if (ageMs > 45) {
        line(ctx, [
            { x: point.x + 5, y: point.y - 8 - expansion * 10 },
            { x: point.x + 17 + expansion * 10, y: point.y - 3 },
            { x: point.x + 10, y: point.y + 6 + expansion * 11 },
        ], '#d8ffff', 2);
    }
    ctx.restore();
}
/** 지속 빔의 접촉은 둥근 폭발보다 출력 방향으로 밀려나는 압력 부채로 그린다. */
export function drawBeamImpact(ctx, point, ageMs, strength, accent) {
    if (ageMs < 0 || ageMs >= 260)
        return;
    ctx.save();
    const progress = clamp(ageMs / 260);
    const expansion = clamp(ageMs / 95);
    ctx.globalAlpha *= (1 - progress) * 0.85;
    const reach = (9 + expansion * 17) * strength;
    for (const direction of [-1, 1]) {
        polygon(ctx, [
            { x: point.x - 4, y: point.y + direction * 3 },
            { x: point.x + reach * 0.65, y: point.y + direction * reach },
            { x: point.x + reach * 0.42, y: point.y + direction * 4 },
            { x: point.x + reach, y: point.y + direction * 7 },
            { x: point.x + reach * 0.55, y: point.y + direction * 1 },
        ], accent);
        line(ctx, [
            { x: point.x + 3, y: point.y + direction * 9 },
            { x: point.x + reach * 0.5, y: point.y + direction * (reach + 6) },
        ], strength > 1 ? '#fff0ba' : '#d9fbff', strength > 1 ? 2 : 1);
    }
    ellipse(ctx, point, 2 + expansion, 8 + strength * 4, '#f8ffff');
    ctx.restore();
}
