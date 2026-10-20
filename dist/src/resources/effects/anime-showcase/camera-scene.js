import { drawBattle } from './battle.js';
import { gameStage, line } from './drawing.js';
import { height, width } from './types.js';
/** 광학 비교에서 원본으로 쓰는 고정 구도다. UI와 설명은 이 장면 밖에서 그린다. */
export function opticalScene(ctx, frame) {
    drawBattle(ctx, frame);
}
/** 넓은 실제 공터의 이웃 구도를 이어 PAN의 화면 바깥까지 채운다. */
export function panorama(ctx, frame) {
    for (const offset of [-960, 0, 960]) {
        ctx.save();
        ctx.translate(offset, 0);
        gameStage(ctx, frame, {
            camera: {
                position: { x: 0, y: 5, z: 13 },
                target: { x: 0, y: 3.15, z: 0 },
                focal: 750,
            },
            focus: { x: 0, y: 0, z: 0 },
            viewOffsetX: offset,
        });
        ctx.restore();
    }
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
