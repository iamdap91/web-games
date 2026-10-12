import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { villageMap, } from '../../maps/regional-villages/maps.js';
export const residentGroups = [
    { id: 'basecamp', label: '기존 거점 마을' },
    { id: 'harbor', label: '해풍나루' },
    { id: 'onsen', label: '눈솔온천마을' },
];
export function entriesFor(id) {
    const asset = manifest.assets.find((asset) => asset.id === id);
    if (!asset)
        throw new Error(`마을 리소스 목록이 없습니다: ${id}`);
    return Object.entries(asset.animations).flatMap(([key, animation]) => {
        if (!animation?.frames[0])
            return [];
        return [{ key, label: animation.label ?? key, frame: animation.frames[0] }];
    });
}
export function residents() {
    const previous = entriesFor('ai/village-pack-residents').map((entry) => ({
        ...entry,
        village: (['fisherman', 'harbor-trader'].includes(entry.key)
            ? 'harbor'
            : 'onsen'),
        conceptPath: `public/assets/maplestory/village-resource-pack/originals/${entry.key}-concept.png`,
        previousPath: `public/assets/maplestory/village-resource-pack/frames/${entry.key}.png`,
    }));
    const additions = residentGroups.flatMap(({ id }) => entriesFor(`ai/village-pack-residents-${id}`).map((entry) => ({
        ...entry,
        village: id,
        conceptPath: `public/assets/maplestory/village-resource-pack/originals/${entry.key}-concept.png`,
    })));
    return [...previous, ...additions];
}
export const professionProps = () => entriesFor('ai/village-pack-professions');
export const stateProps = () => entriesFor('ai/village-pack-states');
export const statePairs = [
    { label: '어구 정리', before: 'net-tied', after: 'net-loose' },
    { label: '물품 펼치기', before: 'cloth-wrapped', after: 'cloth-open' },
    { label: '진열대', before: 'display-full', after: 'display-empty' },
    { label: '약초 건조', before: 'herbs-fresh', after: 'herbs-dried' },
    { label: '여행짐', before: 'parcel-closed', after: 'parcel-open' },
    { label: '차양 천', before: 'canopy-rolled', after: 'canopy-spread' },
];
export function residentPlacements(id) {
    return id === 'harbor'
        ? [
            { key: 'fisherman', x: -7.8, z: 6.4 },
            { key: 'harbor-trader', x: -9.2, z: 11.9 },
            { key: 'ferryman', x: 11.3, z: 8.4 },
            { key: 'dock-worker', x: 2.6, z: 1.9 },
            { key: 'fishmonger', x: -4.4, z: 6.6 },
        ]
        : [
            { key: 'onsen-caretaker', x: 10.2, z: -3.7 },
            { key: 'mountain-porter', x: 1.6, z: -2.6 },
            { key: 'herbalist', x: -9.2, z: -1.2 },
            { key: 'hearth-keeper', x: -1.8, z: 4.6 },
            { key: 'winter-outfitter', x: -1.6, z: -2.6 },
        ];
}
export function packVillage(id) {
    const map = villageMap(id);
    return {
        ...map,
        solids: [
            ...map.solids,
            ...residentPlacements(map.id).map((point) => ({
                ...point,
                radius: 0.28,
            })),
        ],
    };
}
export function propPlacements(id) {
    const props = id === 'harbor'
        ? [
            { key: 'dried-fish', x: -13, z: 3, y: 0.97 },
            { key: 'salt-jar', x: 2.3, z: -0.9, y: 0.05 },
            { key: 'seaweed-bundle', x: -13, z: 3.9, y: 0.3 },
            { key: 'fish-tray', x: -6.9, z: 5.6, y: 0.84 },
            { key: 'market-scale', x: -5.4, z: 5.6, y: 0.84 },
            { key: 'account-books', x: -10.2, z: 11.1, y: 0.05 },
            { key: 'net-tied', after: 'net-loose', x: -12.3, z: 4.4, y: 0.05 },
            {
                key: 'cloth-wrapped',
                after: 'cloth-open',
                x: -11.8,
                z: 11.3,
                y: 0.05,
            },
            {
                key: 'display-full',
                after: 'display-empty',
                x: -6.1,
                z: 5.6,
                y: 0.84,
            },
        ]
        : [
            { key: 'towel-stack', x: 9.6, z: -3.9, y: 0.05 },
            { key: 'bamboo-scoops', x: 6.3, z: -1.3, y: 0.15 },
            { key: 'medicinal-bundle', x: -12.8, z: -0.1, y: 0.85 },
            { key: 'pack-frame', x: -1.4, z: -3.1, y: 0.05 },
            { key: 'winter-mittens', x: 1.2, z: -3.1, y: 0.05 },
            { key: 'travel-food', x: -7.8, z: -1.7, y: 0.05 },
            {
                key: 'herbs-fresh',
                after: 'herbs-dried',
                x: -11.8,
                z: 7.1,
                y: 0.05,
            },
            {
                key: 'parcel-closed',
                after: 'parcel-open',
                x: 0.6,
                z: -3.3,
                y: 0.05,
            },
            {
                key: 'canopy-rolled',
                after: 'canopy-spread',
                x: -6.3,
                z: -1.9,
                y: 0.05,
            },
        ];
    return props.map((prop) => ({ ...prop, pixelsPerUnit: 48 }));
}
