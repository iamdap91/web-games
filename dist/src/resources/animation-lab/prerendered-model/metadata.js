import { directionCount, durations, frameCount, frameSize, motionNames, } from './motion.js';
export const sheetPath = '/public/assets/maplestory/animation-lab/prerendered-model/wooden-scout.png';
export const sheetMetadata = {
    id: 'local/prerendered-model-lab',
    source: '직접 제작한 Three.js 목인 모델과 관절 모션을 투명 PNG로 프리렌더',
    frameSize,
    frameCount,
    directionCount,
    sheetWidth: frameSize * frameCount,
    sheetHeight: frameSize * directionCount * motionNames.length,
    pivot: { x: 48, y: 87 },
    sha256: 'ca57f24c85011560a96949a5198bd85c6501819e65d48fe54883e2f29388402c',
    bytes: 305482,
    layout: '열: 프레임 0~11 / 행: idle·walk·attack 순, 각 모션마다 정면·우측·후면·좌측',
    durations,
    localPath: sheetPath,
};
