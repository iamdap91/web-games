export const stageWidth = 900;
export const stageHeight = 410;
export const groundY = 325;
export const startX = 245;
export function posePosition(pose, source, options) {
    const anchor = pose.step.anchor;
    const anchorX = typeof anchor === 'object' ? anchor.x : source.anchorX;
    const anchorY = typeof anchor === 'object'
        ? anchor.y
        : anchor === 'feet'
            ? source.feetY
            : source.anchorY;
    const x = startX + (options.showMovement ? pose.x : 0) * options.scale;
    const y = groundY + (options.showMovement ? pose.y : 0) * options.scale;
    return {
        x,
        y,
        left: Math.round(x - anchorX * options.scale),
        top: Math.round(y - anchorY * options.scale),
    };
}
export function drawPose(ctx, pose, source, options) {
    const position = posePosition(pose, source, options);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source.image, position.left, position.top, source.image.naturalWidth * options.scale, source.image.naturalHeight * options.scale);
}
