const models = {
    'flood-mark': { model: 'height-mark', radius: 0.3 },
    'cut-face': { model: 'tools', radius: 0.6 },
    'quarry-overlook': { model: 'table', radius: 0.6 },
    'watch-post': { model: 'pillar', radius: 0.45 },
    'old-hall': { model: 'altar', radius: 0.7 },
    'hot-spring': { model: 'height-mark', radius: 0.3 },
    'winter-shelter': { model: 'seat', radius: 0.6 },
    'wreck-keel': { model: 'height-mark', radius: 0.3 },
    'tidal-cave': { model: 'cairn', radius: 0.55 },
    'bamboo-chimes': { model: 'bell', radius: 0.45 },
    'bamboo-well': { model: 'well', radius: 0.75 },
    'canyon-watch': { model: 'table', radius: 0.6 },
    'canyon-ledge': { model: 'flag', radius: 0.3 },
    'mill-wheel': { model: 'height-mark', radius: 0.3 },
    'mill-store': { model: 'table', radius: 0.6 },
    'garden-bell': { model: 'bell', radius: 0.45 },
    'garden-pond': { model: 'seat', radius: 0.6 },
    'caldera-columns': { model: 'columns', radius: 0.55 },
    'caldera-watch': { model: 'table', radius: 0.6 },
};
/** 조사물의 발밑과 외형을 같은 정의로 만들어 표석 이외의 형태도 관통하지 않게 한다. */
export function landmarkModel(id) {
    return models[id] ?? { model: 'pillar', radius: 0.5 };
}
export function surveyRadius(point) {
    if (point.kind === 'landmark')
        return landmarkModel(point.id).radius;
    return point.kind === 'cache' ? 0.3 : 0.5;
}
