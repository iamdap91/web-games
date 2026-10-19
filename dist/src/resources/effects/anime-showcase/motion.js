import { actor, burst, clamp, ellipse, label, line, mix, noise, palette, polygon, ring, smooth, stage, windowed, } from './drawing.js';
import { height, width, } from './types.js';
export const motionSamples = [
    {
        id: 'smear-frame',
        name: '스미어 프레임',
        category: 'motion',
        previewMs: 1530,
        description: '빠른 통과 구간의 몸을 한 장의 길게 이어진 쓸림 그림으로 바꿉니다.',
        distinction: '과거 자세 여러 장을 겹치는 잔상과 달리 하나의 새 연결 형태입니다.',
    },
    {
        id: 'obake',
        name: '오바케',
        category: 'motion',
        previewMs: 1540,
        description: '튀어 오르는 중간 몸의 외곽을 물결지고 늘어진 형태로 직접 그립니다.',
        distinction: '일정한 비율로 늘리는 변형 대신 머리·몸·팔다리가 다른 방향으로 일그러집니다.',
    },
    {
        id: 'background-animation',
        name: '배경 동화',
        category: 'motion',
        previewMs: 2050,
        description: '배우 뒤의 회랑을 깊이와 방향에 맞춰 매 시점 다시 그립니다.',
        distinction: '완성된 배경 한 장을 옮기는 대신 벽·바닥의 원근 형태가 함께 변합니다.',
    },
    {
        id: 'nakanuki',
        name: '나카누키',
        category: 'motion',
        previewMs: 1650,
        description: '장전과 도착 자세를 남기고 사이의 연결 자세를 과감히 생략합니다.',
        distinction: '재생 시간을 빠르게 하는 대신 움직임의 연결 그림 수를 줄입니다.',
    },
    {
        id: 'midareuchi',
        name: '미다레우치',
        category: 'motion',
        previewMs: 1230,
        description: '같은 다섯 타를 짧은 두 타와 긴 쉼이 섞인 불규칙한 박자로 칩니다.',
        distinction: '매번 같은 고정 박자 배열을 쓰며 실행 중 무작위로 바뀌지 않습니다.',
    },
    {
        id: 'strobe',
        name: '스트로보',
        category: 'motion',
        previewMs: 1840,
        description: '달려온 실제 과거 자세를 일정 시간 간격으로 남깁니다.',
        distinction: '중간 몸을 늘리는 스미어와 달리 서로 떨어진 여러 시각의 온전한 자세입니다.',
    },
    {
        id: 'motion-metamorphosis',
        name: '메타모르포제',
        category: 'motion',
        previewMs: 1750,
        description: '둥근 먹덩어리의 같은 외곽에서 날개·부리·꼬리가 연속해서 갈라집니다.',
        distinction: '두 그림의 투명도 교대 대신 윤곽 꼭짓점 자체가 이동합니다.',
    },
    {
        id: 'wave-propagation',
        name: '물결 보내기',
        category: 'motion',
        previewMs: 1900,
        description: '손목에서 한 번 만든 물결을 천의 끝까지 순서대로 보냅니다.',
        distinction: '천 전체가 동시에 흔들리지 않고 구간마다 반응이 늦게 도착합니다.',
    },
    {
        id: 'araki-flutter',
        name: '아라키 휘날림',
        category: 'motion',
        previewMs: 1250,
        description: '돌아서는 몸 뒤 망토가 큰 뾰족한 면으로 펼쳐졌다 반대쪽으로 접힙니다.',
        distinction: '작은 반복 흔들림 대신 한 번의 큰 펼침·엇갈린 주름·반동을 그립니다. 작가 원전의 복제는 아닙니다.',
    },
    {
        id: 'squash-stretch',
        name: '스쿼시 앤 스트레치',
        category: 'motion',
        previewMs: 2330,
        description: '낙하 중 길어지고 접지에서 눌린 몸이 탄력 있게 복원됩니다.',
        distinction: '위치 이동만 바꾸지 않고 몸의 폭과 높이를 반대 방향으로 바꿉니다.',
    },
    {
        id: 'kanada-motion',
        name: '카나다계 동작',
        category: 'motion',
        previewMs: 1720,
        description: '비대칭 장전·날카로운 통과·넓게 벌린 도착을 서로 다른 실루엣으로 잇습니다.',
        distinction: '효과선 추가 대신 관절 각도와 자세 대비를 직접 그린 원리 시안입니다.',
    },
    {
        id: 'kanada-perspective',
        name: '카나다 파스',
        category: 'motion',
        previewMs: 1930,
        description: '멀어지는 머리와 몸 뒤에서 커다란 발이 전경으로 튀어나옵니다.',
        distinction: '배우 전체를 확대하지 않고 가까운 발과 먼 머리의 비율·겹침을 바꿉니다.',
    },
    {
        id: 'focus-lines',
        name: '집중선',
        category: 'motion',
        previewMs: 1900,
        description: '배경의 선들이 하나의 초점 공간으로 모여 시선을 붙잡습니다.',
        distinction: '검게 채우는 베타 플래시와 달리 원래 배경 위에 가는 수렴선을 남깁니다.',
    },
    {
        id: 'speed-streamlines',
        name: '속도선·유선',
        category: 'motion',
        previewMs: 1800,
        description: '이동 반대 방향의 긴 선과 몸 둘레를 흐르는 곡선으로 속도를 보입니다.',
        distinction: '한 점으로 모이는 집중선과 달리 흐름의 방향과 물체 둘레의 경로를 그립니다.',
    },
];
function time(frame) {
    return Math.max(0, frame.timeMs);
}
function dashPosition(t) {
    return mix(180, 785, smooth((t - 850) / 1600));
}
function drawRunner(ctx, t, opacity = 1, reducedMotion = false) {
    const run = windowed(t, 800, 2450, 200);
    const motion = reducedMotion ? 0.45 : 1;
    ctx.save();
    ctx.globalAlpha *= opacity;
    actor(ctx, dashPosition(t), 420, 1, {
        lean: run * 31 * motion,
        crouch: run * 0.27,
        kick: Math.sin(t / 105) * run * 0.6 * motion,
        arm: Math.cos(t / 105) * run * 0.4 * motion,
    });
    ctx.restore();
}
function drawSmear(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const x = dashPosition(t);
    const active = frame.enhanced && t >= 1340 && t < 1720;
    if (!active) {
        drawRunner(ctx, t, 1, frame.reducedMotion);
        return;
    }
    const length = frame.reducedMotion ? 88 : 186;
    // 쓸린 몸은 하나의 연결 윤곽이며 온전한 몸을 복제하지 않는다.
    polygon(ctx, [
        { x: x - length, y: 329 },
        { x: x - length * 0.51, y: 287 },
        { x: x + 19, y: 276 },
        { x: x + 36, y: 308 },
        { x: x + 102, y: 302 },
        { x: x + 116, y: 320 },
        { x: x + 20, y: 340 },
        { x: x - 13, y: 365 },
        { x: x + 31, y: 410 },
        { x: x - 20, y: 420 },
        { x: x - 58, y: 365 },
        { x: x - length, y: 393 },
        { x: x - length * 0.65, y: 347 },
    ], palette.gold);
    ellipse(ctx, x + 24, 266, 23, 27, palette.gold);
    line(ctx, [
        { x: x + 33, y: 262 },
        { x: x + 42, y: 262 },
    ], palette.ink, 3);
    for (let i = 0; i < 3; i++)
        line(ctx, [
            { x: x - length + 15, y: 326 + i * 14 },
            { x: x - 46, y: 316 + i * 14 },
        ], '#80563a', 3);
}
function drawObake(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const hop = Math.sin(clamp((t - 900) / 1500) * Math.PI);
    const ground = 420 - hop * (frame.reducedMotion ? 72 : 152);
    if (!frame.enhanced || t < 1210 || t > 1890) {
        actor(ctx, 480, ground, 1, {
            crouch: (1 - hop) * windowed(t, 600, 1100, 200),
        });
        return;
    }
    const distortion = Math.sin(clamp((t - 1210) / 680) * Math.PI);
    const amount = distortion * (frame.reducedMotion ? 0.5 : 1);
    ctx.save();
    ctx.translate(480, ground);
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.bezierCurveTo(-64 - amount * 20, -31, 20 + amount * 60, -58, -34 - amount * 17, -98);
    ctx.bezierCurveTo(-74 - amount * 25, -125, -5, -144 - amount * 64, 23 + amount * 21, -154 - amount * 27);
    ctx.bezierCurveTo(76 + amount * 31, -135, -36 - amount * 23, -110, 39 + amount * 49, -82);
    ctx.bezierCurveTo(89 + amount * 28, -46, -13, -36, 36, -3);
    ctx.lineTo(12, 1);
    ctx.lineTo(-3, -34);
    ctx.closePath();
    ctx.fillStyle = palette.gold;
    ctx.fill();
    ellipse(ctx, 7, -139 - amount * 25, 4, 6, palette.ink);
    ellipse(ctx, 28 + amount * 11, -143 - amount * 29, 4, 6, palette.ink);
    line(ctx, [
        { x: -20, y: -74 },
        { x: 14, y: -81 },
        { x: 35, y: -65 },
    ], '#80563a', 4);
    ctx.restore();
}
function drawCorridor(ctx, t, moving) {
    const turn = moving ? Math.sin(clamp((t - 700) / 2800) * Math.PI) : 0;
    const vanish = { x: 480 + turn * 188, y: 176 - turn * 41 };
    ctx.fillStyle = '#172437';
    ctx.fillRect(0, 0, width, height);
    polygon(ctx, [
        { x: 0, y: 540 },
        { x: vanish.x, y: vanish.y },
        { x: 960, y: 540 },
    ], '#4f5260');
    polygon(ctx, [{ x: 0, y: 0 }, vanish, { x: 0, y: 540 }], '#26354c');
    polygon(ctx, [{ x: 960, y: 0 }, vanish, { x: 960, y: 540 }], '#34405c');
    for (let i = 0; i < 9; i++) {
        const offset = moving ? clamp((t - 700) / 2800) * 0.6 : 0;
        const depth = ((i + 1) / 10 + offset) % 1;
        const scale = 0.08 + depth * depth * 1.35;
        const left = vanish.x - 480 * scale;
        const right = vanish.x + 480 * scale;
        const top = vanish.y - 176 * scale;
        const bottom = vanish.y + 364 * scale;
        line(ctx, [
            { x: left, y: bottom },
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
        ], '#91a2b0', 2 + scale * 5);
        line(ctx, [
            { x: left, y: bottom },
            { x: right, y: bottom },
        ], '#929098', 2);
    }
    for (const side of [-1, 1])
        line(ctx, [
            { x: vanish.x, y: vanish.y },
            { x: 480 + side * 480, y: 540 },
        ], palette.gold, 3);
}
function drawBackground(ctx, frame) {
    const t = time(frame);
    drawCorridor(ctx, frame.enhanced && frame.reducedMotion ? 2050 : t, frame.enhanced);
    const motion = frame.reducedMotion ? 0.4 : 1;
    actor(ctx, 480, 438, 1, {
        lean: 24 * motion,
        kick: Math.sin(t / 130) * 0.45 * motion,
        arm: Math.cos(t / 130) * 0.4 * motion,
    });
}
function drawNakanuki(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    let reach = smooth((t - 1000) / 800);
    if (frame.enhanced)
        reach = t < 1200 ? 0 : t < 1500 ? 0.08 : t < 1800 ? 0.15 : 1;
    reach *= 1 - smooth((t - 2500) / 700);
    actor(ctx, 330 + reach * 140, 420, 1, {
        lean: reach * 22,
        arm: reach * 2,
        crouch: (1 - reach) * 0.45,
    });
    actor(ctx, 669, 420, 1, {
        facing: -1,
        color: palette.blue,
        lean: -windowed(t, 1800, 2270, 100) * 28,
    });
    if (t >= 1800 && t < 2090)
        burst(ctx, 657, 249, (t - 1800) / 290, palette.paper, 8);
}
function drawMidare(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const hits = frame.enhanced
        ? [1020, 1240, 1910, 2100, 2880]
        : [1020, 1485, 1950, 2415, 2880];
    let jab = 0;
    let recoil = 0;
    for (const hit of hits) {
        jab = Math.max(jab, windowed(t, hit - 145, hit + 8, 70));
        recoil = Math.max(recoil, windowed(t, hit, hit + 150, 50));
        if (t >= hit && t < hit + 170)
            burst(ctx, 638, 245, (t - hit) / 170, palette.paper, 6);
    }
    actor(ctx, 440, 420, 1, {
        arm: jab * 2,
        lean: jab * 23,
        crouch: (1 - jab) * 0.2,
    });
    actor(ctx, 653 + recoil * (frame.reducedMotion ? 6 : 19), 420, 1, {
        facing: -1,
        color: palette.blue,
        lean: -recoil * 24,
    });
    for (const hit of hits) {
        const x = 190 + (hit / 4200) * 660;
        line(ctx, [
            { x, y: 454 },
            { x, y: 470 },
        ], t >= hit ? palette.gold : '#7f7b88', 4);
    }
    line(ctx, [
        { x: 190, y: 462 },
        { x: 850, y: 462 },
    ], '#ada1a4', 1);
    ellipse(ctx, 190 + clamp(t / 4200) * 660, 462, 5, 5, palette.paper);
}
function drawStrobe(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    if (frame.enhanced && t >= 900 && t <= 2830) {
        const delays = frame.reducedMotion ? [240, 120] : [480, 360, 240, 120];
        for (const delay of delays) {
            const past = t - delay;
            if (past < 850 || past > 2450)
                continue;
            drawRunner(ctx, past, (1 - delay / 700) * (frame.reducedMotion ? 0.19 : 0.42), frame.reducedMotion);
        }
    }
    drawRunner(ctx, t, 1, frame.reducedMotion);
}
const birdOutline = [
    { x: -142, y: -88 },
    { x: -89, y: -70 },
    { x: -44, y: -42 },
    { x: -23, y: -30 },
    { x: -11, y: -60 },
    { x: 14, y: -69 },
    { x: 30, y: -48 },
    { x: 63, y: -34 },
    { x: 29, y: -24 },
    { x: 85, y: -62 },
    { x: 143, y: -87 },
    { x: 101, y: -15 },
    { x: 64, y: 21 },
    { x: 30, y: 26 },
    { x: 18, y: 48 },
    { x: 65, y: 95 },
    { x: 4, y: 64 },
    { x: -36, y: 94 },
    { x: -23, y: 39 },
    { x: -59, y: 21 },
    { x: -98, y: -12 },
];
function shape(ctx, points, opacity) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    polygon(ctx, points.map((p) => ({ x: 480 + p.x, y: 290 + p.y })), palette.blue);
    ctx.restore();
}
function drawMetamorphosis(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const p = smooth((t - 1000) / 1550);
    const blob = birdOutline.map((_, i) => {
        const angle = -Math.PI * 0.78 + (i * Math.PI * 2) / birdOutline.length;
        return { x: Math.cos(angle) * 74, y: Math.sin(angle) * 74 };
    });
    if (frame.enhanced) {
        shape(ctx, blob.map((start, i) => ({
            x: mix(start.x, birdOutline[i].x, p),
            y: mix(start.y, birdOutline[i].y, p),
        })), 1);
    }
    else {
        shape(ctx, blob, 1 - p);
        shape(ctx, birdOutline, p);
    }
    if (p > 0.84) {
        ctx.save();
        ctx.globalAlpha *= (p - 0.84) / 0.16;
        ellipse(ctx, 497, 244, 3, 3, palette.ink);
        ctx.restore();
    }
}
function drawWave(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const gesture = windowed(t, 650, 1000, 220);
    actor(ctx, 235, 420, 1, { arm: 0.9 + gesture * 0.6, lean: -gesture * 8 });
    const travel = (t - 950) / 1750;
    const upper = [];
    const lower = [];
    for (let i = 0; i <= 36; i++) {
        const q = i / 36;
        const local = q - travel;
        const delayed = t >= 850
            ? Math.sin(local * 18) * Math.exp((-local * local) / 0.035) * 63
            : 0;
        const rigid = gesture * Math.sin(q * 2.3) * 55;
        const offset = (frame.enhanced ? delayed : rigid) * (frame.reducedMotion ? 0.5 : 1);
        const y = 288 + q * 26 + offset;
        upper.push({ x: 313 + q * 506, y: y - 13 });
        lower.push({ x: 313 + q * 506, y: y + 13 });
    }
    polygon(ctx, [...upper, ...lower.slice().reverse()], palette.red);
    line(ctx, upper, '#f4b294', 2);
    for (let i = 0; i < upper.length; i += 6)
        line(ctx, [upper[i], lower[i]], '#873e51', 2);
}
function drawAraki(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const spread = windowed(t, 750, 1550, 430);
    const rebound = windowed(t, 1550, 2150, 280) * 0.38;
    const force = frame.enhanced
        ? (spread - rebound) * (frame.reducedMotion ? 0.5 : 1)
        : 0;
    for (let i = 0; i < 5; i++) {
        const delay = i * 0.13;
        const fold = force * (1 - delay * 0.4);
        const tip = {
            x: 496 - fold * (250 + i * 17) + i * 7,
            y: 420 - fold * (198 - i * 30),
        };
        ctx.beginPath();
        ctx.moveTo(476 + i * 3, 270 + i * 4);
        ctx.bezierCurveTo(424 - fold * 50, 274 - fold * 48, tip.x - 34, tip.y - 69, tip.x, tip.y);
        ctx.lineTo(tip.x + 24 + Math.abs(fold) * 17, tip.y - 22);
        ctx.bezierCurveTo(tip.x + 97, tip.y + 9, 514 - fold * 20, 360, 507, 288 + i * 4);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#a37cb7' : '#674d82';
        ctx.fill();
    }
    actor(ctx, 500, 420, 1, {
        lean: spread * 12,
        headTurn: spread * 2,
        arm: 0.35,
    });
}
function drawSquash(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const flight = clamp((t - 900) / 1300);
    const ground = 420 - Math.sin(flight * Math.PI) * (frame.reducedMotion ? 85 : 170);
    let stretch = 1;
    if (frame.enhanced) {
        const fall = windowed(t, 1750, 2120, 160);
        const squash = windowed(t, 2190, 2420, 100);
        const rebound = windowed(t, 2410, 2670, 110);
        stretch = 1 + fall * 0.38 - squash * 0.43 + rebound * 0.15;
        if (frame.reducedMotion)
            stretch = mix(1, stretch, 0.45);
    }
    ctx.save();
    ctx.translate(480, ground);
    ctx.scale(1 / stretch, stretch);
    actor(ctx, 0, 0, 1, { arm: 0.5 });
    ctx.restore();
    if (t >= 2200 && t < 2580) {
        const age = (t - 2200) / 380;
        ctx.save();
        ctx.globalAlpha *= (1 - age) * 0.35;
        ring(ctx, 480, 425, 45 + age * 50, 8 + age * 5, palette.paper, 2);
        ctx.restore();
    }
}
function angularActor(ctx, x, pose) {
    const hip = pose === 0
        ? { x: -10, y: -70 }
        : pose === 1
            ? { x: 0, y: -90 }
            : { x: -25, y: -50 };
    const shoulder = pose === 0
        ? { x: -55, y: -125 }
        : pose === 1
            ? { x: 30, y: -142 }
            : { x: 12, y: -117 };
    ctx.save();
    ctx.translate(x, 420);
    const legs = pose === 0
        ? [
            { x: -72, y: 0 },
            { x: -40, y: -32 },
            hip,
            { x: 31, y: -25 },
            { x: 58, y: 0 },
        ]
        : pose === 1
            ? [
                { x: -101, y: -43 },
                { x: -38, y: -69 },
                hip,
                { x: 43, y: -34 },
                { x: 89, y: -39 },
            ]
            : [
                { x: -107, y: 0 },
                { x: -67, y: -25 },
                hip,
                { x: 43, y: -23 },
                { x: 76, y: 0 },
            ];
    line(ctx, legs, palette.gold, 19);
    line(ctx, [hip, shoulder], palette.gold, 39);
    ellipse(ctx, shoulder.x - (pose === 0 ? 15 : -11), shoulder.y - 31, 22, 25, palette.gold);
    const front = pose === 0
        ? [shoulder, { x: -85, y: -171 }, { x: -111, y: -126 }]
        : pose === 1
            ? [shoulder, { x: 73, y: -206 }, { x: 112, y: -159 }]
            : [shoulder, { x: 65, y: -126 }, { x: 127, y: -124 }];
    line(ctx, front, palette.gold, 16);
    line(ctx, [shoulder, { x: -47, y: -94 }, { x: -77, y: -55 }], palette.gold, 14);
    line(ctx, [
        { x: hip.x - 22, y: hip.y - 6 },
        { x: hip.x + 21, y: hip.y - 6 },
    ], palette.paper, 5);
    ctx.restore();
}
function drawKanada(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    if (!frame.enhanced) {
        const p = smooth((t - 1050) / 850);
        actor(ctx, mix(300, 680, p), 420, 1, {
            lean: p * 29,
            arm: p * 1.5,
            crouch: (1 - p) * 0.5,
        });
        return;
    }
    const pose = t < 1650 ? 0 : t < 1830 ? 1 : 2;
    const x = pose === 0 ? 300 : pose === 1 ? 490 : 680;
    if (t < 850 || t > 3300)
        actor(ctx, t < 850 ? 300 : 680, 420);
    else
        angularActor(ctx, x, pose);
    if (t >= 1830 && t < 2300) {
        const amount = (t - 1830) / 470;
        ctx.save();
        ctx.globalAlpha *= (1 - amount) * (frame.reducedMotion ? 0.2 : 0.45);
        polygon(ctx, [
            { x: 485, y: 430 },
            { x: 625, y: 332 },
            { x: 570, y: 363 },
            { x: 793, y: 272 },
            { x: 670, y: 367 },
            { x: 721, y: 341 },
        ], palette.paper);
        ctx.restore();
    }
}
function drawPerspective(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const p = windowed(t, 1100, 2500, 520);
    if (!frame.enhanced || p <= 0) {
        actor(ctx, 480, 420, 1, { kick: p, arm: 0.45 });
        return;
    }
    const exaggeration = p * (frame.reducedMotion ? 0.62 : 1);
    const head = { x: 461 - exaggeration * 24, y: 227 + exaggeration * 9 };
    ellipse(ctx, head.x, head.y, 23 - exaggeration * 7, 27 - exaggeration * 8, palette.gold);
    polygon(ctx, [
        { x: head.x - 15, y: head.y + 29 },
        { x: head.x + 26, y: head.y + 23 },
        { x: 501, y: 325 },
        { x: 457, y: 333 },
    ], palette.gold);
    line(ctx, [
        { x: 466, y: 326 },
        { x: 428, y: 374 },
        { x: 406, y: 417 },
    ], '#ba7c46', 19);
    line(ctx, [
        { x: 455, y: 266 },
        { x: 403, y: 283 },
        { x: 376, y: 320 },
    ], palette.gold, 13);
    line(ctx, [
        { x: 480, y: 263 },
        { x: 535, y: 275 },
        { x: 553, y: 242 },
    ], palette.gold, 12);
    const foot = {
        x: mix(513, 626, exaggeration),
        y: mix(412, 351, exaggeration),
    };
    const radius = mix(21, 97, exaggeration);
    polygon(ctx, [
        { x: 479, y: 315 },
        { x: 503, y: 308 },
        { x: foot.x + radius * 0.34, y: foot.y + radius * 0.35 },
        { x: foot.x - radius * 0.5, y: foot.y + radius * 0.5 },
    ], '#c78b4c');
    polygon(ctx, [
        { x: foot.x - radius * 0.76, y: foot.y - radius * 0.42 },
        { x: foot.x + radius * 0.53, y: foot.y - radius * 0.66 },
        { x: foot.x + radius, y: foot.y + radius * 0.16 },
        { x: foot.x + radius * 0.5, y: foot.y + radius * 0.8 },
        { x: foot.x - radius * 0.67, y: foot.y + radius * 0.67 },
    ], palette.paper);
    for (let i = 0; i < 4; i++)
        line(ctx, [
            { x: foot.x - radius * 0.46, y: foot.y + (i - 1.5) * radius * 0.2 },
            {
                x: foot.x + radius * 0.51,
                y: foot.y + (i - 1.5) * radius * 0.2 - radius * 0.11,
            },
        ], '#9d928b', Math.max(2, radius * 0.045));
}
function drawFocusLines(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const alpha = windowed(t, 900, 2900, 450);
    if (frame.enhanced && alpha > 0) {
        ctx.save();
        ctx.globalAlpha *= alpha * (frame.reducedMotion ? 0.3 : 0.62);
        for (let i = 0; i < 43; i++) {
            const a = (i * Math.PI * 2) / 43 + noise(i) * 0.025;
            const inner = 113 + noise(i + 7) * 100;
            line(ctx, [
                { x: 480 + Math.cos(a) * inner, y: 284 + Math.sin(a) * inner * 0.87 },
                { x: 480 + Math.cos(a) * 1100, y: 284 + Math.sin(a) * 1100 },
            ], i % 3 ? palette.paper : palette.ink, i % 4 ? 1.4 : 4);
        }
        ctx.restore();
    }
    actor(ctx, 480, 420, 1, { arm: 0.5, crouch: alpha * 0.1 });
}
function drawSpeed(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const speed = windowed(t, 900, 2450, 230);
    const x = dashPosition(t);
    if (frame.enhanced && speed > 0) {
        ctx.save();
        ctx.globalAlpha *= speed * (frame.reducedMotion ? 0.25 : 0.65);
        for (let i = 0; i < (frame.reducedMotion ? 8 : 18); i++) {
            const y = 83 + i * 22;
            const end = x - 80 - noise(i + 12) * 70;
            const offset = frame.reducedMotion ? 0 : (t * 0.35 + i * 53) % 145;
            line(ctx, [
                { x: -180 + offset, y },
                { x: end, y },
            ], i % 3 ? '#bbbdcc' : palette.blue, i % 3 ? 2 : 4);
        }
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const y = 298 + side * (93 + i * 20);
                ctx.beginPath();
                ctx.moveTo(x - 270, y);
                ctx.bezierCurveTo(x - 50, y + side * 13, x + 35, y - side * 55, x + 150, y - side * 19);
                ctx.strokeStyle = palette.blue;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    drawRunner(ctx, t, 1, frame.reducedMotion);
}
export function drawMotion(ctx, id, frame) {
    ctx.save();
    try {
        switch (id) {
            case 'smear-frame':
                drawSmear(ctx, frame);
                label(ctx, frame.enhanced
                    ? '통과 구간을 하나의 쓸린 몸으로 연결'
                    : '매 시점 온전한 달리기 자세');
                break;
            case 'obake':
                drawObake(ctx, frame);
                label(ctx, frame.enhanced
                    ? '중간 몸의 물결진 외곽과 어긋나는 얼굴'
                    : '비율을 유지한 같은 도약');
                break;
            case 'background-animation':
                drawBackground(ctx, frame);
                label(ctx, frame.enhanced
                    ? '배경의 벽·바닥 원근을 다시 그림'
                    : '고정된 회랑과 같은 배우');
                break;
            case 'nakanuki':
                drawNakanuki(ctx, frame);
                label(ctx, frame.enhanced
                    ? '장전·도착은 남기고 연결 자세를 생략'
                    : '같은 길이의 연속 연결');
                break;
            case 'midareuchi':
                drawMidare(ctx, frame);
                label(ctx, frame.enhanced
                    ? '짧은 두 타 / 긴 쉼 / 다시 두 타 / 마지막 한 타'
                    : '같은 다섯 타의 일정한 간격');
                break;
            case 'strobe':
                drawStrobe(ctx, frame);
                label(ctx, frame.enhanced
                    ? '120ms 간격의 실제 과거 자세를 남김'
                    : '현재 자세만 표시');
                break;
            case 'motion-metamorphosis':
                drawMetamorphosis(ctx, frame);
                label(ctx, frame.enhanced
                    ? '같은 외곽에서 부리·날개·꼬리가 갈라짐'
                    : '먹덩어리와 새 모양을 교차 페이드');
                break;
            case 'wave-propagation':
                drawWave(ctx, frame);
                label(ctx, frame.enhanced
                    ? '손목 → 천 가운데 → 끝으로 한 물결 전달'
                    : '천 전체가 같은 박자로 즉시 반응');
                break;
            case 'araki-flutter':
                drawAraki(ctx, frame);
                label(ctx, frame.enhanced
                    ? '큰 펼침 → 주름의 엇갈림 → 반동'
                    : '몸은 같고 망토는 아래로 처짐');
                break;
            case 'squash-stretch':
                drawSquash(ctx, frame);
                label(ctx, frame.enhanced
                    ? '낙하 연신 → 접지 압축 → 탄성 복원'
                    : '몸 비율을 유지한 같은 도약');
                break;
            case 'kanada-motion':
                drawKanada(ctx, frame);
                label(ctx, frame.enhanced
                    ? '각진 장전 / 다른 실루엣의 통과 / 넓은 도착'
                    : '비슷한 실루엣의 연속 이동');
                break;
            case 'kanada-perspective':
                drawPerspective(ctx, frame);
                label(ctx, frame.enhanced
                    ? '먼 머리 / 가까운 큰 발 / 서로 다른 비율'
                    : '옆으로 차는 보통 발 크기');
                break;
            case 'focus-lines':
                drawFocusLines(ctx, frame);
                label(ctx, frame.enhanced
                    ? '초점 공간을 비운 채 한 점으로 수렴'
                    : '같은 준비 자세와 원래 배경');
                break;
            case 'speed-streamlines':
                drawSpeed(ctx, frame);
                label(ctx, frame.enhanced
                    ? '평행한 속도선 + 몸을 감싸 흐르는 유선'
                    : '같은 경로의 달리기');
                break;
            default:
                stage(ctx, frame.reducedMotion ? 0 : time(frame));
        }
    }
    finally {
        ctx.restore();
    }
}
