import { clamp, ellipse, line, mix, noise, palette, polygon, ring, smooth, stage, } from './drawing.js';
import { atahoPosition, battleLayout, drawAtaho, drawBear } from './battle.js';
/** 새 회피 자세를 합성하지 않고 승인된 몸의 발 위치를 두 번 옆·깊이로 옮긴다. */
function bearEvasion(timeMs, reducedMotion) {
    const stops = [
        { timeMs: 0, x: 0, depth: 0 },
        { timeMs: 510, x: 0, depth: 0 },
        { timeMs: 940, x: 140, depth: -86 },
        { timeMs: 1290, x: 70, depth: 82 },
        { timeMs: 1770, x: 0, depth: 0 },
    ];
    const amount = reducedMotion ? 0.42 : 1;
    for (let index = 1; index < stops.length; index++) {
        const prior = stops[index - 1];
        const next = stops[index];
        if (timeMs > next.timeMs)
            continue;
        const p = smooth((timeMs - prior.timeMs) / (next.timeMs - prior.timeMs));
        return {
            x: battleLayout.target.x + mix(prior.x, next.x, p) * amount,
            height: 0,
            depth: mix(prior.depth, next.depth, p) * amount,
        };
    }
    return { x: battleLayout.target.x, height: 0, depth: 0 };
}
function projectFlight(point, frame) {
    const camera = frame.reducedMotion
        ? 0
        : smooth((frame.timeMs - 350) / 260) *
            (1 - smooth((frame.timeMs - 1500) / 300));
    const lens = 700 - camera * 160;
    const depth = point.depth * (frame.reducedMotion ? 0.55 : 1);
    const scale = frame.enhanced ? lens / (lens - depth) : 1;
    return {
        x: 480 + (point.x - 480) * scale,
        y: 440 + depth * 0.32 - point.height * scale,
        scale,
    };
}
function shotLaunch(index, kind) {
    return kind === 'muraki'
        ? [400, 520, 660, 920, 1030, 1140, 1250][index]
        : 380 + index * 95;
}
/** 절대 시각부터 고정 간격으로 적분해 스크럽과 GIF의 추격 경로를 같게 한다. */
function samplePursuit(index, kind, frame) {
    const launch = shotLaunch(index, kind);
    const now = Math.min(frame.timeMs, launch + 1160);
    if (now <= launch || frame.timeMs >= 1770)
        return [];
    const actor = atahoPosition(frame, { timeMs: launch });
    let position = {
        x: actor.x + 65,
        height: 165,
        depth: (index % 2 ? 1 : -1) * 12,
    };
    let velocity = {
        x: 270,
        height: 45 - (index % 3) * 38,
        depth: (index % 2 ? 1 : -1) * 145,
    };
    const samples = [{ ...position, timeMs: launch }];
    const initial = bearEvasion(launch, frame.reducedMotion);
    const guideUntil = Math.min(launch + 610 + index * 34, 1660);
    for (let timeMs = launch; timeMs < now; timeMs += 20) {
        const nextTime = Math.min(timeMs + 20, now);
        const dt = (nextTime - timeMs) / 1000;
        const elapsed = timeMs - launch;
        const personality = index % 3;
        const lookAhead = personality === 0 ? 0 : personality === 1 ? 130 : -100;
        const target = frame.enhanced
            ? bearEvasion(timeMs + lookAhead, frame.reducedMotion)
            : initial;
        const lane = (index % 2 ? 1 : -1) * (48 + (index % 3) * 16);
        const aim = {
            x: target.x - 66,
            height: 194 + Math.sin(index * 1.8) * 25,
            depth: target.depth +
                (frame.enhanced ? lane : 0) +
                (frame.enhanced && personality === 2
                    ? Math.sin(elapsed / 210) * 85 * (1 - clamp(elapsed / 900))
                    : 0),
        };
        const dx = aim.x - position.x;
        const dy = aim.height - position.height;
        const dz = aim.depth - position.depth;
        const distance = Math.max(1, Math.hypot(dx, dy, dz));
        const delayed = frame.enhanced && kind === 'muraki' && index >= 2;
        const speed = delayed
            ? elapsed < 140
                ? 160
                : elapsed < 285
                    ? 34
                    : 540 + smooth((elapsed - 285) / 210) * 360
            : 390 + smooth(elapsed / 250) * 360;
        if (timeMs < guideUntil) {
            // 회피 전 위치를 놓친 탄은 더 꺾지 않고 통과하므로 전부 한 점에 모이지 않는다.
            const steer = frame.enhanced ? (personality === 1 ? 0.13 : 0.09) : 0.17;
            velocity = {
                x: mix(velocity.x, (dx / distance) * speed, steer),
                height: mix(velocity.height, (dy / distance) * speed, steer),
                depth: mix(velocity.depth, (dz / distance) * speed, steer),
            };
        }
        if (delayed && elapsed >= 140 && elapsed < 285) {
            velocity = {
                x: velocity.x * 0.78,
                height: velocity.height * 0.78,
                depth: velocity.depth * 0.78,
            };
        }
        position = {
            x: position.x + velocity.x * dt,
            height: position.height + velocity.height * dt,
            depth: Math.max(-190, Math.min(190, position.depth + velocity.depth * dt)),
        };
        samples.push({ ...position, timeMs: nextTime });
    }
    return samples;
}
function drawEnergyHead(ctx, point, prior, thrust) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
    ctx.scale(point.scale, point.scale);
    ellipse(ctx, 0, 0, 7, 4, palette.paper);
    polygon(ctx, [
        { x: -5, y: -3 },
        { x: -5 - thrust, y: 0 },
        { x: -5, y: 3 },
    ], '#edbb62');
    ctx.restore();
}
function circusLayers(kind, frame) {
    const bear = bearEvasion(frame.timeMs, frame.reducedMotion);
    const layers = [
        { kind: 'bear', depth: bear.depth },
        { kind: 'ataho', depth: 0.01 },
    ];
    const count = kind === 'itano' ? 9 : 7;
    const fade = 1 - smooth((frame.timeMs - 1630) / 140);
    for (let index = 0; index < count; index++) {
        const samples = samplePursuit(index, kind, frame);
        const head = samples[samples.length - 1];
        if (!head)
            continue;
        const trailMs = kind === 'itano' ? 440 : index < 2 ? 330 : 230;
        for (let step = 1; step < samples.length; step++) {
            const from = samples[step - 1];
            const to = samples[step];
            const age = frame.timeMs - to.timeMs;
            if (age < 0 || age > trailMs)
                continue;
            layers.push({
                kind: 'trail',
                depth: (from.depth + to.depth) / 2,
                from,
                to,
                alpha: (1 - age / trailMs) * fade,
            });
        }
        if (frame.timeMs - head.timeMs > 40)
            continue;
        const elapsed = frame.timeMs - shotLaunch(index, kind);
        layers.push({
            kind: 'head',
            depth: head.depth,
            point: head,
            prior: samples[Math.max(0, samples.length - 2)],
            thrust: frame.enhanced && kind === 'muraki' && index >= 2 && elapsed > 285
                ? 31
                : 12,
            alpha: fade,
        });
    }
    return layers.sort((a, b) => a.depth - b.depth);
}
function contactRing(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age >= 230)
        return;
    ctx.save();
    ctx.globalAlpha *= (1 - age / 230) * (frame.reducedMotion ? 0.4 : 0.7);
    ring(ctx, battleLayout.impact.x, battleLayout.impact.y, 6 + age * 0.12, 6 + age * 0.12, palette.gold, 2);
    ctx.restore();
}
/** 탄·배우를 깊이 순으로 합성하며 접촉 직전에는 공유 어퍼컷 구도로 돌아온다. */
export function drawCircusScene(ctx, id, frame) {
    if (id !== 'fx-itano' && id !== 'fx-muraki')
        return false;
    const kind = id === 'fx-itano' ? 'itano' : 'muraki';
    const bear = bearEvasion(frame.timeMs, frame.reducedMotion);
    const bearFeet = projectFlight(bear, frame);
    const actor = atahoPosition(frame);
    const camera = frame.enhanced && !frame.reducedMotion
        ? smooth((frame.timeMs - 350) / 260) *
            (1 - smooth((frame.timeMs - 1500) / 300))
        : 0;
    const lag = bearEvasion(frame.timeMs - 130, frame.reducedMotion);
    ctx.save();
    try {
        ctx.translate(480, 270);
        ctx.scale(1 + camera * 0.16, 1 + camera * 0.16);
        ctx.rotate((lag.depth / 90) * camera * 0.012);
        ctx.translate(-480 - (lag.x - battleLayout.target.x) * camera * 0.28, -270 - lag.depth * camera * 0.12);
        stage(ctx, 0);
        ellipse(ctx, actor.x, 448, 58, 10, '#14293b32');
        ellipse(ctx, bearFeet.x, bearFeet.y + 8, 115 * bearFeet.scale, 15 * bearFeet.scale, '#14293b32');
        for (const layer of circusLayers(kind, frame)) {
            if (layer.kind === 'ataho') {
                drawAtaho(ctx, frame);
            }
            else if (layer.kind === 'bear') {
                drawBear(ctx, frame, {
                    x: bearFeet.x,
                    ground: bearFeet.y,
                    scale: battleLayout.target.scale * bearFeet.scale,
                });
            }
            else if (layer.kind === 'trail') {
                const from = projectFlight(layer.from, frame);
                const to = projectFlight(layer.to, frame);
                ctx.save();
                ctx.globalAlpha *= layer.alpha * (frame.reducedMotion ? 0.45 : 0.72);
                line(ctx, [from, to], frame.enhanced ? '#e4e4c9' : '#a4b7c6', (frame.enhanced ? 3.1 : 1.8) * to.scale);
                ctx.restore();
            }
            else {
                ctx.save();
                ctx.globalAlpha *= layer.alpha * (frame.reducedMotion ? 0.65 : 1);
                drawEnergyHead(ctx, projectFlight(layer.point, frame), projectFlight(layer.prior, frame), layer.thrust);
                ctx.restore();
            }
        }
        contactRing(ctx, frame);
    }
    finally {
        ctx.restore();
    }
    return true;
}
function shardShape(ctx, point, radius, index, color) {
    const points = Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2;
        const r = radius * (0.55 + noise(index * 11 + k) * 0.65);
        return {
            x: point.x + Math.cos(a) * r,
            y: point.y + Math.sin(a) * r * 0.73,
        };
    });
    polygon(ctx, points, color);
}
function drawIsoDebris(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2100)
        return;
    const seconds = age / 1000;
    const motion = frame.reducedMotion ? 0.55 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1570) / 530);
    for (let cluster = 0; cluster < 3; cluster++)
        for (let i = 0; i < 7; i++) {
            const index = cluster * 7 + i;
            const fan = clamp((age - 360) / 800);
            const direction = -2.55 + cluster * 0.98;
            const vx = Math.cos(direction) * (144 + cluster * 23);
            const vy = Math.sin(direction) * (180 + cluster * 17);
            const spread = frame.enhanced ? 8 + fan * 48 : 70;
            const x = 550 + vx * seconds * motion + (noise(index) - 0.5) * spread * seconds;
            const y = 390 +
                vy * seconds * motion +
                seconds * seconds * 122 +
                (noise(index + 12) - 0.5) * spread * seconds;
            if (y > 625)
                continue;
            if (frame.enhanced) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(((index % 3) - 1) * seconds);
                shardShape(ctx, { x: 0, y: 0 }, (8 + (6 - i) * 2.1) * (1 - fan * 0.24), index, cluster % 2 ? '#9caaa4' : '#657981');
                ctx.restore();
            }
            else
                ellipse(ctx, x, y, 5, 5, '#9caaa4');
        }
    ctx.restore();
}
function cube(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const a = { x: -size, y: -size * 0.55 };
    const b = { x: 0, y: -size };
    const c = { x: size, y: -size * 0.55 };
    const d = { x: 0, y: 0 };
    const e = { x: -size, y: size * 0.6 };
    const f = { x: 0, y: size * 1.05 };
    const g = { x: size, y: size * 0.6 };
    polygon(ctx, [a, b, c, d], '#c9c9ad');
    polygon(ctx, [a, d, f, e], '#778b89');
    polygon(ctx, [d, c, g, f], '#425f70');
    ctx.restore();
}
function drawNakamura(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0)
        return;
    if (age > 2350)
        return;
    const motion = frame.reducedMotion ? 0.5 : 1;
    for (let i = 0; i < 16; i++) {
        const s = age / 1000;
        const x = 551 + (noise(i) - 0.5) * s * 330 * motion;
        const y = 389 - (118 + noise(i + 17) * 125) * s * motion + s * s * 151;
        if (y > 625)
            continue;
        const size = 7 + (i % 4) * 5;
        if (frame.enhanced)
            cube(ctx, x, y, size, (noise(i + 9) - 0.5) * s * 3.8);
        else {
            ctx.fillStyle = '#879b93';
            ctx.fillRect(x - 6, y - 6, 12, 12);
        }
    }
    if (frame.enhanced && age > 370)
        for (let i = 0; i < 22; i++) {
            const s = (age - 370) / 1000;
            const x = 551 + (noise(i + 54) - 0.5) * s * 440 * motion;
            const y = 394 - (80 + noise(i + 32) * 125) * s * motion + s * s * 125;
            if (y > 625)
                continue;
            cube(ctx, x, y, 2 + (i % 3) * 1.5, s * (i % 2 ? 3 : -3));
        }
}
function drawMori(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1800)
        return;
    const s = age / 1000;
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1200) / 600);
    for (let i = 0; i < 19; i++) {
        const angle = -0.75 + noise(i) * 1.5;
        const dist = s * (100 + noise(i + 8) * 160) * motion;
        const x = 410 + Math.cos(angle) * dist;
        const y = 310 + Math.sin(angle) * dist + s * s * 28;
        if (!frame.enhanced)
            ellipse(ctx, x, y, 5, 5, '#c1b388');
        else {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.sin(i) * s * 0.3);
            const length = (18 + (i % 5) * 7) * (1 - clamp(s / 2) * 0.5);
            polygon(ctx, [
                { x: -length, y: -2 },
                { x: -length * 0.2, y: -6 - (i % 3) * 3 },
                { x: length * 0.7, y: -2 },
                { x: length, y: 1 },
                { x: length * 0.25, y: 5 },
                { x: -length * 0.5, y: 7 },
                { x: -length * 0.3, y: 2 },
            ], i % 3 ? '#e4c388' : '#121b2a');
            ctx.restore();
        }
    }
    ctx.restore();
}
function drawAnimeR(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2800)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    for (let i = 0; i < 18; i++) {
        const s = age / 1000;
        const a = -Math.PI + noise(i) * Math.PI;
        const speed = 80 + noise(i + 8) * 160;
        const x = 548 + Math.cos(a) * speed * s * motion;
        const y = 371 + Math.sin(a) * speed * s * motion + s * s * 76;
        if (y > 625)
            continue;
        const dissolveAt = 570 + (i % 5) * 165;
        const split = clamp((age - dissolveAt) / 900);
        if (!frame.enhanced) {
            ctx.save();
            ctx.globalAlpha *= 1 - clamp(age / 2400);
            shardShape(ctx, { x, y }, 13, i, '#d4c7a6');
            ctx.restore();
        }
        else {
            if (split < 1)
                shardShape(ctx, { x, y }, 16 * (1 - split), i, '#d4c7a6');
            if (split > 0 && split < 1)
                for (let piece = 0; piece < 3; piece++) {
                    const dx = (piece - 1) * split * 25;
                    const dy = Math.sin(piece + i) * split * 27;
                    shardShape(ctx, { x: x + dx, y: y + dy }, 5 * Math.sin(split * Math.PI), i + piece, '#a8b3b1');
                }
        }
    }
}
export function drawFlightEffects(ctx, id, frame) {
    if (id === 'fx-iso-debris')
        drawIsoDebris(ctx, frame);
    else if (id === 'fx-nakamura')
        drawNakamura(ctx, frame);
    else if (id === 'fx-mori')
        drawMori(ctx, frame);
    else if (id === 'fx-anime-r')
        drawAnimeR(ctx, frame);
    else
        return false;
    return true;
}
