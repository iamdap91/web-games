import { visibleInkTrailPoints, } from './ink-trail-types.js';
import { drawWithTextureErosion } from './texture-erosion.js';
function grain(index, seed) {
    let value = Math.imul(index + seed, 374761393);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}
function brushPoints(sample, timeMs) {
    const visible = visibleInkTrailPoints(sample.points, timeMs, sample.lifetimeMs);
    const points = [];
    for (let index = 1; index < visible.length; index++) {
        const previous = visible[index - 1];
        const next = visible[index];
        const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
        const divisions = Math.max(2, Math.ceil(distance / 4));
        for (let part = 0; part < divisions; part++) {
            const progress = part / divisions;
            points.push({
                x: previous.x + (next.x - previous.x) * progress,
                y: previous.y + (next.y - previous.y) * progress,
                timeMs: previous.timeMs + (next.timeMs - previous.timeMs) * progress,
            });
        }
    }
    const last = visible.at(-1);
    if (last)
        points.push(last);
    if (points.length < 2)
        return [];
    return points.map((point, index) => {
        const before = points[Math.max(0, index - 1)];
        const after = points[Math.min(points.length - 1, index + 1)];
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const length = Math.hypot(dx, dy) || 1;
        const age = Math.max(0, Math.min(1, (timeMs - point.timeMs) / sample.lifetimeMs));
        const along = index / (points.length - 1);
        const taper = Math.min(1, along / 0.18, (1 - along) / 0.08);
        // 같은 시각의 붓결을 보존하고 오래된 끝부터 가는 붓털로 흩어진다.
        const roughness = 0.68 + grain(Math.floor(point.timeMs / 11), sample.seed) * 0.38;
        return {
            ...point,
            nx: -dy / length,
            ny: dx / length,
            radius: sample.width * 0.5 * taper * (1 - age * 0.72) * roughness,
        };
    });
}
function edge(point, side) {
    return {
        x: point.x + point.nx * point.radius * side,
        y: point.y + point.ny * point.radius * side,
    };
}
function brushMask(points, seed) {
    const path = new Path2D();
    const outline = [
        ...points.map((point) => edge(point, 1)),
        ...[...points].reverse().map((point) => edge(point, -1)),
    ];
    for (const [index, point] of outline.entries()) {
        if (index === 0)
            path.moveTo(point.x, point.y);
        else
            path.lineTo(point.x, point.y);
    }
    path.closePath();
    // 진행 방향으로 긴 빈틈을 내며 이미 그린 몸과 배경은 지우지 않는다.
    for (let index = 2; index < points.length - 3; index += 4) {
        const first = points[index];
        const last = points[Math.min(points.length - 2, index + 3)];
        const side = grain(index, seed) * 1.2 - 0.6;
        const slit = 0.05 + grain(index, seed + 37) * 0.12;
        const a = edge(first, side - slit);
        const b = edge(last, side - slit * 0.4);
        const c = edge(last, side + slit * 0.4);
        const d = edge(first, side + slit);
        path.moveTo(a.x, a.y);
        path.lineTo(b.x, b.y);
        path.lineTo(c.x, c.y);
        path.lineTo(d.x, d.y);
        path.closePath();
    }
    return path;
}
function drawBrush(ctx, sample, points, timeMs) {
    const first = points[0];
    const last = points.at(-1);
    const tailAge = Math.min(1, Math.max(0, (timeMs - last.timeMs) / sample.lifetimeMs));
    ctx.save();
    ctx.globalAlpha *= sample.opacity * (1 - tailAge) ** 0.65;
    const mask = brushMask(points, sample.seed);
    ctx.clip(mask, 'evenodd');
    const wash = ctx.createLinearGradient(first.x, first.y, last.x + 0.001, last.y);
    wash.addColorStop(0, '#40515355');
    wash.addColorStop(0.22, '#263538d9');
    wash.addColorStop(0.72, '#101e24');
    wash.addColorStop(1, '#192a31');
    ctx.fillStyle = wash;
    ctx.fill(mask, 'evenodd');
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'bevel';
    // 어두운 배경에서도 먹의 윤곽이 읽히도록 얇은 청백색 가장자리를 둔다.
    ctx.strokeStyle = '#d8e9e6';
    ctx.globalAlpha *= 0.72;
    ctx.lineWidth = Math.max(0.65, sample.width * 0.075);
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
        const position = edge(point, -0.62);
        if (index === 0 ||
            grain(Math.floor(point.timeMs / 17), sample.seed + 19) < 0.22)
            ctx.moveTo(position.x, position.y);
        else
            ctx.lineTo(position.x, position.y);
    }
    ctx.stroke();
    ctx.restore();
}
/** 그리기 이력 없이 탐색·정지·반복에서 같은 먹 형태를 재현한다. */
export function drawInkTrails(ctx, samples, timeMs, options) {
    if (options.sizeMultiplier <= 0)
        return;
    for (const sample of samples) {
        if (sample.layer !== options.layer)
            continue;
        const points = brushPoints(sample, timeMs);
        if (points.length < 2)
            continue;
        const first = points[0];
        const last = points.at(-1);
        const endMs = sample.points.at(-1).timeMs;
        const erosion = Math.max(0, (timeMs - endMs) / sample.lifetimeMs);
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const x = Math.min(...xs) - sample.width;
        const y = Math.min(...ys) - sample.width;
        // 현재 손발·기공에 닿은 끝점을 고정해 궤적만 키우고 붓결 검사량은 유지한다.
        ctx.save();
        ctx.translate(last.x, last.y);
        ctx.scale(options.sizeMultiplier, options.sizeMultiplier);
        ctx.translate(-last.x, -last.y);
        drawWithTextureErosion(ctx, {
            bounds: {
                x,
                y,
                width: Math.max(...xs) - x + sample.width,
                height: Math.max(...ys) - y + sample.width,
            },
            progress: options.showErosion ? erosion * 0.85 : 0,
            seed: sample.seed,
            pixelSize: 3,
            direction: { from: first, to: last },
        }, () => drawBrush(ctx, sample, points, timeMs));
        ctx.restore();
    }
}
