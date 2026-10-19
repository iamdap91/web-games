import { groundY, startX, posePosition } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
// 각 원본 그림을 확인한 주먹 중심이다. 발 기준·pivot은 실제 SourceFrame을 따른다.
const fistPixels = {
    'cross-punch-east:3': { x: 57, y: 53 },
    'presentation-galactica-charge-east:4': { x: 22, y: 45 },
};
function active(frame) {
    return (frame.finisher.definition.theme === 'galactica' &&
        frame.options.showMovement &&
        !frame.snapshot.waiting &&
        frame.snapshot.elapsedMs < frame.snapshot.durationMs);
}
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function chargeMoment(frame) {
    if (frame.finisher.beat.emphasis !== 'intro')
        return undefined;
    const { snapshot, options } = frame;
    const key = frameKey(snapshot.step);
    const source = frame.frames.get(key);
    const fist = fistPixels[key];
    if (!source || !fist)
        return undefined;
    let startMs = 0;
    for (const step of snapshot.motion.steps) {
        if (step.emphasis === 'charge')
            break;
        startMs += step.durationMs;
    }
    if (snapshot.elapsedMs < startMs)
        return undefined;
    const stillStep = snapshot.motion.steps[frame.finisher.beat.toStep];
    const freezeMs = frame.finisher.endMs - stillStep.durationMs;
    const timeMs = Math.min(snapshot.elapsedMs, freezeMs);
    const position = posePosition(snapshot, source, options);
    return {
        point: {
            x: position.left + fist.x * options.scale,
            y: position.top + fist.y * options.scale,
        },
        rootX: startX + snapshot.x * options.scale,
        amount: clamp((timeMs - startMs) / Math.max(1, freezeMs - startMs)),
        timeMs,
        frozen: snapshot.elapsedMs >= freezeMs,
    };
}
/** 주먹의 빈 중심으로 먹빛 선을 좁히고, 얼굴이 있는 앞쪽에는 선을 두지 않는다. */
function drawInwardLines(ctx, frame, charge) {
    const { scale } = frame.options;
    ctx.save();
    ctx.globalAlpha *= 0.28 + charge.amount * 0.56;
    ctx.lineJoin = 'bevel';
    for (let index = 0; index < 22; index += 1) {
        const angle = 1.65 + (index / 21) * 2.9;
        const cycle = (charge.timeMs / (210 - charge.amount * 90) + index * 0.173) % 1;
        const distance = 9 + (1 - cycle) ** 1.7 * (18 + charge.amount * 34);
        const length = 10 + charge.amount * 25 + (index % 4) * 2;
        const width = 0.7 + charge.amount * (index % 3 ? 1.1 : 1.9);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle) * 0.65;
        const innerX = charge.point.x + dx * distance * scale;
        const innerY = charge.point.y + dy * distance * scale;
        const outerX = charge.point.x + dx * (distance + length) * scale;
        const outerY = charge.point.y + dy * (distance + length) * scale;
        ctx.fillStyle = '#0d0b14';
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX - dy * width * scale, outerY + dx * width * scale);
        ctx.lineTo(outerX + dy * width * scale, outerY - dx * width * scale);
        ctx.closePath();
        ctx.fill();
        // 어두운 무대에서도 선의 방향을 읽도록 한쪽에만 가는 반사를 남긴다.
        ctx.save();
        ctx.globalAlpha *= 0.24;
        ctx.strokeStyle = '#d7c5a8';
        ctx.lineWidth = scale * 0.45;
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX - dy * width * scale, outerY + dx * width * scale);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}
function drawFootDust(ctx, frame, charge) {
    const { scale } = frame.options;
    ctx.save();
    ctx.globalAlpha *= 0.15 + charge.amount * 0.35;
    for (let index = 0; index < 12; index += 1) {
        const side = index % 2 ? -1 : 1;
        const cycle = (charge.timeMs / 245 + index * 0.137) % 1;
        const x = charge.rootX + side * (7 + cycle * (10 + charge.amount * 9)) * scale;
        const y = groundY + (1 - Math.sin(cycle * Math.PI) * 3.5) * scale;
        ctx.fillStyle = index % 3 ? '#af9874' : '#ddc69a';
        ctx.fillRect(x, y, (1 + (index % 3)) * scale, scale * (index % 2 ? 0.7 : 1));
    }
    ctx.restore();
}
function drawFistSparks(ctx, frame, charge) {
    const { scale } = frame.options;
    ctx.save();
    ctx.globalAlpha *= 0.28 + charge.amount * 0.69;
    ctx.lineCap = 'square';
    const compression = charge.frozen ? 0.55 : 1;
    for (let index = 0; index < 22; index += 1) {
        const cycle = (charge.timeMs / 105 + index * 0.381) % 1;
        const angle = index * 2.399 + Math.floor(charge.timeMs / 70) * 0.2;
        const distance = (1.5 + (1 - cycle) ** 2 * (7 + charge.amount * 9)) * compression;
        const length = 1.4 + cycle * (2 + charge.amount * 3);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        ctx.strokeStyle =
            index % 4 === 0 ? '#e3a65d' : index % 3 ? '#fff3c8' : '#d5edf1';
        ctx.lineWidth = scale * (index % 5 ? 0.7 : 1.2);
        ctx.beginPath();
        ctx.moveTo(charge.point.x + dx * distance * scale, charge.point.y + dy * distance * scale);
        ctx.lineTo(charge.point.x + dx * (distance + length) * scale, charge.point.y + dy * (distance + length) * scale);
        ctx.stroke();
    }
    const sparkBeat = Math.floor(charge.timeMs / 52);
    for (let branch = 0; branch < 5; branch += 1) {
        const angle = branch * 2.17 + sparkBeat * 0.31;
        const length = (8 + charge.amount * 8) * scale * compression;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        ctx.strokeStyle = branch % 2 ? '#fff2cf' : '#a8d4e1';
        ctx.lineWidth = scale * (0.55 + charge.amount * 0.45);
        ctx.beginPath();
        ctx.moveTo(charge.point.x + dx * 2 * scale, charge.point.y + dy * 2 * scale);
        for (let segment = 1; segment <= 4; segment += 1) {
            const along = segment / 4;
            const kink = (segment % 2 ? 1 : -1) *
                (1.1 + ((sparkBeat + branch) % 3) * 0.55) *
                scale;
            ctx.lineTo(charge.point.x + dx * length * along - dy * kink, charge.point.y + dy * length * along + dx * kink);
        }
        ctx.stroke();
    }
    ctx.restore();
}
/** 응축은 준비 중에만 그리며, 구체나 전방 파면 대신 실제 몸이 돌진하게 한다. */
export function drawGalacticaConceptBackdrop(ctx, frame) {
    if (!active(frame))
        return;
    const { snapshot, finisher, options, bounds } = frame;
    const charge = chargeMoment(frame);
    if (charge) {
        ctx.save();
        ctx.globalAlpha *= 0.14 + charge.amount * 0.32;
        ctx.fillStyle = '#1c2027';
        ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        ctx.restore();
        drawInwardLines(ctx, frame, charge);
        drawFootDust(ctx, frame, charge);
    }
    if (finisher.beat.emphasis !== 'rush')
        return;
    const x = startX + snapshot.x * options.scale;
    ctx.save();
    ctx.globalAlpha *= 0.28;
    ctx.strokeStyle = '#d6c7ac';
    ctx.lineWidth = options.scale * 0.7;
    for (let index = 0; index < 3; index++) {
        const y = groundY - (3 + index * 5) * options.scale;
        ctx.beginPath();
        ctx.moveTo(x - (11 + index * 3) * options.scale, y);
        ctx.lineTo(x - (23 + index * 4) * options.scale, y + options.scale);
        ctx.stroke();
    }
    ctx.restore();
}
/** 준비 스파크는 타격 표시와 분리하고 실제 접촉 순간만 기존 작은 충격핵을 그린다. */
export function drawGalacticaConceptOverlay(ctx, frame) {
    if (!active(frame))
        return;
    const charge = chargeMoment(frame);
    if (charge)
        drawFistSparks(ctx, frame, charge);
    if (frame.options.showContacts === false)
        return;
    const hit = frame.finisher.contacts.find((contact) => !frame.finisher.connectedOnly || contact.connected);
    if (!hit)
        return;
    const age = frame.snapshot.elapsedMs -
        (frame.finisher.connectedOnly ? hit.timeMs : hit.plannedTimeMs);
    if (age < 0 || age >= 80)
        return;
    const progress = age / 80;
    const { scale } = frame.options;
    ctx.save();
    ctx.globalAlpha *= (1 - progress) ** 2;
    ctx.fillStyle = '#fff3d5';
    ctx.beginPath();
    ctx.ellipse(hit.x, hit.y, (2 + progress * 4) * scale, (3 + progress * 6) * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
