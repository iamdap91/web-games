import { burst, ellipse, label, line, noise, palette, polygon, ring, smooth, stage, star, windowed, } from './drawing.js';
import { battleLayout, drawAtaho, drawBattle, drawBattleActors, drawBear, drawPortrait, } from './battle.js';
import { height, width, } from './types.js';
export const impactSamples = [
    {
        id: 'impact-frame',
        name: '임팩트 프레임',
        category: 'impact',
        previewMs: 1840,
        description: '어퍼컷이 곰왕에게 닿는 순간을 실제 두 원본의 검은 윤곽과 추상 충격선으로 바꿉니다.',
        distinction: '새 몸을 그리지 않고 접촉 컷의 화면 표현만 잠깐 교체합니다.',
    },
    {
        id: 'beta-flash',
        name: '베타 플래시',
        category: 'impact',
        previewMs: 1810,
        description: '검은 주변부와 비워 둔 흰 초점 공간 안에 아타호와 곰왕의 실제 윤곽을 남깁니다.',
        distinction: '화면 전체 반전과 달리 검정과 흰 여백의 면적을 설계합니다.',
    },
    {
        id: 'monochrome-invert',
        name: '흑백 반전',
        category: 'impact',
        previewMs: 1840,
        description: '같은 어퍼컷과 곰왕 피격 구도의 밝고 어두운 관계를 접촉 순간 뒤집습니다.',
        distinction: '원본 형태·비율·방향은 유지하고 명암 관계만 바꿉니다.',
    },
    {
        id: 'screen-shatter',
        name: '화면 갈라짐',
        category: 'impact',
        previewMs: 2170,
        description: '실제 아타호와 곰왕이 담긴 접촉 화면을 조각에 남긴 채 벌립니다.',
        distinction: '원본 배우의 새 회전 자세가 아니라 합성 화면의 조각이 이동합니다.',
    },
    {
        id: 'hisashi-punch',
        name: '히사시 펀치',
        category: 'impact',
        previewMs: 2260,
        description: '실제 어퍼컷의 접촉 프레임과 곰왕 피격 반응을 오래 붙잡습니다.',
        distinction: '접촉 구간의 재생 시간만 늘리고 몸과 상대 반응은 기존 프레임을 사용합니다.',
    },
    {
        id: 'action-cutin',
        name: '컷인',
        category: 'impact',
        previewMs: 1250,
        description: '곰왕을 향한 공격 위에 기존 아타호 얼굴의 별도 패널을 끼웁니다.',
        distinction: '행동을 남긴 채 같은 실제 인물의 눈 크롭을 함께 보여줍니다.',
    },
    {
        id: 'pon-yori',
        name: '퐁요리',
        category: 'impact',
        previewMs: 1900,
        description: '어퍼컷 와이드에서 타점 근접 구도로 중간 줌 이동 없이 전환합니다.',
        distinction: '원본 배우는 같은 비율이며 처음과 끝 구도를 컷으로 잇습니다.',
    },
    {
        id: 'obari-punch',
        name: '오바리 펀치 (원화 필요·미재현)',
        category: 'impact',
        previewMs: 1870,
        description: '가슴을 열어 화면 앞으로 뻗는 전용 정권 원화가 없어 오바리 펀치는 미재현 상태입니다.',
        distinction: '현재 두 판은 기존 어퍼컷의 일반 구도와 근접 구도만 비교합니다. 화면 확대를 오바리 펀치 완성으로 취급하지 않습니다.',
    },
    {
        id: 'inazuma-kick',
        name: '이나즈마 킥',
        category: 'impact',
        previewMs: 1900,
        description: '기존 A/B 사선 날아차기와 곰왕 피격에 낙하 방향의 번개 궤적을 더합니다.',
        distinction: '기존 점프·장전·신전·착지를 재사용하며 PNG를 돌리거나 발을 새로 키우지 않습니다.',
    },
    {
        id: 'kurumada-fall',
        name: '쿠루마다 낙하 (원화 필요·미재현)',
        category: 'impact',
        previewMs: 2820,
        description: '머리부터 떨어지는 곰왕 전용 낙하 원화가 없어 쿠루마다 낙하는 미재현 상태입니다.',
        distinction: '현재는 정자세 피격 그림의 일반 포물선·착지 비교입니다. PNG 회전으로 새 낙하 자세를 만들지 않습니다.',
    },
];
const contactMs = battleLayout.contactMs;
const impact = battleLayout.impact;
function sceneTime(frame) {
    return Math.max(0, frame.timeMs);
}
function drawCombat(ctx, frame, timeMs = frame.timeMs) {
    drawBattle(ctx, frame, { timeMs, action: 'uppercut' });
}
function frameCamera(ctx, scale, focus, destination) {
    const x = Math.max(width * (1 - scale), Math.min(0, destination.x - focus.x * scale));
    const y = Math.max(height * (1 - scale), Math.min(0, destination.y - focus.y * scale));
    ctx.translate(x, y);
    ctx.scale(scale, scale);
}
function drawSilhouettes(ctx, frame, timeMs = frame.timeMs) {
    drawAtaho(ctx, frame, { timeMs, action: 'uppercut', silhouette: true });
    drawBear(ctx, frame, { timeMs, silhouette: true });
}
function drawAbstractImpact(ctx, frame) {
    ctx.fillStyle = frame.reducedMotion ? '#353548' : palette.paper;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 19; i++) {
        const a = (i * Math.PI * 2) / 19 + noise(i + 9) * 0.15;
        const r = 95 + noise(i) * 65;
        polygon(ctx, [
            {
                x: impact.x + Math.cos(a - 0.04) * r,
                y: impact.y + Math.sin(a - 0.04) * r,
            },
            { x: impact.x + Math.cos(a) * 1100, y: impact.y + Math.sin(a) * 1100 },
            {
                x: impact.x + Math.cos(a + 0.12) * 1100,
                y: impact.y + Math.sin(a + 0.12) * 1100,
            },
        ], palette.ink);
    }
    drawSilhouettes(ctx, frame);
    star(ctx, impact.x, impact.y, frame.reducedMotion ? 57 : 92, frame.reducedMotion ? '#aeabbc' : palette.paper, 7, 0.13);
}
function drawBeta(ctx, frame) {
    const amount = windowed(sceneTime(frame), 1500, 2130, 130);
    ctx.save();
    ctx.globalAlpha *= amount * (frame.reducedMotion ? 0.6 : 1);
    ctx.fillStyle = '#080c17';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, impact.x, impact.y, 146, 122, palette.paper);
    for (let i = 0; i < 38; i++) {
        const a = (i * Math.PI * 2) / 38;
        const inner = 140 + noise(i + 24) * 45;
        polygon(ctx, [
            {
                x: impact.x + Math.cos(a) * inner,
                y: impact.y + Math.sin(a) * inner * 0.83,
            },
            {
                x: impact.x + Math.cos(a - 0.026) * 1100,
                y: impact.y + Math.sin(a - 0.026) * 1100,
            },
            {
                x: impact.x + Math.cos(a + 0.026) * 1100,
                y: impact.y + Math.sin(a + 0.026) * 1100,
            },
        ], palette.paper);
    }
    drawSilhouettes(ctx, frame);
    ctx.restore();
}
function drawInverted(ctx, frame) {
    const negative = sceneTime(frame) >= 1800 && sceneTime(frame) < 1940;
    ctx.fillStyle = frame.reducedMotion
        ? negative
            ? '#343d4b'
            : '#929494'
        : negative
            ? '#0e1421'
            : '#e4dfd1';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.filter = negative ? 'brightness(0) invert(1)' : 'brightness(0)';
    ctx.globalAlpha *= frame.reducedMotion ? 0.72 : 1;
    drawBattleActors(ctx, frame, { action: 'uppercut' });
    ctx.restore();
    const color = negative ? '#d5d5cf' : '#303645';
    line(ctx, [
        { x: 0, y: 440 },
        { x: width, y: 440 },
    ], color, 3);
}
function drawShatter(ctx, frame) {
    const t = sceneTime(frame);
    drawCombat(ctx, frame);
    if (!frame.enhanced || t < contactMs || t > 3000)
        return;
    const age = (t - contactMs) / 1000;
    if (frame.reducedMotion) {
        ctx.save();
        ctx.globalAlpha *= 1 - smooth(age / 0.6);
        for (let i = 0; i < 11; i++) {
            const a = (i * Math.PI * 2) / 11;
            line(ctx, [
                impact,
                {
                    x: impact.x + Math.cos(a) * 1100,
                    y: impact.y + Math.sin(a) * 1100,
                },
            ], palette.paper, 2);
        }
        ctx.restore();
        return;
    }
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
            x: (a.x + b.x + impact.x) / 3,
            y: (a.y + b.y + impact.y) / 3,
        };
        const p = Math.max(0, age - noise(i) * 0.13);
        const fly = p * p * 0.85 + p * 0.3;
        ctx.save();
        ctx.globalAlpha *= 1 - smooth((age - 0.65) / 0.45);
        ctx.translate(center.x + (center.x - impact.x) * fly, center.y + (center.y - impact.y) * fly + 130 * p * p);
        ctx.rotate((noise(i + 18) - 0.5) * p * 1.4);
        ctx.translate(-center.x, -center.y);
        ctx.beginPath();
        ctx.moveTo(impact.x, impact.y);
        ctx.lineTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.closePath();
        ctx.clip();
        // 배우의 자세를 회전시키지 않고 접촉 화면 전체가 담긴 합성 조각만 돌린다.
        drawCombat(ctx, frame, contactMs);
        line(ctx, [impact, a, b, impact], palette.paper, 3);
        ctx.restore();
    }
}
function hisashiTime(t) {
    if (t < contactMs)
        return t;
    if (t < 2800)
        return contactMs + (t - contactMs) * 0.12;
    return 1920 + (t - 2800) * 1.2;
}
function drawHisashi(ctx, frame) {
    const t = sceneTime(frame);
    drawCombat(ctx, frame, frame.enhanced ? hisashiTime(t) : t);
    if (!frame.enhanced || t < contactMs || t >= 3000)
        return;
    ctx.save();
    ctx.globalAlpha *=
        windowed(t, contactMs, 2800, 160) * (frame.reducedMotion ? 0.35 : 0.7);
    const p = smooth((t - contactMs) / 1000);
    ring(ctx, impact.x, impact.y, 21 + p * 12, 31 - p * 9, palette.paper, 2);
    for (let i = 0; i < 4; i++)
        line(ctx, [
            { x: impact.x + 30, y: impact.y - 15 + i * 10 },
            { x: impact.x + 39 + p * 12, y: impact.y - 11 + i * 10 },
        ], palette.ink, 2);
    ctx.restore();
}
function drawCutIn(ctx, frame) {
    const t = sceneTime(frame);
    drawCombat(ctx, frame);
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
    drawPortrait(ctx, frame, {
        x: 472,
        y: 48,
        width: 415,
        height: 174,
        crop: 'eyes',
    });
    ctx.restore();
}
function drawPonYori(ctx, frame) {
    const t = sceneTime(frame);
    if (!frame.enhanced || t < 1600 || t >= 2650) {
        drawCombat(ctx, frame);
        return;
    }
    ctx.save();
    const scale = frame.reducedMotion ? 1.3 : 2.2;
    frameCamera(ctx, scale, impact, { x: 480, y: 285 });
    drawCombat(ctx, frame);
    ctx.restore();
}
function drawObari(ctx, frame) {
    const t = sceneTime(frame);
    const active = frame.enhanced && t >= 1420 && t < 2800;
    ctx.save();
    if (active) {
        const scale = frame.reducedMotion ? 1.08 : 1.28;
        frameCamera(ctx, scale, { x: battleLayout.attacker.x, y: 347 }, { x: 470, y: 353 });
    }
    drawCombat(ctx, frame);
    if (active && t >= contactMs && t < 2070)
        burst(ctx, impact.x, impact.y, (t - contactMs) / 270, palette.paper, 9);
    ctx.restore();
}
function drawInazuma(ctx, frame) {
    const t = sceneTime(frame);
    drawBattle(ctx, frame, { action: 'kick' });
    if (!frame.enhanced)
        return;
    const amount = windowed(t, 1430, 1980, 160);
    ctx.save();
    ctx.globalAlpha *= amount * (frame.reducedMotion ? 0.28 : 0.68);
    polygon(ctx, [
        { x: impact.x - 204, y: impact.y - 253 },
        { x: impact.x - 38, y: impact.y - 45 },
        { x: impact.x - 79, y: impact.y - 54 },
        { x: impact.x + 26, y: impact.y + 38 },
        { x: impact.x - 154, y: impact.y - 94 },
        { x: impact.x - 97, y: impact.y - 92 },
    ], palette.blue);
    ctx.restore();
    if (t >= contactMs && t < 2180)
        burst(ctx, impact.x, impact.y, (t - contactMs) / 380, palette.paper, 11);
}
function drawKurumada(ctx, frame) {
    const t = sceneTime(frame);
    if (!frame.enhanced || t < contactMs) {
        drawCombat(ctx, frame);
        return;
    }
    stage(ctx, 0);
    drawAtaho(ctx, frame, { action: 'uppercut' });
    const progress = smooth((t - contactMs) / 1000);
    const airborne = t < 2800 ? Math.sin(progress * Math.PI) : 0;
    const target = battleLayout.target;
    const displacement = frame.reducedMotion ? 14 : 42;
    drawBear(ctx, frame, {
        x: target.x + progress * displacement,
        ground: target.ground - airborne * (frame.reducedMotion ? 45 : 105),
        state: 'hit',
    });
    if (t >= 2800 && t < 3350) {
        const age = (t - 2800) / 550;
        const x = target.x + displacement;
        burst(ctx, x, target.ground, age, palette.paper, 13);
        ctx.save();
        ctx.globalAlpha *= (1 - age) * 0.38;
        ellipse(ctx, x - 54, target.ground + 3, 56 + age * 25, 14, '#ac9d94');
        ellipse(ctx, x + 50, target.ground + 3, 54 + age * 25, 14, '#ac9d94');
        ctx.restore();
    }
}
export function drawImpact(ctx, id, frame) {
    const t = sceneTime(frame);
    ctx.save();
    try {
        switch (id) {
            case 'impact-frame':
                drawCombat(ctx, frame);
                if (frame.enhanced && t >= 1780 && t < 1920)
                    drawAbstractImpact(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 원본 윤곽 + 접촉의 140ms 추상 충격 컷'
                    : '실제 어퍼컷과 곰왕 피격');
                break;
            case 'beta-flash':
                drawCombat(ctx, frame);
                if (frame.enhanced)
                    drawBeta(ctx, frame);
                label(ctx, frame.enhanced
                    ? '검은 주변부 / 흰 타점 공간 / 실제 배우 윤곽'
                    : '같은 실제 공격과 피격');
                break;
            case 'monochrome-invert':
                if (frame.enhanced && t >= 1450 && t < 2250)
                    drawInverted(ctx, frame);
                else
                    drawCombat(ctx, frame);
                label(ctx, frame.enhanced
                    ? '같은 PNG의 명암 관계만 반전'
                    : '같은 실제 공격과 피격');
                break;
            case 'screen-shatter':
                drawShatter(ctx, frame);
                label(ctx, '아타호·곰왕 접촉 화면의 합성 조각');
                break;
            case 'hisashi-punch':
                drawHisashi(ctx, frame);
                label(ctx, frame.enhanced
                    ? '같은 접촉·피격 프레임을 길게 붙잡음'
                    : '같은 실제 일격의 정상 재생');
                break;
            case 'action-cutin':
                drawCutIn(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 얼굴의 눈 크롭을 별도 패널에 삽입'
                    : '어퍼컷 와이드 유지');
                break;
            case 'pon-yori':
                drawPonYori(ctx, frame);
                label(ctx, frame.enhanced
                    ? '와이드 → 타점 근접 컷 → 와이드'
                    : '같은 실제 일격의 와이드');
                break;
            case 'obari-punch':
                drawObari(ctx, frame);
                label(ctx, frame.enhanced
                    ? '오바리 펀치 미재현 · 현재는 일반 어퍼컷 근접 구도'
                    : '실제 어퍼컷 기본 구도');
                break;
            case 'inazuma-kick':
                drawInazuma(ctx, frame);
                label(ctx, frame.enhanced
                    ? '기존 A/B 사선 날아차기 + 낙하 방향 번개'
                    : '같은 기존 A/B 날아차기');
                break;
            case 'kurumada-fall':
                drawKurumada(ctx, frame);
                label(ctx, frame.enhanced
                    ? '쿠루마다 낙하 미재현 · 현재는 정자세 피격·포물선'
                    : '같은 어퍼컷의 기본 피격');
                break;
            default:
                drawCombat(ctx, frame);
        }
    }
    finally {
        ctx.restore();
    }
}
