import { drawExplosionEffects } from '../anime-showcase/effects-explosions.js';
import { drawNakamura } from '../anime-showcase/effects-flight.js';
import { clamp, ease, smooth, speedLines } from './drawing.js';
import { directionalKick, segment, synergyBackdrop, synergyBear, synergyDust, synergyHero, synergyLayout, synergyShadow, synergyShock, } from './action-synergy-shared.js';
const timing = {
    rise: 0.12,
    apex: 0.43,
    drop: 0.58,
    contact: 0.86,
    cubes: 0.905,
    dust: 0.995,
    bearHit: 1.03,
    settled: 2.1,
};
const foot = { x: 605, y: synergyLayout.ground };
const bearX = 955;
function groundPose(time) {
    const p = segment(time, timing.rise, timing.apex - timing.rise);
    const down = segment(time, timing.drop, timing.contact - timing.drop);
    const recovery = segment(time, timing.contact + 0.09, 0.22);
    if (time < timing.rise)
        return {
            action: 'jump',
            index: Math.min(2, Math.floor(time / 0.04)),
            x: foot.x,
        };
    if (time < timing.drop)
        return {
            action: 'slam',
            index: p < 0.6 ? 1 : 3,
            x: foot.x,
            y: synergyLayout.ground - ease(p) * 215,
        };
    if (time < timing.contact)
        return {
            action: 'slam',
            index: down < 0.7 ? 3 : 4,
            x: foot.x,
            y: synergyLayout.ground - 215 * (1 - down * down),
        };
    return {
        action: 'slam',
        index: time < timing.contact + 0.09
            ? 5
            : 6 + Math.min(2, Math.floor(recovery * 3)),
        x: foot.x,
    };
}
/** 떨어진 상대는 지면 충격파가 도달한 뒤 반응하며 직접 때린 듯한 접촉광을 넣지 않는다. */
function drawGroundActors(context, frame) {
    const time = frame.time;
    const local = time - timing.bearHit;
    const push = 115 * ease(segment(local, 0.065, 0.16));
    const lift = Math.sin(segment(local, 0.065, 0.36) * Math.PI) * 45;
    synergyShadow(context, { x: bearX + push, y: synergyLayout.ground }, 100, 1 - lift / 110);
    synergyBear(context, frame, {
        x: bearX + push,
        y: synergyLayout.ground - lift,
        state: local < 0 ? 'stand' : 'defeat',
        index: local < 0
            ? undefined
            : local < 0.065
                ? 3
                : Math.min(7, 4 + Math.floor(segment(local, 0.065, 0.42) * 4)),
    });
    const pose = groundPose(time);
    const liftAmount = synergyLayout.ground - (pose.y ?? synergyLayout.ground);
    synergyShadow(context, foot, 54 - liftAmount * 0.08, 1 - liftAmount / 360);
    const landingAge = time - timing.contact;
    const compression = landingAge >= 0 && landingAge < 0.12
        ? Math.sin((landingAge / 0.12) * Math.PI)
        : 0;
    context.save();
    context.translate(foot.x, foot.y);
    context.scale(1 + compression * 0.045, 1 - compression * 0.08);
    context.translate(-foot.x, -foot.y);
    synergyHero(context, frame.assets, pose);
    context.restore();
}
function groundEffects(context, frame, layer) {
    const age = frame.time - timing.contact;
    if (age < 0)
        return;
    const opacity = 1 - smooth(segment(frame.time, 1.87, timing.settled - 1.87));
    if (opacity <= 0)
        return;
    context.save();
    context.globalAlpha *= opacity;
    context.beginPath();
    context.rect(0, 0, 1280, synergyLayout.ground + 2);
    context.clip();
    const effectFrame = (start) => ({
        assets: frame.assets,
        timeMs: 1800 + (frame.time - start) * 1000,
        enhanced: true,
        reducedMotion: false,
    });
    if (layer === 'back' && frame.time >= timing.cubes) {
        context.save();
        context.translate(foot.x, foot.y);
        context.scale(0.9, 0.9);
        context.translate(-551, -389);
        drawNakamura(context, effectFrame(timing.cubes));
        context.restore();
    }
    if (frame.time >= timing.dust) {
        context.save();
        context.translate(foot.x, foot.y);
        context.scale(1.16, 0.8);
        context.translate(-546, -407);
        drawExplosionEffects(context, 'fx-anno', effectFrame(timing.dust), layer);
        context.restore();
    }
    context.restore();
}
function groundWave(context, time) {
    const age = time - timing.contact;
    if (age < 0 || age > 0.31)
        return;
    const p = clamp(age / 0.31);
    context.save();
    context.globalAlpha *= (1 - p) * 0.85;
    context.strokeStyle = '#f8e9b4';
    context.lineWidth = 7 * (1 - p) + 1;
    context.beginPath();
    context.ellipse(foot.x, foot.y - 3, 28 + p * 620, 5 + p * 55, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
}
function drawGroundBreak(context, frame) {
    const time = frame.time;
    const age = time - timing.contact;
    const kick = directionalKick(age, 18, 0.16);
    const zoom = 1 +
        smooth(segment(time, 0.15, 0.5)) *
            0.035 *
            (1 - smooth(segment(time, 1.15, 0.3)));
    context.save();
    context.translate(640, 440 + kick);
    context.scale(zoom, zoom);
    context.translate(-640, -440);
    const clearContact = 1 - smooth(segment(time, timing.contact - 0.055, 0.055));
    const falling = segment(time, timing.drop, timing.contact - timing.drop);
    synergyBackdrop(context, frame, { blur: falling * clearContact * 0.4 });
    groundEffects(context, frame, 'back');
    if (!synergyShock(context, {
        time,
        contact: timing.contact,
        point: foot,
        drawActors: (ctx) => drawGroundActors(ctx, frame),
    }))
        drawGroundActors(context, frame);
    if (time < timing.contact && time >= timing.drop)
        speedLines(context, time, falling * clearContact * 0.55, true);
    groundWave(context, time);
    groundEffects(context, frame, 'front');
    synergyDust(context, frame, {
        x: foot.x,
        contact: timing.contact + 0.11,
        size: 330,
        duration: 0.35,
    });
    synergyDust(context, frame, {
        x: bearX + 115,
        contact: timing.bearHit + 0.425,
        size: 210,
        duration: 0.26,
    });
    context.restore();
}
export const synergyGroundCuts = [
    {
        id: 'synergy-ground-break',
        title: '대지 분쇄',
        kind: '2D',
        duration: 2.5,
        description: '짧게 솟은 뒤 급강하해 발이 땅에 닿는 순간을 압축한다. 한 코마 충격 뒤 45ms 늦은 나카무라 큐브와 135ms 늦은 안노 분진이 힘을 이어받고, 전진 충격파가 닿은 곰왕이 뒤늦게 밀려 착지한다.',
        beats: [
            { time: 0.12, label: '짧은 도약' },
            { time: 0.58, label: '급강하 · 세로 유선' },
            { time: 0.86, label: '발 착지 · 압축·충격 코마' },
            { time: 0.92, label: '45ms 지연 · 큐브 파열' },
            { time: 1.05, label: '135ms 지연 · 분진·파동 도달' },
            { time: 1.46, label: '곰왕 착지' },
            { time: 2.1, label: '잔여 소멸 · 종결 자세' },
        ],
        draw: drawGroundBreak,
    },
];
