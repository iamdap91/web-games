import { arenaCuts } from './arena-cuts.js';
import { ease, fistSmear, lerp, line, rand } from './drawing.js';
import { directionalKick, segment, strikePoint, strikeRootX, synergyBackdrop, synergyBear, synergyDust, synergyHero, synergyImpact, synergyLayout, synergyShadow, synergyShock, } from './action-synergy-shared.js';
const counterBase = arenaCuts.find((cut) => cut.id === 'bullet-counter');
const counterContact = 1.7;
const counterClock = [
    [0, 0],
    [0.57, 0.75],
    [0.82, 1.15],
    [1.52, 2.27],
    [counterContact, 2.46],
    [1.76, 2.46],
    [1.83, 2.54],
    [2.1, 2.78],
    [2.2, 2.9],
    [2.5, 3.2],
];
/** 3D 원본의 공격·회피·반주·타점을 함께 재배분하고 접촉에만 60ms를 더 준다. */
function counterSourceTime(time) {
    for (let index = 1; index < counterClock.length; index++) {
        const [end, sourceEnd] = counterClock[index];
        if (time > end)
            continue;
        const [start, sourceStart] = counterClock[index - 1];
        return lerp(sourceStart, sourceEnd, segment(time, start, end - start));
    }
    return counterClock.at(-1)[1];
}
function drawReversalCounter(context, frame) {
    if (!counterBase)
        throw new Error('반격의 실제 3D 원본이 없습니다.');
    const age = frame.time - counterContact;
    context.save();
    // 반주를 마친 접촉 구도 전체를 같은 방향으로 한 번 밀고 고정한다.
    context.translate(directionalKick(age, 16, 0.16), 0);
    counterBase.draw(context, { ...frame, time: counterSourceTime(frame.time) });
    context.restore();
}
const finalStrike = {
    focus: 0.62,
    start: 1,
    contact: 1.16,
    recoil: 1.245,
    recovery: 1.32,
    release: 1.63,
    defeat: 1.49,
    settled: 2.3,
};
/** 가장자리에서 실제 타점으로 모이되 배우의 얼굴·몸통 안쪽은 비워 둔다. */
function focusLines(context, frame, amount) {
    if (amount <= 0)
        return;
    const point = strikePoint(frame.assets);
    context.save();
    context.globalAlpha *= amount * 0.68;
    for (let index = 0; index < 34; index++) {
        const angle = (index / 34) * Math.PI * 2 + rand(index) * 0.08;
        const inner = 260 + rand(index + 71) * 100;
        const outer = 850 + rand(index + 21) * 180;
        line(context, [
            [point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer],
            [point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner],
        ], index % 3 ? '#fff6dc' : '#17252e', index % 4 ? 2 : 5);
    }
    context.restore();
}
function eyeCutin(context, frame) {
    const time = frame.time;
    if (time < 0.1 || time >= 0.71)
        return;
    const enter = ease(segment(time, 0.1, 0.12));
    const leave = ease(segment(time, 0.56, 0.15));
    const offset = (1 - enter) * -920 + leave * 1040;
    const portrait = frame.assets.portrait;
    const source = {
        x: portrait.naturalWidth * 0.265,
        y: portrait.naturalHeight * 0.235,
        width: portrait.naturalWidth * 0.47,
        height: portrait.naturalHeight * 0.29,
    };
    const scale = Math.max(810 / source.width, 222 / source.height);
    context.save();
    context.translate(offset, 0);
    context.beginPath();
    context.moveTo(38, 64);
    context.lineTo(895, 64);
    context.lineTo(819, 286);
    context.lineTo(38, 286);
    context.closePath();
    context.fillStyle = '#f1d9ad';
    context.fill();
    context.save();
    context.clip();
    context.imageSmoothingEnabled = false;
    context.drawImage(portrait, source.x, source.y, source.width, source.height, 38 + (810 - source.width * scale) / 2, 64 + (222 - source.height * scale) / 2, source.width * scale, source.height * scale);
    context.restore();
    context.strokeStyle = '#11131f';
    context.lineWidth = 10;
    context.stroke();
    context.restore();
}
function finalActors(context, frame) {
    const time = frame.time;
    const thrust = segment(time, finalStrike.start, finalStrike.contact - finalStrike.start);
    const root = strikeRootX(frame.assets);
    const displacement = ease(segment(time, finalStrike.recoil, 0.14)) * 110 -
        ease(segment(time, finalStrike.recoil + 0.14, 0.2)) * 24;
    const bearX = synergyLayout.bearX + displacement;
    const bearLift = Math.sin(segment(time, finalStrike.recoil, 0.32) * Math.PI) * 22;
    synergyShadow(context, { x: bearX, y: synergyLayout.ground }, 108);
    synergyBear(context, frame, {
        x: bearX,
        y: synergyLayout.ground - bearLift,
        state: time < finalStrike.contact
            ? 'stand'
            : time < finalStrike.defeat
                ? 'hit'
                : 'defeat',
        index: time < finalStrike.contact
            ? 0
            : time < finalStrike.defeat
                ? Math.floor(segment(time, finalStrike.recoil, 0.22) *
                    (frame.assets.bear.hit.length - 1))
                : Math.floor(segment(time, finalStrike.defeat, 0.61) *
                    (frame.assets.bear.defeat.length - 1)),
    });
    const x = lerp(root - 188, root, thrust * thrust);
    synergyShadow(context, { x, y: synergyLayout.ground }, 63);
    if (time < finalStrike.focus) {
        synergyHero(context, frame.assets, { action: 'idle', index: 0, x });
        return;
    }
    if (time < finalStrike.contact) {
        synergyHero(context, frame.assets, {
            action: 'punch',
            index: time < finalStrike.start ? 8 : Math.min(11, 9 + Math.floor(thrust * 3)),
            x,
        });
        return;
    }
    if (time < finalStrike.release) {
        synergyHero(context, frame.assets, {
            action: 'punch',
            index: time < finalStrike.recovery
                ? 12
                : 13 +
                    Math.min(3, Math.floor(segment(time, finalStrike.recovery, finalStrike.release - finalStrike.recovery) * 4)),
            x,
        });
        return;
    }
    synergyHero(context, frame.assets, {
        action: 'release',
        index: Math.min(5, Math.floor(segment(time, finalStrike.release, 0.47) * 6)),
        x,
    });
}
function finalPoster(context, time) {
    const amount = ease(segment(time, 2.08, finalStrike.settled - 2.08));
    if (amount <= 0)
        return;
    context.save();
    context.globalAlpha = amount;
    context.strokeStyle = '#f3e4bd';
    context.lineWidth = 25;
    context.strokeRect(22, 22, 1236, 676);
    context.strokeStyle = '#151523';
    context.lineWidth = 6;
    context.strokeRect(35, 35, 1210, 650);
    context.restore();
}
function drawFinalBlow(context, frame) {
    const time = frame.time;
    const point = strikePoint(frame.assets);
    const thrust = segment(time, finalStrike.start, finalStrike.contact - finalStrike.start);
    const age = time - finalStrike.contact;
    context.save();
    context.translate(directionalKick(age, 18, 0.16), 0);
    synergyBackdrop(context, frame, {
        time: Math.min(time, finalStrike.contact),
        blur: time >= finalStrike.start && time < finalStrike.contact - 0.025
            ? thrust * 0.62
            : 0,
    });
    const shock = synergyShock(context, {
        time,
        contact: finalStrike.contact,
        point,
        style: 'shock',
        drawActors: (actors) => finalActors(actors, frame),
    });
    if (!shock) {
        focusLines(context, frame, time < finalStrike.contact ? segment(time, finalStrike.focus, 0.32) : 0);
        finalActors(context, frame);
        synergyImpact(context, frame, {
            point,
            contact: finalStrike.contact,
            size: 300,
            duration: 0.24,
        });
        synergyDust(context, frame, {
            x: synergyLayout.bearX + 86,
            contact: 1.99,
            size: 245,
            duration: 0.25,
        });
        if (time > finalStrike.start + 0.06 && time < finalStrike.contact - 0.018) {
            fistSmear(context, point.x - (1 - thrust * thrust) * 188, point.y, thrust, 0, 170, frame.assets.fistPatch);
        }
    }
    context.restore();
    eyeCutin(context, frame);
    finalPoster(context, time);
}
export const synergyDramaticCuts = [
    {
        id: 'synergy-reversal-counter',
        title: '역전 반격',
        kind: '3D',
        duration: 2.8,
        description: '곰왕의 실제 공격을 뛰어넘은 뒤 0.70초의 불릿 타임과 103° 반주로 위협을 읽힌다. 180ms 급가속·짧은 타점 스미어를 거쳐 60ms 접촉 정지와 한 번의 방향성 반동으로 시점을 정착시키고, 착지와 쓰러짐까지 끝낸다.',
        beats: [
            { time: 0, label: '곰왕 공격 · 위협' },
            { time: 0.57, label: '실제 점프 회피' },
            { time: 0.82, label: '불릿 타임 + 103° 마와리코미' },
            { time: 1.52, label: '급가속 · 주먹과 카메라 동시 진입' },
            { time: counterContact, label: '실제 타점 · 60ms 접촉 정지' },
            { time: 1.86, label: '방향성 반동 종료 · 카메라 정착' },
            { time: 2.1, label: '착지 · 먼지' },
            { time: 2.5, label: '쓰러짐 완료 · 최종 정지' },
        ],
        draw: drawReversalCounter,
    },
    {
        id: 'synergy-final-blow',
        title: '결전 일격',
        kind: '2D',
        duration: 2.6,
        description: '눈 컷인으로 결의를 먼저 읽히고 집중선으로 실제 주먹 타점에 시선을 모은다. 160ms 급신전 뒤 두 코마의 쇼크코마를 터뜨리며, 팔 회수와 곰왕의 쓰러짐을 끝내고 한 장의 액자로 멈춘다.',
        beats: [
            { time: 0.1, label: '눈 컷인 · 결의' },
            { time: finalStrike.focus, label: '집중선 · 정권 준비' },
            { time: finalStrike.start, label: '160ms 급신전 · 타점 스미어' },
            { time: finalStrike.contact, label: '실제 주먹 접촉 · 2코마 쇼크' },
            { time: finalStrike.recovery, label: '팔 회수 · 빠른 밀림' },
            { time: 2.1, label: '팔 풀기와 쓰러짐 완료' },
            { time: finalStrike.settled, label: '최종 액자 · 멈춘 그림' },
        ],
        draw: drawFinalBlow,
    },
];
