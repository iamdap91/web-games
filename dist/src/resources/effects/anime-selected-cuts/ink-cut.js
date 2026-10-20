import { drawBear, drawHero } from './cast.js';
import { clamp, ease, gameBackground, rand } from './drawing.js';
import { gameInk } from '../../cutscenes/game-effects.js';
const inkStroke = { start: 1.46, duration: 0.2, contact: 0.7 };
const inkHitTime = inkStroke.start + inkStroke.duration * inkStroke.contact;
const inkHit = { x: 865, y: 365 };
function paper(context) {
    context.fillStyle = '#efe5cc';
    context.fillRect(0, 0, 1280, 720);
    context.save();
    context.lineWidth = 0.7;
    for (let index = 0; index < 480; index++) {
        const x = rand(index * 7 + 1) * 1280;
        const y = rand(index * 3 + 5) * 720;
        context.strokeStyle = index % 4 === 0 ? '#c8b99d' : '#ddd0b5';
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + rand(index + 34) * 28, y + rand(index + 48) * 4 - 2);
        context.stroke();
    }
    context.restore();
}
function inkLandscape(context, frame) {
    paper(context);
    const backdrop = frame.surfaces.get('ink-game-backdrop');
    gameBackground(backdrop, frame, 0.2);
    context.save();
    // 같은 게임 배경을 한지에 먹으로 인쇄해 색 귀환 전후의 공간을 연결한다.
    context.filter = 'grayscale(1) sepia(.55) contrast(1.5) brightness(1.2)';
    context.globalCompositeOperation = 'multiply';
    context.globalAlpha = 0.62;
    context.drawImage(backdrop.canvas, 0, 0);
    context.restore();
}
function inkActors(context, frame, ink) {
    const time = frame.time;
    const strike = clamp((time - inkStroke.start) / (inkHitTime - inkStroke.start));
    const recoil = ease(clamp((time - inkHitTime - 0.12) / 0.42));
    const sequence = frame.assets.hero.uppercut['south-east'];
    const contact = sequence[2];
    const scale = 6;
    // 2번 원화의 바깥 주먹과 발 앵커로 접촉을 맞추고 자세마다 배율을 유지한다.
    const heroX = inkHit.x - (62 - contact.anchorX) * scale;
    const heroY = inkHit.y - (34 - contact.feetY) * scale;
    const action = time < inkStroke.start ? 'idle' : 'uppercut';
    const index = time < inkHitTime
        ? Math.min(1, Math.floor(strike * 2))
        : time < inkHitTime + 0.12
            ? 2
            : Math.min(6, 3 + Math.floor(clamp((time - inkHitTime - 0.12) / 0.46) * 4));
    const sprite = action === 'idle'
        ? frame.assets.hero.idle['south-east'][0]
        : sequence[index];
    const bounds = sprite.bounds;
    const bodyHeight = (bounds?.bottom ?? sprite.image.naturalHeight) - (bounds?.top ?? 0);
    drawBear(context, frame.assets, {
        x: 940 + recoil * 78,
        y: 625 - Math.sin(recoil * Math.PI) * 38,
        height: 480,
        state: time >= inkHitTime ? 'hit' : 'stand',
        phase: time >= inkHitTime ? recoil * 0.95 : 0.4,
        filter: ink ? 'brightness(0) opacity(.86)' : 'none',
    });
    drawHero(context, frame.assets, {
        x: heroX - (1 - ease(strike)) * 315,
        y: heroY,
        height: bodyHeight * scale,
        action,
        phase: action === 'idle' ? 0 : (index + 0.1) / sequence.length,
        filter: ink ? 'brightness(0)' : 'none',
    });
}
function inkEdge(context, progress) {
    const radius = progress * 1700;
    context.fillStyle = '#111';
    context.beginPath();
    for (let index = 0; index <= 90; index++) {
        const angle = (index / 90) * Math.PI * 2;
        const reach = radius * (0.92 + rand(index + 21) * 0.14);
        const x = 350 + Math.cos(angle) * reach;
        const y = 390 + Math.sin(angle) * reach;
        if (index === 0)
            context.moveTo(x, y);
        else
            context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    for (let index = 0; index < 26; index++) {
        const angle = rand(index * 5 + 12) * Math.PI * 2;
        const reach = radius * (0.94 + rand(index * 3 + 17) * 0.2);
        context.beginPath();
        context.arc(350 + Math.cos(angle) * reach, 390 + Math.sin(angle) * reach, 3 + rand(index + 91) * 14, 0, Math.PI * 2);
        context.fill();
    }
}
function brushPoint(amount) {
    return {
        x: inkHit.x + (amount - inkStroke.contact) * 1040,
        y: inkHit.y -
            (amount - inkStroke.contact) * 378 +
            (Math.sin(amount * Math.PI) - Math.sin(inkStroke.contact * Math.PI)) * 15,
    };
}
function brushWidth(amount) {
    const press = 0.23 + Math.sin(Math.min(amount * 3.3, 1) * Math.PI * 0.5) * 0.77;
    const exit = Math.pow(1 - amount, 0.72);
    return (98 + Math.sin(amount * 25) * 12) * press * exit;
}
function brushBody(context, progress, scale, color) {
    context.fillStyle = color;
    context.beginPath();
    for (let side = 0; side < 2; side++) {
        for (let index = 0; index <= 90; index++) {
            const amount = side === 0 ? (index / 90) * progress : (1 - index / 90) * progress;
            const point = brushPoint(amount);
            const width = brushWidth(amount) * scale * (side === 0 ? 1 : -1);
            const x = point.x + width * 0.405;
            const y = point.y + width * 0.914;
            if (side === 0 && index === 0)
                context.moveTo(x, y);
            else
                context.lineTo(x, y);
        }
    }
    context.closePath();
    context.fill();
}
function brushStroke(context, frame, progress) {
    const brush = frame.surfaces.get('ink-brush');
    brushBody(brush, progress, 1.27, 'rgba(24,29,26,.15)');
    brushBody(brush, progress, 1.12, 'rgba(24,29,26,.28)');
    brushBody(brush, progress, 1, '#171d18');
    brushBody(brush, progress, 0.6, '#090e0b');
    // 종이의 흰색이 드러나는 비백을 붓이 나아가는 방향으로 낸다.
    brush.save();
    brush.globalCompositeOperation = 'destination-out';
    brush.lineCap = 'round';
    for (let index = 0; index < 46; index++) {
        const start = rand(index * 11 + 29) * 0.79;
        const end = Math.min(start + 0.09 + rand(index + 12) * 0.28, progress);
        if (end <= start)
            continue;
        const offset = (rand(index * 5 + 7) - 0.5) * 1.5;
        brush.lineWidth = 0.8 + rand(index + 13) * 2.8;
        brush.strokeStyle = `rgba(0,0,0,${0.45 + rand(index + 52) * 0.55})`;
        brush.beginPath();
        for (let pointIndex = 0; pointIndex <= 12; pointIndex++) {
            const amount = start + ((end - start) * pointIndex) / 12;
            const point = brushPoint(amount);
            const width = brushWidth(amount) * offset;
            const x = point.x + width * 0.405;
            const y = point.y + width * 0.914 + Math.sin(amount * 67 + index) * 1.2;
            if (pointIndex === 0)
                brush.moveTo(x, y);
            else
                brush.lineTo(x, y);
        }
        brush.stroke();
    }
    brush.restore();
    context.drawImage(brush.canvas, 0, 0);
    context.save();
    context.fillStyle = '#171d18';
    for (let index = 0; index < 41; index++) {
        const along = rand(index * 9 + 37);
        if (along > progress)
            continue;
        const point = brushPoint(along);
        const spread = (rand(index * 5 + 53) - 0.5) * 230;
        const size = 1 + Math.pow(rand(index + 93), 3) * 12;
        context.beginPath();
        context.ellipse(point.x + spread * 0.42, point.y + spread, size * 0.65, size * 1.8, -0.7, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
}
function redSeal(context) {
    context.save();
    context.translate(1055, 545);
    context.rotate(-0.06);
    context.strokeStyle = '#a23525';
    context.fillStyle = '#a23525';
    context.lineWidth = 5;
    context.strokeRect(-53, -53, 106, 106);
    context.lineWidth = 1.5;
    context.strokeRect(-45, -45, 90, 90);
    context.font = 'bold 77px serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('斬', 1, 7);
    context.restore();
}
function drawInk(context, frame) {
    const time = Math.min(frame.time, 3.2);
    const heldFrame = { ...frame, time };
    const color = frame.surfaces.get('ink-color-world');
    gameBackground(color, frame, 0.2 + clamp((time - 2.48) / 0.65) * 0.15);
    inkActors(color, heldFrame, false);
    context.drawImage(color.canvas, 0, 0);
    if (time > 0.17) {
        const ink = frame.surfaces.get('ink-world');
        inkLandscape(ink, heldFrame);
        inkActors(ink, heldFrame, true);
        if (time < 0.85) {
            const mask = frame.surfaces.get('ink-spread-mask');
            inkEdge(mask, ease(clamp((time - 0.17) / 0.68)));
            ink.save();
            ink.globalCompositeOperation = 'destination-in';
            ink.drawImage(mask.canvas, 0, 0);
            ink.restore();
        }
        context.drawImage(ink.canvas, 0, 0);
    }
    if (time > inkStroke.start) {
        const brush = clamp((time - inkStroke.start) / inkStroke.duration);
        brushStroke(context, frame, brush);
        const tip = brushPoint(brush);
        gameInk(context, frame.assets.effects, {
            sheet: 'stroke',
            x: tip.x,
            y: tip.y,
            progress: (time - inkStroke.start) / 0.32,
            size: 380,
            angle: Math.atan2(-378, 1040),
        });
    }
    if (time >= inkHitTime && time < inkHitTime + 0.18)
        gameInk(context, frame.assets.effects, {
            sheet: 'impact',
            x: inkHit.x,
            y: inkHit.y,
            progress: (time - inkHitTime) / 0.18,
            size: 230,
            angle: Math.atan2(-378, 1040),
        });
    if (time > 2.48) {
        const returnPlate = frame.surfaces.get('ink-color-return');
        returnPlate.drawImage(color.canvas, 0, 0);
        returnPlate.save();
        returnPlate.globalCompositeOperation = 'destination-in';
        returnPlate.lineCap = 'round';
        returnPlate.lineWidth = 12 + ease(clamp((time - 2.48) / 0.65)) * 2050;
        returnPlate.strokeStyle = '#111';
        returnPlate.beginPath();
        const start = brushPoint(0);
        const end = brushPoint(1);
        returnPlate.moveTo(start.x, start.y);
        returnPlate.lineTo(end.x, end.y);
        returnPlate.stroke();
        returnPlate.restore();
        context.drawImage(returnPlate.canvas, 0, 0);
    }
    if (time > 1.94)
        redSeal(context);
    context.save();
    context.strokeStyle = '#171d18';
    context.lineWidth = 15;
    context.strokeRect(5, 5, 1270, 710);
    context.restore();
}
export const inkCut = {
    id: 'ink-one-stroke',
    title: '수묵 일필 · 한 획',
    kind: '2D',
    duration: 3.5,
    description: '기존 게임 배경을 한지에 먹빛으로 인쇄하고 원본 인물 실루엣을 겹친다. 정적 뒤 0.2초의 권격을 기존 먹 획·충격 원본과 46가닥 비백으로 잇고, 주먹과 획이 닿는 한순간에 곰왕이 반응한다. 낙관 뒤에는 같은 공간의 색과 타격 여운을 되돌린다.',
    beats: [
        { time: 0.17, label: '먹이 번져 한지 세계로' },
        { time: 0.85, label: '먹 실루엣의 정적' },
        { time: 1.46, label: '0.2초의 붓 한 획' },
        { time: inkHitTime, label: '주먹·획의 접촉 · 피격' },
        { time: 1.94, label: '낙관 斬' },
        { time: 2.48, label: '획에서 색 귀환 · 여운' },
    ],
    draw: drawInk,
};
