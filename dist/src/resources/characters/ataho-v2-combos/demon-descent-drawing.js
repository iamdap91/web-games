import { contactPoint } from './contact-geometry.js';
import { sampleDemonDescent } from './demon-descent.js';
import { sampleComboMotion } from './player.js';
import { groundY, posePosition } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
// 직접 확인한 원본의 양손 앞쪽이다. 접촉 그림은 판정에 쓰는 손끝을 그대로 읽는다.
const airborneFists = {
    3: { x: 34, y: 19 },
    4: { x: 63, y: 44 },
};
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function smooth(value) {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
}
function grain(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function handPoint(frame, timeMs) {
    const pose = sampleComboMotion(frame.snapshot.motion, timeMs);
    if (pose.step.contact)
        return contactPoint(pose, frame.options);
    const fist = airborneFists[pose.step.frame];
    const source = frame.frames.get(frameKey(pose.step));
    if (!fist || !source)
        return undefined;
    const position = posePosition(pose, source, frame.options);
    return {
        x: position.left + fist.x * frame.options.scale,
        y: position.top + fist.y * frame.options.scale,
    };
}
function polygon(ctx, points) {
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
        if (index === 0)
            ctx.moveTo(point.x, point.y);
        else
            ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
}
function ribbonShape(ctx, points, width) {
    polygon(ctx, [
        ...points.map((point) => ({
            x: point.x - point.width * width,
            y: point.y,
        })),
        ...[...points].reverse().map((point) => ({
            x: point.x + point.width * width,
            y: point.y,
        })),
    ]);
}
/** 매 시각의 실제 손끝보다 앞을 그리지 않고, 지나온 낙하 구간만 거친 획으로 연다. */
function drawDescentRibbon(ctx, frame, state) {
    if (state.phase === 'rise')
        return;
    const age = state.impactAgeMs ?? 0;
    const opacity = 1 - smooth(age / 78);
    if (opacity <= 0)
        return;
    const timeMs = Math.min(frame.snapshot.elapsedMs, state.contactMs);
    const tip = handPoint(frame, timeMs);
    // 정점에서 머리 위에 모았던 손부터 남겨 몸 뒤로 숨는 짧은 장식 획이 되지 않게 한다.
    const tail = handPoint(frame, state.apexStartMs);
    if (!tip || !tail)
        return;
    const scale = frame.options.scale;
    const progress = state.fallProgress;
    const span = Math.max(8 * scale, tip.y - tail.y);
    const cell = Math.floor((timeMs - state.apexStartMs) / 24);
    const points = Array.from({ length: 9 }, (_, index) => {
        const along = index / 8;
        const offset = (grain(index * 19 + cell * 5) - 0.5) * 3 * scale;
        return {
            x: tail.x + (tip.x - tail.x) * along + (index === 8 ? 0 : offset),
            y: tip.y - span * (1 - along),
            width: (3 + progress * 16) *
                scale *
                Math.sin(along * Math.PI) ** 0.55 *
                (0.72 + grain(index * 11 + cell) * 0.45),
        };
    });
    ctx.save();
    ctx.globalAlpha *= opacity * (0.4 + smooth(progress * 2) * 0.6);
    ctx.lineJoin = 'bevel';
    ribbonShape(ctx, points, 1);
    ctx.fillStyle = '#162128';
    ctx.fill();
    ctx.strokeStyle = '#b9c4bd';
    ctx.lineWidth = scale * 0.7;
    ctx.stroke();
    ribbonShape(ctx, points, 0.6);
    ctx.fillStyle = '#879790';
    ctx.fill();
    ribbonShape(ctx, points, 0.19);
    ctx.fillStyle = '#fff4dc';
    ctx.fill();
    // 앞뒤로 갈라진 붓털을 남기고 넓은 발광 기둥처럼 매끈하게 채우지 않는다.
    for (let index = 1; index < 7; index++) {
        const point = points[index];
        const side = index % 2 ? -1 : 1;
        ctx.strokeStyle = index % 3 ? '#152129' : '#e3e2cf';
        ctx.lineWidth = scale * (index % 3 ? 1 : 0.55);
        ctx.beginPath();
        ctx.moveTo(point.x + side * point.width * 0.22, point.y - 5 * scale);
        ctx.lineTo(point.x + side * point.width * 0.68, point.y + 4 * scale);
        ctx.stroke();
    }
    ctx.restore();
}
function drawVerticalSpeedLines(ctx, frame, state) {
    if (state.phase !== 'fall')
        return;
    const { snapshot, options } = frame;
    const pose = sampleComboMotion(snapshot.motion, snapshot.elapsedMs);
    const source = frame.frames.get(frameKey(pose.step));
    if (!source)
        return;
    const position = posePosition(pose, source, options);
    const bounds = source.bounds;
    const left = position.left + (bounds?.left ?? 18) * options.scale;
    const right = position.left + (bounds?.right ?? 73) * options.scale;
    const top = position.top + (bounds?.top ?? 12) * options.scale;
    const elapsedMs = snapshot.elapsedMs - state.apexStartMs;
    const envelope = smooth(elapsedMs / 16);
    ctx.save();
    ctx.lineCap = 'butt';
    for (const side of [-1, 1]) {
        for (let index = 0; index < 4; index++) {
            const phase = (((elapsedMs / (74 + index * 11) + index * 0.27) % 1) + 1) % 1;
            const x = (side < 0 ? left : right) + side * (5 + index * 8) * options.scale;
            const y = Math.min(groundY - 3 * options.scale, top + (80 - phase * 100) * options.scale);
            const length = (15 + index * 7) * options.scale;
            ctx.globalAlpha =
                snapshot.opacity *
                    envelope *
                    (0.32 + state.fallProgress * 0.35) *
                    Math.sin(phase * Math.PI);
            ctx.strokeStyle = index % 2 ? '#d8d8c8' : '#8b9c98';
            ctx.lineWidth = options.scale * (index % 2 ? 0.55 : 0.85);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, Math.max(frame.bounds.top, y - length));
            ctx.stroke();
        }
    }
    ctx.restore();
}
/** 원래 암중 난타의 장식 농도와 분리한 마지막 낙하의 주효과다. */
export function drawDemonDescentBackdrop(ctx, frame) {
    if (!frame.options.showMovement)
        return;
    const state = sampleDemonDescent(frame.snapshot);
    if (!state)
        return;
    ctx.save();
    ctx.globalAlpha *= frame.snapshot.opacity;
    drawVerticalSpeedLines(ctx, frame, state);
    drawDescentRibbon(ctx, frame, state);
    ctx.restore();
}
function drawMoriBurst(ctx, point, ageMs, scale) {
    if (ageMs < 0 || ageMs >= 170)
        return;
    const cell = Math.floor(ageMs / 34);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    for (const side of [-1, 1]) {
        for (let index = 0; index < 3; index++) {
            const localAge = ageMs - index * 9;
            if (localAge < 0)
                continue;
            const progress = clamp(localAge / 145);
            const fade = (1 - progress) ** 1.3;
            const distance = 4 + (1 - (1 - progress) ** 2) * (21 + index * 6);
            const length = (11 + index * 4) * (1 - progress * 0.6);
            const kink = (grain(index * 17 + cell + side * 3) - 0.5) * 6;
            ctx.save();
            ctx.globalAlpha *= fade * (index === 0 ? 0.9 : 0.74);
            ctx.translate(side * distance, -index * 2 - Math.sin(progress * Math.PI) * 3);
            ctx.scale(side, 1);
            ctx.rotate(-0.04 - index * 0.13);
            polygon(ctx, [
                { x: -length * 0.7, y: -1 },
                { x: -length * 0.3, y: -3.3 - kink },
                { x: length * 0.23, y: -1.4 },
                { x: length, y: 0.5 },
                { x: length * 0.2, y: 2.4 + kink * 0.5 },
                { x: -length * 0.65, y: 4 },
                { x: -length * 0.3, y: 0.5 },
            ]);
            ctx.fillStyle = index === 1 ? '#7e9390' : '#e4dfc6';
            ctx.fill();
            ctx.strokeStyle = '#25343a';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(-length * 0.55, 0);
            ctx.lineTo(-length * 0.12, -0.8 + kink * 0.2);
            ctx.lineTo(length * 0.7, 0.5);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
}
/** 명중핵은 손끝에, 갈라지는 짧은 조각은 양옆에 두어 착지 그림을 덮지 않는다. */
export function drawDemonDescentOverlay(ctx, frame) {
    if (!frame.options.showMovement || frame.options.showContacts === false)
        return;
    const state = sampleDemonDescent(frame.snapshot);
    if (!state || state.impactAgeMs === undefined)
        return;
    const lastContact = frame.finisher.contacts.at(-1);
    if (frame.finisher.connectedOnly && !lastContact?.connected)
        return;
    const point = handPoint(frame, state.contactMs);
    if (!point)
        return;
    const ageMs = state.impactAgeMs;
    const scale = frame.options.scale;
    ctx.save();
    ctx.globalAlpha *= frame.snapshot.opacity;
    drawMoriBurst(ctx, point, ageMs, scale);
    if (ageMs < 58) {
        const size = (3.8 + Math.sin(clamp(ageMs / 58) * Math.PI) * 2.5) * scale;
        ctx.save();
        ctx.globalAlpha *= 1 - smooth(ageMs / 58);
        ctx.translate(point.x, point.y);
        polygon(ctx, [
            { x: -size, y: -size * 0.18 },
            { x: -size * 0.25, y: -size * 0.3 },
            { x: 0, y: -size },
            { x: size * 0.2, y: -size * 0.23 },
            { x: size, y: size * 0.12 },
            { x: size * 0.2, y: size * 0.3 },
            { x: 0, y: size * 0.68 },
            { x: -size * 0.22, y: size * 0.22 },
        ]);
        ctx.fillStyle = '#fff6dd';
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}
