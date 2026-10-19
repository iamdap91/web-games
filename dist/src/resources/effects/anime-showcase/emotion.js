import { drawBattle, drawAtaho, drawBear, sampleAtahoSprite, } from './battle.js';
import { drawEmotionPortrait, portraitEyes, } from './emotion-face.js';
import { burst, clamp, ellipse, line, noise, palette, polygon, smooth, stage, star, windowed, } from './drawing.js';
export const emotionSamples = [
    {
        id: 'emotion-sweat',
        name: '땀방울',
        category: 'emotion',
        previewMs: 1750,
        description: '머리 옆에 맺힌 큰 방울이 무게를 얻어 아래로 미끄러집니다.',
        distinction: '비나 실제 물보다 큰 한 방울로 당황을 읽힙니다.',
    },
    {
        id: 'emotion-vein',
        name: '핏대 (분노 마크)',
        category: 'emotion',
        previewMs: 1700,
        description: '관자놀이의 굽은 십자 획이 튀어나오며 분노가 치솟습니다.',
        distinction: '흩어지는 불꽃이 아니라 끊어진 네 모서리의 혈관 기호입니다.',
    },
    {
        id: 'emotion-gloom',
        name: '세로줄 그늘',
        category: 'emotion',
        previewMs: 1850,
        description: '이마 위에서 내려오는 선과 청보라 그늘이 얼굴의 온도를 낮춥니다.',
        distinction: '인물 주변의 위압 배경과 달리 얼굴 윗부분에 감정을 모읍니다.',
    },
    {
        id: 'emotion-soul',
        name: '혼 빠짐·한숨',
        category: 'emotion',
        previewMs: 2300,
        description: '입에서 흰 숨이 길게 빠져나와 혼 모양으로 느리게 떠오릅니다.',
        distinction: '폭발 연기보다 가늘고 느린 호흡과 빈 표정이 중심입니다.',
    },
    {
        id: 'emotion-face-fault',
        name: '즈코 넘어짐',
        category: 'emotion',
        previewMs: 3250,
        description: '어퍼컷을 버틴 곰왕이 허세를 부린 뒤 정적을 깨고 맥없이 주저앉습니다.',
        distinction: '허세→빈 박자→쓰러짐의 코믹한 엇박입니다. 얼굴부터 바닥에 꽂히는 새 자세는 추가하지 않습니다.',
    },
    {
        id: 'emotion-tears',
        name: '폭포 눈물',
        category: 'emotion',
        previewMs: 2100,
        description: '두 눈에서 쏟아진 눈물이 넓은 띠가 되어 흘러내립니다.',
        distinction: '글썽임이나 땀방울과 달리 끊기지 않는 두 줄기 과장입니다.',
    },
    {
        id: 'emotion-white-eyes',
        name: '흰자 눈',
        category: 'emotion',
        previewMs: 1750,
        description: '놀란 한순간에 눈동자가 사라지고 큰 흰 눈과 벌어진 입만 남습니다.',
        distinction: '화면 반전 효과가 아니라 눈 안의 그림 자체가 바뀝니다.',
    },
    {
        id: 'emotion-empty-eyes',
        name: '빛 없는 눈',
        category: 'emotion',
        previewMs: 1900,
        description: '눈의 흰 빛이 사라지고 낮은 명도의 눈동자로 감정이 가라앉습니다.',
        distinction: '흰자 눈의 과장된 충격과 반대로 표정의 생기를 덜어 냅니다.',
    },
    {
        id: 'emotion-eye-sparks',
        name: '시선 불꽃',
        category: 'emotion',
        previewMs: 750,
        description: '마주 본 두 인물 사이의 시선이 팽팽해지고 짧은 번개가 잇습니다.',
        distinction: '공격 투사체가 아니라 두 시선 사이의 긴장을 나타냅니다.',
    },
    {
        id: 'emotion-flowers',
        name: '꽃 배경',
        category: 'emotion',
        previewMs: 1900,
        description: '공간이 따뜻한 색으로 풀리며 큰 꽃이 순서대로 피어납니다.',
        distinction: '실제 들판의 꽃 대신 인물의 감정이 화면 전체의 배경을 바꿉니다.',
    },
    {
        id: 'emotion-sparkles',
        name: '반짝임',
        category: 'emotion',
        previewMs: 1900,
        description: '인물 둘레의 작은 별이 서로 다른 박자로 커졌다 사라집니다.',
        distinction: '광원의 긴 렌즈 플레어보다 작고 가벼운 감정의 반짝임입니다.',
    },
];
function drop(ctx, x, y, size) {
    polygon(ctx, [
        { x, y: y - size * 1.5 },
        { x: x + size * 0.8, y: y - size * 0.15 },
        { x: x + size * 0.6, y: y + size * 0.65 },
        { x: x - size * 0.5, y: y + size * 0.75 },
        { x: x - size * 0.8, y: y - size * 0.05 },
    ], palette.blue);
    ellipse(ctx, x - size * 0.22, y - size * 0.13, size * 0.14, size * 0.32, palette.paper);
}
function flower(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        ellipse(ctx, 0, -size * 0.55, size * 0.29, size * 0.55, '#eab1c4');
        ctx.restore();
    }
    ellipse(ctx, 0, 0, size * 0.22, size * 0.22, palette.gold);
    ctx.restore();
}
function eyeSparks(ctx, frame) {
    drawBattle(ctx, frame);
    if (!frame.enhanced || frame.timeMs >= 1100)
        return;
    const sprite = sampleAtahoSprite(frame);
    const from = {
        x: sprite.left + sprite.width * (46 / 96),
        y: sprite.top + sprite.height * (33 / 96),
    };
    const to = { x: 650 + (64 - 80) * 2.7, y: 440 - (135 - 38) * 2.7 };
    const p = windowed(frame.timeMs, 250, 850, 150);
    ctx.save();
    ctx.globalAlpha *= p;
    const key = Math.floor(frame.timeMs / (frame.reducedMotion ? 350 : 150));
    const points = Array.from({ length: 17 }, (_, i) => ({
        x: from.x + ((to.x - from.x) * i) / 16,
        y: from.y +
            ((to.y - from.y) * i) / 16 +
            Math.sin(i * 1.8 + key * 0.8) * (i === 0 || i === 16 ? 0 : 6),
    }));
    line(ctx, points, '#9d83c0', 8);
    line(ctx, points, palette.paper, 2);
    star(ctx, (from.x + to.x) / 2, (from.y + to.y) / 2, 13, palette.gold, 4);
    ctx.restore();
}
export function drawEmotion(ctx, id, frame) {
    ctx.save();
    try {
        const t = frame.timeMs;
        const p = frame.enhanced ? windowed(t, 500, 3400, 400) : 0;
        drawBattle(ctx, frame);
        if (id === 'emotion-face-fault') {
            if (frame.enhanced && t > 2050) {
                stage(ctx, 0);
                drawAtaho(ctx, frame, { timeMs: 2800 });
                if (t < 2750) {
                    drawBear(ctx, frame, { state: 'stand', timeMs: 0 });
                    ctx.fillStyle = palette.paper;
                    ctx.font = '700 25px sans-serif';
                    ctx.fillText(t < 2500 ? '이 정도쯤은…' : '…', 615, 110);
                }
                else {
                    drawBear(ctx, frame, { state: 'defeat', timeMs: 1800 + t - 2750 });
                    if (t < 3100)
                        burst(ctx, 650, 435, clamp((t - 2750) / 350), palette.paper, 5);
                }
            }
            return;
        }
        if (id === 'emotion-eye-sparks') {
            eyeSparks(ctx, frame);
            return;
        }
        if (id === 'emotion-flowers' && p) {
            ctx.fillStyle = `rgba(126,78,102,${p * 0.88})`;
            ctx.fillRect(0, 0, 960, 540);
            for (let i = 0; i < 13; i++) {
                const growth = smooth((t - 450 - i * 80) / 550) * (1 - smooth((t - 3400) / 400));
                flower(ctx, 70 + noise(i + 1) * 820, 70 + noise(i + 15) * 420, (40 + noise(i + 7) * 40) * growth, noise(i + 9) * 6.28);
            }
        }
        ctx.save();
        ctx.translate(-250, 0);
        let emotion = 'calm';
        if (p > 0.3) {
            if (id === 'emotion-white-eyes')
                emotion = 'white';
            if (id === 'emotion-empty-eyes')
                emotion = 'empty';
            if (id === 'emotion-vein')
                emotion = 'anger';
            if (id === 'emotion-soul' ||
                id === 'emotion-gloom' ||
                id === 'emotion-tears')
                emotion = 'sad';
            if (id === 'emotion-sweat')
                emotion = 'shock';
        }
        drawEmotionPortrait(ctx, frame, emotion, p);
        if (p <= 0) {
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.globalAlpha *= p;
        if (id === 'emotion-sweat') {
            const slip = smooth((t - 1250) / 1650);
            drop(ctx, 628 + slip * 12, 165 + slip * 145, 20 + smooth((t - 500) / 500) * 10);
        }
        else if (id === 'emotion-vein') {
            const pop = 1 + Math.sin(clamp((t - 500) / 600) * Math.PI) * 0.35;
            ctx.save();
            ctx.translate(603, 143);
            ctx.scale(pop, pop);
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((i * Math.PI) / 2);
                line(ctx, [
                    { x: -6, y: -25 },
                    { x: -6, y: -7 },
                    { x: -25, y: -7 },
                ], palette.red, 8);
                ctx.restore();
            }
            ctx.restore();
        }
        else if (id === 'emotion-gloom') {
            const shade = ctx.createLinearGradient(0, 135, 0, 285);
            shade.addColorStop(0, '#252445e8');
            shade.addColorStop(1, '#25244500');
            ctx.fillStyle = shade;
            ctx.beginPath();
            ctx.ellipse(480, 270, 135, 157, 0, Math.PI, Math.PI * 2);
            ctx.lineTo(615, 280);
            ctx.lineTo(345, 280);
            ctx.closePath();
            ctx.fill();
            for (let i = 0; i < 13; i++) {
                const y = 155 + (i % 3) * 13;
                line(ctx, [
                    { x: 365 + i * 19, y },
                    {
                        x: 365 + i * 19,
                        y: Math.min(280, y + smooth((t - 550 - i * 35) / 600) * (55 + noise(i) * 58)),
                    },
                ], '#303454', 3);
            }
        }
        else if (id === 'emotion-soul') {
            const drift = clamp((t - 650) / 2400);
            const x = 480 + drift * 155, y = 350 - drift * 185;
            ctx.save();
            ctx.globalAlpha *= Math.sin(drift * Math.PI) * 0.9;
            line(ctx, [
                { x: 480, y: 328 },
                { x: 510, y: 315 },
                { x: x - 25, y: y + 40 },
                { x, y },
            ], palette.paper, 9);
            ellipse(ctx, x, y, 27, 36, palette.paper);
            polygon(ctx, [
                { x: x - 21, y: y + 15 },
                { x: x + 18, y: y + 20 },
                { x: x + 35, y: y + 60 },
                { x: x + 4, y: y + 40 },
                { x: x - 21, y: y + 49 },
            ], palette.paper);
            ellipse(ctx, x - 9, y - 3, 3, 6, palette.ink);
            ellipse(ctx, x + 8, y - 3, 3, 6, palette.ink);
            ctx.restore();
        }
        else if (id === 'emotion-tears') {
            for (const eye of portraitEyes) {
                const { x, side: s } = eye;
                const origin = eye.y + 8;
                const length = smooth((t - 600) / 600) * 240;
                polygon(ctx, [
                    { x: x - 21, y: origin },
                    { x: x + 21, y: origin },
                    { x: x + 29 + s * 9, y: origin + length },
                    { x: x - 23 + s * 9, y: origin + length },
                ], palette.blue);
                for (let j = 0; j < 5; j++) {
                    if (length < 8)
                        continue;
                    const top = origin + 3 + ((t / 700 + j * 0.2) % 1) * (length - 6);
                    line(ctx, [
                        { x: x - 6, y: top },
                        { x: x - 6 + s * 4, y: Math.min(top + 22, origin + length) },
                    ], palette.paper, 3);
                }
                ellipse(ctx, x + s * 9, origin + length, 31, 6, '#81bdd577');
            }
        }
        else if (id === 'emotion-white-eyes') {
            if (t < 1450)
                burst(ctx, 480, 260, clamp((t - 500) / 950), palette.paper, 11);
        }
        else if (id === 'emotion-empty-eyes') {
            const shade = ctx.createLinearGradient(0, 120, 0, 280);
            shade.addColorStop(0, '#0b1426b0');
            shade.addColorStop(1, '#0b142600');
            ctx.fillStyle = shade;
            ctx.fillRect(365, 122, 230, 175);
        }
        else if (id === 'emotion-sparkles') {
            for (let i = 0; i < 12; i++) {
                const phase = (t / 1750 + noise(i)) % 1;
                const pulse = Math.sin(phase * Math.PI);
                const x = 120 + noise(i + 2) * 720, y = 90 + noise(i + 22) * 350;
                star(ctx, x, y, (7 + noise(i + 7) * 17) * pulse, palette.paper, 4, noise(i) * 0.4);
            }
        }
        ctx.restore();
        ctx.restore();
    }
    finally {
        ctx.restore();
    }
}
