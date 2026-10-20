import { drawBear, drawHero } from './cast.js';
import { burst, clamp, line, rand, sky, smooth } from './drawing.js';
const contactTime = 2.7;
const heroHeight = 365;
/** 평면 레이어를 깊이에 따라 이동한다. 인물의 가로 폭을 줄여 회전을 대신하지 않는다. */
function groundPoint(x, z, view) {
    const cosine = Math.cos(view.angle);
    const sine = Math.sin(view.angle);
    const depth = 10 + x * sine + z * cosine;
    const scale = 10 / Math.max(1.5, depth);
    return {
        x: 640 + (x * cosine - z * sine) * 100 * scale,
        y: 200 + 400 * scale,
        scale,
        depth,
    };
}
function ground(ctx, view) {
    const gradient = ctx.createLinearGradient(0, 200, 0, 720);
    gradient.addColorStop(0, '#718b86');
    gradient.addColorStop(1, '#3c5957');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 200, 1280, 520);
    for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
            const corners = [
                groundPoint(x, z, view),
                groundPoint(x + 1, z, view),
                groundPoint(x + 1, z + 1, view),
                groundPoint(x, z + 1, view),
            ];
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (const p of corners.slice(1))
                ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fillStyle = (x + z) % 2 ? '#55726c' : '#617d73';
            ctx.fill();
            ctx.strokeStyle = '#2b4e4a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    const ring = Array.from({ length: 65 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        const p = groundPoint(Math.cos(angle) * 2.65, Math.sin(angle) * 2.65, view);
        return [p.x, p.y];
    });
    line(ctx, ring, '#aac0a080', 3);
}
function farBackdrop(ctx, progress) {
    sky(ctx, 0);
    for (let i = -2; i < 12; i++) {
        const x = i * 160 - progress * 160;
        ctx.fillStyle = i % 2 ? '#6f8b8d' : '#58777e';
        ctx.beginPath();
        ctx.moveTo(x - 70, 330);
        ctx.lineTo(x + 35, 80 + rand(i + 11) * 95);
        ctx.lineTo(x + 150, 330);
        ctx.closePath();
        ctx.fill();
    }
}
function pillar(ctx, point) {
    const w = 34 * point.scale;
    const h = 410 * point.scale;
    ctx.fillStyle = '#3f6263';
    ctx.fillRect(point.x - w / 2, point.y - h, w, h);
    ctx.fillStyle = '#97b0a1';
    ctx.fillRect(point.x - w / 2, point.y - h, w * 0.25, h);
    ctx.fillRect(point.x - w, point.y - h - 13 * point.scale, w * 2, 13 * point.scale);
    ctx.fillRect(point.x - w * 0.85, point.y - 15 * point.scale, w * 1.7, 15 * point.scale);
}
function bush(ctx, point, seed) {
    ctx.fillStyle = point.depth < 10 ? '#183c3a' : '#31584f';
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const x = point.x + (i - 3) * 30 * point.scale;
        const y = point.y - (30 + rand(seed + i) * 28) * point.scale;
        if (i === 0)
            ctx.moveTo(x, point.y + 20 * point.scale);
        ctx.quadraticCurveTo(x - 20 * point.scale, y, x, y);
    }
    ctx.lineTo(point.x + 110 * point.scale, point.y + 30 * point.scale);
    ctx.closePath();
    ctx.fill();
}
function shadow(ctx, p, width) {
    ctx.fillStyle = '#183a3860';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 3, width * p.scale, 15 * p.scale, 0, 0, Math.PI * 2);
    ctx.fill();
}
function drawOrbit(ctx, frame) {
    const time = Math.min(frame.time, 3.2);
    const progress = smooth((time - 0.18) / 2.05);
    const view = {
        angle: Math.PI * progress,
    };
    farBackdrop(ctx, progress);
    ground(ctx, view);
    const reaction = smooth((time - contactTime) / 0.42);
    // 두 배우 사이를 회전축으로 삼아 양쪽 모두 화면의 좌우와 앞뒤를 교환한다.
    const hero = groundPoint(-1.1, 0, view);
    const bear = groundPoint(1.1 + reaction * 0.6, 0, view);
    const attacking = time >= 2.35 && time < 3.16;
    const attackIndex = time < contactTime
        ? Math.min(1, Math.floor(clamp((time - 2.35) / 0.35) * 2))
        : Math.min(6, 2 + Math.floor(clamp((time - contactTime) / 0.46) * 5));
    const attackSprite = frame.assets.hero.uppercut.west[attackIndex];
    // 2번 원화에 포함된 타격 섬광 때문에 몸까지 작아지지 않도록 발 기준 배율을 유지한다.
    const attackHeight = attackSprite.bounds
        ? attackSprite.bounds.bottom - attackSprite.bounds.top
        : 58;
    const objects = [];
    for (const [x, z] of [
        [-4, -2.8],
        [4, -2.8],
        [-4, 2.8],
        [4, 2.8],
    ]) {
        const p = groundPoint(x, z, view);
        objects.push({ depth: p.depth, draw: () => pillar(ctx, p) });
    }
    for (const [index, [x, z]] of [
        [-4.8, -2],
        [4.8, -2],
        [-4.8, 2],
        [4.8, 2],
    ].entries()) {
        const p = groundPoint(x, z, view);
        objects.push({ depth: p.depth, draw: () => bush(ctx, p, index * 11) });
    }
    objects.push({
        depth: bear.depth + 0.01,
        draw: () => {
            shadow(ctx, bear, 82);
            drawBear(ctx, frame.assets, {
                x: bear.x,
                y: bear.y - Math.sin(reaction * Math.PI) * 38,
                height: 560 * bear.scale,
                state: time >= contactTime ? 'hit' : 'stand',
                phase: time >= contactTime
                    ? clamp((time - contactTime) / 0.42)
                    : time * 0.22,
                // 얼굴 전환은 아타호에게 가려지는 교차점에서만 일어난다.
                flip: view.angle > Math.PI / 2,
            });
        },
    });
    objects.push({
        depth: hero.depth,
        draw: () => {
            shadow(ctx, hero, 58);
            drawHero(ctx, frame.assets, {
                x: hero.x,
                y: hero.y,
                height: heroHeight * hero.scale * (attacking ? attackHeight / 58 : 1),
                action: attacking ? 'uppercut' : 'idle',
                phase: attacking ? (attackIndex + 0.1) / 7 : 0,
                facing: Math.PI / 2 + view.angle,
            });
        },
    });
    for (const object of objects.sort((a, b) => b.depth - a.depth))
        object.draw();
    if (time >= contactTime) {
        // 접촉 2번 원화의 실제 주먹을 기준으로, 회수 중에도 폭발은 타점에 남긴다.
        const sprite = frame.assets.hero.uppercut.west[2];
        const scale = (heroHeight * hero.scale) / 58;
        burst(ctx, hero.x + (35 - sprite.anchorX) * scale, hero.y + (27 - sprite.feetY) * scale, (time - contactTime) / 0.34, 120, '#fff4ca');
    }
    ctx.fillStyle = '#14232a';
    ctx.fillRect(0, 0, 1280, 25);
    ctx.fillRect(0, 695, 1280, 25);
}
export const orbitCut = {
    id: 'orbit-2d',
    title: '마와리코미 · 2D 시차',
    kind: '2D',
    duration: 3.5,
    description: '두 배우 사이를 반주하며 동쪽→북쪽→서쪽 원화와 깊이별 시차로 양쪽의 좌우·앞뒤를 교환한다. 서쪽 어퍼컷의 접촉 원화에서 타격한 뒤 팔 회수와 곰왕 착지를 끝내고 정착한다. 곰왕은 한 시점 원본의 판이다.',
    beats: [
        { time: 0, label: '동쪽 구도 · 반주 시작' },
        { time: 1.2, label: '등 뒤 구도 · 연속 시차' },
        { time: 2.23, label: '서쪽 구도 · 반주 정착' },
        { time: contactTime, label: '서쪽 어퍼컷 접촉' },
        { time: 3.2, label: '회수 · 착지 · 반대편 정착' },
    ],
    draw: drawOrbit,
};
