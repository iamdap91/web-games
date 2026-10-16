import { clamp, ellipse, line, polygon } from './ki-shapes.js';
/** 선두를 좌표에 맞추고 빛으로 된 이마·귀·벌어지는 턱을 따로 그린다. */
function tigerHead(ctx, tip, size, mouth) {
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.scale(size, size);
    ellipse(ctx, { x: -28, y: -2 }, 28, 23, '#ffc35b40');
    polygon(ctx, [
        { x: -57, y: -9 },
        { x: -48, y: -25 },
        { x: -36, y: -20 },
        { x: -28, y: -28 },
        { x: -23, y: -17 },
        { x: -10, y: -15 },
        { x: 0, y: -7 },
        { x: -3, y: -1 },
        { x: -14, y: 3 },
        { x: -31, y: 5 },
        { x: -48, y: 12 },
        { x: -43, y: 1 },
        { x: -58, y: 5 },
    ], '#e68a27');
    polygon(ctx, [
        { x: -49, y: -10 },
        { x: -44, y: -20 },
        { x: -34, y: -15 },
        { x: -28, y: -23 },
        { x: -24, y: -12 },
        { x: -10, y: -11 },
        { x: -2, y: -6 },
        { x: -15, y: 0 },
        { x: -33, y: 1 },
        { x: -47, y: 7 },
        { x: -40, y: -2 },
    ], '#ffe6a1');
    polygon(ctx, [
        { x: -34, y: 4 },
        { x: -12, y: 2 },
        { x: -5, y: 6 + mouth * 7 },
        { x: -14, y: 13 + mouth * 8 },
        { x: -34, y: 13 + mouth * 6 },
        { x: -47, y: 18 },
    ], '#ffcf65');
    polygon(ctx, [
        { x: -26, y: 3 },
        { x: -8, y: 2 },
        { x: -10, y: 5 + mouth * 6 },
        { x: -29, y: 7 + mouth * 4 },
    ], '#8c3e24');
    polygon(ctx, [
        { x: -13, y: 2 },
        { x: -10, y: 2 },
        { x: -13, y: 8 + mouth * 3 },
    ], '#fffbed');
    line(ctx, [
        { x: -30, y: -7 },
        { x: -17, y: -5 },
        { x: -22, y: -1 },
    ], '#fffbea', 2);
    line(ctx, [
        { x: -42, y: -13 },
        { x: -35, y: -6 },
        { x: -39, y: -3 },
    ], '#c97525', 2);
    line(ctx, [
        { x: -34, y: -14 },
        { x: -29, y: -9 },
    ], '#c97525', 2);
    line(ctx, [
        { x: -38, y: 8 },
        { x: -29, y: 11 },
    ], '#fff8d2', 1.3);
    ctx.restore();
}
export function drawTigerCharge(ctx, definition, sample) {
    if (sample.phase !== 'charge')
        return;
    const amount = sample.charge;
    const origin = definition.origin;
    ctx.save();
    // 주먹으로 모이는 기세와 바닥의 역류만 두어 다른 기공의 구체와 구분한다.
    for (let index = 0; index < 4; index++) {
        const cycle = (sample.timeMs / 290 + index * 0.25) % 1;
        ctx.globalAlpha = (1 - cycle) * amount * 0.75;
        const x = origin.x - 8 - cycle * 22;
        const y = origin.y + (index - 1.5) * 4;
        line(ctx, [
            { x, y: y + cycle * 3 },
            { x: origin.x + 3, y },
        ], '#ffd56b', 1.2);
    }
    ctx.globalAlpha = amount * 0.6;
    for (let index = 0; index < 2; index++) {
        const progress = (sample.timeMs / 500 + index * 0.5) % 1;
        ctx.strokeStyle = index ? '#fff3bc' : '#d58c38';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-3, 0, 15 + progress * 13, 3 + progress, -progress * 0.08, 0, Math.PI * 1.6);
        ctx.stroke();
    }
    if (definition.style === 'tiger-manifest' && amount > 0.62) {
        ctx.globalAlpha = (amount - 0.62) * 0.8;
        const point = definition.target;
        for (const sign of [-1, 1])
            line(ctx, [
                { x: point.x + sign * 16, y: point.y - 13 },
                { x: point.x + sign * 20, y: point.y },
                { x: point.x + sign * 16, y: point.y + 13 },
            ], '#cb8a38', 0.7);
    }
    ctx.restore();
}
export function drawTigerManifest(ctx, definition, sample) {
    const active = sample.hits.filter((hit) => hit.active).at(-1);
    if (!active)
        return;
    const age = active.ageMs;
    const life = clamp(age / 180);
    const index = definition.hits.indexOf(active.hit);
    ctx.save();
    ctx.globalAlpha = age < 24 ? 0.75 + age / 96 : 1 - clamp((age - 24) / 156);
    const target = active.point;
    const size = (0.75 + index * 0.07) * (1 + Math.sin(life * Math.PI) * 0.08);
    ellipse(ctx, target, 27 + life * 11, 20 + life * 9, '#f8bd4b28');
    tigerHead(ctx, { x: target.x + 18, y: target.y - 1 }, size, 1 - life);
    for (let claw = 0; claw < 3; claw++) {
        const offset = (claw - 1) * 8;
        line(ctx, [
            { x: target.x - 27 + life * 8, y: target.y - 22 + offset },
            { x: target.x - 7, y: target.y - 3 + offset },
            { x: target.x + 18 + life * 4, y: target.y + 10 + offset },
        ], claw === 1 ? '#fff9dd' : '#ffd775', 1.6 - life);
    }
    ctx.restore();
}
export function drawTigerWave(ctx, definition, sample) {
    const shot = sample.shots[0];
    if (!shot || shot.ageMs < 0)
        return;
    const coreEnd = shot.shot.arriveMs + 170;
    const residue = clamp((sample.timeMs - coreEnd) / 300);
    if (residue >= 1)
        return;
    const from = definition.origin;
    const head = shot.point;
    const length = Math.max(0, head.x - from.x);
    ctx.save();
    ctx.beginPath();
    ctx.rect(from.x - 2, -150, 240, 210);
    ctx.clip();
    const width = (9 + clamp(shot.ageMs / 75) * 5) * (1 - residue);
    if (sample.timeMs < coreEnd) {
        const top = [];
        const bottom = [];
        for (let index = 0; index <= 18; index++) {
            const progress = index / 18;
            const x = from.x + length * progress;
            const y = from.y + (head.y - from.y) * progress;
            const ripple = Math.sin(progress * 19 - sample.timeMs / 26) * 1.4;
            const spread = width * (0.38 + Math.sin(progress * Math.PI) * 0.52);
            top.push({ x, y: y - spread + ripple });
            bottom.unshift({ x, y: y + spread + ripple });
        }
        polygon(ctx, [...top, ...bottom], '#ecaa3d');
        line(ctx, [from, head], '#fff1b3', width * 0.95);
        line(ctx, [from, head], '#fffcec', width * 0.42);
        for (let strand = 0; strand < 2; strand++) {
            const points = Array.from({ length: 25 }, (_, index) => {
                const progress = index / 24;
                return {
                    x: from.x + length * progress,
                    y: from.y +
                        (head.y - from.y) * progress +
                        Math.sin(progress * Math.PI * 3 + sample.timeMs / 85 + strand * Math.PI) *
                            Math.sin(progress * Math.PI) *
                            23,
                };
            });
            line(ctx, points, strand ? '#ffe7a6' : '#d59339', strand ? 0.9 : 1.6);
        }
        tigerHead(ctx, head, 0.73 + clamp(shot.ageMs / 90) * 0.1, 0.7);
    }
    if (shot.progress > 0.65) {
        const fade = sample.timeMs < coreEnd ? 0.3 : 1 - residue;
        ctx.globalAlpha = fade;
        const points = Array.from({ length: 30 }, (_, index) => {
            const progress = index / 29;
            return {
                x: from.x + length * progress,
                y: from.y +
                    (head.y - from.y) * progress +
                    Math.sin(index * 1.25 - sample.timeMs / 55) * (2 + progress * 3),
            };
        });
        line(ctx, points, '#a3422b', 2.8 * (1 - residue * 0.6));
        line(ctx, points, '#ffc677', 0.85);
    }
    ctx.restore();
}
export function drawTigerImpact(ctx, point, ageMs, strength) {
    if (ageMs < 0 || ageMs > 190)
        return;
    const life = ageMs / 190;
    ctx.save();
    ctx.globalAlpha = (1 - life) * 0.9;
    for (let index = 0; index < 3; index++) {
        const offset = (index - 1) * 8;
        line(ctx, [
            { x: point.x - 10, y: point.y - 18 + offset },
            { x: point.x + life * 17, y: point.y + offset },
            { x: point.x + 14 + life * 15, y: point.y + 13 + offset },
        ], index === 1 ? '#fff8d3' : '#efbb59', (1 - life) * strength + 0.6);
    }
    ctx.restore();
}
