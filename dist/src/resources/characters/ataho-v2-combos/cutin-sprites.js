import { resourceUrl } from '../../catalog/resource-url.js';
const localPath = 'public/assets/maplestory/ataho-v2-effects/20261016/cutin/ataho-face-original.png';
/** 별도 생성한 초상화 원본의 알파를 보존하며 필살기 선택 때만 읽는다. */
export async function loadCutinFrame() {
    const image = new Image();
    image.src = resourceUrl(localPath).href;
    await image.decode();
    return {
        image,
        localPath,
        label: '아타호 · 필살기 얼굴 컷인',
        kind: 'generated',
        anchorX: 0,
        anchorY: 0,
        feetY: 0,
    };
}
