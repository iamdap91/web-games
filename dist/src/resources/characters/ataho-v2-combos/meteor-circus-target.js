import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
const targetAsset = manifest.assets.find((asset) => asset.id === 'ai/monster-thicket-bat');
if (!targetAsset)
    throw new Error('이타노 서커스의 덤불박쥐 원본이 없습니다.');
const targetAnimations = targetAsset.animations;
const animationNames = [
    'move',
    'hit1',
    'die1',
];
/** 출처와 개별 프레임 재생 시간을 포함한 원본 manifest 정보를 그대로 재사용한다. */
export const circusTargetFrames = animationNames.flatMap((animation) => {
    const source = targetAnimations[animation];
    if (!source)
        throw new Error(`덤불박쥐 동작이 없습니다: ${animation}`);
    return source.frames.map((frame, index) => {
        if (frame.durationSeconds === undefined)
            throw new Error(`덤불박쥐 프레임 시간이 없습니다: ${animation}:${index}`);
        return {
            ...frame,
            key: circusTargetFrameKey(animation, index),
            animation,
            index,
            durationSeconds: frame.durationSeconds,
        };
    });
});
export function circusTargetFrameKey(animation, index) {
    return `circus-target:${animation}:${index}`;
}
/** PNG를 복제하거나 변형하지 않고 원본 이미지를 비행체 중심 기준으로 읽는다. */
export async function loadCircusTargetFrame(definition) {
    const image = new Image();
    image.src = resourceUrl(definition.localPath).href;
    await image.decode();
    return {
        image,
        localPath: definition.localPath,
        label: `덤불박쥐 · ${definition.animation} ${definition.index + 1}`,
        anchorX: definition.width / 2,
        anchorY: definition.height / 2,
        feetY: definition.height / 2,
        bounds: {
            left: 0,
            top: 0,
            right: definition.width,
            bottom: definition.height,
        },
        kind: 'original',
    };
}
