import { sampleComboMotion } from './player.js';
import { posePosition } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
const footTrailMs = 80;
// 원본 PNG에서 확인한 공격 발만 따라가며 팔과 머리는 궤적에 포함하지 않는다.
const footPixels = {
    'high-kick-south-east:3': { x: 63, y: 54 },
    'high-kick-south-east:4': { x: 62, y: 46 },
    'high-kick-south-east:5': { x: 57, y: 62 },
    'high-kick-west:3': { x: 31, y: 47 },
    'high-kick-west:4': { x: 30, y: 45 },
    'backflip-south-east:4': { x: 62, y: 75 },
    'backflip-south-east:5': { x: 67, y: 62 },
    'backflip-south-east:6': { x: 61, y: 43 },
};
function active(frame) {
    return (frame.finisher.definition.theme === 'phoenix' &&
        frame.options.showMovement &&
        frame.options.showContacts !== false &&
        !frame.snapshot.waiting &&
        frame.snapshot.elapsedMs < frame.snapshot.durationMs);
}
function recentFootPath(frame) {
    const motion = frame.snapshot.step.motion;
    if (motion !== 'high-kick-south-east' &&
        motion !== 'high-kick-west' &&
        motion !== 'backflip-south-east')
        return [];
    let attackStart = frame.snapshot.stepIndex;
    while (attackStart > 0) {
        const previous = frame.snapshot.motion.steps[attackStart - 1];
        const current = frame.snapshot.motion.steps[attackStart];
        if (previous.motion !== motion || previous.frame > current.frame)
            break;
        attackStart--;
    }
    const points = [];
    for (let ageMs = footTrailMs; ageMs >= 0; ageMs -= 10) {
        const timeMs = frame.snapshot.elapsedMs - ageMs;
        if (timeMs < 0)
            continue;
        const pose = sampleComboMotion(frame.snapshot.motion, timeMs);
        if (pose.step.motion !== motion || pose.stepIndex < attackStart)
            continue;
        const key = frameKey(pose.step);
        const foot = footPixels[key];
        const source = frame.frames.get(key);
        if (!foot || !source)
            continue;
        const position = posePosition(pose, source, frame.options);
        // 과거 몸의 이동을 빼고 현재 몸 위치에서 발만 그린 빠른 호를 남긴다.
        const point = {
            x: position.left +
                (foot.x + frame.snapshot.x - pose.x) * frame.options.scale,
            y: position.top +
                (foot.y + frame.snapshot.y - pose.y) * frame.options.scale,
            ageMs,
        };
        const previous = points.at(-1);
        if (previous &&
            Math.hypot(point.x - previous.x, point.y - previous.y) < 0.6) {
            points[points.length - 1] = point;
            continue;
        }
        points.push(point);
    }
    return points;
}
function traceFoot(ctx, points) {
    const first = points[0];
    if (!first)
        return;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index < points.length - 1; index++) {
        const point = points[index];
        const next = points[index + 1];
        ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = points.at(-1);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
}
/** 몸의 도약호와 분리한 공격 발의 최근80ms만 현재 몸 뒤에 남긴다. */
export function drawPhoenixConceptBackdrop(ctx, frame) {
    if (!active(frame))
        return;
    const points = recentFootPath(frame);
    if (points.length < 2)
        return;
    const first = points[0];
    const last = points.at(-1);
    if (Math.hypot(last.x - first.x, last.y - first.y) < 4)
        return;
    const opacity = Math.max(0, 1 - last.ageMs / footTrailMs);
    ctx.save();
    ctx.globalAlpha *= frame.snapshot.opacity * opacity * 0.48;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#d7ad68';
    ctx.lineWidth = frame.options.scale * 1.5;
    traceFoot(ctx, points);
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = '#fff1ce';
    ctx.lineWidth = frame.options.scale * 0.5;
    traceFoot(ctx, points);
    ctx.restore();
}
/** 실제 발 접촉점에만 작은 호를 두고 회전 장식으로 명중을 추가하지 않는다. */
export function drawPhoenixConceptOverlay(ctx, frame) {
    if (!active(frame))
        return;
    const { snapshot, finisher, options } = frame;
    for (const contact of finisher.contacts) {
        if (finisher.connectedOnly && !contact.connected)
            continue;
        const ageMs = snapshot.elapsedMs -
            (finisher.connectedOnly ? contact.timeMs : contact.plannedTimeMs);
        const final = contact === finisher.contacts.at(-1);
        const lifetimeMs = final ? 80 : 60;
        if (ageMs < 0 || ageMs >= lifetimeMs)
            continue;
        const backflip = snapshot.motion.steps[contact.stepIndex]?.motion ===
            'backflip-south-east';
        const reverse = snapshot.motion.steps[contact.stepIndex]?.motion === 'high-kick-west';
        const progress = ageMs / lifetimeMs;
        const radius = (3 + progress * (final ? 6 : 5)) * options.scale;
        ctx.save();
        ctx.globalAlpha *=
            snapshot.opacity * (1 - progress) * (final ? 0.82 : 0.68);
        ctx.strokeStyle = backflip ? '#f0d197' : '#e5be7d';
        ctx.lineWidth = options.scale * 0.85;
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, radius, backflip ? -2.2 : reverse ? Math.PI - 0.7 : -1.3, backflip ? -0.1 : reverse ? Math.PI + 1.3 : 0.7);
        ctx.stroke();
        ctx.fillStyle = '#fff3d5';
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, options.scale * (1.3 - progress * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
