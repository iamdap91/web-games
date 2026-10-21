import { battleImpact, battleLayout, battleRecoil } from './battle.js';
import { clamp, noise, smooth } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawSpeedApproach } from './motion.js';
import { drawShockKomaV2Scene } from './shock-koma-v2.js';
import { drawGameShard } from './technique-effect-resources.js';
import { height, width, } from './types.js';
export const fastContactCuts = [
    battleLayout.contactMs,
    battleLayout.contactMs + 1000 / 30,
    battleLayout.contactMs + 2000 / 30,
];
const holdEndMs = fastContactCuts[2];
const reactionEndMs = holdEndMs + 660;
/** 접촉 판의 첫 압축 위치에서 빠르게 밀리고 작은 후퇴만 남겨 정착한다. */
function fastRecoil(timeMs, reducedMotion) {
    if (timeMs < battleLayout.contactMs)
        return { displacementX: 0, lift: 0 };
    const contact = smooth((timeMs - battleLayout.contactMs) / (holdEndMs - battleLayout.contactMs));
    const local = Math.max(0, timeMs - holdEndMs);
    const launch = 1 - (1 - clamp(local / 140)) ** 3;
    const settle = smooth((local - 140) / 380);
    // 기존 쇼크 판은1816ms의 배우를 담으므로 같은 미세 압축에서 풀어낸다.
    const compression = battleRecoil(16, false);
    const motion = reducedMotion ? 0.28 : 1;
    return {
        displacementX: (compression.displacementX * contact +
            (84 - compression.displacementX) * launch -
            14 * settle) *
            motion,
        lift: (compression.lift * contact * (1 - launch) +
            Math.sin(clamp(local / 420) * Math.PI) * 11) *
            motion,
    };
}
/** 쇼크 판 내부의1.2배 구도를 되돌려 타격 전후의 배우·빛 원점을 유지한다. */
function drawContactCut(ctx, frame, impact) {
    ctx.save();
    try {
        ctx.fillStyle = frame.timeMs < fastContactCuts[1] ? '#07050e' : '#fa0757';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;
        ctx.translate(impact.x, impact.y);
        ctx.scale(1 / 1.2, 1 / 1.2);
        ctx.translate(-570, -300);
        drawShockKomaV2Scene(ctx, { ...frame, sampleId: 'shock-koma-v2' });
    }
    finally {
        ctx.restore();
    }
}
/** 같은 정권에 진입·두 코마 접촉 컷·수평 파열·작은 파편의 역할을 나눈다. */
export function drawCompositeFast(ctx, frame) {
    const current = { ...frame, sampleId: 'speed-streamlines' };
    const age = frame.timeMs - battleLayout.contactMs;
    const impact = battleImpact(current);
    const contactCut = frame.enhanced &&
        !frame.reducedMotion &&
        age >= 0 &&
        frame.timeMs < fastContactCuts[2];
    if (contactCut) {
        drawContactCut(ctx, current, impact);
    }
    else {
        const reacting = age >= 0 && frame.timeMs < reactionEndMs;
        drawSpeedApproach(ctx, current, {
            holdEndMs,
            travelDistance: 340,
            target: {
                timeMs: reacting
                    ? battleLayout.contactMs + 16 + Math.max(0, frame.timeMs - holdEndMs)
                    : frame.timeMs,
                state: reacting ? 'hit' : 'stand',
                recoil: fastRecoil(frame.timeMs, frame.reducedMotion),
            },
        });
    }
    // 접촉 판과 정상 무대가 같은 투영이므로 수명이 남은 빛도 점프하지 않는다.
    drawEffectLayer(ctx, 'fx-kanada-light', { ...current, enhanced: true }, {
        layer: 'front',
        point: impact,
        rotation: 0.84,
    });
    if (frame.enhanced)
        drawStrikeFragments(ctx, current, impact);
}
function drawStrikeFragments(ctx, frame, point) {
    const motion = frame.reducedMotion ? 0.5 : 1;
    const count = frame.reducedMotion ? 3 : 7;
    for (let i = 0; i < count; i++) {
        const launchMs = battleLayout.contactMs + 90 + i * 14;
        const local = frame.timeMs - launchMs;
        const life = 280 + noise(i + 29) * 180;
        if (local < 0 || local >= life)
            continue;
        const seconds = local / 1000;
        const angle = -0.64 + noise(i + 13) * 1.05;
        const speed = (280 + noise(i + 41) * 205) * motion;
        const recoil = fastRecoil(launchMs, frame.reducedMotion);
        const x = point.x + recoil.displacementX + Math.cos(angle) * speed * seconds;
        const y = point.y -
            recoil.lift +
            Math.sin(angle) * speed * seconds +
            seconds * seconds * 150;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(seconds * (i % 2 ? 4 : -3));
        ctx.globalAlpha *=
            smooth(local / 22) * (1 - smooth((local / life - 0.42) / 0.58));
        drawGameShard(ctx, frame, {
            point: { x: 0, y: 0 },
            size: (2.5 + noise(i + 61) * 3) * (1 - clamp(local / life) * 0.5),
            index: i,
        });
        ctx.restore();
    }
}
