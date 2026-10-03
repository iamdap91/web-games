import { viewport } from './layout.js';
import { drawPlayer } from './player-renderer.js';
export function recordedFrame(assets, player, fallback) {
    const frames = assets.animations.get(player.motion)?.frames;
    if (!frames?.length)
        return fallback;
    const duration = frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
    let time = player.motionElapsed % duration;
    for (const frame of frames) {
        time -= frame.durationSeconds ?? 0.14;
        if (time < 0)
            return frame;
    }
    return frames[frames.length - 1];
}
export function drawRewindEchoes(ctx, assets, state, fallback) {
    if (state.scenario !== 'time-rewind')
        return;
    ctx.save();
    const echoes = state.rewind.echoes;
    // 역재생 커서보다 나중의 포즈가 몸 쪽으로 회수된다. 새 궤적은 만들지 않는다.
    for (let i = echoes.length - 1; i >= 0; i--) {
        ctx.globalAlpha = (1 - i / echoes.length) * 0.23;
        const player = echoes[i];
        drawPlayer(ctx, assets, player, recordedFrame(assets, player, fallback), false);
    }
    ctx.restore();
}
export function drawRewindScreen(ctx, state) {
    if (!state.rewind.rewinding)
        return;
    ctx.save();
    const time = state.rewind.remaining;
    const glow = ctx.createLinearGradient(0, 0, viewport.width, 0);
    glow.addColorStop(0, '#9fd7e32b');
    glow.addColorStop(0.2, '#99cbe303');
    glow.addColorStop(0.8, '#99cbe303');
    glow.addColorStop(1, '#9fd7e32b');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    // 좁은 주사선만 거꾸로 흐르게 해 실제 움직임을 가리지 않는다.
    for (let i = 0; i < 3; i++) {
        const y = ((time * 780 + i * 163) % 470) - 20;
        ctx.fillStyle = '#c0dbe517';
        ctx.fillRect(0, y, viewport.width, 1);
        ctx.fillStyle = '#030b1320';
        ctx.fillRect(0, y + 2, viewport.width, 5);
    }
    ctx.fillStyle = '#d1e8e3aa';
    for (const x of [948, 963]) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x + 10, 16);
        ctx.lineTo(x + 10, 28);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
