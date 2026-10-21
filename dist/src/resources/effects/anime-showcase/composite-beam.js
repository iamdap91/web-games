import { atahoPosition, battleImpact, battleLayout, drawAtaho, drawBear, } from './battle.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawKanadaBeam, sampleKanadaBeam } from './effects-light.js';
import { height } from './types.js';
const timing = {
    emissionMs: 1900,
    contactMs: 2220,
    holdEndMs: 2280,
    currentMs: 2300,
    releaseMs: 2840,
    beamEndMs: 3260,
    settleMs: 3620,
};
export const beamContactCuts = [timing.contactMs, timing.holdEndMs];
function actorTime(timeMs) {
    if (timeMs < battleLayout.contactMs)
        return timeMs;
    if (timeMs < timing.releaseMs)
        return 1816;
    return 1960 + smooth((timeMs - timing.releaseMs) / 650) * 840;
}
function beamFrame(frame) {
    const growMs = frame.reducedMotion ? 620 : 440;
    const t = frame.timeMs;
    const age = t < timing.contactMs
        ? ((t - timing.emissionMs) / (timing.contactMs - timing.emissionMs)) *
            growMs
        : t < timing.releaseMs
            ? growMs +
                smooth((t - timing.contactMs) / (timing.releaseMs - timing.contactMs)) *
                    (1420 - growMs)
            : 1420 +
                ((t - timing.releaseMs) / (timing.beamEndMs - timing.releaseMs)) *
                    660;
    return {
        ...frame,
        sampleId: 'fx-kanada-beam',
        enhanced: true,
        timeMs: 1800 + age,
    };
}
function targetRecoil(frame) {
    const age = frame.timeMs - timing.holdEndMs;
    const motion = frame.reducedMotion ? 0.3 : 1;
    const push = smooth(age / 280) * 44;
    const settle = smooth((frame.timeMs - timing.beamEndMs) / 360) * 8;
    return {
        displacementX: (push - settle) * motion,
        lift: Math.sin(clamp(age / 320) * Math.PI) * 5 * motion,
    };
}
/** 곡선 선단을 같은 표적에 맞추고 성장이 끝난 순간을 접촉으로 삼는다. */
function drawBeamLayer(ctx, frame, source, target) {
    if (frame.timeMs < timing.emissionMs || frame.timeMs >= timing.beamEndMs)
        return;
    const beam = beamFrame(frame);
    const shape = sampleKanadaBeam(beam);
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const distance = Math.hypot(target.x - source.x, target.y - source.y);
    // 짧은 사거리에도 횡방향 두께와 요동은 남겨, 광선이 가는 줄로 축소되지 않게 한다.
    const thickness = frame.reducedMotion ? 0.32 : 0.52;
    const scaleX = Math.sqrt(Math.max(1, distance ** 2 - (shape.tipHeight * thickness) ** 2)) /
        548;
    const headAngle = Math.atan2((shape.head.y - 300) * thickness, (shape.head.x - 267) * scaleX);
    ctx.save();
    // 넓은 선단은 접촉 핵으로 넘기고 몸 뒤까지 관통하지 않게 한다.
    ctx.beginPath();
    ctx.rect(0, 0, target.x + 8, height);
    ctx.clip();
    ctx.translate(source.x, source.y);
    ctx.rotate(angle - headAngle);
    ctx.scale(scaleX, thickness);
    ctx.translate(-267, -300);
    drawKanadaBeam(ctx, beam);
    ctx.restore();
}
function drawCurrent(ctx, frame, source, target) {
    const age = frame.timeMs - timing.currentMs;
    if (age < 0 || frame.timeMs >= timing.beamEndMs + 160)
        return;
    const fade = 1 - smooth((frame.timeMs - timing.releaseMs) / 580);
    const count = frame.reducedMotion ? 2 : 4;
    for (let index = 0; index < count; index++) {
        const local = (age + index * 43) % 185;
        if (local >= 132)
            continue;
        const fraction = 0.28 + index * 0.2;
        const cell = frame.reducedMotion
            ? 1
            : [0, 3, 1, 2][Math.min(3, Math.floor(local / 33))];
        const width = (frame.reducedMotion ? 42 : 68) *
            (0.65 + Math.sin((local / 132) * Math.PI) * 0.35);
        const branch = (index % 2 ? 1 : -1) * (0.48 + index * 0.13);
        drawEffectSprite(ctx, frame, {
            key: `kutsuna-body-${cell}`,
            point: {
                x: source.x + (target.x - source.x) * fraction,
                y: source.y + (target.y - source.y) * fraction,
            },
            width,
            height: width / 2,
            rotation: branch,
            opacity: fade * (1 - smooth((local - 72) / 60)) * 0.74,
        });
    }
}
function drawContact(ctx, frame, point) {
    const age = frame.timeMs - timing.contactMs;
    if (age < 0 || frame.timeMs >= timing.beamEndMs + 130)
        return;
    const fade = 1 - smooth((frame.timeMs - timing.releaseMs) / 550);
    const opening = 1 - smooth(age / 170);
    const pulse = frame.reducedMotion
        ? 0
        : Math.sin(Math.floor(age / 83) * 2.3) * 4;
    drawEffectSprite(ctx, frame, {
        key: 'light-clump',
        point,
        width: (36 + opening * 46 + pulse) * (frame.reducedMotion ? 0.65 : 1),
        opacity: fade * 0.92,
    });
    if (!frame.enhanced || age >= 220)
        return;
    drawEffectSprite(ctx, frame, {
        key: 'burst-spike',
        point,
        width: (50 + smooth(age / 70) * 75) * (frame.reducedMotion ? 0.6 : 1),
        height: 90,
        rotation: Math.PI / 2,
        opacity: (1 - smooth((age - 40) / 180)) * 0.8,
    });
}
/** 방출·선단 접촉·밀림·후단 이탈을 같은 시계로 연결한다. */
export function drawCompositeBeam(ctx, frame) {
    const current = {
        ...frame,
        sampleId: 'fx-kanada-beam',
        timeMs: actorTime(frame.timeMs),
    };
    const impact = battleImpact(current);
    const source = { x: impact.x - 160, y: impact.y };
    const recoil = targetRecoil(frame);
    const target = {
        x: impact.x + recoil.displacementX,
        y: impact.y - recoil.lift,
    };
    const position = atahoPosition(current, { action: 'straight' });
    const hitAge = frame.timeMs - timing.contactMs;
    const bearClock = hitAge < 0 ? 0 : 1800 + Math.max(0, frame.timeMs - timing.holdEndMs);
    stage(ctx, frame, 0);
    ellipse(ctx, position.x - 160, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657 + recoil.displacementX, 448, 115, 15, '#14293b32');
    drawBeamLayer(ctx, frame, source, target);
    drawBear(ctx, { ...frame, timeMs: bearClock }, {
        state: hitAge < 0 || frame.timeMs >= timing.settleMs ? 'stand' : 'hit',
        recoil,
    });
    ctx.save();
    ctx.translate(-160, 0);
    drawAtaho(ctx, current, { action: 'straight' });
    ctx.restore();
    drawContact(ctx, frame, target);
    if (!frame.enhanced)
        return;
    drawCurrent(ctx, frame, source, target);
    const age = frame.timeMs - (timing.emissionMs - 90);
    if (age < 0 || age >= 250)
        return;
    const pulse = smooth(age / 55) * (1 - smooth((age - 85) / 165));
    drawEffectSprite(ctx, frame, {
        key: 'light-clump',
        point: source,
        width: (frame.reducedMotion ? 23 : 34) * pulse,
        opacity: pulse * 0.9,
    });
}
