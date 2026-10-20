import { drawBear, drawHero } from './cast.js';
import { clamp, smooth } from './drawing.js';
import { gameImpact } from '../../cutscenes/game-effects.js';
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
    const camera = {
        position: {
            x: -10 * Math.sin(view.angle),
            y: 4,
            z: -10 * Math.cos(view.angle),
        },
        target: { x: 0, y: 4, z: 0 },
        focal: 1000,
    };
    const stageOptions = { principalY: 200, focus: { x: 0, y: 0, z: 0 } };
    frame.surfaces.stage.background(ctx, 'arena', camera, time, stageOptions);
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
    frame.surfaces.stage.foreground(ctx, 'arena', camera, time, stageOptions);
    if (time >= contactTime) {
        // 접촉 2번 원화의 실제 주먹을 기준으로, 회수 중에도 폭발은 타점에 남긴다.
        const sprite = frame.assets.hero.uppercut.west[2];
        const scale = (heroHeight * hero.scale) / 58;
        gameImpact(ctx, frame.assets.effects, {
            x: hero.x + (35 - sprite.anchorX) * scale,
            y: hero.y + (27 - sprite.feetY) * scale,
            progress: (time - contactTime) / 0.34,
            size: 240,
            angle: Math.PI,
        });
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
    description: '게임 숲 전투 공터에서 두 배우 사이를 반주하며 동쪽→북쪽→서쪽 원화와 깊이별 시차로 양쪽의 좌우·앞뒤를 교환한다. 서쪽 어퍼컷의 접촉 원화에서 타격한 뒤 팔 회수와 곰왕 착지를 끝내고 정착한다. 곰왕은 한 시점 원본의 판이다.',
    beats: [
        { time: 0, label: '동쪽 구도 · 반주 시작' },
        { time: 1.2, label: '등 뒤 구도 · 연속 시차' },
        { time: 2.23, label: '서쪽 구도 · 반주 정착' },
        { time: contactTime, label: '서쪽 어퍼컷 접촉' },
        { time: 3.2, label: '회수 · 착지 · 반대편 정착' },
    ],
    draw: drawOrbit,
};
