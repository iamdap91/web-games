import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { groundAdditions } from '../../characters/ataho-v2-combos/motions/ground-additions.js';
import { enhancedFlyingKickMotion } from '../../characters/ataho-v2-combos/motions/inazuma-flying-kick.js';
async function imageAt(path) {
    const image = new Image();
    image.src = resourceUrl(path).href;
    await image.decode();
    return image;
}
/** 기존 승인 원본을 읽기만 하며 생성·파일 수정·전투 상태를 만들지 않는다. */
export async function loadBattleAssets() {
    const uppercut = groundAdditions.find((m) => m.id === 'charged-uppercut');
    if (!uppercut)
        throw new Error('기존 어퍼컷 모션을 찾을 수 없습니다.');
    const bear = manifest.assets.find((a) => a.id === 'ai/monster-hoarfrost-bear');
    if (!bear || !('animations' in bear))
        throw new Error('서리갈기 곰왕 원본을 찾을 수 없습니다.');
    const animations = bear.animations;
    const sprites = async (key) => {
        const animation = animations[key];
        if (!animation)
            throw new Error(`곰왕 모션이 없습니다: ${key}`);
        return Promise.all(animation.frames.map(async (f) => ({
            ...f,
            image: await imageAt(f.localPath),
        })));
    };
    const loader = new MotionFrameLoader();
    const [stand, hit, defeat, portrait] = await Promise.all([
        sprites('stand'),
        sprites('hit1'),
        sprites('die1'),
        imageAt('public/assets/maplestory/ataho-v2-effects/20261016/cutin/ataho-face-original.png'),
        loader.load(uppercut),
        loader.load(enhancedFlyingKickMotion),
    ]);
    return {
        frames: loader.frames,
        uppercut,
        kick: enhancedFlyingKickMotion,
        bear: { stand, hit, defeat },
        portrait,
    };
}
