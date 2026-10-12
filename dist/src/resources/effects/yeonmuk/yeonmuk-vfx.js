import manifest from '../../../../resources/manifest.json' with { type: 'json' };
export const yeonmukEffectNames = [
    'talisman-flight',
    'talisman-hit',
    'ward-cast',
    'ward-idle',
    'ward-trigger',
];
// 리소스 재생 검토에서 문양이 명확하게 읽히는 대표 자세를 선정했다.
export const yeonmukReducedMotionFrames = {
    'talisman-flight': 2,
    'talisman-hit': 2,
    'ward-cast': 4,
    'ward-idle': 0,
    'ward-trigger': 4,
};
export function yeonmukVfxAnimations() {
    const asset = manifest.assets.find((entry) => entry.id === 'ai/yeonmuk-vfx');
    if (!asset)
        throw new Error('연묵의 부적 이펙트 정보가 없습니다.');
    const animations = asset.animations;
    return new Map(yeonmukEffectNames.map((name) => {
        const animation = animations[name];
        if (!animation?.frames.length)
            throw new Error(`연묵의 부적 이펙트가 없습니다: ${name}`);
        return [name, animation];
    }));
}
