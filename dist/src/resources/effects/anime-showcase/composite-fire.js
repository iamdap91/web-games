import { battleImpact, battleLayout, drawBattleActors } from './battle.js';
import { smooth, stage } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawEffectSprite } from './effect-sprite.js';
import { height, width, } from './types.js';
/** 하나의 접촉 뒤 핵·파열·외곽 거품·공중 연기의 정점을 차례로 넘긴다. */
export function drawCompositeFire(ctx, frame) {
    const elapsed = frame.timeMs - battleLayout.contactMs;
    const point = battleImpact(frame);
    const source = { ...frame, enhanced: true };
    ctx.save();
    try {
        stage(ctx, frame, 0);
        if (!frame.enhanced) {
            drawEffectLayer(ctx, 'fx-kanada-explosion', source, {
                layer: 'back',
                point,
                scale: 0.82,
            });
            drawBattleActors(ctx, frame, { action: 'uppercut' });
            drawEffectLayer(ctx, 'fx-kanada-explosion', source, {
                layer: 'front',
                point,
                scale: 0.82,
            });
            return;
        }
        drawAirSmoke(ctx, source, point, elapsed);
        drawOuterBubbles(ctx, source, point, elapsed, 'back');
        drawCentralBurst(ctx, source, point, elapsed, 'back');
        drawBattleActors(ctx, frame, { action: 'uppercut' });
        drawCentralBurst(ctx, source, point, elapsed, 'front');
        drawOuterBubbles(ctx, source, point, elapsed, 'front');
        drawWhiteCore(ctx, source, point, elapsed);
    }
    finally {
        ctx.restore();
    }
}
function drawCentralBurst(ctx, frame, point, elapsed, layer) {
    // 처음 72ms는 작은 백열 핵만 남겨 두 핵이 동시에 부풀지 않게 한다.
    if (layer === 'front' && elapsed < 72)
        return;
    const opacity = 1 - smooth((elapsed - 700) / 420);
    if (opacity <= 0)
        return;
    drawEffectLayer(ctx, 'fx-kanada-explosion', frame, {
        layer,
        point,
        scale: 0.82,
        opacity,
    });
}
function drawOuterBubbles(ctx, frame, point, elapsed, layer) {
    const local = elapsed - 320;
    const opacity = 0.82 * (1 - smooth((elapsed - 1220) / 420));
    if (local < 0 || opacity <= 0)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    ctx.save();
    try {
        // 거품은 중심의 주먹·표정을 비우고 이미 퍼진 불꽃 바깥에서만 보인다.
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.ellipse(point.x, point.y, 64 * motion, 48 * motion, 0, 0, Math.PI * 2);
        ctx.clip('evenodd');
        drawEffectLayer(ctx, 'fx-oki', { ...frame, timeMs: battleLayout.contactMs + local }, {
            layer,
            point,
            anchor: 'impact',
            // 뒤쪽 큰 거품은 배우 외곽까지 펼치고 앞쪽 작은 거품은 타점을 비운다.
            scale: layer === 'back' ? 1.35 : 0.92,
            opacity: opacity * (layer === 'front' ? 0.75 : 1),
        });
    }
    finally {
        ctx.restore();
    }
}
function drawAirSmoke(ctx, frame, point, elapsed) {
    const local = elapsed - 700;
    const opacity = smooth(local / 180) * (1 - smooth((elapsed - 1540) / 440)) * 0.3;
    if (local < 0 || opacity <= 0)
        return;
    drawEffectLayer(ctx, 'fx-norio', { ...frame, timeMs: battleLayout.contactMs + local }, {
        layer: 'back',
        point: { x: point.x + 24, y: point.y - 20 },
        anchor: 'impact',
        scale: 0.46,
        opacity,
    });
}
function drawWhiteCore(ctx, frame, point, elapsed) {
    if (elapsed < 0 || elapsed >= 72)
        return;
    const pulse = 1 - smooth((elapsed - 18) / 54);
    drawEffectSprite(ctx, frame, {
        key: 'light-clump',
        point,
        width: 54 * (0.88 + pulse * 0.12) * (frame.reducedMotion ? 0.75 : 1),
        opacity: pulse * (frame.reducedMotion ? 0.65 : 1),
    });
}
