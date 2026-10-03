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
        // 토벤·스마슈는 왼쪽, 아타호는 오른쪽 원본이므로 이동 방향에 맞춘다.
        const { scale, sourceFacing } = assets.character.appearance;
        ctx.scale(player.facing * sourceFacing * scale, player.inverted ? -scale : scale);
        if (player.flashRemaining > 0) {
            for (const distance of [26, 52, 78]) {
                ctx.globalAlpha = opacity * 0.22 * (1 - distance / 100);
                ctx.drawImage(image, -sourceFacing * distance - frame.pivot.x, -(frame.height - frame.pivot.y));
            }
        }
        ctx.globalAlpha = opacity;
        ctx.drawImage(image, -frame.pivot.x, -(frame.height - frame.pivot.y));
        ctx.restore();
    }
}
