import { world } from './game.js';
export function drawPlayer(ctx, assets, player, frame, shadow = true) {
    if (shadow) {
        ctx.fillStyle = '#050d1080';
        ctx.beginPath();
        ctx.ellipse(player.x, player.inverted ? -2 : world.ground + 2, 22, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    const image = assets.frames.get(frame.localPath);
    if (image) {
        const opacity = ctx.globalAlpha;
        ctx.save();
        ctx.translate(player.x, player.y);
        // 원본 모험가 프레임은 왼쪽을 바라본다.
        ctx.scale(-player.facing * 1.3, player.inverted ? -1.3 : 1.3);
        if (player.flashRemaining > 0) {
            for (const distance of [26, 52, 78]) {
                ctx.globalAlpha = opacity * 0.22 * (1 - distance / 100);
                ctx.drawImage(image, distance - frame.pivot.x, -(frame.height - frame.pivot.y));
            }
        }
        ctx.globalAlpha = opacity;
        ctx.drawImage(image, -frame.pivot.x, -(frame.height - frame.pivot.y));
        ctx.restore();
    }
}
