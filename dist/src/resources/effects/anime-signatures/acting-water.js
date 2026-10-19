import { sampleGroundEffects } from '../../characters/ataho-v2-combos/ground-effects.js';
import { comboDuration, sampleComboMotion, } from '../../characters/ataho-v2-combos/player.js';
import { drawPose } from '../../characters/ataho-v2-combos/pose-drawing.js';
import { frameKey } from '../../characters/ataho-v2-combos/source-frames.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
const motionStartMs = 650;
const bodyOffset = { x: 60, y: 90 };
const bodyScale = 3;
function unit(value) {
    return Math.max(0, Math.min(1, value));
}
/** 접지 규칙을 복제하지 않고 기존 샘플러가 반환한 실제 발·발생 시각만 사용한다. */
function waterLayer(study, sceneTimeMs) {
    const enabledEffects = new Set();
    const origins = [];
    let stepTime = 0;
    for (const step of study.motion.steps) {
        const pose = sampleComboMotion(study.motion, stepTime + 1);
        const contacts = sampleGroundEffects({ ...pose, paused: false, waiting: false, opacity: 1 }, study.frames, { scale: bodyScale, enabledEffects });
        for (const contact of contacts) {
            if (contact.kind !== 'landing' || contact.ageMs >= 1.01)
                continue;
            origins.push({
                x: contact.x + bodyOffset.x,
                y: contact.y + bodyOffset.y,
                atMs: motionStartMs + pose.elapsedMs - contact.ageMs,
                index: origins.length,
            });
        }
        stepTime += step.durationMs;
    }
    const first = origins[0];
    if (!first)
        throw new Error('기존 도약 동작에서 확인된 발 접지점을 찾을 수 없습니다.');
    return { origins, ageMs: sceneTimeMs - first.atMs };
}
function waterStage(ctx, timeMs, reducedMotion) {
    const sky = ctx.createLinearGradient(0, 0, 0, 360);
    sky.addColorStop(0, '#536e70');
    sky.addColorStop(1, '#a7b8a5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    ctx.fillStyle = '#506b5f';
    ctx.beginPath();
    ctx.moveTo(0, 303);
    for (let x = 0; x <= signatureWidth; x += 80)
        ctx.lineTo(x, 254 + Math.sin(x / 91) * 21);
    ctx.lineTo(signatureWidth, 368);
    ctx.lineTo(0, 368);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#89957b';
    ctx.fillRect(0, 326, signatureWidth, 50);
    ctx.fillStyle = '#729e99';
    ctx.fillRect(0, 360, signatureWidth, signatureHeight - 360);
    ctx.fillStyle = '#87aaa2';
    ctx.fillRect(0, 409, signatureWidth, signatureHeight - 409);
    const time = reducedMotion ? 0 : timeMs;
    ctx.strokeStyle = '#bad0b959';
    ctx.lineWidth = 1.5;
    for (let index = 0; index < 11; index++) {
        const x = 28 + ((index * 149 + Math.sin(time / 1800 + index) * 8) % 930);
        const y = 380 + (index % 5) * 33;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 28 + (index % 3) * 13, y);
        ctx.stroke();
    }
    for (const x of [52, 94, 136, 837, 879, 915]) {
        ctx.strokeStyle = '#425e48';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, 380);
        ctx.quadraticCurveTo(x - 9, 330, x + 4, 284 + (x % 35));
        ctx.stroke();
        ctx.strokeStyle = '#aaad78';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 4, 284 + (x % 35));
        ctx.lineTo(x + 4, 265 + (x % 35));
        ctx.stroke();
    }
}
function ripple(ctx, point, ageMs, options) {
    if (ageMs < 0 || ageMs >= options.durationMs)
        return;
    const life = ageMs / options.durationMs;
    const radius = 4 + Math.sqrt(life) * options.reach;
    ctx.save();
    ctx.globalAlpha *= (1 - life) * options.opacity;
    ctx.strokeStyle = '#deece3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radius, radius * 0.21, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
function filmPoint(origin, angle, ageMs, motion, upper) {
    const life = unit(ageMs / 650);
    const spread = (15 + (1 - (1 - life) ** 2) * 78) * motion;
    const rise = 1 - (1 - unit(ageMs / 160)) ** 3;
    const falling = 1 - unit((ageMs - 200) / 440);
    const crest = 0.82 + Math.sin(angle * 5 + origin.index * 0.9) * 0.18;
    const height = upper ? 83 * rise * falling * crest * motion : 0;
    return {
        x: origin.x + Math.cos(angle) * spread,
        y: origin.y + Math.sin(angle) * spread * 0.2 - height,
    };
}
/** 연결된 얇은 물막에서 틈을 열어 별개의 가닥으로 나눈다. */
function drawFilm(ctx, origin, ageMs, motion) {
    if (ageMs < 0 || ageMs >= 650)
        return;
    const separation = unit((ageMs - 180) / 300);
    const count = separation > 0 ? 6 : 1;
    ctx.save();
    ctx.lineJoin = 'round';
    for (let index = 0; index < count; index++) {
        const section = Math.PI / count;
        const gap = section * separation * 0.36;
        const from = Math.PI + index * section + gap;
        const to = Math.PI + (index + 1) * section - gap;
        const upper = Array.from({ length: 15 }, (_, point) => filmPoint(origin, from + ((to - from) * point) / 14, ageMs, motion, true));
        const lower = Array.from({ length: 15 }, (_, point) => filmPoint(origin, to - ((to - from) * point) / 14, ageMs, motion, false));
        ctx.beginPath();
        [...upper, ...lower].forEach((point, pointIndex) => {
            if (pointIndex)
                ctx.lineTo(point.x, point.y);
            else
                ctx.moveTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = '#b5d3c77a';
        ctx.fill();
        ctx.strokeStyle = '#4f8e88a3';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        upper.forEach((point, pointIndex) => {
            if (pointIndex)
                ctx.lineTo(point.x, point.y);
            else
                ctx.moveTo(point.x, point.y);
        });
        ctx.strokeStyle = '#e4f1e2';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();
}
function drawDrop(ctx, point, speed, index) {
    const width = 2.2 + (index % 2);
    const height = 3 + Math.min(5, Math.abs(speed) / 60);
    ctx.fillStyle = '#b5d3c7';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - height);
    ctx.quadraticCurveTo(point.x + width * 1.6, point.y + height * 0.4, point.x, point.y + height * 0.5);
    ctx.quadraticCurveTo(point.x - width * 1.6, point.y + height * 0.4, point.x, point.y - height);
    ctx.fill();
    ctx.fillStyle = '#e4f1e2';
    ctx.fillRect(point.x - 0.6, point.y - 2, 1.2, 3);
}
/** 떨어질 시점도 같은 포물선에서 계산해 방울과 2차 파문의 위치·시각을 공유한다. */
function drawReturnDrops(ctx, origin, ageMs, reducedMotion) {
    const motion = reducedMotion ? 0.55 : 1;
    let visible = 0;
    for (let index = 0; index < 10; index++) {
        if (reducedMotion && index % 2)
            continue;
        const releaseMs = 205 + index * 19;
        const age = (ageMs - releaseMs) / 1000;
        if (age < 0)
            continue;
        const angle = Math.PI + (((index % 6) + 0.5) / 6) * Math.PI;
        const release = filmPoint(origin, angle, releaseMs, motion, true);
        const startX = release.x;
        const initialY = release.y;
        const height = origin.y - initialY;
        const vx = Math.cos(angle) * (69 + (index % 3) * 17) * motion;
        const vy = -(41 + (index % 3) * 18) * motion;
        const gravity = 650 * motion;
        const landingSeconds = (-vy + Math.sqrt(vy * vy + 2 * gravity * height)) / gravity;
        if (age < landingSeconds) {
            drawDrop(ctx, {
                x: startX + vx * age,
                y: initialY + vy * age + (gravity * age * age) / 2,
            }, vy + gravity * age, index);
            visible++;
        }
        else {
            ripple(ctx, { x: startX + vx * landingSeconds, y: origin.y }, (age - landingSeconds) * 1000, { durationMs: 440, reach: reducedMotion ? 12 : 20, opacity: 0.65 });
        }
    }
    return visible;
}
export function drawActingWater(ctx, assets, frame) {
    waterStage(ctx, frame.timeMs, frame.reducedMotion);
    const study = assets.acting.landing;
    const layer = waterLayer(study, frame.timeMs);
    const pose = sampleComboMotion(study.motion, Math.min(comboDuration(study.motion), frame.timeMs - motionStartMs));
    const source = study.frames.get(frameKey(pose.step));
    if (!source)
        throw new Error('물가 착지의 원본 몸 그림을 준비하지 못했습니다.');
    let drops = 0;
    for (const origin of layer.origins) {
        const age = frame.timeMs - origin.atMs;
        ripple(ctx, origin, age, {
            durationMs: 1750,
            reach: frame.reducedMotion ? 48 : 85,
            opacity: frame.enhanced ? 0.48 : 0.62,
        });
        if (!frame.enhanced)
            continue;
        drawFilm(ctx, origin, age, frame.reducedMotion ? 0.55 : 1);
        drops += drawReturnDrops(ctx, origin, age, frame.reducedMotion);
    }
    // 물막과 낙수를 몸 뒤에 두어 실제 발바닥과 무릎이 가려지지 않게 한다.
    ctx.save();
    ctx.translate(bodyOffset.x, bodyOffset.y);
    drawPose(ctx, pose, source, { scale: bodyScale, showMovement: true });
    ctx.restore();
    const age = layer.ageMs;
    return {
        phase: age < 0
            ? '기존 도약과 하강'
            : age < 180
                ? '발 접지와 물막 상승'
                : age < 650
                    ? '물막 분열과 방울 분리'
                    : age < 1450
                        ? '낙수와 작은 2차 파문'
                        : '수면 정착',
        detail: frame.enhanced
            ? '발이 닿은 물막이 갈라지고, 방울이 다시 닿은 자리에서 작은 파문이 번집니다.'
            : '같은 하강과 발 접지에 단순한 수면 파문만 표시합니다.',
        poseIndex: drops,
    };
}
