import { gameDust } from '../../cutscenes/game-effects.js';
import { directionalKick, segment, synergyBackdrop, synergyBear, synergyHero, synergyImpact, synergyLayout, synergyShadow, } from './action-synergy-shared.js';
import { ease, lerp, line, smooth } from './drawing.js';
const ground = synergyLayout.ground;
const heroX = 265;
const target = { x: 970, y: ground };
const rest = { x: 520, y: 529 };
const suspended = { x: rest.x, y: 398 };
const collision = { x: 765, y: 414 };
// 원본 곰왕의 왼팔과 원본 돌의 선두 픽셀이 처음 겹치는 지점이다.
const contact = { x: 820, y: 435 };
const stoneSize = 112;
const half = stoneSize / 2;
const sourceCrop = { x: 22, y: 0, width: 23, height: 23 };
export const propStrikeTiming = {
    lift: 0.35,
    suspended: 1.02,
    launch: 1.28,
    contact: 1.7,
    release: 1.755,
    settle: 2.92,
    duration: 3.25,
};
// 네 영역이 원본 사각형을 빈틈없이 나누므로 충돌 전후의 돌 재질과 면적이 이어진다.
const fragments = [
    {
        face: [
            { x: -half, y: -half },
            { x: half, y: -half },
            { x: 0, y: 0 },
        ],
        opaqueHull: [
            [4, 4],
            [5, 3],
            [8, 1],
            [10, 0],
            [18, 0],
            [20, 1],
            [21, 2],
            [11.5, 11.5],
        ],
        distance: -78,
        arc: 132,
        turn: -1.6,
        duration: 0.84,
        bounceHeight: 7,
        bounceDuration: 0.12,
        slideDuration: 0.17,
    },
    {
        face: [
            { x: half, y: -half },
            { x: half, y: half },
            { x: 0, y: 0 },
        ],
        opaqueHull: [
            [11.5, 11.5],
            [21, 2],
            [22, 3],
            [23, 6],
            [23, 17],
            [20, 20],
        ],
        distance: 205,
        arc: 78,
        turn: 2.2,
        duration: 0.71,
        bounceHeight: 10,
        bounceDuration: 0.14,
        slideDuration: 0.21,
    },
    {
        face: [
            { x: half, y: half },
            { x: -half, y: half },
            { x: 0, y: 0 },
        ],
        opaqueHull: [
            [0, 23],
            [11.5, 11.5],
            [20, 20],
            [17, 22],
            [15, 23],
        ],
        distance: 62,
        arc: 35,
        turn: 0.8,
        duration: 0.58,
        bounceHeight: 5,
        bounceDuration: 0.1,
        slideDuration: 0.14,
    },
    {
        face: [
            { x: -half, y: half },
            { x: -half, y: -half },
            { x: 0, y: 0 },
        ],
        opaqueHull: [
            [0, 13],
            [1, 7],
            [2, 5],
            [4, 4],
            [11.5, 11.5],
            [0, 23],
        ],
        distance: -147,
        arc: 57,
        turn: -2.1,
        duration: 0.68,
        bounceHeight: 8,
        bounceDuration: 0.13,
        slideDuration: 0.18,
    },
];
function stonePoint(time) {
    if (time < propStrikeTiming.launch) {
        const lift = smooth(segment(time, propStrikeTiming.lift, propStrikeTiming.suspended - propStrikeTiming.lift));
        return { x: rest.x, y: lerp(rest.y, suspended.y, lift) };
    }
    const flight = segment(time, propStrikeTiming.launch, propStrikeTiming.contact - propStrikeTiming.launch);
    return {
        x: lerp(suspended.x, collision.x, flight * flight),
        y: lerp(suspended.y, collision.y, flight * flight),
    };
}
function drawStone(context, frame) {
    const { image } = frame.assets.props.basaltShards;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, sourceCrop.x, sourceCrop.y, sourceCrop.width, sourceCrop.height, -half, -half, stoneSize, stoneSize);
}
function drawIntactStone(context, frame) {
    const point = stonePoint(frame.time);
    context.save();
    context.translate(point.x, point.y);
    drawStone(context, frame);
    context.restore();
}
function drawFragments(context, frame) {
    const age = Math.max(0, frame.time - propStrikeTiming.release);
    for (const fragment of fragments) {
        const center = {
            x: fragment.face.reduce((sum, point) => sum + point.x, 0) / 3,
            y: fragment.face.reduce((sum, point) => sum + point.y, 0) / 3,
        };
        const flight = segment(age, 0, fragment.duration);
        // 바닥에 닿기 전에 회전을 마쳐, 착지 뒤 회전 때문에 돌이 지면을 파고들지 않는다.
        const rotation = fragment.turn * smooth(segment(flight, 0, 0.8));
        // crop의 alpha > 24 픽셀 사각형과 삼각 clip을 교차해 얻은 볼록 외곽이다.
        // 투명한 삼각형 꼭짓점을 지지점으로 쓰면 돌이 지면 위에 떠 있으므로 실제 픽셀만 본다.
        const supportAt = (angle) => {
            let support = { x: 0, y: -Infinity };
            for (const [pixelX, pixelY] of fragment.opaqueHull) {
                const x = (pixelX / sourceCrop.width) * stoneSize - half - center.x;
                const y = (pixelY / sourceCrop.height) * stoneSize - half - center.y;
                const point = {
                    x: x * Math.cos(angle) - y * Math.sin(angle),
                    y: x * Math.sin(angle) + y * Math.cos(angle),
                };
                if (point.y > support.y)
                    support = point;
            }
            return support;
        };
        const landingSupport = supportAt(fragment.turn);
        const support = supportAt(rotation);
        const landingY = ground - landingSupport.y;
        const bounceAge = Math.max(0, age - fragment.duration);
        const bounce = segment(bounceAge, 0, fragment.bounceDuration);
        const slideAge = Math.max(0, bounceAge - fragment.bounceDuration);
        const slide = segment(slideAge, 0, fragment.slideDuration);
        // 두 번의 지면 접촉 때마다 수평 운동량이 줄고, 남은 속도는 마찰로 0이 된다.
        const reboundSpeed = (fragment.distance / fragment.duration) * 0.45;
        const slideDistance = reboundSpeed *
            0.45 *
            fragment.slideDuration *
            (slide - slide * slide + (slide * slide * slide) / 3);
        const x = collision.x +
            center.x +
            fragment.distance * flight +
            reboundSpeed * Math.min(bounceAge, fragment.bounceDuration) +
            slideDistance;
        const flightY = lerp(collision.y + center.y, landingY, flight) -
            4 * fragment.arc * flight * (1 - flight);
        const y = Math.min(age < fragment.duration
            ? flightY
            : landingY - 4 * fragment.bounceHeight * bounce * (1 - bounce), ground - support.y);
        const height = ground - y - support.y;
        synergyShadow(context, { x: x + support.x, y: ground }, 22, 0.25 + 0.45 * (1 - segment(height, 0, 160)));
        const landingX = collision.x + center.x + fragment.distance + landingSupport.x;
        gameDust(context, frame.assets.effects, {
            x: landingX,
            y: ground,
            size: 70 + Math.abs(fragment.distance) * 0.2,
            progress: (age - fragment.duration) / 0.25,
        });
        gameDust(context, frame.assets.effects, {
            x: landingX + reboundSpeed * fragment.bounceDuration,
            y: ground,
            size: 48,
            progress: (age - fragment.duration - fragment.bounceDuration) / 0.18,
        });
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.translate(-center.x, -center.y);
        context.beginPath();
        fragment.face.forEach((point, index) => index
            ? context.lineTo(point.x, point.y)
            : context.moveTo(point.x, point.y));
        context.closePath();
        context.clip();
        drawStone(context, frame);
        context.restore();
    }
}
function heroPose(time) {
    const gather = smooth(segment(time, propStrikeTiming.launch - 0.2, 0.2));
    const release = smooth(segment(time, propStrikeTiming.launch, 0.14));
    const recover = smooth(segment(time, propStrikeTiming.launch + 0.34, 0.3));
    if (time < propStrikeTiming.lift)
        return { action: 'idle', index: 0, x: heroX, y: ground };
    if (time < propStrikeTiming.launch)
        return {
            action: 'ki',
            index: 0,
            x: heroX - gather * 9,
            y: ground,
            rotation: -gather * 0.035,
        };
    if (recover < 1)
        return {
            action: 'ki',
            index: time < propStrikeTiming.launch + 0.34 ? 1 : 2,
            x: heroX - 9 + release * 22 - recover * 8,
            y: ground,
            rotation: lerp(-0.035, 0.035, release) * (1 - recover),
        };
    return { action: 'idle', index: 0, x: heroX + 5, y: ground };
}
function drawTarget(context, frame) {
    const recoil = ease(segment(frame.time, propStrikeTiming.release, 0.34));
    const x = target.x + recoil * 145;
    const age = frame.time - propStrikeTiming.contact;
    const fallen = age >= 0.31;
    synergyShadow(context, { x, y: ground }, 80);
    synergyBear(context, frame, {
        x,
        y: target.y - Math.sin(recoil * Math.PI) * 18,
        state: age < 0 ? 'stand' : fallen ? 'defeat' : 'hit',
        index: age < 0
            ? 0
            : fallen
                ? Math.floor(segment(age, 0.31, 0.43) * (frame.assets.bear.defeat.length - 1))
                : Math.floor(segment(age, 0, 0.23) * (frame.assets.bear.hit.length - 1)),
    });
}
/** 얇은 기의 고리만 소품을 감싸고, 실제 날아가는 물체는 같은 현무암 한 덩어리다. */
function drawLevitation(context, frame) {
    const age = frame.time - propStrikeTiming.lift;
    if (age < 0 || frame.time >= propStrikeTiming.launch + 0.09)
        return;
    const point = stonePoint(Math.min(frame.time, propStrikeTiming.launch));
    const opacity = smooth(segment(age, 0, 0.16)) *
        (1 - segment(frame.time, propStrikeTiming.launch, 0.09));
    context.save();
    context.globalAlpha *= opacity * 0.6;
    context.strokeStyle = '#b6e5c9';
    context.lineWidth = 2;
    for (const offset of [-9, 9]) {
        context.beginPath();
        context.ellipse(point.x, point.y + offset, 70, 21, -0.12, 0, Math.PI * 2);
        context.stroke();
    }
    for (let index = 0; index < 4; index++) {
        const phase = (age * 0.9 + index / 4) % 1;
        const x = point.x - 75 + index * 49;
        const y = ground - phase * (ground - point.y + 35);
        line(context, [
            [x, y + 9],
            [x, y],
        ], '#c1efd4', 2);
    }
    context.restore();
}
function drawPropStrike(context, frame) {
    synergyBackdrop(context, frame);
    context.save();
    context.translate(directionalKick(frame.time - propStrikeTiming.release, 10, 0.13), 0);
    const pose = heroPose(frame.time);
    synergyShadow(context, { x: pose.x, y: ground }, 55);
    synergyHero(context, frame.assets, pose);
    drawTarget(context, frame);
    if (frame.time < propStrikeTiming.contact) {
        const point = stonePoint(frame.time);
        const height = rest.y - point.y;
        synergyShadow(context, { x: point.x, y: ground }, 44 - height * 0.1, 1 - height * 0.002);
        // 아직 통과하지 않은 궤도는 그리지 않고 가속 중의 직전 위치만 남긴다.
        if (frame.time >= propStrikeTiming.launch) {
            for (let index = 3; index > 0; index--) {
                const past = stonePoint(Math.max(propStrikeTiming.launch, frame.time - index * 0.024));
                context.save();
                context.globalAlpha *= 0.045 * (4 - index);
                context.translate(past.x, past.y);
                drawStone(context, frame);
                context.restore();
            }
        }
        drawIntactStone(context, frame);
    }
    else
        drawFragments(context, frame);
    drawLevitation(context, frame);
    synergyImpact(context, frame, {
        point: contact,
        contact: propStrikeTiming.contact,
        size: 185,
        duration: 0.17,
    });
    gameDust(context, frame.assets.effects, {
        x: rest.x,
        y: ground,
        size: 145,
        progress: (frame.time - propStrikeTiming.lift) / 0.3,
    });
    context.restore();
}
export const propStrikeCut = {
    id: 'prop-strike',
    title: '소품 사출',
    kind: '2D',
    duration: propStrikeTiming.duration,
    description: '현무암을 띄우고 몸을 뒤로 모은 뒤 양손 밀기와 함께 가속해 곰왕에게 날린다. 왼팔에 닿은 같은 돌의 픽셀을 네 조각으로 나누고, 조각마다 다른 착지·낮은 반동·마찰 감속을 거쳐 바닥에 남긴다.',
    techniques: [
        '소품 독립 조작',
        '공중 부양',
        '가속 사출',
        '재질 연속 파쇄',
        '접촉 뒤 피격',
        '파편별 착지 반동·마찰',
    ],
    beats: [
        { time: 0, label: '발치 현무암·발사자·표적 배치' },
        { time: propStrikeTiming.lift, label: '같은 현무암을 지면에서 들어 올림' },
        {
            time: propStrikeTiming.suspended,
            label: '분리된 그림자로 공중 정지 확인',
        },
        { time: propStrikeTiming.launch, label: '양손 밀기와 함께 현무암 가속' },
        {
            time: propStrikeTiming.contact,
            label: '돌 선두가 왼팔 접촉·같은 돌 파쇄',
        },
        {
            time: propStrikeTiming.release + 0.58,
            label: '조각별 착지·낮은 반동 시작',
        },
        { time: propStrikeTiming.settle, label: '마찰로 멈춘 파편과 쓰러진 곰왕' },
    ],
    draw: drawPropStrike,
};
