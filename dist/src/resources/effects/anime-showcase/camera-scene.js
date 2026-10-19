import { drawBattle } from './battle.js';
import { ellipse, line, polygon } from './drawing.js';
import { height, width } from './types.js';
/** 광학 비교에서 원본으로 쓰는 고정 구도다. UI와 설명은 이 장면 밖에서 그린다. */
export function opticalScene(ctx, frame) {
    drawBattle(ctx, frame);
}
/** 멀리 이어지는 배경의 수평 이송을 읽을 수 있게 반복 기둥에 번호 대신 창을 둔다. */
export function panorama(ctx) {
    ctx.fillStyle = '#536e87';
    ctx.fillRect(-1100, 0, 3300, height);
    ellipse(ctx, 780, 100, 45, 45, '#eef4f2');
    for (let i = -7; i < 16; i++) {
        const x = i * 175;
        polygon(ctx, [
            { x, y: 350 },
            { x: x + 80, y: 190 },
            { x: x + 175, y: 350 },
        ], i % 2 ? '#91a9bd' : '#718fa8');
        ctx.fillStyle = '#3e586f';
        ctx.fillRect(x + 28, 270, 18, 150);
        ctx.fillStyle = '#d3e1e9';
        ctx.fillRect(x + 76, 310, 42, 38);
        line(ctx, [
            { x: x + 97, y: 310 },
            { x: x + 97, y: 348 },
        ], '#718b9e', 4);
    }
    ctx.fillStyle = '#c4d4e0';
    ctx.fillRect(-1100, 440, 3300, 100);
    for (let x = -1100; x < 2200; x += 105)
        line(ctx, [
            { x, y: 460 },
            { x: x + 45, y: 470 },
        ], '#92aabd', 2);
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
