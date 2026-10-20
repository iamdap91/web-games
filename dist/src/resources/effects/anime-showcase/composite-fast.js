import { battleImpact, battleLayout } from './battle.js';
import { clamp, noise, smooth } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawSpeedApproach } from './motion.js';
import { drawShockKomaV2Scene } from './shock-koma-v2.js';
import { drawGameShard } from './technique-effect-resources.js';
export const fastContactCuts = [
    battleLayout.contactMs,
    battleLayout.contactMs + 1000 / 30,
    battleLayout.contactMs + 2000 / 30,
];
/** 같은 정권에 진입·두 코마 접촉 컷·수평 파열·작은 파편의 역할을 나눈다. */
export function drawCompositeFast(ctx, frame) {
    const current = { ...frame, sampleId: 'speed-streamlines' };
    const age = frame.timeMs - battleLayout.contactMs;
    const contactCut = frame.enhanced &&
        !frame.reducedMotion &&
        age >= 0 &&
        frame.timeMs < fastContactCuts[2];
    if (contactCut) {
        drawShockKomaV2Scene(ctx, { ...current, sampleId: 'shock-koma-v2' });
    }
    else {
        drawSpeedApproach(ctx, current);
    }
    const impact = battleImpact(current);
    // 접촉 컷은 기존 원화 판의 1.2배 프레이밍을 쓰므로 빛도 같은 투영을 따른다.
    drawEffectLayer(ctx, 'fx-kanada-light', { ...current, enhanced: true }, {
        layer: 'front',
        point: contactCut ? { x: 570, y: 300 } : impact,
        rotation: 0.84,
        scale: contactCut ? 1.2 : 1,
    });
    if (frame.enhanced)
        drawStrikeFragments(ctx, current, impact);
}
function drawStrikeFragments(ctx, frame, point) {
    const motion = frame.reducedMotion ? 0.5 : 1;
    const count = frame.reducedMotion ? 3 : 7;
    for (let i = 0; i < count; i++) {
        const local = frame.timeMs - battleLayout.contactMs - 90 - i * 14;
        const life = 360 + noise(i + 29) * 230;
        if (local < 0 || local >= life)
            continue;
        const seconds = local / 1000;
        const angle = -0.64 + noise(i + 13) * 1.05;
        const speed = (190 + noise(i + 41) * 165) * motion;
        const x = point.x + Math.cos(angle) * speed * seconds;
        const y = point.y + Math.sin(angle) * speed * seconds + seconds * seconds * 150;
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
