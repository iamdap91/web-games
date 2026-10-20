import { drawBackgroundAnimation } from './motion-background.js';
import { burst, clamp, ellipse, label, line, mix, noise, palette, polygon, smooth, stage, windowed, } from './drawing.js';
import { atahoPosition, battleLayout, drawAtaho, drawBattle, drawBattleActors, drawBear, } from './battle.js';
import { drawAtahoBreakdown, drawAtahoFlutter, drawAtahoPerspective, } from './motion-deformation.js';
import { drawAnatomicalSquash } from './motion-resource.js';
export const motionSamples = [
    {
        id: 'smear-frame',
        name: '스미어 프레임',
        category: 'motion',
        previewMs: 1770,
        description: '상승에서 접촉으로 넘어가는 60ms 동안 실제 아타호의 실루엣을 동작 방향으로 길게 잇습니다.',
        distinction: '기존 PNG의 픽셀 행을 잠깐 늘린 연결 그림이며 별도 빛 궤적이나 새 픽셀 자세가 아닙니다.',
    },
    {
        id: 'obake',
        name: '오바케',
        category: 'motion',
        previewMs: 1760,
        description: '어퍼컷의 연결 구간 80ms에 실제 몸 외곽을 비대칭으로 흐트러뜨렸다 접촉 자세로 돌아옵니다.',
        distinction: '기존 몸 그림의 매우 짧은 변형 중간그림입니다. 독립 오라의 외곽 변형과 구별합니다.',
    },
    {
        id: 'background-animation',
        name: '배경 동화',
        category: 'motion',
        previewMs: 1050,
        description: '곰왕 방향 앞쪽에서 아타호와 같은 속도로 후퇴하며 낮은 사선으로 질주를 담습니다. 아타호는 크게 유지하고 기둥·돌바닥을 빠르게 흘린 뒤 타격 전에 두 캐릭터를 잡습니다.',
        distinction: '달리기와 배우·그림자·기둥을 같은 공간에 투영합니다. 기본 장면과 모션 감소는 같은 질주를 고정된 넓은 구도로 비교합니다.',
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
        description: '어퍼컷 한 번의 준비·통과 그림을 1~8코마씩 불규칙하게 노출해 타이밍을 흔듭니다.',
        distinction: '공격 횟수나 타격 간격이 아니라 한 동작 안에서 그림을 유지하는 코마 수의 대비입니다. 두 판 모두 1800ms에 한 번 맞습니다.',
    },
    {
        id: 'strobe',
        name: '스트로보',
        category: 'motion',
        previewMs: 1840,
        description: '수평 정권에 진입한 자세와 위치를 일정 시간 간격으로 남기고 제자리에서 감쇠합니다.',
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
        description: '지지점에 묶인 긴 천띠의 꼭짓점을 끝 쪽으로 밀어 보내는 과정을 빈 공간에서 보여 줍니다.',
        distinction: '뿌리는 고정하고 천의 구간마다 반응을 늦춥니다. 배우의 옷이나 몸을 새로 만들지 않는 독립 천띠 견본입니다.',
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
        description: '도약에서 관절을 펴고 착지에서 무릎과 골반을 접는 실제 몸 원화를 같은 발 기준으로 비교합니다.',
        distinction: '기존 조합실의 도약 폄·착지 눌림 그림을 재사용합니다. 전체 PNG를 늘이거나 머리를 납작하게 만들지 않는 원화 시안이며 사용자 GIF 품질 확인은 대기 중입니다.',
        beats: [
            { timeMs: 1080, label: '도약 · 실제 관절 폄 원화' },
            { timeMs: 1860, label: '착지 · 실제 무릎·골반 압축 원화' },
            { timeMs: 2140, label: '같은 발 위치에서 복귀' },
        ],
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
        description: '수평 정권 진입 뒤 긴 평행선과 몸 둘레를 흐르는 곡선을 그립니다.',
        distinction: '집중선처럼 한 점에 모이지 않고 이동 반대 방향과 둘레의 흐름을 보입니다.',
    },
];
const impact = battleLayout.impact;
function time(frame) {
    return Math.max(0, frame.timeMs);
}
function dashPosition(t, frame) {
    const contact = frame.assets.straight.steps.find((step) => step.contact).contact;
    const destination = battleLayout.impact.x - (contact.reach ?? 0) * battleLayout.attacker.scale;
    return mix(destination - 218, destination, smooth((t - 950) / 850));
}
function drawFight(ctx, frame, timeMs = frame.timeMs) {
    drawBattle(ctx, frame, { timeMs, action: 'uppercut' });
}
/** 원화의 노출만 바꾸고 접근 위치와 상대의 대기 시각은 현재 장면에 남긴다. */
function drawRetimedPreparation(ctx, frame, sourceTime) {
    if (sourceTime === frame.timeMs) {
        drawFight(ctx, frame);
        return;
    }
    stage(ctx, frame, 0);
    const position = atahoPosition(frame, { action: 'uppercut' });
    ellipse(ctx, position.x, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    drawAtaho(ctx, frame, {
        timeMs: sourceTime,
        x: position.x,
        action: 'uppercut',
    });
}
function drawDash(ctx, frame) {
    drawBear(ctx, frame);
    drawAtaho(ctx, frame, {
        x: dashPosition(time(frame), frame),
        action: 'straight',
    });
}
function drawBreakdownScene(ctx, frame, options) {
    const t = time(frame);
    const endMs = battleLayout.contactMs;
    const active = frame.enhanced && t >= options.startMs && t < endMs;
    if (!active) {
        drawFight(ctx, frame);
        return;
    }
    stage(ctx, frame, 0);
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
    drawBreakdownScene(ctx, frame, { kind: 'smear', startMs: 1740 });
}
function drawObake(ctx, frame) {
    drawBreakdownScene(ctx, frame, { kind: 'obake', startMs: 1720 });
}
function drawBackground(ctx, frame) {
    drawBackgroundAnimation(ctx, frame);
}
function drawNakanuki(ctx, frame) {
    const t = time(frame);
    const sourceTime = frame.enhanced && t >= 1100 && t < 1800 ? 1450 : t;
    drawRetimedPreparation(ctx, frame, sourceTime);
    if (frame.enhanced && t >= 1800 && t < 2090)
        burst(ctx, impact.x, impact.y, (t - 1800) / 290, palette.paper, 8);
}
// 24fps의 한 공격을 1~8코마씩 불규칙 노출한다. 연타 횟수의 차이가 아니다.
const irregularExposure = [
    { source: 1000, frames: 8 },
    { source: 1400, frames: 2 },
    { source: 1670, frames: 5 },
    { source: 1780, frames: 1 },
];
const irregularFrameCount = irregularExposure.reduce((total, exposure) => total + exposure.frames, 0);
const irregularStartMs = battleLayout.contactMs - (irregularFrameCount / 24) * 1000;
function irregularTime(t) {
    if (t < irregularStartMs || t >= battleLayout.contactMs)
        return t;
    let exposureEnd = irregularStartMs;
    for (const exposure of irregularExposure) {
        exposureEnd += (exposure.frames / 24) * 1000;
        if (t < exposureEnd)
            return exposure.source;
    }
    return irregularExposure[irregularExposure.length - 1].source;
}
function drawMidare(ctx, frame) {
    const t = time(frame);
    const sourceTime = frame.enhanced ? irregularTime(t) : t;
    drawRetimedPreparation(ctx, frame, sourceTime);
    let x = 210;
    for (const exposure of irregularExposure) {
        const span = (exposure.frames / irregularFrameCount) * 480;
        ctx.fillStyle = sourceTime === exposure.source ? palette.gold : '#c2c9d176';
        ctx.fillRect(x, 466, span - 3, 5);
        x += span;
    }
}
function drawStrobe(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame, frame.reducedMotion ? 0 : t);
    if (frame.enhanced) {
        const intervalMs = frame.reducedMotion ? 240 : 120;
        const lifetimeMs = frame.reducedMotion ? 360 : 850;
        // 잔상은 현재 시각을 따라 미끄러지지 않고 노출한 자세와 위치에서 사라진다.
        for (let capturedMs = 1100; capturedMs <= 2200; capturedMs += intervalMs) {
            const age = t - capturedMs;
            if (age <= 0 || age >= lifetimeMs)
                continue;
            drawAtaho(ctx, frame, {
                timeMs: capturedMs,
                x: dashPosition(capturedMs, frame),
                action: 'straight',
                opacity: (1 - age / lifetimeMs) * (frame.reducedMotion ? 0.19 : 0.55),
            });
        }
    }
    drawDash(ctx, frame);
}
function energyShape(ctx, points, opacity) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    const projected = points.map((p) => ({
        x: impact.x + p.x,
        y: impact.y + p.y,
    }));
    polygon(ctx, projected, palette.blue);
    if (projected[0])
        line(ctx, [...projected, projected[0]], palette.paper, 3);
    ctx.restore();
}
function drawMetamorphosis(ctx, frame) {
    const t = time(frame);
    drawFight(ctx, frame);
    const p = smooth((t - 1000) / 1550);
    const blob = Array.from({ length: 36 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 36;
        return { x: Math.cos(a) * 82, y: Math.sin(a) * 82 };
    });
    const crescent = blob.map((_, i) => {
        const outer = i < 18;
        const a = outer
            ? Math.PI / 2 + (i * Math.PI) / 17
            : Math.PI * 1.5 - ((i - 18) * Math.PI) / 17;
        return {
            x: (outer ? 0 : 42) + Math.cos(a) * (outer ? 116 : 74),
            y: Math.sin(a) * 116,
        };
    });
    const opacity = windowed(t, 800, 3000, 300) * (frame.reducedMotion ? 0.37 : 0.72);
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
    stage(ctx, frame, frame.reducedMotion ? 0 : t);
    const gesture = windowed(t, 650, 1000, 220);
    const travel = (t - 950) / 1750;
    line(ctx, [
        { x: 270, y: 105 },
        { x: 270, y: 440 },
    ], '#987e57', 4);
    ellipse(ctx, 270, 105, 5, 5, palette.gold);
    const upper = [], lower = [];
    for (let i = 0; i <= 36; i++) {
        const q = i / 36, local = q - travel;
        const delayed = t >= 850
            ? Math.sin(local * 18) * Math.exp((-local * local) / 0.035) * 86
            : 0;
        const offset = (frame.enhanced ? delayed : gesture * Math.sin(q * 2.3) * 55) *
            (frame.reducedMotion ? 0.5 : 1) *
            smooth(q / 0.16);
        const y = 115 + q * 10 + offset;
        const halfWidth = 15 * (1 - q * 0.7);
        upper.push({ x: 270 + q * 500, y: y - halfWidth });
        lower.push({ x: 270 + q * 500, y: y + halfWidth });
    }
    ctx.save();
    ctx.globalAlpha *= windowed(t, 650, 3000, 250) * 0.82;
    polygon(ctx, [...upper, ...lower.slice().reverse()], palette.blue);
    line(ctx, upper, '#d6f0fa', 3);
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
    stage(ctx, frame, 0);
    ellipse(ctx, position.x, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    drawAtahoFlutter(ctx, frame, { timeMs: sourceTime, x: position.x, strength });
}
function drawSquash(ctx, frame) {
    drawAnatomicalSquash(ctx, frame);
}
function drawKanada(ctx, frame) {
    const t = time(frame);
    const sourceTime = !frame.enhanced || t < 1100
        ? t
        : t < 1680
            ? 1450
            : t < 1760
                ? 1700
                : t < 1800
                    ? 1780
                    : t < 1980
                        ? 1800
                        : t < 2250
                            ? 1800 + (t - 1980) * 0.65
                            : 1975.5 + (t - 2250) * 1.3;
    if (t < battleLayout.contactMs)
        drawRetimedPreparation(ctx, frame, sourceTime);
    else
        drawFight(ctx, frame, sourceTime);
    if (frame.enhanced && t >= 1800 && t < 2300) {
        ctx.save();
        ctx.globalAlpha *=
            (1 - (t - 1800) / 500) * (frame.reducedMotion ? 0.2 : 0.65);
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
    stage(ctx, frame, 0);
    ellipse(ctx, position.x, 448, 58 * (1 - air * 0.45), 10 * (1 - air * 0.4), '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, frame);
    drawAtahoPerspective(ctx, frame);
}
function drawFocusLines(ctx, frame) {
    const t = time(frame);
    stage(ctx, frame, frame.reducedMotion ? 0 : t);
    const alpha = windowed(t, 900, 2900, 450);
    if (frame.enhanced && alpha > 0) {
        ctx.save();
        ctx.globalAlpha *= alpha * (frame.reducedMotion ? 0.3 : 0.86);
        const count = frame.reducedMotion ? 24 : 57;
        for (let i = 0; i < count; i++) {
            const a = (i * Math.PI * 2) / count + noise(i) * 0.025;
            const inner = 130 + noise(i + 7) * 90;
            const halfWidth = i % 4 ? 3 : 11;
            polygon(ctx, [
                {
                    x: impact.x + Math.cos(a) * inner,
                    y: impact.y + Math.sin(a) * inner * 0.87,
                },
                {
                    x: impact.x + Math.cos(a) * 1100 - Math.sin(a) * halfWidth,
                    y: impact.y + Math.sin(a) * 1100 + Math.cos(a) * halfWidth,
                },
                {
                    x: impact.x + Math.cos(a) * 1100 + Math.sin(a) * halfWidth,
                    y: impact.y + Math.sin(a) * 1100 - Math.cos(a) * halfWidth,
                },
            ], i % 3 ? palette.paper : palette.ink);
        }
        ctx.restore();
    }
    drawBattleActors(ctx, frame, { action: 'uppercut' });
}
function drawSpeed(ctx, frame) {
    const t = time(frame), speed = windowed(t, 900, 2450, 230), x = dashPosition(t, frame);
    stage(ctx, frame, frame.reducedMotion ? 0 : t);
    if (frame.enhanced && speed > 0) {
        ctx.save();
        ctx.globalAlpha *= speed * (frame.reducedMotion ? 0.25 : 0.86);
        for (let i = 0; i < (frame.reducedMotion ? 8 : 24); i++) {
            const y = 83 + i * (frame.reducedMotion ? 22 : 17), end = x - 110 - noise(i + 12) * 70;
            const offset = frame.reducedMotion ? 0 : (t * 0.35 + i * 53) % 145;
            line(ctx, [
                { x: -180 + offset, y },
                { x: end, y },
            ], i % 3 ? '#bbbdcc' : palette.blue, frame.reducedMotion ? (i % 3 ? 2 : 4) : i % 3 ? 3.5 : 7);
        }
        for (const side of [-1, 1])
            for (let i = 0; i < 3; i++) {
                const y = 300 + side * (93 + i * 20);
                ctx.beginPath();
                ctx.moveTo(x - 270, y);
                ctx.bezierCurveTo(x - 50, y + side * 13, x + 35, y - side * 55, x + 150, y - side * 19);
                ctx.strokeStyle = palette.blue;
                ctx.lineWidth = frame.reducedMotion ? 2 : 3.5;
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
                    ? '1740~1800ms · 실제 몸의 상승 방향 스미어'
                    : '같은 실제 어퍼컷과 피격');
                break;
            case 'obake':
                drawObake(ctx, frame);
                label(ctx, frame.enhanced
                    ? '1720~1800ms · 실제 몸의 비대칭 연결 그림'
                    : '같은 기존 어퍼컷의 연결 프레임');
                break;
            case 'background-animation':
                drawBackground(ctx, frame);
                label(ctx, frame.enhanced
                    ? '곰왕 방향의 사선 동행 카메라 · 크게 잡은 아타호와 빠른 배경'
                    : '같은 배우·같은 지면 · 고정 배경 구도');
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
                    ? '한 어퍼컷 · 서로 다른 원화의 8 / 2 / 5 / 1코마 노출 대비'
                    : '같은 한 어퍼컷 · 기본 연속 노출');
                break;
            case 'strobe':
                drawStrobe(ctx, frame);
                label(ctx, frame.enhanced
                    ? '120ms마다 남긴 정권 자세가 같은 위치에서 감쇠'
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
                    ? '뿌리는 고정 · 천띠의 물결 꼭짓점이 왼쪽에서 끝으로 전달'
                    : '같은 천띠 전체가 같은 박자로 반응');
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
                    ? '기존 전용 원화 · 도약 관절 폄 → 착지 무릎·골반 압축 · 품질 검토 시안'
                    : '같은 도약·착지 궤도 · 기존 점프 원본');
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
                    ? '수평 정권 진입 뒤 속도선·유선'
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
