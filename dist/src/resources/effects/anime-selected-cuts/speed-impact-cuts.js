import { drawBear, drawHero } from './cast.js';
import { clamp, ease, fistSmear, gameBackground, lerp, line, rand, smearBackground, speedLines, } from './drawing.js';
import { gameDust, gameImpact } from '../../cutscenes/game-effects.js';
const floorY = 585;
const heroPixelScale = 4.2;
const bearPixelScale = 3;
const bearStartX = 760;
const bearContactOffset = 90;
const launchDuration = 0.11;
const flightDuration = 0.29;
const shockCutDuration = 1 / 24;
const recoveryDuration = 0.12;
const step = (time, start, duration) => clamp((time - start) / duration);
const rhythmStrikes = [
    {
        start: 0.04,
        thrust: 0.185,
        contact: 0.24,
        hold: 0.045,
        end: 0.35,
        handFrame: 2,
        targetX: bearStartX,
        reach: 48,
    },
    {
        start: 0.35,
        thrust: 0.355,
        contact: 0.4,
        hold: 0.05,
        end: 0.51,
        handFrame: 12,
        targetX: bearStartX + 24,
        reach: 36,
    },
    {
        start: 0.51,
        thrust: 0.705,
        contact: 0.76,
        hold: 0.105,
        end: 1.06,
        handFrame: 12,
        targetX: bearStartX + 56,
        reach: 42,
    },
];
const dashWindup = 0.41;
const dashContact = 0.49;
const dashHold = 0.075;
const dashThroughEnd = dashContact + dashHold + 0.12;
const dashFinishX = 1140;
const powerStrike = {
    start: 0.04,
    thrust: 0.445,
    contact: 0.5,
    hold: 0.12,
    end: 0.94,
    handFrame: 12,
    targetX: bearStartX,
    reach: 18,
};
function bodyHeight(sprite) {
    return ((sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
        (sprite.bounds?.top ?? 0));
}
function punchX(assets, strike) {
    const sprite = assets.hero.punch['south-east'][strike.handFrame];
    const handX = strike.handFrame === 2 ? 80 : 72;
    return (strike.targetX -
        bearContactOffset -
        (handX - sprite.anchorX) * heroPixelScale);
}
/** 몸의 배율·발 앵커는 고정하고 실제 잽·정권의 준비/접촉/회수 원화만 고른다. */
function punchPose(assets, strike, time) {
    const { handFrame, thrust, contact, hold, end } = strike;
    const contactX = punchX(assets, strike);
    const preparation = handFrame === 2 ? [0, 1] : [9, 10, 11];
    const recovery = handFrame === 2 ? [3, 4, 5, 6] : [13, 14, 15, 16];
    if (time < thrust) {
        const p = step(time, strike.start, thrust - strike.start);
        return {
            action: 'punch',
            frame: preparation[Math.min(preparation.length - 1, Math.floor(p * preparation.length))],
            x: contactX - strike.reach,
        };
    }
    if (time < contact + hold) {
        const p = step(time, thrust, contact - thrust);
        return {
            action: 'punch',
            frame: p < 0.35 ? preparation[preparation.length - 1] : handFrame,
            x: contactX - strike.reach * (1 - p * p),
        };
    }
    // 강타 뒤 팔을 짧게 거둔 다음 끝 자세를 잠가 동작의 마디를 남긴다.
    const p = step(time, contact + hold, Math.min(recoveryDuration, end - contact - hold));
    return {
        action: 'punch',
        frame: recovery[Math.min(recovery.length - 1, Math.floor(p * recovery.length))],
        x: contactX,
    };
}
function drawPose(context, assets, pose, options = {}) {
    const sequence = assets.hero[pose.action]['south-east'];
    const sprite = sequence[pose.frame];
    drawHero(context, assets, {
        x: pose.x,
        y: floorY,
        height: bodyHeight(sprite) * heroPixelScale,
        action: pose.action,
        phase: (pose.frame + 0.5) / sequence.length,
        alpha: options.alpha ?? 1,
        filter: options.filter,
    });
}
function contactPoint(assets, strike) {
    const sprite = assets.hero.punch['south-east'][strike.handFrame];
    const handY = strike.handFrame === 2 ? 46 : 48;
    return {
        x: strike.targetX - bearContactOffset,
        y: floorY + (handY - sprite.feetY) * heroPixelScale,
    };
}
function shadow(context, x, radius, alpha = 1) {
    context.save();
    context.globalAlpha = alpha * 0.28;
    context.fillStyle = '#091717';
    context.beginPath();
    context.ellipse(x, floorY + 2, radius, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
/** 접촉의 급확대와 방출의 반동을 분리해 힘을 받은 뒤 터지는 박자를 만든다. */
function beginScene(context, frame, options) {
    const age = frame.time - options.contact - options.hold;
    const kick = age >= 0 && age < recoveryDuration
        ? -options.kick * Math.pow(1 - age / recoveryDuration, 2)
        : 0;
    const approach = (options.approach ?? 0) *
        ease(step(frame.time, 0.1, options.contact - 0.1));
    const settle = 1 -
        ease(step(frame.time, options.contact + options.hold, recoveryDuration));
    const contactAge = frame.time - options.contact;
    const contactFocus = contactAge < 0
        ? 0
        : 1 - ease(step(contactAge, options.hold, recoveryDuration));
    const zoom = 1 + approach * settle + options.snap * contactFocus;
    const landingAge = age - flightDuration;
    const landingKick = landingAge >= 0 && landingAge < 0.09
        ? Math.sin((landingAge / 0.09) * Math.PI) * 6
        : 0;
    context.save();
    context.translate(670 + kick, 450 + landingKick - kick * 0.2);
    context.scale(zoom, zoom);
    context.translate(-670, -450);
    const backgroundTime = frame.time < options.contact
        ? frame.time
        : options.contact +
            Math.max(0, frame.time - options.contact - options.hold);
    smearBackground(context, frame.surfaces, (background) => gameBackground(background, frame, backgroundTime), options.blur ?? 0);
    // 강타 첫 한 코마는 배우 실루엣과 타점만 남겨 접촉을 읽힌다.
    if (contactAge >= 0 && contactAge < shockCutDuration) {
        context.fillStyle = '#100f16';
        context.fillRect(-100, -100, 1480, 920);
    }
    else if (contactFocus > 0) {
        context.fillStyle = `rgba(6, 13, 20, ${contactFocus * 0.43})`;
        context.fillRect(-100, -100, 1480, 920);
    }
}
function impact(context, frame, strike, options) {
    const age = frame.time - strike.contact;
    const point = contactPoint(frame.assets, strike);
    gameImpact(context, frame.assets.effects, {
        x: point.x + (options.push ?? 0),
        y: point.y,
        progress: age / options.duration,
        size: options.size,
        angle: -0.15,
    });
    if (age < 0 || age >= 0.075)
        return;
    const sharpness = 1 - age / 0.075;
    context.save();
    context.translate(point.x, point.y);
    context.globalAlpha = sharpness;
    context.fillStyle = '#fff9db';
    context.beginPath();
    for (let index = 0; index < 16; index++) {
        const angle = (index * Math.PI) / 8;
        const radius = options.size * (index % 2 ? 0.025 : 0.22);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0)
            context.moveTo(x, y);
        else
            context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.restore();
}
function directionalBurst(context, time, point, strength) {
    if (time < 0 || time > 0.21)
        return;
    const p = clamp(time / 0.21);
    context.save();
    // 정지가 풀릴 때 얇은 면이 팽창해 방출 방향과 압력을 함께 보여준다.
    if (time < 0.13) {
        const wave = time / 0.13;
        context.globalAlpha = (1 - wave) * 0.8;
        context.strokeStyle = '#fff5d4';
        context.lineWidth = 8 * (1 - wave) + 2;
        context.beginPath();
        context.ellipse(point.x + 24 + ease(wave) * strength * 0.5, point.y, 10 + wave * 55, 25 + ease(wave) * strength * 0.55, -0.12, -Math.PI * 0.65, Math.PI * 0.65);
        context.stroke();
    }
    context.globalAlpha = (1 - p) * 0.7;
    for (let index = 0; index < 11; index++) {
        const angle = (rand(index + 12) - 0.5) * 1.5;
        const start = 16 + p * strength * (0.8 + rand(index));
        const length = 14 + (1 - p) * strength * 0.4;
        line(context, [
            [point.x + Math.cos(angle) * start, point.y + Math.sin(angle) * start],
            [
                point.x + Math.cos(angle) * (start + length),
                point.y + Math.sin(angle) * (start + length),
            ],
        ], index % 3 ? '#fff0c5' : '#e7a14f', 1 + (index % 2));
    }
    context.restore();
}
function reaction(context, frame, options) {
    const age = frame.time - options.contact;
    const released = Math.max(0, age - options.hold);
    const launch = ease(released / launchDuration);
    const settle = ease((released - launchDuration) / 0.18);
    const push = (options.priorPush ?? 0) +
        options.distance * launch -
        (options.defeat ? 12 * settle : 0);
    const flight = clamp(released / flightDuration);
    const bounce = options.defeat
        ? Math.sin(step(released, flightDuration, 0.09) * Math.PI) * 7
        : 0;
    const airborne = 4 * flight * (1 - flight) * options.flight + bounce;
    const state = age < 0 ? 'stand' : 'defeat';
    // 기립에 가까운 피격 말미와 쓰러짐 첫 장으로 되돌아가지 않고 꺾임을 이어간다.
    const reactionFrame = !options.defeat || age < options.hold
        ? (options.contactFrame ?? 3)
        : released < 0.055
            ? 4
            : released < 0.14
                ? 5
                : released < flightDuration
                    ? 6
                    : 7;
    shadow(context, bearStartX + push, 105, 1 - airborne / 180);
    drawBear(context, frame.assets, {
        x: bearStartX + push,
        y: floorY - airborne,
        height: frame.assets.bear[state][0].image.naturalHeight * bearPixelScale,
        state,
        phase: age < 0
            ? frame.time * 0.8
            : (reactionFrame + 0.5) / frame.assets.bear.defeat.length,
        filter: options.defeat && age >= 0 && age < shockCutDuration
            ? 'brightness(0) invert(1)'
            : age >= 0 && age < 0.038
                ? 'brightness(1.35)'
                : 'none',
    });
    if (options.defeat)
        gameDust(context, frame.assets.effects, {
            x: bearStartX + push,
            y: floorY,
            progress: (released - flightDuration) / 0.2,
            size: 300,
        });
    return push;
}
function rhythmPose(assets, time) {
    const index = time < rhythmStrikes[1].start ? 0 : time < rhythmStrikes[2].start ? 1 : 2;
    const strike = rhythmStrikes[index];
    const pose = punchPose(assets, strike, time);
    if (index === 0 || time >= strike.thrust)
        return pose;
    const previous = punchX(assets, rhythmStrikes[index - 1]);
    return {
        ...pose,
        x: lerp(previous, pose.x, ease(step(time, strike.start, Math.min(0.06, strike.thrust - strike.start)))),
    };
}
function drawRhythm(context, frame) {
    const time = frame.time;
    const final = rhythmStrikes[2];
    beginScene(context, frame, {
        contact: final.contact,
        hold: final.hold,
        kick: 46,
        approach: 0.02,
        snap: 0.115,
    });
    const pose = rhythmPose(frame.assets, time);
    shadow(context, pose.x, 53);
    if (time < final.contact) {
        const index = time < rhythmStrikes[1].contact ? 0 : 1;
        const strike = rhythmStrikes[index];
        reaction(context, frame, {
            contact: strike.contact,
            hold: strike.hold,
            distance: index === 0 ? 24 : 32,
            priorPush: strike.targetX - bearStartX,
            flight: 0,
            contactFrame: index === 0 ? 2 : 3,
        });
    }
    else
        reaction(context, frame, {
            contact: final.contact,
            hold: final.hold,
            distance: 250,
            priorPush: final.targetX - bearStartX,
            flight: 84,
            defeat: true,
        });
    drawPose(context, frame.assets, pose, {
        filter: time >= final.contact && time < final.contact + shockCutDuration
            ? 'brightness(0) invert(1)'
            : 'none',
    });
    for (const strike of rhythmStrikes) {
        const point = contactPoint(frame.assets, strike);
        const thrust = step(time, strike.thrust, strike.contact - strike.thrust);
        if (time >= strike.thrust && time < strike.contact)
            fistSmear(context, point.x - 24, point.y, thrust, -0.12, strike === final ? 170 : 90);
        impact(context, frame, strike, {
            size: strike === final ? 310 : 135,
            duration: strike === final ? 0.22 : 0.1,
        });
    }
    directionalBurst(context, time - final.contact - final.hold, contactPoint(frame.assets, final), 210);
    gameDust(context, frame.assets.effects, {
        x: pose.x,
        y: floorY,
        progress: (time - final.thrust) / 0.17,
        size: 180,
    });
    context.restore();
}
function dashPose(assets, time) {
    const contactX = punchX(assets, { handFrame: 12, targetX: bearStartX });
    if (time < dashWindup) {
        const p = step(time, 0.08, dashWindup - 0.08);
        return {
            action: 'run',
            frame: Math.floor(Math.max(0, time - 0.08) * 24) % 4,
            x: lerp(170, contactX - 90, p * p),
        };
    }
    if (time < dashContact + dashHold)
        return {
            action: 'punch',
            frame: time < dashWindup + 0.025 ? 11 : 12,
            x: lerp(contactX - 90, contactX, Math.pow(step(time, dashWindup, dashContact - dashWindup), 2)),
        };
    const travel = ease(step(time, dashContact + dashHold, dashThroughEnd - dashContact - dashHold));
    const recovery = Math.min(3, Math.floor(step(time, 0.71, recoveryDuration) * 4));
    return {
        action: 'punch',
        frame: time < 0.71 ? 12 : 13 + recovery,
        x: lerp(contactX, dashFinishX, travel),
    };
}
function drawDash(context, frame) {
    const time = frame.time;
    const moving = (time >= 0.16 && time < dashContact) ||
        (time >= dashContact + dashHold && time < dashThroughEnd);
    beginScene(context, frame, {
        contact: dashContact,
        hold: dashHold,
        kick: 34,
        blur: moving ? 0.65 : 0,
        snap: 0.1,
    });
    if (moving)
        speedLines(context, time, 0.46);
    reaction(context, frame, {
        contact: dashContact,
        hold: dashHold,
        distance: 130,
        flight: 60,
        defeat: true,
    });
    const pose = dashPose(frame.assets, time);
    shadow(context, pose.x, 53);
    if (moving)
        for (let index = 3; index >= 1; index--) {
            const previous = dashPose(frame.assets, Math.max(0, time - index * 0.026));
            if (pose.x - previous.x > 12)
                drawPose(context, frame.assets, previous, {
                    alpha: (4 - index) * 0.055,
                });
        }
    drawPose(context, frame.assets, pose, {
        filter: time >= dashContact && time < dashContact + shockCutDuration
            ? 'brightness(0) invert(1)'
            : 'none',
    });
    const strike = {
        contact: dashContact,
        handFrame: 12,
        targetX: bearStartX,
    };
    if (time >= dashWindup && time < dashContact) {
        const point = contactPoint(frame.assets, strike);
        fistSmear(context, point.x - 32, point.y, step(time, dashWindup, dashContact - dashWindup), 0, 180);
    }
    impact(context, frame, strike, { size: 260, duration: 0.18 });
    directionalBurst(context, time - dashContact - dashHold, contactPoint(frame.assets, strike), 190);
    gameDust(context, frame.assets.effects, {
        x: dashFinishX,
        y: floorY,
        progress: (time - dashThroughEnd) / 0.2,
        size: 180,
    });
    context.restore();
}
function drawPower(context, frame) {
    const { contact, hold } = powerStrike;
    const time = frame.time;
    beginScene(context, frame, {
        contact,
        hold,
        kick: 55,
        approach: 0.02,
        snap: 0.14,
    });
    const pose = punchPose(frame.assets, powerStrike, time);
    const push = reaction(context, frame, {
        contact,
        hold,
        distance: 300,
        flight: 96,
        defeat: true,
    });
    shadow(context, pose.x, 53);
    drawPose(context, frame.assets, pose, {
        filter: time >= contact && time < contact + shockCutDuration
            ? 'brightness(0) invert(1)'
            : 'none',
    });
    impact(context, frame, powerStrike, {
        size: 285,
        duration: 0.23,
        push: Math.min(55, Math.max(0, push)),
    });
    directionalBurst(context, time - contact - hold, contactPoint(frame.assets, powerStrike), 270);
    gameDust(context, frame.assets.effects, {
        x: pose.x,
        y: floorY,
        progress: (time - contact) / 0.2,
        size: 135,
    });
    context.restore();
}
export const speedImpactCuts = [
    {
        id: 'rhythm-rush',
        title: '박자 연격',
        kind: '2D',
        duration: 1.75,
        description: '빠른 두 타로 자세를 꺾고 끝타의 급확대·실루엣 충격 코마로 박자를 바꾼다. 접촉을 붙잡았다가 충격파·방향성 파열과 빠른 방출·착지로 끝낸다.',
        beats: [
            { time: 0.185, label: '잽 · 급신전' },
            { time: 0.24, label: '첫 접촉 · 자세 꺾임' },
            { time: 0.4, label: '두 번째 접촉 · 누적 피격' },
            { time: 0.65, label: '끝타 장전 · 박자 압축' },
            { time: 0.76, label: '끝타 · 105ms 접촉 유지' },
            { time: 0.91, label: '방출 · 방향성 반동' },
            { time: 1.16, label: '착지 · 낮은 파열' },
            { time: 1.45, label: '잔심' },
        ],
        draw: drawRhythm,
    },
    {
        id: 'piercing-dash',
        title: '관통 돌파',
        kind: '2D',
        duration: 1.45,
        description: '가속 질주와 성긴 잔상 뒤 접촉에서 흐림을 걷고 급확대·실루엣 충격 코마를 넣는다. 꺾이는 자세를 붙잡았다가 충격파와 함께 반대편까지 돌파한다.',
        beats: [
            { time: 0.33, label: '가속 질주 · 성긴 잔상' },
            { time: 0.46, label: '정권 급신전' },
            { time: 0.49, label: '접촉 · 75ms 유지' },
            { time: 0.64, label: '반대편 돌파' },
            { time: 0.86, label: '팔 회수 · 곰왕 착지' },
            { time: 1.15, label: '선명한 도착 자세' },
        ],
        draw: drawDash,
    },
    {
        id: 'short-power',
        title: '촌경 강타',
        kind: '2D',
        duration: 1.6,
        description: '작은 정권의 급확대·실루엣 충격 코마로 접촉을 붙잡는다. 자세 꺾임 뒤 팽창하는 충격파·방향성 파열과 빠른 방출·착지로 힘을 전달한다.',
        beats: [
            { time: 0.32, label: '짧은 거리 · 힘 모으기' },
            { time: 0.47, label: '정권 급신전' },
            { time: 0.5, label: '접촉 · 120ms 유지' },
            { time: 0.67, label: '큰 방출 · 방향성 파열' },
            { time: 0.91, label: '곰왕 착지' },
            { time: 1.3, label: '작은 동작 · 큰 결과' },
        ],
        draw: drawPower,
    },
];
