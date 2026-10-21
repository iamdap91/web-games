import record from '../../../../resources/kutsuna-lightning-sprite.json' with { type: 'json' };
import { battleLayout, battleImpact, drawAtaho, drawBear, sampleAtahoSprite, } from './battle.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawKutsunaStrikeBurst } from './kutsuna-strike-burst.js';
import { width } from './types.js';
const timing = record.preview.timing;
export const kutsunaChargeCuts = [
    timing.releaseMs,
    timing.contactMs,
    timing.hitStopEndMs,
];
const discharges = [
    { x: -18, y: -116, angle: -2.3, reach: 185, delay: 0 },
    { x: 18, y: -116, angle: -0.85, reach: 195, delay: 71 },
    { x: -20, y: -88, angle: 2.65, reach: 165, delay: 147 },
    { x: 20, y: -88, angle: 0.2, reach: 155, delay: 202 },
    { x: -14, y: -12, angle: -2.9, reach: 145, delay: 284 },
    { x: 14, y: -12, angle: -0.35, reach: 135, delay: 336 },
];
/** 길게 모은 자세에서 빠른 신전으로 넘어가고 접촉 원화만 짧게 멈춘다. */
function actorTime(timeMs) {
    if (timeMs < record.preview.chargingBeginMs)
        return 0;
    if (timeMs < timing.chargeFullMs)
        return (1000 +
            smooth((timeMs - record.preview.chargingBeginMs) /
                (timing.chargeFullMs - record.preview.chargingBeginMs)) *
                240);
    if (timeMs < timing.releaseMs)
        return (1240 +
            smooth((timeMs - timing.chargeFullMs) /
                (timing.releaseMs - timing.chargeFullMs)) *
                170);
    if (timeMs < timing.contactMs)
        return (1410 +
            ((timeMs - timing.releaseMs) / (timing.contactMs - timing.releaseMs)) *
                390);
    if (timeMs < timing.hitStopEndMs)
        return battleLayout.contactMs + 16;
    return (1960 +
        smooth((timeMs - timing.hitStopEndMs) /
            (timing.recoverEndMs - timing.hitStopEndMs)) *
            840);
}
function attackerX(frame) {
    const contact = frame.assets.straight.steps.find((step) => step.contact).contact;
    const destination = battleLayout.impact.x - (contact.reach ?? 0) * battleLayout.attacker.scale;
    return (430 +
        smooth((frame.timeMs - timing.releaseMs) / (timing.contactMs - timing.releaseMs)) *
            (destination - 430));
}
function recoil(timeMs, reducedMotion) {
    const age = timeMs - timing.hitStopEndMs;
    const launch = 1 - (1 - clamp(age / 240)) ** 3;
    const settle = smooth((age - 240) / 700);
    return (76 * launch - 12 * settle) * (reducedMotion ? 0.28 : 1);
}
/** 본체는 원본을 유지하고 노출·뿌리·위상만 달리해 몸의 힘으로 읽히게 한다. */
function drawChargingDischarges(ctx, frame, rootX) {
    const age = frame.timeMs - record.preview.chargingBeginMs;
    if (age < 0 || frame.timeMs >= record.preview.chargingEndMs)
        return;
    const actor = sampleAtahoSprite(frame, {
        action: 'straight',
        timeMs: actorTime(frame.timeMs),
        x: rootX,
    });
    const intensity = smooth(age / 480);
    const release = 1 -
        smooth((frame.timeMs - timing.releaseMs) /
            (record.preview.chargingEndMs - timing.releaseMs));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, actor.position.ground);
    ctx.clip();
    for (const [index, discharge] of discharges.entries()) {
        if (frame.reducedMotion && index % 2 !== 0)
            continue;
        const elapsed = age - discharge.delay;
        if (elapsed < 0)
            continue;
        const cycle = Math.floor(elapsed / 310);
        const local = frame.reducedMotion ? 80 : elapsed % 310;
        if (local >= 180)
            continue;
        const head = smooth(local / 65);
        const tail = smooth((local - 85) / 95);
        if (tail >= head)
            continue;
        const reach = discharge.reach *
            (0.65 + intensity * 0.35) *
            (frame.reducedMotion ? 0.7 : 1);
        // 굵은 본체에서 접힘·파열을 거쳐 끊긴 잔전류로 넘긴다.
        const order = [cycle % 2 === 0 ? 0 : 3, 1, 3, 2];
        const exposure = frame.reducedMotion
            ? 0
            : Math.min(3, Math.floor(local / (1000 / 24)));
        const source = record.frames[order[exposure]];
        const pixelScale = reach / (source.tipX - source.anchorX);
        const spriteHeight = source.height * pixelScale;
        ctx.save();
        ctx.translate(actor.position.x + discharge.x, actor.position.ground + discharge.y);
        // 같은 셀을 정렬한 장식처럼 보이지 않게 방사별 각도와 노출 정점을 나눈다.
        ctx.rotate(discharge.angle + (frame.reducedMotion ? 0 : ((cycle % 3) - 1) * 0.11));
        ctx.beginPath();
        ctx.rect(tail * reach, -source.anchorY * pixelScale, (head - tail) * reach + pixelScale, spriteHeight);
        ctx.clip();
        drawEffectSprite(ctx, frame, {
            key: source.key,
            point: { x: 0, y: 0 },
            width: source.width * pixelScale,
            height: spriteHeight,
            opacity: intensity *
                release *
                smooth(local / 18) *
                (1 - smooth((local - 120) / 60)) *
                (frame.reducedMotion ? 0.45 : 1),
        });
        ctx.restore();
    }
    ctx.restore();
}
/** 준비의 가는 전류와 명중의 굵은 전류를 같은 무대에서 비교한다. */
export function drawKutsunaChargeScene(ctx, frame) {
    const timeMs = frame.timeMs;
    const rootX = attackerX(frame);
    const impact = battleImpact(frame);
    const age = timeMs - timing.contactMs;
    const displacement = recoil(timeMs, frame.reducedMotion);
    ctx.save();
    stage(ctx, frame);
    if (frame.enhanced)
        drawKutsunaStrikeBurst(ctx, frame, {
            elapsedMs: age,
            point: impact,
            layer: 'back',
        });
    ellipse(ctx, rootX, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657 + displacement, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame, {
        timeMs: age < 0
            ? timeMs
            : battleLayout.contactMs + Math.max(0, timeMs - timing.hitStopEndMs),
        state: age >= 0 && timeMs < timing.settledMs ? 'hit' : 'stand',
        opacity: 1,
        recoil: { displacementX: displacement, lift: 0 },
    });
    if (frame.enhanced)
        drawChargingDischarges(ctx, frame, rootX);
    drawAtaho(ctx, frame, {
        action: 'straight',
        timeMs: actorTime(timeMs),
        x: rootX,
    });
    if (frame.enhanced)
        drawKutsunaStrikeBurst(ctx, frame, {
            elapsedMs: age,
            point: impact,
            layer: 'front',
        });
    ctx.restore();
}
