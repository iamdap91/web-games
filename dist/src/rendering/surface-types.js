export const surfaces = [
    {
        id: 'grass',
        recommendedStrength: 25,
        label: '잔디',
        description: '바닥에 넓게 이어지는 색 무늬',
        color: '#98a775',
    },
    {
        id: 'leaves',
        recommendedStrength: 55,
        label: '나뭇잎',
        description: '나무와 잡목 잎의 명암 무늬',
        color: '#738953',
    },
    {
        id: 'wood',
        recommendedStrength: 45,
        label: '나무줄기',
        description: '줄기·잡목·울타리·상자의 나뭇결',
        color: '#ab8358',
    },
    {
        id: 'stone',
        recommendedStrength: 30,
        label: '바위',
        description: '돌 표면의 넓은 명암 무늬',
        color: '#aaa389',
    },
    {
        id: 'earth',
        recommendedStrength: 15,
        label: '흙',
        description: '공터 옆면의 흙 무늬',
        color: '#8b8066',
    },
    {
        id: 'path',
        recommendedStrength: 15,
        label: '흙길',
        description: '길 위에 드문드문 생긴 색 무늬',
        color: '#c7b48c',
    },
];
export const resourceLayers = {
    environment: 0,
    character: 1,
    effects: 8,
};
export const outlineSettings = {
    defaultPixelSize: 0,
    maxPixelSize: 6,
    step: 0.1,
};
export const outlineGroups = [
    {
        id: 'tree',
        recommendedPixelSize: 0.8,
        label: '배경 나무',
        description: '공터 밖의 큰 나무',
        layer: 2,
    },
    {
        id: 'brush',
        recommendedPixelSize: 0.4,
        label: '채집 잡목',
        description: '첫 개간에서 베는 낮은 잡목',
        layer: 7,
    },
    {
        id: 'rock',
        recommendedPixelSize: 0.6,
        label: '바위',
        description: '크고 작은 바위',
        layer: 3,
    },
    {
        id: 'box',
        recommendedPixelSize: 0.4,
        label: '상자',
        description: '나무 블록',
        layer: 4,
    },
    {
        id: 'fence',
        recommendedPixelSize: 0.3,
        label: '울타리',
        description: '기둥과 가로 판자',
        layer: 5,
    },
    {
        id: 'ground',
        recommendedPixelSize: 0,
        label: '바닥',
        description: '잔디와 흙길, 공터 옆면',
        layer: 6,
    },
];
export function normalizeOutlineSize(value) {
    if (!Number.isFinite(value))
        return outlineSettings.defaultPixelSize;
    const clamped = Math.max(0, Math.min(outlineSettings.maxPixelSize, value));
    const precision = 1 / outlineSettings.step;
    return Math.round(clamped * precision) / precision;
}
export function outlineLabel(value) {
    return value === 0 ? '매끈하게' : `${value.toFixed(1)}px`;
}
