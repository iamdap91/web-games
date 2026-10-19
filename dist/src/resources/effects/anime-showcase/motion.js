import { burst, clamp, ellipse, label, line, mix, noise, palette, polygon, ring, smooth, stage, windowed, } from './drawing.js';
import { atahoPosition, battleLayout, drawAtaho, drawBattle, drawBattleActors, drawBear, } from './battle.js';
import { drawAtahoBreakdown, drawAtahoFlutter, drawAtahoPerspective, } from './motion-deformation.js';
import { height, width, } from './types.js';
export const motionSamples = [
    {
        id: 'smear-frame',
        name: '스미어 프레임',
        category: 'motion',
        previewMs: 1780,
        description: '상승에서 접촉으로 넘어가는 40ms 동안 실제 아타호의 실루엣을 동작 방향으로 길게 잇습니다.',
        distinction: '기존 PNG의 픽셀 행을 잠깐 늘린 연결 그림이며 별도 빛 궤적이나 새 픽셀 자세가 아닙니다.',
    },
    {
        id: 'obake',
        name: '오바케',
        category: 'motion',
        previewMs: 1773,
        description: '어퍼컷의 연결 구간 55ms에 실제 몸 외곽을 비대칭으로 흐트러뜨렸다 접촉 자세로 돌아옵니다.',
        distinction: '기존 몸 그림의 매우 짧은 변형 중간그림입니다. 독립 오라의 외곽 변형과 구별합니다.',
    },
    {
        id: 'background-animation',
        name: '배경 동화',
        category: 'motion',
        previewMs: 2050,
        description: '같은 아타호와 곰왕 뒤 회랑의 벽·바닥 원근을 다시 그립니다.',
        distinction: '배우 PNG는 같은 비율로 유지하고 배경 형태와 깊이만 변합니다.',
    },
    {
        id: 'nakanuki',
        name: '나카누키',
        category: 'motion',
        previewMs: 1650,
        description: '실제 어퍼컷의 준비와 접촉은 남기고 사이 프레임을 생략합니다.',
        distinction: 'PNG를 변형하거나 새 포즈를 만들지 않고 기존 원화의 노출 순서만 조정합니다.',
    },
    {
        id: 'midareuchi',
        name: '미다레우치',
        category: 'motion',
        previewMs: 1230,
        description: '실제 어퍼컷과 곰왕 피격을 고정된 불규칙 박자의 다섯 타로 잇습니다.',
        distinction: '두 판 모두 다섯 타이며 짧은 두 타와 긴 쉼의 배열만 다릅니다.',
    },
    {
        id: 'strobe',
        name: '스트로보',
        category: 'motion',
        previewMs: 1840,
        description: '어퍼컷에 진입한 실제 과거 프레임을 일정 시간 간격으로 남깁니다.',
        distinction: '원본 비율의 여러 과거 자세이며 늘린 몸이나 새 도형 배우가 아닙니다.',
    },
    {
        id: 'motion-metamorphosis',
        name: '메타모르포제',
        category: 'motion',
        previewMs: 1750,
        description: '아타호의 타격 빛이 둥근 덩어리에서 초승달 외곽으로 연속 변형합니다.',
        distinction: '캐릭터의 변신이 아니라 독립 기공 효과입니다. 두 그림의 페이드와 실제 외곽 이동을 비교합니다.',
    },
    {
        id: 'wave-propagation',
        name: '물결 보내기',
        category: 'motion',
        previewMs: 1900,
        description: '어퍼컷의 손 쪽에서 독립 기맥 띠의 끝까지 한 물결을 보냅니다.',
        distinction: '배우의 옷을 새로 만들거나 변형하지 않고 보조 띠의 구간마다 반응을 늦춥니다.',
    },
    {
        id: 'araki-flutter',
        name: '아라키 휘날림',
        category: 'motion',
        previewMs: 1250,
        description: '실제 준비 원본의 머리 위 털·꼬리 털·옷 가장자리가 서로 다른 위상으로 반복 나부낍니다.',
        distinction: '얼굴과 몸 중심을 고정하고 기존 픽셀 영역만 움직이는 제한 시안입니다. 원작 작화의 복제나 새 망토가 아닙니다.',
    },
    {
        id: 'squash-stretch',
        name: '스쿼시 앤 스트레치',
        category: 'motion',
        previewMs: 1980,
        description: '접촉의 기공 덩어리가 길어졌다 눌린 뒤 탄성 있게 복원됩니다.',
        distinction: '전용 변형 몸 원화가 없어 캐릭터 PNG는 보존합니다. 폭과 높이의 반대 변화는 독립 효과에만 적용합니다.',
    },
    {
        id: 'kanada-motion',
        name: '카나다계 동작',
        category: 'motion',
        previewMs: 1720,
        description: '실제 어퍼컷의 준비·통과·접촉 원화를 선명하게 끊어 노출합니다.',
        distinction: '새로운 각진 관절 원화는 없습니다. 기존 원화 대비와 노출 박자를 참고한 시안이며 작가 원전의 복제가 아닙니다.',
    },
    {
        id: 'kanada-perspective',
        name: '카나다 파스',
        category: 'motion',
        previewMs: 1820,
        description: '기존 킥 B의 발 쪽은 가깝게, 몸통 쪽은 멀게 투영해 부분마다 다른 원근 배율을 만듭니다.',
        distinction: '전체 균등 확대를 없앤 기존 원화의 투영 견본입니다. 별도 발앞 자세·새 관절 그림을 만들지 않으며 전용 원화의 대체는 아닙니다.',
    },
    {
        id: 'focus-lines',
        name: '집중선',
        category: 'motion',
        previewMs: 1900,
        description: '아타호와 곰왕의 실제 접촉 공간으로 배경 선들을 모읍니다.',
        distinction: '원본 PNG와 타점은 유지하며 한 점으로 수렴하는 배경선만 더합니다.',
    },
    {
        id: 'speed-streamlines',
        name: '속도선·유선',
        category: 'motion',
        previewMs: 1800,
        description: '실제 어퍼컷 진입 뒤 긴 평행선과 몸 둘레를 흐르는 곡선을 그립니다.',
        distinction: '집중선처럼 한 점에 모이지 않고 이동 반대 방향과 둘레의 흐름을 보입니다.',
    },
];
const impact = battleLayout.impact;
function time(frame) {
    return Math.max(0, frame.timeMs);
}
function dashPosition(t) {
    return mix(330, battleLayout.attacker.x, smooth((t - 950) / 850));
}
function drawFight(ctx, frame, timeMs = frame.timeMs) {
    drawBattle(ctx, frame, { timeMs, action: 'uppercut' });
}
function drawDash(ctx, frame) {
    drawBear(ctx, frame);
    drawAtaho(ctx, frame, { x: dashPosition(time(frame)), action: 'uppercut' });
}
function drawBreakdownScene(ctx, frame, options) {
    const t = time(frame);
    const endMs = battleLayout.contactMs;
    const active = frame.enhanced && t >= options.startMs && t < endMs;
    if (!active) {
        drawFight(ctx, frame);
        return;
    }
    stage(ctx, 0);
    ellipse(ctx, battleLayout.attacker.x, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    const p = (t - options.startMs) / (endMs - options.startMs);
    drawAtahoBreakdown(ctx, frame, {
        kind: options.kind,
        strength: Math.sin(p * Math.PI),
    });
}
function drawSmear(ctx, frame) {
    drawBreakdownScene(ctx, frame, { kind: 'smear', startMs: 1760 });
}
function drawObake(ctx, frame) {
    drawBreakdownScene(ctx, frame, { kind: 'obake', startMs: 1745 });
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
    drawCorridor(ctx, frame.enhanced && frame.reducedMotion ? 2050 : time(frame), frame.enhanced);
    drawBattleActors(ctx, frame, { action: 'uppercut' });
}
function drawNakanuki(ctx, frame) {
    const t = time(frame);
    const sourceTime = frame.enhanced && t >= 1100 && t < 1800 ? (t < 1490 ? 1100 : 1480) : t;
    drawFight(ctx, frame, sourceTime);
    if (t >= 1800 && t < 2090)
        burst(ctx, impact.x, impact.y, (t - 1800) / 290, palette.paper, 8);
}
function drawMidare(ctx, frame) {
    const t = time(frame);
    const hits = frame.enhanced
        ? [1020, 1240, 1910, 2100, 2880]
        : [1020, 1485, 1950, 2415, 2880];
    const nearest = hits.reduce((best, hit) => (Math.abs(t - hit) < Math.abs(t - best) ? hit : best), hits[0]);
    const age = t - nearest;
    const sourceTime = age < -180 || age > 280 ? 0 : 1800 + age * (age < 0 ? 3.4 : 3);
    drawFight(ctx, frame, sourceTime);
    for (const hit of hits) {
        if (t >= hit && t < hit + 170)
            burst(ctx, impact.x, impact.y, (t - hit) / 170, palette.paper, 6);
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
    if (frame.enhanced && t >= 1100 && t <= 2600) {
        for (const delay of frame.reducedMotion
            ? [240, 120]
            : [480, 360, 240, 120]) {
            const past = t - delay;
            if (past < 950 || past > 2200)
                continue;
            drawAtaho(ctx, frame, {
                timeMs: past,
                x: dashPosition(past),
                action: 'uppercut',
                opacity: (1 - delay / 700) * (frame.reducedMotion ? 0.19 : 0.42),
            });
        }
    }
    drawDash(ctx, frame);
}
function energyShape(ctx, points, opacity) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    polygon(ctx, points.map((p) => ({ x: impact.x + p.x, y: impact.y + p.y })), palette.blue);
    ctx.restore();
}
function drawMetamorphosis(ctx, frame) {
    const t = time(frame);
    drawFight(ctx, frame);
    const p = smooth((t - 1000) / 1550);
    const blob = Array.from({ length: 36 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 36;
        return { x: Math.cos(a) * 74, y: Math.sin(a) * 74 };
    });
    const crescent = blob.map((_, i) => {
        const outer = i < 18;
        const a = outer
            ? Math.PI / 2 + (i * Math.PI) / 17
            : Math.PI * 1.5 - ((i - 18) * Math.PI) / 17;
        return {
            x: (outer ? 0 : 34) + Math.cos(a) * (outer ? 94 : 60),
            y: Math.sin(a) * 94,
        };
    });
    const opacity = windowed(t, 800, 3000, 300) * (frame.reducedMotion ? 0.37 : 0.6);
    if (frame.enhanced)
        energyShape(ctx, blob.map((start, i) => ({
            x: mix(start.x, crescent[i].x, p),
            y: mix(start.y, crescent[i].y, p),
        })), opacity);
    else {
        energyShape(ctx, blob, opacity * (1 - p));
        energyShape(ctx, crescent, opacity * p);
    }
}
function drawWave(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame.reducedMotion ? 0 : t);
    const gesture = windowed(t, 650, 1000, 220);
    const travel = (t - 950) / 1750;
    const upper = [], lower = [];
    for (let i = 0; i <= 36; i++) {
        const q = i / 36, local = q - travel;
        const delayed = t >= 850
            ? Math.sin(local * 18) * Math.exp((-local * local) / 0.035) * 63
            : 0;
        const offset = (frame.enhanced ? delayed : gesture * Math.sin(q * 2.3) * 55) *
            (frame.reducedMotion ? 0.5 : 1);
        const y = impact.y + 17 + q * 26 + offset;
        upper.push({ x: impact.x - 20 + q * 310, y: y - 11 });
        lower.push({ x: impact.x - 20 + q * 310, y: y + 11 });
    }
    ctx.save();
    ctx.globalAlpha *= windowed(t, 650, 3000, 250) * 0.6;
    polygon(ctx, [...upper, ...lower.slice().reverse()], palette.blue);
    line(ctx, upper, '#bfdfec', 2);
    for (let i = 0; i < upper.length; i += 6)
        line(ctx, [upper[i], lower[i]], '#497caa', 2);
    ctx.restore();
    drawBattleActors(ctx, frame, { action: 'uppercut' });
}
function drawAraki(ctx, frame) {
    const t = time(frame);
    const sourceTime = t >= 650 && t < 1650 ? 1600 : t;
    const strength = frame.enhanced ? windowed(t, 650, 1650, 150) : 0;
    const position = atahoPosition(frame, { action: 'uppercut' });
    stage(ctx, 0);
    ellipse(ctx, position.x, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    drawAtahoFlutter(ctx, frame, { timeMs: sourceTime, x: position.x, strength });
}
function drawSquash(ctx, frame) {
    const t = time(frame);
    drawFight(ctx, frame);
    let stretch = 1;
    if (frame.enhanced) {
        stretch =
            1 +
                windowed(t, 1450, 1740, 140) * 0.44 -
                windowed(t, 1800, 2140, 100) * 0.45 +
                windowed(t, 2130, 2420, 110) * 0.17;
        if (frame.reducedMotion)
            stretch = mix(1, stretch, 0.45);
    }
    ctx.save();
    ctx.globalAlpha *= windowed(t, 1400, 2700, 180) * 0.6;
    ellipse(ctx, impact.x, impact.y, 38 / stretch, 38 * stretch, palette.paper);
    ring(ctx, impact.x, impact.y, 47 / stretch, 47 * stretch, palette.gold, 2);
    ctx.restore();
}
function drawKanada(ctx, frame) {
    const t = time(frame);
    const sourceTime = !frame.enhanced || t < 1050
        ? t
        : t < 1650
            ? 1100
            : t < 1800
                ? 1550
                : t < 2250
                    ? 1800 + (t - 1800) * 0.45
                    : 2002.5 + (t - 2250) * 1.3;
    drawFight(ctx, frame, sourceTime);
    if (frame.enhanced && t >= 1800 && t < 2300) {
        ctx.save();
        ctx.globalAlpha *=
            (1 - (t - 1800) / 500) * (frame.reducedMotion ? 0.2 : 0.45);
        polygon(ctx, [
            { x: impact.x - 148, y: impact.y + 170 },
            { x: impact.x - 8, y: impact.y + 72 },
            { x: impact.x - 63, y: impact.y + 103 },
            { x: impact.x + 160, y: impact.y + 12 },
            { x: impact.x + 37, y: impact.y + 107 },
            { x: impact.x + 88, y: impact.y + 81 },
        ], palette.paper);
        ctx.restore();
    }
}
function drawPerspective(ctx, frame) {
    if (!frame.enhanced) {
        drawBattle(ctx, frame, { action: 'kick' });
        return;
    }
    const position = atahoPosition(frame, { action: 'kick' });
    const air = clamp((battleLayout.attacker.ground - position.ground) / 180);
    stage(ctx, 0);
    ellipse(ctx, position.x, 448, 58 * (1 - air * 0.45), 10 * (1 - air * 0.4), '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    drawAtahoPerspective(ctx, frame);
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
                {
                    x: impact.x + Math.cos(a) * inner,
                    y: impact.y + Math.sin(a) * inner * 0.87,
                },
                {
                    x: impact.x + Math.cos(a) * 1100,
                    y: impact.y + Math.sin(a) * 1100,
                },
            ], i % 3 ? palette.paper : palette.ink, i % 4 ? 1.4 : 4);
        }
        ctx.restore();
    }
    drawBattleActors(ctx, frame, { action: 'uppercut' });
}
function drawSpeed(ctx, frame) {
    const t = time(frame), speed = windowed(t, 900, 2450, 230), x = dashPosition(t);
    stage(ctx, frame.reducedMotion ? 0 : t);
    if (frame.enhanced && speed > 0) {
        ctx.save();
        ctx.globalAlpha *= speed * (frame.reducedMotion ? 0.25 : 0.65);
        for (let i = 0; i < (frame.reducedMotion ? 8 : 18); i++) {
            const y = 83 + i * 22, end = x - 110 - noise(i + 12) * 70;
            const offset = frame.reducedMotion ? 0 : (t * 0.35 + i * 53) % 145;
            line(ctx, [
                { x: -180 + offset, y },
                { x: end, y },
            ], i % 3 ? '#bbbdcc' : palette.blue, i % 3 ? 2 : 4);
        }
        for (const side of [-1, 1])
            for (let i = 0; i < 3; i++) {
                const y = 300 + side * (93 + i * 20);
                ctx.beginPath();
                ctx.moveTo(x - 270, y);
                ctx.bezierCurveTo(x - 50, y + side * 13, x + 35, y - side * 55, x + 150, y - side * 19);
                ctx.strokeStyle = palette.blue;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        ctx.restore();
    }
    drawDash(ctx, frame);
}
export function drawMotion(ctx, id, frame) {
    ctx.save();
    try {
        switch (id) {
            case 'smear-frame':
                drawSmear(ctx, frame);
                label(ctx, frame.enhanced
                    ? '1760~1800ms · 실제 몸의 상승 방향 스미어'
                    : '같은 실제 어퍼컷과 피격');
                break;
            case 'obake':
                drawObake(ctx, frame);
                label(ctx, frame.enhanced
                    ? '1745~1800ms · 실제 몸의 비대칭 연결 그림'
                    : '같은 기존 어퍼컷의 연결 프레임');
                break;
            case 'background-animation':
                drawBackground(ctx, frame);
                label(ctx, frame.enhanced
                    ? '원본 배우 뒤 회랑의 벽·바닥 원근 변화'
                    : '같은 실제 배우와 고정 회랑');
                break;
            case 'nakanuki':
                drawNakanuki(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 장전·접촉은 남기고 연결 프레임 생략'
                    : '같은 실제 어퍼컷의 연속 노출');
                break;
            case 'midareuchi':
                drawMidare(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 어퍼컷 다섯 타 / 고정 불규칙 박자'
                    : '같은 다섯 타 / 일정한 간격');
                break;
            case 'strobe':
                drawStrobe(ctx, frame);
                label(ctx, frame.enhanced
                    ? '120ms 간격의 실제 과거 프레임'
                    : '현재 실제 프레임만 표시');
                break;
            case 'motion-metamorphosis':
                drawMetamorphosis(ctx, frame);
                label(ctx, frame.enhanced
                    ? '기공 외곽의 연속 변형 / 캐릭터 변신 아님'
                    : '같은 기공 두 형태의 교차 페이드');
                break;
            case 'wave-propagation':
                drawWave(ctx, frame);
                label(ctx, frame.enhanced
                    ? '손 쪽 → 기맥 띠 가운데 → 끝으로 물결 전달'
                    : '보조 기맥 띠 전체가 같은 박자로 반응');
                break;
            case 'araki-flutter':
                drawAraki(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 머리털·꼬리털·옷 가장자리의 반복 나부낌'
                    : '같은 준비 자세와 접촉 시각 / 털·옷 고정');
                break;
            case 'squash-stretch':
                drawSquash(ctx, frame);
                label(ctx, frame.enhanced
                    ? '기공 덩어리만 연신·압축·복원 / 몸 원본 유지'
                    : '같은 접촉의 둥근 기공 덩어리');
                break;
            case 'kanada-motion':
                drawKanada(ctx, frame);
                label(ctx, frame.enhanced
                    ? '기존 준비 / 통과 / 접촉 원화의 노출 대비'
                    : '같은 실제 원화의 기본 재생');
                break;
            case 'kanada-perspective':
                drawPerspective(ctx, frame);
                label(ctx, frame.enhanced
                    ? '기존 킥 B · 가까운 발과 먼 몸통의 다른 투영 배율'
                    : '같은 실제 사선킥 기본 구도');
                break;
            case 'focus-lines':
                drawFocusLines(ctx, frame);
                label(ctx, frame.enhanced
                    ? '실제 접촉 공간을 비우고 한 점으로 수렴'
                    : '같은 어퍼컷과 곰왕 피격');
                break;
            case 'speed-streamlines':
                drawSpeed(ctx, frame);
                label(ctx, frame.enhanced
                    ? '원본 어퍼컷 진입 뒤 속도선·유선'
                    : '같은 실제 원화의 진입과 접촉');
                break;
            default:
                drawFight(ctx, frame);
        }
    }
    finally {
        ctx.restore();
    }
}
