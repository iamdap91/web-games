function unit(value) {
    return Math.max(0, Math.min(1, value));
}
function path(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index)
            ctx.lineTo(point.x, point.y);
        else
            ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
}
function lobeOutline(age, index, radius) {
    return Array.from({ length: 88 }, (_, point) => {
        const angle = (point / 88) * Math.PI * 2;
        const lobes = 1 +
            Math.cos(angle * 5 + index * 1.7) * 0.13 +
            Math.sin(angle * 3 - age * 2.3) * 0.09;
        const leadingEdge = Math.max(0, Math.cos(angle - index * 0.9));
        const fold = Math.sin(angle * 2 + age * 3.2 + index) * radius * 0.1;
        return {
            x: Math.cos(angle) * radius * lobes + fold,
            y: Math.sin(angle) * radius * (0.87 + leadingEdge * 0.12) * lobes,
        };
    });
}
/** 암부를 단순 회전 텍스처로 붙이지 않고 안쪽으로 말리는 면의 폭·반경을 함께 바꾼다. */
function shadowFold(ctx, radius, turn, width, color) {
    const outer = [];
    const inner = [];
    for (let index = 0; index <= 34; index++) {
        const t = index / 34;
        const angle = turn + t * Math.PI * 1.46;
        const distance = radius * (0.9 - t * 0.69);
        const band = width *
            Math.sin(t * Math.PI) ** 0.55 *
            (0.8 + Math.cos(turn + t * 2) * 0.2);
        outer.push({
            x: Math.cos(angle) * (distance + band),
            y: Math.sin(angle) * (distance + band) * 0.85,
        });
        inner.unshift({
            x: Math.cos(angle) * (distance - band),
            y: Math.sin(angle) * (distance - band) * 0.85,
        });
    }
    path(ctx, [...outer, ...inner]);
    ctx.fillStyle = color;
    ctx.fill();
}
function drawLobe(ctx, index, options) {
    const start = 840 + index * 76;
    const age = (options.timeMs - start) / 1000;
    const lifetime = 2.2 + (index % 3) * 0.12;
    if (age <= 0 || age >= lifetime)
        return false;
    const phase = age / lifetime;
    const growth = 1 - (1 - unit(age / (0.26 + (index % 3) * 0.055))) ** 3;
    const release = unit((phase - 0.66) / 0.34);
    const side = index % 2 ? -1 : 1;
    const radius = (35 + (index % 3) * 13) * (0.27 + growth * 0.73) * (1 - release * 0.35);
    const motion = options.reducedMotion ? 0.35 : 1;
    const x = 613 + side * (index * 13 + growth * 27 + age * 19) * motion;
    const y = 397 -
        growth * (33 + (index % 4) * 18) -
        age * (21 + (index % 3) * 7) * motion;
    const compression = options.enhanced
        ? Math.sin(age * 6 + index * 1.7) * Math.exp(-age * 1.2) * 0.22
        : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= Math.min(1, age / 0.07) * (1 - release);
    // 높이와 폭을 반대로 바꿔 발생 직후 눌림과 재팽창의 시점을 덩어리마다 나눈다.
    ctx.transform(1 + compression, 0, Math.sin(age * 2.2 + index) * 0.24 * motion, 1 - compression, 0, 0);
    if (!options.enhanced) {
        ctx.fillStyle = '#a6a38f';
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.84, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
    }
    const silhouette = lobeOutline(age, index, radius);
    path(ctx, silhouette);
    ctx.fillStyle = '#a9ada3';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const turn = index * 0.93 + age * (options.reducedMotion ? 0.55 : 1.8);
    shadowFold(ctx, radius, turn, radius * 0.43, '#535e60');
    ctx.save();
    ctx.translate(radius * 0.16, -radius * 0.16);
    shadowFold(ctx, radius * 0.68, turn + 0.72, radius * 0.2, '#78847f');
    ctx.restore();
    // 밝은 면은 소용돌이를 하나 더 얹지 않고 위쪽으로 노출된 얇은 표면에만 남긴다.
    const upper = silhouette.slice(47, 83);
    path(ctx, [
        ...upper,
        ...[...upper]
            .reverse()
            .map((point) => ({ x: point.x * 0.84, y: point.y + radius * 0.18 })),
    ]);
    ctx.fillStyle = '#d1d2bc';
    ctx.fill();
    ctx.restore();
    path(ctx, silhouette);
    ctx.strokeStyle = '#c6c8b480';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
    return true;
}
/** 각 덩어리의 나이로 구성해 반복·내보내기에 입자 이력을 남기지 않는다. */
export function drawRollingSmoke(ctx, options) {
    let count = 0;
    // 뒤 덩어리부터 그리고 내부 암부는 각자의 외곽 안쪽에만 둔다.
    for (const index of [6, 7, 4, 5, 2, 3, 0, 1])
        if (drawLobe(ctx, index, options))
            count++;
    return count;
}
