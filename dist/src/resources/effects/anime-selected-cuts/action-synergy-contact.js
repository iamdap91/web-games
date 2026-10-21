import { ease, fistSmear, lerp, line } from './drawing.js';
import { directionalKick, segment, strikePoint, strikeRootX, synergyBackdrop, synergyBear, synergyDust, synergyHero, synergyImpact, synergyLayout, synergyShadow, synergyShock, } from './action-synergy-shared.js';
const heavyStrike = {
    start: 0.04,
    thrust: 0.4,
    contact: 0.455,
    hold: 0.14,
    handFrame: 12,
    targetX: synergyLayout.bearX,
    reach: 116,
};
const flurryStrikes = [
    {
        start: 0.04,
        thrust: 0.24,
        contact: 0.3,
        hold: 0.025,
        handFrame: 2,
        targetX: synergyLayout.bearX,
        reach: 46,
    },
    {
        start: 0.4,
        thrust: 0.525,
        contact: 0.58,
        hold: 0.025,
        handFrame: 12,
        targetX: synergyLayout.bearX + 14,
        reach: 42,
    },
    {
        start: 0.66,
        thrust: 0.74,
        contact: 0.79,
        hold: 0.025,
        handFrame: 2,
        targetX: synergyLayout.bearX + 28,
        reach: 38,
    },
    {
        start: 0.84,
        thrust: 0.9,
        contact: 0.95,
        hold: 0.025,
        handFrame: 12,
        targetX: synergyLayout.bearX + 42,
        reach: 34,
    },
    {
        start: 1.045,
        thrust: 1.255,
        contact: 1.32,
        hold: 0.115,
        handFrame: 12,
        targetX: synergyLayout.bearX + 56,
        reach: 78,
    },
];
/** 준비와 회수 원화는 남기고 신전 구간만 중간 자세를 생략해 접촉 원화로 보낸다. */
function contactPose(assets, strike, time, previous) {
    const contactX = strikeRootX(assets, strike);
    const preparation = strike.handFrame === 2 ? [0, 1] : [9, 10, 11];
    const recovery = strike.handFrame === 2 ? [3, 4, 5, 6] : [13, 14, 15, 16];
    if (time < strike.thrust) {
        const progress = segment(time, strike.start, strike.thrust - strike.start);
        const fromX = previous
            ? strikeRootX(assets, previous)
            : contactX - strike.reach;
        return {
            action: 'punch',
            index: preparation[Math.min(preparation.length - 1, Math.floor(progress * preparation.length))],
            x: lerp(fromX, contactX - strike.reach, ease(progress)),
        };
    }
    if (time < strike.contact + strike.hold) {
        const progress = segment(time, strike.thrust, strike.contact - strike.thrust);
        return {
            action: 'punch',
            index: progress < 0.3
                ? preparation[preparation.length - 1]
                : strike.handFrame,
            x: contactX - strike.reach * (1 - progress * progress),
        };
    }
    const progress = segment(time, strike.contact + strike.hold, 0.14);
    return {
        action: 'punch',
        index: recovery[Math.min(recovery.length - 1, Math.floor(progress * recovery.length))],
        x: contactX,
    };
}
function flurryPose(assets, time) {
    let index = 0;
    while (index + 1 < flurryStrikes.length &&
        time >= flurryStrikes[index + 1].start)
        index++;
    return contactPose(assets, flurryStrikes[index], time, flurryStrikes[index - 1]);
}
function frozenBackgroundTime(time, strikes) {
    return strikes.reduce((sceneTime, strike) => sceneTime - Math.min(strike.hold, Math.max(0, time - strike.contact)), time);
}
function drawSmear(context, frame, strike, size) {
    if (frame.time < strike.thrust || frame.time >= strike.contact)
        return;
    const point = strikePoint(frame.assets, strike);
    fistSmear(context, point.x - size, point.y, segment(frame.time, strike.thrust, strike.contact - strike.thrust), 0, size);
}
function drawRelease(context, point, age, strength) {
    if (age < 0 || age >= 0.16)
        return;
    const progress = age / 0.16;
    context.save();
    context.globalAlpha *= (1 - progress) * 0.65;
    for (let index = 0; index < 7; index++) {
        const rise = (index - 3) * 0.16;
        const start = 18 + ease(progress) * strength;
        line(context, [
            [point.x + start, point.y + rise * start],
            [point.x + start + 38, point.y + rise * (start + 38)],
        ], index % 2 ? '#fff6d1' : '#e5b36b', index === 3 ? 5 : 2);
    }
    context.restore();
}
/** 접촉 중에는 같은 꺾임을 유지하고 방출 뒤에만 이동·낙하·착지를 진행한다. */
function drawLaunchedBear(context, frame, strike, options) {
    const age = frame.time - strike.contact;
    if (age < 0) {
        synergyShadow(context, { x: strike.targetX, y: synergyLayout.ground }, 102);
        synergyBear(context, frame, {
            x: strike.targetX,
            state: 'stand',
            index: 0,
        });
        return;
    }
    const released = Math.max(0, age - strike.hold);
    const flight = segment(released, 0, options.flight);
    const x = strike.targetX + options.distance * ease(segment(released, 0, 0.15));
    const lift = Math.sin(flight * Math.PI) * options.height;
    const index = released === 0
        ? 3
        : released < 0.045
            ? 4
            : released < 0.12
                ? 5
                : flight < 1
                    ? 6
                    : 7;
    synergyShadow(context, { x, y: synergyLayout.ground }, 102, 1 - lift / 180);
    synergyBear(context, frame, {
        x,
        y: synergyLayout.ground - lift,
        state: 'defeat',
        index,
    });
}
function drawHeavy(context, frame) {
    const strike = heavyStrike;
    const release = strike.contact + strike.hold;
    const age = frame.time - release;
    const point = strikePoint(frame.assets, strike);
    const pose = contactPose(frame.assets, strike, frame.time);
    context.save();
    context.translate(directionalKick(age, 36, 0.16), 0);
    synergyBackdrop(context, frame, {
        time: frozenBackgroundTime(frame.time, [strike]),
    });
    const drawActors = (actors) => {
        drawLaunchedBear(actors, frame, strike, {
            distance: 265,
            height: 78,
            flight: 0.36,
        });
        synergyShadow(actors, { x: pose.x, y: synergyLayout.ground }, 54);
        synergyHero(actors, frame.assets, pose);
    };
    const shock = synergyShock(context, {
        time: frame.time,
        contact: strike.contact,
        point,
        drawActors,
    });
    if (!shock) {
        drawSmear(context, frame, strike, 92);
        drawActors(context);
    }
    synergyImpact(context, frame, {
        point,
        contact: strike.contact,
        size: 285,
        duration: 0.19,
    });
    drawRelease(context, point, age, 180);
    synergyDust(context, frame, {
        x: pose.x - 20,
        contact: strike.thrust,
        size: 130,
        duration: 0.2,
    });
    synergyDust(context, frame, {
        x: strike.targetX + 265,
        contact: release + 0.36,
        size: 280,
        duration: 0.25,
    });
    context.restore();
}
function drawFlurryBear(context, frame) {
    const final = flurryStrikes[4];
    if (frame.time >= final.contact) {
        drawLaunchedBear(context, frame, final, {
            distance: 225,
            height: 64,
            flight: 0.34,
        });
        return;
    }
    let latest;
    let index = 0;
    for (let strikeIndex = 0; strikeIndex < 4; strikeIndex++)
        if (frame.time >= flurryStrikes[strikeIndex].contact) {
            latest = flurryStrikes[strikeIndex];
            index = strikeIndex;
        }
    const x = latest
        ? latest.targetX +
            14 * ease(segment(frame.time, latest.contact + latest.hold, 0.065))
        : synergyLayout.bearX;
    synergyShadow(context, { x, y: synergyLayout.ground }, 102);
    synergyBear(context, frame, {
        x,
        state: latest ? 'defeat' : 'stand',
        index: latest ? 2 + (index % 2) : 0,
    });
}
function drawFlurry(context, frame) {
    const final = flurryStrikes[4];
    const release = final.contact + final.hold;
    const point = strikePoint(frame.assets, final);
    const pose = flurryPose(frame.assets, frame.time);
    context.save();
    context.translate(directionalKick(frame.time - release, 29, 0.14), 0);
    synergyBackdrop(context, frame, {
        time: frozenBackgroundTime(frame.time, flurryStrikes),
    });
    const drawActors = (actors) => {
        drawFlurryBear(actors, frame);
        synergyShadow(actors, { x: pose.x, y: synergyLayout.ground }, 54);
        synergyHero(actors, frame.assets, pose);
    };
    const shock = synergyShock(context, {
        time: frame.time,
        contact: final.contact,
        point,
        drawActors,
        style: 'shock',
    });
    if (!shock) {
        for (const strike of flurryStrikes) {
            if (strike !== final &&
                frame.time >= strike.thrust &&
                frame.time < strike.contact) {
                // 실제 과거 자세를 두 장만 놓아 개별 급신전의 간격을 드러낸다.
                for (const delay of [0.055, 0.028])
                    synergyHero(context, frame.assets, {
                        ...flurryPose(frame.assets, frame.time - delay),
                        alpha: delay > 0.03 ? 0.12 : 0.2,
                        filter: 'brightness(1.3)',
                    });
            }
            drawSmear(context, frame, strike, strike === final ? 80 : 49);
        }
        drawActors(context);
    }
    for (const strike of flurryStrikes)
        synergyImpact(context, frame, {
            point: strikePoint(frame.assets, strike),
            contact: strike.contact,
            size: strike === final ? 265 : 112,
            duration: strike === final ? 0.2 : 0.085,
        });
    drawRelease(context, point, frame.time - release, 150);
    synergyDust(context, frame, {
        x: pose.x - 10,
        contact: final.thrust,
        size: 150,
        duration: 0.19,
    });
    synergyDust(context, frame, {
        x: final.targetX + 225,
        contact: release + 0.34,
        size: 250,
        duration: 0.22,
    });
    context.restore();
}
export const synergyContactCuts = [
    {
        id: 'synergy-heavy-strike',
        title: '절도 강타',
        kind: '2D',
        duration: 1.85,
        description: '낮게 장전한 정권을 중간 자세를 생략한 55ms 신전과 짧은 스미어로 뻗는다. 한 코마 임팩트와 140ms 히트스톱 뒤 수평 반동·큰 밀림·착지로 한 타의 마디를 남긴다.',
        beats: [
            { time: 0.24, label: '준비 · 낮고 긴 장전' },
            { time: 0.42, label: '가속 · 나카누키와 짧은 스미어' },
            { time: 0.455, label: '접촉 · 임팩트 프레임과 140ms 히트스톱' },
            { time: 0.64, label: '방출 · 한 방향 반동과 큰 밀림' },
            { time: 0.955, label: '착지 · 힘의 끝' },
            { time: 1.55, label: '잔심 · 선명한 회수 자세' },
        ],
        draw: drawHeavy,
    },
    {
        id: 'synergy-accelerating-flurry',
        title: '가속 연타',
        kind: '2D',
        duration: 2.35,
        description: '앞의 네 타 간격을 280→210→160ms로 좁히고 짧은 스트로보로 가속을 읽힌다. 끝타 전 장전을 길게 대비한 다섯 번째 정권을 115ms 히트스톱·두 코마 쇼크코마와 방출로 맺는다.',
        beats: [
            { time: 0.16, label: '준비 · 잽의 기점' },
            { time: 0.3, label: '첫 접촉 · 5연타 시작' },
            { time: 0.58, label: '가속 · 280ms 간격' },
            { time: 0.79, label: '가속 · 210ms 간격과 스트로보' },
            { time: 0.95, label: '가속 · 160ms 간격' },
            { time: 1.18, label: '준비 대비 · 끝타 앞의 숨' },
            { time: 1.32, label: '끝 접촉 · 115ms 히트스톱과 쇼크코마' },
            { time: 1.48, label: '방출 · 끝타의 큰 밀림' },
            { time: 1.775, label: '착지 · 연타 종결' },
            { time: 2.05, label: '잔심 · 다섯 타의 끝' },
        ],
        draw: drawFlurry,
    },
];
