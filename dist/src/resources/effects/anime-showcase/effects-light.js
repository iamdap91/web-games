import { clamp, ellipse, line, noise, palette, polygon, ring, smooth, star, } from './drawing.js';
import { battleLayout } from './battle.js';
import { drawKiSprite, kiSpriteFrame, } from '../../characters/ataho-v2-combos/ki-sprites.js';
import { drawOrbitViscosity } from '../../characters/ataho-v2-combos/orbit-viscosity-drawing.js';
function drawKanadaLight(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1150)
        return;
    const size = frame.reducedMotion ? 0.62 : 1;
    if (!frame.enhanced) {
        ellipse(ctx, 549, 266, (18 + age / 22) * (1 - age / 1150), (18 + age / 22) * (1 - age / 1150), palette.paper);
        return;
    }
    ctx.save();
    const spike = (1 - smooth((age - 55) / 235)) * size;
    ctx.globalAlpha *= frame.reducedMotion ? 0.66 : 1;
    if (spike > 0) {
        star(ctx, 549, 266, 186 * spike, palette.gold, 4, -0.13);
        star(ctx, 549, 266, 142 * spike, palette.paper, 4, -0.13);
        ellipse(ctx, 549, 266, 16 * spike, 16 * spike, '#fff9e2');
    }
    const orbit = clamp((age - 70) / 850);
    if (age >= 70) {
        ctx.globalAlpha *= 1 - orbit;
        ctx.translate(549, 266);
        ctx.rotate(-0.47);
        const rx = (26 + orbit * 151) * size;
        const ry = (8 + orbit * 37) * size;
        // 십자는 셀의 단단한 면으로, 링은 여러 겹의 부드러운 농도로 분리한다.
        for (let brush = 7; brush >= 0; brush--) {
            ctx.save();
            ctx.globalAlpha *= brush === 0 ? 0.54 : 0.055;
            ctx.shadowColor = '#f8e6b4';
            ctx.shadowBlur = brush * 1.6;
            ring(ctx, 0, 0, rx, ry, brush % 2 ? '#f4d497' : '#fff7df', 2 + brush * 1.6);
            ctx.restore();
        }
        ctx.globalAlpha *= 0.6;
        ring(ctx, 0, 0, rx * 0.72, ry * 0.7, '#e5c483', 2.5);
    }
    ctx.restore();
}
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
function drawKanadaBeam(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2100)
        return;
    const progress = clamp(age / (frame.enhanced && !frame.reducedMotion ? 440 : 620));
    const fade = 1 -
        clamp((age - (frame.enhanced ? beamRelease.fadeMs : 1500)) /
            (frame.enhanced ? beamRelease.endMs - beamRelease.fadeMs : 600));
    const length = 548 * smooth(progress);
    const tail = frame.enhanced
        ? smooth((age - beamRelease.startMs) / (beamRelease.endMs - beamRelease.startMs))
        : 0;
    if (tail >= 1)
        return;
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
    const top = [];
    const bottom = [];
    for (let index = 0; index <= 26; index++) {
        const u = tail + ((1 - tail) * index) / 26;
        const point = beamAxis(u, length, bend, tipHeight);
        const prior = beamAxis(Math.max(0, u - 0.012), length, bend, tipHeight);
        const next = beamAxis(Math.min(1, u + 0.012), length, bend, tipHeight);
        const distance = Math.max(1, Math.hypot(next.x - prior.x, next.y - prior.y));
        const nx = -(next.y - prior.y) / distance;
        const ny = (next.x - prior.x) / distance;
        const tailWidth = tail > 0 ? smooth((u - tail) / 0.055) : 1;
        const ridge = (7 +
            u * 18 +
            noise(index + phase * 7) * 21 +
            (index % 5 === phase % 5 ? 20 : 0)) *
            (frame.reducedMotion ? 0.7 : 1) *
            tailWidth;
        top.push({ x: point.x + nx * ridge, y: point.y + ny * ridge });
        bottom.unshift({
            x: point.x - nx * ridge * 0.73,
            y: point.y - ny * ridge * 0.73,
        });
    }
    ctx.save();
    ctx.beginPath();
    [...top, ...bottom].forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();
    // 원본 타일과 빈틈이 같은 축을 따라 전진하고 후단은 손을 떠난 자리부터 비워진다.
    const tileLength = 0.15;
    const tileFlow = flow % tileLength;
    for (let u = -tileLength + tileFlow; u < 1; u += tileLength) {
        if (u + tileLength < tail)
            continue;
        const from = beamAxis(u, length, bend, tipHeight);
        const to = beamAxis(u + tileLength, length, bend, tipHeight);
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        ctx.save();
        ctx.translate(from.x, from.y);
        ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
        drawKiSprite(ctx, frame.assets.effects, {
            sheet: 'beam',
            frame: kiSpriteFrame(cellTime, {
                start: 4,
                count: 4,
                frameMs: 80,
                loop: true,
            }),
            point: { x: -3, y: 0 },
            width: distance + 6,
            height: 160,
            anchorX: 0,
        });
        ctx.restore();
    }
    if (tail > 0) {
        const tailPoint = beamAxis(tail, length, bend, tipHeight);
        const next = beamAxis(Math.min(1, tail + 0.02), length, bend, tipHeight);
        ctx.save();
        ctx.translate(tailPoint.x, tailPoint.y);
        ctx.rotate(Math.atan2(next.y - tailPoint.y, next.x - tailPoint.x));
        drawKiSprite(ctx, frame.assets.effects, {
            sheet: 'beam',
            frame: kiSpriteFrame(age - beamRelease.startMs, {
                start: 12,
                count: 2,
                frameMs: frame.reducedMotion ? 250 : 85,
                loop: true,
            }),
            point: { x: 0, y: 0 },
            width: 94,
            height: 142,
            anchorX: 0.15,
        });
        ctx.restore();
    }
    ctx.restore();
    line(ctx, top, '#c2f2ef', 2);
    line(ctx, bottom, '#237bb7', 3);
    for (let index = 0; index < 5; index++) {
        const u = ((index + 0.6) / 6 + flow) % 1;
        if (u < tail + 0.025)
            continue;
        const point = beamAxis(u, length, bend, tipHeight);
        const prior = beamAxis(u - 0.015, length, bend, tipHeight);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
        polygon(ctx, [
            { x: -12, y: -12 },
            { x: 24, y: -2 },
            { x: 5, y: 12 },
            { x: -21, y: 4 },
        ], '#29475b');
        ctx.restore();
    }
    const prior = beamAxis(0.98, length, bend, tipHeight);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(Math.atan2(head.y - prior.y, head.x - prior.x));
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'beam',
        frame: kiSpriteFrame(cellTime, {
            start: 10,
            count: 2,
            frameMs: 85,
            loop: true,
        }),
        point: { x: 0, y: 0 },
        width: 82,
        height: 94,
        anchorX: 0.9,
    });
    ctx.restore();
    ctx.restore();
}
function dragonPoint(progress, trail) {
    const emitted = Math.max(0, progress - trail * 0.6);
    return {
        x: 292 + emitted * 493,
        y: 269 + Math.sin(emitted * 2.3 * Math.PI) * 58,
    };
}
function drawDragon(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const p = clamp(age / 1900);
    const head = dragonPoint(p, 0);
    const fade = 1 - clamp((age - 1900) / 500);
    ctx.save();
    ctx.globalAlpha *= fade;
    if (!frame.enhanced) {
        ellipse(ctx, head.x, head.y, 38, 23, palette.gold);
        ctx.restore();
        return;
    }
    const cell = Math.floor(age / (frame.reducedMotion ? 240 : 1000 / 12));
    const birth = smooth(age / 170);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.scale(birth, birth);
    ctx.translate(-head.x, -head.y);
    const count = 38;
    // 머리가 실제로 지난 구간만 사용해 발사 직후의 꼬리가 발생점 뒤로 생기지 않게 한다.
    const emittedTrail = Math.min(1, p / 0.6);
    const top = [];
    const bottom = [];
    for (let index = 0; index <= count; index++) {
        const u = index / count;
        const trail = u * emittedTrail;
        const point = dragonPoint(p, trail);
        const tangentY = Math.cos(Math.max(0, p - trail * 0.6) * 2.3 * Math.PI) *
            58 *
            2.3 *
            Math.PI;
        const distance = Math.hypot(493, tangentY);
        const normal = { x: -tangentY / distance, y: 493 / distance };
        const thick = ((1 - u) * 35 + 2) * (0.88 + noise(index + cell * 3) * 0.24);
        const flame = index % 4 === 0 ? (1 - u) * 17 : 0;
        top.push({
            x: point.x - normal.x * (thick + flame),
            y: point.y - normal.y * (thick + flame),
        });
        bottom.unshift({
            x: point.x + normal.x * thick * 0.65,
            y: point.y + normal.y * thick * 0.65,
        });
    }
    polygon(ctx, [...top, ...bottom], '#dc7947');
    line(ctx, top, '#f5d374', 3);
    const center = dragonPoint(p, 0);
    const spine = Array.from({ length: count }, (_, index) => dragonPoint(p, (index / count) * emittedTrail));
    line(ctx, spine, '#f8d98f', 11);
    const x = center.x;
    const y = center.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(Math.cos(p * 2.3 * Math.PI) * 58 * 2.3 * Math.PI, 493));
    ctx.translate(-x, -y);
    polygon(ctx, [
        { x: x - 29, y: y - 23 },
        { x: x - 38, y: y - 69 },
        { x: x - 7, y: y - 40 },
        { x: x + 12, y: y - 38 },
        { x: x + 53, y: y - 13 },
        { x: x + 34, y: y + 2 },
        { x: x + 65, y: y + 14 },
        { x: x + 16, y: y + 29 },
        { x: x - 27, y: y + 19 },
    ], '#f5ce75');
    polygon(ctx, [
        { x: x + 7, y: y + 7 },
        { x: x + 43, y: y + 12 },
        { x: x + 12, y: y + 18 },
    ], palette.ink);
    line(ctx, [
        { x: x + 2, y: y - 20 },
        { x: x + 17, y: y - 16 },
    ], palette.ink, 5);
    ctx.restore();
    for (let flame = 0; flame < 10; flame++) {
        const u = (flame + 1) / 11;
        const point = dragonPoint(p, u * emittedTrail);
        const tongue = 8 + noise(flame + cell * 5) * 19;
        const side = flame % 2 ? 1 : -1;
        polygon(ctx, [
            { x: point.x - 13, y: point.y },
            { x: point.x - tongue, y: point.y + side * (18 + u * 12) },
            { x: point.x + 10, y: point.y + side * 7 },
        ], '#efb66c');
    }
    ctx.restore();
    ctx.restore();
}
function drawAraki(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1350)
        return;
    const p = clamp(age / 1350);
    if (!frame.enhanced)
        return ellipse(ctx, 503, 277, 12 * (1 - p), 12 * (1 - p), palette.paper);
    ctx.save();
    const opacity = ctx.globalAlpha;
    ctx.globalAlpha *= frame.reducedMotion ? 0.55 : 1;
    const reach = (1 - clamp(age / 430)) * (frame.reducedMotion ? 102 : 224);
    if (reach > 0) {
        line(ctx, [
            { x: 503 - reach, y: 277 + reach * 0.4 },
            { x: 503 + reach, y: 277 - reach * 0.4 },
        ], palette.blue, 12);
        line(ctx, [
            { x: 503 - reach * 0.35, y: 277 - reach },
            { x: 503 + reach * 0.35, y: 277 + reach },
        ], palette.paper, 7);
    }
    for (let index = 0; index < 11; index++) {
        const local = clamp((age - index * 31) / 950);
        if (age < index * 31)
            continue;
        ctx.globalAlpha =
            opacity * (1 - local) * (frame.reducedMotion ? 0.42 : 0.8);
        const x = 503 + (noise(index) - 0.4) * 215 * local;
        const y = 277 - local * (45 + noise(index + 5) * 105);
        ring(ctx, x, y, 4 + local * (8 + (index % 4) * 2), 4 + local * (8 + (index % 4) * 2), index % 2 ? palette.paper : palette.blue, 2);
    }
    ctx.restore();
}
function kozumaProgress(age, frame) {
    const ordinary = age < 930
        ? smooth(age / 930) * 0.38
        : 0.38 + smooth((age - 930) / 970) * 0.62;
    // 붙어서 버티는 구간과 끊긴 뒤의 급가속을 충분히 벌려 점성의 박자를 읽힌다.
    return frame.enhanced && !frame.reducedMotion
        ? age < 980
            ? smooth(age / 980) * 0.18
            : 0.18 + smooth((age - 980) / 620) * 0.82
        : ordinary;
}
function kozumaHead(age, frame) {
    const p = kozumaProgress(age, frame);
    return { x: 285 + p * 430, y: 300 - Math.sin(p * Math.PI) * 48 };
}
function drawKozuma(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const p = kozumaProgress(age, frame);
    const head = kozumaHead(age, frame);
    ctx.save();
    ctx.globalAlpha *= 1 - clamp((age - 2000) / 400);
    ctx.translate(285, 300);
    const birth = smooth(age / 180);
    ctx.scale(birth, birth);
    ctx.translate(-285, -300);
    const release = smooth((age - 920) / 120);
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'orbit',
        frame: kiSpriteFrame(age, {
            start: 0,
            count: 4,
            frameMs: frame.reducedMotion ? 240 : 110,
            loop: true,
        }),
        point: head,
        width: 165,
        height: 152,
        anchorX: 0.5,
        alpha: 1 - release,
    });
    // 모으는 셀과 날아가는 셀의 핵을 같은 위치에 맞춘 뒤 짧게 교차해 앵커 교체를 숨긴다.
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'orbit',
        frame: kiSpriteFrame(Math.max(0, age - 980), {
            start: 4,
            count: 4,
            frameMs: frame.reducedMotion ? 240 : 110,
            loop: true,
        }),
        point: head,
        width: 165,
        height: 152,
        anchorX: 0.65,
        alpha: release,
    });
    if (frame.enhanced) {
        const split = age > 1200;
        if (!split)
            drawOrbitViscosity(ctx, {
                compression: 0,
                tether: {
                    from: { x: 285, y: 300 },
                    to: { x: head.x - 16, y: head.y },
                    rootRadius: 26 - smooth(age / 1200) * 12,
                    tipRadius: 17,
                    neckRadius: Math.max(0.6, 24 * (1 - smooth((age - 760) / 440))),
                    bend: -12 * Math.sin(p * Math.PI),
                    frame: 0,
                },
            }, frame.assets.effects);
        if (split) {
            const since = (age - 1200) / 1000;
            drawOrbitViscosity(ctx, {
                compression: 0,
                droplet: {
                    point: { x: 285 + since * 19, y: 300 + since * 7 },
                    radius: 14 - clamp(since) * 8,
                    angle: 0,
                    frame: Math.min(8, Math.floor(since * 9)),
                    alpha: 1,
                },
            }, frame.assets.effects);
            const separation = kozumaHead(1200, frame);
            const dx = separation.x - 16 - 285;
            const dy = separation.y - 300;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const bend = -12 * Math.sin(kozumaProgress(1200, frame) * Math.PI);
            for (let index = 0; index < 5; index++) {
                const residueAge = age - 1200 - index * 20;
                if (residueAge < 0)
                    continue;
                const seconds = residueAge / 1000;
                const u = (index + 1) / 6;
                const curl = Math.sin(u * Math.PI) * bend;
                // 고정된 화면 좌표 대신 분리 직전 연결부의 실제 위치에서 조각이 태어난다.
                const x = 285 + dx * u - (dy / distance) * curl + seconds * (45 + index * 21);
                const y = 300 +
                    dy * u +
                    (dx / distance) * curl +
                    seconds * (index - 2) * 9 +
                    seconds * seconds * 57;
                drawOrbitViscosity(ctx, {
                    compression: 0,
                    droplet: {
                        point: { x, y },
                        radius: (4 + index * 1.5) * (frame.reducedMotion ? 0.7 : 1),
                        angle: Math.sin(index * 1.8) * 0.4,
                        frame: Math.min(8, Math.floor((residueAge / (900 + index * 40)) * 9)),
                        alpha: smooth(residueAge / (frame.reducedMotion ? 140 : 70)),
                    },
                }, frame.assets.effects);
            }
        }
    }
    ctx.restore();
}
function blackBridge(ctx, a, b, radius, neck) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / distance;
    const ny = dx / distance;
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(a.x + nx * radius, a.y + ny * radius);
    ctx.bezierCurveTo(middle.x + nx * neck, middle.y + ny * neck, middle.x + nx * neck, middle.y + ny * neck, b.x + nx * radius, b.y + ny * radius);
    ctx.lineTo(b.x - nx * radius, b.y - ny * radius);
    ctx.bezierCurveTo(middle.x - nx * neck, middle.y - ny * neck, middle.x - nx * neck, middle.y - ny * neck, a.x - nx * radius, a.y - ny * radius);
    ctx.closePath();
    ctx.fillStyle = '#070a12';
    ctx.fill();
}
function drawTatsuzo(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2200)
        return;
    const p = age / 2200;
    const motion = frame.reducedMotion ? 0.45 : 1;
    const birth = smooth(age / 160);
    const end = 1 - smooth((age - 1560) / 640);
    if (!frame.enhanced) {
        ellipse(ctx, 551, 284, 90 * birth * end, 90 * birth * end, '#070a12');
        return;
    }
    const spread = Math.sin(clamp((age - 80) / 1650) * Math.PI) * motion;
    const root = { x: 551, y: 284 };
    const points = Array.from({ length: 3 }, (_, index) => {
        const angle = -2.6 + index * 2.12 + p * 2.8;
        return {
            x: 551 + Math.cos(angle) * (48 + index * 23) * spread,
            y: 284 + Math.sin(angle) * (59 + index * 12) * spread,
        };
    });
    ctx.save();
    for (let index = 0; index < points.length; index++) {
        const point = points[index];
        const split = smooth((age - 640 - index * 125) / 480) *
            (1 - smooth((age - 1430) / 360));
        const radius = (32 + index * 7) * birth * end;
        if (split < 0.96)
            blackBridge(ctx, root, point, radius * 0.6, radius * (1 - split) * 0.9);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(p * 3.5 - index);
        const stretch = 1 + Math.sin(p * 9 + index) * (frame.reducedMotion ? 0.12 : 0.3);
        ellipse(ctx, 0, 0, radius * stretch, radius / stretch, '#070a12');
        ctx.restore();
    }
    ellipse(ctx, root.x, root.y, 38 * birth * end, 30 * birth * end, '#070a12');
    ctx.restore();
}
function drawShigeta(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1500)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    if (!frame.enhanced) {
        if (age > 300)
            return;
        ctx.save();
        ctx.globalAlpha *= 1 - age / 300;
        for (let i = 0; i < 6; i++) {
            const a = -0.9 + (i / 5) * 1.8;
            line(ctx, [
                { x: 548, y: 300 },
                { x: 548 + Math.cos(a) * 30, y: 300 + Math.sin(a) * 30 },
            ], palette.gold, 2);
        }
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
    if (age < 230) {
        const spread = (22 + age * 0.45) * motion;
        const opacity = ctx.globalAlpha;
        ctx.globalAlpha *= 1 - age / 230;
        for (let i = 0; i < 11; i++) {
            const a = -Math.PI + (i / 11) * Math.PI * 2;
            const bend = {
                x: 548 + Math.cos(a) * spread * 0.52,
                y: 300 + Math.sin(a) * spread * 0.52,
            };
            const tip = {
                x: 548 + Math.cos(a + 0.14) * spread,
                y: 300 + Math.sin(a + 0.14) * spread,
            };
            line(ctx, [{ x: 548, y: 300 }, bend, tip], '#f5cf7e', 3);
            line(ctx, [
                bend,
                {
                    x: bend.x + Math.cos(a - 0.5) * spread * 0.31,
                    y: bend.y + Math.sin(a - 0.5) * spread * 0.31,
                },
            ], '#fff0bd', 1.5);
        }
        ellipse(ctx, 548, 300, 5, 5, '#fff5d9');
        ctx.globalAlpha = opacity;
    }
    // 같은 접촉 탄도로 빛줄기와 선두를 그리며 날아간 금속편은 식은 색으로 사라진다.
    for (let i = 0; i < 42; i++) {
        if (frame.reducedMotion && i % 3)
            continue;
        const delayMs = (i % 7) * 31;
        const seconds = (age - delayMs) / 1000;
        const life = 0.38 + noise(i + 29) * 0.52;
        if (seconds < 0 || seconds > life)
            continue;
        const angle = i % 6 ? -1.08 + noise(i) * 2.05 : -2.8 + noise(i) * 0.8;
        const speed = (155 + noise(i + 7) * 310) * motion;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const gravity = 350 * motion;
        const position = {
            x: 548 + vx * seconds,
            y: 300 + vy * seconds + (gravity * seconds * seconds) / 2,
        };
        const prior = Math.max(0, seconds - 0.026);
        const color = seconds < 0.13
            ? '#fff2c4'
            : seconds < life * 0.63
                ? '#edbc69'
                : '#b76f48';
        ctx.save();
        ctx.globalAlpha *= 1 - smooth((seconds / life - 0.62) / 0.38);
        line(ctx, [
            {
                x: 548 + vx * prior,
                y: 300 + vy * prior + (gravity * prior * prior) / 2,
            },
            position,
        ], color, i % 4 ? 1.4 : 2.2);
        ellipse(ctx, position.x, position.y, 1.5, 1.5, color);
        const splitAt = 0.1 + (i % 4) * 0.035;
        if (seconds > splitAt && i % 3 === 0) {
            const childAge = seconds - splitAt;
            const from = {
                x: 548 + vx * splitAt,
                y: 300 + vy * splitAt + (gravity * splitAt * splitAt) / 2,
            };
            const childVx = vx * 0.68 - vy * 0.22;
            const childVy = vy * 0.7 + vx * 0.22;
            const child = {
                x: from.x + childVx * childAge,
                y: from.y + childVy * childAge + (gravity * childAge * childAge) / 2,
            };
            line(ctx, [
                {
                    x: child.x - childVx * 0.018,
                    y: child.y - (childVy + gravity * childAge) * 0.018,
                },
                child,
            ], '#e5b273', 1);
        }
        ctx.restore();
    }
    ctx.restore();
}
function drawKutsuna(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1700)
        return;
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.6 : 1;
    if (!frame.enhanced) {
        ctx.globalAlpha *= 1 - smooth((age - 700) / 450);
        line(ctx, [
            { x: 296, y: 288 },
            { x: 421, y: 250 },
            { x: 478, y: 314 },
            { x: 595, y: 258 },
            { x: 782, y: 288 },
        ], palette.blue, 5);
        ctx.restore();
        return;
    }
    const motion = frame.reducedMotion ? 0.56 : 1;
    const cell = age / (frame.reducedMotion ? 230 : 1000 / 12);
    const first = Math.floor(cell);
    const blend = smooth(cell - first);
    const flow = (seed) => noise(seed + first * 31) * (1 - blend) +
        noise(seed + (first + 1) * 31) * blend;
    for (let strand = 0; strand < 6; strand++) {
        const local = age - strand * 67;
        const life = 920 + strand * 71;
        if (local < 0 || local > life)
            continue;
        const head = clamp(local / 180);
        const tail = clamp((local - 490) / (life - 490));
        const points = [];
        const curl = (flow(strand * 7) - 0.5) * Math.PI * 2;
        for (let index = 0; index <= 64; index++) {
            const u = tail + ((head - tail) * index) / 64;
            const body = Math.sin(u * Math.PI);
            const swirl = u * (7 + strand * 1.3) + local / 240 + curl;
            const loop = (24 + flow(strand * 11 + 5) * 69) * body * motion;
            const kink = Math.sin(u * 21 + strand * 3 + local / 370) * body * 17 * motion;
            points.push({
                x: 296 + u * 486 + Math.sin(swirl) * loop,
                y: 288 +
                    Math.cos(swirl * 1.6 + curl) * loop +
                    Math.sin(u * 5 + strand) * body * 43 * motion +
                    kink,
            });
        }
        ctx.save();
        ctx.globalAlpha *=
            smooth(local / 45) * (1 - smooth((local - life + 190) / 190));
        // 각 줄의 머리와 꼬리가 따로 이동하여 평행 사인파의 고정 다발을 피한다.
        const edge = [];
        const reverse = [];
        for (let index = 0; index < points.length; index++) {
            const point = points[index];
            const before = points[Math.max(0, index - 1)];
            const after = points[Math.min(points.length - 1, index + 1)];
            const distance = Math.max(1, Math.hypot(after.x - before.x, after.y - before.y));
            const nx = -(after.y - before.y) / distance;
            const ny = (after.x - before.x) / distance;
            const along = index / (points.length - 1);
            const width = (2 + Math.sin(along * Math.PI) * (4 + flow(index + strand * 37) * 9)) *
                motion;
            edge.push({ x: point.x + nx * width, y: point.y + ny * width });
            reverse.unshift({ x: point.x - nx * width, y: point.y - ny * width });
        }
        polygon(ctx, [...edge, ...reverse], strand % 2 ? '#8dcfdd' : '#d3e7d9');
        ctx.strokeStyle = '#24536a';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        line(ctx, points, '#fff4d9', strand % 2 ? 3.7 : 2.8);
        if (strand % 2 === 0) {
            const root = points[Math.floor(points.length * 0.58)];
            const branch = points
                .slice(Math.floor(points.length * 0.58))
                .map((point, index) => ({
                x: point.x - index * 0.8,
                y: point.y - index * 1.6 * motion,
            }));
            line(ctx, [root, ...branch], '#c1e6e2', 1.4);
        }
        ctx.restore();
    }
    ctx.restore();
}
export function drawLightEffects(ctx, id, frame) {
    if (id === 'fx-kanada-light')
        drawKanadaLight(ctx, frame);
    else if (id === 'fx-kanada-beam')
        drawKanadaBeam(ctx, frame);
    else if (id === 'fx-kanada-dragon')
        drawDragon(ctx, frame);
    else if (id === 'fx-araki')
        drawAraki(ctx, frame);
    else if (id === 'fx-kozuma')
        drawKozuma(ctx, frame);
    else if (id === 'fx-tatsuzo')
        drawTatsuzo(ctx, frame);
    else if (id === 'fx-shigeta')
        drawShigeta(ctx, frame);
    else if (id === 'fx-kutsuna')
        drawKutsuna(ctx, frame);
    else
        return false;
    return true;
}
