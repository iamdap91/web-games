import { sampleComboMotion } from './player.js';
import { drawPose, posePosition, poseWithDrawing, startX, groundY, } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
function allowsPose(effect, motion, frame) {
    return effect.sources.some((source) => source.motion === motion &&
        (!source.frames || source.frames.includes(frame)));
}
function drawAfterimages(ctx, effect, snapshot, frames, options) {
    const count = Math.floor(effect.count);
    const intervalMs = effect.intervalMs;
    if (!Number.isFinite(count) ||
        count < 1 ||
        !Number.isFinite(intervalMs) ||
        intervalMs <= 0)
        return;
    const lifetimeMs = count * intervalMs;
    // 동작 안의 고정 시각에서 만든 자세를 남겨 seek·정지·재생 결과를 같게 한다.
    const latestBirthMs = Math.floor(snapshot.elapsedMs / intervalMs) * intervalMs;
    for (let index = count - 1; index >= 0; index--) {
        const birthMs = latestBirthMs - intervalMs * index;
        const ageMs = snapshot.elapsedMs - birthMs;
        if (birthMs < 0 || ageMs >= lifetimeMs)
            continue;
        const sample = sampleComboMotion(snapshot.motion, birthMs);
        // 적용 구간은 생성만 제한한다. 이미 만든 잔상은 각자 수명을 마친다.
        if (!allowsPose(effect, sample.step.motion, sample.step.frame))
            continue;
        const pose = poseWithDrawing(sample, options.enabledEffects);
        const source = frames.get(frameKey(pose.step));
        if (!source)
            continue;
        ctx.save();
        ctx.globalAlpha *=
            effect.opacity * (count / (count + 1)) * (1 - ageMs / lifetimeMs);
        drawPose(ctx, pose, source, options);
        ctx.restore();
    }
}
function trailPoints(path, snapshot, frames, options) {
    const steps = snapshot.motion.steps;
    const first = path.points[0];
    if (!first)
        return [];
    let occurrence = path.occurrence ?? 0;
    let cursor = steps.findIndex((step) => {
        if (step.motion !== path.motion || step.frame !== first.frame)
            return false;
        return occurrence-- === 0;
    });
    if (cursor < 0)
        return [];
    const result = [];
    let time = steps
        .slice(0, cursor)
        .reduce((total, step) => total + step.durationMs, 0);
    for (const point of path.points) {
        while (cursor < steps.length) {
            const step = steps[cursor];
            if (step.motion === path.motion && step.frame === point.frame)
                break;
            time += step.durationMs;
            cursor++;
        }
        if (cursor >= steps.length)
            return [];
        const pose = sampleComboMotion(snapshot.motion, time);
        const source = frames.get(frameKey(pose.step));
        if (!source)
            return [];
        if (path.space === 'ground') {
            result.push({
                time,
                x: startX + (pose.x + point.x) * options.scale,
                y: groundY + point.y * options.scale,
            });
        }
        else {
            const position = posePosition(pose, source, options);
            result.push({
                time,
                x: position.left + point.x * options.scale,
                y: position.top + point.y * options.scale,
            });
        }
        time += steps[cursor].durationMs;
        cursor++;
    }
    return result;
}
function pointAtTime(points, time) {
    for (let index = 1; index < points.length; index++) {
        const point = points[index];
        if (time > point.time)
            continue;
        const previous = points[index - 1];
        const progress = (time - previous.time) / (point.time - previous.time);
        return {
            time,
            x: previous.x + (point.x - previous.x) * progress,
            y: previous.y + (point.y - previous.y) * progress,
        };
    }
    return points.at(-1);
}
function visiblePath(points, time, lifetimeMs) {
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last || lifetimeMs <= 0)
        return [];
    const from = Math.max(first.time, time - lifetimeMs);
    const to = Math.min(last.time, time);
    if (from >= to)
        return [];
    // 오래된 쪽도 보간해서 프레임 경계마다 선분 전체가 뚝 떨어지지 않게 한다.
    return [
        pointAtTime(points, from),
        ...points.filter((point) => point.time > from && point.time < to),
        pointAtTime(points, to),
    ];
}
function fadingPaint(ctx, points, options) {
    const first = points[0];
    const last = points.at(-1);
    const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
    for (const [offset, point] of [
        [0, first],
        [1, last],
    ]) {
        const opacity = Math.max(0, Math.min(1, 1 - (options.time - point.time) / options.lifetimeMs));
        const alpha = Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0');
        gradient.addColorStop(offset, `${options.color}${alpha}`);
    }
    return gradient;
}
function tracePath(ctx, points) {
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
        if (index === 0)
            ctx.moveTo(point.x, point.y);
        else
            ctx.lineTo(point.x, point.y);
    }
}
function traceStroke(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index++) {
        const point = points[index];
        const next = points[index + 1];
        ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = points.at(-1);
    ctx.lineTo(last.x, last.y);
}
function drawRibbon(ctx, points, width, paint) {
    // 짧은 면도 양 끝이 가늘어지도록 선분을 나눈다.
    const dense = [points[0]];
    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const point = points[index];
        const count = Math.max(2, Math.ceil(Math.hypot(point.x - previous.x, point.y - previous.y) / 6));
        for (let part = 1; part <= count; part++) {
            dense.push({
                x: previous.x + ((point.x - previous.x) * part) / count,
                y: previous.y + ((point.y - previous.y) * part) / count,
            });
        }
    }
    const left = [];
    const right = [];
    dense.forEach((point, index) => {
        const previous = dense[Math.max(0, index - 1)];
        const next = dense[Math.min(dense.length - 1, index + 1)];
        const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
        const taper = 0.15 + Math.sin((Math.PI * index) / (dense.length - 1)) * 0.85;
        const nx = ((-(next.y - previous.y) / length) * width * taper) / 2;
        const ny = (((next.x - previous.x) / length) * width * taper) / 2;
        left.push({ x: point.x + nx, y: point.y + ny });
        right.push({ x: point.x - nx, y: point.y - ny });
    });
    tracePath(ctx, [...left, ...right.reverse()]);
    ctx.closePath();
    ctx.fillStyle = paint.fill;
    ctx.fill();
    ctx.strokeStyle = paint.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
