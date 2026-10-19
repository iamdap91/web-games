import { orbitActivationMs, sampleOrbitHeld } from './ki-sampling.js';
import { clamp, line, polygon } from './ki-shapes.js';
export function hasKiFlow(motion) {
    const style = motion.ki?.style;
    return (style === 'tiger-manifest' || style === 'tiger-wave' || style === 'crescent');
}
export function hasReleaseGlint(motion) {
    return motion.ki?.style === 'beam' || motion.ki?.style === 'orbit';
}
export function hasKiHierarchy(motion) {
    const style = motion.ki?.style;
    return (style === 'orb' ||
        style === 'beam' ||
        style === 'tiger-manifest' ||
        style === 'tiger-wave');
}
/** 길이로 자른 한 구간만 보내며 종료한 선을 경로 입구에 다시 만들지 않는다. */
function pathSegment(points, start, end) {
    const lengths = points.slice(1).map((point, index) => {
        const previous = points[index];
        return Math.hypot(point.x - previous.x, point.y - previous.y);
    });
    const length = lengths.reduce((sum, segment) => sum + segment, 0);
    const from = clamp(start) * length;
    const to = clamp(end) * length;
    const visible = [];
    if (to <= from)
        return visible;
    let distance = 0;
    for (let index = 0; index < lengths.length; index++) {
        const segmentLength = lengths[index];
        const segmentEnd = distance + segmentLength;
        const first = points[index];
        const last = points[index + 1];
        if (segmentLength > 0 && segmentEnd > from && distance < to) {
            for (const position of [
                Math.max(from, distance),
                Math.min(to, segmentEnd),
            ]) {
                const amount = (position - distance) / segmentLength;
                visible.push({
                    x: first.x + (last.x - first.x) * amount,
                    y: first.y + (last.y - first.y) * amount,
                });
            }
        }
        distance = segmentEnd;
    }
    return visible;
}
function flowWindow(definition, sample) {
    if (definition.style === 'tiger-manifest') {
        const first = sample.hits[0];
        if (!first)
            return undefined;
        return {
            point: first.point,
            startMs: first.hit.atMs + 25,
            durationMs: 210,
            crescent: false,
        };
    }
    const shot = sample.shots[0];
    if (!shot)
        return undefined;
    if (definition.style === 'tiger-wave')
        return {
            point: shot.point,
            startMs: shot.shot.launchMs + 35,
            durationMs: 210,
            crescent: false,
        };
    if (definition.style === 'crescent')
        return {
            point: shot.point,
            startMs: shot.shot.launchMs + 35,
            durationMs: Math.min(230, shot.shot.arriveMs - shot.shot.launchMs - 35),
            crescent: true,
        };
    return undefined;
}
/** 원래 형상의 뒤쪽 외곽만 한 번 훑어 핵·선두·명중 시점을 보존한다. */
export function drawKiFlowAccent(ctx, definition, sample) {
    const window = flowWindow(definition, sample);
    if (!window)
        return;
    const ageMs = sample.timeMs - window.startMs;
    if (ageMs <= 0 || ageMs >= window.durationMs)
        return;
    const progress = ageMs / window.durationMs;
    const offsets = window.crescent
        ? [
            { x: -29, y: 31 },
            { x: -40, y: 20 },
            { x: -46, y: 1 },
            { x: -40, y: -19 },
            { x: -27, y: -34 },
        ]
        : [
            { x: -54, y: 5 },
            { x: -44, y: -5 },
            { x: -35, y: -14 },
            { x: -23, y: -19 },
            { x: -12, y: -18 },
            { x: -3, y: -8 },
        ];
    const points = offsets.map((offset) => ({
        x: window.point.x + offset.x,
        y: window.point.y + offset.y,
    }));
    const segmentFraction = 0.28;
    const head = progress * (1 + segmentFraction);
    const segment = pathSegment(points, head - segmentFraction, head);
    ctx.save();
    ctx.globalAlpha *= Math.sin(progress * Math.PI) * 0.52;
    line(ctx, segment, definition.accent, 1.6);
    line(ctx, segment, window.crescent ? '#e6f7ff' : '#ffe7a2', 0.55);
    ctx.restore();
}
function drawGlint(ctx, point, ageMs, options) {
    if (ageMs < 0 || ageMs >= options.durationMs)
        return;
    const progress = ageMs / options.durationMs;
    const pulse = Math.sin(progress * Math.PI);
    const reach = 2 + pulse * options.reach;
    ctx.save();
    ctx.translate(Math.round(point.x), Math.round(point.y));
    ctx.globalAlpha *= pulse * 0.85;
    polygon(ctx, [
        { x: -reach, y: 0 },
        { x: -1, y: -1 },
        { x: 0, y: -reach * 0.65 },
        { x: 1, y: -1 },
        { x: reach, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: reach * 0.65 },
        { x: -1, y: 1 },
    ], options.color);
    ctx.fillStyle = '#f6fcff';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
}
/** 첫 방출·첫 설치 탄의 활성에만 반짝여 연속 타격 횟수를 늘려 보이지 않는다. */
export function drawKiReleaseGlint(ctx, definition, sample) {
    if (definition.style === 'beam') {
        drawGlint(ctx, definition.origin, sample.timeMs - definition.releaseMs, {
            durationMs: 85,
            reach: 7,
            color: '#d6f4ff',
        });
        return;
    }
    if (definition.style !== 'orbit')
        return;
    const firstShot = definition.shots[0];
    if (!firstShot)
        return;
    const held = sampleOrbitHeld(definition, sample).find((item) => item.shot.id === firstShot.id);
    if (!held)
        return;
    drawGlint(ctx, held.point, sample.timeMs - (firstShot.launchMs - orbitActivationMs), {
        durationMs: 75,
        reach: 4,
        color: '#e4d8ff',
    });
}
