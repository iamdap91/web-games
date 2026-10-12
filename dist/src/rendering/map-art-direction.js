import * as THREE from 'three';
// 큰 입체 형태와 작은 픽셀 소품이 공유하는 색 계열. 지역 차이는 밝기와 식생 밀도로 남긴다.
const daylight = {
    sky: 0xdce2df,
    shade: 0x667269,
    skyStrength: 1.65,
    sunlight: 0xf5ead9,
    sunStrength: 1.65,
};
const villageGround = {
    grass: 0x99a287,
    leaves: 0x7d8e73,
    earth: 0x948776,
    path: 0xbeb096,
    stone: 0xa5aaa3,
};
export const mapStyles = {
    village: { ...daylight, background: 0xc8d0bd, ground: villageGround },
    clearing: {
        ...daylight,
        background: 0xabb6aa,
        ground: {
            ...villageGround,
            grass: 0x959f84,
            leaves: 0x7b8c73,
            earth: 0x918778,
            path: 0xb9ad94,
        },
    },
    ridge: {
        ...daylight,
        background: 0xb4bdb9,
        ground: {
            ...villageGround,
            grass: 0x939d89,
            leaves: 0x788a79,
            path: 0xb7b1a0,
            stone: 0xa0aaa8,
        },
    },
    deepForest: {
        ...daylight,
        background: 0xa5b09f,
        sunStrength: 1.55,
        ground: {
            ...villageGround,
            grass: 0x8f9a80,
            leaves: 0x74866b,
            path: 0xb4a68d,
        },
    },
    mushroom: {
        ...daylight,
        background: 0xa9b1a5,
        sunStrength: 1.5,
        ground: {
            ...villageGround,
            grass: 0x8c9987,
            leaves: 0x758774,
            earth: 0x918478,
            path: 0xb5a790,
        },
    },
    battle: {
        ...daylight,
        background: 0xabb6aa,
        ground: {
            ...villageGround,
            path: 0xb9ad94,
        },
    },
};
const references = {
    grass: 0x98a775,
    leaves: 0x738953,
    earth: 0x8b8066,
    path: 0xc7b48c,
    stone: 0xaaa389,
};
function hsl(color) {
    return color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
}
/** 원래 명암은 보존하고 지형을 지역의 색 계열로 맞춘다. 목재·꽃·연출색은 유지한다. */
export function recolorMapMaterial(style, kind, original) {
    const referenceHex = references[kind];
    if (referenceHex === undefined || kind === 'wood')
        return original;
    const color = new THREE.Color(original);
    const source = hsl(color);
    if (kind === 'grass' && (source.h < 60 / 360 || source.h > 160 / 360))
        return original;
    const reference = hsl(new THREE.Color(referenceHex));
    const target = hsl(new THREE.Color(style.ground[kind]));
    color.setHSL(target.h + (source.h - reference.h) * 0.2, THREE.MathUtils.clamp(target.s + (source.s - reference.s) * 0.25, 0, 1), THREE.MathUtils.clamp(target.l + (source.l - reference.l) * 0.85, 0, 1), THREE.SRGBColorSpace);
    return color.getHex();
}
