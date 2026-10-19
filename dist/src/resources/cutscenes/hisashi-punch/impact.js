const outerScale = 10;
const strokes = [
    { angle: -1.16, reach: 51, width: 15, bend: 0.28 },
    { angle: -0.45, reach: 61, width: 20, bend: -0.22 },
    { angle: 0.13, reach: 44, width: 14, bend: 0.31 },
    { angle: 0.82, reach: 36, width: 17, bend: -0.27 },
    { angle: 1.65, reach: 23, width: 13, bend: 0.34 },
    { angle: 2.55, reach: 33, width: 16, bend: -0.3 },
    { angle: -2.45, reach: 42, width: 15, bend: 0.26 },
];
function grain(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function polar(angle, radius) {
    return {
        x: Math.cos(angle) * radius * 1.15,
        y: Math.sin(angle) * radius * 0.9,
    };
}
/** 중심선은 완만하게 휘고, 잘게 뜯긴 자국은 가장자리에만 둔다. */
function drawStrokeSection(ctx, stroke, section, spread, seed) {
    const left = [];
    const right = [];
    for (let i = 0; i <= 10; i++) {
        const t = section.start + ((section.end - section.start) * i) / 10;
        const angle = stroke.angle + Math.sin(t * Math.PI) * stroke.bend;
        const radius = 32 + (stroke.reach * outerScale * (0.7 + spread * 0.3) - 32) * t;
        const center = polar(angle, radius);
        const width = stroke.width * (1 - t) ** 1.15 + 1.5;
        const endWeight = i === 10 ? 0.25 : i === 0 && section.start > 0 ? 0.6 : 1;
        const leftEdge = width * endWeight * (i === 7 ? 0.45 : 0.8 + grain(seed + i * 31) * 0.35);
        const rightEdge = width * endWeight * (i === 4 ? 0.5 : 0.75 + grain(seed + i * 53) * 0.4);
        const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
        left.push({
            x: center.x + normal.x * leftEdge,
            y: center.y + normal.y * leftEdge,
        });
        right.push({
            x: center.x - normal.x * rightEdge,
            y: center.y - normal.y * rightEdge,
        });
    }
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (const vertex of [...left.slice(1), ...right.reverse()])
        ctx.lineTo(vertex.x, vertex.y);
    ctx.closePath();
    ctx.fill();
}
function drawBlot(ctx, center, radius, seed) {
    const vertices = Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        const edge = radius * (0.5 + grain(seed + index * 17) * 0.8);
        return {
            x: center.x + Math.cos(angle) * edge,
            y: center.y + Math.sin(angle) * edge,
        };
    });
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    ctx.beginPath();
    ctx.moveTo((first.x + last.x) / 2, (first.y + last.y) / 2);
    for (const [index, vertex] of vertices.entries()) {
        const next = vertices[(index + 1) % vertices.length];
        ctx.quadraticCurveTo(vertex.x, vertex.y, (vertex.x + next.x) / 2, (vertex.y + next.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
}
/** 타점에서 뭉친 먹이 비대칭으로 갈라지고, 뜯긴 붓결과 조각으로 흩어진다. */
export function drawImpact(ctx, options) {
    const { point, progress, reducedMotion } = options;
    const spread = reducedMotion ? 0 : 1 - (1 - progress) ** 3;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.globalAlpha *= (1 - progress) ** 0.7;
    ctx.fillStyle = '#101112';
    ctx.beginPath();
    ctx.rect(-140 * outerScale, -100 * outerScale, 280 * outerScale, 200 * outerScale);
    ctx.ellipse(6, -8, 34, 32, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    for (const [index, stroke] of strokes.entries()) {
        if (reducedMotion && index % 2 !== 0)
            continue;
        const seed = 700 + index * 113;
        const firstBreak = 0.23 + grain(seed + 1) * 0.13;
        const secondBreak = 0.56 + grain(seed + 2) * 0.13;
        const sections = [
            { start: 0, end: firstBreak },
            { start: firstBreak + 0.035 + grain(seed + 3) * 0.03, end: secondBreak },
            { start: secondBreak + 0.045 + grain(seed + 4) * 0.05, end: 0.88 },
            { start: 0.92 + grain(seed + 5) * 0.025, end: 1 },
        ];
        for (const [sectionIndex, section] of sections.entries())
            drawStrokeSection(ctx, stroke, section, spread, seed + sectionIndex * 71);
    }
    for (let i = 0; i < 15; i++) {
        if (reducedMotion && i % 2 !== 0)
            continue;
        const seed = 1500 + i * 37;
        const angle = grain(seed) * Math.PI * 2;
        const radius = (30 + grain(seed + 1) * 42) * (1 + spread * 0.25);
        drawBlot(ctx, polar(angle, radius), 7 + grain(seed + 2) * 15, seed + 3);
    }
    for (let i = 0; i < 18; i++) {
        if (reducedMotion && i % 2 !== 0)
            continue;
        const seed = 2500 + i * 47;
        const angle = -2.8 + grain(seed) * 5.6;
        const radius = (80 + grain(seed + 1) ** 1.3 * 440) * (0.7 + spread * 0.45);
        drawBlot(ctx, polar(angle, radius), 3 + grain(seed + 2) * 9, seed + 3);
    }
    ctx.restore();
}
