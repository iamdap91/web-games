import { drawKiSprite, kiSpriteFrame, } from '../../characters/ataho-v2-combos/ki-sprites.js';
import { battleImpact, battleLayout, drawAtaho, drawBear } from './battle.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
const casterDistance = 190;
const shots = [
    {
        launchMs: 760,
        arriveMs: 1960,
        layer: 'back',
        first: { x: 550, y: 95 },
        last: { x: 830, y: 115 },
        push: -1,
    },
    {
        launchMs: 960,
        arriveMs: 2220,
        layer: 'front',
        first: { x: 430, y: 390 },
        last: { x: 410, y: 435 },
        push: 1,
    },
    {
        launchMs: 1160,
        arriveMs: 2470,
        layer: 'back',
        first: { x: 730, y: 40 },
        last: { x: 920, y: 230 },
        push: -1,
    },
    {
        launchMs: 1370,
        arriveMs: 2760,
        layer: 'front',
        first: { x: 420, y: 130 },
        last: { x: 780, y: 85 },
        push: -1,
    },
];
function targetReaction(timeMs, reducedMotion) {
    const displacement = shots.reduce((total, shot) => {
        const age = timeMs - shot.arriveMs;
        if (age < 0)
            return total;
        const pulse = Math.sin(clamp(age / 300) * Math.PI) * 9;
        return total + shot.push * (pulse + smooth(age / 360) * 3);
    }, 0);
    return displacement * (reducedMotion ? 0.32 : 1);
}
/** 도착 시각의 표적 반동까지 같은 경로에 반영해 꼬리와 탄두가 따로 쫓지 않게 한다. */
function flightPoint(shot, timeMs, frame) {
    const target = battleImpact(frame);
    const origin = { x: target.x - casterDistance, y: target.y };
    const endpoint = {
        x: target.x + targetReaction(shot.arriveMs, frame.reducedMotion),
        y: target.y,
    };
    const motion = frame.reducedMotion ? 0.58 : 1;
    const first = {
        x: origin.x + (shot.first.x - origin.x) * motion,
        y: origin.y + (shot.first.y - origin.y) * motion,
    };
    const last = {
        x: endpoint.x + (shot.last.x - target.x) * motion,
        y: endpoint.y + (shot.last.y - target.y) * motion,
    };
    const p = clamp((timeMs - shot.launchMs) / (shot.arriveMs - shot.launchMs));
    const q = 1 - p;
    return {
        x: q ** 3 * origin.x +
            3 * q * q * p * first.x +
            3 * q * p * p * last.x +
            p ** 3 * endpoint.x,
        y: q ** 3 * origin.y +
            3 * q * q * p * first.y +
            3 * q * p * p * last.y +
            p ** 3 * endpoint.y,
    };
}
/** 사출이 끝난 뒤에도 이미 태어난 꼬리 연기는 각자의 수명을 마친다. */
function drawSmokeTrail(ctx, frame, shot) {
    const stepMs = frame.reducedMotion ? 110 : 66;
    const lifeMs = frame.reducedMotion ? 330 : 460;
    for (let emittedMs = shot.launchMs + 40; emittedMs < shot.arriveMs - 45; emittedMs += stepMs) {
        const age = frame.timeMs - emittedMs;
        if (age < 0 || age >= lifeMs)
            continue;
        const p = age / lifeMs;
        const point = flightPoint(shot, emittedMs, frame);
        drawEffectSprite(ctx, frame, {
            key: `smoke-${p < 0.24 ? 0 : p < 0.7 ? 2 : 3}`,
            point: { x: point.x, y: point.y - p * 7 },
            width: (10 + p * 16) * (shot.layer === 'back' ? 0.8 : 1),
            height: 10 + p * 10,
            opacity: smooth(age / 45) * (1 - smooth((p - 0.25) / 0.75)) * 0.42,
        });
    }
}
function drawFlight(ctx, frame, shot) {
    const age = frame.timeMs - shot.launchMs;
    if (age < 0 || frame.timeMs >= shot.arriveMs)
        return;
    const point = flightPoint(shot, frame.timeMs, frame);
    const previous = flightPoint(shot, frame.timeMs - 8, frame);
    const size = (shot.layer === 'back' ? 58 : 76) * (frame.reducedMotion ? 0.82 : 1);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(point.y - previous.y, point.x - previous.x));
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'orb',
        frame: kiSpriteFrame(age, { start: 4, count: 4, frameMs: 75, loop: true }),
        point: { x: 0, y: 0 },
        width: size,
        height: size,
        anchorX: 0.65,
        alpha: smooth(age / 28),
    });
    ctx.restore();
}
function drawArrival(ctx, frame, shot) {
    const age = frame.timeMs - shot.arriveMs;
    if (age < 0 || age >= 300)
        return;
    drawKiSprite(ctx, frame.assets.effects, {
        sheet: 'orb',
        frame: kiSpriteFrame(age, { start: 8, count: 8, frameMs: 36 }),
        point: flightPoint(shot, shot.arriveMs, frame),
        width: frame.reducedMotion ? 65 : 88,
        height: frame.reducedMotion ? 65 : 88,
        alpha: 1 - smooth((age - 140) / 160),
    });
}
function drawArrivalSmoke(ctx, frame, shot) {
    const age = frame.timeMs - shot.arriveMs - 85;
    if (age < 0 || age >= 620)
        return;
    const point = flightPoint(shot, shot.arriveMs, frame);
    const p = age / 620;
    drawEffectSprite(ctx, frame, {
        key: `smoke-${p < 0.2 ? 0 : p < 0.72 ? 2 : 3}`,
        point: {
            x: point.x - shot.push * (12 + p * 12),
            y: point.y - p * (frame.reducedMotion ? 12 : 25),
        },
        width: (24 + smooth(age / 150) * 28) * (frame.reducedMotion ? 0.8 : 1),
        height: 24 + smooth(age / 150) * 22,
        opacity: smooth(age / 70) * (1 - smooth((p - 0.45) / 0.55)) * 0.48,
    });
}
function casterTime(timeMs) {
    if (timeMs < 300)
        return 0;
    if (timeMs < shots[0].launchMs)
        return 1000 + smooth((timeMs - 300) / (shots[0].launchMs - 300)) * 800;
    if (timeMs < 1580)
        return battleLayout.contactMs + 16;
    return 1960 + smooth((timeMs - 1580) / 720) * 840;
}
/** 빗나가는 서커스와 달리 네 곡선의 도착과 같은 표적의 피격을 함께 소유한다. */
export function drawCompositeSiege(ctx, frame) {
    const scene = { ...frame, sampleId: 'fx-kanada-beam', enhanced: true };
    const contact = scene.assets.straight.steps.find((step) => step.contact).contact;
    const casterX = battleLayout.impact.x -
        casterDistance -
        (contact.reach ?? 0) * battleLayout.attacker.scale;
    const displacement = targetReaction(frame.timeMs, frame.reducedMotion);
    let latest;
    for (const shot of shots) {
        if (frame.timeMs < shot.arriveMs)
            break;
        latest = shot;
    }
    const hitAge = latest ? frame.timeMs - latest.arriveMs : -1;
    const reacting = hitAge >= 0 && hitAge < 360;
    ctx.save();
    try {
        stage(ctx, scene, 0);
        for (const shot of shots) {
            if (frame.enhanced)
                drawArrivalSmoke(ctx, scene, shot);
            if (shot.layer !== 'back')
                continue;
            if (frame.enhanced)
                drawSmokeTrail(ctx, scene, shot);
            drawFlight(ctx, scene, shot);
        }
        ellipse(ctx, casterX, 448, 58, 10, '#14293b32');
        ellipse(ctx, 657 + displacement, 448, 115, 15, '#14293b32');
        drawBear(ctx, scene, {
            timeMs: reacting ? battleLayout.contactMs + hitAge : frame.timeMs,
            state: reacting ? 'hit' : 'stand',
            recoil: { displacementX: displacement, lift: 0 },
        });
        drawAtaho(ctx, scene, {
            action: 'straight',
            timeMs: casterTime(frame.timeMs),
            x: casterX,
        });
        for (const shot of shots) {
            if (shot.layer === 'front') {
                if (frame.enhanced)
                    drawSmokeTrail(ctx, scene, shot);
                drawFlight(ctx, scene, shot);
            }
            drawArrival(ctx, scene, shot);
        }
    }
    finally {
        ctx.restore();
    }
}
