/** 방향·효과·소품 묶음도 대기 모션 이름에 관계없이 대표 이미지를 제공한다. */
export function representativeFrame(asset) {
    const stand = asset.animations.stand?.frames[0];
    if (stand)
        return stand;
    if (asset.localPath && asset.width && asset.height)
        return {
            localPath: asset.localPath,
            width: asset.width,
            height: asset.height,
        };
    return Object.values(asset.animations).find((animation) => animation?.frames.length)?.frames[0];
}
