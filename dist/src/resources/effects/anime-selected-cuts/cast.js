import { directions, } from './assets.js';
import { clamp } from './drawing.js';
function drawSprite(c, sprite, placement, flip = false) {
    const bounds = sprite.bounds;
    const top = bounds?.top ?? 0;
    const bodyHeight = Math.max(1, (bounds?.bottom ?? sprite.image.naturalHeight) - top);
    const scale = placement.height / bodyHeight;
    c.save();
    c.translate(placement.x, placement.y);
    c.rotate(placement.rotation ?? 0);
    c.scale((placement.flip ?? flip) ? -1 : 1, 1);
    c.globalAlpha *= placement.alpha ?? 1;
    c.filter = placement.filter ?? 'none';
    c.imageSmoothingEnabled = false;
    c.drawImage(sprite.image, -sprite.anchorX * scale, -sprite.feetY * scale, sprite.image.naturalWidth * scale, sprite.image.naturalHeight * scale);
    c.restore();
}
export function drawHero(c, assets, placement) {
    const angle = placement.facing ?? Math.PI / 4;
    const direction = directions[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
    const sequence = assets.hero[placement.action][direction] ??
        assets.hero[placement.action]['south-east'] ??
        assets.hero[placement.action].east;
    if (!sequence?.length)
        throw new Error(`아타호 자세가 없습니다: ${placement.action}`);
    const phase = placement.action === 'run'
        ? ((placement.phase % 1) + 1) % 1
        : clamp(placement.phase);
    const sprite = sequence[Math.min(sequence.length - 1, Math.floor(phase * sequence.length))];
    const flip = !assets.hero[placement.action][direction] && Math.sin(angle) < 0;
    drawSprite(c, sprite, placement, flip);
}
export function drawBear(c, assets, placement) {
    const sequence = assets.bear[placement.state];
    const phase = placement.state === 'stand'
        ? ((placement.phase % 1) + 1) % 1
        : clamp(placement.phase);
    drawSprite(c, sequence[Math.min(sequence.length - 1, Math.floor(phase * sequence.length))], placement);
}
export function drawPortrait(c, assets, box) {
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(assets.portrait, box.x, box.y, box.width, box.height);
    c.restore();
}
