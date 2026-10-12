import manifest from '../../../resources/manifest.json' with { type: 'json' };
export const monsterMotionNames = [
    'stand',
    'move',
    'attack1',
    'hit1',
    'die1',
];
function assetFor(source) {
    return manifest.assets.find((asset) => asset.id === source.assetId);
}
export function animationDuration(animation) {
    return animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
}
export function monsterAnimations(source) {
    const asset = assetFor(source);
    if (!asset)
        throw new Error(`${source.name}의 실제 리소스가 아직 없습니다.`);
    return new Map(monsterMotionNames.map((name) => {
        const animation = asset.animations[name];
        if (!animation?.frames.length ||
            animation.frames.some((frame) => !Number.isFinite(frame.width) ||
                frame.width <= 0 ||
                !Number.isFinite(frame.height) ||
                frame.height <= 0 ||
                !Number.isFinite(frame.pivot.x) ||
                !Number.isFinite(frame.pivot.y) ||
                !Number.isFinite(frame.durationSeconds) ||
                frame.durationSeconds <= 0 ||
                !frame.localPath.startsWith(source.assetPath)))
            throw new Error(`${source.name}의 ${name} 프레임 정보가 유효하지 않습니다.`);
        return [name, animation];
    }));
}
export function monsterNativeFacing(source) {
    const facing = assetFor(source)?.nativeFacing;
    if (facing !== 'left' && facing !== 'right')
        throw new Error(`${source.name}의 기본 방향 정보가 없습니다.`);
    return facing;
}
export function monsterAttackAnimation(source) {
    return assetFor(source)?.animations.attack1;
}
export function monsterMotionFrame(animation, age, options) {
    let remaining = options.repeat ? age % animationDuration(animation) : age;
    for (const [index, frame] of animation.frames.entries()) {
        const duration = frame.durationSeconds ?? 0.14;
        if (remaining + 1e-9 < duration || index === animation.frames.length - 1)
            return index;
        remaining -= duration;
    }
    return animation.frames.length - 1;
}