function drawTrail(ctx, effect, snapshot, frames, options) {
    for (const path of effect.paths) {
        if ((path.layer ?? 'front') !== options.layer)
            continue;
        const points = trailPoints(path, snapshot, frames, options);
        const first = points[0];
        const last = points.at(-1);
        if (!first ||
            !last ||
            snapshot.elapsedMs < first.time ||
            snapshot.elapsedMs >= last.time + effect.tailMs)
            continue;
        const visible = visiblePath(points, snapshot.elapsedMs, effect.tailMs);
        if (visible.length < 2)
            continue;
        const paint = (color) => fadingPaint(ctx, visible, {
            color,
            time: snapshot.elapsedMs,
            lifetimeMs: effect.tailMs,
        });
        ctx.save();
        ctx.globalAlpha *= effect.kind === 'ribbon' ? 0.65 : 0.9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (effect.kind === 'ribbon') {
            drawRibbon(ctx, visible, effect.width * options.scale, {
                fill: paint('#d09a50'),
                stroke: paint('#ffe8ac'),
            });
        }
        else {
            traceStroke(ctx, visible);
            ctx.strokeStyle = paint('#9a6233');
            ctx.lineWidth = effect.width * options.scale + 2;
            ctx.stroke();
            ctx.strokeStyle = paint('#fff0b8');
            ctx.lineWidth = effect.width * options.scale;
            ctx.stroke();
        }
        ctx.restore();
    }
}
export function drawMotionEffects(ctx, snapshot, frames, options) {
    if (!options.showMovement || snapshot.waiting)
        return;
    for (const effect of snapshot.motion.effects ?? []) {
        if (!options.enabledEffects.has(effect.id))
            continue;
        if (effect.kind === 'afterimage') {
            if (options.layer === 'back')
                drawAfterimages(ctx, effect, snapshot, frames, options);
        }
        else if (!options.suppressTrails &&
            (effect.kind === 'line' || effect.kind === 'ribbon'))
            drawTrail(ctx, effect, snapshot, frames, options);
    }
}
