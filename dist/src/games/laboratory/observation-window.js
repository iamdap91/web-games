import { smooth } from './event-rules.js';
import { drawPlayer } from './player-renderer.js';
export const observationWindow = {
    x: 950,
    y: 100,
    width: 330,
    height: 200,
};
export function drawObservationWindow(ctx, machine, pipe) {
    const { x, y, width: w, height: h } = observationWindow;
    ctx.save();
    ctx.fillStyle = '#101c21';
    ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
    ctx.strokeStyle = '#586760';
    ctx.lineWidth = 7;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    for (const bx of [x - 7, x + w + 7])
        for (const by of [y - 7, y + h + 7]) {
            ctx.fillStyle = '#8b9986';
            ctx.fillRect(bx - 2, by - 2, 4, 4);
        }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const depth = ctx.createLinearGradient(0, y, 0, y + h);
    depth.addColorStop(0, '#0a171a');
    depth.addColorStop(0.7, '#34473e');
    depth.addColorStop(1, '#152924');
    ctx.fillStyle = depth;
    ctx.fillRect(x, y, w, h);
    // 작은 설비와 뒤쪽 바닥으로 복도 너머 별도 작업실의 깊이를 만든다.
    for (const offset of [20, 164, 300]) {
        ctx.fillStyle = '#71817425';
        ctx.fillRect(x + offset, y, 2, h);
    }
    ctx.drawImage(pipe, x + 146, y - 12, 31, 172);
    ctx.drawImage(machine, x + 30, y + 55, 67, 122);
    ctx.drawImage(machine, x + 213, y + 25, 81, 148);
    ctx.fillStyle = '#091614';
    ctx.fillRect(x, y + 177, w, 23);
    ctx.strokeStyle = '#61776842';
    ctx.lineWidth = 1;
    for (const offset of [-110, 80, 245, 430]) {
        ctx.beginPath();
        ctx.moveTo(x + w / 2 + (offset - w / 2) * 0.75, y + 178);
        ctx.lineTo(x + offset, y + h);
        ctx.stroke();
    }
    ctx.fillStyle = '#a3c4a18c';
    ctx.fillRect(x + 82, y + 12, 164, 3);
    const glow = ctx.createLinearGradient(0, y + 15, 0, y + h);
    glow.addColorStop(0, '#bdd8aa16');
    glow.addColorStop(1, '#bdd8aa00');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y + 15, w, h - 15);
    drawObservationGlass(ctx);
    ctx.restore();
}
export function drawObservationGlass(ctx) {
    const { x, y, width: w, height: h } = observationWindow;
    const reflection = ctx.createLinearGradient(x, y, x + w, y + h);
    reflection.addColorStop(0, '#90c5c218');
    reflection.addColorStop(0.4, '#b3d0c52b');
    reflection.addColorStop(0.43, '#09121800');
    reflection.addColorStop(1, '#02070b55');
    ctx.fillStyle = reflection;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#101c21';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
}
export function drawWindowReflection(ctx, assets, state, frame) {
    if (state.scenario === 'empty-center' || state.scenario === 'folding-stage')
        return;
    if (state.squashElapsed !== null)
        return;
    const { x, y, width, height } = observationWindow;
    const player = state.player;
    if (player.x < x - 50 || player.x > x + width + 50)
        return;
    const eye = state.scenario === 'watching-eye'
        ? smooth((state.anomaly.activeElapsed ?? 0) / 0.65)
        : 0;
    ctx.save();
    ctx.beginPath();
    // 창틀을 제외하고 유리에 겹친 신체 일부만 반사한다.
    ctx.rect(x, y, width / 2 - 3, height);
    ctx.rect(x + width / 2 + 3, y, width / 2 - 3, height);
    ctx.clip();
    ctx.globalAlpha = 0.23 * (1 - eye);
    ctx.filter = 'saturate(0.25)';
    // 벽면 반사는 좌우 이동을 그대로 따르며, 유리 속 깊이만 살짝 옮긴다.
    drawPlayer(ctx, assets, { ...player, y: player.y - 23, flashRemaining: 0 }, frame, false);
    ctx.restore();
}
