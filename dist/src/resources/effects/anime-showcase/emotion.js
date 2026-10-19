import { actor, burst, clamp, ellipse, face, line, noise, palette, polygon, smooth, stage, star, windowed, } from './drawing.js';
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
        previewMs: 1800,
        description: '잠깐의 정적 뒤 전신이 옆으로 무너지는 큰 리액션입니다.',
        distinction: '맞고 날아가는 낙하와 달리 어이없는 순간의 갑작스러운 균형 상실입니다.',
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
        previewMs: 2000,
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
    face(ctx, 250, 285, 0.8, frame.enhanced ? 'anger' : 'calm');
    ctx.save();
    ctx.translate(710, 0);
    ctx.scale(-1, 1);
    face(ctx, 0, 285, 0.8, frame.enhanced ? 'anger' : 'calm');
    ctx.restore();
    if (!frame.enhanced)
        return;
    const p = windowed(frame.timeMs, 650, 3450, 500);
    ctx.save();
    ctx.globalAlpha *= p;
    const key = Math.floor(frame.timeMs / (frame.reducedMotion ? 350 : 150));
    const pts = Array.from({ length: 17 }, (_, i) => ({
        x: 282 + i * 24.75,
        y: 282 + Math.sin(i * 1.8 + key * 0.8) * (i === 0 || i === 16 ? 0 : 13),
    }));
    line(ctx, pts, '#9d83c0', 11);
    line(ctx, pts, palette.paper, 3);
    star(ctx, 480, 282, 18, palette.gold, 4);
    ctx.restore();
}
export function drawEmotion(ctx, id, frame) {
    ctx.save();
    try {
        const t = frame.timeMs;
        const p = frame.enhanced ? windowed(t, 500, 3400, 400) : 0;
        stage(ctx, 0);
        if (id === 'emotion-face-fault') {
            actor(ctx, 470, 430, 1.5);
            if (frame.enhanced) {
                stage(ctx, 0);
                const fall = smooth((t - 1300) / 240) * (1 - smooth((t - 3200) / 500));
                ctx.save();
                ctx.translate(470 + fall * 80, 430);
                ctx.rotate(fall * (frame.reducedMotion ? 0.7 : 1.45));
                actor(ctx, 0, 0, 1.5, { arm: fall, crouch: fall * 0.25 });
                ctx.restore();
                if (t > 1400 && t < 2200)
                    burst(ctx, 580, 426, (t - 1400) / 800, palette.paper, 7);
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
        face(ctx, 480, 270, 1.35, emotion);
        if (p <= 0)
            return;
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
                { x: 480, y: 342 },
                { x: 510, y: 327 },
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
            for (const s of [-1, 1]) {
                const x = 480 + s * 51;
                const length = smooth((t - 600) / 600) * 240;
                polygon(ctx, [
                    { x: x - 21, y: 273 },
                    { x: x + 21, y: 273 },
                    { x: x + 29 + s * 9, y: 273 + length },
                    { x: x - 23 + s * 9, y: 273 + length },
                ], palette.blue);
                for (let j = 0; j < 5; j++) {
                    if (length < 8)
                        continue;
                    const top = 276 + ((t / 700 + j * 0.2) % 1) * (length - 6);
                    line(ctx, [
                        { x: x - 6, y: top },
                        { x: x - 6 + s * 4, y: Math.min(top + 22, 270 + length) },
                    ], palette.paper, 3);
                }
                ellipse(ctx, x + s * 9, 273 + length, 31, 6, '#81bdd577');
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
    }
    finally {
        ctx.restore();
    }
}
