import { drawOrbitViscosity } from '../../characters/ataho-v2-combos/orbit-viscosity-drawing.js';
import { atahoPosition, battleImpact, battleLayout, drawBattleActors, } from './battle.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
const timing = {
    birthMs: 950,
    mergedMs: 1650,
    stretchMs: battleLayout.contactMs,
    splitMs: 2760,
    flightMs: 600,
    endMs: 3720,
};
function heldHead(root, timeMs, motion) {
    const p = clamp((timeMs - timing.stretchMs) / (timing.splitMs - timing.stretchMs));
    return {
        x: root.x + smooth(p) * 92 * motion,
        y: root.y - Math.sin(p * Math.PI) * 16 * motion,
    };
}
/** 합체한 같은 덩어리가 목을 당기고, 끊긴 위치에서 가속해 떠난다. */
export function drawCompositeOrb(ctx, frame) {
    const scene = { ...frame, sampleId: 'fx-kozuma' };
    const impact = battleImpact(scene);
    const chargedPosition = atahoPosition(scene, {
        action: 'straight',
        timeMs: Math.min(frame.timeMs, timing.stretchMs),
    });
    const contactPosition = atahoPosition(scene, {
        action: 'straight',
        timeMs: timing.stretchMs,
    });
    // 준비 중에는 배우를 따르고, 명중 뒤에는 같은 세계 좌표에 목과 잔여를 남긴다.
    const root = {
        x: impact.x + chargedPosition.x - contactPosition.x,
        y: impact.y + chargedPosition.ground - contactPosition.ground,
    };
    const timeMs = frame.timeMs;
    stage(ctx, scene, 0);
    drawBattleActors(ctx, scene, { action: 'straight' });
    if (timeMs < timing.birthMs || timeMs >= timing.endMs)
        return;
    const motion = frame.reducedMotion ? 0.56 : 1;
    const birth = smooth((timeMs - timing.birthMs) / 180);
    const gather = smooth((timeMs - timing.birthMs) / (timing.mergedMs - timing.birthMs));
    const radius = (18 + gather * 16) * birth;
    const opacity = 1 - smooth((timeMs - 3300) / (timing.endMs - 3300));
    ctx.save();
    try {
        // 기존 점성 원화의 알파만 검은 실루엣으로 써서 구체와 목의 재질을 잇는다.
        ctx.filter = 'brightness(0)';
        ctx.globalAlpha *= opacity * (frame.reducedMotion ? 0.72 : 1);
        if (gather < 1)
            drawGathering(ctx, scene, root, birth, gather, motion);
        if (!frame.enhanced) {
            ellipse(ctx, root.x, root.y, radius, radius, '#070a12');
            return;
        }
        const held = heldHead(root, Math.min(timeMs, timing.splitMs), motion);
        const stretch = smooth((timeMs - timing.stretchMs) / (timing.splitMs - timing.stretchMs));
        if (timeMs >= timing.stretchMs && timeMs < timing.splitMs) {
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
            ellipse(ctx, root.x, root.y, (34 - stretch * 20) * birth, (34 - stretch * 20) * birth, '#070a12');
        }
        else if (timeMs >= timing.splitMs) {
            drawSeparation(ctx, scene, root, held, timeMs - timing.splitMs);
        }
        const flight = clamp((timeMs - timing.splitMs) / timing.flightMs);
        const head = {
            x: held.x + flight * flight * 480 * motion,
            y: held.y + flight * 8 * motion,
        };
        const fade = 1 - smooth((timeMs - 3200) / 360);
        const elongation = 1 + flight * (frame.reducedMotion ? 0.25 : 0.8);
        ctx.globalAlpha *= fade;
        ellipse(ctx, head.x, head.y, radius * elongation, radius / elongation, '#070a12');
    }
    finally {
        ctx.restore();
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
