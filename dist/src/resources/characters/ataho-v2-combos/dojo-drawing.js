import { sampleComboMotion } from './player.js';
import { groundY, stageWidth, stageHeight } from './pose-drawing.js';
import { hasDepthLayers } from './stage-accents.js';
/** 실제 이동의 최근90ms만 사용하며 정착 뒤 같은 시간 안에 층의 변위를 거둔다. */
export function drawDojo(ctx, view, snapshot, options) {
    const before = options.showDepthLayers &&
        options.showMovement &&
        !snapshot.waiting &&
        hasDepthLayers(snapshot.motion)
        ? sampleComboMotion(snapshot.motion, snapshot.elapsedMs - 90)
        : undefined;
    const movement = before
        ? Math.max(-60, Math.min(60, (snapshot.x - before.x) * options.scale))
        : 0;
    const windows = -movement * 0.04;
    const pillars = -movement * 0.12;
    const left = Math.floor(Math.min(-12, view.visibleBounds.left)) - 2;
    const top = Math.floor(Math.min(-12, view.visibleBounds.top)) - 2;
    const right = Math.ceil(Math.max(stageWidth + 12, view.visibleBounds.right)) + 2;
    const bottom = Math.ceil(Math.max(stageHeight + 12, view.visibleBounds.bottom)) + 2;
    ctx.fillStyle = '#efdfbf';
    // 기존 역변환 범위와 바닥선을 보존하고 창과 기둥만 서로 다르게 옮긴다.
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = '#e6cfa7';
    ctx.fillRect(left, 42, right - left, groundY - 42);
    ctx.fillStyle = '#7c5844';
    for (const x of [42, 435, 830])
        ctx.fillRect(x + pillars, top, 13, groundY - top);
    ctx.fillRect(left, 25, right - left, 14);
    ctx.fillStyle = '#f7eacb';
    ctx.fillRect(96 + windows, 68, 295, 131);
    ctx.fillRect(487 + windows, 68, 295, 131);
    ctx.strokeStyle = '#d5b98b';
    ctx.lineWidth = 3;
    for (const x of [170, 245, 320, 560, 635, 710]) {
        ctx.beginPath();
        ctx.moveTo(x + windows, 68);
        ctx.lineTo(x + windows, 199);
        ctx.stroke();
    }
    ctx.fillStyle = '#b88961';
    ctx.fillRect(left, groundY, right - left, bottom - groundY);
    ctx.strokeStyle = '#946e50';
    ctx.lineWidth = 2;
    for (const y of [groundY + 2, 352, 383]) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
    }
}
