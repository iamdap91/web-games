export const stageWidth = 900;
export const stageHeight = 410;
export const groundY = 325;
export const startX = 245;
function selectedDrawing(motion, step, enabledEffects) {
    for (const effect of motion.effects ?? []) {
        if (effect.kind !== 'pose' || !enabledEffects.has(effect.id))
            continue;
        const replacement = effect.replacements.find((item) => item.motion === step.motion && item.frame === step.frame);
        if (replacement)
            return replacement;
    }
    return undefined;
}
export function motionWithDrawingContacts(motion, enabledEffects) {
    return {
        ...motion,
        steps: motion.steps.map((step) => {
            if (!step.contact)
                return step;
            const drawing = selectedDrawing(motion, step, enabledEffects);
            // 원본 팔꿈치는 그림 비교만 허용하고, 전용 그림을 쓸 때만 공격으로 센다.
            if (step.motion === 'ataho-firewood-elbow-chop-south-east-south-east' &&
                drawing?.replacement.motion !== 'presentation-elbow-keyposes-south-east')
                return { ...step, contact: undefined };
            const contact = drawing?.contact;
            return contact
                ? { ...step, contact: { ...step.contact, ...contact } }
                : step;
        }),
    };
}
export function poseWithDrawing(pose, enabledEffects) {
    const replacement = selectedDrawing(pose.motion, pose.step, enabledEffects);
    if (!replacement)
        return pose;
    return {
        ...pose,
        step: {
            ...pose.step,
            ...replacement.replacement,
            ...(pose.step.contact && replacement.contact
                ? { contact: { ...pose.step.contact, ...replacement.contact } }
                : {}),
        },
    };
}
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
