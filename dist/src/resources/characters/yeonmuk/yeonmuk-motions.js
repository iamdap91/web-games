import manifest from '../../../../resources/manifest.json' with { type: 'json' };
// 투명 여백을 뺀 8방향 대기 키를 아타호의 약 93~95%로 맞춘다.
export const yeonmukDisplayScale = 0.98;
const asset = manifest.assets.find((asset) => asset.id === 'ai/yeonmuk');
const approvedFront = manifest.assets.find((asset) => asset.id === 'ai/fox-talismanist-front')?.animations['stand-south'];
const motions = asset
    ? new Map(Object.entries(asset.animations))
    : approvedFront
        ? new Map([['stand', approvedFront]])
        : new Map();
export function yeonmukMotions() {
    if (!motions.has('stand'))
        throw new Error('승인된 연묵 대기 모션을 찾지 못했어요.');
    return motions;
}
/** 미도착한 걷기는 같은 방향의 대기로 표시하며 걷기 완성으로 취급하지 않는다. */
export function yeonmukMotion(pose) {
    const suffix = pose.facing === 'front' ? '' : `-${pose.facing}`;
    const move = `move${suffix}`;
    const stand = `stand${suffix}`;
    return pose.moving && motions.has(move)
        ? move
        : motions.has(stand)
            ? stand
            : 'stand';
}
