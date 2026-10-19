import { sampleKi, sampleKiShot } from './ki-sampling.js';
import { sampleComboMotion } from './player.js';
import { groundY, startX, posePosition, } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
const constellation = [
    { x: -47, y: -55 },
    { x: -34, y: -75 },
    { x: -9, y: -86 },
    { x: 13, y: -79 },
    { x: 33, y: -93 },
    { x: 49, y: -82 },
    { x: 30, y: -59 },
    { x: 49, y: -38 },
    { x: 20, y: -44 },
    { x: -3, y: -37 },
    { x: -27, y: -30 },
];
// 원투 원본의 발사 그림에서 확인한 주먹이다. 발 기준 높이는 SourceFrame을 따른다.
const launchFistPixels = {
    'ataho-one-two-punch-south-east-south-east:2': { x: 76, y: 45 },
    'ataho-one-two-punch-south-east-south-east:12': { x: 69, y: 48 },
};
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function active(snapshot, options) {
    return (snapshot.motion.ki?.style === 'meteor' &&
        options.showMovement &&
        !snapshot.waiting &&
        snapshot.elapsedMs < snapshot.durationMs);
}
function exaggerated(options) {
    return !!options.showFinisherConcept && options.showFinisher !== false;
}
function star(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y + radius);
    ctx.stroke();
}
/** 성좌는 주먹 뒤에서 응축되고 첫 탄 이후 빠르게 걷힌다. */
export function drawMeteorBackdrop(ctx, snapshot, options) {
    if (!active(snapshot, options))
        return;
    const definition = snapshot.motion.ki;
    const sample = sampleKi(definition, snapshot.elapsedMs);
    const afterRelease = snapshot.elapsedMs - definition.releaseMs;
    const fade = 1 - clamp(afterRelease / 190);
    if (sample.phase === 'idle' || fade <= 0)
        return;
    const { scale } = options;
    const charge = sample.charge;
    ctx.save();
    ctx.globalAlpha *= snapshot.opacity * fade;
    ctx.strokeStyle = '#9ce9ff';
    ctx.fillStyle = '#d6f6ff';
    for (const offset of [-3, 4]) {
        const x = startX + (definition.origin.x + offset) * scale;
        const y = groundY + (definition.origin.y + offset) * scale;
        ctx.save();
        ctx.globalAlpha *= 0.2 + charge * 0.6;
        ctx.lineWidth = scale * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, (2 + charge * 4) * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    if (exaggerated(options)) {
        ctx.save();
        ctx.globalAlpha *= 0.18 + charge * 0.52;
        ctx.lineWidth = scale * 0.55;
        ctx.beginPath();
        for (const [index, point] of constellation.entries()) {
            const x = startX + point.x * scale;
            const y = groundY + point.y * scale;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        for (const [index, point] of constellation.entries()) {
            const reveal = clamp(charge * 1.8 - index / constellation.length);
            if (reveal <= 0)
                continue;
            const x = startX + point.x * scale;
            const y = groundY + point.y * scale;
            const pulse = 0.82 + Math.sin(snapshot.elapsedMs * 0.012 + index * 2) * 0.18;
            ctx.save();
            ctx.globalAlpha *= reveal * pulse;
            ctx.lineWidth = scale * 0.65;
            star(ctx, x, y, (2.6 + charge * 2.2) * scale);
            ctx.beginPath();
            ctx.arc(x, y, scale * 1.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();
}
/** 발사 원인광은 실제 주먹에만 짧게 남기고, 멀리 가는 탄의 좌표는 바꾸지 않는다. */
function drawLaunchFlash(ctx, snapshot, frames, shot, options) {
    const ageMs = snapshot.elapsedMs - shot.launchMs;
    if (!exaggerated(options) || ageMs < 0 || ageMs >= 28)
        return;
    const pose = sampleComboMotion(snapshot.motion, shot.launchMs);
    const key = frameKey(pose.step);
    const source = frames.get(key);
    const fist = launchFistPixels[key];
    if (!source || !fist)
        return;
    const durationMs = Math.min(28, pose.step.durationMs + 7);
    if (ageMs >= durationMs)
        return;
    const progress = ageMs / durationMs;
    const { scale } = options;
    const position = posePosition(pose, source, options);
    const x = position.left + fist.x * scale;
    const y = position.top + fist.y * scale;
    ctx.save();
    ctx.globalAlpha *= (1 - progress) ** 1.5;
    ctx.fillStyle = '#e9ae62';
    ctx.beginPath();
    ctx.ellipse(x, y, (3.8 + progress) * scale, 3.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff1c3';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffe2a2';
    ctx.lineWidth = scale * 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 3 * scale, y);
    ctx.lineTo(x + (6 + progress * 3) * scale, y - scale);
    ctx.stroke();
    ctx.restore();
}
function drawMeteorShot(ctx, definition, sample, timeMs, options) {
    const { scale } = options;
    const strong = exaggerated(options);
    const residueAgeMs = timeMs - sample.shot.arriveMs;
    const residue = strong && residueAgeMs >= 0 && residueAgeMs < 80;
    if (!sample.visible && !residue)
        return;
    const drawingTimeMs = Math.min(timeMs, sample.shot.arriveMs);
    const tailMs = strong ? 220 : 95;
    const tipX = startX + sample.point.x * scale;
    const tipY = groundY + sample.point.y * scale;
    const points = Array.from({ length: 13 }, (_, index) => sampleKiShot(sample.shot, Math.max(sample.shot.launchMs, drawingTimeMs - tailMs * (1 - index / 12))));
    const tail = points[0];
    const tailX = startX + tail.point.x * scale;
    const tailY = groundY + tail.point.y * scale;
    const gradient = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
    gradient.addColorStop(0, '#3a7dff00');
    gradient.addColorStop(0.45, strong ? '#3188cf66' : '#60c4ff66');
    if (strong)
        gradient.addColorStop(0.82, '#59c5ef88');
    gradient.addColorStop(1, strong ? '#c8f8ff' : '#e7fcff');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 도착 뒤 80ms의 꼬리는 새 탄·명중이 아닌 기존 비행의 소멸 잔광이다.
    if (residue)
        ctx.globalAlpha *= (1 - residueAgeMs / 80) ** 2;
    if (strong) {
        ctx.save();
        ctx.globalAlpha *= 0.32;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = scale * 0.45;
        // 두 가는 결은 한 탄에 붙은 장식이다. 별도 선두·판정·타격 시간을 만들지 않는다.
        for (const side of [-1, 1]) {
            ctx.beginPath();
            for (const [index, point] of points.entries()) {
                const separation = Math.sin(point.progress * Math.PI) *
                    (7 + (sample.shot.launchMs % 7)) *
                    side;
                const x = startX + point.point.x * scale;
                const y = groundY + (point.point.y + separation) * scale;
                if (index === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = (strong ? 1.8 : 1.25) * scale;
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
        const x = startX + point.point.x * scale;
        const y = groundY + point.point.y * scale;
        if (index === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.stroke();
    const core = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
    core.addColorStop(0, strong ? '#eafaff00' : '#f1fcff');
    core.addColorStop(0.55, strong ? '#8adbff33' : '#f1fcff');
    if (strong)
        core.addColorStop(0.9, '#c5f4ff77');
    core.addColorStop(1, '#f1fcff');
    ctx.strokeStyle = core;
    ctx.lineWidth = scale * (strong ? 0.4 : 0.65);
    ctx.globalAlpha *= 0.84;
    ctx.stroke();
    if (residue) {
        ctx.restore();
        return;
    }
    ctx.fillStyle = '#f4fdff';
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, sample.shot.radius * scale * (strong ? 1.15 : 1.45), scale * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (strong) {
        const glint = 1.9 + Math.sin((timeMs - definition.releaseMs) * 0.02) ** 2 * 1.1;
        ctx.strokeStyle = '#b4f3ff';
        ctx.lineWidth = scale * 0.55;
        star(ctx, tipX, tipY, glint * scale);
    }
    ctx.restore();
}
function drawMeteorImpacts(ctx, snapshot, definition, options) {
    if (options.showContacts === false)
        return;
    for (const hit of definition.hits) {
        const contact = options.contacts?.find((item) => item.actorId === `ki:${hit.id}`);
        if (options.showSandbag && !contact?.connected)
            continue;
        const timeMs = options.showSandbag ? contact.timeMs : hit.atMs;
        const ageMs = snapshot.elapsedMs - timeMs;
        if (ageMs < 0 || ageMs >= hit.durationMs)
            continue;
        const progress = ageMs / hit.durationMs;
        const x = options.showSandbag
            ? contact.x
            : startX + hit.point.x * options.scale;
        const y = options.showSandbag
            ? contact.y
            : groundY + hit.point.y * options.scale;
        const strong = exaggerated(options);
        const radius = (3 + progress * (strong ? 14 : 9)) * options.scale;
        ctx.save();
        ctx.globalAlpha *= (1 - progress) ** 1.4 * (strong ? 0.95 : 0.72);
        if (strong) {
            // 도착의 흰 핵은 짧게, 넓은 청색 파열은 그보다 오래 남겨 비행 선두와 구별한다.
            const flash = 1 - clamp(ageMs / 28);
            if (flash > 0) {
                ctx.save();
                ctx.globalAlpha *= flash;
                ctx.fillStyle = '#e9fcff';
                ctx.beginPath();
                ctx.ellipse(x, y, (2.4 + (1 - flash) * 2.4) * options.scale, (3.2 + (1 - flash) * 3) * options.scale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.strokeStyle = strong
            ? '#74c9ed'
            : progress < 0.24
                ? '#f0fcff'
                : '#7edbff';
        ctx.lineWidth = (strong ? 1.05 : 0.7) * options.scale;
        for (let ray = 0; ray < 5; ray++) {
            const angle = (ray / 5) * Math.PI * 2 + hit.atMs * 0.013;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35);
            ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            ctx.stroke();
        }
        ctx.restore();
    }
}
/** 탄은 과장 연출·타격 효과 토글과 무관하게 같은 비행 좌표를 유지한다. */
export function drawMeteorForeground(ctx, snapshot, frames, options) {
    if (!active(snapshot, options))
        return;
    const definition = snapshot.motion.ki;
    const sample = sampleKi(definition, snapshot.elapsedMs);
    ctx.save();
    ctx.globalAlpha *= snapshot.opacity;
    for (const shot of sample.shots) {
        drawLaunchFlash(ctx, snapshot, frames, shot.shot, options);
        drawMeteorShot(ctx, definition, shot, snapshot.elapsedMs, options);
    }
    drawMeteorImpacts(ctx, snapshot, definition, options);
    ctx.restore();
}
