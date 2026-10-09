export const speakerNames = {
    ataho: '아타호',
    'dojo-owner': '도장 주인',
};
// 두 화면의 64px 대기 프레임을 같은 세로 비율로 맞춘다. 화면비는 가로 시야만 바꾼다.
export const rpgView = {
    actorFrameHeight: 64,
    actorPixelsPerUnit: 32,
    actorScreenHeightRatio: 0.11,
};
export function rpgCameraBounds(size) {
    const halfHeight = rpgView.actorFrameHeight /
        rpgView.actorPixelsPerUnit /
        rpgView.actorScreenHeightRatio /
        2;
    const halfWidth = (halfHeight * Math.max(1, size.width)) / Math.max(1, size.height);
    return {
        left: -halfWidth,
        right: halfWidth,
        top: halfHeight,
        bottom: -halfHeight,
    };
}
