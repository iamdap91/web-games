import { actor, burst, ellipse, face, label, line, mix, noise, palette, polygon, ring, smooth, stage, star, windowed, } from './drawing.js';
import { height, width, } from './types.js';
export const impactSamples = [
    {
        id: 'impact-frame',
        name: '임팩트 프레임',
        category: 'impact',
        previewMs: 1840,
        description: '접촉 순간을 날카로운 흑백 추상화 한 장으로 바꿉니다.',
        distinction: '밝기를 더하는 대신 원래 구도를 잠깐 다른 그림으로 대체합니다.',
    },
    {
        id: 'beta-flash',
        name: '베타 플래시',
        category: 'impact',
        previewMs: 1810,
        description: '검게 채운 주변부와 비워 둔 흰 초점 공간으로 충격을 모읍니다.',
        distinction: '화면 전체를 반전하지 않고 검정과 흰 여백의 면적을 설계합니다.',
    },
    {
        id: 'monochrome-invert',
        name: '흑백 반전',
        category: 'impact',
        previewMs: 1840,
        description: '같은 타격 구도의 명암 관계를 접촉 순간 뒤집습니다.',
        distinction: '형태를 새 추상화로 교체하는 임팩트 프레임과 달리 구도를 보존합니다.',
    },
    {
        id: 'screen-shatter',
        name: '화면 갈라짐',
        category: 'impact',
        previewMs: 2170,
        description: '충격 컷의 실제 내용을 조각에 남긴 채 화면을 벌립니다.',
        distinction: '배우나 지형의 파괴가 아니라 한 장의 합성 화면이 갈라집니다.',
    },
    {
        id: 'hisashi-punch',
        name: '히사시 펀치',
        category: 'impact',
        previewMs: 2260,
        description: '주먹이 닿은 자세와 상대의 눌리는 반응을 길게 붙잡습니다.',
        distinction: '접촉 직전과 회수는 정상 속도이고 접촉 구간만 길어집니다. 작가 계보의 재현은 아닙니다.',
    },
    {
        id: 'action-cutin',
        name: '컷인',
        category: 'impact',
        previewMs: 1250,
        description: '진행 중인 공격 위에 결의에 찬 얼굴의 별도 패널을 끼웁니다.',
        distinction: '본래 행동과 얼굴을 동시에 남기며 전체 화면을 근접 컷으로 바꾸지 않습니다.',
    },
    {
        id: 'pon-yori',
        name: '퐁요리',
        category: 'impact',
        previewMs: 1900,
        description: '와이드에서 근접 구도로 중간 줌 이동 없이 순간 전환합니다.',
        distinction: '카메라가 다가가는 과정 대신 처음과 끝 크기를 컷으로 바로 잇습니다.',
    },
    {
        id: 'obari-punch',
        name: '오바리 펀치',
        category: 'impact',
        previewMs: 1870,
        description: '뒤로 접힌 몸에서 거대한 전경 주먹을 앞으로 꽂습니다.',
        distinction: '배우 전체 확대가 아니라 주먹·팔·머리의 원근 비율을 직접 다르게 그립니다.',
    },
    {
        id: 'inazuma-kick',
        name: '이나즈마 킥',
        category: 'impact',
        previewMs: 1900,
        description: '높이 솟은 몸에서 큰 발을 선두로 사선 낙하합니다.',
        distinction: '번개 선만 붙이지 않고 공중 장전과 발이 앞서는 낙하 자세를 따로 그립니다.',
    },
    {
        id: 'kurumada-fall',
        name: '쿠루마다 낙하',
        category: 'impact',
        previewMs: 2410,
        description: '맞고 날아간 몸이 뒤집힌 뒤 머리부터 지면에 꽂히듯 떨어집니다.',
        distinction: '중립 도형 배우의 만화적인 낙하·접지 압축이며 피나 상처는 없습니다.',
    },
];
const contactMs = 1800;
function sceneTime(frame) {
    return Math.max(0, frame.timeMs);
}
function drawCombat(ctx, timeMs, reducedMotion) {
    stage(ctx, reducedMotion ? 0 : timeMs);
    const thrust = smooth((timeMs - 1460) / 340);
    const recover = smooth((timeMs - 2280) / 720);
    const reach = thrust * (1 - recover);
    const recoil = windowed(timeMs, contactMs, 2220, 140);
    actor(ctx, 310 + reach * 160, 420, 1, {
        arm: reach * 2,
        lean: reach * 20,
        crouch: (1 - thrust) * windowed(timeMs, 700, 1400, 300) * 0.5,
    });
    actor(ctx, 665 + recoil * (reducedMotion ? 13 : 42), 420, 1, {
        color: palette.blue,
        facing: -1,
        arm: 0.55,
        lean: -recoil * (reducedMotion ? 10 : 43),
    });
    if (timeMs >= contactMs && timeMs < contactMs + 130)
        ring(ctx, 652, 245, 15, 11, palette.paper, 2);
}
function drawAbstractImpact(ctx, reducedMotion) {
    ctx.fillStyle = reducedMotion ? '#353548' : palette.paper;
    ctx.fillRect(0, 0, width, height);
    const center = { x: 644, y: 250 };
    for (let i = 0; i < 19; i++) {
        const angle = (i * Math.PI * 2) / 19 + noise(i + 9) * 0.15;
        const distance = 95 + noise(i) * 65;
        polygon(ctx, [
            {
                x: center.x + Math.cos(angle - 0.04) * distance,
                y: center.y + Math.sin(angle - 0.04) * distance,
            },
            {
                x: center.x + Math.cos(angle) * 1100,
                y: center.y + Math.sin(angle) * 1100,
            },
            {
                x: center.x + Math.cos(angle + 0.12) * 1100,
                y: center.y + Math.sin(angle + 0.12) * 1100,
            },
        ], palette.ink);
    }
    polygon(ctx, [
        { x: 196, y: 435 },
        { x: 303, y: 319 },
        { x: 365, y: 269 },
        { x: 438, y: 248 },
        { x: 478, y: 190 },
        { x: 524, y: 213 },
        { x: 500, y: 259 },
        { x: 627, y: 226 },
        { x: 658, y: 251 },
        { x: 605, y: 282 },
        { x: 461, y: 315 },
        { x: 408, y: 361 },
        { x: 430, y: 438 },
        { x: 370, y: 445 },
        { x: 338, y: 367 },
    ], palette.ink);
    star(ctx, center.x, center.y, 99, reducedMotion ? '#aeabbc' : palette.paper, 7, 0.13);
    line(ctx, [
        { x: 681, y: 170 },
        { x: 731, y: 252 },
        { x: 697, y: 335 },
    ], palette.ink, 39);
}
function drawBeta(ctx, amount, reducedMotion) {
    ctx.save();
    ctx.globalAlpha *= amount * (reducedMotion ? 0.6 : 1);
    ctx.fillStyle = '#080c17';
    ctx.fillRect(0, 0, width, height);
    const center = { x: 620, y: 254 };
    ellipse(ctx, center.x, center.y, 144, 122, palette.paper);
    for (let i = 0; i < 38; i++) {
        const a = (i * Math.PI * 2) / 38;
        const inner = 140 + noise(i + 24) * 45;
        polygon(ctx, [
            {
                x: center.x + Math.cos(a) * inner,
                y: center.y + Math.sin(a) * inner * 0.83,
            },
            {
                x: center.x + Math.cos(a - 0.026) * 1100,
                y: center.y + Math.sin(a - 0.026) * 1100,
            },
            {
                x: center.x + Math.cos(a + 0.026) * 1100,
                y: center.y + Math.sin(a + 0.026) * 1100,
            },
        ], palette.paper);
    }
    actor(ctx, 475, 420, 1, { arm: 2, lean: 20, silhouette: true });
    actor(ctx, 680, 420, 1, { facing: -1, lean: -28, silhouette: true });
    ctx.restore();
}
function drawInverted(ctx, timeMs, reducedMotion) {
    const negative = timeMs >= 1800 && timeMs < 1940;
    ctx.fillStyle = reducedMotion
        ? negative
            ? '#343d4b'
            : '#929494'
        : negative
            ? '#0e1421'
            : '#e4dfd1';
    ctx.fillRect(0, 0, width, height);
    const color = reducedMotion
        ? negative
            ? '#c7c7c2'
            : '#353d4b'
        : negative
            ? '#f3eddd'
            : '#172030';
    const reach = smooth((timeMs - 1460) / 340);
    actor(ctx, 310 + reach * 160, 420, 1, {
        arm: reach * 2,
        lean: reach * 20,
        color,
    });
    actor(ctx, 665, 420, 1, {
        facing: -1,
        lean: negative && !reducedMotion ? -33 : 0,
        color,
    });
    for (let i = 0; i < 6; i++)
        line(ctx, [
            { x: 80 + i * 150, y: 420 },
            { x: 45 + i * 170, y: 540 },
        ], color, 2);
    line(ctx, [
        { x: 0, y: 420 },
        { x: width, y: 420 },
    ], color, 3);
}
function drawShatter(ctx, frame) {
    const t = sceneTime(frame);
    drawCombat(ctx, t, frame.reducedMotion);
    if (!frame.enhanced || t < contactMs || t > 3000)
        return;
    const age = (t - contactMs) / 1000;
    if (frame.reducedMotion) {
        const opacity = 1 - smooth(age / 0.6);
        ctx.save();
        ctx.globalAlpha *= opacity;
        for (let i = 0; i < 11; i++) {
            const a = (i * Math.PI * 2) / 11;
            line(ctx, [
                { x: 644, y: 250 },
                { x: 644 + Math.cos(a) * 1100, y: 250 + Math.sin(a) * 1100 },
            ], palette.paper, 2);
        }
        ctx.restore();
        return;
    }
    stage(ctx, 0);
    face(ctx, 520, 285, 0.95, 'shock');
    const origin = { x: 644, y: 250 };
    const boundary = [
        { x: 0, y: 0 },
        { x: 270, y: 0 },
        { x: 570, y: 0 },
        { x: 960, y: 0 },
        { x: 960, y: 230 },
        { x: 960, y: 540 },
        { x: 650, y: 540 },
        { x: 310, y: 540 },
        { x: 0, y: 540 },
        { x: 0, y: 245 },
    ];
    for (let i = 0; i < boundary.length; i++) {
        const a = boundary[i];
        const b = boundary[(i + 1) % boundary.length];
        const center = {
            x: (a.x + b.x + origin.x) / 3,
            y: (a.y + b.y + origin.y) / 3,
        };
        const p = Math.max(0, age - noise(i) * 0.13);
        const fly = p * p * 0.85 + p * 0.3;
        ctx.save();
        ctx.globalAlpha *= 1 - smooth((age - 0.65) / 0.45);
        ctx.translate(center.x + (center.x - origin.x) * fly, center.y + (center.y - origin.y) * fly + 130 * p * p);
        ctx.rotate((noise(i + 18) - 0.5) * p * 1.4);
        ctx.translate(-center.x, -center.y);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.closePath();
        ctx.clip();
        drawCombat(ctx, contactMs, false);
        line(ctx, [origin, a, b, origin], palette.paper, 3);
        ctx.restore();
    }
}
function hisashiTime(timeMs) {
    if (timeMs < contactMs)
        return timeMs;
    if (timeMs < 2800)
        return contactMs + (timeMs - contactMs) * 0.12;
    return 1920 + (timeMs - 2800) * 1.2;
}
function drawHisashi(ctx, frame) {
    const t = sceneTime(frame);
    const actionTime = frame.enhanced ? hisashiTime(t) : t;
    drawCombat(ctx, actionTime, frame.reducedMotion);
    if (frame.enhanced && t >= contactMs && t < 3000) {
        const pressure = windowed(t, contactMs, 2800, 160);
        ctx.save();
        ctx.globalAlpha *= pressure * 0.8;
        const squeeze = smooth((t - contactMs) / 1000);
        ellipse(ctx, 653 + squeeze * 9, 246, 18 + squeeze * 8, 24 - squeeze * 7, palette.gold);
        for (let i = 0; i < 4; i++) {
            const y = 230 + i * 10;
            line(ctx, [
                { x: 681, y },
                { x: 688 + squeeze * 13, y: y + 4 },
            ], palette.ink, 2);
        }
        ctx.restore();
    }
}
function drawCutIn(ctx, frame) {
    const t = sceneTime(frame);
    drawCombat(ctx, t, frame.reducedMotion);
    if (!frame.enhanced)
        return;
    const amount = windowed(t, 780, 1670, 180);
    if (amount <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= amount;
    polygon(ctx, [
        { x: 430, y: 40 },
        { x: 936, y: 40 },
        { x: 855, y: 228 },
        { x: 349, y: 228 },
    ], palette.paper);
    ctx.beginPath();
    ctx.moveTo(442, 48);
    ctx.lineTo(925, 48);
    ctx.lineTo(847, 219);
    ctx.lineTo(363, 219);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#361d3d';
    ctx.fillRect(340, 40, 600, 190);
    for (let i = 0; i < 12; i++)
        line(ctx, [
            { x: 345, y: 60 + i * 16 },
            { x: 940, y: 5 + i * 16 },
        ], '#8b4d65', 4);
    face(ctx, 660 + (frame.reducedMotion ? 0 : (1 - amount) * 35), 149, 1.1, 'anger');
    ctx.restore();
}
function drawPonYori(ctx, frame) {
    const t = sceneTime(frame);
    const close = frame.enhanced && t >= 1600 && t < 2650;
    if (!close) {
        drawCombat(ctx, t, frame.reducedMotion);
        return;
    }
    ctx.save();
    const scale = frame.reducedMotion ? 1.3 : 2.2;
    ctx.translate(480, 285);
    ctx.scale(scale, scale);
    ctx.translate(-615, -263);
    drawCombat(ctx, t, frame.reducedMotion);
    ctx.restore();
}
function giantFist(ctx, x, y, radius) {
    polygon(ctx, [
        { x: x - radius * 0.8, y: y - radius * 0.48 },
        { x: x - radius * 0.33, y: y - radius * 0.91 },
        { x: x + radius * 0.52, y: y - radius * 0.78 },
        { x: x + radius, y: y - radius * 0.22 },
        { x: x + radius * 0.91, y: y + radius * 0.58 },
        { x: x + radius * 0.3, y: y + radius * 0.89 },
        { x: x - radius * 0.75, y: y + radius * 0.63 },
    ], palette.gold);
    for (let i = 0; i < 3; i++)
        line(ctx, [
            { x: x - radius * 0.32 + i * radius * 0.31, y: y - radius * 0.65 },
            { x: x - radius * 0.26 + i * radius * 0.31, y: y - radius * 0.19 },
        ], '#855330', Math.max(2, radius * 0.045));
    line(ctx, [
        { x: x - radius * 0.6, y: y + radius * 0.34 },
        { x: x + radius * 0.52, y: y + radius * 0.28 },
    ], '#855330', Math.max(2, radius * 0.045));
}
function drawObari(ctx, frame) {
    const t = sceneTime(frame);
    if (!frame.enhanced || t < 1420 || t > 2800) {
        drawCombat(ctx, t, frame.reducedMotion);
        return;
    }
    stage(ctx, frame.reducedMotion ? 0 : t);
    const punch = smooth((t - 1420) / 380) * (1 - smooth((t - 2400) / 400));
    actor(ctx, 680 + punch * 25, 420, 1, {
        color: palette.blue,
        facing: -1,
        lean: -punch * 35,
    });
    actor(ctx, 402, 432, 0.9, {
        lean: -33 + punch * 38,
        crouch: 0.6 - punch * 0.3,
        arm: -0.6,
    });
    const wrist = { x: mix(375, 576, punch), y: mix(320, 275, punch) };
    polygon(ctx, [
        { x: 409, y: 299 },
        { x: 438, y: 323 },
        { x: wrist.x + 31, y: wrist.y + 42 },
        { x: wrist.x + 38, y: wrist.y - 37 },
    ], '#c68747');
    giantFist(ctx, wrist.x + 27, wrist.y, mix(19, frame.reducedMotion ? 70 : 103, punch));
    if (t >= contactMs && t < 2070)
        burst(ctx, 678, 269, (t - contactMs) / 270, palette.paper, 9);
}
function drawKickBody(ctx, x, y, dive) {
    const shoulder = { x: x - 30, y: y - 83 };
    const hip = { x: x + 6, y: y - 29 };
    line(ctx, [shoulder, hip], palette.gold, 37);
    ellipse(ctx, shoulder.x - 14, shoulder.y - 27, 22, 26, palette.gold);
    line(ctx, [shoulder, { x: x - 78, y: y - 59 }, { x: x - 55, y: y - 107 }], palette.gold, 14);
    line(ctx, [shoulder, { x: x + 24, y: y - 97 }, { x: x + 37, y: y - 140 }], palette.gold, 14);
    line(ctx, [hip, { x: x - 44, y: y + 11 }, { x: x - 85, y: y - 13 }], palette.gold, 18);
    const foot = { x: x + 45 + dive * 38, y: y + 60 + dive * 29 };
    line(ctx, [hip, { x: x + 29, y: y + 18 }, foot], palette.gold, 24);
    polygon(ctx, [
        { x: foot.x - 26, y: foot.y - 14 },
        { x: foot.x + 16, y: foot.y - 29 },
        { x: foot.x + 48, y: foot.y + 5 },
        { x: foot.x - 4, y: foot.y + 33 },
    ], palette.paper);
}
function drawInazuma(ctx, frame) {
    const t = sceneTime(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const up = smooth((t - 500) / 700);
    const dive = smooth((t - 1500) / 480);
    const settle = smooth((t - 2350) / 700);
    actor(ctx, 711, 420, 1, {
        color: palette.blue,
        facing: -1,
        lean: -windowed(t, 1980, 2450, 100) * 39,
    });
    if (t < 500 || t >= 2350) {
        actor(ctx, t < 500 ? 310 : 635, 420, 1, {
            crouch: t < 500 ? 0.2 : (1 - settle) * 0.8,
        });
        return;
    }
    const x = mix(mix(310, 440, up), 635, dive);
    const y = mix(mix(327, 144, up), 298, dive);
    if (frame.enhanced) {
        if (dive > 0 && dive < 1) {
            const alpha = frame.reducedMotion ? 0.3 : 0.75;
            ctx.save();
            ctx.globalAlpha *= alpha;
            polygon(ctx, [
                { x: x - 205, y: y - 293 },
                { x: x - 39, y: y - 85 },
                { x: x - 80, y: y - 94 },
                { x: x + 65, y: y + 72 },
                { x: x - 154, y: y - 134 },
                { x: x - 98, y: y - 132 },
            ], palette.blue);
            ctx.restore();
        }
        drawKickBody(ctx, x, y, dive);
    }
    else
        actor(ctx, x, y + 93 + dive * 29, 1, {
            kick: dive,
            crouch: (1 - dive) * 0.8,
        });
    if (t >= 1980 && t < 2350)
        burst(ctx, 718, 412, (t - 1980) / 370, palette.paper, 11);
}
function drawKurumada(ctx, frame) {
    const t = sceneTime(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    actor(ctx, 286, 420, 1, {
        arm: windowed(t, 600, 1150, 180) * 2,
        color: palette.blue,
    });
    if (t < 850) {
        actor(ctx, 450, 420);
        return;
    }
    const launch = smooth((t - 850) / 850);
    const fall = smooth((t - 1700) / 650);
    const x = mix(450, frame.reducedMotion ? 650 : 718, launch);
    const ground = mix(mix(420, 210, launch), 420, fall);
    if (!frame.enhanced) {
        actor(ctx, x, ground, 1, {
            lean: launch * 35 * (1 - fall),
            crouch: fall * 0.45,
        });
        return;
    }
    const rotation = launch * Math.PI;
    const squeeze = windowed(t, 2350, 2600, 90);
    ctx.save();
    ctx.translate(x, ground - mix(82, 108, launch) * (1 - squeeze * 0.22));
    ctx.rotate(rotation);
    ctx.scale(1 + squeeze * 0.2, 1 - squeeze * 0.22);
    // 반전 뒤 머리가 지면에 닿도록 회전 중심에서 배우의 머리까지를 보정한다.
    actor(ctx, 0, 82, 1, { arm: 1.1, kick: 0.5 });
    ctx.restore();
    if (t >= 2350 && t < 2900) {
        burst(ctx, x, 422, (t - 2350) / 550, palette.paper, 13);
        const dust = smooth((t - 2350) / 350);
        ctx.save();
        ctx.globalAlpha *= (1 - smooth((t - 2650) / 500)) * 0.5;
        ellipse(ctx, x - 54 - dust * 34, 426, 52, 15, '#ac9d94');
        ellipse(ctx, x + 49 + dust * 34, 426, 50, 15, '#ac9d94');
        ctx.restore();
    }
}
export function drawImpact(ctx, id, frame) {
    const t = sceneTime(frame);
    ctx.save();
    try {
        switch (id) {
            case 'impact-frame':
                drawCombat(ctx, t, frame.reducedMotion);
                if (frame.enhanced && t >= 1780 && t < 1920)
                    drawAbstractImpact(ctx, frame.reducedMotion);
                label(ctx, frame.enhanced
                    ? '접촉의 140ms만 다른 그림으로 대체'
                    : '원래 접촉 동작');
                break;
            case 'beta-flash':
                drawCombat(ctx, t, frame.reducedMotion);
                if (frame.enhanced)
                    drawBeta(ctx, windowed(t, 1500, 2130, 130), frame.reducedMotion);
                label(ctx, frame.enhanced
                    ? '검은 주변부 / 비워 둔 흰 타점'
                    : '원래 배경에서 같은 타격');
                break;
            case 'monochrome-invert':
                if (frame.enhanced && t >= 1450 && t < 2250)
                    drawInverted(ctx, t, frame.reducedMotion);
                else
                    drawCombat(ctx, t, frame.reducedMotion);
                label(ctx, frame.enhanced
                    ? '같은 형태의 밝고 어두운 관계를 한 번 뒤집음'
                    : '원래 색과 명도');
                break;
            case 'screen-shatter':
                drawShatter(ctx, frame);
                label(ctx, '화면의 내용이 남은 조각 / 실제 신체·지형 파괴 없음');
                break;
            case 'hisashi-punch':
                drawHisashi(ctx, frame);
                label(ctx, frame.enhanced
                    ? '접촉 구간만 길게 잡아 압력을 남김'
                    : '같은 일격을 정상 속도로 통과');
                break;
            case 'action-cutin':
                drawCutIn(ctx, frame);
                label(ctx, frame.enhanced
                    ? '행동을 남긴 채 얼굴 패널 삽입'
                    : '하나의 와이드 구도');
                break;
            case 'pon-yori':
                drawPonYori(ctx, frame);
                label(ctx, frame.enhanced
                    ? '와이드 → 즉시 근접 컷 → 즉시 와이드'
                    : '와이드 구도 유지');
                break;
            case 'obari-punch':
                drawObari(ctx, frame);
                label(ctx, frame.enhanced
                    ? '작은 몸 뒤 / 큰 주먹 앞 — 직접 그린 원근'
                    : '옆으로 뻗는 보통 정권');
                break;
            case 'inazuma-kick':
                drawInazuma(ctx, frame);
                label(ctx, frame.enhanced
                    ? '공중 장전 → 큰 발이 앞서는 사선 낙하'
                    : '같은 도약과 낙하의 단순한 몸');
                break;
            case 'kurumada-fall':
                drawKurumada(ctx, frame);
                label(ctx, frame.enhanced
                    ? '뒤집힌 몸 → 머리부터 접지 → 만화적 압축'
                    : '직립을 유지한 보통 낙하');
                break;
            default:
                stage(ctx, frame.reducedMotion ? 0 : t);
        }
    }
    finally {
        ctx.restore();
    }
}
