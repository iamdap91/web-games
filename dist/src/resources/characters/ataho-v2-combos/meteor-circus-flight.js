export const circusTiming = {
    cutMs: 1050,
    evasionMs: 1650,
    firstReturnMs: 2940,
    secondReturnMs: 4280,
    spiralMs: 5600,
    regroupMs: 8000,
    firstHitMs: 8600,
    lastHitMs: 8880,
    endMs: 9960,
};
export const circusScenePhases = [
    { label: '발사', startMs: 0, endMs: circusTiming.cutMs },
    {
        label: '깊이 도주',
        startMs: circusTiming.cutMs,
        endMs: circusTiming.evasionMs,
    },
    {
        label: '왕복 회피 1',
        startMs: circusTiming.evasionMs,
        endMs: circusTiming.firstReturnMs,
    },
    {
        label: '왕복 회피 2',
        startMs: circusTiming.firstReturnMs,
        endMs: circusTiming.secondReturnMs,
    },
    {
        label: '왕복 회피 3',
        startMs: circusTiming.secondReturnMs,
        endMs: circusTiming.spiralMs,
    },
    {
        label: '두 바퀴 선회',
        startMs: circusTiming.spiralMs,
        endMs: circusTiming.regroupMs,
    },
    {
        label: '광탄 가속',
        startMs: circusTiming.regroupMs,
        endMs: circusTiming.firstHitMs,
    },
    {
        label: '추월 · 연타',
        startMs: circusTiming.firstHitMs,
        endMs: circusTiming.lastHitMs,
    },
    {
        label: '종결',
        startMs: circusTiming.lastHitMs,
        endMs: circusTiming.endMs + 1,
    },
];
const escapeVelocity = { x: 0.16, y: 0.025, z: 0.9 };
const escapeRampMs = 500;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const targetKnots = [
    { timeMs: 0, point: { x: 0, y: 92, z: 740 } },
    { timeMs: circusTiming.cutMs, point: { x: 12, y: 100, z: 840 } },
    { timeMs: circusTiming.evasionMs, point: { x: 54, y: 145, z: 1160 } },
    // 접근·후퇴마다 높이와 옆 통로도 바꿔 같은 자리의 확대·축소 반복을 피한다.
    { timeMs: 2220, point: { x: -46, y: 123, z: 560 } },
    { timeMs: circusTiming.firstReturnMs, point: { x: 65, y: 160, z: 1240 } },
    { timeMs: 3620, point: { x: 45, y: 145, z: 600 } },
    { timeMs: circusTiming.secondReturnMs, point: { x: -65, y: 108, z: 1140 } },
    { timeMs: 4940, point: { x: -30, y: 132, z: 550 } },
    { timeMs: circusTiming.spiralMs, point: { x: 100, y: 145, z: 1200 } },
];
export function createCircusFlightShots(launchTimes) {
    const lastIndex = Math.max(1, launchTimes.length - 1);
    return launchTimes.map((launchMs, index) => {
        const timing = {
            id: `meteor-${index + 1}`,
            index,
            launchMs,
            arriveMs: circusTiming.firstHitMs +
                ((circusTiming.lastHitMs - circusTiming.firstHitMs) * index) /
                    lastIndex,
        };
        // 긴 회피 경로는 발사 데이터가 소유하고, 꼬리의 매 표본마다 다시 만들지 않는다.
        const gap = 650 + noise(index, 92) * 170;
        const angle = index * goldenAngle + noise(index, 93) * 0.4;
        const sweep = (index % 2 === 0 ? 1 : -1) * (1.1 + noise(index, 94) * 1.1);
        const approachOffset = catchupApproach(index);
        const bendAngle = angle + sweep;
        const catchup = {
            startMs: timing.arriveMs - 330 - noise(index, 91) * 60,
            startOffset: catchupOffset({
                angle,
                radius: 230 + noise(index, 95) * 210,
                gap,
            }),
            bendOffset: {
                x: approachOffset.x * 1.1 + Math.cos(bendAngle) * 180,
                y: Math.max(-125, approachOffset.y * 0.8 + Math.sin(bendAngle) * 70),
                z: index % 4 === 1 ? gap * 0.25 : -gap * 0.55,
            },
            approachOffset,
        };
        const shot = { ...timing, catchup };
        return { ...shot, knots: createShotKnots(shot) };
    });
}
export function sampleCircusTarget(timeMs) {
    if (timeMs >= circusTiming.regroupMs)
        return sampleEscapeTarget(timeMs);
    if (timeMs >= circusTiming.spiralMs)
        return sampleSpiralTarget(timeMs);
    return sampleKnots(targetKnots, timeMs);
}
function sampleSpiralTarget(timeMs) {
    const progress = (timeMs - circusTiming.spiralMs) /
        (circusTiming.regroupMs - circusTiming.spiralMs);
    const angle = progress * progress * (3 - 2 * progress) * Math.PI * 4;
    const ramp = Math.max(0, timeMs - (circusTiming.regroupMs - escapeRampMs));
    const advanceMs = (ramp * ramp) / (2 * escapeRampMs);
    // 선회가 끝나기 전에 도주로 가속해 원운동이 멎어도 비행 속도가 끊기지 않는다.
    return {
        x: Math.cos(angle) * 100 + escapeVelocity.x * advanceMs,
        y: 145 + Math.sin(angle) * 60 + escapeVelocity.y * advanceMs,
        z: 900 + Math.cos(angle * 0.5) * 300 + escapeVelocity.z * advanceMs,
    };
}
function sampleEscapeTarget(timeMs) {
    const start = sampleSpiralTarget(circusTiming.regroupMs);
    const flightMs = Math.min(timeMs, circusTiming.lastHitMs) - circusTiming.regroupMs;
    const fallMs = Math.max(0, timeMs - circusTiming.lastHitMs);
    const coastMs = 240 * (1 - Math.exp(-fallMs / 240));
    // 맞기 전에는 감속하지 않는다. 마지막 명중 뒤에만 관성으로 밀리며 떨어진다.
    return {
        x: start.x + escapeVelocity.x * (flightMs + coastMs),
        y: Math.max(10, start.y + escapeVelocity.y * flightMs - fallMs * fallMs * 0.0007),
        z: start.z + escapeVelocity.z * (flightMs + coastMs),
    };
}
export function sampleCircusShot(shot, timeMs) {
    if (timeMs <= shot.launchMs)
        return muzzlePoint(shot.index);
    if (timeMs >= shot.arriveMs)
        return sampleCircusTarget(shot.arriveMs);
    if (timeMs >= shot.catchup.startMs)
        return sampleCatchupShot(shot, timeMs);
    return sampleKnots(shot.knots, timeMs);
}
function catchupOffset(route) {
    const vertical = Math.sin(route.angle);
    const height = vertical >= 0
        ? Math.min(170, route.radius * 0.5)
        : Math.min(100, route.radius * 0.4);
    return {
        x: Math.cos(route.angle) * route.radius -
            (escapeVelocity.x / escapeVelocity.z) * route.gap,
        y: vertical * height - (escapeVelocity.y / escapeVelocity.z) * route.gap,
        z: -route.gap,
    };
}
function catchupApproach(index) {
    const spread = noise(index, 98);
    const variation = noise(index, 99) - 0.5;
    // 같은 후방 원뿔로 정렬하지 않고 좌우·머리 위·낮은 통로에서 다른 각도로 들어온다.
    switch (index % 4) {
        case 0:
            return {
                x: -360 - spread * 220,
                y: variation * 150,
                z: -140 - spread * 180,
            };
        case 1:
            return {
                x: 360 + spread * 220,
                y: variation * 150,
                z: 140 + spread * 180,
            };
        case 2:
            return { x: variation * 400, y: 220 + spread * 130, z: variation * 400 };
        default:
            return {
                x: variation * 400,
                y: -95 - spread * 30,
                z: (spread > 0.5 ? 1 : -1) * (180 + spread * 100),
            };
    }
}
function sampleCatchupShot(shot, timeMs) {
    const target = sampleCircusTarget(timeMs);
    const progress = Math.max(0, (timeMs - shot.catchup.startMs) / (shot.arriveMs - shot.catchup.startMs));
    const travel = progress ** 2.6;
    const remaining = 1 - travel;
    const startWeight = remaining ** 3;
    const bendWeight = 3 * remaining * remaining * travel;
    const approachWeight = 3 * remaining * travel * travel;
    // 가속 곡선의 마지막 제어점도 탄마다 달라, 충돌 직전까지 접근각을 유지한다.
    const offset = (axis) => shot.catchup.startOffset[axis] * startWeight +
        shot.catchup.bendOffset[axis] * bendWeight +
        shot.catchup.approachOffset[axis] * approachWeight;
    return {
        x: target.x + offset('x'),
        y: target.y + offset('y'),
        z: target.z + offset('z'),
    };
}
function createShotKnots(shot) {
    const angle = shot.index * goldenAngle;
    const variation = noise(shot.index, 1);
    const turnDirection = noise(shot.index, 2) > 0.42 ? 1 : -1;
    const openingMs = shot.launchMs + 170;
    const burstMs = shot.catchup.startMs;
    const evasionTimes = [
        ...targetKnots
            .filter((knot) => knot.timeMs >= circusTiming.evasionMs &&
            knot.timeMs <= circusTiming.spiralMs)
            .map((knot) => knot.timeMs),
        ...Array.from({ length: 12 }, (_, index) => circusTiming.spiralMs +
            ((circusTiming.regroupMs - circusTiming.spiralMs) * (index + 1)) / 12),
    ];
    const pursuitKnots = [];
    for (const [leg, targetTime] of evasionTimes.entries()) {
        const salt = 20 + leg * 13;
        const route = ['cut', 'wide', 'weave'][Math.floor(noise(shot.index, salt) * 3)];
        const spiral = targetTime > circusTiming.spiralMs;
        const reactionMs = spiral
            ? 280 +
                noise(shot.index, 4) * 130 +
                (noise(shot.index, salt + 1) - 0.5) * 90
            : route === 'cut'
                ? 140 + noise(shot.index, salt + 1) * 160
                : route === 'wide'
                    ? 340 + noise(shot.index, salt + 1) * 250
                    : 230 + noise(shot.index, salt + 1) * 280;
        const previous = pursuitKnots.at(-1);
        // 반응 시각을 회피마다 바꾸되, 앞 매듭을 추월해 순간이동하지 않게 한다.
        const timeMs = Math.max(targetTime + reactionMs, (previous?.timeMs ?? 0) + 110);
        const target = sampleCircusTarget(targetTime);
        const incoming = sampleCircusTarget(targetTime - 110);
        const before = sampleCircusTarget(targetTime - 230);
        const orbit = angle +
            turnDirection * leg * 0.7 +
            (noise(shot.index, salt + 2) - 0.5) * 2.1;
        const spread = noise(shot.index, salt + 3);
        const radius = spiral
            ? 75 + spread * 110
            : route === 'cut'
                ? 50 + spread * 90
                : route === 'wide'
                    ? 145 + spread * 165
                    : 90 + spread * 150;
        const overshootMs = route === 'cut'
            ? 25 + spread * 55
            : route === 'wide'
                ? 110 + spread * 100
                : 60 + spread * 110;
        const point = {
            x: target.x +
                Math.cos(orbit) * radius +
                ((incoming.x - before.x) * overshootMs) / 120,
            y: Math.max(14, target.y + Math.sin(orbit) * radius * (route === 'weave' ? 0.85 : 0.5)),
            z: target.z +
                ((incoming.z - before.z) * overshootMs) / 120 +
                Math.sin(orbit + 1.1) * (35 + spread * 95),
        };
        if (previous &&
            !spiral &&
            route !== 'cut' &&
            timeMs - previous.timeMs > 340) {
            appendPursuitBend(pursuitKnots, { timeMs, point }, {
                route,
                spread,
                side: noise(shot.index, salt + 4) > 0.5 ? 1 : -1,
                rise: (noise(shot.index, salt + 5) - 0.5) * 160,
            });
        }
        pursuitKnots.push({ timeMs, point });
    }
    const laterKnots = [
        ...pursuitKnots.filter((knot) => knot.timeMs < burstMs - 240),
        { timeMs: burstMs - 120, point: sampleCatchupShot(shot, burstMs - 120) },
        { timeMs: burstMs, point: sampleCatchupShot(shot, burstMs) },
    ];
    // 후발 탄은 지난 회피 지점을 다시 거치지 않고 현재 추격 대열에 합류한다.
    return [
        { timeMs: shot.launchMs, point: muzzlePoint(shot.index) },
        {
            timeMs: openingMs,
            point: {
                x: 20 + Math.cos(angle) * (85 + variation * 125),
                y: 118 + Math.sin(angle) * 83,
                z: 280 + variation * 175,
            },
        },
        ...laterKnots.filter((knot) => knot.timeMs > openingMs + 70),
    ];
}
function appendPursuitBend(knots, end, bend) {
    const start = knots.at(-1);
    const dx = end.point.x - start.point.x;
    const dz = end.point.z - start.point.z;
    const length = Math.max(1, Math.hypot(dx, dz));
    const fractions = bend.route === 'wide' ? [0.48] : [0.34, 0.7];
    for (const [index, fraction] of fractions.entries()) {
        // 큰 호와 S자 경유점을 섞어 같은 반전에도 제각기 다른 통로로 선회한다.
        const width = (75 + bend.spread * 145) * bend.side * (index === 0 ? 1 : -0.7);
        knots.push({
            timeMs: start.timeMs + (end.timeMs - start.timeMs) * fraction,
            point: {
                x: start.point.x + dx * fraction - (dz / length) * width,
                y: Math.max(14, start.point.y +
                    (end.point.y - start.point.y) * fraction +
                    bend.rise * (index === 0 ? 1 : -0.6)),
                z: start.point.z + dz * fraction + (dx / length) * width,
            },
        });
    }
}
function sampleKnots(knots, timeMs) {
    const first = knots[0];
    const last = knots[knots.length - 1];
    if (timeMs <= first.timeMs)
        return first.point;
    if (timeMs >= last.timeMs)
        return last.point;
    const endIndex = knots.findIndex((knot) => knot.timeMs >= timeMs);
    const start = knots[endIndex - 1];
    const end = knots[endIndex];
    const durationMs = end.timeMs - start.timeMs;
    const progress = (timeMs - start.timeMs) / durationMs;
    const startVelocity = knotVelocity(knots, endIndex - 1);
    const endVelocity = knotVelocity(knots, endIndex);
    const square = progress * progress;
    const cube = square * progress;
    const startWeight = 2 * cube - 3 * square + 1;
    const startVelocityWeight = cube - 2 * square + progress;
    const endWeight = -2 * cube + 3 * square;
    const endVelocityWeight = cube - square;
    const coordinate = (axis) => start.point[axis] * startWeight +
        startVelocity[axis] * durationMs * startVelocityWeight +
        end.point[axis] * endWeight +
        endVelocity[axis] * durationMs * endVelocityWeight;
    return {
        x: coordinate('x'),
        y: Math.max(8, coordinate('y')),
        z: coordinate('z'),
    };
}
function knotVelocity(knots, index) {
    const before = knots[Math.max(0, index - 1)];
    const after = knots[Math.min(knots.length - 1, index + 1)];
    const elapsedMs = Math.max(1, after.timeMs - before.timeMs);
    return {
        x: (after.point.x - before.point.x) / elapsedMs,
        y: (after.point.y - before.point.y) / elapsedMs,
        z: (after.point.z - before.point.z) / elapsedMs,
    };
}
function noise(index, salt) {
    const hash = Math.imul(index + 1, 374761393) ^ Math.imul(salt, 668265263);
    return ((Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0) % 10000) / 10000;
}
function muzzlePoint(index) {
    return { x: index % 2 === 0 ? 27 : 23, y: index % 2 === 0 ? 37 : 33, z: 0 };
}
