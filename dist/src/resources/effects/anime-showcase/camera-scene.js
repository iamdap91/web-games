import { actor, ellipse, line, palette, polygon, stage } from './drawing.js';
import { height, width } from './types.js';
/** 광학 비교에서 원본으로 쓰는 고정 구도다. UI와 설명은 이 장면 밖에서 그린다. */
export function opticalScene(ctx) {
    stage(ctx);
    for (const x of [125, 800]) {
        ctx.fillStyle = '#172333';
        ctx.fillRect(x, 170, 15, 245);
        ctx.fillStyle = palette.paper;
        ctx.fillRect(x - 12, 154, 40, 34);
        ctx.fillStyle = '#a94f54';
        ctx.fillRect(x - 14, 150, 44, 7);
        line(ctx, [
            { x: x - 7, y: 165 },
            { x: x + 22, y: 165 },
        ], '#dfb57b', 3);
    }
    actor(ctx, 462, 424, 1.1, { arm: 0.25 });
    ctx.fillStyle = palette.paper;
    ctx.fillRect(570, 288, 66, 45);
    ctx.fillStyle = palette.ink;
    for (let i = 0; i < 4; i++)
        ctx.fillRect(577 + i * 13, 295, 6, 30);
}
export function orb(ctx, x = 590, y = 255, radius = 27) {
    ellipse(ctx, x, y, radius, radius, palette.blue);
    ellipse(ctx, x - radius * 0.22, y - radius * 0.22, radius * 0.48, radius * 0.48, palette.paper);
}
/** 멀리 이어지는 배경의 수평 이송을 읽을 수 있게 반복 기둥에 번호 대신 창을 둔다. */
export function panorama(ctx) {
    ctx.fillStyle = '#223049';
    ctx.fillRect(-1100, 0, 3300, height);
    ellipse(ctx, 780, 100, 45, 45, '#d6c6a5');
    for (let i = -7; i < 16; i++) {
        const x = i * 175;
        polygon(ctx, [
            { x, y: 350 },
            { x: x + 80, y: 190 },
            { x: x + 175, y: 350 },
        ], i % 2 ? '#3d4e5e' : '#354655');
        ctx.fillStyle = '#1a2533';
        ctx.fillRect(x + 28, 270, 18, 150);
        ctx.fillStyle = '#d1aa68';
        ctx.fillRect(x + 76, 310, 42, 38);
        line(ctx, [
            { x: x + 97, y: 310 },
            { x: x + 97, y: 348 },
        ], '#253342', 4);
    }
    ctx.fillStyle = '#303141';
    ctx.fillRect(-1100, 420, 3300, 120);
    for (let x = -1100; x < 2200; x += 105)
        line(ctx, [
            { x, y: 460 },
            { x: x + 45, y: 470 },
        ], '#767079', 2);
}
export function overlayFrame(ctx) {
    ctx.save();
    ctx.strokeStyle = '#e9dbb770';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 30, width - 64, height - 100);
    for (const x of [48, width - 48])
        line(ctx, [
            { x: x - 8, y: 48 },
            { x: x + 8, y: 48 },
        ], '#e9dbb7a0', 2);
    ctx.restore();
}
