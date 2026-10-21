import { ease, fistSmear, lerp, line, smearBackground, speedLines, } from './drawing.js';
import { directionalKick, segment, strikePoint, strikeRootX, synergyBackdrop, synergyBear, synergyDust, synergyHero, synergyImpact, synergyLayout, synergyShadow, } from './action-synergy-shared.js';
import { WorldScene } from './world.js';
const rush = {
    start: 0.16,
    punch: 0.74,
    contact: 0.88,
    hold: 0.075,
    recover: 1.17,
    settle: 1.58,
    truck: 180,
    initialTarget: synergyLayout.bearX + 180,
};
const pierce = {
    start: 0.38,
    thrust: 0.48,
    passage: 0.55,
    through: 0.68,
    reaction: 1.04,
    settle: 1.71,
    finishX: 1060,
};
const travelCamera = {
    position: { x: 0, y: 4.5, z: 12 },
    target: { x: 0, y: 1.5, z: 0 },
    focal: 900,
};
function rushTruck(time) {
    return rush.truck * segment(time, rush.start, rush.contact - rush.start) ** 2;
}
/** 같은 투영면의 이동량을 카메라에 전달해 먼 배경과 지면의 시차를 실제로 바꾼다. */
function rushBackground(context, frame) {
    const reference = new WorldScene(context, travelCamera);
    const origin = reference.project({ x: 0, y: 0, z: 0 });
    const unit = reference.project({ x: 1, y: 0, z: 0 });
    const truck = rushTruck(frame.time) / (unit.x - origin.x);
    const camera = {
        ...travelCamera,
        position: { ...travelCamera.position, x: truck },
        target: { ...travelCamera.target, x: truck },
    };
    const blur = frame.time < rush.contact
        ? Math.sin(segment(frame.time, rush.start, rush.contact - rush.start) * Math.PI) * 0.7
        : 0;
    smearBackground(context, frame.surfaces, (background) => {
        frame.surfaces.stage.background(background, 'arena', camera, frame.time, {
            principalY: 360 + synergyLayout.ground - origin.y,
        });
    }, blur);
}
function rushPose(assets, time) {
    const targetX = rush.initialTarget - rushTruck(time);
    const endX = strikeRootX(assets, { targetX });
    const travelEndX = strikeRootX(assets, { targetX: rush.initialTarget }) - 68;
    if (time < rush.punch) {
        const advance = segment(time, rush.start, rush.punch - rush.start);
        return {
            action: 'run',
            index: time < rush.start ? 0 : Math.floor((time - rush.start) * 18) % 4,
            x: lerp(255, travelEndX, advance * advance) - rushTruck(time),
        };
    }
    if (time < rush.contact + rush.hold) {
        const thrust = segment(time, rush.punch, rush.contact - rush.punch);
        return {
            action: 'punch',
            index: thrust < 0.24 ? 9 : thrust < 0.5 ? 10 : thrust < 0.72 ? 11 : 12,
            x: endX - 68 * (1 - thrust * thrust),
        };
    }
    const recovery = segment(time, rush.contact + rush.hold, rush.recover - rush.contact - rush.hold);
    return {
        action: 'punch',
        index: 13 + Math.min(3, Math.floor(recovery * 4)),
        x: endX - 12 * ease(recovery),
    };
}
function rushTarget(context, frame) {
    const release = rush.contact + rush.hold;
    const recoil = ease(segment(frame.time, release, 0.24));
    const defeat = segment(frame.time, release + 0.24, rush.settle - release - 0.24);
    const state = frame.time < rush.contact
        ? 'stand'
        : frame.time < release + 0.24
            ? 'hit'
            : 'defeat';
    const x = rush.initialTarget - rushTruck(frame.time) + 165 * recoil;
    synergyShadow(context, { x, y: synergyLayout.ground }, 96);
    synergyBear(context, frame, {
        x,
        y: synergyLayout.ground - Math.sin(recoil * Math.PI) * 24,
        state,
        index: state === 'hit'
            ? Math.floor(segment(frame.time, release, 0.18) *
                (frame.assets.bear.hit.length - 1))
            : state === 'defeat'
                ? Math.floor(defeat * (frame.assets.bear.defeat.length - 1))
                : undefined,
    });
}
function explosiveRush(context, frame) {
    context.save();
    const kick = directionalKick(frame.time - rush.contact - rush.hold, 16, 0.16);
    context.translate(kick, 0);
    rushBackground(context, frame);
    const speed = frame.time >= rush.start && frame.time < rush.contact
        ? Math.sin(segment(frame.time, rush.start, rush.contact - rush.start) * Math.PI)
        : 0;
    speedLines(context, frame.time * 1.7, speed * 0.75);
    rushTarget(context, frame);
    if (frame.time > rush.start + 0.12 && frame.time < rush.contact) {
        for (const delay of [3 / 24, 2 / 24, 1 / 24]) {
            const sampledTime = Math.max(rush.start, frame.time - delay);
            const sampled = rushPose(frame.assets, sampledTime);
            // 같은 동작의 과거 자세를 현재 카메라로 옮겨 원래 이동 경로를 남긴다.
            synergyHero(context, frame.assets, {
                ...sampled,
                x: sampled.x + rushTruck(sampledTime) - rushTruck(frame.time),
                alpha: 0.07 + (3 / 24 - delay) * 0.75,
                filter: 'brightness(1.35) sepia(0.3)',
            });
        }
    }
    const pose = rushPose(frame.assets, frame.time);
    synergyShadow(context, { x: pose.x, y: synergyLayout.ground }, 58);
    synergyHero(context, frame.assets, pose);
    const point = strikePoint(frame.assets);
    const smearStart = rush.contact - 0.075;
    if (frame.time >= smearStart && frame.time < rush.contact) {
        fistSmear(context, point.x - 52, point.y, segment(frame.time, smearStart, 0.075), -0.03, 145, frame.assets.fistPatch);
    }
    synergyImpact(context, frame, {
        point,
        contact: rush.contact,
        size: 225,
        duration: 0.17,
    });
    synergyDust(context, frame, {
        x: rushPose(frame.assets, rush.start + 0.05).x +
            rushTruck(rush.start + 0.05) -
            rushTruck(frame.time) -
            18,
        contact: rush.start + 0.05,
        size: 185,
        duration: 0.24,
    });
    synergyDust(context, frame, {
        x: synergyLayout.bearX + 155,
        contact: rush.contact + rush.hold + 0.22,
        size: 250,
        duration: 0.32,
    });
    context.restore();
}
function piercePose(assets, time) {
    const contactX = strikeRootX(assets);
    if (time < pierce.start) {
        return {
            action: 'punch',
            index: time < 0.2 ? 9 : 10,
            x: 300 - Math.sin(segment(time, 0.12, 0.26) * Math.PI) * 16,
        };
    }
    if (time < pierce.thrust) {
        return {
            action: 'punch',
            index: 11,
            x: lerp(300, contactX - 90, segment(time, pierce.start, pierce.thrust - pierce.start) ** 2),
        };
    }
    if (time < pierce.passage) {
        const progress = segment(time, pierce.thrust, pierce.passage - pierce.thrust);
        const omitted = Math.floor(progress * 3) / 3;
        return {
            action: 'punch',
            index: 12,
            x: lerp(contactX - 90, contactX, omitted),
        };
    }
    if (time < pierce.through) {
        const progress = segment(time, pierce.passage, pierce.through - pierce.passage);
        const omitted = Math.floor(progress * 4) / 4;
        return {
            action: 'punch',
            index: 12 + Math.min(2, Math.floor(progress * 3)),
            x: lerp(contactX, pierce.finishX, omitted),
        };
    }
    return {
        action: 'punch',
        index: 15 + Math.min(1, Math.floor(segment(time, pierce.through, 0.14) * 2)),
        x: pierce.finishX,
    };
}
function pierceTarget(context, frame) {
    const reaction = segment(frame.time, pierce.reaction, 0.22);
    const defeat = segment(frame.time, pierce.reaction + 0.22, pierce.settle - pierce.reaction - 0.22);
    const state = frame.time < pierce.reaction
        ? 'stand'
        : frame.time < pierce.reaction + 0.22
            ? 'hit'
            : 'defeat';
    const x = synergyLayout.bearX + ease(reaction) * 68;
    synergyShadow(context, { x, y: synergyLayout.ground }, 94);
    synergyBear(context, frame, {
        x,
        state,
        index: state === 'stand'
            ? 0
            : state === 'hit'
                ? Math.floor(reaction * (frame.assets.bear.hit.length - 1))
                : Math.floor(defeat * (frame.assets.bear.defeat.length - 1)),
    });
}
function delayedPierce(context, frame) {
    context.save();
    const kick = directionalKick(frame.time - pierce.reaction, 11, 0.13);
    context.translate(kick, 0);
    synergyBackdrop(context, frame, { time: 0 });
    pierceTarget(context, frame);
    // 통과한 각 시점의 자세를 한 번씩 노출하고 정적 구간 전에 모두 지운다.
    for (const exposure of [0.425, 0.5, 0.61, 0.655]) {
        const age = frame.time - exposure;
        if (age < 0 || frame.time >= 0.86)
            continue;
        synergyHero(context, frame.assets, {
            ...piercePose(frame.assets, exposure),
            alpha: Math.max(0, 0.38 * (1 - age / Math.min(0.3, 0.86 - exposure))),
            filter: 'brightness(1.75) saturate(0.2)',
        });
    }
    const pose = piercePose(frame.assets, frame.time);
    synergyShadow(context, { x: pose.x, y: synergyLayout.ground }, 57);
    synergyHero(context, frame.assets, pose);
    const point = strikePoint(frame.assets);
    const passageAge = frame.time - pierce.passage;
    if (passageAge >= 0 && passageAge < 0.095) {
        context.save();
        context.globalAlpha = 0.6 * (1 - passageAge / 0.095);
        line(context, [
            [point.x - 105, point.y + 2],
            [point.x + 285, point.y - 3],
        ], '#e8f7dd', 3);
        context.restore();
    }
    synergyImpact(context, frame, {
        point,
        contact: pierce.reaction,
        size: 245,
        duration: 0.19,
    });
    synergyDust(context, frame, {
        x: 302,
        contact: pierce.start,
        size: 200,
        duration: 0.2,
    });
    synergyDust(context, frame, {
        x: synergyLayout.bearX + 62,
        contact: pierce.reaction + 0.22,
        size: 215,
        duration: 0.28,
    });
    context.restore();
}
export const synergyTravelCuts = [
    {
        id: 'synergy-explosive-rush',
        title: '폭발 돌진',
        kind: '3D',
        duration: 2.2,
        description: '실제 무대의 횡이동과 속도선으로 거리를 만들고 짧은 주먹 스미어를 거쳐 명중만 선명하게 읽힌다.',
        beats: [
            { time: 0, label: '낮은 출발 자세' },
            { time: rush.start, label: '배경 동화＋속도선' },
            { time: rush.punch, label: '주먹 스미어로 전환' },
            { time: rush.contact, label: '선명한 접촉' },
            { time: rush.settle, label: '반동과 착지 회수' },
        ],
        draw: explosiveRush,
    },
    {
        id: 'synergy-delayed-pierce',
        title: '잔영 관통',
        kind: '2D',
        duration: 2.3,
        description: '나카누키로 단숨에 통과한 뒤 다른 시점의 스트로보를 지우고 정적을 만든다. 상대만 뒤늦게 타격을 받고 무너진다.',
        beats: [
            { time: 0, label: '짧은 축적' },
            { time: pierce.start, label: '나카누키＋스트로보' },
            { time: pierce.passage, label: '주먹의 몸통 통과' },
            { time: 0.86, label: '짧은 정적' },
            { time: pierce.reaction, label: '지연 타격' },
            { time: pierce.settle, label: '결착' },
        ],
        draw: delayedPierce,
    },
];
