import { battleLayout } from './battle.js';
import { clamp, ellipse, palette, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawKiSprite } from '../../characters/ataho-v2-combos/ki-sprites.js';
function beamAxis(u, length, bend, tipHeight) {
    const v = 1 - u;
    return {
        x: 267 + length * (3 * v * v * u * 0.2 + 3 * v * u * u * 0.72 + u ** 3),
        y: 300 +
            3 * v * v * u * bend -
            3 * v * u * u * bend * 0.8 +
            u ** 3 * tipHeight,
    };
}
const beamRelease = { startMs: 1420, fadeMs: 1950, endMs: 2080 };
/** 합성 장면의 성장 시계·선단·후단 계약을 그대로 유지한다. */
export function sampleKanadaBeam(frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    const progress = clamp(age / (frame.enhanced && !frame.reducedMotion ? 440 : 620));
    const fade = 1 -
        clamp((age - (frame.enhanced ? beamRelease.fadeMs : 1500)) /
            (frame.enhanced ? beamRelease.endMs - beamRelease.fadeMs : 600));
    const length = 548 * smooth(progress);
    const tail = frame.enhanced
        ? smooth((age - beamRelease.startMs) / (beamRelease.endMs - beamRelease.startMs))
        : 0;
    const amount = frame.reducedMotion ? 0.45 : 1;
    const cellTime = frame.reducedMotion ? Math.floor(age / 250) * 250 : age;
    const beats = [80, 160, 245, 380, 540, 760, 1020, 1280, 1560, 1800];
    const phase = beats.filter((timeMs) => cellTime >= timeMs).length;
    const bends = [0, -250, 310, -340, 360, -290, 330, -350, 270, -160, 90];
    const tips = [0, -30, 70, -65, 45, 80, -70, 55, -45, 30, 0];
    const bend = bends[phase] * amount * Math.min(1, progress * 1.5);
    const tipHeight = tips[phase] * amount;
    const head = beamAxis(1, length, bend, tipHeight);
    const flow = cellTime / (frame.reducedMotion ? 2400 : 1250);
    return {
        age,
        fade,
        length,
        tail,
        cellTime,
        phase,
        bend,
        tipHeight,
        head,
        flow,
    };
}
/** 자재의 가로 열을 순서대로 연결해 불덩이 여러 개 대신 한 장의 연속 외피로 쓴다. */
function drawCurvedMaterial(ctx, frame, options) {
    const source = frame.assets.effects.get(`technique:${options.key}`);
    if (!source || options.end <= options.start)
        return;
    const imageWidth = source.image.naturalWidth;
    const imageHeight = source.image.naturalHeight;
    const sourceStart = options.sourceStart ?? 0;
    const sourceEnd = options.sourceEnd ?? 1;
    const count = Math.min(Math.ceil(imageWidth * (sourceEnd - sourceStart)), 40);
    if (count <= 0)
        return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let index = 0; index < count; index++) {
        const fromU = options.start + ((options.end - options.start) * index) / count;
        const toU = options.start + ((options.end - options.start) * (index + 1)) / count;
        const from = options.pointAt(fromU);
        const to = options.pointAt(toU);
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance < 0.01)
            continue;
        const sx = Math.floor(imageWidth * (sourceStart + ((sourceEnd - sourceStart) * index) / count));
        const nextSx = Math.min(imageWidth, Math.ceil(imageWidth *
            (sourceStart + ((sourceEnd - sourceStart) * (index + 1)) / count)));
        const height = options.heightAt((fromU + toU) / 2);
        if (height <= 0)
            continue;
        ctx.save();
        ctx.translate(from.x, from.y);
        ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
        ctx.drawImage(source.image, sx, 0, nextSx - sx, imageHeight, -0.5, (-source.anchorY / imageHeight) * height, distance + 1, height);
        ctx.restore();
    }
    ctx.restore();
}
/** 굽은 면과 갈래 원화를 전진시키고 후단의 큰 면이 앞의 가는 면을 따라잡게 한다. */
export function drawKanadaBeamSprites(ctx, frame) {
    const shape = sampleKanadaBeam(frame);
    if (shape.age < 0 || shape.age > 2100 || shape.tail >= 1)
        return;
    const { age, fade, length, tail, phase, bend, tipHeight, head, flow } = shape;
    ctx.save();
    ctx.globalAlpha *= fade * (frame.reducedMotion ? 0.72 : 1);
    if (!frame.enhanced) {
        for (let x = 0; x < length; x += 72)
            drawKiSprite(ctx, frame.assets.effects, {
                sheet: 'beam',
                frame: 4,
                point: { x: 267 + x, y: 300 },
                width: Math.min(78, length - x),
                height: 70,
                anchorX: 0,
            });
        ctx.restore();
        return;
    }
    const pointAt = (u) => beamAxis(u, length, bend, tipHeight);
    const motion = frame.reducedMotion ? 0.72 : 1;
    const panelSpan = 0.46;
    const panelFlow = (flow * 0.62) % panelSpan;
    for (let panel = -1; panel < 3; panel++) {
        const start = panel * panelSpan + panelFlow;
        const end = start + panelSpan + 0.055;
        const visibleStart = Math.max(tail, start, 0);
        const visibleEnd = Math.min(1, end);
        if (visibleEnd <= visibleStart)
            continue;
        // 넓은 면과 가는 연결부가 교대하고, 이미 벗어난 열은 늘이지 않고 잘라낸다.
        drawCurvedMaterial(ctx, frame, {
            key: `beam-shell-${(panel + phase + 4) % 2}`,
            start: visibleStart,
            end: visibleEnd,
            sourceStart: (visibleStart - start) / (end - start),
            sourceEnd: (visibleEnd - start) / (end - start),
            pointAt,
            heightAt: (u) => (69 + u * 31) * motion * (tail > 0 ? smooth((u - tail) / 0.055) : 1),
        });
    }
    const surgeTime = frame.reducedMotion ? shape.cellTime / 920 : age / 580;
    const surgeU = (surgeTime % 1) * 1.32 - 0.16;
    const surgeLeft = surgeU - 0.22;
    const surgeRight = surgeU + 0.15;
    const surgeStart = Math.max(tail, surgeLeft, 0);
    const surgeEnd = Math.min(1, surgeRight);
    if (surgeEnd > surgeStart)
        drawCurvedMaterial(ctx, frame, {
            key: `beam-shell-${(phase + 1) % 2}`,
            start: surgeStart,
            end: surgeEnd,
            sourceStart: (surgeStart - surgeLeft) / (surgeRight - surgeLeft),
            sourceEnd: (surgeEnd - surgeLeft) / (surgeRight - surgeLeft),
            pointAt,
            heightAt: (u) => (94 + u * 38) * motion * (tail > 0 ? smooth((u - tail) / 0.055) : 1),
        });
    if (tail > 0) {
        const point = pointAt(tail);
        const next = pointAt(Math.min(1, tail + 0.025));
        drawEffectSprite(ctx, frame, {
            key: 'beam-tail',
            point,
            width: Math.min(110, Math.max(0, head.x - point.x) * 1.4),
            height: 94 * motion,
            rotation: Math.atan2(next.y - point.y, next.x - point.x),
        });
    }
    const prior = pointAt(0.975);
    drawEffectSprite(ctx, frame, {
        key: 'beam-head',
        point: head,
        width: 94,
        height: 102 * motion,
        rotation: Math.atan2(head.y - prior.y, head.x - prior.x),
    });
    ctx.restore();
}
function dragonPoint(emitted) {
    return {
        x: 292 + emitted * 493,
        y: 269 + Math.sin(emitted * 2.3 * Math.PI) * 58,
    };
}
/** 뒤목에서 화염 몸통을 잇고, 머리가 지나지 않은 경로에는 발생시키지 않는다. */
export function drawKanadaDragonSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const progress = clamp(age / 1900);
    const head = dragonPoint(progress);
    const fade = 1 - clamp((age - 1900) / 500);
    ctx.save();
    ctx.globalAlpha *= fade;
    if (!frame.enhanced) {
        ellipse(ctx, head.x, head.y, 38, 23, palette.gold);
        ctx.restore();
        return;
    }
    const birth = smooth(age / 170);
    const cell = Math.floor(age / (frame.reducedMotion ? 240 : 1000 / 12));
    const start = Math.max(0, progress - 0.6);
    const trailLength = progress - start;
    const bodyEnd = Math.max(start, progress - Math.min(0.035, trailLength * 0.2));
    drawCurvedMaterial(ctx, frame, {
        key: 'dragon-body',
        start,
        end: progress,
        pointAt: dragonPoint,
        heightAt: (u) => {
            const neck = trailLength > 0 ? (u - start) / trailLength : 0;
            const flex = 1 + Math.sin(neck * Math.PI * 3 + cell * 0.8) * 0.08;
            return (17 + smooth(neck) * 83) * birth * flex;
        },
    });
    if (trailLength > 0.025) {
        const tail = dragonPoint(start);
        const ahead = dragonPoint(start + Math.min(0.025, trailLength));
        drawEffectSprite(ctx, frame, {
            key: 'dragon-tail',
            point: tail,
            width: Math.min(90, trailLength * 493 * 0.8),
            height: 51 * birth,
            rotation: Math.atan2(ahead.y - tail.y, ahead.x - tail.x),
        });
    }
    const neck = dragonPoint(bodyEnd);
    const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
    drawEffectSprite(ctx, frame, {
        key: `dragon-head-${frame.reducedMotion ? 0 : [0, 0, 1, 1, 1, 0][cell % 6]}`,
        point: head,
        width: 132 * birth,
        height: 118 * birth,
        rotation: angle,
    });
    ctx.restore();
}
