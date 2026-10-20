import { clamp, ellipse, line, mix, noise, palette, polygon, ring, smooth, stage, } from './drawing.js';
import { atahoPosition, battleLayout, drawAtaho, drawBear } from './battle.js';
import { drawKiSprite, kiSpriteFrame, } from '../../characters/ataho-v2-combos/ki-sprites.js';
import { mapStyles } from '../../../rendering/map-art-direction.js';
import { drawGameShard, drawGameStoneFace, } from './technique-effect-resources.js';
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
function projectFlight(point, frame, timeMs = frame.timeMs) {
    const camera = frame.reducedMotion
        ? 0
        : smooth((timeMs - 350) / 260) * (1 - smooth((timeMs - 1500) / 300));
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
function shotLifetime(index, kind) {
    return (kind === 'muraki' && index >= 2 ? 1960 : 1760) + (index % 4) * 90;
}
function leftFlightArea(point, frame) {
    const projected = projectFlight(point, frame, point.timeMs);
    // 추적 카메라의 확대·기울기로 화면 가장자리에 다시 보이지 않게 머리와 연기 폭까지 밖으로 보낸다.
    return (projected.x < -160 ||
        projected.x > 1120 ||
        projected.y < -140 ||
        projected.y > 680);
}
/** 절대 시각부터 고정 간격으로 적분해 스크럽과 GIF의 추격 경로를 같게 한다. */
function samplePursuit(index, kind, frame) {
    const launch = shotLaunch(index, kind);
    const now = Math.min(frame.timeMs, launch + shotLifetime(index, kind));
    if (now <= launch)
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
                : elapsed < 340
                    ? 34
                    : 540 + smooth((elapsed - 340) / 170) * 460
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
        if (delayed && elapsed >= 140 && elapsed < 340) {
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
        const sample = { ...position, timeMs: nextTime };
        samples.push(sample);
        if (leftFlightArea(sample, frame))
            break;
    }
    return samples;
}
function drawEnergyHead(ctx, frame, point, prior, thrust, emphasis) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
    ctx.scale(point.scale * emphasis, point.scale * emphasis);
    // 실제 기탄의 짧은 꼬리만 추진량에 따라 늘리고 추적 경로와 탄의 깊이는 보존한다.
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'orb',
        frame: kiSpriteFrame(frame.timeMs, {
            start: 4,
            count: 4,
            frameMs: frame.reducedMotion ? 240 : 65,
            loop: true,
        }),
        point: { x: 9, y: 0 },
        width: 27 + thrust * 0.35,
        height: 24,
        anchorX: 0.86,
    });
    ctx.restore();
}
function circusLayers(kind, frame) {
    const bear = bearEvasion(frame.timeMs, frame.reducedMotion);
    const layers = [
        { kind: 'bear', depth: bear.depth },
        { kind: 'ataho', depth: 0.01 },
    ];
    const count = kind === 'itano' ? 9 : 7;
    for (let index = 0; index < count; index++) {
        const samples = samplePursuit(index, kind, frame);
        const head = samples[samples.length - 1];
        if (!head)
            continue;
        const trailMs = frame.enhanced
            ? kind === 'itano'
                ? 580
                : index < 2
                    ? 400
                    : 310
            : kind === 'itano'
                ? 440
                : index < 2
                    ? 330
                    : 230;
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
                alpha: 1 - age / trailMs,
            });
        }
        if (head.timeMs < frame.timeMs)
            continue;
        const elapsed = frame.timeMs - shotLaunch(index, kind);
        layers.push({
            kind: 'head',
            depth: head.depth,
            point: head,
            prior: samples[Math.max(0, samples.length - 2)],
            thrust: frame.enhanced && kind === 'muraki' && index >= 2
                ? elapsed >= 140 && elapsed < 340
                    ? 2
                    : elapsed >= 340
                        ? 44
                        : 12
                : frame.enhanced
                    ? 18
                    : 12,
            // 빗나간 탄은 관성대로 화면 밖까지 가고 오래 남은 탄만 자기 수명의 끝에서 식는다.
            alpha: 1 - smooth((elapsed - shotLifetime(index, kind) + 180) / 180),
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
        stage(ctx, frame, 0);
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
                const old = frame.timeMs - layer.to.timeMs;
                if (frame.enhanced) {
                    const smokeWidth = (3.5 + clamp(old / 320) * 11) * to.scale;
                    line(ctx, [from, to], '#b6c4c1', smokeWidth);
                    if (Math.floor(layer.to.timeMs / 20) % 3 === 0)
                        ellipse(ctx, to.x, to.y, smokeWidth * 0.62, smokeWidth * 0.48, '#cbd4c9');
                    line(ctx, [from, to], '#ecedcf', Math.max(1, 3.4 - old / 180) * to.scale);
                }
                else
                    line(ctx, [from, to], '#a4b7c6', 1.8 * to.scale);
                ctx.restore();
            }
            else {
                ctx.save();
                ctx.globalAlpha *= layer.alpha * (frame.reducedMotion ? 0.65 : 1);
                drawEnergyHead(ctx, frame, projectFlight(layer.point, frame), projectFlight(layer.prior, frame), layer.thrust, frame.enhanced && !frame.reducedMotion ? 1.35 : 1);
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
function drawIsoDebris(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2100)
        return;
    const seconds = age / 1000;
    const motion = frame.reducedMotion ? 0.55 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1650) / 450);
    for (let cluster = 0; cluster < 4; cluster++) {
        const direction = -2.65 + cluster * 0.73;
        const speed = 155 + cluster * 19;
        const center = {
            x: 550 + Math.cos(direction) * speed * seconds * motion,
            y: 390 +
                Math.sin(direction) * speed * seconds * motion +
                seconds * seconds * 142,
        };
        const release = smooth((age - 210 - cluster * 42) / 620);
        if (frame.enhanced) {
            // 실제 돌의 알파 윤곽을 검정 군집으로 겹친 뒤 바깥 조각부터 떨어뜨린다.
            if (release < 0.9)
                drawGameShard(ctx, frame, {
                    point: center,
                    size: 34 * (1 - release * 0.68),
                    index: cluster,
                    silhouette: true,
                });
            for (let piece = 0; piece < 7; piece++) {
                const angle = piece * 2.399 + cluster;
                const distance = (6 + piece * 3) * (1 + release * 4.2);
                const point = {
                    x: center.x + Math.cos(angle) * distance,
                    y: center.y + Math.sin(angle) * distance * 0.6,
                };
                ctx.save();
                ctx.translate(point.x, point.y);
                ctx.rotate(direction + seconds * ((piece % 3) - 1));
                drawGameShard(ctx, frame, {
                    point: { x: 0, y: 0 },
                    size: (12 + noise(piece + cluster * 7) * 9) * (1 - release * 0.32),
                    index: piece + cluster * 7,
                    silhouette: true,
                });
                ctx.restore();
            }
        }
        else {
            for (let piece = 0; piece < 7; piece++)
                ellipse(ctx, center.x + Math.sin(piece * 4) * seconds * 43, center.y + Math.cos(piece) * seconds * 31, 5, 5, '#9caaa4');
        }
    }
    ctx.restore();
}
function cube(ctx, frame, x, y, size, rotation) {
    const yaw = rotation;
    const pitch = rotation * 0.73 + 0.46;
    const roll = rotation * 0.41;
    const vertices = Array.from({ length: 8 }, (_, index) => {
        const px = index & 1 ? size : -size;
        const py = index & 2 ? size : -size;
        const pz = index & 4 ? size : -size;
        const rx = px * Math.cos(yaw) + pz * Math.sin(yaw);
        const rz = -px * Math.sin(yaw) + pz * Math.cos(yaw);
        const ry = py * Math.cos(pitch) - rz * Math.sin(pitch);
        const z = py * Math.sin(pitch) + rz * Math.cos(pitch);
        const perspective = 240 / (240 - z);
        return {
            x: x + (rx * Math.cos(roll) - ry * Math.sin(roll)) * perspective,
            y: y + (rx * Math.sin(roll) + ry * Math.cos(roll)) * perspective,
            z,
        };
    });
    const faces = [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
    ]
        .map((indices, index) => ({
        indices,
        index,
        depth: indices.reduce((sum, i) => sum + vertices[i].z, 0) / 4,
    }))
        .sort((a, b) => a.depth - b.depth);
    for (const face of faces) {
        const shade = (Math.cos(rotation * 0.7 + face.index * 1.2) + 1) / 2;
        polygon(ctx, face.indices.map((index) => vertices[index]), shade < 0.32
            ? '#58615e'
            : shade < 0.68
                ? `#${mapStyles.ridge.ground.stone.toString(16)}`
                : '#d0d4c9');
        drawGameStoneFace(ctx, frame, face.indices.map((index) => vertices[index]));
        ctx.strokeStyle = '#58615e';
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
}
function drawNakamura(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < -170 || age > 2350)
        return;
    const motion = frame.reducedMotion ? 0.5 : 1;
    if (frame.enhanced && age < 60) {
        // 맞는 곳의 석재 판이 먼저 갈라져야 조각의 재질과 발생 지점이 이어진다.
        cube(ctx, frame, 551, 389, 42 * (1 - clamp(age / 90)), 0.27);
        if (age < 0)
            return;
    }
    if (age < 0)
        return;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1770) / 550);
    for (let i = 0; i < 28; i++) {
        const delay = i < 12 ? 0 : 90 + (i % 4) * 22;
        const s = (age - delay) / 1000;
        if (s < 0)
            continue;
        const angle = -Math.PI + noise(i + 3) * Math.PI;
        const speed = (110 + noise(i + 17) * 190) * motion;
        const x = 551 + Math.cos(angle) * speed * s;
        const y = 389 + Math.sin(angle) * speed * s + s * s * 151;
        const size = i < 12 ? 12 + (i % 4) * 7 : 2 + (i % 3) * 2;
        if (frame.enhanced)
            cube(ctx, frame, x, y, size * (1 - smooth((age - 1450) / 1000) * 0.6), i * 0.43 + (noise(i + 9) - 0.5) * s * 5.8);
        else {
            ctx.fillStyle = `#${mapStyles.ridge.ground.stone.toString(16)}`;
            ctx.fillRect(x - 6, y - 6, 12, 12);
        }
    }
    ctx.restore();
}
function drawMori(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1800)
        return;
    const cell = Math.floor(age / (frame.reducedMotion ? 170 : 1000 / 12));
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1200) / 600);
    for (let i = 0; i < 16; i++) {
        const delay = frame.enhanced ? (i % 3) * 60 : 0;
        if (age < delay)
            continue;
        const seconds = (age - delay) / 1000;
        const angle = -0.94 + noise(i) * 1.7;
        const speed = 95 + noise(i + 8) * 190;
        const x = 410 + Math.cos(angle) * seconds * speed * motion;
        const y = 310 + Math.sin(angle) * seconds * speed * motion + seconds * seconds * 54;
        if (!frame.enhanced) {
            ellipse(ctx, x, y, 5, 5, '#c1b388');
            continue;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.sin(i) * seconds * 0.4);
        const length = (i % 4 === 0 ? 64 : 24 + (i % 5) * 5) * (1 - clamp(seconds / 2) * 0.5);
        const kink = (noise(i * 11 + cell) - 0.5) * length * 0.55;
        polygon(ctx, [
            { x: -length, y: -2 },
            { x: -length * 0.4, y: -7 - kink },
            { x: length * 0.23, y: -3 },
            { x: length, y: 1 },
            { x: length * 0.2, y: 4 + kink },
            { x: -length * 0.65, y: 9 },
            { x: -length * 0.3, y: 1 },
        ], i % 3 ? '#d9bb7e' : '#15222c');
        line(ctx, [
            { x: -length * 0.85, y: -1 },
            { x: -length * 0.18, y: -2 + kink * 0.25 },
            { x: length * 0.8, y: 1 },
        ], '#17232b', 3.6);
        ctx.restore();
    }
    ctx.restore();
}
function drawAnimeR(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    for (let i = 0; i < 16; i++) {
        const angle = -Math.PI + noise(i) * Math.PI;
        const speed = (100 + noise(i + 8) * 150) * motion;
        const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        const breakMs = 420 + (i % 5) * 115;
        const size = frame.enhanced ? 18 + (i % 3) * 6 : 12 + (i % 3) * 4;
        const position = (timeMs) => ({
            x: 548 + (velocity.x * timeMs) / 1000,
            y: 371 + (velocity.y * timeMs) / 1000 + (timeMs / 1000) ** 2 * 88,
        });
        if (!frame.enhanced || age < breakMs) {
            const point = position(age);
            ctx.save();
            if (!frame.enhanced)
                ctx.globalAlpha *= 1 - clamp(age / 2100);
            ctx.translate(point.x, point.y);
            ctx.rotate(i + age / 900);
            drawGameShard(ctx, frame, { point: { x: 0, y: 0 }, size, index: i });
            ctx.restore();
            continue;
        }
        const parent = position(breakMs);
        for (let child = 0; child < 3; child++) {
            const childAge = (age - breakMs) / 1000;
            const life = 0.38 + child * 0.12 + (i % 3) * 0.07;
            if (childAge > life)
                continue;
            const vx = velocity.x + (child - 1) * 51;
            const vy = velocity.y + (breakMs / 1000) * 176 + (child - 1) * 23;
            const point = {
                x: parent.x + vx * childAge,
                y: parent.y + vy * childAge + childAge * childAge * 88,
            };
            const radius = size * 0.5 * (1 - clamp(childAge / life));
            ctx.save();
            ctx.translate(point.x, point.y);
            ctx.rotate(i + breakMs / 900 + childAge * (child - 1) * 4);
            drawGameShard(ctx, frame, {
                point: { x: 0, y: 0 },
                size: radius,
                index: i + child,
            });
            ctx.restore();
            if (childAge > life * 0.48)
                for (let speck = 0; speck < 2; speck++) {
                    const since = childAge - life * 0.48;
                    drawGameShard(ctx, frame, {
                        point: {
                            x: point.x + (speck ? 1 : -1) * since * 37,
                            y: point.y - since * 22,
                        },
                        size: 2.4 * (1 - clamp(since / (life * 0.52))),
                        index: i + speck,
                    });
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
