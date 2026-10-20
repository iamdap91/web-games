import { battleLayout } from './battle.js';
import { clamp, line, polygon, smooth } from './drawing.js';
// 원작의 연속 코마에서 본 고리·접힘·굵기 대비를 독자적인 여섯 윤곽으로 구성한다.
// 같은 사인파를 흔들지 않고 고정한 윤곽의 노출·압축·진행 구간을 바꾼다.
const contours = [
    [
        { x: 0, y: 0 },
        { x: 0.11, y: -0.03 },
        { x: 0.29, y: -0.52 },
        { x: 0.41, y: -0.35 },
        { x: 0.32, y: 0.08 },
        { x: 0.61, y: 0.29 },
        { x: 0.72, y: -0.12 },
        { x: 1, y: 0.03 },
    ],
    [
        { x: 0, y: 0 },
        { x: 0.15, y: 0.11 },
        { x: 0.25, y: -0.34 },
        { x: 0.37, y: -0.68 },
        { x: 0.42, y: 0.1 },
        { x: 0.66, y: -0.05 },
        { x: 0.77, y: 0.3 },
        { x: 1, y: -0.04 },
    ],
    [
        { x: 0, y: 0 },
        { x: 0.14, y: -0.11 },
        { x: 0.37, y: 0.35 },
        { x: 0.53, y: 0.24 },
        { x: 0.41, y: -0.14 },
        { x: 0.68, y: -0.53 },
        { x: 0.74, y: -0.09 },
        { x: 1, y: 0.02 },
    ],
    [
        { x: 0, y: 0 },
        { x: 0.17, y: 0.04 },
        { x: 0.29, y: 0.46 },
        { x: 0.38, y: 0.28 },
        { x: 0.41, y: -0.06 },
        { x: 0.59, y: -0.37 },
        { x: 0.77, y: 0.18 },
        { x: 1, y: -0.03 },
    ],
    [
        { x: 0, y: 0 },
        { x: 0.12, y: -0.08 },
        { x: 0.31, y: -0.18 },
        { x: 0.48, y: 0.43 },
        { x: 0.57, y: 0.11 },
        { x: 0.51, y: -0.3 },
        { x: 0.75, y: -0.41 },
        { x: 1, y: 0.04 },
    ],
    [
        { x: 0, y: 0 },
        { x: 0.15, y: 0.07 },
        { x: 0.28, y: -0.31 },
        { x: 0.45, y: -0.08 },
        { x: 0.57, y: 0.4 },
        { x: 0.71, y: 0.25 },
        { x: 0.67, y: -0.18 },
        { x: 1, y: -0.01 },
    ],
];
function curvedCoordinate(a, b, c, d, t) {
    const squared = t * t;
    const cubed = squared * t;
    return ((2 * cubed - 3 * squared + 1) * b +
        (cubed - 2 * squared + t) * (c - a) * 0.35 +
        (-2 * cubed + 3 * squared) * c +
        (cubed - squared) * (d - b) * 0.35);
}
function channelPoint(u, channel, frame) {
    const exposure = frame.reducedMotion ? 180 : 1000 / 24;
    const cell = Math.floor(channel.localMs / exposure);
    const pose = contours[(cell + channel.index * 2) % contours.length];
    const position = clamp(u) * (pose.length - 1);
    const index = Math.min(pose.length - 2, Math.floor(position));
    const a = pose[index];
    const b = pose[index + 1];
    const before = pose[Math.max(0, index - 1)];
    const after = pose[Math.min(pose.length - 1, index + 2)];
    const t = position - index;
    const point = {
        x: curvedCoordinate(before.x, a.x, b.x, after.x, t),
        y: curvedCoordinate(before.y, a.y, b.y, after.y, t),
    };
    const reach = channel.index === 1 ? 450 : 500;
    const fold = [0.88, 1.16, 0.74, 1.02][cell % 4];
    const motion = frame.reducedMotion ? 0.5 : 1;
    return {
        x: 296 + point.x * reach,
        y: 288 + point.y * 180 * fold * motion + channel.index * 5,
    };
}
/** 굵기 차이는 같은 중심선에 두고 어두운 테두리로 관처럼 보이지 않게 한다. */
function drawRibbon(ctx, points, width) {
    if (points.length < 2)
        return;
    const left = [];
    const right = [];
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const before = points[Math.max(0, i - 1)];
        const after = points[Math.min(points.length - 1, i + 1)];
        const length = Math.max(1, Math.hypot(after.x - before.x, after.y - before.y));
        const nx = -(after.y - before.y) / length;
        const ny = (after.x - before.x) / length;
        const u = i / (points.length - 1);
        const radius = width * (0.16 + Math.sin(u * Math.PI) ** 2 * (i % 9 < 4 ? 1 : 0.38));
        left.push({ x: point.x + nx * radius, y: point.y + ny * radius });
        right.unshift({ x: point.x - nx * radius, y: point.y - ny * radius });
    }
    polygon(ctx, [...left, ...right], '#f2fcff');
    line(ctx, points, '#ffffff', Math.max(1.1, width * 0.24));
}
function drawBranch(ctx, frame, channel, index) {
    const born = 80 + index * 55;
    const local = channel.localMs - born;
    const life = 230 + index * 60;
    if (local < 0 || local >= life)
        return;
    const root = channelPoint(index ? 0.67 : 0.36, channel, frame);
    const head = smooth(local / 65);
    const tail = smooth((local - 110) / (life - 110));
    if (tail >= head)
        return;
    const direction = index ? 1 : -1;
    const reach = frame.reducedMotion ? 76 : 138;
    const points = Array.from({ length: 16 }, (_, i) => {
        const u = tail + ((head - tail) * i) / 15;
        const knee = u < 0.42 ? u * 0.78 : 0.33 - (u - 0.42) * 0.2;
        return {
            x: root.x + u * reach,
            y: root.y + direction * (u * 87 + knee * 100),
        };
    });
    ctx.save();
    ctx.globalAlpha *= (1 - smooth((local - 130) / (life - 130))) * 0.85;
    drawRibbon(ctx, points, frame.reducedMotion ? 1.4 : 2.4);
    ctx.restore();
}
function drawChannel(ctx, frame, channel) {
    const { localMs: local, lifeMs: life } = channel;
    if (local < 0 || local >= life)
        return;
    const head = smooth(local / 135);
    const tail = smooth((local - 195) / (life - 195));
    if (tail >= head)
        return;
    const points = Array.from({ length: 59 }, (_, i) => channelPoint(tail + ((head - tail) * i) / 58, channel, frame));
    const pulse = [1, 0.48, 0.82, 0.35][Math.floor(local / (1000 / 24)) % 4];
    const width = [15, 8, 5.5][channel.index] *
        (0.6 + pulse * 0.4) *
        (frame.reducedMotion ? 0.6 : 1);
    ctx.save();
    ctx.globalAlpha *=
        smooth(local / 18) * (1 - smooth((local - life + 130) / 130));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // 흰 핵 바깥만 옅게 발광시켜 선의 윤곽과 빈 공간을 남긴다.
    ctx.save();
    ctx.globalAlpha *= 0.24;
    line(ctx, points, '#78dcf5', width * 3.5);
    ctx.restore();
    drawRibbon(ctx, points, width);
    if (frame.enhanced && !frame.reducedMotion) {
        drawBranch(ctx, frame, channel, 0);
        drawBranch(ctx, frame, channel, 1);
    }
    ctx.restore();
}
/** 발생·윤곽 노출·가지·꼬리 이탈을 절대 시각으로 다시 구성한 전류. */
export function drawKutsunaLightning(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age >= 1250)
        return;
    const pulses = frame.enhanced && !frame.reducedMotion ? [0, 260, 540] : [0];
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
    pulses.forEach((birth, index) => drawChannel(ctx, frame, {
        localMs: age - birth,
        lifeMs: 530 + index * 65,
        index,
    }));
    ctx.restore();
}
