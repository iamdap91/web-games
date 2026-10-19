import { sampleComboMotion } from './player.js';
import { sampleGroundEffects } from './ground-effects.js';
import { groundY, posePosition, poseWithDrawing, startX, } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
import { drawKagenashiSmoke } from './kagenashi-smoke.js';
// 실제 발바닥을 확인한 원본과 선택형 보강 그림만 접지 사건에 사용한다.
const puffFeet = {
    'cheolsango-short:3': [
        { x: 33, offsetY: 0 },
        { x: 64, offsetY: -1 },
    ],
    'presentation-cheolsango-keyposes-south-east:2': [
        { x: 31, offsetY: 0 },
        { x: 68, offsetY: 0 },
    ],
};
export function hasGroundPuffs(motion) {
    return ['cheolsango', 'flying-kick', 'ki-eruption'].includes(motion.id);
}
export function hasFloorTrace(motion) {
    return motion.id === 'ki-eruption' && motion.ki?.style === 'eruption';
}
export function hasDepthLayers(motion) {
    return motion.id === 'rush' || motion.id === 'flying-kick';
}
export function hasReleaseKick(motion) {
    return motion.id === 'ki-beam' && motion.ki?.style === 'beam';
}
function lastEruptionEnd(motion) {
    if (!hasFloorTrace(motion))
        return;
    const hit = motion.ki?.hits.at(-1);
    return hit ? hit.atMs + hit.durationMs : undefined;
}
function puffEventTime(motion) {
    if (motion.id === 'ki-eruption')
        return lastEruptionEnd(motion);
    let timeMs = 0;
    for (const step of motion.steps) {
        if (motion.id === 'cheolsango' && step.contact?.kind === 'shoulder')
            return timeMs;
        timeMs += step.durationMs;
    }
    return undefined;
}
function puffOrigins(snapshot, atMs, frames, options) {
    const definition = snapshot.motion.ki;
    if (hasFloorTrace(snapshot.motion) && definition) {
        const x = startX + definition.target.x * options.scale;
        return [-14, 14].map((offset) => ({
            x: x + offset * options.scale,
            y: groundY,
        }));
    }
    const pose = poseWithDrawing(sampleComboMotion(snapshot.motion, atMs), options.enabledEffects);
    const key = frameKey(pose.step);
    const source = frames.get(key);
    const feet = puffFeet[key];
    if (!source || !feet)
        return [];
    const position = posePosition(pose, source, options);
    return feet.map((foot) => ({
        x: position.left + foot.x * options.scale,
        y: position.top + (source.feetY + foot.offsetY - pose.y) * options.scale,
    }));
}
function puffLobe(ctx, point, size, scale) {
    const x = Math.round(point.x / scale) * scale;
    const y = Math.round(point.y / scale) * scale;
    const width = Math.max(scale * 2, Math.round(size.width / scale) * scale);
    const height = Math.max(scale, Math.round(size.height / scale) * scale);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x - width / 2, y - height * 0.45);
    ctx.lineTo(x - width * 0.3, y - height * 0.45);
    ctx.lineTo(x - width * 0.3, y - height * 0.8);
    ctx.lineTo(x, y - height);
    ctx.lineTo(x + width * 0.25, y - height * 0.75);
    ctx.lineTo(x + width * 0.45, y - height * 0.75);
    ctx.lineTo(x + width / 2, y - height * 0.25);
    ctx.lineTo(x + width * 0.3, y);
    ctx.closePath();
    ctx.fill();
}
function drawLowPuff(ctx, origin, side, progress, scale) {
    const spread = 1 - (1 - progress) ** 2;
    const split = Math.max(0, (progress - 0.42) / 0.58);
    const lobes = split > 0 ? 2 : 1;
    ctx.save();
    ctx.globalAlpha *=
        Math.min(1, progress / 0.1) * (1 - progress) ** 1.25 * 0.52;
    for (let index = 0; index < lobes; index++) {
        // 발 바깥의 덩어리만 밀어내며 후반에 둘로 갈라져 낮게 사라진다.
        const distance = 10 + spread * 10 + index * (3 + split * 7);
        const width = (6 + Math.sin(progress * Math.PI) * 3) * (index ? 0.65 : 1);
        const height = (1.5 + Math.sin(progress * Math.PI) * 3) * (index ? 0.7 : 1);
        ctx.fillStyle = index ? '#c5a071' : '#d4b384';
        puffLobe(ctx, {
            x: origin.x + side * distance * scale,
            y: origin.y - split * (index ? 1 : 0.4) * scale,
        }, { width: width * scale, height: height * scale }, scale);
    }
    ctx.restore();
    return lobes;
}
function drawFloorTrace(ctx, snapshot, options) {
    if (!options.showFloorTrace || !hasFloorTrace(snapshot.motion))
        return false;
    const lastEnd = lastEruptionEnd(snapshot.motion);
    const definition = snapshot.motion.ki;
    if (lastEnd === undefined || !definition)
        return false;
    const startMs = lastEnd + 80;
    const endMs = Math.min(snapshot.durationMs, definition.endMs) - 20;
    const timeMs = snapshot.elapsedMs;
    if (endMs <= startMs || timeMs <= startMs || timeMs >= endMs)
        return false;
    const opacity = Math.min(1, (timeMs - startMs) / 35, (endMs - timeMs) / 90);
    const x = startX + definition.target.x * options.scale;
    ctx.save();
    ctx.globalAlpha *= opacity * 0.3;
    ctx.fillStyle = '#795b43';
    // 깊은 균열 대신 분출 위치에만 짧게 남는 목재 바닥의 먼지 자국이다.
    for (const [index, offset] of [-10, 0, 9].entries()) {
        const width = (8 - index * 1.5) * options.scale;
        ctx.fillRect(Math.round(x + offset * options.scale - width / 2), groundY + (index % 2) * options.scale, Math.ceil(width), options.scale);
    }
    ctx.restore();
    return true;
}
/** 절대 시각에서 재구성해 반복·시간 탐색 때 바닥에 흔적을 누적하지 않는다. */
export function drawStageGroundAccents(ctx, snapshot, frames, options) {
    if (!options.showMovement || snapshot.waiting)
        return { puffCount: 0, floorTrace: false };
    const floorTrace = drawFloorTrace(ctx, snapshot, options);
    if (!options.showGroundPuffs || !hasGroundPuffs(snapshot.motion))
        return { puffCount: 0, floorTrace };
    const landing = snapshot.motion.id === 'flying-kick'
        ? sampleGroundEffects(snapshot, frames, options).filter((sample) => sample.kind === 'landing')
        : [];
    const atMs = landing[0]
        ? snapshot.elapsedMs - landing[0].ageMs
        : puffEventTime(snapshot.motion);
    if (atMs === undefined)
        return { puffCount: 0, floorTrace };
    const durationMs = Math.min(220, snapshot.durationMs - atMs);
    const ageMs = snapshot.elapsedMs - atMs;
    if (durationMs <= 0 || ageMs <= 0 || ageMs >= durationMs)
        return { puffCount: 0, floorTrace };
    const origins = landing.length
        ? landing
        : puffOrigins(snapshot, atMs, frames, options);
    const progress = ageMs / durationMs;
    let puffCount = 0;
    const useKagenashi = snapshot.motion.id === 'cheolsango' &&
        options.groundPuffStyle === 'kagenashi';
    for (const [index, point] of origins.entries()) {
        const side = index === 0 ? -1 : 1;
        puffCount += useKagenashi
            ? drawKagenashiSmoke(ctx, {
                origin: point,
                side,
                progress,
                scale: options.scale,
            })
            : drawLowPuff(ctx, point, side, progress, options.scale);
    }
    return { puffCount, floorTrace };
}
/** 첫 방출의 반대 방향으로 한 번만 밀고 첫 명중 전에 원위치로 돌아온다. */
export function sampleReleaseKick(snapshot, options) {
    const definition = snapshot.motion.ki;
    if (!options.showReleaseKick ||
        !options.showMovement ||
        snapshot.waiting ||
        !hasReleaseKick(snapshot.motion) ||
        !definition)
        return { x: 0, y: 0 };
    const shot = definition.shots[0];
    if (!shot)
        return { x: 0, y: 0 };
    const durationMs = Math.min(110, (definition.hits[0]?.atMs ?? definition.releaseMs + 130) -
        definition.releaseMs -
        16);
    const ageMs = snapshot.elapsedMs - definition.releaseMs;
    if (durationMs < 35 || ageMs <= 0 || ageMs >= durationMs)
        return { x: 0, y: 0 };
    const attackMs = Math.min(24, durationMs * 0.3);
    const envelope = ageMs < attackMs
        ? 1 - (1 - ageMs / attackMs) ** 2
        : (1 - (ageMs - attackMs) / (durationMs - attackMs)) ** 2;
    const dx = shot.to.x - shot.from.x;
    const dy = shot.to.y - shot.from.y;
    const length = Math.hypot(dx, dy);
    if (!length)
        return { x: 0, y: 0 };
    const strength = 1.6 * options.scale * envelope;
    return { x: (-dx / length) * strength, y: (-dy / length) * strength };
}
