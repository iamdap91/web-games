import { drawBear, drawHero } from './cast.js';
import { background2D, burst, clamp, ease, fistSmear, rand, } from './drawing.js';
import { comicCut } from './comic-cut.js';
import { inkCut } from './ink-cut.js';
import { orbitCut } from './orbit-cut.js';
function frozenDebris(context, time) {
    context.save();
    for (let index = 0; index < 23; index++) {
        const phase = time * (0.3 + rand(index + 45) * 0.5);
        const x = 170 + rand(index * 13 + 7) * 1000 + Math.sin(phase) * 25;
        const y = 170 + rand(index * 5 + 18) * 380 - Math.sin(phase) * 62;
        const size = 4 + rand(index + 66) * 10;
        context.translate(x, y);
        context.rotate(index + phase);
        context.fillStyle = index % 3 === 0 ? '#d8aa6c' : '#596b75';
        context.fillRect(-size / 2, -size / 2, size, size * 1.5);
        context.rotate(-index - phase);
        context.translate(-x, -y);
    }
    context.restore();
}
function drawWorld(context, frame, time) {
    background2D(context, time);
    frozenDebris(context, time);
    const resumed = frame.time >= 2.95;
    const recoil = clamp((frame.time - 2.95) / 0.38);
    drawBear(context, frame.assets, {
        x: 920 + ease(recoil) * 110,
        y: 610 - Math.sin(recoil * Math.PI) * 60,
        height: 640,
        state: resumed ? 'hit' : 'attack',
        phase: resumed ? recoil : Math.min(time / 0.85, 0.76),
    });
}
function drawRipple(context, image, radius) {
    if (radius <= 0)
        return;
    context.save();
    context.beginPath();
    context.arc(350, 400, radius + 12, 0, Math.PI * 2);
    context.arc(350, 400, Math.max(0, radius - 12), 0, Math.PI * 2, true);
    context.clip('evenodd');
    context.filter = 'invert(1) saturate(.55)';
    context.drawImage(image, 0, 0);
    context.restore();
    context.save();
    context.strokeStyle = 'rgba(221,249,255,.9)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(350, 400, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
}
const stops = [
    { x: 850, y: 410, angle: -0.75, rotation: 0, flip: false },
    { x: 960, y: 410, angle: -2.45, rotation: 0, flip: true },
    { x: 900, y: 360, angle: 0.52, rotation: 1.05, flip: false },
    { x: 960, y: 485, angle: -2.2, rotation: -0.38, flip: true },
    { x: 850, y: 475, angle: 0.18, rotation: 0.57, flip: false },
];
function drawTimeStop(context, frame) {
    // 재생기의 마지막 0.3초 정지 전에 착지와 다섯 잔광까지 모두 끝낸다.
    const time = Math.min(frame.time, 3.4);
    const heldFrame = { ...frame, time };
    const worldTime = time < 0.75 ? time : time < 2.95 ? 0.75 : time - 2.2;
    const world = frame.surfaces.get('stopped-world');
    drawWorld(world, heldFrame, worldTime);
    context.drawImage(world.canvas, 0, 0);
    const expanded = ease(clamp((time - 0.65) / 0.43));
    const contracted = ease(clamp((time - 2.69) / 0.26));
    const radius = expanded * (1 - contracted) * 1600;
    if (time >= 0.65 && time < 2.95) {
        context.save();
        context.beginPath();
        context.arc(350, 400, radius, 0, Math.PI * 2);
        context.clip();
        context.filter = 'grayscale(1) sepia(.35) hue-rotate(145deg) saturate(.65)';
        context.drawImage(world.canvas, 0, 0);
        context.fillStyle = 'rgba(86,117,133,.16)';
        context.fillRect(0, 0, 1280, 720);
        context.restore();
        drawRipple(context, world.canvas, radius);
    }
    const completed = Math.max(0, Math.min(5, Math.floor((time - 1.16) / 0.06) + 1));
    context.save();
    context.strokeStyle = '#ffdfa0';
    context.lineCap = 'round';
    context.globalAlpha = 1 - clamp((time - 2.95) / 0.22);
    for (let index = 0; index < completed; index++) {
        const stop = stops[index];
        const stroke = clamp((time - 1.16 - index * 0.06) / 0.055);
        const distance = 160 * stroke;
        context.shadowColor = '#fff4c9';
        context.shadowBlur = 12;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(stop.x - Math.cos(stop.angle) * 100, stop.y - Math.sin(stop.angle) * 100);
        context.lineTo(stop.x + Math.cos(stop.angle) * distance, stop.y + Math.sin(stop.angle) * distance);
        context.stroke();
    }
    context.restore();
    if (time < 1.16) {
        drawHero(context, frame.assets, {
            x: 345,
            y: 650,
            height: 375,
            action: 'idle',
            phase: Math.min(time, 0.75),
        });
    }
    else if (time < 1.49) {
        const index = Math.min(4, Math.floor((time - 1.16) / 0.06));
        const stop = stops[index];
        // 원본 5번의 바깥주먹과 발 앵커를 같은 배율로 옮겨 접촉 위치를 고정한다.
        const sprite = frame.assets.hero.uppercut['south-east'][5];
        const scale = 375 / 62;
        const bodyHeight = sprite.bounds
            ? sprite.bounds.bottom - sprite.bounds.top
            : sprite.image.naturalHeight;
        const handX = (stop.flip ? -1 : 1) * (66 - sprite.anchorX) * scale;
        const handY = (39 - sprite.feetY) * scale;
        const cosine = Math.cos(stop.rotation);
        const sine = Math.sin(stop.rotation);
        drawHero(context, frame.assets, {
            x: stop.x - (handX * cosine - handY * sine),
            y: stop.y - (handX * sine + handY * cosine),
            height: bodyHeight * scale,
            action: 'uppercut',
            phase: 0.76,
            flip: stop.flip,
            rotation: stop.rotation,
        });
        fistSmear(context, stop.x, stop.y, ((time - 1.16) % 0.06) / 0.06, stop.angle, 90);
    }
    else {
        drawHero(context, frame.assets, {
            x: 345,
            y: 650,
            height: 375,
            action: 'idle',
            phase: 0.8,
            facing: (-Math.PI * 3) / 4,
        });
    }
    if (time >= 2.95) {
        for (let index = 0; index < 5; index++) {
            const progress = (time - 2.95 - index * 0.03) / 0.3;
            if (progress >= 0)
                burst(context, stops[index].x, stops[index].y, progress, 100 + index * 13, index % 2 === 0 ? '#fff4bc' : '#baf5ff');
        }
    }
    context.save();
    context.strokeStyle = 'rgba(235,239,225,.4)';
    context.lineWidth = 1;
    for (let index = 0; index < 9; index++) {
        context.beginPath();
        context.arc(350, 400, 130 + index * 85 + radius * 0.03, -0.4, 0.5);
        if (time > 0.65 && time < 1.12)
            context.stroke();
    }
    context.restore();
    context.fillStyle = '#111b26';
    context.fillRect(0, 0, 1280, 26);
    context.fillRect(0, 694, 1280, 26);
}
export const flatCuts = [
    orbitCut,
    {
        id: 'time-stop',
        title: '시간 정지 · 다섯 타',
        kind: '2D',
        duration: 3.7,
        description: '곰왕 원본 위협에서 반전 파문이 세계만 멈춘다. 제 색의 아타호가 0.06초마다 다섯 자리를 옮기고, 등 돌린 정적 후 0.03초 간격으로 다섯 타가 터진다. 곰왕 착지와 잔광이 끝난 마지막 구도를 고정한다.',
        beats: [
            { time: 0, label: '곰왕 위협' },
            { time: 0.65, label: '반전 파문 · 세계 정지' },
            { time: 1.16, label: '0.06초씩 다섯 자리' },
            { time: 1.49, label: '등 돌린 정적' },
            { time: 2.69, label: '색 귀환' },
            { time: 2.95, label: '0.03초씩 지연 타격' },
            { time: 3.4, label: '착지 · 잔광 소거 · 정적' },
        ],
        draw: drawTimeStop,
    },
    inkCut,
    comicCut,
];
