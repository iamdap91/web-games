import { gameImpact } from '../../cutscenes/game-effects.js';
import { battleImpact, battleLayout, drawAtaho, drawBear } from './battle.js';
import { clamp, ellipse, noise, smooth, stage } from './drawing.js';
import { drawGameShard } from './technique-effect-resources.js';
import { width } from './types.js';
const timing = {
    releaseMs: 2100,
    contactMs: 2200,
    holdEndMs: 2320,
    recoilPeakMs: 2660,
    recoverEndMs: 3040,
    settledMs: 3400,
};
export const heavyContactCuts = [
    timing.releaseMs,
    timing.contactMs,
    timing.holdEndMs,
];
/** 준비는 길게, 마지막 두 원화는 빠르게, 접촉 원화는 짧게 고정한다. */
function poseTime(timeMs) {
    if (timeMs < 600)
        return 0;
    if (timeMs < 1300)
        return 1000 + smooth((timeMs - 600) / 700) * 420;
    if (timeMs < timing.releaseMs)
        return 1420 + smooth((timeMs - 1300) / 800) * 220;
    if (timeMs < timing.contactMs)
        return (1640 +
            ((timeMs - timing.releaseMs) / (timing.contactMs - timing.releaseMs)) *
                160);
    if (timeMs < timing.holdEndMs)
        return battleLayout.contactMs + 16;
    return (1960 +
        smooth((timeMs - timing.holdEndMs) / (timing.recoverEndMs - timing.holdEndMs)) *
            840);
}
function recoil(timeMs, reducedMotion) {
    const departure = 1 -
        (1 -
            clamp((timeMs - timing.holdEndMs) / (timing.recoilPeakMs - timing.holdEndMs))) **
            3;
    const settle = smooth((timeMs - timing.recoilPeakMs) / (timing.settledMs - timing.recoilPeakMs));
    return (84 * departure - 12 * settle) * (reducedMotion ? 0.28 : 1);
}
/** 밀린 몸에서 뒤늦게 떨어진 소수의 큰 조각을 중력으로 내려앉힌다. */
function drawHeavyFragments(ctx, frame, impact, layer) {
    const count = frame.reducedMotion ? 2 : 4;
    const motion = frame.reducedMotion ? 0.5 : 1;
    for (let index = 0; index < count; index++) {
        if ((index % 2 === 0 ? 'back' : 'front') !== layer)
            continue;
        const launchMs = timing.holdEndMs + 18 + index * 32;
        const local = frame.timeMs - launchMs;
        if (local < 0)
            continue;
        const size = (13 + noise(index + 71) * 6) * (frame.reducedMotion ? 0.8 : 1);
        const from = {
            x: impact.x + recoil(launchMs, frame.reducedMotion),
            y: impact.y + (index - 1.5) * 6,
        };
        const velocityX = (82 + noise(index + 17) * 46) * motion;
        const velocityY = (72 + noise(index + 43) * 42) * motion;
        const gravity = 600;
        const floorY = battleLayout.target.ground - size * 1.1;
        const landingSeconds = (velocityY +
            Math.sqrt(velocityY ** 2 + 2 * gravity * (floorY - from.y))) /
            gravity;
        const seconds = Math.min(local / 1000, landingSeconds);
        const afterLanding = local - landingSeconds * 1000;
        const opacity = smooth(local / 22) * (1 - smooth((afterLanding - 30) / 220));
        if (opacity <= 0)
            continue;
        ctx.save();
        // 회전한 돌의 모서리도 배우와 같은 바닥선 아래로 내려가지 않게 한다.
        ctx.beginPath();
        ctx.rect(0, 0, width, battleLayout.target.ground);
        ctx.clip();
        ctx.globalAlpha *= opacity;
        ctx.translate(from.x + velocityX * seconds, from.y - velocityY * seconds + (gravity * seconds * seconds) / 2);
        ctx.rotate(seconds * (index % 2 ? -1.4 : 1.1));
        drawGameShard(ctx, frame, {
            point: { x: 0, y: 0 },
            size,
            index,
        });
        ctx.restore();
    }
}
/** 몸의 준비·멈춤·밀림을 공유하고 폭발 대신 작은 압축과 무거운 조각을 잇는다. */
export function drawCompositeHeavy(ctx, frame) {
    const scene = {
        ...frame,
        enhanced: true,
        sampleId: 'speed-streamlines',
    };
    const timeMs = frame.timeMs;
    const contact = scene.assets.straight.steps.find((step) => step.contact).contact;
    const attackerX = battleLayout.impact.x - (contact.reach ?? 0) * battleLayout.attacker.scale;
    const impact = battleImpact(scene);
    const displacement = recoil(timeMs, frame.reducedMotion);
    const contactAge = timeMs - timing.contactMs;
    const reacting = contactAge >= 0 && timeMs < timing.settledMs;
    ctx.save();
    try {
        stage(ctx, scene, 0);
        if (frame.enhanced)
            drawHeavyFragments(ctx, scene, impact, 'back');
        ellipse(ctx, attackerX, 448, 58, 10, '#14293b32');
        ellipse(ctx, 657 + displacement, 448, 115, 15, '#14293b32');
        drawBear(ctx, scene, {
            timeMs: reacting
                ? battleLayout.contactMs + Math.max(0, timeMs - timing.holdEndMs)
                : timeMs,
            state: reacting ? 'hit' : 'stand',
            recoil: {
                displacementX: displacement,
                lift: Math.sin(clamp((timeMs - timing.holdEndMs) / 600) * Math.PI) *
                    (frame.reducedMotion ? 1.5 : 6),
            },
        });
        drawAtaho(ctx, scene, {
            action: 'straight',
            timeMs: poseTime(timeMs),
            x: attackerX,
        });
        gameImpact(ctx, scene.assets.effects, {
            ...impact,
            progress: contactAge / 180,
            size: frame.reducedMotion ? 112 : 168,
        });
        if (frame.enhanced)
            drawHeavyFragments(ctx, scene, impact, 'front');
    }
    finally {
        ctx.restore();
    }
}
