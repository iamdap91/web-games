/** 원본의 픽셀과 기준점을 유지하며 개별 효과가 정한 배치만 합성한다. */
export function drawEffectSprite(ctx, frame, options) {
    const source = frame.assets.effects.get(`technique:${options.key}`);
    if (!source || options.width <= 0 || (options.height ?? options.width) <= 0)
        return;
    const height = options.height ?? options.width;
    ctx.save();
    ctx.translate(options.point.x, options.point.y);
    ctx.rotate(options.rotation ?? 0);
    ctx.globalAlpha *= options.opacity ?? 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source.image, (-source.anchorX / source.image.naturalWidth) * options.width, (-source.anchorY / source.image.naturalHeight) * height, options.width, height);
    ctx.restore();
}
