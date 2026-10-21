import { drawOrbitViscosity } from '../../characters/ataho-v2-combos/orbit-viscosity-drawing.js';
import { battleImpact, battleLayout, drawAtaho, drawBear } from './battle.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
export const compositeOrbTiming = {
    birthMs: 950,
    mergedMs: 1650,
    stretchMs: battleLayout.contactMs,
    splitMs: 2760,
    arrivalMs: 3040,
    impactHoldMs: 90,
    recoverMs: 900,
    endMs: 4100,
};
const timing = compositeOrbTiming;
const casterDistance = 240;
const mergedRadius = 34;
function headRadii(frame, radius, flight) {
    const elongation = 1 + flight * (frame.reducedMotion ? 0.25 : 0.8);
    return { x: radius * elongation, y: radius / elongation };
}
function casterTime(timeMs) {
    if (timeMs < 450)
        return 0;
    if (timeMs < timing.birthMs)
        return 1000 + smooth((timeMs - 450) / (timing.birthMs - 450)) * 800;
    if (timeMs < timing.splitMs + 80)
        return battleLayout.contactMs + 16;
    return 1960 + smooth((timeMs - timing.splitMs - 80) / 580) * 840;
}
function targetReaction(timeMs, reducedMotion) {
    const age = timeMs - timing.arrivalMs;
    const release = clamp((age - timing.impactHoldMs) / 340);
    const push = 1 - (1 - release) ** 3;
    const settle = smooth((age - 500) / 500);
    const motion = reducedMotion ? 0.32 : 1;
    return {
        displacementX: (56 * push - 12 * settle) * motion,
        lift: Math.sin(release * Math.PI) * 9 * motion,
    };
}
function heldHead(root, timeMs, motion) {
    const p = clamp((timeMs - timing.stretchMs) / (timing.splitMs - timing.stretchMs));
    return {
        x: root.x + smooth(p) * 92 * motion,
        y: root.y - Math.sin(p * Math.PI) * 16 * motion,
    };
}
/** 같은 경로의 흑구가 실제로 닿을 때만 표적을 멈추고 밀어낸다. */
export function drawCompositeOrb(ctx, frame) {
    const scene = { ...frame, sampleId: 'fx-kozuma' };
    const impact = battleImpact(scene);
    const root = { x: impact.x - casterDistance, y: impact.y };
    const timeMs = frame.timeMs;
    const contact = scene.assets.straight.steps.find((step) => step.contact).contact;
    const casterX = root.x - (contact.reach ?? 0) * battleLayout.attacker.scale;
    const reaction = targetReaction(timeMs, frame.reducedMotion);
    const hitAge = timeMs - timing.arrivalMs;
    const reacting = hitAge >= 0 && hitAge < timing.recoverMs;
    stage(ctx, scene, 0);
    ellipse(ctx, casterX, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657 + reaction.displacementX, 448, 115, 15, '#14293b32');
    drawBear(ctx, scene, {
        timeMs: reacting
            ? battleLayout.contactMs + Math.max(0, hitAge - timing.impactHoldMs)
            : timeMs,
        state: reacting ? 'hit' : 'stand',
        recoil: reaction,
    });
    drawAtaho(ctx, scene, {
        action: 'straight',
        x: casterX,
        timeMs: casterTime(timeMs),
    });
    if (timeMs < timing.birthMs || timeMs >= timing.endMs)
        return;
    const motion = frame.reducedMotion ? 0.56 : 1;
    const birth = smooth((timeMs - timing.birthMs) / 180);
    const gather = smooth((timeMs - timing.birthMs) / (timing.mergedMs - timing.birthMs));
    const radius = (18 + gather * (mergedRadius - 18)) * birth;
    const opacity = 1 - smooth((timeMs - 3800) / (timing.endMs - 3800));
    ctx.save();
    try {
        // 기존 점성 원화의 알파만 검은 실루엣으로 써서 구체와 목의 재질을 잇는다.
        ctx.filter = 'brightness(0)';
        ctx.globalAlpha *= opacity * (frame.reducedMotion ? 0.72 : 1);
        if (gather < 1)
            drawGathering(ctx, scene, root, birth, gather, motion);
        const held = heldHead(root, Math.min(timeMs, timing.splitMs), motion);
        const stretch = smooth((timeMs - timing.stretchMs) / (timing.splitMs - timing.stretchMs));
        if (frame.enhanced &&
            timeMs >= timing.stretchMs &&
            timeMs < timing.splitMs) {
            drawOrbitViscosity(ctx, {
                compression: 0,
                tether: {
                    from: root,
                    to: { x: held.x - 22, y: held.y },
                    rootRadius: 18,
                    tipRadius: 13,
                    neckRadius: 22 * (1 - smooth((timeMs - 2180) / 580)) + 0.6,
                    bend: -Math.sin(stretch * Math.PI) * 9 * motion,
                    frame: 0,
                },
            }, frame.assets.effects);
            ellipse(ctx, root.x, root.y, (mergedRadius - stretch * 20) * birth, (mergedRadius - stretch * 20) * birth, '#070a12');
        }
        else if (frame.enhanced && timeMs >= timing.splitMs) {
            drawSeparation(ctx, scene, root, held, timeMs - timing.splitMs);
        }
        if (timeMs >= timing.arrivalMs) {
            drawOrbImpact(ctx, scene, impact, hitAge);
            return;
        }
        // 사출 전의 같은 머리에서 출발하고, 두 비교판 모두 같은 타점에 도착한다.
        const flight = clamp((timeMs - timing.splitMs) / (timing.arrivalMs - timing.splitMs));
        const arrivalCenterX = impact.x - headRadii(frame, radius, 1).x;
        const head = {
            x: held.x + flight * flight * (arrivalCenterX - held.x),
            y: held.y +
                (impact.y - held.y) * flight -
                Math.sin(flight * Math.PI) * 8 * motion,
        };
        const radii = headRadii(frame, radius, flight);
        ellipse(ctx, head.x, head.y, radii.x, radii.y, '#070a12');
    }
    finally {
        ctx.restore();
    }
}
/** 사출체의 끝 자세를 눌러 받아, 관통해 사라지는 대신 짧게 퍼져 소멸시킨다. */
function drawOrbImpact(ctx, frame, point, age) {
    if (age < 0 || age >= 420)
        return;
    const motion = frame.reducedMotion ? 0.56 : 1;
    const compression = smooth(age / 80);
    const fade = 1 - smooth((age - 75) / 260);
    const arrivalRadii = headRadii(frame, mergedRadius, 1);
    const radiusX = arrivalRadii.x * (1 - compression * 0.72) * fade;
    const radiusY = (arrivalRadii.y + compression * 25 * motion) * fade;
    ellipse(ctx, 
    // 사출 때의 선단이 타점에 닿는 순간부터, 같은 외곽을 그 면에 눌러 이어 간다.
    point.x - radiusX, point.y, radiusX, radiusY, '#070a12');
    if (!frame.enhanced)
        return;
    const count = frame.reducedMotion ? 3 : 5;
    for (let index = 0; index < count; index++) {
        const local = age - 32 - index * 13;
        if (local < 0 || local >= 320)
            continue;
        const p = local / 320;
        const angle = -1.15 + (index / (count - 1)) * 2.2;
        const distance = (18 + (44 + index * 6) * p) * motion;
        drawOrbitViscosity(ctx, {
            compression: 0,
            droplet: {
                point: {
                    x: point.x + Math.cos(angle) * distance,
                    y: point.y + Math.sin(angle) * distance + p * p * 24 * motion,
                },
                radius: (7 + (index % 2) * 3) * (1 - p * 0.82) * motion,
                angle,
                frame: Math.min(8, Math.floor(local / 38)),
                alpha: smooth(local / 22) * (1 - smooth((p - 0.25) / 0.75)),
            },
        }, frame.assets.effects);
    }
}
function drawGathering(ctx, frame, root, birth, gather, motion) {
    for (let i = 0; i < 3; i++) {
        const angle = -2.4 + i * 2.12 + gather * 0.3;
        const distance = (62 + i * 13) * (1 - gather) * motion;
        const point = {
            x: root.x + Math.cos(angle) * distance,
            y: root.y + Math.sin(angle) * distance * 0.78,
        };
        const radius = (18 + i * 4) * birth * (1 - gather * 0.55);
        drawOrbitViscosity(ctx, {
            compression: 0,
            tether: {
                from: root,
                to: point,
                rootRadius: 8 * birth,
                tipRadius: radius * 0.65,
                neckRadius: radius * (0.3 + gather * 0.5),
                bend: Math.sin(gather * Math.PI) * 4,
                frame: 0,
            },
        }, frame.assets.effects);
        ellipse(ctx, point.x, point.y, radius, radius * 0.88, '#070a12');
    }
}
function drawSeparation(ctx, frame, root, held, age) {
    const recoil = 1 - smooth(age / 180);
    ellipse(ctx, root.x, root.y, 14 * recoil, 14 * recoil, '#070a12');
    const count = frame.reducedMotion ? 3 : 5;
    for (let i = 0; i < count; i++) {
        const local = age - i * 32;
        if (local < 0 || local >= 900)
            continue;
        const u = (i + 1) / (count + 1);
        const seconds = local / 1000;
        // 잔여는 절단 직전의 목 위에서 태어나며 발사체와 별도로 짧게 처진다.
        const point = {
            x: root.x + (held.x - 22 - root.x) * u + seconds * (20 + i * 11),
            y: root.y + (held.y - root.y) * u + seconds * seconds * 62,
        };
        drawOrbitViscosity(ctx, {
            compression: 0,
            droplet: {
                point,
                radius: (6 + i * 1.1) * (1 - local / 1400),
                angle: (i - 2) * 0.13,
                frame: Math.min(8, Math.floor(local / 90)),
                alpha: smooth(local / 45) * (1 - smooth((local - 420) / 480)),
            },
        }, frame.assets.effects);
    }
}
